import React, { useRef, useState } from 'react';
import { X, Upload, Download, Save, RefreshCw, Pen, Check, Camera, User } from 'lucide-react';
import { ProfileService } from '../../services/ProfileService';
import { useEmpireStore } from '../../../store/useEmpireStore';

interface Props {
    onClose: () => void;
}

export const SaveLoadProfileModal: React.FC<Props> = ({ onClose }) => {
    const profile = useEmpireStore(state => state.profile);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null); // Separate ref for images
    const [status, setStatus] = useState<string>('');
    
    // Editing State
    const [isEditingName, setIsEditingName] = useState(false);
    const [tempName, setTempName] = useState('');

    const handleExport = async () => {
        setStatus('Exporting...');
        await ProfileService.exportProfile();
        setStatus('Export Complete');
        setTimeout(() => setStatus(''), 2000);
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setStatus('Importing...');
            await ProfileService.importProfile(file);
            setStatus('Profile Imported Successfully');
        } catch (err) {
            console.error(err);
            setStatus('Error Importing Profile');
        }
        setTimeout(() => setStatus(''), 2000);
    };

    const handleForceSave = async () => {
        setStatus('Saving...');
        await ProfileService.saveProfile();
        setStatus('Saved to Browser Storage');
        setTimeout(() => setStatus(''), 2000);
    };

    // --- Profile Editing Handlers ---

    const handleEditName = () => {
        setTempName(profile?.name || '');
        setIsEditingName(true);
    };

    const handleSaveName = async () => {
        if (tempName.trim().length > 0) {
            await ProfileService.updateProfile({ name: tempName.trim().substring(0, 20) });
        }
        setIsEditingName(false);
    };

    const handleAvatarClick = () => {
        imageInputRef.current?.click();
    };

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // Resize and Compress
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                // Target size: 128x128 max
                const maxSize = 128;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxSize) {
                        height *= maxSize / width;
                        width = maxSize;
                    }
                } else {
                    if (height > maxSize) {
                        width *= maxSize / height;
                        height = maxSize;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                
                if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
                    // Compress to JPEG 0.7
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                    ProfileService.updateProfile({ avatar: dataUrl });
                }
            };
            img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <input 
                type="file" 
                ref={imageInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleImageUpload} 
            />

            <div className="bg-gray-900 border border-gray-700 w-full max-w-lg shadow-2xl relative">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-gray-800 bg-gray-950/50">
                    <h2 className="text-xl font-bold text-white tracking-widest flex items-center gap-2">
                        <Save className="w-5 h-5 text-yellow-500" />
                        PROFILE MANAGEMENT
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Current Profile Card (Editable) */}
                    <div className="bg-gray-950 p-4 rounded border border-gray-800 flex gap-4 items-center">
                        {/* Avatar */}
                        <div 
                            className="w-16 h-16 bg-gray-900 rounded border border-gray-700 flex-shrink-0 relative group cursor-pointer overflow-hidden"
                            onClick={handleAvatarClick}
                            title="Click to Upload Avatar"
                        >
                            {profile?.avatar ? (
                                <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                            ) : profile?.rankIcon ? (
                                <img src={profile.rankIcon} alt="Rank" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <User className="w-8 h-8 text-gray-600" />
                                </div>
                            )}
                            
                            {/* Hover Overlay */}
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Camera className="w-6 h-6 text-white" />
                            </div>
                        </div>

                        {/* Name & ID */}
                        <div className="flex-1 overflow-hidden">
                            <div className="text-sm text-gray-500 uppercase tracking-wider mb-1">Current Profile</div>
                            
                            {isEditingName ? (
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="text" 
                                        value={tempName}
                                        onChange={(e) => setTempName(e.target.value)}
                                        maxLength={20}
                                        className="bg-gray-800 border border-gray-600 text-white text-lg font-bold px-2 py-0.5 rounded w-full focus:outline-none focus:border-yellow-500"
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSaveName();
                                            if (e.key === 'Escape') setIsEditingName(false);
                                        }}
                                    />
                                    <button onClick={handleSaveName} className="p-1 hover:bg-green-900/50 rounded text-green-500"><Check className="w-4 h-4"/></button>
                                    <button onClick={() => setIsEditingName(false)} className="p-1 hover:bg-red-900/50 rounded text-red-500"><X className="w-4 h-4"/></button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 group">
                                    <div className="text-2xl font-bold text-white truncate">{profile?.name || 'Unknown'}</div>
                                    <button 
                                        onClick={handleEditName} 
                                        className="text-gray-600 hover:text-yellow-500 transition-colors"
                                    >
                                        <Pen className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                            
                            <div className="text-xs text-gray-400 font-mono mt-1 w-full truncate" title={profile?.id}>
                                ID: {profile?.id}
                            </div>
                        </div>
                    </div>
                
                    <div className="grid grid-cols-2 gap-4">
                        <button 
                            onClick={handleForceSave}
                            className="flex flex-col items-center justify-center gap-2 p-6 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-green-500/50 rounded transition-all group"
                        >
                            <Save className="w-8 h-8 text-green-500 group-hover:scale-110 transition-transform" />
                            <span className="font-bold text-gray-200">QUICK SAVE</span>
                            <span className="text-[10px] text-gray-500 uppercase">Save to Browser</span>
                        </button>
                        
                        <button 
                            onClick={() => window.location.reload()}
                            className="flex flex-col items-center justify-center gap-2 p-6 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-yellow-500/50 rounded transition-all group"
                        >
                            <RefreshCw className="w-8 h-8 text-yellow-500 group-hover:rotate-180 transition-transform duration-500" />
                            <span className="font-bold text-gray-200">RELOAD</span>
                            <span className="text-[10px] text-gray-500 uppercase">Reload Application</span>
                        </button>
                    </div>

                    <div className="h-px bg-gray-800 w-full" />

                    <div className="grid grid-cols-2 gap-4">
                        <button 
                            onClick={handleExport}
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-900/20 hover:bg-blue-900/40 border border-blue-900 text-blue-400 hover:text-blue-300 rounded transition"
                        >
                            <Download className="w-4 h-4" />
                            EXPORT JSON
                        </button>
                        
                        <button 
                            onClick={handleImportClick}
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-300 hover:text-white rounded transition"
                        >
                            <Upload className="w-4 h-4" />
                            IMPORT JSON
                        </button>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            accept=".json" 
                            className="hidden" 
                        />
                    </div>
                    
                    {status && (
                        <div className="text-center text-sm font-mono text-yellow-500 animate-pulse">
                            {status}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
