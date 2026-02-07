import React from 'react';
import { ATTACHMENTS, AttachmentType, AttachmentDef } from '../../../config/attachmentDefs';

interface AttachmentSelectorProps {
    slot: AttachmentType;
    selectedId?: string;
    onSelect: (id: string | undefined) => void;
    onHover: (id: string | null) => void;
    weaponLevel: number;
}
export const AttachmentSelector: React.FC<AttachmentSelectorProps> = ({ slot, selectedId, onSelect, onHover, weaponLevel }) => {
    
    const availableAttachments = Object.values(ATTACHMENTS).filter(a => a.type === slot);

    return (
        <div className="flex flex-col gap-2 p-4 bg-black/80 border border-white/10 rounded-lg">
            <h3 className="text-xl font-bold text-white mb-2">{slot}</h3>
            
            <div className="grid grid-cols-2 gap-2">
                {/* None Option */}
                <button
                    className={`p-3 rounded border text-left transition-colors ${
                        !selectedId 
                        ? 'bg-yellow-500/20 border-yellow-500 text-yellow-500' 
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
                    }`}
                    onClick={() => onSelect(undefined)}
                    onMouseEnter={() => onHover(null)}
                    onMouseLeave={() => onHover(null)}
                >
                    <div className="font-bold">None</div>
                    <div className="text-xs opacity-70">No attachment</div>
                </button>

                {availableAttachments.map((att) => {
                    const isLocked = att.unlockLevel > weaponLevel;
                    return (
                        <button
                            key={att.id}
                            disabled={isLocked}
                            className={`p-3 rounded border text-left transition-colors relative overflow-hidden ${
                                isLocked 
                                ? 'bg-gray-900 border-gray-800 text-gray-600 cursor-not-allowed opacity-70' 
                                : selectedId === att.id
                                    ? 'bg-yellow-500/20 border-yellow-500 text-yellow-500' 
                                    : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                            }`}
                            onClick={() => !isLocked && onSelect(att.id)}
                            onMouseEnter={() => onHover(att.id)}
                            onMouseLeave={() => onHover(null)}
                        >
                            <div className="flex justify-between items-start">
                                <div className="font-bold">{att.name}</div>
                                {isLocked && <div className="text-[10px] bg-red-900/50 text-red-400 px-1 rounded border border-red-900">Lvl {att.unlockLevel}</div>}
                            </div>
                            
                            <div className="text-xs opacity-70 truncate">{att.description}</div>
                            
                            {/* Lock Overlay */}
                            {isLocked && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
                                    {/* Optional Lock Icon */}
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
