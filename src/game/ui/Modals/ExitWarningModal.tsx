import React from 'react';

interface ExitWarningModalProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirmExit: () => void;
  onSaveAndExit: () => void;
}

export const ExitWarningModal: React.FC<ExitWarningModalProps> = ({ isOpen, onCancel, onConfirmExit, onSaveAndExit }) => {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 pointer-events-auto backdrop-blur-sm">
       <div className="bg-gray-900 border border-red-900/50 p-6 rounded-lg w-96 shadow-2xl animate-in fade-in zoom-in duration-200">
           <h3 className="text-xl font-bold text-red-100 mb-2 flex items-center gap-2">
               ⚠️ UNSAVED CHANGES
           </h3>
           <p className="text-gray-300 text-sm mb-6 leading-relaxed">
               You have unsaved changes. If you leave now, your progress will be lost forever.
           </p>

           <div className="flex flex-col gap-2">
               <button 
                 onClick={onSaveAndExit}
                 className="w-full py-3 bg-green-700 hover:bg-green-600 text-white rounded font-bold transition shadow-lg flex items-center justify-center gap-2"
               >
                   <span>💾</span> SAVE FIRST
               </button>
               
               <button 
                 onClick={onConfirmExit}
                 className="w-full py-2 bg-red-900/30 hover:bg-red-900/50 text-red-200 border border-red-900/30 rounded font-medium transition"
               >
                   EXIT WITHOUT SAVING
               </button>
               
               <button 
                 onClick={onCancel}
                 className="w-full py-2 bg-transparent hover:bg-white/5 text-gray-400 rounded text-sm transition mt-2"
               >
                   Cancel
               </button>
           </div>
       </div>
    </div>
  );
};
