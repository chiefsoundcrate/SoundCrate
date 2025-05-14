// src/components/Hero.jsx
import React, { useState, useEffect } from 'react';
import Marquee from 'react-fast-marquee';
import WaitlistForm from './WaitlistForm';
import { useAuth } from "../hooks/useAuth";
import { addToWaitlist } from "../services/authService";
import emailjs from "emailjs-com";
import JoinModal from "./JoinModal";

const SERVICE_ID = "service_35ytvak";
const TEMPLATE_ID = "template_1u61d9p";
const USER_ID = "-m7pu3Vr_U-CtWZg5";

const Hero = () => {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [waitlistMsg, setWaitlistMsg] = useState("");
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [isOnWaitlist, setIsOnWaitlist] = useState(false);
  
  // Check if user has joined waitlist before (using localStorage)
  useEffect(() => {
    if (!user) return;
    // Check if this user has already joined the waitlist
    const waitlistStatus = localStorage.getItem(`waitlist_${user.uid}`);
    if (waitlistStatus === 'joined') {
      setIsOnWaitlist(true);
      setWaitlistMsg("You're on the waitlist!");
    }
  }, [user]);

  // Mock video data - replace with your actual video paths
  const videos = [
    '/video/video1.mp4',
    '/video/video2.mp4',
    '/video/video3.mp4',
    '/video/video4.mp4',
    '/video/video5.mp4',
    '/video/video6.mp4',
    '/video/video7.mp4',
    '/video/video8.mp4',
  ];
  
  // Video component with simpler approach (like in Carousel)
  const VideoCard = ({ src }) => (
    <div className="relative w-44 h-[302px] flex-shrink-0 mx-4 rounded-xl overflow-hidden">
      {/* Simplified gradient overlay */}
      <div className="w-full h-full bg-gradient-to-r from-gray-900/30 to-gray-900/20 absolute z-10"></div>
      {/* Additional subtle overall tint - helps hide loading */}
      <div className="w-full h-full bg-black/20 absolute z-5"></div>
      <video
        muted
        autoPlay
        loop
        playsInline
        preload="metadata"
        className="w-full h-full object-cover rounded-xl"
        style={{ pointerEvents: 'none' }}
      >
        <source src={src} type="video/mp4" />
      </video>
    </div>
  );

  const handleWaitlist = async () => {
    if (!user) return;
    setWaitlistLoading(true);
    try {
      await addToWaitlist(user.email, user.uid);
      setWaitlistMsg("You've been added to our waitlist!");
      setIsOnWaitlist(true);
      
      // Save waitlist status to localStorage to persist after refresh
      localStorage.setItem(`waitlist_${user.uid}`, 'joined');
      
      // Send notification email using EmailJS
      try {
        const templateParams = {
          user_email: user.email,
          message: `New waitlist entry!`,
          reply_to: user.email
        };
        
        await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, USER_ID);
      } catch (emailError) {
        console.error("EmailJS notification failed:", emailError);
        // Continue even if email fails - user is still added to waitlist
      }
      
    } catch (err) {
      setWaitlistMsg("Failed to add to waitlist. Please try again.");
      console.error("Waitlist error:", err);
    }
    setWaitlistLoading(false);
  };

  return (
    <div className="h-screen w-full flex items-center justify-center overflow-hidden bg-black relative bottom-8" style={{fontFamily: "Inter"}}>
      {/* Video rows positioned in center with no gap between rows */}
      <div className="absolute inset-0 flex items-center justify-center z-0">
        <div className="w-full flex flex-col justify-center items-center h-full">
          {/* Edge shadows - Left and Right */}
          <div className="absolute left-0 top-0 bottom-0 h-full w-24 bg-gradient-to-r from-black to-transparent z-20"></div>
          <div className="absolute right-0 top-0 bottom-0 h-full w-24 bg-gradient-to-l from-black to-transparent z-20 "></div>
          
          {/* First row - videos moving left */}
          <div className="w-full h-[302px] overflow-hidden relative bottom-5">
            <Marquee
              gradient={false}
              speed={45}
              direction="right"
              pauseOnHover={false}
              play={true}
            >
              {videos.map((video, index) => (
                <VideoCard key={`row1-${index}`} src={video} />
              ))}
              {/* Add more videos to prevent gaps */}
              {videos.slice(0, 4).map((video, index) => (
                <VideoCard key={`row1-extra-${index}`} src={video} />
              ))}
            </Marquee>
          </div>
          
          {/* Second row - videos moving right (no margin/gap between rows) */}
          <div className="w-full h-[302px] overflow-hidden relative top-5">
            <Marquee
              gradient={false} 
              speed={35}
              direction="left"
              pauseOnHover={false}
              play={true}
            >
              {videos.map((video, index) => (
                <VideoCard key={`row2-${index}`} src={video} />
              ))}
              {/* Add more videos to prevent gaps */}
              {videos.slice(0, 4).map((video, index) => (
                <VideoCard key={`row2-extra-${index}`} src={video} />
              ))}
            </Marquee>
          </div>
        </div>
      </div>
      
      {/* Darker gradient overlay with reduced opacity */}
      <div className="absolute inset-0 bg-[#0B0D0D]/80 z-10"></div>
      
      {/* Main content */}
      <div className="w-full max-w-6xl text-center z-20">
      <div className='w-full max-w-5xl relative left-14'>
  <h1 className="text-[20px] md:text-6xl font-bold mb-6 text-white" style={{fontFamily:"Inter"}}>
    Find Your Next Favorite Artists <br/>In <span className='text-[#29F2C0]'>30 Seconds</span>.
  </h1>
  
  <div className="mb-6">
    <p 
      className="inline-block text-base md:text-lg font-semibold bg-[#29F2C0] bg-[length:200%_100%]  p-4 rounded-4xl text-black "
      style={{fontFamily:"Inter"}}
    >
      Join the SoundCrate Waitlist
    </p>
  </div>
  
  <p className="max-w-4xl mx-auto mb-10 text-xl text-white/80" style={{ fontFamily: "Inter" }}>
  SoundCrate is <span className="">changing the culture</span> of community building and shaping a new direction for music discoverability. 
  Be part of the <span>movement</span> redefining how artists and listeners connect. 
  We're building something bold—get early access by joining the waitlist today.
</p>

</div>

<style >{`
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  
  .animate-shimmer {
    animation: shimmer 2s ease-in-out infinite;
  }
`}</style>
        {!user ? (
  <div className="flex flex-col items-center gap-4">
    <div className="flex w-full max-w-md gap-2">
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="Enter your E-mail"
        className="w-full py-2 px-4 bg-black border border-white/30 rounded-md focus:outline-none focus:border-[#29F2C0] text-white placeholder:text-white/30 input-custom  "
        style={{fontFamily:"Inter"}}
      />
      <button
        className="bg-[#29F2C0] text-black py-1 h-10 px-8 rounded-md hover:opacity-90 transition-all  whitespace-nowrap"
        onClick={() => setShowModal(true)}
        style={{fontFamily:"Inter"}}
      >
        + Join Waitlist
      </button>
    </div>
    <p className="text-center text-white/50 input-custom" style={{fontFamily:"inter"}}>
      Enter your email. No spam, we promise.
    </p>
    <JoinModal open={showModal} onClose={() => setShowModal(false)} />
  </div>
) : (
  <div className="flex flex-col items-center gap-4">
    <div className="text-lg text-white" style={{fontFamily:"Inter"}}>Welcome, {user.displayName}</div>
    
    {isOnWaitlist ? (
      <div className="text-[#29F2C0] font-medium bg-[#29F2C0]/10 py-3 px-6 rounded-md border border-[#29F2C0]/30" style={{fontFamily:"Inter"}}>
        You're on the waitlist! We'll notify you when access is available.
      </div>
    ) : (
      <button
        className="bg-[#29F2C0] text-black py-2 px-8 rounded-md hover:opacity-90 transition-all font-bold"
        onClick={handleWaitlist}
        disabled={waitlistLoading}
        style={{fontFamily:"Inter"}}
      >
        {waitlistLoading ? "Adding..." : "Join Waitlist"}
      </button>
    )}
    
    {waitlistMsg && !isOnWaitlist && <div className="text-green-400 mt-2" style={{fontFamily:"Inter"}}>{waitlistMsg}</div>}
  </div>
)}
      </div>
    </div>
  );
};

export default Hero;
