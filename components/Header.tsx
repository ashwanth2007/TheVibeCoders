import React, { useState, useRef, useEffect } from 'react';
import { MenuIcon } from './icons/MenuIcon';
import { MoreVerticalIcon } from './icons/MoreVerticalIcon';
import { PencilIcon } from './icons/PencilIcon';
import { CopyIcon } from './icons/CopyIcon';
import { TrashIcon } from './icons/TrashIcon';
import { UserIcon } from './icons/UserIcon';
import { supabase } from '../services/supabaseClient';

interface HeaderProps {
    projectName: string;
    onToggleSidebar: () => void;
    activeProjectId: string | null;
    onRenameProject: (id: string, newName: string) => void;
    onCloneProject: (id: string) => void;
    onSetProjectToDelete?: () => void;
    userEmail?: string;
}

export const Header: React.FC<HeaderProps> = ({
    projectName,
    onToggleSidebar,
    activeProjectId,
    onRenameProject,
    onCloneProject,
    onSetProjectToDelete,
    userEmail
}) => {
    const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isRenaming, setIsRenaming] = useState(false);
    const [editingName, setEditingName] = useState(projectName);
    const projectMenuRef = useRef<HTMLDivElement>(null);
    const userMenuRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (projectMenuRef.current && !projectMenuRef.current.contains(event.target as Node)) {
                setIsProjectMenuOpen(false);
            }
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setIsUserMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        setIsRenaming(false);
        setEditingName(projectName);
    }, [projectName, activeProjectId]);

    useEffect(() => {
        if (isRenaming && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isRenaming]);

    const handleRenameStart = () => {
        setIsProjectMenuOpen(false);
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
            setEditingName(projectName);
        }
    };

    const handleClone = () => {
        setIsProjectMenuOpen(false);
        if (activeProjectId) {
            onCloneProject(activeProjectId);
        }
    };

    const handleDelete = () => {
        setIsProjectMenuOpen(false);
        onSetProjectToDelete?.();
    };
    
    const handleSignOut = async () => {
        await supabase.auth.signOut();
    };

    return (
        <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-zinc-700 sticky top-0 bg-gray-100/80 dark:bg-zinc-900/80 backdrop-blur-md z-30">
            <div className="flex-1 flex justify-start">
                <button
                    onClick={onToggleSidebar}
                    className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-zinc-100"
                    aria-label="Toggle projects sidebar"
                >
                    <MenuIcon className="w-5 h-5" />
                </button>
            </div>

            <div className="flex-shrink-0 flex items-center gap-2">
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
                
                {activeProjectId && (
                    <div className="relative" ref={projectMenuRef}>
                        <button
                            onClick={() => setIsProjectMenuOpen(prev => !prev)}
                            className="p-1.5 text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 rounded-md hover:bg-gray-200 dark:hover:bg-zinc-700"
                            aria-label={`Options for project ${projectName}`}
                            aria-haspopup="true"
                            aria-expanded={isProjectMenuOpen}
                        >
                            <MoreVerticalIcon className="w-5 h-5" />
                        </button>
                        {isProjectMenuOpen && (
                            <div
                                className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-48 origin-top bg-white dark:bg-zinc-800 rounded-md shadow-lg ring-1 ring-black dark:ring-white ring-opacity-5 dark:ring-opacity-10 focus:outline-none z-20 animate-fade-in py-1"
                                role="menu"
                                aria-orientation="vertical"
                            >
                                <button onClick={handleRenameStart} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-left text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700" role="menuitem">
                                    <PencilIcon className="w-4 h-4" />
                                    <span>Rename</span>
                                </button>
                                <button onClick={handleClone} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-left text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700" role="menuitem">
                                    <CopyIcon className="w-4 h-4" />
                                    <span>Clone</span>
                                </button>
                                {onSetProjectToDelete && <>
                                <div className="my-1 h-px bg-gray-100 dark:bg-zinc-700" />
                                <button onClick={handleDelete} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20" role="menuitem">
                                    <TrashIcon className="w-4 h-4" />
                                    <span>Delete</span>
                                </button>
                                </>}
                            </div>
                        )}
                    </div>
                )}
            </div>
            
            <div className="flex-1 flex justify-end">
                 <div className="relative" ref={userMenuRef}>
                    <button
                        onClick={() => setIsUserMenuOpen(prev => !prev)}
                        className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-200 dark:hover:bg-zinc-700"
                        aria-label="User menu"
                        aria-haspopup="true"
                        aria-expanded={isUserMenuOpen}
                    >
                        <UserIcon className="w-5 h-5 text-gray-700 dark:text-zinc-300" />
                    </button>
                    {isUserMenuOpen && (
                        <div
                            className="absolute right-0 top-full mt-2 w-64 origin-top-right bg-white dark:bg-zinc-800 rounded-md shadow-lg ring-1 ring-black dark:ring-white ring-opacity-5 dark:ring-opacity-10 focus:outline-none z-20 animate-fade-in py-1"
                            role="menu"
                            aria-orientation="vertical"
                        >
                            <div className="px-4 py-2 border-b border-gray-200 dark:border-zinc-700">
                                <p className="text-sm text-gray-600 dark:text-zinc-400">Signed in as</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-zinc-100 truncate">{userEmail}</p>
                            </div>
                            <div className="p-1">
                                <button onClick={handleSignOut} className="w-full text-left text-sm text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-md px-3 py-2" role="menuitem">
                                    Sign Out
                                </button>
                            </div>
                        </div>
                    )}
                 </div>
            </div>
        </header>
    );
};