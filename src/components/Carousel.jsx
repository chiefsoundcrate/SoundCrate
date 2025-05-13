import React, { useState, useEffect, useMemo } from "react";
import { useCollection } from "react-firebase-hooks/firestore";
import { db } from "../services/firebase";
import { collection, doc, updateDoc, increment, query, orderBy, getDoc, setDoc, serverTimestamp, where, limit } from "firebase/firestore";
import UploadModal from "./UploadModal";
import { useAuth } from "../hooks/useAuth";
import { Heart, Play, Pause, ChevronLeft, ChevronRight, Upload, Share } from "lucide-react";

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
  
  // Handle share functionality
  const handleShare = (song, e) => {
    e.stopPropagation();
    
    if (navigator.share) {
      navigator.share({
        title: `${song.title} by ${song.artist}`,
        text: `Check out "${song.title}" by ${song.artist}!`,
        url: window.location.href,
      })
      .catch((error) => console.log('Error sharing', error));
    } else {
      // Fallback for browsers without native share API
      const shareText = `Check out "${song.title}" by ${song.artist}!`;
      const shareUrl = window.location.href;
      
      navigator.clipboard.writeText(`${shareText} ${shareUrl}`)
        .then(() => alert("Link copied to clipboard!"))
        .catch(() => alert("Failed to copy link"));
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
      className="relative w-full rounded-[20px] overflow-hidden border-1 border-gray-800 hover:border-[#4d6b64] transition-all duration-500 group hover:shadow-xl hover:shadow-[#0d5946]/10 transform hover:-translate-y-1"
      onMouseEnter={() => setHovered(song.id)}
      onMouseLeave={() => setHovered(null)}
      style={{ fontFamily: "Inter" }}
  >
      <div className="relative aspect-square overflow-hidden bg-gray-900">
          {/* Image with parallax effect */}
          <div className="relative h-full w-full transform group-hover:scale-100 transition-transform duration-500 ease-out">
              <img 
                  src={song.coverUrl} 
                  alt={`${song.title} by ${song.artist}`}
                  className="w-full h-full object-cover absolute inset-0"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
  
          {/* Share button - Glass morphism style */}
          <button
              onClick={(e) => handleShare(song, e)}
              className="absolute top-4 left-4 p-2.5 backdrop-blur-lg bg-black/40 rounded-xl hover:bg-[#29f2c0] transition-all z-10 hover:shadow-glow hover:shadow-[#29f2c0]/30 "
          >
              <Share size={15} className="text-[#29f2c0] group-hover:text-black transition-colors" />
          </button>
  
          {/* Vote button - Animated heart */}
          <button
              onClick={(e) => handleVote(e, song.id)}
              disabled={!user || votedRecently[song.id] || isVoting[song.id]}
              className={`absolute top-4 right-4 p-2.5 backdrop-blur-lg bg-black/40 rounded-xl transition-all z-10 ${
                  votedRecently[song.id] || isVoting[song.id]
                      ? 'opacity-70 cursor-not-allowed' 
                      : 'hover:bg-red-500/20 active:scale-95'
              }`}
              title={ !user 
                ? "Sign in to vote" 
                : votedRecently[song.id] 
                  ? "You can vote again in 24 hours" 
                  : "Vote for this track"
            }
          >
              <Heart 
                  size={15}
                  className={`transition-all ${
                      votedRecently[song.id] 
                          ? "text-red-500 scale-125" 
                          : "text-gray-300 group-hover:text-red-500"
                  } ${!votedRecently[song.id] && 'group-hover:scale-110'}`}
                  fill={votedRecently[song.id] ? "#ef4444" : "transparent"}
              />
          </button>
  
          {/* Play button - Holographic effect */}
          <button
              onClick={() => handlePlay(song)}
              className={`absolute inset-0 flex items-center justify-center bg-gradient-to-b from-black/30 via-transparent to-black/60 transition-opacity ${
                  hovered === song.id || playing === song.id ? 'opacity-100' : 'opacity-0'
              }`}
          >
              {loadingStates[song.id] ? (
                  <div className="w-16 h-16 rounded-full border-[3px] border-white/10 border-t-[#29F2C0] animate-spin" />
              ) : playing === song.id ? (
                  <div className="pulse-animation">
                      <Pause size={48} className="text-[#29F2C0] drop-shadow-2xl" />
                  </div>
              ) : (
                  <Play size={48} className="text-[#29F2C0] ml-1 drop-shadow-2xl transform group-hover:translate-x-0.5" />
              )}
          </button>
      </div>
  
      {/* Info section - Premium dark theme */}
      <div className="bg-gradient-to-r  via-gray-950 to-black p-4 border-t border-gray-800">
          <div className="flex justify-between items-center space-x-4">
              <div className="overflow-hidden flex-1">
                  <h3 className="font-extrabold text-[#29f2c0] text-sm truncate tracking-wide uppercase">
                      {song.title}
                  </h3>
                  <p className="text-gray-300/80 text-xs font-medium truncate mt-1 tracking-wider">
                      {song.artist}
                  </p>
              </div>
              <div className="flex items-center">
                  <div className="flex items-center space-x-2 bg-black/30 px-3 py-1.5 rounded-full border border-gray-700/50">
                      
                      <span className="text-xs font-bold tracking-wide">
                          <span className="text-[#29f2c0]">{voteCount}</span>
                          <span className="text-gray-400 ml-1.5">VOTES</span>
                      </span>
                  </div>
              </div>
          </div>
      </div>
  
      {/* Hover effect border */}
      <div className="absolute inset-0 border-2 border-[#2ed5ab] rounded-[20px] pointer-events-none opacity-0 group-hover:opacity-30 transition-opacity duration-300" />
  </div>
    );
  };
  
  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6" style={{ fontFamily: "Inter" }}>
      {/* Header section */}
      <div className="flex flex-col justify-center items-center py-8 text-center px-4" style={{ fontFamily: "Inter" }}>
        <h1 className="text-5xl  mb-3" style={{ fontFamily: "Inter" }}>Vote For Your Favorite Song</h1>
        <p className="text-gray-400 max-w-2xl " style={{ fontFamily: "Inter" }}>Get early access to the future of music ownership and streaming</p>
        
        <button 
          onClick={() => setShowModal(true)}
          className="mt-6 gap-2 flex items-center justify-center text-black py-2 px-4 rounded-md transition-all duration-300 hover:shadow-lg hover:opacity-90"
          style={{ backgroundColor: "rgb(39, 220, 175)", fontFamily: "Inter" }}
          aria-label="Upload Song"
        >
          <Upload size={18} />
          <span>Upload </span>

        </button>
        <p className="mt-3 text-gray-400" style={{fontFamily:"Inter"}}>Upload Song (30s max)</p>
      </div>
      
      {/* Featured songs carousel (renamed from Top 50) */}
      <div className="py-8 relative top-9" style={{ fontFamily: "Inter" }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-2xl mb-3 font-bold" style={{ fontFamily: "Inter" }}>Featured Songs</h2>
          <div className="flex space-x-3">
            <button 
              onClick={() => scrollLeft("top-songs-carousel")}
              className="p-2 rounded-full bg-gray-700 hover:bg-[#569988]"
              aria-label="Scroll left"
              style={{ fontFamily: "Inter" }}
            >
              <ChevronLeft size={20} />
            </button>
            <button 
              onClick={() => scrollRight("top-songs-carousel")}
              className="p-2 rounded-full bg-gray-700 hover:bg-[#569988]"
              aria-label="Scroll right"
              style={{ fontFamily: "Inter" }}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
        
        {topSongsLoading ? (
          <div className="flex gap-5 overflow-x-auto pb-6 mt-3.5 " id="top-songs-carousel ">
            {Array(5).fill(0).map((_, index) => (
              <div 
                key={`placeholder-${index}`}
                className="w-60 shrink-0 animate-pulse"
              >
                <div className="bg-gray-200 h-60 w-full rounded-lg"></div>
                <div className="bg-gray-200 h-4 w-3/4 mt-3 rounded"></div>
                <div className="bg-gray-200 h-3 w-1/2 mt-2 rounded"></div>
              </div>
            ))}
          </div>
        ) : topSongs.length === 0 ? (
          <div className="text-center py-8" style={{ fontFamily: "Inter" }}>No featured songs available yet</div>
        ) : (
          <div className="flex mt-7 overflow-x-auto space-x-5 pb-2 hide-scrollbar" id="top-songs-carousel">
            {topSongs.map(song => (
              <div className="w-60 shrink-0" key={song.id}>
                {renderSongCard(song)}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* New releases grid */}
      <div className="py-8 relative top-20" style={{ fontFamily: "Inter" }}>
        <h2 className="text-2xl font-bold mb-5" style={{ fontFamily: "Inter" }}>New Releases</h2>
        
        {newReleasesLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
            {Array(10).fill(0).map((_, index) => (
              <div 
                key={`placeholder-${index}`}
                className="animate-pulse"
              >
                <div className="bg-gray-200 h-48 w-full rounded-lg"></div>
                <div className="bg-gray-200 h-4 w-3/4 mt-3 rounded"></div>
                <div className="bg-gray-200 h-3 w-1/2 mt-2 rounded"></div>
              </div>
            ))}
          </div>
        ) : newReleases.length === 0 ? (
          <div className="text-center py-8" style={{ fontFamily: "Inter" }}>No new releases available</div>
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
                  className="py-2 px-8 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  style={{ fontFamily: "Inter" }}
                >
                  Show More Songs
                </button>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Add this styling to hide scrollbars while maintaining functionality */}
      <style jsx global>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      
      {/* Upload Modal */}
      <UploadModal 
        isOpen={showModal} 
        onRequestClose={() => setShowModal(false)}
      />
    </div>
  );
};

export default Carousel;
