import React from 'react';
import { HistoryEntry } from '../App';
import { HistoryIcon } from './icons/HistoryIcon';

interface HistorySidebarProps {
    isOpen: boolean;
    onClose: () => void;
    history: HistoryEntry[];
    currentIndex: number;
    onRestore: (index: number) => void;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({ isOpen, onClose, history, currentIndex, onRestore }) => {
    // Show newest first
    const reversedHistory = [...history].map((item, index) => ({ ...item, originalIndex: index })).reverse();
    
    return (
        <>
            {/* Backdrop for mobile view */}
            <div 
                className={`fixed inset-0 bg-black/60 z-40 transition-opacity lg:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
                aria-hidden="true"
            />
            <aside 
                className={`
                    flex-shrink-0 flex flex-col bg-white
                    transition-all duration-300 ease-in-out
                    
                    fixed top-0 right-0 h-full z-50
                    transform ${isOpen ? 'translate-x-0' : 'translate-x-full'}
                    w-80 border-l border-gray-200 shadow-xl
                `}
                aria-label="Version History"
            >
                <div className="w-full h-full flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-gray-900">Version History</h2>
                         <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200" aria-label="Close history sidebar">&times;</button>
                    </div>
                    
                    <div className="flex-grow p-2 flex flex-col gap-2 overflow-y-auto">
                        {reversedHistory.length === 0 && (
                            <div className="text-center p-4 text-sm text-gray-500">
                                No history yet. Make a change to start tracking versions.
                            </div>
                        )}
                        {reversedHistory.map((entry, reverseIndex) => {
                             const isCurrent = entry.originalIndex === currentIndex;
                             return (
                                <div
                                    key={entry.originalIndex}
                                    className={`w-full text-left p-3 rounded-md transition-colors border ${
                                        isCurrent 
                                            ? 'bg-gray-200 border-gray-300' 
                                            : 'bg-white border-gray-200'
                                    }`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <span className="font-semibold text-sm text-gray-900 block truncate">
                                                Version {history.length - reverseIndex}
                                                {isCurrent && <span className="text-xs text-gray-600 font-normal"> (Current)</span>}
                                            </span>
                                            <p className="text-xs text-gray-600 block mt-0.5">
                                                {new Date(entry.timestamp).toLocaleString()}
                                            </p>
                                        </div>
                                         {!isCurrent && (
                                            <button 
                                                onClick={() => onRestore(entry.originalIndex)}
                                                className="text-xs font-medium bg-gray-900 text-white hover:bg-gray-700 px-2 py-1 rounded-md transition-colors"
                                            >
                                                Restore
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-700 mt-2 p-2 bg-gray-100 rounded">
                                        <strong className="block text-gray-800 mb-0.5">Change:</strong>
                                        <span className="italic">"{entry.prompt}"</span>
                                    </p>
                                </div>
                             )
                        })}
                    </div>
                </div>
            </aside>
        </>
    );
};