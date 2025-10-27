import React, { useState } from 'react';
import { AnnotationTool } from './AnnotationCanvas';
import { MoveIcon } from './icons/MoveIcon';
import { PenToolIcon } from './icons/PenToolIcon';
import { TextPlusIcon } from './icons/TextPlusIcon';
import { UndoIcon } from './icons/UndoIcon';
import { TrashIcon } from './icons/TrashIcon';
import { XIcon } from './icons/XIcon';

interface AnnotationToolbarProps {
    onClose: () => void;
    onUndo: () => void;
    onClear: () => void;
    onToolSelect: (tool: AnnotationTool) => void;
    onColorSelect: (color: string) => void;
    initialTool: AnnotationTool;
    initialColor: string;
}

const colors = [
    { name: 'Red', hex: '#EF4444' },
    { name: 'Blue', hex: '#3B82F6' },
    { name: 'Green', hex: '#22C55E' },
    { name: 'Yellow', hex: '#EAB308' },
    { name: 'White', hex: '#FFFFFF' },
    { name: 'Black', hex: '#000000' },
];

const ToolButton: React.FC<{
    label: string;
    isActive: boolean;
    onClick: () => void;
    children: React.ReactNode;
}> = ({ label, isActive, onClick, children }) => (
    <button
        onClick={onClick}
        className={`p-2.5 rounded-md transition-colors ${isActive ? 'bg-zinc-600' : 'hover:bg-zinc-700'}`}
        aria-label={label}
        title={label}
        aria-pressed={isActive}
    >
        {children}
    </button>
);

export const AnnotationToolbar: React.FC<AnnotationToolbarProps> = ({
    onClose,
    onUndo,
    onClear,
    onToolSelect,
    onColorSelect,
    initialTool,
    initialColor,
}) => {
    const [activeTool, setActiveTool] = useState<AnnotationTool>(initialTool);
    const [activeColor, setActiveColor] = useState<string>(initialColor);

    const handleToolSelect = (tool: AnnotationTool) => {
        setActiveTool(tool);
        onToolSelect(tool);
    };

    const handleColorSelect = (color: string) => {
        setActiveColor(color);
        onColorSelect(color);
    };

    return (
        <div 
            className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-zinc-800/90 backdrop-blur-sm text-white rounded-xl shadow-2xl z-[10001] flex items-center gap-2 p-2 animate-fade-in"
            role="toolbar"
            aria-label="Annotation Toolbar"
        >
            <div className="flex items-center gap-1">
                <ToolButton label="Move Tool" isActive={activeTool === 'move'} onClick={() => handleToolSelect('move')}>
                    <MoveIcon className="w-5 h-5" />
                </ToolButton>
                <ToolButton label="Pen Tool" isActive={activeTool === 'pen'} onClick={() => handleToolSelect('pen')}>
                    <PenToolIcon className="w-5 h-5" />
                </ToolButton>
                <ToolButton label="Text Tool" isActive={activeTool === 'text'} onClick={() => handleToolSelect('text')}>
                    <TextPlusIcon className="w-5 h-5" />
                </ToolButton>
            </div>

            <div className="h-6 w-px bg-zinc-600 mx-1"></div>

            <div className="flex items-center gap-2">
                {colors.map(color => (
                    <button
                        key={color.name}
                        onClick={() => handleColorSelect(color.hex)}
                        className={`w-6 h-6 rounded-full transition-transform transform hover:scale-110 ${activeColor === color.hex ? 'ring-2 ring-offset-2 ring-offset-zinc-800 ring-white' : ''}`}
                        style={{ backgroundColor: color.hex }}
                        aria-label={`Select color ${color.name}`}
                        title={color.name}
                    />
                ))}
            </div>

            <div className="h-6 w-px bg-zinc-600 mx-1"></div>

            <div className="flex items-center gap-1">
                 <button onClick={onUndo} className="p-2.5 rounded-md hover:bg-zinc-700" title="Undo"><UndoIcon className="w-5 h-5" /></button>
                 <button onClick={onClear} className="p-2.5 rounded-md hover:bg-zinc-700" title="Clear All"><TrashIcon className="w-5 h-5" /></button>
            </div>
            
            <div className="h-6 w-px bg-zinc-600 mx-1"></div>

            <div className="flex items-center">
                <button onClick={onClose} className="text-sm font-medium px-4 py-2 rounded-md hover:bg-zinc-700 flex items-center gap-1.5"><XIcon className="w-4 h-4" /> Close</button>
            </div>
        </div>
    );
};