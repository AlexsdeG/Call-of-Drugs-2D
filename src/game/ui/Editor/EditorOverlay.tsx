import React from 'react';
import { useEmpireStore } from '../../../store/useEmpireStore';
import { GameState } from '../../../types';
import { EditorSidebar } from './EditorSidebar';
import { EventBus } from '../../EventBus';
import { VERSION } from '../../../config/constants';

import { LoadMapModal } from '../Modals/LoadMapModal';
import { SaveMapModal } from '../Modals/SaveMapModal';
import { ExitWarningModal } from '../Modals/ExitWarningModal';
import { PreviewWarningModal } from '../Modals/PreviewWarningModal';

// ... (existing imports)

export const EditorOverlay = () => {
  const setGameState = useEmpireStore((state) => state.setGameState);
  
  // State
  const [notification, setNotification] = React.useState<{msg: string, type: 'success'|'error'}| null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false);
  
  // Modal State
  const [showSaveModal, setShowSaveModal] = React.useState(false);
  const [showLoadModal, setShowLoadModal] = React.useState(false);
  const [showExitModal, setShowExitModal] = React.useState(false);
  const [showPreviewWarning, setShowPreviewWarning] = React.useState(false); // New State
  const [currentMapName, setCurrentMapName] = React.useState("Untitled Map");
  
  // Pending Actions
  const [pendingPreview, setPendingPreview] = React.useState(false);
  
  // History State
  const [historyState, setHistoryState] = React.useState({ canUndo: false, canRedo: false });

  // Listeners
  React.useEffect(() => {
      const onSaveSuccess = (mapName?: string) => {
          setNotification({ msg: "Project Saved!", type: 'success' });
          setHasUnsavedChanges(false);
          if (mapName) setCurrentMapName(mapName);
          
          if (pendingPreview) {
              setPendingPreview(false);
              setTimeout(() => EventBus.emit('editor-command-preview'), 200);
          } else {
              setTimeout(() => setNotification(null), 2000);
          }
      };
      
      const onLoadSuccess = (data: any) => {
          setNotification({ msg: "Project Loaded!", type: 'success' });
          setHasUnsavedChanges(false); 
          if (data && data.name) setCurrentMapName(data.name);
          setTimeout(() => setNotification(null), 2000);
      };
      


      const onError = (msg: string) => {
          setNotification({ msg: msg, type: 'error' });
          setTimeout(() => setNotification(null), 3000);
      };
      
      const onContentChange = () => setHasUnsavedChanges(true);
      const onCleanState = () => setHasUnsavedChanges(false);
      const onDirtyState = () => setHasUnsavedChanges(true);
      
      const onHistoryUpdate = (state: { canUndo: boolean, canRedo: boolean }) => {
          setHistoryState({ canUndo: state.canUndo, canRedo: state.canRedo });
      };
      
      EventBus.on('history-update', onHistoryUpdate);

      
      EventBus.on('editor-save-success', onSaveSuccess);
      EventBus.on('editor-load-success', onLoadSuccess);
      EventBus.on('editor-io-error', onError);
      
      EventBus.on('editor-dirty-state', onDirtyState);
      EventBus.on('editor-clean-state', onCleanState);
      EventBus.on('editor-content-changed', onContentChange); 
      
      return () => {
          EventBus.off('editor-save-success', onSaveSuccess);
          EventBus.off('editor-load-success', onLoadSuccess);
          EventBus.off('editor-io-error', onError);
          EventBus.off('editor-dirty-state', onDirtyState);
          EventBus.off('editor-clean-state', onCleanState);
          EventBus.off('editor-content-changed', onContentChange); 
          EventBus.off('history-update', onHistoryUpdate);
      };
  }, [pendingPreview]);

  // -- Handlers --
  const onSaveClick = () => {
      setShowSaveModal(true);
  };

  const executeSave = (name: string, destination: 'browser' | 'file') => {
      // Close Modal (State update only, does NOT trigger onClose callback)
      setShowSaveModal(false); 
      
      if (destination === 'browser') {
          EventBus.emit('editor-command-save', { name });
      } else {
          EventBus.emit('editor-command-save-file', { name });
      }
      setCurrentMapName(name); 
  };

  const saveAndExit = () => {
      setShowExitModal(false);
      setShowSaveModal(true);
  };

  const confirmExit = () => { 
       setShowExitModal(false);
       setGameState(GameState.MENU);
  };

  const handleExitRequest = () => {
      if (hasUnsavedChanges) {
          setShowExitModal(true);
      } else {
          setGameState(GameState.MENU);
      }
  };
  
  const handlePreview = () => {
      if (hasUnsavedChanges) {
          setShowPreviewWarning(true);
      } else {
          EventBus.emit('editor-command-preview');
      }
  };

  const executePreviewAnyway = () => {
      setShowPreviewWarning(false);
      EventBus.emit('editor-command-preview');
  };

  const saveForPreview = () => {
      setShowPreviewWarning(false);
      setShowSaveModal(true);
      setPendingPreview(true);
  };

  // 2. Load Flow
  const handleLoadClick = () => setShowLoadModal(true);
  
  const executeLoad = (data: any) => {
      // Data is already loaded (either from Local Storage or File Import)
      if (data) {
          EventBus.emit('editor-command-import', data);
          EventBus.emit('editor-load-success', data);
      } else {
          setNotification({ msg: "Failed to load project", type: 'error' });
      }
  };

  const handleUndo = () => EventBus.emit('editor-undo');
  const handleRedo = () => EventBus.emit('editor-redo');

 

  // ... (rest)

  return (
    <div className="absolute inset-0 flex flex-col z-20 pointer-events-none">
       {/* Top Bar */}
       <div className="w-full h-12 bg-gray-900/90 border-b border-gray-700 flex justify-between items-center px-4 pointer-events-auto backdrop-blur-sm">
          <div className="flex items-center gap-4">
              <h2 className="text-white font-bold tracking-wider text-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                      MAP EDITOR <span className="text-xs text-gray-500 bg-black/50 px-2 py-0.5 rounded">BETA {VERSION}</span>
              </h2>
          </div>
          
           {/* Center Area: Undo/Redo */}
           <div className="flex items-center gap-2">
                <button 
                  onClick={handleUndo} 
                  disabled={!historyState.canUndo}
                  className={`px-3 py-1 rounded text-xs transition flex items-center gap-1 ${historyState.canUndo ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}
                >
                    ↩ Undo
                </button>
                 <button 
                  onClick={handleRedo} 
                  disabled={!historyState.canRedo}
                  className={`px-3 py-1 rounded text-xs transition flex items-center gap-1 ${historyState.canRedo ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}
                >
                    Redo ↪
                </button>
                <div className="w-px h-4 bg-gray-700 mx-1"></div>
                <button 
                  onClick={() => EventBus.emit('editor-toggle-history')}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs transition flex items-center gap-1"
                >
                    History 📜
                </button>
           </div>
          
          <div className="flex items-center gap-2">
               {hasUnsavedChanges && (
                   <span className="text-red-400 text-xs font-mono mr-4 animate-pulse flex items-center gap-1">
                       unsaved changes *
                   </span>
               )}

               {notification && (
                   <span className="text-green-400 text-xs font-mono mr-2 animate-pulse">{notification.msg}</span>
               )}
              <button 
                onClick={onSaveClick}
                className="px-3 py-1 bg-blue-700 hover:bg-blue-600 text-white rounded text-xs transition"
              >
                  SAVE
              </button>
              <button 
                onClick={handleLoadClick}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs transition"
              >
                  LOAD
              </button>
              
              
            <div className="w-px h-6 bg-gray-600 mx-2"></div>
              
               <button 
                onClick={handlePreview}
                className="px-3 py-1 bg-yellow-600 hover:bg-yellow-500 text-white rounded text-xs font-bold transition flex items-center gap-1"
              >
                  <span>▶</span> PREVIEW
              </button>
              
              <div className="w-px h-6 bg-gray-600 mx-2"></div>

              <button 
                onClick={handleExitRequest} 
                className="px-3 py-1 bg-red-900/50 hover:bg-red-800 text-red-200 border border-red-800 rounded text-xs transition"
              >
                  EXIT
              </button>
          </div>
       </div>

       {/* Main Area */}
       <div className="flex-1 flex overflow-hidden">
           {/* Canvas is behind here */}
           <div className="flex-1 relative">
               {/* Overlay for tooltips or floating panels could go here */}
               <div className="absolute bottom-4 left-4 pointer-events-none opacity-50">
                    <div className="text-xs text-white font-mono bg-black/50 p-2 rounded">
                        <div>WASD or MMB: Move Camera</div>
                        <div>CTRL+Z / CTRL+Y: Undo/Redo</div>
                        <div>CTRL + LMB: Place multiple Objects</div>
                        <div>SCROLL or Q/E: Zoom</div>
                        <div>LMB: Paint/Place/Select</div>
                    </div>
               </div>
           </div>

           {/* Sidebar */}
           <EditorSidebar />
       </div>

       {/* Modals */}
       <SaveMapModal 
           isOpen={showSaveModal}
           initialName={currentMapName}
           onClose={() => { setShowSaveModal(false); setPendingPreview(false); }}
           onSave={executeSave}
       />
       <LoadMapModal
           isOpen={showLoadModal}
           onClose={() => setShowLoadModal(false)}
           onLoad={executeLoad}
       />
       <ExitWarningModal 
           isOpen={showExitModal}
           onCancel={() => setShowExitModal(false)}
           onConfirmExit={confirmExit}
           onSaveAndExit={saveAndExit}
       />
       <PreviewWarningModal 
           isOpen={showPreviewWarning}
           onCancel={() => setShowPreviewWarning(false)}
           onContinue={executePreviewAnyway}
           onSave={saveForPreview}
       />
    </div>
  );
};
