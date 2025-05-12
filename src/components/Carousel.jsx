import React, { useState, useEffect, useMemo } from "react";
import { useCollection } from "react-firebase-hooks/firestore";
import { db } from "../services/firebase";
import { collection, doc, updateDoc, increment, query, orderBy, getDoc, setDoc, serverTimestamp, where, limit } from "firebase/firestore";
import UploadModal from "./UploadModal";
import { useAuth } from "../hooks/useAuth";
import { Heart, Play, Pause, ChevronLeft, ChevronRight, Upload, MoreHorizontal } from "lucide-react";

const Carousel = () => {
  const [showModal, setShowModal] = useState(false);
  const { user } = useAuth();
  const [showMoreNewSongs, setShowMoreNewSongs] = useState(false);
  
  // Create a ref to store the 24 hour cutoff time to prevent recreating it on every render
  const oneDayAgo = React.useMemo(() => new Date(Date.now() - 24 * 60 * 60 * 1000), []);
  
  // Get top 50 liked songs
  const [topSongsSnapshot, topSongsLoading, topSongsError] = useCollection(
    query(
      collection(db, "songs"),
      orderBy("votes", "desc"),
      limit(50)
    )
  );
  
  // Get new releases (songs uploaded in the last 24 hours)
  const [newReleasesSnapshot, newReleasesLoading, newReleasesError] = useCollection(
    query(
      collection(db, "songs"),
      orderBy("createdAt", "desc")
    )
  );
  
  const [hovered, setHovered] = useState(null);
  const [playing, setPlaying] = useState(null);
  const [audioObj, setAudioObj] = useState(null);
  const [loadingStates, setLoadingStates] = useState({});
  const [votedRecently, setVotedRecently] = useState({});
  // Store voting progress state to prevent multiple votes
  const [isVoting, setIsVoting] = useState({});
  // Local cache of vote counts to prevent UI jumping
  const [localVoteCounts, setLocalVoteCounts] = useState({});
  
  // Convert snapshots to array of songs
  const topSongs = useMemo(() => {
    return topSongsSnapshot
      ? topSongsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      : [];
  }, [topSongsSnapshot]);
  
  const newReleases = useMemo(() => {
    return newReleasesSnapshot
      ? newReleasesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      : [];
  }, [newReleasesSnapshot]);
  
  // Check if user has voted on songs recently
  useEffect(() => {
    if (!user) {
      return;
    }
    
    // Track if the component is still mounted
    let isMounted = true;
    
    const checkVoteStatus = async () => {
      const allSongs = [
        ...(topSongsSnapshot?.docs || []).map(doc => ({ id: doc.id })),
        ...(newReleasesSnapshot?.docs || []).map(doc => ({ id: doc.id }))
      ];
      
      // De-duplicate songs
      const uniqueSongIds = [...new Set(allSongs.map(song => song.id))];
      
      const voteStatusObj = {};
      
      // Check each song's vote status
      for (const songId of uniqueSongIds) {
        try {
          const voteRef = doc(db, "votes", `${user.uid}_${songId}`);
          const voteDoc = await getDoc(voteRef);
          
          if (voteDoc.exists()) {
            const lastVoted = voteDoc.data().timestamp?.toDate() || new Date(0);
            const hoursSinceVote = (new Date() - lastVoted) / (1000 * 60 * 60);
            voteStatusObj[songId] = hoursSinceVote < 24; // Can only vote once every 24 hours
          } else {
            voteStatusObj[songId] = false;
          }
        } catch (err) {
          console.error("Error checking vote status:", err);
          voteStatusObj[songId] = false;
        }
      }
      
      // Only update state if component is still mounted
      if (isMounted) {
        setVotedRecently(voteStatusObj);
      }
    };
    
    checkVoteStatus();
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [topSongsSnapshot, newReleasesSnapshot, user]);
  
  // Initialize local vote counts from song data
  useEffect(() => {
    // Initialize vote counts for top songs
    if (topSongsSnapshot) {
      const newCounts = { ...localVoteCounts };
      let hasChanges = false;
      
      topSongsSnapshot.docs.forEach(doc => {
        const songData = doc.data();
        if (newCounts[doc.id] === undefined) {
          newCounts[doc.id] = songData.votes || 0;
          hasChanges = true;
        }
      });
      
      if (hasChanges) {
        setLocalVoteCounts(newCounts);
      }
    }
  }, [topSongsSnapshot]);
  
  // Initialize vote counts for new releases
  useEffect(() => {
    if (newReleasesSnapshot) {
      const newCounts = { ...localVoteCounts };
      let hasChanges = false;
      
      newReleasesSnapshot.docs.forEach(doc => {
        const songData = doc.data();
        if (newCounts[doc.id] === undefined) {
          newCounts[doc.id] = songData.votes || 0;
          hasChanges = true;
        }
      });
      
      if (hasChanges) {
        setLocalVoteCounts(newCounts);
      }
    }
  }, [newReleasesSnapshot]);
  
  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioObj) {
        audioObj.pause();
        audioObj.src = "";
      }
    };
  }, [audioObj]);
  
  // Handle voting on songs with 24-hour limit enforcement
  const handleVote = async (songId) => {
    if (!user) {
      alert("Please sign in to vote for tracks");
      return;
    }
    
    if (votedRecently[songId]) {
      alert("You can only vote once every 24 hours for the same song");
      return;
    }
    
    // Prevent multiple clicks while voting is in progress
    if (isVoting[songId]) {
      return;
    }
    
    try {
      // Set voting in progress
      setIsVoting(prev => ({ ...prev, [songId]: true }));
      
      // Update local vote count immediately for UI feedback
      setLocalVoteCounts(prev => ({
        ...prev,
        [songId]: (prev[songId] || 0) + 1
      }));
      
      // Update local state immediately to prevent multiple votes
      setVotedRecently(prev => ({
        ...prev,
        [songId]: true
      }));
      
      // Update song vote count
      const songRef = doc(db, "songs", songId);
      await updateDoc(songRef, {
        votes: increment(1)
      });
      
      // Record vote timestamp
      const voteRef = doc(db, "votes", `${user.uid}_${songId}`);
      await setDoc(voteRef, {
        userId: user.uid,
        songId: songId,
        timestamp: serverTimestamp()
      });
    } catch (err) {
      // Revert local state on error
      setVotedRecently(prev => ({
        ...prev,
        [songId]: false
      }));
      
      // Revert local vote count on error
      setLocalVoteCounts(prev => ({
        ...prev,
        [songId]: Math.max((prev[songId] || 0) - 1, 0)
      }));
      
      console.error("Error voting:", err);
      alert("Failed to register vote. Please try again.");
    } finally {
      // Clear voting in progress state
      setIsVoting(prev => ({ ...prev, [songId]: false }));
    }
  };
  
  // Play 30s preview
  const handlePlay = (song) => {
    // If already playing something, stop it
    if (audioObj) {
      audioObj.pause();
      setAudioObj(null);
      
      // If clicking the same song that's playing, just stop and exit
      if (playing === song.id) {
        setPlaying(null);
        return;
      }
    }
    
    // Start loading the song
    setLoadingStates(prev => ({ ...prev, [song.id]: true }));
    
    // Create new audio object
    const audio = new Audio(song.audioUrl);
    
    // Set up error handling
    audio.onerror = () => {
      console.error("Error playing audio:", audio.error);
      setPlaying(null);
      setLoadingStates(prev => ({ ...prev, [song.id]: false }));
    };
    
    // Set up loaded data event
    audio.onloadeddata = () => {
      setLoadingStates(prev => ({ ...prev, [song.id]: false }));
      
      // Set the start position from trimming
      audio.currentTime = song.trimStart || 0;
      
      // Play the audio
      audio.play().catch(err => {
        console.error("Failed to play audio:", err);
        setPlaying(null);
      });
    };
    
    // Update state
    setPlaying(song.id);
    setAudioObj(audio);
    
    // Calculate duration of the trim
    const duration = (song.trimEnd || 30) - (song.trimStart || 0);
    
    // Set up ended event or timeout to stop after the trim end
    if (song.trimEnd) {
      setTimeout(() => {
        if (audioObj === audio) {
          audio.pause();
          setPlaying(null);
        }
      }, duration * 1000);
    } else {
      audio.onended = () => {
        setPlaying(null);
      };
    }
  };
  
  // Scroll tracks horizontally
  const scrollLeft = (containerId) => {
    const container = document.getElementById(containerId);
    
    if (container) {
      container.scrollBy({
        left: -800,
        behavior: 'smooth'
      });
    }
  };
  
  const scrollRight = (containerId) => {
    const container = document.getElementById(containerId);
    
    if (container) {
      container.scrollBy({
        left: 800,
        behavior: 'smooth'
      });
    }
  };
  
  // Render a single song card
  const renderSongCard = (song) => {
    // Use local vote count if available, otherwise use song votes
    const voteCount = localVoteCounts[song.id] !== undefined ? localVoteCounts[song.id] : (song.votes || 0);
    
    return (
      <div
        key={song.id}
        className="card w-full bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300"
        onMouseEnter={() => setHovered(song.id)}
        onMouseLeave={() => setHovered(null)}
      >
        <div className="relative aspect-square overflow-hidden rounded-t-lg">
          <img 
            src={song.coverUrl} 
            alt={`${song.title} by ${song.artist}`}
            className="w-full h-full object-cover"
          />
          
          <button
            onClick={() => handlePlay(song)}
            className={`absolute inset-0 flex items-center justify-center bg-black/60 transition-opacity ${
              hovered === song.id || playing === song.id ? 'opacity-100' : 'opacity-0'
            } group-hover:opacity-100`}
          >
            {loadingStates[song.id] ? (
              <div className="w-12 h-12 rounded-full border-2 border-white/30 border-t-[#29F2C0] animate-spin"></div>
            ) : playing === song.id ? (
              <Pause size={40} className="text-[#29F2C0]" />
            ) : (
              <Play size={40} className="text-white ml-1" />
            )}
          </button>
        </div>
        
        <div className="card-body p-4">
          <h3 className="card-title text-base truncate">{song.title}</h3>
          <p className="text-sm text-gray-400 truncate">{song.artist}</p>
          
          <div className="flex items-center justify-between mt-2">
            <button
              onClick={() => !votedRecently[song.id] && handleVote(song.id)}
              disabled={!user || votedRecently[song.id] || isVoting[song.id]}
              className={`flex items-center gap-2 text-sm transition-all duration-300 ${
                votedRecently[song.id] || isVoting[song.id]
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:scale-110'
              }`}
              title={
                !user 
                  ? "Sign in to vote" 
                  : votedRecently[song.id] 
                    ? "You can vote again in 24 hours" 
                    : "Vote for this track"
              }
            >
              <Heart 
                size={16} 
                className={`transition-transform ${
                  votedRecently[song.id] 
                    ? "fill-red-500" 
                    : "text-gray-300 hover:text-red-500"
                }`}
              />
              <span>{voteCount}</span>
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6">
      {/* Header section */}
      <div className="flex flex-col justify-center items-center py-8 text-center px-4">
        <h1 className="text-4xl font-bold mb-3">Vote For Your Favorite Song</h1>
        <p className="text-gray-400 max-w-2xl">Get early access to the future of music ownership and streaming</p>
        
        <button 
          onClick={() => setShowModal(true)}
          className="mt-6 gap-2 flex items-center justify-center text-white py-2 px-4 rounded-md transition-all duration-300 hover:shadow-lg hover:opacity-90"
          style={{ backgroundColor: "rgb(39, 220, 175)" }}
          aria-label="Upload Song"
        >
          <Upload size={18} />
          <span>Upload Song (30s max)</span>
        </button>
      </div>
      
      {/* Top 50 liked songs carousel */}
      <div className="py-8 relative">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-2xl font-bold">50 Most Liked Songs</h2>
          <div className="flex space-x-3">
            <button 
              onClick={() => scrollLeft("top-songs-carousel")}
              className="btn btn-circle btn-sm"
              aria-label="Scroll left"
            >
              <ChevronLeft size={20} />
            </button>
            <button 
              onClick={() => scrollRight("top-songs-carousel")}
              className="btn btn-circle btn-sm"
              aria-label="Scroll right"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
        
        {topSongsLoading ? (
          <div className="flex gap-5 overflow-x-auto pb-6" id="top-songs-carousel">
            {Array(5).fill(0).map((_, index) => (
              <div 
                key={`placeholder-${index}`}
                className="carousel-item w-60 shrink-0 animate-pulse"
              >
                <div className="bg-base-300 h-60 w-full rounded-lg"></div>
                <div className="bg-base-300 h-4 w-3/4 mt-3 rounded"></div>
                <div className="bg-base-300 h-3 w-1/2 mt-2 rounded"></div>
              </div>
            ))}
          </div>
        ) : topSongs.length === 0 ? (
          <div className="text-center py-8">No top songs available yet</div>
        ) : (
          <div className="carousel carousel-center w-full p-2 space-x-5 rounded-box" id="top-songs-carousel">
            {topSongs.map(song => (
              <div className="carousel-item w-60 shrink-0" key={song.id}>
                {renderSongCard(song)}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* New releases grid */}
      <div className="py-8">
        <h2 className="text-2xl font-bold mb-5">New Releases</h2>
        
        {newReleasesLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
            {Array(10).fill(0).map((_, index) => (
              <div 
                key={`placeholder-${index}`}
                className="animate-pulse"
              >
                <div className="bg-base-300 h-48 w-full rounded-lg"></div>
                <div className="bg-base-300 h-4 w-3/4 mt-3 rounded"></div>
                <div className="bg-base-300 h-3 w-1/2 mt-2 rounded"></div>
              </div>
            ))}
          </div>
        ) : newReleases.length === 0 ? (
          <div className="text-center py-8">No new releases available</div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-5">
              {/* Show first 18 songs, or all if Show More is clicked */}
              {newReleases
                .slice(0, showMoreNewSongs ? undefined : 18)
                .map(renderSongCard)}
            </div>
            
            {!showMoreNewSongs && newReleases.length > 18 && (
              <div className="text-center mt-8">
                <button 
                  onClick={() => setShowMoreNewSongs(true)}
                  className="btn btn-outline btn-wide"
                >
                  Show More Songs
                </button>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Upload Modal */}
      <UploadModal 
        isOpen={showModal} 
        onRequestClose={() => setShowModal(false)}
      />
    </div>
  );
};

export default Carousel;