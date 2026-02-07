import React, { useState } from 'react';
import { useEmpireStore } from '../../../store/useEmpireStore';
import { Package, X } from 'lucide-react'; 

export const InventoryUI = () => {
    const isOpen = useEmpireStore((state) => state.isInventoryOpen);
    const inventory = useEmpireStore((state) => state.inventory);
    const maxWeight = useEmpireStore((state) => state.maxWeight);
    const setInventoryOpen = useEmpireStore((state) => state.setInventoryOpen);

    const [hoveredItem, setHoveredItem] = useState<string | null>(null);

    if (!isOpen) return null;

    const currentWeight = inventory.reduce((total, item) => total + (item.weight * item.quantity), 0);
    const weightPercent = Math.min(100, (currentWeight / maxWeight) * 100);

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
            <div className="bg-gray-900 border border-gray-700 w-[600px] h-[400px] rounded-lg shadow-2xl flex flex-col overflow-hidden">
                
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-gray-800 bg-gray-900/50">
                    <div className="flex items-center gap-2">
                        <Package className="text-blue-400 w-5 h-5" />
                        <h2 className="text-xl font-bold text-gray-100 tracking-wide">INVENTORY</h2>
                    </div>
                    <button 
                        onClick={() => setInventoryOpen(false)}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 p-4 flex gap-4">
                    {/* Item Grid */}
                    <div className="flex-1 bg-gray-950/50 rounded border border-gray-800 p-2 grid grid-cols-5 gap-2 content-start overflow-y-auto">
                        {inventory.map((item) => (
                            <div 
                                key={item.id}
                                onMouseEnter={() => setHoveredItem(item.id)}
                                onMouseLeave={() => setHoveredItem(null)}
                                className={`
                                    relative aspect-square bg-gray-800/50 border border-gray-700 rounded flex items-center justify-center cursor-pointer hover:bg-gray-700 hover:border-gray-500 transition-all group
                                    ${item.illegal ? 'border-red-900/30 bg-red-900/10' : ''}
                                `}
                            >
                                <div className="text-gray-300 text-xs font-mono text-center break-words px-1">
                                    {item.name}
                                </div>
                                <div className="absolute bottom-1 right-1 text-[10px] bg-gray-900 text-gray-400 px-1 rounded">
                                    x{item.quantity}
                                </div>
                            </div>
                        ))}
                        {/* Empty Slots Fillers (Visual only) */}
                        {Array.from({ length: Math.max(0, 20 - inventory.length) }).map((_, i) => (
                            <div key={`empty-${i}`} className="aspect-square bg-gray-900/20 border border-gray-800/50 rounded" />
                        ))}
                    </div>

                    {/* Details Panel */}
                    <div className="w-1/3 bg-gray-900 border border-gray-800 rounded p-4 flex flex-col text-sm text-gray-300">
                        {hoveredItem ? (
                            (() => {
                                const item = inventory.find(i => i.id === hoveredItem);
                                if (!item) return null;
                                return (
                                    <>
                                        <h3 className="text-lg font-bold text-white mb-1">{item.name}</h3>
                                        <div className={`text-xs font-bold mb-4 uppercase tracking-wider ${item.illegal ? 'text-red-500' : 'text-blue-400'}`}>
                                            {item.type} {item.illegal && '(ILLEGAL)'}
                                        </div>
                                        <div className="space-y-2 text-gray-400">
                                            <div className="flex justify-between">
                                                <span>Weight:</span>
                                                <span className="text-white">{item.weight} kg</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Quantity:</span>
                                                <span className="text-white">{item.quantity}</span>
                                            </div>
                                            <div className="border-t border-gray-800 my-2 pt-2 text-xs italic opacity-50">
                                                {item.props?.description || "No description."}
                                            </div>
                                        </div>
                                    </>
                                );
                            })()
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-gray-600 italic text-center">
                                Hover over an item for details
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer / Weight Bar */}
                <div className="p-4 bg-gray-900 border-t border-gray-800">
                    <div className="flex justify-between text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">
                        <span>Capacity</span>
                        <span className={currentWeight > maxWeight ? 'text-red-500' : 'text-white'}>
                            {currentWeight.toFixed(1)} / {maxWeight} KG
                        </span>
                    </div>
                    <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div 
                            className={`h-full transition-all duration-300 ${currentWeight > maxWeight ? 'bg-red-600' : 'bg-blue-500'}`}
                            style={{ width: `${Math.min(100, weightPercent)}%` }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
