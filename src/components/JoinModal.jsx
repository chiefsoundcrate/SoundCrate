import { useState, useEffect } from "react";
import { signInWithGoogle, signUpWithEmail, signInWithEmail } from "../services/authService";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
      <div className="bg-[#181A1B] text-white rounded-lg shadow-lg w-full max-w-md p-8 relative animate-fadeInUp">
        <button
          className="absolute top-2 right-2 text-2xl text-gray-400 hover:text-gray-200"
          onClick={onClose}
        >
          &times;
        </button>
        <div className="flex justify-center mb-6">
          <button
            className={`px-4 py-2 font-bold rounded-t ${tab === "signup" ? "bg-[#29F2C0] text-black" : "bg-[#232526] text-white"}`}
            onClick={() => setTab("signup")}
          >
            Sign Up
          </button>
          <button
            className={`px-4 py-2 font-bold rounded-t ${tab === "login" ? "bg-[#29F2C0] text-black" : "bg-[#232526] text-white"}`}
            onClick={() => setTab("login")}
          >
            Sign In
          </button>
        </div>
        <form onSubmit={handleEmail} className="space-y-4">
          {tab === "signup" && (
            <div>
              <label className="block text-sm mb-1">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-700 rounded bg-[#232526] text-white focus:border-[#29F2C0]"
                required
              />
            </div>
          )}
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-700 rounded bg-[#232526] text-white focus:border-[#29F2C0]"
              required
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-700 rounded bg-[#232526] text-white focus:border-[#29F2C0]"
              required
            />
          </div>
          {error && <div className="text-red-400">{error}</div>}
          <button
            type="submit"
            className="w-full bg-[#29F2C0] text-black px-6 py-2 rounded font-bold hover:opacity-90 transition"
            disabled={loading}
          >
            {loading ? (tab === "signup" ? "Signing Up..." : "Signing In...") : (tab === "signup" ? "Sign Up" : "Sign In")}
          </button>
        </form>
        <div className="my-4 text-center text-gray-400">or</div>
        <button
          onClick={handleGoogle}
          className="w-full bg-[#232526] text-white px-6 py-2 rounded font-bold border border-gray-700 hover:bg-[#232526]/80 transition flex items-center justify-center"
          disabled={loading}
        >
          <img src="/google-icon.svg" alt="Google" className="w-5 h-5 mr-2" />
          Continue with Google
        </button>
      </div>
      <style>{`
        .animate-fadeInUp {
          animation: fadeInUp 0.4s cubic-bezier(0.23, 1, 0.32, 1);
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(40px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default JoinModal; 