// src/components/Navbar.jsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import ProfileMenu from "./ProfileMenu";
import JoinModal from "./JoinModal";

const Navbar = () => {
  const { user, loading } = useAuth();
  const [showModal, setShowModal] = useState(false);

  return (
    <nav className="w-full h-16 flex items-center justify-between px-20 bg-[#151817]  sticky top-0 z-50" style={{ minHeight: 64 }}>
      <Link to="/" className="text-2xl font-bold text-[#29F2C0]">
        SoundCrate
      </Link>
      <div className="flex items-center space-x-4">
        {!loading && user ? (
          <ProfileMenu />
        ) : (
          <button
            className="bg-[#29F2C0] text-black px-6 py-2 rounded font-bold hover:opacity-90 transition shadow-md focus:outline-none focus:ring-2 focus:ring-[#29F2C0] focus:ring-offset-2"
            style={{ minWidth: 100 }}
            onClick={() => setShowModal(true)}
          >
            Join
          </button>
        )}
      </div>
      <JoinModal open={showModal} onClose={() => setShowModal(false)} />
    </nav>
  );
};

export default Navbar;
