
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import JSZip from 'jszip';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { CheckIcon } from './icons/CheckIcon';
import { UndoIcon } from './icons/UndoIcon';
import { RedoIcon } from './icons/RedoIcon';
import { ExportIcon } from './icons/ExportIcon';
import { File } from '../services/geminiService';
import { FileCodeIcon } from './icons/FileCodeIcon';
import { Editor } from './Editor';
import { PlusIcon } from './icons/PlusIcon';
import { SaveIcon } from './icons/SaveIcon';
import { FolderIcon } from './icons/FolderIcon';
import { FolderOpenIcon } from './icons/FolderOpenIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { MoreVerticalIcon } from './icons/MoreVerticalIcon';
import { PencilIcon } from './icons/PencilIcon';
import { TrashIcon } from './icons/TrashIcon';
import { XIcon } from './icons/XIcon';
import { SearchIcon } from './icons/SearchIcon';

// --- TYPES ---
interface CodeDisplayProps {
    files: File[];
    onFilesChange: (newFiles: File[]) => void;
    onUndo: () => void;
    onRedo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    aiTargetFiles?: File[];
    onAnimationStart?: (path: string, index: number, total: number) => void;
    // FIX: Updated the onAnimationComplete prop to expect the animated files as an argument.
    onAnimationComplete?: (files: File[]) => void;
}

type TreeNode = {
    name: string;
    path: string;
    type: 'file' | 'folder';
    children?: TreeNode[];
};

// --- UTILITY FUNCTIONS ---
const getLanguageFromPath = (path: string): string => {
    const extension = path.split('.').pop()?.toLowerCase() || '';
    switch (extension) {
        case 'js': case 'jsx': return 'javascript';
        case 'ts': case 'tsx': return 'typescript';
        case 'css': return 'css';
        case 'html': return 'html';
        case 'json': return 'json';
        case 'md': return 'markdown';
        default: return 'plaintext';
    }
};

const buildFileTree = (files: File[]): TreeNode[] => {
    const root: { [key: string]: TreeNode } = {};

    files.forEach(file => {
        const parts = file.path.split('/');
        let currentLevel = root;

        parts.forEach((part, index) => {
            if (!currentLevel[part]) {
                const isFile = index === parts.length - 1;
                const path = parts.slice(0, index + 1).join('/');
                currentLevel[part] = {
                    name: part,
                    path: path,
                    type: isFile ? 'file' : 'folder',
                    ...(isFile ? {} : { children: [] })
                };
                if (!isFile) {
                    (currentLevel[part] as any)._childrenDict = {};
                }
            }
            if (index < parts.length - 1) {
                currentLevel = (currentLevel[part] as any)._childrenDict;
            }
        });
    });

    const unflatten = (node: any): TreeNode => {
        if (node._childrenDict) {
            node.children = Object.values(node._childrenDict).map(unflatten).sort((a: any, b: any) => {
                if (a.type === b.type) return a.name.localeCompare(b.name);
                return a.type === 'folder' ? -1 : 1;
            });
            delete node._childrenDict;
        }
        return node;
    };

    return Object.values(root).map(unflatten).sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === 'folder' ? -1 : 1;
    });
};

