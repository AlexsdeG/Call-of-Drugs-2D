import React, { useState } from 'react';

interface SaveMapModalProps {
  initialName?: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, destination: 'browser' | 'file') => void;
}

export const SaveMapModal: React.FC<SaveMapModalProps> = ({ initialName, isOpen, onClose, onSave }) => {
  const [name, setName] = useState(initialName || "New Map");
  const [destination, setDestination] = useState<'browser' | 'file'>('browser');

  if (!isOpen) return null;

  const handleSave = () => {
    if (!name.trim()) return;
    onSave(name, destination);
    // Don't close immediately. Let parent handle closure via prop or logic.
    // This allows parent (EditorOverlay) to keep 'pendingPreview' active until success.
  };

  return (
    <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50 pointer-events-auto backdrop-blur-sm">
       <div className="bg-gray-900 border border-gray-700 p-6 rounded-lg w-96 shadow-2xl animate-in fade-in zoom-in duration-200">
           <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
               <span className="text-blue-500">💾</span> SAVE MAP
           </h3>
           
           <div className="flex border-b border-gray-700 bg-gray-900/50 mb-6">
                <button 
                    onClick={() => setDestination('browser')}
                    className={`flex-1 py-3 text-sm font-bold transition ${destination === 'browser' ? 'bg-gray-800 text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}
                >
                    BROWSER STORAGE
                </button>
                <button 
                     onClick={() => setDestination('file')}
                     className={`flex-1 py-3 text-sm font-bold transition ${destination === 'file' ? 'bg-gray-800 text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}
                >
                    DOWNLOAD FILE
                </button>
           </div>

           <div className="mb-4 text-center">
                <label className="block text-gray-400 text-xs mb-1 uppercase font-bold text-left">Map Name</label>
                <input 
                   type="text" 
                   value={name}
                   onChange={(e) => setName(e.target.value)}
                   className="w-full bg-black/50 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-mono"
                   placeholder="My Zombie Map"
                   autoFocus
                   onKeyDown={(e) => e.stopPropagation()}
                />
               <p className="text-[10px] text-gray-500 mt-2 h-4 text-left">
                   {destination === 'browser' ? 'Saves to your browser\'s local storage.' : 'Downloads as .json file (Game Format).'}
               </p>
           </div>

           <div className="flex justify-end gap-2">
               <button 
                 onClick={onClose}
                 className="px-4 py-2 bg-transparent hover:bg-white/10 text-gray-300 rounded text-sm transition"
               >
                   CANCEL
               </button>
               <button 
                 onClick={handleSave}
                 disabled={!name.trim()}
                 className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-sm font-bold shadow-lg transition"
               >
                   SAVE
               </button>
           </div>
       </div>
    </div>
  );
};
