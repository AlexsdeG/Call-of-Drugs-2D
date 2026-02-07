import React, { useRef } from 'react';
import { ProjectStorage } from '../../storage/ProjectStorage';
import { MapSerializer } from '../../systems/MapSerializer';
import { SecurityAnalyzer } from '../../../utils/SecurityAnalyzer';

interface LoadMapModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLoad: (data: any) => void; // Changed to accept data or name (handled by caller?)
    // Actually, to support both, let's just pass the data object if possible, or trigger a load by name?
    // If we standardize: Caller expects to receive 'MapData' ready to inject?
    // ProjectStorage.loadProject returns MapData. 
    // File reader returns MapData.
    // So onLoad should receive MapData!
}

export const LoadMapModal: React.FC<LoadMapModalProps> = ({ isOpen, onClose, onLoad }) => {
    const [activeTab, setActiveTab] = React.useState<'local' | 'file'>('local');
    const [projects, setProjects] = React.useState<{name: string, lastModified: number, version?: string}[]>([]); // Added version
    const [confirmDelete, setConfirmDelete] = React.useState<{type: 'single' | 'all', name?: string} | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const refreshList = () => {
        ProjectStorage.getProjectList().then(list => {
            // @ts-ignore - Assuming list might have version if we updated storage to save it in list, 
            // but ProjectStorage currently only saves name/lastModified in list. 
            // We might want to update ProjectStorage to save version in list? 
            // For now, let's just show list. If we want version, we'd need to peek.
            // Actually, we can just load the project to get version? No, that's heavy.
            // Let's assume for now we don't show version in list unless we update storage.
            // Wait, previous instruction said: "show the version number in the load local storage tab"
            // So we need to update ProjectStorage.saveProject to include version in the list metadata.
            setProjects(list.sort((a,b) => b.lastModified - a.lastModified));
        });
    };

    React.useEffect(() => {
        if (isOpen) {
            refreshList();
        }
    }, [isOpen]);

    const handleLocalLoad = async (name: string) => {
        const data = await ProjectStorage.loadProject(name);
        if (data) {
            onLoad(data);
            onClose();
        }
    };

    const handleDeleteSingle = async (name: string) => {
        setConfirmDelete({ type: 'single', name });
    };

    const handleDeleteAll = () => {
        setConfirmDelete({ type: 'all' });
    };

    const executeDelete = async () => {
        if (!confirmDelete) return;

        if (confirmDelete.type === 'single' && confirmDelete.name) {
            await ProjectStorage.deleteProject(confirmDelete.name);
        } else if (confirmDelete.type === 'all') {
            await ProjectStorage.clearAllProjects();
        }
        
        setConfirmDelete(null);
        refreshList();
    };

    const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        try {
            const data = await ProjectStorage.importProject(file);
            
            // Version Check
            const vCheck = MapSerializer.checkVersion(data.version);
            if (vCheck.status !== 'ok') {
                alert(`Version Check: ${vCheck.status.toUpperCase()}\n${vCheck.message}`);
                // Proceed anyway? Yes, usually.
            }

            const report = SecurityAnalyzer.scanMapData(data);
            if (!report.safe) {
                 alert("Security Issue:\n" + report.issues.join('\n'));
                 return;
            }
            
            onLoad(data);
            onClose();

        } catch (err: any) {
            console.error(err);
            alert("Failed to Load File:\n" + err.message);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm pointer-events-auto">
            {confirmDelete ? (
                <div className="bg-gray-900 border border-red-900/50 p-6 rounded-lg w-80 shadow-2xl animate-in fade-in zoom-in duration-100 z-50">
                     <h3 className="text-lg font-bold text-red-100 mb-2">Confirm Deletion</h3>
                     <p className="text-gray-300 text-sm mb-6">
                         {confirmDelete.type === 'all' 
                            ? "Are you sure you want to delete ALL saved maps? This cannot be undone."
                            : `Are you sure you want to delete "${confirmDelete.name}"?`}
                     </p>
                     <div className="flex gap-2 justify-end">
                         <button 
                             onClick={() => setConfirmDelete(null)}
                             className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm text-white"
                         >
                             Cancel
                         </button>
                         <button
                             onClick={executeDelete}
                             className="px-3 py-1 bg-red-900 hover:bg-red-800 text-red-100 rounded text-sm font-bold"
                         >
                             Delete
                         </button>
                     </div>
                </div>
            ) : (
                <div className="bg-gray-800 border border-gray-600 rounded-lg w-96 shadow-xl flex flex-col overflow-hidden">
                <div className="flex border-b border-gray-700 bg-gray-900/50">
                    <button 
                        onClick={() => setActiveTab('local')}
                        className={`flex-1 py-3 text-sm font-bold transition ${activeTab === 'local' ? 'bg-gray-800 text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}
                    >
                        BROWSER STORAGE
                    </button>
                    <button 
                         onClick={() => setActiveTab('file')}
                         className={`flex-1 py-3 text-sm font-bold transition ${activeTab === 'file' ? 'bg-gray-800 text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}
                    >
                        LOAD FROM FILE
                    </button>
                </div>

                <div className="p-6">
                    {activeTab === 'local' ? (
                        <div className="flex flex-col h-full">
                            <div className="mb-4 max-h-64 overflow-y-auto bg-gray-900/50 rounded p-2 min-h-[150px]">
                                {projects.length === 0 ? (
                                    <div className="text-gray-500 text-center italic py-10">No saved projects found.</div>
                                ) : (
                                    <div className="space-y-2">
                                        {projects.map(p => (
                                            <div key={p.name} className="flex gap-1">
                                                <button
                                                    onClick={() => handleLocalLoad(p.name)}
                                                    className="flex-1 text-left p-3 bg-gray-700 hover:bg-gray-600 rounded-l flex justify-between items-center group transition"
                                                >
                                                    <span className="font-bold text-white group-hover:text-blue-300">{p.name}</span>
                                                    <span className="text-xs text-gray-400 flex flex-col items-end">
                                                        <span>{new Date(p.lastModified).toLocaleDateString()}</span>
                                                        {(p as any).version && <span className="text-[10px] text-gray-500">v{(p as any).version}</span>}
                                                    </span>
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteSingle(p.name); }}
                                                    className="px-3 bg-red-900/30 hover:bg-red-900/50 text-red-300 rounded-r border-l border-gray-600 transition"
                                                    title="Delete Map"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {projects.length > 0 && (
                                <button 
                                    onClick={handleDeleteAll}
                                    className="text-xs text-red-400 hover:text-red-300 underline self-end mb-2"
                                >
                                    Clear All Local Storage
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-[150px] border-2 border-dashed border-gray-600 rounded bg-gray-900/30 hover:bg-gray-900/50 transition cursor-pointer"
                             onClick={() => fileInputRef.current?.click()}>
                            <span className="text-4xl mb-2">📂</span>
                            <span className="text-gray-300 font-bold">Click to Upload JSON</span>
                            <span className="text-gray-500 text-xs mt-1">Supports Unified Game Format</span>
                            <input 
                                type="file" 
                                ref={fileInputRef}
                                onChange={handleFileImport} 
                                accept=".json" 
                                className="hidden" 
                            />
                        </div>
                    )}

                    <div className="flex justify-end gap-2 mt-6 border-t border-gray-700 pt-4">
                        <button 
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded transition"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
            )}
        </div>
    );
};
