import React, { useState, useRef, useEffect } from 'react';
import { MenuIcon } from './icons/MenuIcon';
import { MoreVerticalIcon } from './icons/MoreVerticalIcon';
import { PencilIcon } from './icons/PencilIcon';
import { CopyIcon } from './icons/CopyIcon';
import { TrashIcon } from './icons/TrashIcon';

interface HeaderProps {
    projectName: string;
    onToggleSidebar: () => void;
    activeProjectId: string;
    onRenameProject: (id: string, newName: string) => void;
    onCloneProject: (id:string) => void;
    onSetProjectToDelete: () => void;
}

export const Header: React.FC<HeaderProps> = ({ projectName, onToggleSidebar, activeProjectId, onRenameProject, onCloneProject, onSetProjectToDelete }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isRenaming, setIsRenaming] = useState(false);
    const [editingName, setEditingName] = useState(projectName);
    const menuRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // When switching projects, if renaming was active, cancel it and update the name
    useEffect(() => {
        setIsRenaming(false);
        setEditingName(projectName);
    }, [projectName]);

    useEffect(() => {
        if (isRenaming && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isRenaming]);

    const handleRenameStart = () => {
        setIsMenuOpen(false);
        setIsRenaming(true);
    };

    const handleRenameSubmit = () => {
        if (isRenaming && activeProjectId) {
            if (editingName.trim() && editingName.trim() !== projectName) {
                onRenameProject(activeProjectId, editingName.trim());
            }
            setIsRenaming(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleRenameSubmit();
        } else if (e.key === 'Escape') {
            setIsRenaming(false);
            setEditingName(projectName); // Reset on escape
        }
    };

    const handleClone = () => {
        setIsMenuOpen(false);
        if (activeProjectId) {
            onCloneProject(activeProjectId);
        }
    };

    const handleDelete = () => {
        setIsMenuOpen(false);
        onSetProjectToDelete();
    };


    return (
        <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-zinc-700 sticky top-0 bg-gray-100/80 dark:bg-zinc-900/80 backdrop-blur-md z-10">
            {/* Left element */}
            <div className="flex-1 flex justify-start">
                <button
                    onClick={onToggleSidebar}
                    className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-zinc-100"
                    aria-label="Toggle projects sidebar"
                >
                    <MenuIcon className="w-5 h-5" />
                </button>
            </div>

            {/* Center element */}
            <div className="flex-shrink-0">
                {isRenaming ? (
                    <input
                        ref={inputRef}
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={handleRenameSubmit}
                        onKeyDown={handleKeyDown}
                        className="font-semibold text-lg text-gray-800 bg-white dark:bg-zinc-800 dark:text-zinc-200 border border-gray-300 dark:border-zinc-600 rounded-md px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-zinc-100"
                        aria-label="Project name"
                    />
                ) : (
                    <span className="font-semibold text-lg text-gray-800 dark:text-zinc-200">{projectName}</span>
                )}
            </div>
            
            {/* Right element */}
            <div className="flex-1 flex justify-end">
                <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setIsMenuOpen(prev => !prev)}
                        className="p-1.5 text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 rounded-md hover:bg-gray-200 dark:hover:bg-zinc-700"
                        aria-label={`Options for project ${projectName}`}
                        aria-haspopup="true"
                        aria-expanded={isMenuOpen}
                    >
                        <MoreVerticalIcon className="w-5 h-5" />
                    </button>

                    {isMenuOpen && (
                        <div 
                            className="absolute right-0 top-full mt-2 w-48 origin-top-right bg-white dark:bg-zinc-800 rounded-md shadow-lg ring-1 ring-black dark:ring-white ring-opacity-5 dark:ring-opacity-10 focus:outline-none z-20 animate-fade-in py-1"
                            role="menu"
                            aria-orientation="vertical"
                        >
                            <button
                                onClick={handleRenameStart}
                                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-left text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700"
                                role="menuitem"
                            >
                                <PencilIcon className="w-4 h-4" />
                                <span>Rename</span>
                            </button>
                            <button
                                onClick={handleClone}
                                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-left text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700"
                                role="menuitem"
                            >
                                <CopyIcon className="w-4 h-4" />
                                <span>Clone</span>
                            </button>
                            <div className="my-1 h-px bg-gray-100 dark:bg-zinc-700" />
                            <button
                                onClick={handleDelete}
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
        </header>
    );
};