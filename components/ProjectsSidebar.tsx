import React, { useState, useRef, useEffect } from 'react';
import { Project } from '../App';
import { PlusIcon } from './icons/PlusIcon';
import { PencilIcon } from './icons/PencilIcon';
import { TrashIcon } from './icons/TrashIcon';
import { CopyIcon } from './icons/CopyIcon';
import { MoreVerticalIcon } from './icons/MoreVerticalIcon';

interface ProjectsSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    projects: Project[];
    activeProjectId: string | null;
    onSelectProject: (id: string) => void;
    onCreateNew: () => void;
    onRenameProject: (id: string, newName: string) => void;
    onSetProjectToDelete: (project: Project | null) => void;
    onCloneProject: (id: string) => void;
    onMouseLeave?: () => void;
}

export const ProjectsSidebar: React.FC<ProjectsSidebarProps> = ({ isOpen, onClose, projects, activeProjectId, onSelectProject, onCreateNew, onRenameProject, onSetProjectToDelete, onCloneProject, onMouseLeave }) => {
    const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editingProjectId && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [editingProjectId]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpenMenuId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleRenameStart = (project: Project) => {
        setEditingProjectId(project.id);
        setEditingName(project.name);
    };

    const handleRenameCancel = () => {
        setEditingProjectId(null);
        setEditingName('');
    };

    const handleRenameSubmit = () => {
        if (!editingProjectId || !editingName.trim()) {
            handleRenameCancel();
            return;
        }
        const project = projects.find(p => p.id === editingProjectId);
        if (project && project.name !== editingName.trim()) {
            onRenameProject(editingProjectId, editingName.trim());
        }
        handleRenameCancel();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleRenameSubmit();
        } else if (e.key === 'Escape') {
            handleRenameCancel();
        }
    };
    
    const handleMenuToggle = (e: React.MouseEvent, projectId: string) => {
        e.stopPropagation(); // Prevent project selection when clicking the menu
        setOpenMenuId(prevId => (prevId === projectId ? null : projectId));
    };

    return (
        <>
            {/* Backdrop for mobile view */}
            <div 
                className={`fixed inset-0 bg-black/60 z-20 transition-opacity lg:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
                aria-hidden="true"
            />
            <aside 
                onMouseLeave={onMouseLeave}
                className={`
                    flex-shrink-0 flex flex-col bg-white dark:bg-zinc-800
                    transition-all duration-300 ease-in-out
                    
                    /* Mobile: Fixed slide-over */
                    fixed top-0 left-0 h-full z-30
                    transform ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                    
                    /* Desktop: Part of the flex flow, collapsible */
                    lg:relative lg:transform-none lg:h-auto 
                    lg:border-r lg:border-gray-200 dark:lg:border-zinc-700
                    ${isOpen ? 'w-72' : 'w-0 border-r-0 overflow-hidden'}
                `}
                aria-label="Projects"
            >
                {/* Fixed-width inner container for smooth collapse animation */}
                <div className="w-72 h-full flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-gray-200 dark:border-zinc-700">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-zinc-100">Projects</h2>
                    </div>
                    <div className="flex-grow p-2 flex flex-col gap-1 overflow-y-auto">
                        {projects.map(project => (
                             <div 
                                key={project.id}
                                className={`w-full rounded-md text-sm transition-colors ${
                                    project.id === activeProjectId ? 'bg-gray-200 dark:bg-zinc-700' : ''
                                }`}
                            >
                                {editingProjectId === project.id ? (
                                    <div className="p-2">
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            value={editingName}
                                            onChange={(e) => setEditingName(e.target.value)}
                                            onBlur={handleRenameSubmit}
                                            onKeyDown={handleKeyDown}
                                            className="w-full text-sm font-medium p-1 border border-gray-400 dark:border-zinc-500 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-zinc-100 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100"
                                            aria-label="New project name"
                                        />
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between">
                                        <button
                                            onClick={() => onSelectProject(project.id)}
                                            className={`flex-grow min-w-0 text-left px-3 py-2 rounded-l-md ${project.id !== activeProjectId ? 'hover:bg-gray-100 dark:hover:bg-zinc-700/50' : ''}`}
                                        >
                                            <span className="font-medium text-gray-900 dark:text-zinc-100 block truncate">{project.name}</span>
                                            <p className="text-xs text-gray-600 dark:text-zinc-400 block truncate mt-0.5">{project.initialPrompt}</p>
                                        </button>
                                        
                                        <div className="relative flex-shrink-0 pr-1">
                                            <button
                                                onClick={(e) => handleMenuToggle(e, project.id)}
                                                className={`p-1.5 text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 rounded-md ${project.id !== activeProjectId ? 'hover:bg-gray-100 dark:hover:bg-zinc-700/50' : ''}`}
                                                aria-label={`Options for project ${project.name}`}
                                                aria-haspopup="true"
                                                aria-expanded={openMenuId === project.id}
                                            >
                                                <MoreVerticalIcon className="w-4 h-4" />
                                            </button>

                                            {openMenuId === project.id && (
                                                <div 
                                                    ref={menuRef}
                                                    className="absolute right-0 mt-2 w-48 origin-top-right bg-white dark:bg-zinc-900 rounded-md shadow-lg ring-1 ring-black dark:ring-white ring-opacity-5 dark:ring-opacity-10 focus:outline-none z-10 animate-fade-in py-1"
                                                    role="menu"
                                                    aria-orientation="vertical"
                                                >
                                                    <button
                                                        onClick={() => {
                                                            handleRenameStart(project);
                                                            setOpenMenuId(null);
                                                        }}
                                                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-left text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800"
                                                        role="menuitem"
                                                    >
                                                        <PencilIcon className="w-4 h-4" />
                                                        <span>Rename</span>
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            onCloneProject(project.id);
                                                            setOpenMenuId(null);
                                                        }}
                                                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-left text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800"
                                                        role="menuitem"
                                                    >
                                                        <CopyIcon className="w-4 h-4" />
                                                        <span>Clone</span>
                                                    </button>
                                                    <div className="my-1 h-px bg-gray-100 dark:bg-zinc-700" />
                                                    <button
                                                        onClick={() => {
                                                            onSetProjectToDelete(project);
                                                            setOpenMenuId(null);
                                                        }}
                                                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                        role="menuitem"
                                                    >
                                                        <TrashIcon className="w-4 h-4" />
                                                        <span>Delete</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="p-2 border-t border-gray-200 dark:border-zinc-700">
                        <button
                            onClick={onCreateNew}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-gray-700 dark:hover:bg-zinc-300 transition-colors"
                        >
                            <PlusIcon className="w-5 h-5" />
                            Create New App
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
};