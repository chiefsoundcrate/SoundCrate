import { useState, useRef, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { signOutUser } from "../services/authService";

function getRandomAvatar(email) {
  // Use a simple avatar generator (e.g., DiceBear Avatars)
  return `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(email)}`;
}

const ProfileMenu = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef();

  if (!user) return null;
  const isGoogle = user.providerData.some(p => p.providerId === 'google.com');
  const displayName = isGoogle
    ? user.displayName || user.email
    : user.email.split('@')[0];
  const avatar = isGoogle
    ? user.photoURL || getRandomAvatar(user.email)
    : getRandomAvatar(user.email);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        className="flex items-center space-x-2 focus:outline-none"
        onClick={() => setOpen((o) => !o)}
      >
        <img
          src={avatar}
          alt="avatar"
          className="w-8 h-8 rounded-full border border-gray-300"
        />
        <span className="hidden md:inline text-sm font-medium" style={{fontFamily:"Inter"}}>
          {displayName}
        </span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-32 bg-[#181A1B] text-white rounded shadow-lg z-50">
          <button
            className="block w-full text-left px-4 py-2 hover:bg-[#232526]"
            onClick={async () => {
              setOpen(false);
              await signOutUser();
            }}
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
};

export default ProfileMenu; 