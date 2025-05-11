import { useState } from 'react';

const UploadModal = ({ onClose }) => {
  const [formData, setFormData] = useState({
    artistName: '',
    songTitle: '',
    coverImage: null,
    audioFile: null,
  });
  
  const handleSubmit = (e) => {
    e.preventDefault();
    // In a real application, you would process the upload here
    console.log('Submitting:', formData);
    onClose();
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-gray-900 p-8 rounded-lg max-w-xl w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Upload Your Song</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block mb-2">Artist Name</label>
            <input 
              type="text" 
              className="w-full p-2 bg-gray-800 rounded-md"
              value={formData.artistName}
              onChange={(e) => setFormData({...formData, artistName: e.target.value})}
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block mb-2">Song Title</label>
            <input 
              type="text" 
              className="w-full p-2 bg-gray-800 rounded-md"
              value={formData.songTitle}
              onChange={(e) => setFormData({...formData, songTitle: e.target.value})}
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block mb-2">Cover Image</label>
            <div className="border-2 border-dashed border-gray-600 p-4 text-center rounded-md">
              <p>Drag and drop or click to upload</p>
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={(e) => setFormData({...formData, coverImage: e.target.files[0]})}
              />
            </div>
          </div>
          
          <div className="mb-6">
            <label className="block mb-2">Audio File</label>
            <div className="border-2 border-dashed border-gray-600 p-4 text-center rounded-md">
              <p>Drag and drop or click to upload audio</p>
              <input 
                type="file" 
                accept="audio/*" 
                className="hidden" 
                onChange={(e) => setFormData({...formData, audioFile: e.target.files[0]})}
              />
            </div>
          </div>
          
          <div className="mb-6">
            <label className="block mb-2">Trim Audio (30s max)</label>
            <div className="h-16 bg-gray-800 rounded-md relative">
              {/* Audio waveform would be rendered here */}
              <div className="absolute inset-y-0 left-1/4 right-1/2 bg-teal-400 opacity-50"></div>
              <div className="absolute inset-y-0 left-1/4 w-1 bg-teal-400"></div>
              <div className="absolute inset-y-0 right-1/2 w-1 bg-teal-400"></div>
            </div>
          </div>
          
          <div className="flex justify-end gap-4">
            <button 
              type="button" 
              onClick={onClose}
              className="bg-transparent border border-gray-500 px-6 py-2 rounded-md hover:bg-gray-800 transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="bg-teal-400 text-black px-6 py-2 rounded-md hover:bg-teal-500 transition-all"
            >
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UploadModal;