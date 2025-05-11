import { useState, useRef } from "react";
import { useAuth } from "../hooks/useAuth";
import { updateUserProfile } from "../services/authService";
import { storage } from "../services/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const ProfileModal = ({ open, onClose }) => {
  const { user, userInfo } = useAuth();
  const [displayName, setDisplayName] = useState(userInfo?.displayName || "");
  const [photoURL, setPhotoURL] = useState(userInfo?.photoURL || "");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const fileInputRef = useRef();

  if (!open) return null;

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const storageRef = ref(storage, `user_uploads/${user.uid}/profile.${file.name.split('.').pop()}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setPhotoURL(url);
      setMessage("Image uploaded!");
    } catch (err) {
      setMessage("Failed to upload image");
    }
    setUploading(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    await updateUserProfile(user.uid, { displayName, photoURL });
    setMessage("Profile updated!");
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
        <h2 className="text-2xl font-bold mb-6">Edit Profile</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="flex items-center space-x-4">
            <img
              src={photoURL || "/default-avatar.png"}
              alt="avatar"
              className="w-16 h-16 rounded-full border border-gray-700 object-cover"
            />
            <div>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                className="hidden"
                onChange={handleImageUpload}
              />
              <button
                type="button"
                className="bg-[#29F2C0] text-black px-4 py-2 rounded font-bold hover:opacity-90 transition"
                onClick={() => fileInputRef.current.click()}
                disabled={uploading}
              >
                {uploading ? "Uploading..." : "Upload Image"}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-700 rounded bg-[#232526] text-white"
              placeholder="Your name"
              required
            />
          </div>
          <button
            type="submit"
            className="bg-[#29F2C0] text-black px-6 py-2 rounded font-bold hover:opacity-90 transition"
          >
            Save
          </button>
          {message && <div className="text-green-400 mt-2">{message}</div>}
        </form>
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

export default ProfileModal; 