import { useState, useEffect } from "react";
import { signInWithGoogle, signUpWithEmail, signInWithEmail } from "../services/authService";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import googleLogo from "/video/google.png";

const JoinModal = ({ open, onClose }) => {
  const { user } = useAuth();
  const [tab, setTab] = useState("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Auto-close modal when user is authenticated
  useEffect(() => {
    if (user && open) {
      onClose();
    }
    // eslint-disable-next-line
  }, [user, open]);

  // Reset form state when modal closes
  useEffect(() => {
    if (!open) {
      setTab("signup");
      setEmail("");
      setPassword("");
      setDisplayName("");
      setError("");
      setLoading(false);
    }
  }, [open]);

  if (!open) return null;

  const handleGoogle = async () => {
    setError("");
    setLoading(true);
    try {
      await signInWithGoogle();
      setLoading(false);
      navigate("/profile");
    } catch (err) {
      setError(err.message || "Google sign in failed");
      setLoading(false);
    }
  };

  const handleEmail = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (tab === "signup") {
        await signUpWithEmail(email, password, displayName);
      } else {
        await signInWithEmail(email, password);
      }
      setLoading(false);
      navigate("/profile");
    } catch (err) {
      setError(err.message || "Auth failed");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay">
      <div className={`container-modal ${tab === "login" ? "sign-in-mode" : "sign-up-mode"}`}>
        <div className="forms-container">
          <div className="signin-signup">
            {/* Sign In Form */}
            <form onSubmit={handleEmail} className={`form ${tab === "login" ? "active" : ""}`}>
              <h2 className="title">Sign In</h2>
              <div className="input-field">
                <i className="fas fa-envelope"></i>
                <input 
                  type="email" 
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="input-field">
                <i className="fas fa-lock"></i>
                <input 
                  type="password" 
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {error && <div className="error-message">{error}</div>}
              <button 
                type="submit" 
                className="btn solid"
                disabled={loading}
              >
                {loading ? "Signing In..." : "Sign In"}
              </button>
              <p className="social-text">Or continue with</p>
              <div className="social-media">
                <button 
                  onClick={handleGoogle} 
                  className="google-btn"
                  disabled={loading}
                >
                  <img src={googleLogo} alt="Google" className="google-icon" />
                  Google
                </button>
              </div>
            </form>

            {/* Sign Up Form */}
            <form onSubmit={handleEmail} className={`form ${tab === "signup" ? "active" : ""}`}>
              <h2 className="title">Sign Up</h2>
              <div className="input-field">
                <i className="fas fa-user"></i>
                <input 
                  type="text" 
                  placeholder="Artist Name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
              </div>
              <div className="input-field">
                <i className="fas fa-envelope"></i>
                <input 
                  type="email" 
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="input-field">
                <i className="fas fa-lock"></i>
                <input 
                  type="password" 
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {error && <div className="error-message">{error}</div>}
              <button 
                type="submit" 
                className="btn solid"
                disabled={loading}
              >
                {loading ? "Signing Up..." : "Sign Up"}
              </button>
              <p className="social-text">Or continue with</p>
              <div className="social-media">
                <button 
                  onClick={handleGoogle} 
                  className="google-btn"
                  disabled={loading}
                >
                  <img src={googleLogo} alt="Google" className="google-icon" />
                  Google
                </button>
              </div>
            </form>
          </div>

          <div className="panels-container">
            <div className="panel left-panel">
              <div className="content">
                <h3>New Here?</h3>
                <p>Create an account and start your journey with Soundcrate today!</p>
                <button 
                  className="btn w-full transparent" 
                  onClick={() => setTab("signup")}
                >
                  Sign Up
                </button>
              </div>
              <div className="image-container">
                
              </div>
            </div>

            <div className="panel right-panel realtive bottom-14">
              <div className="content">
                <h3>Already Have an Account?</h3>
                <p>Sign in to access your Soundcrate account</p>
                <button 
                  className="btn transparent" 
                  onClick={() => setTab("login")}
                >
                  Sign In
                </button>
              </div>
              <div className="image-container">
                
              </div>
            </div>
          </div>
        </div>

        {/* Music icons scattered in background */}
        <div className="music-icons">
          <svg className="music-icon icon1" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" fill="#29F2C0" opacity="0.25" />
          </svg>
          <svg className="music-icon icon2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" fill="#29F2C0" opacity="0.15" />
          </svg>
          <svg className="music-icon icon3" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" fill="#29F2C0" opacity="0.2" />
          </svg>
          <svg className="music-icon icon4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" fill="#29F2C0" opacity="0.3" />
          </svg>
          <svg className="music-icon icon5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 3c-4.97 0-9 4.03-9 9v7c0 1.1.9 2 2 2h4v-8H5v-1c0-3.87 3.13-7 7-7s7 3.13 7 7v1h-4v8h4c1.1 0 2-.9 2-2v-7c0-4.97-4.03-9-9-9z" fill="#29F2C0" opacity="0.25" />
          </svg>
        </div>

        <button
          className="close-button"
          onClick={onClose}
        >
          &times;
        </button>
      </div>

      <style jsx>{`
        .modal-overlay {
          background-color: rgba(0, 0, 0, 0.7);
          animation: fadeIn 0.3s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .container-modal {
          position: relative;
          width: 100%;
          max-width: 800px; /* Reduced from 1000px */
          min-height: 490px; /* Reduced from 550px */
          background-color: #181A1B;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.5);
          animation: scaleIn 0.5s cubic-bezier(0.23, 1, 0.32, 1) forwards;
          transform: scale(0.9);
          opacity: 0;
        }

        @keyframes scaleIn {
          from { 
            transform: scale(0.9);
            opacity: 0;
          }
          to { 
            transform: scale(1);
            opacity: 1;
          }
        }

        .container-modal::before {
          content: "";
          position: absolute;
          width: 2000px;
          height: 2000px;
          border-radius: 50%;
          background: linear-gradient(-45deg, #29F2C0, #1a8a6d);
          top: -10%;
          right: 48%;
          transform: translateY(-50%);
          z-index: 6;
          transition: 1.8s ease-in-out;
        }

        .close-button {
          position: absolute;
          top: 10px;
          right: 10px;
          background: transparent;
          border: none;
          color: white;
          font-size: 24px;
          cursor: pointer;
          z-index: 20;
          transition: transform 0.3s ease;
        }

        .close-button:hover {
          transform: scale(1.2);
        }

        .forms-container {
          position: absolute;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
        }

        .signin-signup {
          position: absolute;
          top: 50%;
          left: 75%;
          transform: translate(-50%, -50%);
          width: 50%;
          display: grid;
          grid-template-columns: 1fr;
          z-index: 5;
          transition: 1s 0.7s ease-in-out;
        }

        .form {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          padding: 0 5rem;
          overflow: hidden;
          grid-column: 1 / 2;
          grid-row: 1 / 2;
          transition: 0.2s 0.7s ease-in-out;
          opacity: 0;
          z-index: 1;
          text-align: center; /* Center align the form content */
        }

        .form.active {
          opacity: 1;
          z-index: 2;
        }

        .title {
          font-size: 1.8rem; /* Reduced from 2.2rem */
          color: #fff;
          margin-bottom: 10px;
        }

        .input-field {
          max-width: 390px;
          width: 100%;
          height: 45px; /* Slightly reduced height */
          background-color: #232526;
          margin: 10px 0;
          border-radius: 10px; /* Less rounded than before (was 55px) */
          display: grid;
          grid-template-columns: 17px 1fr;
          padding: 0 !important ;
          border: 1px solid #333;
          transition: border 0.3s ease, transform 0.2s ease;
        }

        .input-field:focus-within {
          border-color: #29F2C0;
          transform: translateY(-2px);
        }

        .input-field i {
          text-align: ;
          line-height: 40px;
          color: #acacac;
          font-size: 0.8rem;
          display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
        }

        .input-field input {
          background: none;
          outline: none;
          border: none;
          line-height: 1;
          font-weight: 400;
          font-size: 0.88rem;
          color: #fff;
          padding-left: 0px;
          width:100%;
          background-color: #232526 !important; // Force background color
          transition: background-color 5000s ease-in-out 0s !important;

        }
        .input-field input:focus {
  background-color: #232526 !important;
}

        .input-field input::placeholder {
          color: #aaa;
          font-weight: 400;
        }

        .error-message {
          color: #ff6b6b;
          margin: 10px 0;
          font-size: 0.9rem;
        }

        .btn {
          width: 241px;
          height: 42px; /* Slightly reduced height */
          border: none;
          outline: none;
          border-radius: 15px; /* Less rounded to match input fields */
          cursor: pointer;
          background-color: #29F2C0;
          color: #000; /* Black text */
          text-transform: uppercase;
          font-weight: 600;
          margin: 10px 0;
          transition: 0.3s;
          position: relative;
          overflow: hidden;
        }

        .btn:before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: rgba(255, 255, 255, 0.2);
          transition: left 0.6s ease;
        }

        .btn:hover:before {
          left: 100%;
        }
        input {
  background-color: transparent;
  color: white;
}

// Change this in your CSS-in-JS

        .btn:hover {
          transform: translateY(-3px);
          box-shadow: 0 5px 15px rgba(41, 242, 192, 0.4);
        }

        .btn:active {
          transform: translateY(-1px);
        }

        .btn:disabled {
          background-color: #666;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .social-text {
          padding: 0.8rem 0;
          font-size: 1rem;
          color: #fff;
        }

        .social-media {
          display: flex;
          justify-content: center;
        }

        .google-btn {
          height: 40px; /* Slightly reduced height */
          padding: 0 20px;
          border: 1px solid #333;
          margin: 0 0.45rem;
          display: flex;
          justify-content: center;
          align-items: center;
          text-decoration: none;
          color: #fff;
          font-size: 0.9rem; /* Smaller font */
          border-radius: 15px; /* Less rounded to match other elements */
          transition: 0.3s;
          background: none;
          cursor: pointer;
        }

        .google-btn:hover {
          color: #29F2C0;
          border-color: #29F2C0;
          transform: translateY(-2px);
        }

        .google-icon {
          width: 20px;
          height: 20px;
          margin-right: 10px;
          border-radius: 50%;
        }

        .panels-container {
          position: absolute;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
        }

        .panel {
          display: flex;
          flex-direction: column;
          align-items: ; /* Center align the panel content */
          justify-content: center; /* Center align vertically */
          text-align: center;
          z-index: 7;
          position:relative;
          bottom:30px;
        }

        .left-panel {
          pointer-events: all;
          padding: 3rem 17% 2rem 12%;
        }

        .right-panel {
          pointer-events: none;
          padding: 3rem 12% 2rem 17%;
        }

        .panel .content {
          color: #000; /* Changed to black from white */
          transition: 0.9s 0.6s ease-in-out;
          width: 70%; /* Slightly wider to match dark side */
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .panel h3 {
          font-weight: 500;
          line-height: 1;
          font-size: 1.4rem; /* Slightly smaller */
        }

        .panel p {
          font-size: 0.85rem; /* Slightly smaller */
          padding: 0.65rem 0;
        }

        .btn.transparent {
          margin: 0;
          background: none;
          border: 2px solid #000; /* Changed to black from white */
          width: 140px;
          height: 40px; /* Slightly reduced height */
          font-weight: 600;
          font-size: 0.8rem;
          color: #000; /* Changed to black from white */
        }

        .btn.transparent:hover {
          background: rgba(0, 0, 0, 0.1); /* Changed to black from white */
        }

        .image-container {
          width: 40%;
          transition: 0.9s 0.6s ease-in-out;
        }

        .image {
          width: 100%;
          height: auto;
          transition: 0.9s 0.6s ease-in-out;
        }

        .right-panel .content,
        .right-panel .image-container {
          transform: translateX(800px);
        }

        /* Music icons styling */
        .music-icons {
          position: absolute;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 5;
        }

        .music-icon {
          position: absolute;
          width: 24px;
          height: 24px;
        }

        .icon1 {
          top: 15%;
          left: 10%;
          animation: float 6s ease-in-out infinite;
        }

        .icon2 {
          top: 25%;
          right: 15%;
          animation: float 8s ease-in-out infinite;
          animation-delay: 1s;
        }

        .icon3 {
          bottom: 15%;
          left: 20%;
          animation: float 7s ease-in-out infinite;
          animation-delay: 2s;
        }

        .icon4 {
          bottom: 30%;
          right: 10%;
          animation: float 5s ease-in-out infinite;
          animation-delay: 1.5s;
        }

        .icon5 {
          top: 50%;
          left: 5%;
          animation: float 9s ease-in-out infinite;
          animation-delay: 0.5s;
        }

        @keyframes float {
          0% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-10px) rotate(5deg);
          }
          100% {
            transform: translateY(0) rotate(0deg);
          }
        }

        /* ANIMATION */
        .container-modal.sign-up-mode:before {
          transform: translate(100%, -50%);
          right: 52%;
        }

        .container-modal.sign-up-mode .left-panel .image-container,
        .container-modal.sign-up-mode .left-panel .content {
          transform: translateX(-800px);
        }

        .container-modal.sign-up-mode .right-panel .content,
        .container-modal.sign-up-mode .right-panel .image-container {
          transform: translateX(0);
        }

        .container-modal.sign-up-mode .left-panel {
          pointer-events: none;
        }

        .container-modal.sign-up-mode .right-panel {
          pointer-events: all;
        }

        .container-modal.sign-up-mode .signin-signup {
          left: 25%;
        }

        .container-modal.sign-in-mode:before {
          transform: translateY(-50%);
          right: 48%;
        }

        .container-modal.sign-in-mode .left-panel .image-container,
        .container-modal.sign-in-mode .left-panel .content {
          transform: translateX(0);
        }

        .container-modal.sign-in-mode .right-panel .content,
        .container-modal.sign-in-mode .right-panel .image-container {
          transform: translateX(800px);
        }

        .container-modal.sign-in-mode .left-panel {
          pointer-events: all;
        }

        .container-modal.sign-in-mode .right-panel {
          pointer-events: none;
        }

        .container-modal.sign-in-mode .signin-signup {
          left: 75%;
        }

        /* MEDIA QUERIES */
        @media (max-width: 870px) {
          .container-modal {
            min-height: 550px; /* Reduced from 800px */
            height: 100vh;
          }

          .container-modal::before {
            width: 1500px;
            height: 1500px;
            left: 30%;
            bottom: 68%;
            transform: translateX(-50%);
            right: initial;
            top: initial;
            transition: 2s ease-in-out;
          }

          .signin-signup {
            width: 100%;
            left: 50%;
            top: 95%;
            transform: translate(-50%, -100%);
            transition: 1s 0.8s ease-in-out;
          }

          .panels-container {
            grid-template-columns: 1fr;
            grid-template-rows: 1fr 2fr 1fr;
          }

          .panel {
            flex-direction: row;
            justify-content: space-around;
            align-items: center;
            padding: 2.5rem 8%;
          }

          .panel .content {
            width: auto;
            padding-right: 15%;
            transition: 0.9s 0.8s ease-in-out;
          }

          .panel h3 {
            font-size: 1.2rem;
          }

          .panel p {
            font-size: 0.7rem;
            padding: 0.5rem 0;
          }

          .btn.transparent {
            width: 110px;
            height: 35px;
            font-size: 0.7rem;
          }

          .image-container {
            width: 30%;
            transition: 0.9s 0.6s ease-in-out;
          }

          .left-panel {
            grid-row: 1 / 2;
          }

          .right-panel {
            grid-row: 3 / 4;
          }

          .right-panel .content,
          .right-panel .image-container {
            transform: translateY(300px);
          }

          .container-modal.sign-up-mode:before {
            transform: translate(-50%, 100%);
            bottom: 32%;
            right: initial;
          }

          .container-modal.sign-up-mode .left-panel .image-container,
          .container-modal.sign-up-mode .left-panel .content {
            transform: translateY(-300px);
          }

          .container-modal.sign-up-mode .signin-signup {
            top: 5%;
            transform: translate(-50%, 0);
          }

          .container-modal.sign-in-mode:before {
            transform: translate(-50%, 0);
            bottom: 68%;
            right: initial;
          }

          .container-modal.sign-in-mode .left-panel .image-container,
          .container-modal.sign-in-mode .left-panel .content {
            transform: translateY(0);
          }

          .container-modal.sign-in-mode .right-panel .content,
          .container-modal.sign-in-mode .right-panel .image-container {
            transform: translateY(300px);
          }

          .container-modal.sign-in-mode .signin-signup {
            top: 95%;
            transform: translate(-50%, -100%);
          }
        }

        @media (max-width: 570px) {
          .form {
            padding: 0 1.5rem;
          }

          .image-container {
            display: none;
          }
          
          .panel .content {
            padding: 0.5rem 1rem;
            width: 100%;
          }

          .container-modal::before {
            bottom: 72%;
            left: 50%;
          }

          .container-modal.sign-up-mode:before {
            bottom: 28%;
            left: 50%;
          }
        }
      `}</style>
    </div>
  );
};

export default JoinModal;