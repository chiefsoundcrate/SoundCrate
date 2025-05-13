import React, { useRef, useState, useEffect } from "react";
import Modal from "react-modal";
import { db, storage } from "../services/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import WaveSurfer from "wavesurfer.js";
import Regions from "wavesurfer.js/dist/plugins/regions";
import { useAuth } from "../hooks/useAuth";
import { X, Upload, Play, Music, Image, CheckCircle, Pause, Scissors } from "lucide-react";
// Updated FFmpeg imports
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

// Set app element for react-modal accessibility
if (typeof document !== 'undefined') {
  Modal.setAppElement('#root');
}

const UploadModal = ({ isOpen, onRequestClose }) => {
  const { user } = useAuth();
  const [artist, setArtist] = useState("");
  const [title, setTitle] = useState("");
  const [cover, setCover] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [audio, setAudio] = useState(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(30);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ cover: 0, audio: 0 });
  const [error, setError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const wavesurferRef = useRef(null);
  const waveformRef = useRef(null);
  const regionRef = useRef(null);
  const regionsRef = useRef(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [ffmpeg, setFfmpeg] = useState(null);
  const [isFFmpegLoading, setIsFFmpegLoading] = useState(true);
  const [trimmingAudio, setTrimmingAudio] = useState(false);
  const [duration, setDuration] = useState(0);

  // Load FFmpeg when component mounts - Using CDN URLs to avoid CORS issues
  useEffect(() => {
    const loadFfmpeg = async () => {
      try {
        const ffmpegInstance = new FFmpeg();
        
        // Use the CDN URLs directly
        await ffmpegInstance.load({
          coreURL: "https://unpkg.com/@ffmpeg/core@0.12.6/dist/ffmpeg-core.js",
          wasmURL: "https://unpkg.com/@ffmpeg/core@0.12.6/dist/ffmpeg-core.wasm"
        });
        
        setFfmpeg(ffmpegInstance);
        setIsFFmpegLoading(false);
      } catch (error) {
        console.error("Failed to load FFmpeg:", error);
        // Try alternative approach for local development
        try {
          const ffmpegInstance = new FFmpeg();
          // For local development, try loading from local files
          await ffmpegInstance.load();
          setFfmpeg(ffmpegInstance);
          setIsFFmpegLoading(false);
        } catch (fallbackError) {
          console.error("FFmpeg fallback failed:", fallbackError);
          setError("Failed to initialize audio processing tools. Audio trimming will not be available.");
          setIsFFmpegLoading(false);
        }
      }
    };

    loadFfmpeg();
    
    // Cleanup function
    return () => {
      if (ffmpeg) {
        try {
          ffmpeg.terminate();
        } catch (e) {
          console.log("FFmpeg termination error:", e);
        }
      }
    };
  }, []);

  // Check if user is authenticated
  if (isOpen && !user) {
    onRequestClose();
    alert("Please sign in to upload songs");
    return null;
  }

  // Cleanup function for audio preview URL
  useEffect(() => {
    return () => {
      if (audioUrl && audioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setError("");
      setTrimmingAudio(false);
    }
  }, [isOpen]);

  // Format time to MM:SS
  const formatTime = (time) => {
    if (isNaN(time)) return "0:00";
    
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Load audio for trimming
  const handleAudioChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('audio/')) {
      setError("Please select a valid audio file");
      return;
    }

    // Validate file size (20MB max)
    if (file.size > 20 * 1024 * 1024) {
      setError("Audio file must be less than 20MB");
      return;
    }

    setAudio(file);
    setError(""); // Clear any previous errors

    // Create audio preview URL
    const url = URL.createObjectURL(file);
    setAudioUrl(url);

    // Initialize WaveSurfer with a small delay to ensure DOM is ready
    setTimeout(() => {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
      }

      if (!waveformRef.current) return;

      // Create regions plugin
      const regions = Regions.create();

      // Create wavesurfer instance
      wavesurferRef.current = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: "#666666",
        progressColor: "#29F2C0",
        height: 100,
        barWidth: 2,
        responsive: true,
        cursorColor: "#ffffff",
        plugins: [regions]
      });

      regionsRef.current = regions;

      wavesurferRef.current.load(url);

      wavesurferRef.current.on("ready", () => {
        const audioDuration = wavesurferRef.current.getDuration();
        setDuration(audioDuration);
        
        // Set end trim to either full duration or 30s, whichever is shorter
        const endTime = Math.min(30, audioDuration);
        setTrimEnd(endTime);
        
        // Clear any existing regions - check if regionsRef exists first
if (regionsRef.current) {
  regionsRef.current.clearRegions();
}

// Create the trim region with better visibility
regionRef.current = regionsRef.current.addRegion({
  start: 0,
  end: endTime,
  color: 'rgba(255, 0, 0, 0.3)', // Changed to red for selected area
  drag: true,
  resize: true,
  handleStyle: {
    left: { width: '24px', height: '100%', backgroundColor: '#29F2C0', cursor: 'col-resize' },
    right: { width: '24px', height: '100%', backgroundColor: '#29F2C0', cursor: 'col-resize' }
  }
});
      });

      // Handle region updates
      regions.on("region-updated", (region) => {
        setTrimStart(region.start);
        setTrimEnd(region.end);
      });

      wavesurferRef.current.on("error", (err) => {
        console.error("WaveSurfer error:", err);
        setError("Failed to load audio preview. Please try another file.");
      });

      wavesurferRef.current.on("finish", () => {
        setIsPlaying(false);
      });
    }, 100);
  };

  // Handle cover image selection with preview
  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError("Please select a valid image file");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError("Cover image must be less than 5MB");
      return;
    }

    setCover(file);
    setCoverPreview(URL.createObjectURL(file));
    setError(""); // Clear any previous errors
  };

  // Play the current trimmed section for preview
  const handlePreviewPlay = () => {
    if (!wavesurferRef.current) return;

    if (isPlaying) {
      wavesurferRef.current.pause();
      setIsPlaying(false);
    } else {
      wavesurferRef.current.play(trimStart, trimEnd);
      setIsPlaying(true);
    }
  };

  // Updated FFmpeg function for trimming audio - Fixed to save from 0 to trim start
  const trimAndSetAudio = async () => {
    if (!ffmpeg || !audio) {
      console.warn("FFmpeg not initialized or no audio file selected.");
      // Return the original audio if FFmpeg is not available
      return audio;
    }

    setTrimmingAudio(true);
    try {
      // Convert input file to ArrayBuffer
      const audioData = await fetchFile(audio);
      
      // Write file to FFmpeg virtual file system
      await ffmpeg.writeFile('input.mp3', audioData);

      // Trim from 0 to trimStart (not from trimStart to trimEnd)
      const startTime = parseFloat(trimStart);
  const duration = parseFloat(trimEnd - trimStart);

  if (isNaN(startTime) || isNaN(duration) || duration <= 0) {
    setError("Invalid trim selection.");
    return null;
  }

  console.log(`Trimming audio from ${startTime} to ${trimEnd} seconds (duration: ${duration}s)`);

  // Run FFmpeg command to trim the audio - save the selected part
  await ffmpeg.exec([
    '-i', 'input.mp3', 
    '-ss', `${startTime}`, 
    '-t', `${duration}`, 
    '-c:a', 'libmp3lame', 
    'output.mp3'
  ]);

      // Read the result file
      const trimmedData = await ffmpeg.readFile('output.mp3');
      
      // Convert to blob and create file
      const trimmedBlob = new Blob([trimmedData.buffer], { type: 'audio/mp3' });
      const trimmedFile = new File([trimmedBlob], `trimmed_${audio.name}`, { type: 'audio/mp3' });

      // Clean up virtual file system
      await ffmpeg.deleteFile('input.mp3');
      await ffmpeg.deleteFile('output.mp3');

      return trimmedFile;
    } catch (err) {
      console.error("FFmpeg trimming error:", err);
      console.warn("Failed to trim audio, using original file");
      return audio; // Return original file if trimming fails
    } finally {
      setTrimmingAudio(false);
    }
  };

  // Navigate between steps
  const goToNextStep = async () => {
    setError("");
    if (currentStep === 1) {
      if (!title.trim() || !artist.trim()) {
        setError("Please enter both artist name and song title");
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!cover) {
        setError("Please upload a cover image");
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      if (!audio) {
        setError("Please upload an audio file");
        return;
      }
      setCurrentStep(4);
    }
  };

  const goToPreviousStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    setError("");
  };

  // Upload files and save metadata to Firestore
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate inputs
    if (!artist.trim() || !title.trim() || !cover || !audio) {
      setError("All fields are required");
      return;
    }

    if (trimmingAudio) {
      setError("Audio is currently being trimmed. Please wait.");
      return;
    }

    setLoading(true);
    setError("");

    let trimmedAudioFile = audio;
    
    // Only trim if FFmpeg is available and loaded
    if (ffmpeg && !isFFmpegLoading) {
      const result = await trimAndSetAudio();
      if (result) {
        trimmedAudioFile = result;
      }
    } else {
      console.warn("FFmpeg not available, uploading original audio");
    }

    try {
      // Generate unique file names with timestamps to avoid collisions
      const timestamp = Date.now();
      const coverFileName = `${timestamp}_${cover.name.replace(/[^a-zA-Z0-9_.]/g, '_')}`;
      const audioFileName = `${timestamp}_trimmed_${trimmedAudioFile.name.replace(/[^a-zA-Z0-9_.]/g, '_')}`;

      // Upload cover with progress tracking
      const coverRef = ref(storage, `public_songs/covers/${coverFileName}`);
      const coverUploadTask = uploadBytesResumable(coverRef, cover);

      // Track cover upload progress
      coverUploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(prev => ({ ...prev, cover: progress }));
        },
        (error) => {
          console.error("Cover upload error:", error);
          setError(`Cover upload failed: ${error.message}. Please try again.`);
          setLoading(false);
        }
      );

      // Wait for cover upload to complete
      await coverUploadTask;
      const coverUrl = await getDownloadURL(coverRef);

      // Upload trimmed audio with progress tracking
      const audioRef = ref(storage, `public_songs/audio/${audioFileName}`);
      const audioUploadTask = uploadBytesResumable(audioRef, trimmedAudioFile);

      // Track audio upload progress
      audioUploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(prev => ({ ...prev, audio: progress }));
        },
        (error) => {
          console.error("Audio upload error:", error);
          setError(`Audio upload failed: ${error.message}. Please try again.`);
          setLoading(false);
        }
      );

      // Wait for audio upload to complete
      await audioUploadTask;
      const audioStorageUrl = await getDownloadURL(audioRef);

      // Save metadata to Firestore - Fixed to save start time as duration
      // Save metadata to Firestore - Save the correct trimmed duration
