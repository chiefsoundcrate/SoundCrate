import React from 'react';
import Marquee from 'react-fast-marquee';

const Carousel = () => {
  // Mock artist data with video paths
  const artists = [
    { id: 1, video: '/video/video1.mp4' },
    { id: 2, video: '/video/video2.mp4' },
    { id: 3, video: '/video/video3.mp4' },
    { id: 4, video: '/video/video4.mp4' },
    { id: 5, video: '/video/video5.mp4' },
    { id: 6, video: '/video/video6.mp4' },
  ];

  // Artist card component
  const ArtistCard = ({ src }) => (
    <div className="relative w-60 h-80 flex-shrink-0 mx-4 rounded-2xl overflow-hidden cursor-pointer hover:scale-105 transition-transform duration-300">
      {/* Softer overlay gradient */}
      <div className="w-full h-full bg-gradient-to-t from-black/50 via-black/20 to-transparent absolute z-10"></div>
      {/* Additional subtle overall tint */}
      <div className="w-full h-full bg-black/10 absolute z-5"></div>
      <video
        muted
        autoPlay
        loop
        playsInline
        preload="metadata"
        className="w-full h-full object-cover"
        style={{ pointerEvents: 'none' }}
      >
        <source src={src} type="video/mp4" />
      </video>
    </div>
  );

  return (
    <div className="w-full py-16 bg-[#0A0A0A] overflow-hidden" style={{ fontFamily: "Satoshi" }}>
      {/* Header Section */}
      <div className="container mx-auto mb-10 text-center px-4">
        <h2 className="text-4xl font-bold text-white mb-4" style={{ letterSpacing: "0.02em" }}>
          Vote For Your Favorite Song
        </h2>
        <p className="text-lg text-white/80 mb-8">
          Get early access to the future of music ownership and streaming.
        </p>
        
        {/* Upload Button */}
        <div className="flex flex-col items-center justify-center">
          <button className="bg-[#29F2C0] text-black py-2 px-8 rounded-md hover:opacity-90 transition-all font-medium mb-2">
            Upload
          </button>
          <p className="text-sm text-gray-400">
            Upload Song (30s max)
          </p>
        </div>
      </div>
      
      {/* Carousel Section - Single row with soft inner shadow */}
      <div className="w-screen max-w-full overflow-hidden" style={{ marginLeft: 0, marginRight: 0 }}>
        {/* Left shadow fade */}
        <div className="absolute left-0 top-auto bottom-auto h-80 w-24 bg-gradient-to-r from-[#0A0A0A] to-transparent z-20"></div>
        {/* Right shadow fade */}
        <div className="absolute right-0 top-auto bottom-auto h-80 w-24 bg-gradient-to-l from-[#0A0A0A] to-transparent z-20"></div>
        
        <Marquee
          gradient={false}
          speed={35}
          pauseOnHover={true}
          play={true}
          className='overflow-hidden'
        >
          {artists.map((artist) => (
            <ArtistCard key={artist.id} src={artist.video} />
          ))}
          {/* Add a few more cards to ensure continuity */}
          {artists.slice(0, 4).map((artist) => (
            <ArtistCard key={`extra-${artist.id}`} src={artist.video} />
          ))}
        </Marquee>
      </div>
    </div>
  );
};

export default Carousel;