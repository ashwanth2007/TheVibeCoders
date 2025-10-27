import React, { useState, useEffect, useRef, useMemo } from 'react';
import JSZip from 'jszip';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { CheckIcon } from './icons/CheckIcon';
import { UndoIcon } from './icons/UndoIcon';
import { RedoIcon } from './icons/RedoIcon';
import { ExportIcon } from './icons/ExportIcon';
import { File } from '../services/geminiService';
import { FileCodeIcon } from './icons/FileCodeIcon';
import { SyntaxHighlighter } from './SyntaxHighlighter';

interface CodeDisplayProps {
    files: File[];
    onFilesChange: (newFiles: File[]) => void;
    onUndo: () => void;
    onRedo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    aiTargetFiles?: File[];
    onAnimationStart?: (path: string, index: number, total: number) => void;
    onAnimationComplete?: () => void;
}

export const CodeDisplay: React.FC<CodeDisplayProps> = ({ 
    files, 
    onFilesChange, 
    onUndo, 
    onRedo, 
    canUndo, 
    canRedo,
    aiTargetFiles,
    onAnimationStart,
    onAnimationComplete 
}) => {
    const [localFiles, setLocalFiles] = useState<File[]>(files);
    const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
    const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
    const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving'>('saved');
    const animationFrameRef = useRef<number>();

    const lineNumbersRef = useRef<HTMLDivElement>(null);
    const preRef = useRef<HTMLPreElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);


    useEffect(() => {
        setLocalFiles(files);
        if (activeFilePath && !files.some(f => f.path === activeFilePath)) {
            setActiveFilePath(files.length > 0 ? files[0].path : null);
        } else if (!activeFilePath && files.length > 0) {
            setActiveFilePath(files.find(f => f.path === 'index.html')?.path || files[0].path);
        }
    }, [files]);
    
    useEffect(() => {
        if (aiTargetFiles) {
            return;
        }
        
        if (JSON.stringify(localFiles) === JSON.stringify(files)) {
            if (saveStatus !== 'saved') {
                 setSaveStatus('saved');
            }
            return;
        }

        setSaveStatus('unsaved');
        const timer = setTimeout(() => {
            setSaveStatus('saving');
            onFilesChange(localFiles);
        }, 2000);

        return () => clearTimeout(timer);
    }, [localFiles, files, onFilesChange, aiTargetFiles]);

    const typeContent = (path: string, to: string) => {
        return new Promise<void>(resolve => {
            let currentIndex = 0;
            const startTimestamp = performance.now();
    
            const type = (timestamp: number) => {
                const elapsed = timestamp - startTimestamp;
                const progress = Math.min(elapsed / (500 + to.length * 2), 1);
    
                const targetIndex = Math.floor(to.length * progress);
    
                if (currentIndex < targetIndex) {
                    currentIndex = targetIndex;
                    const partialContent = to.substring(0, currentIndex);
    
                    setLocalFiles(prevFiles => {
                        const fileExists = prevFiles.some(f => f.path === path);
                        if (fileExists) {
                            return prevFiles.map(f => f.path === path ? { ...f, content: partialContent } : f);
                        } else {
                            return [...prevFiles, { path, content: partialContent }];
                        }
                    });
                }
    
                if (progress < 1) {
                    animationFrameRef.current = requestAnimationFrame(type);
                } else {
                    setLocalFiles(prevFiles => {
                        const fileExists = prevFiles.some(f => f.path === path);
                        if (fileExists) {
                            return prevFiles.map(f => f.path === path ? { ...f, content: to } : f);
                        } else {
                            return [...prevFiles, { path, content: to }];
                        }
                    });
                    setTimeout(resolve, 250);
                }
            };
    
            animationFrameRef.current = requestAnimationFrame(type);
        });
    };

    useEffect(() => {
        if (aiTargetFiles && onAnimationComplete && onAnimationStart) {
            const animate = async () => {
                for (let i = 0; i < aiTargetFiles.length; i++) {
                    const newFile = aiTargetFiles[i];
                    onAnimationStart(newFile.path, i, aiTargetFiles.length);
                    setActiveFilePath(newFile.path);
                    await typeContent(newFile.path, newFile.content);
                }
                onAnimationComplete();
            };
            animate();
        }
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [aiTargetFiles, onAnimationComplete, onAnimationStart]);

    const activeFile = localFiles.find(f => f.path === activeFilePath);

    const handleCodeChange = (newContent: string) => {
        if (!activeFilePath || aiTargetFiles) return;
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

    const handleScroll = () => {
        if (textareaRef.current && preRef.current && lineNumbersRef.current) {
            const { scrollTop, scrollLeft } = textareaRef.current;
            preRef.current.scrollTop = scrollTop;
            preRef.current.scrollLeft = scrollLeft;
            lineNumbersRef.current.scrollTop = scrollTop;
        }
    };

    const lineCount = useMemo(() => (activeFile?.content.match(/\n/g) || []).length + 1, [activeFile?.content]);
    const fileExtension = useMemo(() => activeFilePath?.split('.').pop() || '', [activeFilePath]);
    
    const isAiEditing = !!aiTargetFiles;

    return (
        <div className="bg-zinc-900 flex flex-col flex-grow h-full">
            <div className="flex justify-between items-center p-2 px-4 bg-zinc-800 border-b border-zinc-700">
                <div className="flex items-center gap-3">
                     <span className="text-sm font-medium text-zinc-300">
                        {activeFilePath || 'No file selected'}
                    </span>
                    <span className="text-xs text-zinc-400 font-sans italic">
                        {!isAiEditing && saveStatus === 'unsaved' && 'Unsaved changes'}
                        {!isAiEditing && saveStatus === 'saving' && 'Saving...'}
                        {!isAiEditing && saveStatus === 'saved' && files.length > 0 && 'All changes saved'}
                        {isAiEditing && 'AI is editing...'}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={onUndo} disabled={!canUndo || isAiEditing} className="flex items-center gap-1.5 text-sm text-zinc-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed bg-zinc-700 hover:bg-zinc-600 px-3 py-1 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-800 focus:ring-white" aria-label="Undo change">
                        <UndoIcon aria-hidden="true" className="w-4 h-4" /> Undo
                    </button>
                    <button onClick={onRedo} disabled={!canRedo || isAiEditing} className="flex items-center gap-1.5 text-sm text-zinc-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed bg-zinc-700 hover:bg-zinc-600 px-3 py-1 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-800 focus:ring-white" aria-label="Redo change">
                        <RedoIcon aria-hidden="true" className="w-4 h-4" /> Redo
                    </button>
                    <div aria-hidden="true" className="h-5 w-px bg-zinc-600"></div>
                    <button onClick={handleExport} disabled={!localFiles || localFiles.length === 0 || isAiEditing} className="flex items-center gap-1.5 text-sm text-zinc-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed bg-zinc-700 hover:bg-zinc-600 px-3 py-1 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-800 focus:ring-white" aria-label="Export code as ZIP file">
                        <ExportIcon aria-hidden="true" className="w-4 h-4" /> Export
                    </button>
                    <button onClick={handleCopy} disabled={isAiEditing} className="flex items-center gap-1.5 text-sm text-zinc-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed bg-zinc-700 hover:bg-zinc-600 px-3 py-1 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-800 focus:ring-white" aria-label="Copy code to clipboard">
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
                                    onClick={() => !isAiEditing && setActiveFilePath(file.path)}
                                    className={`w-full flex items-center gap-2 text-left text-sm p-2 rounded-md transition-colors ${
                                        activeFilePath === file.path
                                            ? 'bg-zinc-700 text-white'
                                            : 'text-zinc-300 hover:bg-zinc-700/50 hover:text-white'
                                    } ${isAiEditing ? 'cursor-not-allowed' : ''}`}
                                    disabled={isAiEditing}
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
                        <div className="code-editor-wrapper">
                            <div ref={lineNumbersRef} className="line-numbers">
                                {Array.from({ length: lineCount }, (_, i) => (
                                    <span key={i}>{i + 1}</span>
                                ))}
                            </div>
                            <div className="code-editor-main">
                                <pre ref={preRef} aria-hidden="true">
                                    <SyntaxHighlighter
                                        code={activeFile.content + '\n'} /* Add newline to ensure last line is rendered correctly */
                                        language={fileExtension}
                                    />
                                </pre>
                                <textarea
                                    ref={textareaRef}
                                    value={activeFile.content}
                                    onChange={(e) => handleCodeChange(e.target.value)}
                                    onScroll={handleScroll}
                                    readOnly={isAiEditing}
                                    aria-label={`Code for ${activeFile.path}`}
                                    spellCheck="false"
                                    autoCapitalize="off"
                                    autoComplete="off"
                                    autoCorrect="off"
                                />
                            </div>
                        </div>
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