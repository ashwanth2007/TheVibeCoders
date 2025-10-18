import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { CheckIcon } from './icons/CheckIcon';
import { UndoIcon } from './icons/UndoIcon';
import { RedoIcon } from './icons/RedoIcon';
import { ExportIcon } from './icons/ExportIcon';
import { File } from '../services/geminiService';
import { FileCodeIcon } from './icons/FileCodeIcon';

interface CodeDisplayProps {
    files: File[];
    onFilesChange: (newFiles: File[]) => void;
    onUndo: () => void;
    onRedo: () => void;
    canUndo: boolean;
    canRedo: boolean;
}

export const CodeDisplay: React.FC<CodeDisplayProps> = ({ files, onFilesChange, onUndo, onRedo, canUndo, canRedo }) => {
    const [localFiles, setLocalFiles] = useState<File[]>(files);
    const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
    const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
    const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving'>('saved');

    useEffect(() => {
        setLocalFiles(files);
        // If the active file is no longer in the list, reset it.
        if (activeFilePath && !files.some(f => f.path === activeFilePath)) {
            setActiveFilePath(files.length > 0 ? files[0].path : null);
        } else if (!activeFilePath && files.length > 0) {
            // Set initial active file
            setActiveFilePath(files.find(f => f.path === 'index.html')?.path || files[0].path);
        }
    }, [files]);
    
    useEffect(() => {
        // Deep compare files to check for changes. If they're the same, we're saved.
        if (JSON.stringify(localFiles) === JSON.stringify(files)) {
            if (saveStatus !== 'saved') {
                 setSaveStatus('saved');
            }
            return;
        }

        // If there are differences, mark as unsaved and start the save timer.
        setSaveStatus('unsaved');
        const timer = setTimeout(() => {
            setSaveStatus('saving');
            onFilesChange(localFiles);
        }, 2000); // 2-second delay after last change

        // Clear the timer if the user types again before the delay is over.
        return () => clearTimeout(timer);
    }, [localFiles, files, onFilesChange]);


    const activeFile = localFiles.find(f => f.path === activeFilePath);

    const handleCodeChange = (newContent: string) => {
        if (!activeFilePath) return;
        setLocalFiles(currentFiles =>
            currentFiles.map(file =>
                file.path === activeFilePath ? { ...file, content: newContent } : file
            )
        );
    };

    const handleCopy = () => {
        if (!activeFile) return;
        navigator.clipboard.writeText(activeFile.content);
        setCopyStatus('copied');
        setTimeout(() => setCopyStatus('idle'), 2000);
    };

    const handleExport = async () => {
        if (!localFiles || localFiles.length === 0) return;
    
        const zip = new JSZip();
        localFiles.forEach(file => {
            zip.file(file.path, file.content);
        });
    
        try {
            const blob = await zip.generateAsync({ type: "blob" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = "webapp.zip";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
        } catch (error) {
            console.error("Failed to generate ZIP file:", error);
            alert("An error occurred while creating the ZIP file.");
        }
    };

    return (
        <div className="bg-zinc-900 flex flex-col flex-grow h-full">
            <div className="flex justify-between items-center p-2 px-4 bg-zinc-800 border-b border-zinc-700">
                <div className="flex items-center gap-3">
                     <span className="text-sm font-medium text-zinc-300">
                        {activeFilePath || 'No file selected'}
                    </span>
                    <span className="text-xs text-zinc-400 font-sans italic">
                        {saveStatus === 'unsaved' && 'Unsaved changes'}
                        {saveStatus === 'saving' && 'Saving...'}
                        {saveStatus === 'saved' && files.length > 0 && 'All changes saved'}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={onUndo} disabled={!canUndo} className="flex items-center gap-1.5 text-sm text-zinc-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed bg-zinc-700 hover:bg-zinc-600 px-3 py-1 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-800 focus:ring-white" aria-label="Undo change">
                        <UndoIcon aria-hidden="true" className="w-4 h-4" /> Undo
                    </button>
                    <button onClick={onRedo} disabled={!canRedo} className="flex items-center gap-1.5 text-sm text-zinc-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed bg-zinc-700 hover:bg-zinc-600 px-3 py-1 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-800 focus:ring-white" aria-label="Redo change">
                        <RedoIcon aria-hidden="true" className="w-4 h-4" /> Redo
                    </button>
                    <div aria-hidden="true" className="h-5 w-px bg-zinc-600"></div>
                    <button onClick={handleExport} disabled={!localFiles || localFiles.length === 0} className="flex items-center gap-1.5 text-sm text-zinc-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed bg-zinc-700 hover:bg-zinc-600 px-3 py-1 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-800 focus:ring-white" aria-label="Export code as ZIP file">
                        <ExportIcon aria-hidden="true" className="w-4 h-4" /> Export
                    </button>
                    <button onClick={handleCopy} className="flex items-center gap-1.5 text-sm text-zinc-300 hover:text-white bg-zinc-700 hover:bg-zinc-600 px-3 py-1 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-800 focus:ring-white" aria-label="Copy code to clipboard">
                        {copyStatus === 'copied' ? <CheckIcon aria-hidden="true" className="w-4 h-4 text-green-400"/> : <ClipboardIcon aria-hidden="true" className="w-4 h-4" />}
                        {copyStatus === 'copied' ? 'Copied!' : 'Copy'}
                    </button>
                </div>
            </div>
            <div className="flex flex-grow overflow-hidden">
                <div className="w-48 bg-zinc-800 border-r border-zinc-700 p-2 overflow-y-auto">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider px-2 mb-2">Explorer</h3>
                    <ul className="flex flex-col gap-1">
                        {localFiles.map(file => (
                            <li key={file.path}>
                                <button
                                    onClick={() => setActiveFilePath(file.path)}
                                    className={`w-full flex items-center gap-2 text-left text-sm p-2 rounded-md transition-colors ${
                                        activeFilePath === file.path
                                            ? 'bg-zinc-700 text-white'
                                            : 'text-zinc-300 hover:bg-zinc-700/50 hover:text-white'
                                    }`}
                                >
                                    <FileCodeIcon className="w-4 h-4 flex-shrink-0" />
                                    <span className="truncate">{file.path}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="flex-grow relative">
                    {activeFile ? (
                        <textarea
                            value={activeFile.content}
                            onChange={(e) => handleCodeChange(e.target.value)}
                            className="w-full h-full p-4 bg-transparent text-zinc-200 font-mono text-sm resize-none focus:outline-none"
                            style={{ scrollbarWidth: 'thin' }}
                            aria-label={`Code for ${activeFile.path}`}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-zinc-500">
                            Select a file to view its content
                        </div>
                    )}
                </div>
            </div>
             <div className="sr-only" role="status" aria-live="polite">
                {copyStatus === 'copied' && `Content of ${activeFilePath} copied to clipboard`}
            </div>
        </div>
    );
};