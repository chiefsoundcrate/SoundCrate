import footer from "/video/footer.png";

const Footer = () => {
  return (
    <div
      className="py-13 relative overflow-hidden bg-no-repeat "
      style={{
        backgroundImage: `url(${footer})`,
        backgroundSize: "100%", // slight zoom
      }}
    >
      {/* Soft blur overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-0" />

      <div className="container relative z-10">
        <div className="max-w-2xl mx-auto text-center px-4"> {/* expanded width & padding */}
          <h1
            className="text-3xl mb-2"
            style={{ fontFamily: "Inter", fontSize: "35px" }}
          >
            Join The Waitlist
          </h1>
          <p
            className="text-sm mb-3 mt-4 text-gray-300"
            style={{ fontFamily: "Inter" }}
          >
            Be among the first to experience the next generation of music ownership and streaming
          </p>

          <div className="flex justify-center mb-2 mt-7">
            <a
              href="/#hero"
              className="bg-[#29f2c0] text-black py-2 px-3 rounded-md hover:bg-[#1fd1a4] transition-all text-md h-[40px] text-center"
              style={{ fontFamily: "Inter" }}
            >
              Join the Waitlist
            </a>
          </div>

          <p
            className="text-[15px] text-gray-400"
            style={{ fontFamily: "Inter" }}
          >
            Sign up now to secure your spot on the waitlist!
          </p>
        </div>
      </div>
    </div>
  );
};

export default Footer;
