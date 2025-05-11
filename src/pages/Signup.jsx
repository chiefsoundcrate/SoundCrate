import { useState } from "react";
import { signUpWithEmail } from "../services/authService";
import { useNavigate, Link } from "react-router-dom";

const Signup = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await signUpWithEmail(email, password, displayName);
      navigate("/profile");
    } catch (err) {
      setError(err.message || "Sign up failed");
    }
  };

  return (
    <div className="max-w-md mx-auto p-8">
      <h2 className="text-2xl font-bold mb-6">Sign Up</h2>
      <form onSubmit={handleSignup} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Display Name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            required
          />
        </div>
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
          Sign Up
        </button>
      </form>
      <div className="mt-4 text-center">
        <span className="text-gray-400">Already have an account?</span>{" "}
        <Link to="/login" className="text-[#29F2C0] font-bold hover:underline">Sign In</Link>
      </div>
    </div>
  );
};

export default Signup; 