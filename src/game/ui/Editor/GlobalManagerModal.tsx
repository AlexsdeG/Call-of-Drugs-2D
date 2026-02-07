import React, { useState } from 'react';
import { GlobalVariable } from '../../../schemas/mapSchema';
import { Script } from '../../../schemas/scriptSchema';
import { ScriptEditorModal } from './ScriptEditorModal';
import { EventBus } from '../../EventBus';
import { Edit2, Trash2, Save, X } from 'lucide-react';

interface GlobalManagerModalProps {
    variables: GlobalVariable[];
    scripts: Script[];
    onUpdateVariables: (vars: GlobalVariable[]) => void;
    onUpdateScripts: (scripts: Script[]) => void;
    onClose: () => void;
}

export const GlobalManagerModal: React.FC<GlobalManagerModalProps> = ({ variables, scripts, onUpdateVariables, onUpdateScripts, onClose }) => {
    const [tab, setTab] = useState<'variables' | 'scripts'>('variables');
    const [editingScript, setEditingScript] = useState<{script: Script, index: number} | null>(null);

    // Variable State
    const [editingVarIndex, setEditingVarIndex] = useState<number | null>(null);
    const [varName, setVarName] = useState('');
    const [varType, setVarType] = useState<'string' | 'number' | 'boolean'>('number');
    const [varVal, setVarVal] = useState('');

    // Input Helpers
    const handleFocus = () => EventBus.emit('editor-input-focus');
    const handleBlur = () => EventBus.emit('editor-input-blur');
    const handleKeyDown = (e: React.KeyboardEvent) => e.stopPropagation();

    // Variable Logic
    const startEditVariable = (index: number) => {
        const v = variables[index];
        setEditingVarIndex(index);
        setVarName(v.name);
        setVarType(v.type);
        setVarVal(String(v.initialValue));
    };

    const cancelEditVariable = () => {
        setEditingVarIndex(null);
        setVarName('');
        setVarVal('');
        setVarType('number');
    };

    const saveVariable = () => {
        if (!varName) return;
        
        // Parse Value
        let initialValue: any = varVal;
        if (varType === 'number') initialValue = parseFloat(varVal) || 0;
        if (varType === 'boolean') initialValue = (varVal === 'true');

        const newVar = { name: varName, type: varType, initialValue };
        const updated = [...variables];

        if (editingVarIndex !== null) {
            // Update existing
            // Check collision only if name changed
            if (variables[editingVarIndex].name !== varName && variables.some(v => v.name === varName)) {
                alert("Variable name already exists!");
                return;
            }
            updated[editingVarIndex] = newVar;
            setEditingVarIndex(null);
        } else {
            // Add new
            if (variables.some(v => v.name === varName)) {
                alert("Variable name already exists!");
                return;
            }
            updated.push(newVar);
        }

        onUpdateVariables(updated);
        setVarName('');
        setVarVal('');
        setVarType('number');
    };

    const deleteVariable = (index: number) => {
        const updated = [...variables];
        updated.splice(index, 1);
        onUpdateVariables(updated);
        if (editingVarIndex === index) cancelEditVariable();
    };

    // Script Logic
    const addScript = () => {
         const newScript: Script = {
             id: crypto.randomUUID(),
             name: 'New Global Script',
             triggers: [{ type: 'ON_GAME_START' as any }], 
             actions: [],
             enabled: true
         };
         onUpdateScripts([...scripts, newScript]);
    };

    const deleteScript = (index: number) => {
        const updated = [...scripts];
        updated.splice(index, 1);
        onUpdateScripts(updated);
    };
    
    const renameScript = (index: number, e: React.MouseEvent) => {
        e.stopPropagation();
        const currentName = scripts[index].name;
        // Simple prompt for now, could be inline edit
        // We need to briefly allow input for prompt? No prompt is browser native, it handles itself.
        const newName = prompt("Rename Global Script:", currentName);
        if (newName && newName !== currentName) {
            const updated = [...scripts];
            updated[index] = { ...updated[index], name: newName };
            onUpdateScripts(updated);
        }
    };

    const saveEditedScript = (updatedScript: Script) => {
        if (editingScript) {
            const updated = [...scripts];
            updated[editingScript.index] = updatedScript;
            onUpdateScripts(updated);
            setEditingScript(null);
        }
    };

    if (editingScript) {
        return (
            <ScriptEditorModal
                script={editingScript.script}
                onSave={saveEditedScript}
                onClose={() => setEditingScript(null)}
                knownGlobals={variables}
            />
        );
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
             <div className="bg-[#1e1e1e] border border-gray-700 rounded-lg shadow-2xl flex flex-col w-[600px] h-[500px] overflow-hidden">
                {/* Header */}
                <div className="flex h-12 bg-[#252526] border-b border-[#3e3e42] px-4 items-center justify-between">
                    <span className="font-bold text-gray-200">Global Manager</span>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
                </div>
                
                {/* Tabs */}
                <div className="flex border-b border-[#3e3e42]">
                    <button 
                        onClick={() => setTab('variables')}
                        className={`flex-1 py-2 text-sm font-bold ${tab === 'variables' ? 'bg-[#1e1e1e] text-blue-400 border-b-2 border-blue-400' : 'bg-[#252526] text-gray-500 hover:bg-[#2d2d30]'}`}
                    >
                        VARIABLES
                    </button>
                    <button 
                        onClick={() => setTab('scripts')}
                        className={`flex-1 py-2 text-sm font-bold ${tab === 'scripts' ? 'bg-[#1e1e1e] text-purple-400 border-b-2 border-purple-400' : 'bg-[#252526] text-gray-500 hover:bg-[#2d2d30]'}`}
                    >
                        SCRIPTS
                    </button>
                </div>
                
                {/* Content */}
                <div className="flex-1 p-4 overflow-y-auto bg-[#1e1e1e] text-gray-300 custom-scrollbar">
                    
                    {tab === 'variables' && (
                        <div className="space-y-4">
                            {/* Editor Form */}
                            <div className={`flex gap-2 items-end p-3 rounded border ${editingVarIndex !== null ? 'bg-blue-900/20 border-blue-500' : 'bg-[#252526] border-[#3e3e42]'}`}>
                                <div className="flex-1">
                                    <label className="block text-[10px] text-gray-500 mb-1">Name</label>
                                    <input 
                                        value={varName} 
                                        onChange={e => setVarName(e.target.value)} 
                                        onFocus={handleFocus}
                                        onBlur={handleBlur}
                                        onKeyDown={handleKeyDown}
                                        className={`w-full bg-black border rounded p-1 text-xs outline-none focus:border-blue-500 ${
                                            !varName || (variables.some((v, i) => v.name === varName && i !== editingVarIndex)) 
                                            ? 'border-red-500' 
                                            : 'border-gray-600'
                                        }`} 
                                        placeholder="my_var" 
                                    />
                                </div>
                                <div className="w-24">
                                    <label className="block text-[10px] text-gray-500 mb-1">Type</label>
                                    <select 
                                        value={varType} 
                                        onChange={e => {
                                            const newType = e.target.value as any;
                                            setVarType(newType);
                                            // Reset value on type switch to avoid confusion, or set sensible default
                                            if (newType === 'boolean') setVarVal('false');
                                            else setVarVal('');
                                        }} 
                                        onFocus={handleFocus}
                                        onBlur={handleBlur}
                                        onKeyDown={handleKeyDown}
                                        className="w-full bg-black border border-gray-600 rounded p-1 text-xs outline-none focus:border-blue-500"
                                    >
                                        <option value="number">Number</option>
                                        <option value="boolean">Boolean</option>
                                        <option value="string">String</option>
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <label className="block text-[10px] text-gray-500 mb-1">Value</label>
                                    {varType === 'boolean' ? (
                                        <select
                                            value={varVal || 'false'}
                                            onChange={e => setVarVal(e.target.value)}
                                            onFocus={handleFocus}
                                            onBlur={handleBlur}
                                            onKeyDown={handleKeyDown}
                                            className="w-full bg-black border border-gray-600 rounded p-1 text-xs outline-none focus:border-blue-500"
                                        >
                                            <option value="true">True</option>
                                            <option value="false">False</option>
                                        </select>
                                    ) : (
                                        <input 
                                            value={varVal} 
                                            onChange={e => setVarVal(e.target.value)} 
                                            onFocus={handleFocus}
                                            onBlur={handleBlur}
                                            onKeyDown={handleKeyDown}
                                            className={`w-full bg-black border rounded p-1 text-xs outline-none focus:border-blue-500 ${
                                                !varVal && varType !== 'boolean' ? 'border-red-500' : 'border-gray-600'
                                            }`} 
                                            placeholder={varType === 'number' ? "0" : "some text..."} 
                                        />
                                    )}
                                </div>
                                <div className="flex gap-1">
                                    {editingVarIndex !== null && (
                                        <button onClick={cancelEditVariable} className="bg-gray-600 p-1.5 rounded hover:bg-gray-500 text-white" title="Cancel">
                                            <X size={14} />
                                        </button>
                                    )}
                                    <button 
                                        onClick={saveVariable} 
                                        disabled={!varName || (!varVal && varType !== 'boolean') || (variables.some((v, i) => v.name === varName && i !== editingVarIndex))}
                                        className="bg-blue-600 p-1.5 rounded hover:bg-blue-500 text-white font-bold text-xs disabled:opacity-50 disabled:cursor-not-allowed" 
                                        title={editingVarIndex !== null ? "Update" : "Add"}
                                    >
                                        {editingVarIndex !== null ? <Save size={14} /> : 'ADD'}
                                    </button>
                                </div>
                            </div>

                            {/* List */}
                            <div className="space-y-1">
                                {variables.map((v, idx) => (
                                    <div key={idx} className={`flex justify-between items-center bg-[#252526] p-2 rounded border ${editingVarIndex === idx ? 'border-blue-500' : 'border-transparent hover:border-gray-600'}`}>
                                        <div className="flex items-center gap-3">
                                            <span className="text-green-400 font-mono text-xs">{v.name}</span>
                                            <span className="text-gray-500 text-[10px] uppercase bg-black/30 px-1 rounded">{v.type}</span>
                                            <span className="text-gray-300 text-xs">= {String(v.initialValue)}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => startEditVariable(idx)} className="text-gray-400 hover:text-white" title="Edit">
                                                <Edit2 size={12} />
                                            </button>
                                            <button onClick={() => deleteVariable(idx)} className="text-gray-400 hover:text-red-500" title="Delete">
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {variables.length === 0 && <div className="text-gray-600 text-center text-xs py-4">No global variables defined.</div>}
                            </div>
                        </div>
                    )}
                    
                    {tab === 'scripts' && (
                        <div className="space-y-4">
                             <button onClick={addScript} className="w-full py-2 bg-purple-700 hover:bg-purple-600 rounded text-xs font-bold transition flex items-center justify-center gap-2">
                                + NEW GLOBAL SCRIPT
                            </button>
                            
                            <div className="space-y-1">
                                {scripts.map((s, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-[#252526] p-2 rounded border border-transparent hover:border-gray-600 cursor-pointer" onClick={() => setEditingScript({script: s, index: idx})}>
                                        <div className="flex flex-col">
                                            <span className="text-purple-300 font-bold text-xs">{s.name}</span>
                                            <span className="text-gray-500 text-[10px]">{s.triggers.map(t => t.type).join(', ')}</span>
                                        </div>
                                        <div className="flex gap-2 items-center">
                                            <button 
                                                onClick={(e) => renameScript(idx, e)} 
                                                className="text-gray-400 hover:text-white p-1"
                                                title="Rename"
                                            >
                                                <Edit2 size={12} />
                                            </button>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); deleteScript(idx); }} 
                                                className="text-gray-400 hover:text-red-500 p-1"
                                                title="Delete"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {scripts.length === 0 && <div className="text-gray-600 text-center text-xs py-4">No global scripts defined.</div>}
                            </div>
                        </div>
                    )}

                </div>
             </div>
        </div>
    );
};
