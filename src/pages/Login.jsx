import { useState } from "react";
import { signInWithEmail, signInWithGoogle } from "../services/authService";
import { useNavigate, Link } from "react-router-dom";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await signInWithEmail(email, password);
      navigate("/profile");
    } catch (err) {
      setError(err.message || "Login failed");
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    try {
      await signInWithGoogle();
      navigate("/profile");
    } catch (err) {
      setError(err.message || "Google sign in failed");
    }
  };

  return (
    <div className="max-w-md mx-auto p-8">
      <h2 className="text-2xl font-bold mb-6">Sign In</h2>
      <form onSubmit={handleEmailLogin} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            required
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            required
          />
        </div>
        {error && <div className="text-red-600">{error}</div>}
        <button
          type="submit"
          className="bg-[#29F2C0] text-black px-6 py-2 rounded font-bold hover:opacity-90 transition w-full"
        >
          Sign In
        </button>
      </form>
      <div className="my-4 text-center text-gray-400">or</div>
      <button
        onClick={handleGoogleLogin}
        className="w-full bg-white text-black px-6 py-2 rounded font-bold border border-gray-300 hover:bg-gray-100 transition flex items-center justify-center"
      >
        <img src="/google-icon.svg" alt="Google" className="w-5 h-5 mr-2" />
        Sign in with Google
      </button>
      <div className="mt-4 text-center">
        <span className="text-gray-400">Don't have an account?</span>{" "}
        <Link to="/signup" className="text-[#29F2C0] font-bold hover:underline">Sign Up</Link>
      </div>
    </div>
  );
};

export default Login; 