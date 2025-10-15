import React from 'react';
import { MenuIcon } from './icons/MenuIcon';

interface HeaderProps {
    projectName: string;
    onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ projectName, onToggleSidebar }) => {
    return (
        <header className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-gray-100/80 backdrop-blur-md z-10">
            <div className="flex items-center gap-3">
                <img src="https://codingweek.org/wp-content/uploads/2023/09/code-6622549_1280-768x768.png" alt="TheVibeCoders Logo" className="w-8 h-8 rounded-lg" />
                <h1 className="text-xl font-semibold text-gray-900 tracking-tight hidden sm:block">
                    TheVibeCoders
                </h1>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={onToggleSidebar}
                    className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900"
                    aria-label="Toggle projects sidebar"
                >
                    <MenuIcon className="w-5 h-5" />
                </button>
                <span className="font-medium text-gray-800">{projectName}</span>
            </div>
            <div className="w-6 h-6" /> 
        </header>
    );
};