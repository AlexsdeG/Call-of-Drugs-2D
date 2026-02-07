import React from 'react';

interface ContextMenuProp {
    label: string;
    action: () => void;
    color?: string; // e.g., 'red', 'white'
}

interface ContextMenuProps {
    x: number;
    y: number;
    options: ContextMenuProp[];
    onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, options, onClose }) => {
    return (
        <div 
            className="fixed z-50 bg-gray-900 border border-gray-700 rounded shadow-lg py-1 min-w-[120px]"
            style={{ top: y, left: x }}
            onMouseLeave={onClose}
        >
            {options.map((opt, idx) => (
                <div 
                    key={idx}
                    onClick={() => { opt.action(); onClose(); }}
                    className={`px-3 py-1 text-xs cursor-pointer hover:bg-gray-800 ${opt.color === 'red' ? 'text-red-500 hover:text-red-400' : 'text-gray-200 hover:text-white'}`}
                >
                    {opt.label}
                </div>
            ))}
        </div>
    );
};
