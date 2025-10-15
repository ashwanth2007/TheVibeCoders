import React from 'react';
import { Project } from '../App';
import { PlusIcon } from './icons/PlusIcon';

interface ProjectsSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    projects: Project[];
    activeProjectId: string | null;
    onSelectProject: (id: string) => void;
    onCreateNew: () => void;
}

export const ProjectsSidebar: React.FC<ProjectsSidebarProps> = ({ isOpen, onClose, projects, activeProjectId, onSelectProject, onCreateNew }) => {
    return (
        <>
            {/* Backdrop for mobile view */}
            <div 
                className={`fixed inset-0 bg-black/60 z-20 transition-opacity lg:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
                aria-hidden="true"
            />
            <aside 
                className={`
                    flex-shrink-0 flex flex-col bg-white
                    transition-all duration-300 ease-in-out
                    
                    /* Mobile: Fixed slide-over */
                    fixed top-0 left-0 h-full z-30
                    transform ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                    
                    /* Desktop: Part of the flex flow, collapsible */
                    lg:relative lg:transform-none lg:h-auto 
                    lg:border-r lg:border-gray-200
                    ${isOpen ? 'w-72' : 'w-0 border-r-0 overflow-hidden'}
                `}
                aria-label="Projects"
            >
                {/* Fixed-width inner container for smooth collapse animation */}
                <div className="w-72 h-full flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900">Projects</h2>
                    </div>
                    <div className="flex-grow p-2 flex flex-col gap-1 overflow-y-auto">
                        {projects.map(project => (
                            <button
                                key={project.id}
                                onClick={() => onSelectProject(project.id)}
                                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                                    project.id === activeProjectId 
                                        ? 'bg-gray-200' 
                                        : 'hover:bg-gray-100'
                                }`}
                            >
                                <span className="font-medium text-gray-900 block truncate">{project.name}</span>
                                <p className="text-xs text-gray-600 block truncate mt-0.5">{project.initialPrompt}</p>
                            </button>
                        ))}
                    </div>
                    <div className="p-2 border-t border-gray-200">
                        <button
                            onClick={onCreateNew}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium bg-gray-900 text-white hover:bg-gray-700 transition-colors"
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