import React, { useState, useEffect, useRef } from 'react';
import { ScriptValidator, ValidationError } from '../../utils/ScriptValidator';
import { EventBus } from '../../EventBus';
import { ScriptSchema } from '../../../schemas/scriptSchema';
import { GlobalVariable } from '../../../schemas/mapSchema';

interface ScriptEditorModalProps {
    script: any;
    onSave: (updatedScript: any) => void;
    onClose: () => void;
    knownGlobals?: GlobalVariable[];
}

export const ScriptEditorModal: React.FC<ScriptEditorModalProps> = ({ script, onSave, onClose, knownGlobals = [] }) => {
    const [jsonContent, setJsonContent] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

    // History
    const [history, setHistory] = useState<{ undo: string[], redo: string[] }>({ undo: [], redo: [] });
    const historyTimeout = useRef<any>(null);
    const lastSavedContent = useRef<string>('');

    
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const highlightRef = useRef<HTMLPreElement>(null);

    useEffect(() => {
        if (script) {
            const initial = JSON.stringify(script, null, 2);
            setJsonContent(initial);
            lastSavedContent.current = initial;
            setHistory({ undo: [], redo: [] });
        }
    }, [script]);

    // Handle Input Focus for Game to disable Keyboard
    useEffect(() => {
        EventBus.emit('editor-input-focus');
        return () => {
            EventBus.emit('editor-input-blur');
        };
    }, []);

    const handleCheck = () => {
        try {
            const parsed = JSON.parse(jsonContent);
            const valid = ScriptSchema.safeParse(parsed);
            
            if (!valid.success) {
                setError("Validation Error: " + valid.error.errors.map(e => e.message).join(', '));
                setValidationErrors([]);
                return;
            }

            // Static Analysis
            const scriptObj = parsed;
            const issues = ScriptValidator.validate(scriptObj, knownGlobals);
            
            if (issues.length > 0) {
                 setValidationErrors(issues);
                 setError(`Found ${issues.length} issues.`);
            } else {
                 setValidationErrors([]);
                 setError(null);
                 // Toast success?
                 alert("Script is Valid!");
            }

        } catch (e) {
            setError("Invalid JSON Syntax");
            setValidationErrors([]);
        }
    };
    
    // History Logic
    const saveToHistory = (content: string) => {
        setHistory(prev => {
            const newUndo = [...prev.undo, content];
            if (newUndo.length > 50) newUndo.shift();
            return {
                undo: newUndo,
                redo: []
            };
        });
        lastSavedContent.current = content;
    };

    const handleContentChange = (newContent: string) => {
        setJsonContent(newContent);
        setError(null);
        
        // Debounce history save
        if (historyTimeout.current) clearTimeout(historyTimeout.current);
        
        // Save if user paused for 1s
        historyTimeout.current = setTimeout(() => {
            if (lastSavedContent.current !== newContent) {
                saveToHistory(lastSavedContent.current); // Save previous state
                lastSavedContent.current = newContent;   // Update current ref
            }
        }, 800);
    };

    const performUndo = () => {
        setHistory(prev => {
            if (prev.undo.length === 0) return prev;
            const previous = prev.undo[prev.undo.length - 1];
            const newUndo = prev.undo.slice(0, -1);
            
            // Push CURRENT to redo first?
            const current = jsonContent;
            
            setJsonContent(previous);
            lastSavedContent.current = previous;
            
            return {
                undo: newUndo,
                redo: [current, ...prev.redo]
            };
        });
    };

    const performRedo = () => {
         setHistory(prev => {
            if (prev.redo.length === 0) return prev;
            const next = prev.redo[0];
            const newRedo = prev.redo.slice(1);
            
            // Push CURRENT to undo
            const current = jsonContent;
            
            setJsonContent(next);
            lastSavedContent.current = next;

            return {
                undo: [...prev.undo, current],
                redo: newRedo
            };
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            e.preventDefault();
            performUndo();
        }
        if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
            e.preventDefault();
            performRedo();
        }
    };

    const handleSave = () => {
        try {
            const parsed = JSON.parse(jsonContent);
            const valid = ScriptSchema.safeParse(parsed);
            
            if (!valid.success) {
                setError("Validation Error: " + valid.error.errors.map(e => e.message).join(', '));
                return;
            }

            onSave(parsed);
            onClose();
        } catch (e) {
            setError("Invalid JSON Syntax");
        }
    };

    // ... (rest of state and render)
    // We need to render the validation errors somewhere. 
    // Maybe a panel below or overlay? 
    // And add the "Check" button.

    // ... existing scrolling and highlighting logic ...

    // Highlight JSON (unchanged)
    // ...

    // ... return JSX ...
    // Update footer to include Check button.
    
    // (We will use replace_file_content smartly to just update the parts we need, but since we are injecting imports and content in the middle, we might need a larger replace or careful chunks. 
    // The previous tool call showed the whole file. I will replace the component implementation to include these changes.)

    // State for scrolling and dimensions
    const [scrollTop, setScrollTop] = useState(0);
    const [editorRatio, setEditorRatio] = useState(1); 

    const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        setScrollTop(scrollTop);
        setEditorRatio(clientHeight / scrollHeight);
        if (highlightRef.current) {
            highlightRef.current.scrollTop = scrollTop;
            highlightRef.current.scrollLeft = e.currentTarget.scrollLeft;
        }
    };
    
    const handleMinimapClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!textareaRef.current) return;
        const minimapHeight = e.currentTarget.clientHeight;
        const clickY = e.nativeEvent.offsetY;
        const percentage = clickY / minimapHeight;
        const targetScrollTop = percentage * (textareaRef.current.scrollHeight - textareaRef.current.clientHeight);
        textareaRef.current.scrollTop = targetScrollTop; 
    };

    const highlightJSON = (json: string) => {
        if (!json) return '';
        let escaped = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return escaped.replace(
            /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
            (match) => {
                let cls = 'text-purple-400'; 
                if (/^"/.test(match)) {
                    if (/:$/.test(match)) cls = 'text-blue-400 font-bold'; 
                    else cls = 'text-green-400'; 
                } else if (/true|false/.test(match)) cls = 'text-orange-400'; 
                else if (/null/.test(match)) cls = 'text-gray-500'; 
                return `<span class="${cls}">${match}</span>`;
            }
        );
    };

    const lineNumbers = jsonContent.split('\n').map((_, i) => i + 1);
    const minimapOverlayTop = textareaRef.current ? (scrollTop / textareaRef.current.scrollHeight) * 100 : 0;
    const minimapOverlayHeight = textareaRef.current ? (textareaRef.current.clientHeight / textareaRef.current.scrollHeight) * 100 : 10; 

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-[#1e1e1e] border border-gray-700 rounded-lg shadow-2xl flex flex-col overflow-hidden" style={{ width: '90vw', height: '90vh' }}>
                
                {/* Header */}
                <div className="flex h-10 items-center justify-between px-4 bg-[#252526] border-b border-[#3e3e42]">
                    <div className="flex items-center gap-2">
                         <span className="text-blue-400 text-xs font-bold">JSON EDITOR</span>
                         <span className="text-gray-400 text-xs">/ {script?.name || 'Untitled'}</span>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition">✕</button>
                </div>

                {/* Main Editor Area */}
                <div className="flex-1 flex overflow-hidden relative">
                    
                    {/* Gutter */}
                    <div className="w-12 bg-[#1e1e1e] text-gray-600 text-right pr-3 pt-2 text-xs font-mono select-none border-r border-[#3e3e42] overflow-hidden">
                        <div style={{ transform: `translateY(-${scrollTop}px)` }}>
                            {lineNumbers.map((line) => (
                                <div key={line} style={{ height: '20px' }} className="leading-[20px]">{line}</div>
                            ))}
                        </div>
                    </div>

                    {/* Code Area */}
                    <div className="flex-1 relative font-mono text-sm">
                        <pre ref={highlightRef} className="absolute inset-0 m-0 p-2 pointer-events-none overflow-hidden whitespace-pre" style={{ lineHeight: '20px' }} dangerouslySetInnerHTML={{ __html: highlightJSON(jsonContent) }} />
                        <textarea
                            ref={textareaRef}
                            className="absolute inset-0 w-full h-full bg-transparent text-transparent caret-white resize-none border-none outline-none p-2 overflow-auto whitespace-pre z-10 selection:bg-blue-500/30"
                            style={{ lineHeight: '20px' }}
                            value={jsonContent}
                            onChange={(e) => handleContentChange(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onScroll={handleScroll}
                            spellCheck={false}
                        />
                         
                         {/* Validation Overlay */}
                         {validationErrors.length > 0 && (
                            <div className="absolute bottom-0 left-0 right-0 bg-red-900/90 text-white p-2 text-xs max-h-32 overflow-y-auto z-20 border-t border-red-500">
                                <div className="font-bold mb-1">Validation Issues:</div>
                                {validationErrors.map((err, i) => (
                                    <div key={i} className="flex gap-2">
                                        <span className="text-red-300">⚠</span>
                                        <span>{err.message}</span>
                                    </div>
                                ))}
                            </div>
                         )}
                    </div>

                    {/* Minimap */}
                    <div className="w-32 bg-[#1e1e1e] border-l border-[#3e3e42] relative overflow-hidden hidden md:block cursor-pointer group" onClick={handleMinimapClick}>
                        <div className="absolute top-0 left-0 w-full origin-top-left pointer-events-none p-1 text-[4px] leading-[4px] text-gray-500 whitespace-pre opacity-50 group-hover:opacity-100 transition-opacity" style={{ transform: `translateY(-${scrollTop * 0.15}px) scale(0.3)`, width: '333%' }}>
                            {jsonContent}
                        </div>
                        <div className="absolute left-0 w-full bg-white/10 pointer-events-none transition-all duration-75 border-y border-white/20" style={{ top: `${minimapOverlayTop}%`, height: `${minimapOverlayHeight}%` }}></div> 
                    </div>
                </div>

                {/* Footer */}
                <div className={`h-10 flex items-center justify-between px-4 text-white text-xs z-50 relative transition-colors duration-300 ${error ? 'bg-red-700' : 'bg-[#007acc]'}`}>
                    <div className="flex items-center gap-4">
                        <span>Lns: {lineNumbers.length}</span>
                        {error ? <span className="font-bold">⚠️ {error}</span> : <span>All Good</span>}
                    </div>
                    <div className="flex gap-2">
                        <button onClick={performUndo} disabled={history.undo.length === 0} className={`px-2 py-1 bg-gray-700 rounded text-xs ${history.undo.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-600'}`}>↩</button>
                        <button onClick={performRedo} disabled={history.redo.length === 0} className={`px-2 py-1 bg-gray-700 rounded text-xs mr-2 ${history.redo.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-600'}`}>↪</button>
                        <button onClick={handleCheck} className="px-3 py-1 bg-yellow-600 hover:bg-yellow-500 rounded font-bold transition mr-2">
                            CHECK SYNTAX
                        </button>
                        <button onClick={onClose} className="px-3 py-1 hover:bg-white/10 rounded transition">Cancel</button>
                        <button onClick={handleSave} className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded font-bold transition">Save Changes</button>
                    </div>
                </div>
            </div>
        </div>
    );
};