// --- MAIN COMPONENT ---
export const CodeDisplay: React.FC<CodeDisplayProps> = (props) => {
    const { files, onFilesChange, onUndo, onRedo, canUndo, canRedo, aiTargetFiles, onAnimationStart, onAnimationComplete } = props;

    const [openFilePaths, setOpenFilePaths] = useState<string[]>([]);
    const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
    const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving'>('saved');
    
    const editorContentRef = useRef<{ [path: string]: string }>({});
    const animationFrameRef = useRef<number>();
    
    // --- State Syncing ---
    useEffect(() => {
        const fileMap = new Map(files.map(f => [f.path, f.content]));
        editorContentRef.current = Object.fromEntries(fileMap);
        
        // If active file was deleted, close it
        if (activeFilePath && !fileMap.has(activeFilePath)) {
            handleCloseTab(activeFilePath, true);
        }
        // If open tabs were deleted, close them
        setOpenFilePaths(prev => prev.filter(path => fileMap.has(path)));
        
    }, [files]);
    
    useEffect(() => {
        // Automatically open index.html if no tabs are open
        if (files.length > 0 && openFilePaths.length === 0) {
            const indexPath = files.find(f => f.path === 'index.html')?.path;
            if(indexPath) {
                setOpenFilePaths([indexPath]);
                setActiveFilePath(indexPath);
            } else if (files[0]) {
                setOpenFilePaths([files[0].path]);
                setActiveFilePath(files[0].path);
            }
        }
    }, [files, openFilePaths]);
    
    // Auto-save logic
    useEffect(() => {
        if (saveStatus === 'unsaved') {
            const timer = setTimeout(() => {
                handleManualSave();
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [saveStatus]);

    // --- File & Tab Operations ---
    const handleFileOpen = useCallback((path: string) => {
        if (!openFilePaths.includes(path)) {
            setOpenFilePaths(prev => [...prev, path]);
        }
        setActiveFilePath(path);
    }, [openFilePaths]);
    
    const handleCloseTab = useCallback((path: string, isDeletion = false) => {
        const updatedOpenPaths = openFilePaths.filter(p => p !== path);
        setOpenFilePaths(updatedOpenPaths);

        if (activeFilePath === path) {
            const closingIndex = openFilePaths.indexOf(path);
            if (updatedOpenPaths.length > 0) {
                const newIndex = Math.max(0, closingIndex - 1);
                setActiveFilePath(updatedOpenPaths[newIndex]);
            } else {
                setActiveFilePath(null);
            }
        }
        if (!isDeletion) {
             // If a tab with unsaved changes is closed, trigger a save
            if(editorContentRef.current[path] !== files.find(f => f.path === path)?.content) {
                handleManualSave();
            }
        }
    }, [activeFilePath, openFilePaths, files]);
    
    const handleCodeChange = (newContent: string) => {
        if (!activeFilePath || aiTargetFiles) return;
        if (editorContentRef.current[activeFilePath] !== newContent) {
            editorContentRef.current[activeFilePath] = newContent;
            setSaveStatus('unsaved');
        }
    };
    
    const handleManualSave = () => {
        if (aiTargetFiles) return;
        setSaveStatus('saving');
        const updatedFiles = files.map(file => ({
            ...file,
            content: editorContentRef.current[file.path] ?? file.content,
        }));
        onFilesChange(updatedFiles);
        // Defer setting to saved to allow parent state to update
        setTimeout(() => setSaveStatus('saved'), 500);
    };

    // --- AI Animation Logic ---
    useEffect(() => {
        if (aiTargetFiles && onAnimationComplete && onAnimationStart) {
            const typeContent = (path: string, to: string): Promise<void> => {
                return new Promise(resolve => {
                    let currentContent = "";
                    const charsPerFrame = Math.max(1, Math.floor(to.length / 200));
                    const type = () => {
                        if (currentContent.length < to.length) {
                            currentContent = to.substring(0, currentContent.length + charsPerFrame);
                            editorContentRef.current[path] = currentContent;
                            // Force a re-render by creating a new object for the active file's content
                            setActiveFileContent(currentContent);
                            animationFrameRef.current = requestAnimationFrame(type);
                        } else {
                            editorContentRef.current[path] = to;
                            setActiveFileContent(to);
                            setTimeout(resolve, 50);
                        }
                    };
                    animationFrameRef.current = requestAnimationFrame(type);
                });
            };

            const animate = async () => {
                const newPaths = aiTargetFiles.map(f => f.path);
                setOpenFilePaths(prev => [...new Set([...prev, ...newPaths])]);
                
                for (let i = 0; i < aiTargetFiles.length; i++) {
                    const newFile = aiTargetFiles[i];
                    onAnimationStart(newFile.path, i + 1, aiTargetFiles.length);
                    setActiveFilePath(newFile.path);
                    await typeContent(newFile.path, newFile.content);
                }
                // FIX: Passed the `aiTargetFiles` array to `onAnimationComplete` to satisfy its expected signature.
                onAnimationComplete(aiTargetFiles);
            };
            animate();
        }
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [aiTargetFiles, onAnimationComplete, onAnimationStart]);

    // This local state is needed to force re-render during AI animation
    const [activeFileContent, setActiveFileContent] = useState('');
    useEffect(() => {
        setActiveFileContent(editorContentRef.current[activeFilePath ?? ''] ?? '');
    }, [activeFilePath]);
    
    const activeFile = useMemo(() => files.find(f => f.path === activeFilePath), [files, activeFilePath]);
    const isAiEditing = !!aiTargetFiles;
    const language = useMemo(() => activeFilePath ? getLanguageFromPath(activeFilePath) : 'plaintext', [activeFilePath]);

    return (
        <div className="bg-zinc-900 flex flex-grow h-full overflow-hidden">
            <FileExplorer files={files} onFileOpen={handleFileOpen} onFilesChange={onFilesChange} isAiEditing={isAiEditing} />
            <div className="flex flex-col flex-grow min-w-0">
                {/* Tab Bar */}
                <div className="flex-shrink-0 bg-zinc-800 flex items-end">
                    <div className="flex-grow flex items-center overflow-x-auto">
                        {openFilePaths.map(path => (
                            <div
                                key={path}
                                onClick={() => !isAiEditing && setActiveFilePath(path)}
                                className={`flex items-center gap-2 pl-3 pr-2 py-2 border-r border-t-2 text-sm cursor-pointer whitespace-nowrap ${
                                    activeFilePath === path
                                        ? 'bg-zinc-900 text-white border-t-zinc-100'
                                        : 'bg-zinc-700 text-zinc-400 border-t-transparent hover:bg-zinc-900 hover:text-white'
                                }`}
                            >
                                <FileCodeIcon className="w-4 h-4 flex-shrink-0" />
                                <span>{path.split('/').pop()}</span>
                                <button
                                    onClick={(e) => { e.stopPropagation(); !isAiEditing && handleCloseTab(path); }}
                                    className="p-1 rounded-full hover:bg-zinc-600"
                                    aria-label={`Close ${path}`}
                                    disabled={isAiEditing}
                                >
                                    <XIcon className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex-grow relative">
                    {activeFile ? (
                        <Editor
                            key={activeFilePath}
                            value={activeFileContent}
                            language={language}
                            onChange={handleCodeChange}
                            readOnly={isAiEditing}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-zinc-500">
                           {files.length > 0 ? 'Select a file to view its content' : 'Create a file to start'}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


// --- FILE EXPLORER SUB-COMPONENT ---
const FileExplorer: React.FC<{
    files: File[];
    onFileOpen: (path: string) => void;
    onFilesChange: (newFiles: File[]) => void;
    isAiEditing: boolean;
}> = ({ files, onFileOpen, onFilesChange, isAiEditing }) => {
    const [tree, setTree] = useState<TreeNode[]>([]);
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [contextMenu, setContextMenu] = useState<{ path: string; x: number; y: number } | null>(null);
    const [editingPath, setEditingPath] = useState<string | null>(null);
    const [creating, setCreating] = useState<{ type: 'file' | 'folder', parentPath: string } | null>(null);
    const [inputValue, setInputValue] = useState('');
    const contextMenuRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const newTree = buildFileTree(files);
        setTree(newTree);
        // Auto-expand root folders if there's only one
        if (newTree.length === 1 && newTree[0].type === 'folder' && expandedFolders.size === 0) {
            setExpandedFolders(new Set([newTree[0].path]));
        }
    }, [files]);
    
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
                setContextMenu(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (editingPath || creating) inputRef.current?.focus();
    }, [editingPath, creating]);

    const handleToggleFolder = (path: string) => {
        setExpandedFolders(prev => {
            const newSet = new Set(prev);
            if (newSet.has(path)) newSet.delete(path);
            else newSet.add(path);
            return newSet;
        });
    };

    const handleContextMenu = (e: React.MouseEvent, path: string) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ path, x: e.clientX, y: e.clientY });
    };

    const closeAllMenus = () => {
        setContextMenu(null);
        setEditingPath(null);
        setCreating(null);
        setInputValue('');
    };

    const handleCreate = (type: 'file' | 'folder', parentPath = '') => {
        closeAllMenus();
        setCreating({ type, parentPath });
        if(parentPath) {
             setExpandedFolders(prev => new Set(prev).add(parentPath));
        }
    };
    
    const handleRename = () => {
        if (!contextMenu) return;
        setEditingPath(contextMenu.path);
        setInputValue(contextMenu.path.split('/').pop() || '');
        setContextMenu(null);
    };

    const handleDelete = () => {
        if (!contextMenu) return;
        const { path } = contextMenu;
        if (window.confirm(`Are you sure you want to delete "${path}"? This cannot be undone.`)) {
            const isFolder = files.some(f => f.path.startsWith(`${path}/`));
            const newFiles = isFolder
                ? files.filter(f => !f.path.startsWith(`${path}/`) && f.path !== path)
                : files.filter(f => f.path !== path);
            onFilesChange(newFiles);
        }
        closeAllMenus();
    };
    
    const handleSubmitInput = () => {
        if (!inputValue.trim() || inputValue.includes('/')) {
            closeAllMenus();
            return;
        }

        if (editingPath) {
            const oldPath = editingPath;
            const newPath = [...oldPath.split('/').slice(0, -1), inputValue.trim()].join('/');
            if (oldPath === newPath) { closeAllMenus(); return; }
            if (files.some(f => f.path === newPath)) { alert('A file with this name already exists.'); return; }
            
            const isFolder = files.some(f => f.path.startsWith(`${oldPath}/`));
            const newFiles = files.map(f => {
                if (isFolder && f.path.startsWith(`${oldPath}/`)) {
                    return { ...f, path: f.path.replace(oldPath, newPath) };
                }
                if (f.path === oldPath) {
                    return { ...f, path: newPath };
                }
                return f;
            });
            onFilesChange(newFiles);

        } else if (creating) {
            const basePath = creating.parentPath ? `${creating.parentPath}/` : '';
            const newPath = `${basePath}${inputValue.trim()}`;
            if (files.some(f => f.path === newPath)) { alert('A file or folder with this name already exists.'); return; }
            
            const newFiles = [...files];
            if (creating.type === 'file') {
                newFiles.push({ path: newPath, content: '' });
            } else { // folder
                newFiles.push({ path: `${newPath}/.gitkeep`, content: '' });
            }
            onFilesChange(newFiles);
        }
        closeAllMenus();
    };

    const renderTree = (nodes: TreeNode[], depth = 0): React.ReactNode => {
        const filteredNodes = nodes.filter(node => {
            if (!searchTerm) return true;
            if (node.name.toLowerCase().includes(searchTerm.toLowerCase())) return true;
            if (node.type === 'folder' && node.children) {
                return node.children.some(child => child.path.toLowerCase().includes(searchTerm.toLowerCase()));
            }
            return false;
        });

        return filteredNodes.map(node => (
            <div key={node.path}>
                <div
                    onClick={() => node.type === 'folder' ? handleToggleFolder(node.path) : onFileOpen(node.path)}
                    onContextMenu={(e) => handleContextMenu(e, node.path)}
                    className={`flex items-center pr-2 py-1 text-sm rounded-md cursor-pointer group hover:bg-zinc-700/50 ${
                        creating?.parentPath === node.path ? 'bg-zinc-700/50' : ''
                    }`}
                    style={{ paddingLeft: `${depth * 1 + 0.5}rem` }}
                >
                    {node.type === 'folder' ? (
                        <>
                            <ChevronDownIcon className={`w-4 h-4 mr-1 flex-shrink-0 transition-transform ${expandedFolders.has(node.path) ? 'rotate-0' : '-rotate-90'}`} />
                            {expandedFolders.has(node.path) ? <FolderOpenIcon className="w-4 h-4 mr-2 flex-shrink-0" /> : <FolderIcon className="w-4 h-4 mr-2 flex-shrink-0" />}
                        </>
                    ) : (
                        <FileCodeIcon className="w-4 h-4 mr-2 flex-shrink-0 ml-[20px]" />
                    )}
                    
                    {editingPath === node.path ? (
                        <input
                            ref={inputRef}
                            type="text" value={inputValue} onChange={e => setInputValue(e.target.value)}
                            onBlur={handleSubmitInput} onKeyDown={e => e.key === 'Enter' ? handleSubmitInput() : e.key === 'Escape' && closeAllMenus()}
                            className="w-full bg-zinc-900 text-white rounded p-0.5 -m-0.5"
                            onClick={e => e.stopPropagation()}
                        />
                    ) : <span className="truncate flex-grow">{node.name}</span>}
                    
                    <button onClick={(e) => handleContextMenu(e, node.path)} className="opacity-0 group-hover:opacity-100 ml-auto p-0.5 rounded hover:bg-zinc-600"><MoreVerticalIcon className="w-4 h-4" /></button>
                </div>
                {expandedFolders.has(node.path) && node.children && renderTree(node.children, depth + 1)}
                {creating && creating.parentPath === node.path && (
                    <div style={{ paddingLeft: `${(depth + 1) * 1 + 0.5}rem` }} className="py-1">
                        <input ref={inputRef} type="text" value={inputValue} onChange={e => setInputValue(e.target.value)}
                            onBlur={handleSubmitInput} onKeyDown={e => e.key === 'Enter' ? handleSubmitInput() : e.key === 'Escape' && closeAllMenus()}
                            className="w-full bg-zinc-900 text-white rounded p-0.5"
                            placeholder={creating.type === 'file' ? "New file..." : "New folder..."}
                            onClick={e => e.stopPropagation()} />
                    </div>
                )}
            </div>
        ));
    };

    return (
        <div className="w-64 bg-zinc-800 border-r border-zinc-700 flex flex-col flex-shrink-0 text-zinc-300">
            <div className="p-2 border-b border-zinc-700 flex items-center gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider flex-grow">Explorer</h3>
                <button onClick={() => handleCreate('file')} title="New File" className="p-1 rounded hover:bg-zinc-700"><PlusIcon className="w-4 h-4" /></button>
                <button onClick={() => handleCreate('folder')} title="New Folder" className="p-1 rounded hover:bg-zinc-700"><FolderIcon className="w-4 h-4" /></button>
            </div>
            <div className="p-2 border-b border-zinc-700">
                <div className="relative">
                    <SearchIcon className="w-4 h-4 absolute top-1/2 left-2 -translate-y-1/2 text-zinc-500"/>
                    <input type="text" placeholder="Search files..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded-md py-1 pl-7 pr-2 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-500" />
                </div>
            </div>
            <div className="flex-grow p-1 overflow-y-auto">
                {renderTree(tree)}
                {creating && creating.parentPath === '' && (
                    <div className="p-1">
                        <input ref={inputRef} type="text" value={inputValue} onChange={e => setInputValue(e.target.value)}
                            onBlur={handleSubmitInput} onKeyDown={e => e.key === 'Enter' ? handleSubmitInput() : e.key === 'Escape' && closeAllMenus()}
                            className="w-full bg-zinc-900 text-white rounded p-0.5"
                            placeholder={creating.type === 'file' ? "New file..." : "New folder..."}
                        />
                    </div>
                )}
            </div>

            {contextMenu && (
                <div ref={contextMenuRef} style={{ top: contextMenu.y, left: contextMenu.x }} className="fixed z-50 bg-zinc-900 rounded-md shadow-lg border border-zinc-700 py-1 w-40 animate-fade-in">
                    <button onClick={handleRename} className="w-full text-left px-3 py-1.5 text-sm hover:bg-zinc-700 flex items-center gap-2"><PencilIcon className="w-4 h-4"/> Rename</button>
                    <button onClick={handleDelete} className="w-full text-left px-3 py-1.5 text-sm hover:bg-zinc-700 flex items-center gap-2 text-red-400"><TrashIcon className="w-4 h-4"/> Delete</button>
                </div>
            )}
        </div>
    );
};
