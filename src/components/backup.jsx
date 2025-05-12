import React, { useRef, useState, useEffect } from "react";
import Modal from "react-modal";
import { db, storage } from "../services/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import WaveSurfer from "wavesurfer.js";
import { useAuth } from "../hooks/useAuth";
import { X, Upload, Play, Music, Image, CheckCircle, Pause } from "lucide-react";

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
  const [currentStep, setCurrentStep] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);

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
    }
  }, [isOpen]);

  // Load audio for trimming
  const handleAudioChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('audio/')) {
      setError("Please select a valid audio file");
      return;
    }
    
    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError("Audio file must be less than 10MB");
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
      
      wavesurferRef.current = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: "#29F2C0",
        progressColor: "#0A0A0A",
        height: 80,
        barWidth: 2,
        responsive: true,
        cursorColor: "#ffffff"
      });
      
      wavesurferRef.current.load(url);
      
      wavesurferRef.current.on("ready", () => {
        const duration = wavesurferRef.current.getDuration();
        // Set end trim to either full duration or 30s, whichever is shorter
        setTrimEnd(Math.min(30, duration));
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

  // Navigate between steps
  const goToNextStep = () => {
    // Validate current step
    if (currentStep === 1) {
      if (!title.trim() || !artist.trim()) {
        setError("Please enter both artist name and song title");
        return;
      }
    } else if (currentStep === 2) {
      if (!cover) {
        setError("Please upload a cover image");
        return;
      }
    } else if (currentStep === 3) {
      if (!audio) {
        setError("Please upload an audio file");
        return;
      }
    }
    
    setError("");
    setCurrentStep(prev => Math.min(prev + 1, 4));
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
    
    setLoading(true);
    setError("");
    
    try {
      // Generate unique file names with timestamps to avoid collisions
      const timestamp = Date.now();
      const coverFileName = `${timestamp}_${cover.name.replace(/[^a-zA-Z0-9_.]/g, '_')}`;
      const audioFileName = `${timestamp}_${audio.name.replace(/[^a-zA-Z0-9_.]/g, '_')}`;
      
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
      
      // Upload audio with progress tracking
      const audioRef = ref(storage, `public_songs/audio/${audioFileName}`);
      const audioUploadTask = uploadBytesResumable(audioRef, audio);
      
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
      
      // Save metadata to Firestore
      const docRef = await addDoc(collection(db, "songs"), {
        artist: artist.trim(),
        title: title.trim(),
        coverUrl,
        audioUrl: audioStorageUrl,
        trimStart,
        trimEnd,
        votes: 0,
        createdAt: serverTimestamp(),
        userId: user.uid, // Store user ID with the song
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
    // Don't close if currently uploading
    if (loading) return;
    
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
      
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-white">Upload Song</h2>
        <button
          onClick={handleModalClose}
          className="text-white hover:text-[#29F2C0] transition-colors"
          disabled={loading}
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

                  {/* Waveform visualization */}
                  {audioUrl && (
                    <div className="space-y-4">
                      <div 
                        ref={waveformRef} 
                        className="w-full bg-[#222] rounded p-4"
                      />
                      
                      {/* Trim controls */}
                      <div className="flex gap-4">
                        <div className="form-control flex-1">
                          <label className="label">
                            <span className="label-text text-white">Start (s)</span>
                          </label>
                          <input
                            type="number"
                            value={trimStart}
                            onChange={(e) => setTrimStart(parseFloat(e.target.value) || 0)}
                            min="0"
                            max={trimEnd - 1}
                            step="0.1"
                            className="input input-bordered input-sm bg-[#222] text-white border-gray-700"
                          />
                        </div>
                        
                        <div className="form-control flex-1">
                          <label className="label">
                            <span className="label-text text-white">End (s)</span>
                          </label>
                          <input
                            type="number"
                            value={trimEnd}
                            onChange={(e) => setTrimEnd(parseFloat(e.target.value) || 30)}
                            min={trimStart + 1}
                            step="0.1"
                            className="input input-bordered input-sm bg-[#222] text-white border-gray-700"
                          />
                        </div>
                      </div>
                      
                      {/* Preview button */}
                      <button
                        type="button"
                        onClick={handlePreviewPlay}
                        className="btn btn-outline btn-primary border-[#29F2C0] text-[#29F2C0] hover:bg-[#29F2C0] hover:text-black w-full"
                      >
                        {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                        {isPlaying ? 'Pause Preview' : 'Play Preview'}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <label className="border-2 border-dashed border-gray-600 rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:border-[#29F2C0] transition-colors">
                  <Upload size={32} className="text-gray-400 mb-2" />
                  <span className="text-gray-400">Click to upload audio file</span>
                  <span className="text-gray-500 text-xs mt-1">(Max 10MB)</span>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleAudioChange}
                    required
                    className="hidden"
                  />
                </label>
              )}
            </div>
          )}
          
          {/* Step 4: Review & Upload */}
          {currentStep === 4 && (
            <div className="flex flex-col gap-4 animate-fadeIn">
              <h3 className="text-lg font-medium text-white">Review & Upload</h3>
              
              {!loading ? (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="bg-[#222] rounded p-4 space-y-2">
                    <p className="text-gray-400">Artist: <span className="text-white">{artist}</span></p>
                    <p className="text-gray-400">Title: <span className="text-white">{title}</span></p>
                    <p className="text-gray-400">Cover: <span className="text-white">{cover?.name}</span></p>
                    <p className="text-gray-400">Audio: <span className="text-white">{audio?.name}</span></p>
                    <p className="text-gray-400">Trim: <span className="text-white">{trimStart}s - {trimEnd}s</span></p>
                  </div>
                  
                  {/* Upload button */}
                  <button
                    onClick={handleSubmit}
                    className="btn btn-primary bg-[#29F2C0] hover:bg-[#1ed9a3] text-black border-none w-full"
                  >
                    Upload Song
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Upload progress */}
                  <div className="flex justify-center gap-8">
                    <CircularProgress value={uploadProgress.cover} label="Cover" />
                    <CircularProgress value={uploadProgress.audio} label="Audio" />
                  </div>
                  
                  <p className="text-center text-gray-400">
                    {uploadProgress.cover < 100 ? 'Uploading cover image...' : 
                     uploadProgress.audio < 100 ? 'Uploading audio file...' : 
                     'Saving to database...'}
                  </p>
                </div>
              )}
            </div>
          )}
          
          {/* Navigation buttons */}
          {!loading && !uploadSuccess && (
            <div className="flex gap-4 mt-6">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={goToPreviousStep}
                  className="btn btn-outline flex-1"
                >
                  Previous
                </button>
              )}
              
              {currentStep < 4 && (
                <button
                  type="button"
                  onClick={goToNextStep}
                  className="btn btn-primary bg-[#29F2C0] hover:bg-[#1ed9a3] text-black border-none flex-1"
                >
                  Next
                </button>
              )}
            </div>
          )}
        </form>
      )}
    </Modal>
  );
};

export default UploadModal