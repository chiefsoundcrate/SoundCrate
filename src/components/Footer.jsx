import footer from "/video/footer.png"
const Footer = () => {
    return (
      <div className=" py-16 relative overflow-hidden bg-no-repeat bg-cover bg-center" style={{backgroundImage:`url(${footer})`}}>
        
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Join The Waitlist</h2>
            <p className="text-xl mb-8">
              Be among the first to experience the next generation of music ownership and streaming.
            </p>
            
            <div className="flex justify-center mb-4">
              <button className="bg-teal-400 text-black py-3 px-8 rounded-md hover:bg-teal-500 transition-all">
                Join the Waitlist
              </button>
            </div>
            
            <p className="text-gray-400">
              Sign up now to secure your spot on the waitlist!
            </p>
          </div>
        </div>
      </div>
    );
  };
  
  export default Footer;