const docRef = await addDoc(collection(db, "songs"), {
  artist: artist.trim(),
  title: title.trim(),
  coverUrl,
  audioUrl: audioStorageUrl,
  trimStart: trimStart,
  trimEnd: trimEnd,
  duration: trimEnd - trimStart, // Save the actual duration of trimmed audio
  votes: 0,
  createdAt: serverTimestamp(),
  userId: user.uid,
});

      setUploadSuccess(true);

      // Reset form after a short delay to show success
      setTimeout(() => {
        setArtist("");
        setTitle("");
        setCover(null);
        setCoverPreview(null);
        setAudio(null);
        setAudioUrl("");
        setTrimStart(0);
        setTrimEnd(30);
        setUploadProgress({ cover: 0, audio: 0 });
        setUploadSuccess(false);
        onRequestClose();
      }, 1500);

    } catch (err) {
      console.error("Upload error:", err);
      setError(`Upload failed: ${err.message}. Please check your connection and try again.`);
    } finally {
      setLoading(false);
    }
  };

  // Clean up on modal close
  const handleModalClose = () => {
    // Don't close if currently uploading or trimming
    if (loading || trimmingAudio) return;

    // Destroy wavesurfer instance
    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
      wavesurferRef.current = null;
    }

    // Revoke object URLs
    if (audioUrl && audioUrl.startsWith('blob:')) {
      URL.revokeObjectURL(audioUrl);
    }
    if (coverPreview) {
      URL.revokeObjectURL(coverPreview);
    }

    // Reset state
    setError("");
    setUploadProgress({ cover: 0, audio: 0 });
    setArtist("");
    setTitle("");
    setCover(null);
    setCoverPreview(null);
    setAudio(null);
    setAudioUrl("");
    setTrimStart(0);
    setTrimEnd(30);
    setCurrentStep(1);

    // Call the provided close handler
    onRequestClose();
  };

  // Render step indicators
  const renderStepIndicators = () => {
    return (
      <div className="flex justify-center mb-6">
        {[1, 2, 3, 4].map((step) => (
          <div key={step} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep === step
                  ? 'bg-[#29F2C0] text-black'
                  : currentStep > step
                    ? 'bg-[#29F2C0]/20 text-[#29F2C0]'
                    : 'bg-gray-800 text-gray-400'
              }`}
            >
              {step}
            </div>
            {step < 4 && (
              <div
                className={`w-12 h-1 ${
                  currentStep > step ? 'bg-[#29F2C0]/50' : 'bg-gray-800'
                }`}
              ></div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Circular progress component
  const CircularProgress = ({ value, label }) => {
    const circumference = 2 * Math.PI * 45;
    const strokeDashoffset = circumference - (value / 100) * circumference;

    return (
      <div className="relative inline-flex">
        <svg className="w-32 h-32">
          <circle
            className="text-gray-700"
            strokeWidth="8"
            stroke="currentColor"
            fill="transparent"
            r="45"
            cx="64"
            cy="64"
          />
          <circle
            className="text-[#29F2C0]"
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            r="45"
            cx="64"
            cy="64"
            style={{
              transform: 'rotate(-90deg)',
              transformOrigin: '50% 50%',
            }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{Math.round(value)}%</p>
            <p className="text-sm text-gray-400">{label}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={handleModalClose}
      contentLabel="Upload Song"
      className="bg-[#181818] p-6 rounded-xl max-w-lg mx-auto mt-20 outline-none relative transform transition-all duration-300 ease-in-out"
      style={{
        overlay: {
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          zIndex: 50,
          paddingTop: '5vh',
          paddingBottom: '5vh',
          overflow: 'auto'
        },
        content: {
          maxHeight: '90vh',
          overflowY: 'auto',
          animation: isOpen ? 'fadeIn 0.3s ease-out' : 'fadeOut 0.3s ease-in'
        }
      }}
      overlayClassName="fixed inset-0 z-50 overflow-y-auto"
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-white">Upload Song</h2>
        <button
          onClick={handleModalClose}
          className="text-white hover:text-[#29F2C0] transition-colors"
          disabled={loading || trimmingAudio}
          aria-label="Close modal"
        >
          <X size={24} />
        </button>
      </div>

      {renderStepIndicators()}

      {uploadSuccess ? (
        <div className="alert alert-success bg-green-500/20 border border-green-500 rounded p-4 text-green-300">
          <CheckCircle size={24} />
          <div>
            <p className="font-medium">Upload successful!</p>
            <p className="text-sm">Your song has been added to the collection.</p>
          </div>
        </div>
      ) : (
        <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-4">
          {/* Error display */}
          {error && (
            <div className="alert alert-error bg-red-500/20 border border-red-500 rounded p-4 text-red-300">
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="flex flex-col gap-4 animate-fadeIn">
              <h3 className="text-lg font-medium text-white">Basic Information</h3>

              {/* Artist Name */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text text-white">Artist Name</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter artist name"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  required
                  className="input input-bordered bg-[#222] text-white border-gray-700 focus:border-[#29F2C0]"
                />
              </div>

              {/* Song Title */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text text-white">Song Title</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter song title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="input input-bordered bg-[#222] text-white border-gray-700 focus:border-[#29F2C0]"
                />
              </div>
            </div>
          )}

          {/* Step 2: Cover Image */}
          {currentStep === 2 && (
            <div className="flex flex-col gap-4 animate-fadeIn">
              <h3 className="text-lg font-medium text-white">Cover Artwork</h3>

              <div className="flex flex-col items-center gap-4">
                {coverPreview ? (
                  <div className="relative w-48 h-48 rounded-lg overflow-hidden">
                    <img
                      src={coverPreview}
                      alt="Cover preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => {
                        setCover(null);
                        setCoverPreview(null);
                      }}
                      className="absolute top-2 right-2 btn btn-sm btn-circle bg-black/70 hover:bg-black"
                      type="button"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <label className="w-48 h-48 border-2 border-dashed border-gray-600 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-[#29F2C0] transition-colors">
                    <Image size={32} className="text-gray-400 mb-2" />
                    <span className="text-gray-400 text-sm">Click to upload cover</span>
                    <span className="text-gray-500 text-xs mt-1">(1:1 ratio, max 5MB)</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCoverChange}
                      required
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Audio File */}
          {currentStep === 3 && (
            <div className="flex flex-col gap-4 animate-fadeIn">
              <h3 className="text-lg font-medium text-white">Audio File</h3>

              {audio ? (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2 p-3 bg-[#222] rounded">
                    <Music size={24} className="text-[#29F2C0]" />
                    <div className="flex-1 truncate">
                      <p className="text-white truncate">{audio.name}</p>
                      <p className="text-gray-400 text-sm">
                        {(audio.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setAudio(null);
                        setAudioUrl("");
                        if (wavesurferRef.current) {
                          wavesurferRef.current.destroy();
                          wavesurferRef.current = null;
                        }
                      }}
                      className="text-gray-400 hover:text-white"
                      type="button"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Visual waveform trimming interface */}
                  {audioUrl && (
                    <div className="space-y-4">
                      <div className="relative bg-[#222] rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Scissors size={16} className="text-[#29F2C0]" />
                          <span className="text-sm text-gray-400">Drag the region to select trim point</span>
                        </div>
                        
                        {/* Waveform container */}
                        <div
                          ref={waveformRef}
                          className="w-full"
                          style={{ minHeight: '100px' }}
                        />
                        
                        {/* Time stamps below waveform */}
                        <div className="flex justify-between text-xs text-gray-500 mt-2 px-1">
                          <span>0:00</span>
                          <span>{formatTime(duration / 2)}</span>
                          <span>{formatTime(duration)}</span>
                        </div>
                      </div>

                     {/* Selected trim info */}
<div className="bg-[#222] rounded-lg p-4">
  <div className="text-center">
    <p className="text-sm text-gray-400 mb-1">Selected portion:</p>
    <p className="text-2xl font-bold text-[#29F2C0]">
      {formatTime(trimStart)} - {formatTime(trimEnd)}
    </p>
    <p className="text-sm text-gray-400 mt-1">
      Duration: {formatTime(trimEnd - trimStart)}
    </p>
    <p className="text-sm text-gray-500 mt-1">
      {ffmpeg && !isFFmpegLoading ? 'Drag the red region to adjust selection' : 'Trimming not available'}
    </p>
  </div>
</div>

                      {/* Preview button */}
                      <button
                        type="button"
                        onClick={handlePreviewPlay}
                        className="btn btn-outline btn-primary border-[#29F2C0] text-[#29F2C0] hover:bg-[#29F2C0] hover:text-black w-full"
                      >
                        {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                        <span className="ml-2">
                          {isPlaying ? 'Pause Preview' : 'Play Trimmed Preview'}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <label className="border-2 border-dashed border-gray-600 rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:border-[#29F2C0] transition-colors">
                  <Upload size={32} className="text-gray-400 mb-2" />
                  <span className="text-gray-400 text-center">Click to upload audio file</span>
                  <span className="text-gray-500 text-xs mt-1">(MP3, WAV, max 20MB)</span>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleAudioChange}
                    required
                    className="hidden"
                  />
                </label>
              )}

              {isFFmpegLoading && (
                <div className="text-gray-400 text-sm text-center">
                  <p>Loading audio processing tools...</p>
                  <div className="mt-2 w-full bg-gray-700 rounded-full h-2">
                    <div className="h-2 rounded-full bg-[#29F2C0] animate-pulse"></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Review and Submit */}
          {currentStep === 4 && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              <h3 className="text-lg font-medium text-white">Review & Submit</h3>

              <div className="flex gap-4 items-center">
                {/* Cover preview */}
                {coverPreview && (
                  <div className="w-24 h-24 rounded overflow-hidden flex-shrink-0">
                    <img
                      src={coverPreview}
                      alt="Cover preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Song info */}
                <div className="flex-1">
                  <h4 className="text-lg font-medium text-white">{title}</h4>
                  <p className="text-gray-400">{artist}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Duration: {formatTime(trimEnd - trimStart)}
                  </p>
                </div>
              </div>

              {/* Preview waveform */}
              {audioUrl && (
                <div className="bg-[#222] rounded-lg p-4">
                  <button
                    type="button"
                    onClick={handlePreviewPlay}
                    className="btn btn-sm btn-circle mb-2 bg-[#29F2C0] hover:bg-[#20d3a6] border-none text-black"
                    aria-label={isPlaying ? "Pause preview" : "Play preview"}
                  >
                    {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                  </button>
                  <div
                    ref={waveformRef}
                    className="w-full"
                    style={{ minHeight: '60px' }}
                  />
                </div>
              )}

              {/* Submit button */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || trimmingAudio}
                className={`btn ${
                  loading || trimmingAudio
                    ? 'bg-gray-600 text-gray-400'
                    : 'bg-[#29F2C0] hover:bg-[#20d3a6] text-black'
                } border-none w-full`}
              >
                {loading ? 'Uploading...' : trimmingAudio ? 'Processing Audio...' : 'Upload Song'}
              </button>

              {/* Upload progress visualization */}
              {loading && (
                <div className="flex flex-col items-center justify-center gap-4 mt-2">
                  <div className="flex gap-8">
                    <CircularProgress value={uploadProgress.cover} label="Cover" />
                    <CircularProgress value={uploadProgress.audio} label="Audio" />
                  </div>
                  <p className="text-sm text-gray-400">
                    {trimmingAudio
                      ? "Processing audio file..."
                      : "Uploading files to storage..."}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Navigation buttons */}
          {!loading && !uploadSuccess && (
            <div className="flex justify-between mt-4">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={goToPreviousStep}
                  className="btn btn-outline text-white border-gray-700 hover:bg-gray-700"
                  disabled={loading || trimmingAudio}
                >
                  Back
                </button>
              ) : (
                <div></div> // Empty div for flex spacing
              )}

              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={goToNextStep}
                  className="btn bg-[#29F2C0] hover:bg-[#20d3a6] text-black border-none"
                  disabled={loading || trimmingAudio}
                >
                  Next
                </button>
              ) : null}
            </div>
          )}
        </form>
      )}

      {/* Additional CSS to enhance the draggable region markers */}
      <style >{`
        /* Enhance WaveSurfer region styles */
        .wavesurfer-region {
          border-radius: 4px;
          transition: background 0.2s ease;
        }
        
        /* Hide the default wavesurfer handles as we're using custom ones */
        .wavesurfer-handle {
          width: 0 !important;
          opacity: 0 !important;
        }
        
        /* Custom timestamp marker styling */
        .timestamp-marker {
          position: absolute;
          width: 2px;
          height: 100%;
          background-color: rgba(255, 0, 0, 0.8);
          top: 0;
          z-index: 10;
          pointer-events: none;
        }
        
        /* Add custom marker handles for dragging */
        .marker-handle {
          position: absolute;
          width: 20px;
          height: 40px;
          background-color: rgba(255, 0, 0, 0.8);
          border-radius: 4px;
          bottom: 0;
          left: -9px;
          cursor: col-resize;
          pointer-events: auto;
        }
        
        .marker-handle:hover {
          background-color: rgb(255, 0, 0);
        }
        
        .marker-handle::before {
          content: '';
          position: absolute;
          top: 8px;
          left: 6px;
          width: 8px;
          height: 24px;
          background-image: linear-gradient(
            to right,
            rgba(255, 255, 255, 0.5) 1px,
            transparent 1px
          );
          background-size: 3px 100%;
        }
        
        .marker-time {
          position: absolute;
          top: -30px;
          left: 50%;
          transform: translateX(-50%);
          background-color: #ff0000;
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          white-space: nowrap;
          pointer-events: none;
          font-weight: bold;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
        }
        
        /* Animation for transitions */
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
        
        /* Add controller styles */
        .waveform-controller {
          position: absolute;
          bottom: -30px;
          left: 50%;
          transform: translateX(-50%);
          background-color: #fff;
          border-radius: 4px;
          padding: 5px;
          display: flex;
          align-items: center;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
        }
        
        .controller-button {
          background: none;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
        }
        
        .controller-button:hover {
          background-color: rgba(0, 0, 0, 0.1);
          border-radius: 50%;
        }
      `}</style>
    </Modal>
  );
};

export default UploadModal