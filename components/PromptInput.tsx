import React, { useState, useRef } from 'react';
import { HistoryIcon } from './icons/HistoryIcon';
import { XIcon } from './icons/XIcon';
import { MagicIcon } from './icons/MagicIcon';
import { enhancePrompt } from '../services/geminiService';

interface PromptInputProps {
    initialPrompt: string;
    isEditing: boolean;
    onGenerate: (prompt: string) => void;
    isLoading: boolean;
    onToggleHistory: () => void;
}

export const PromptInput: React.FC<PromptInputProps> = ({ initialPrompt, isEditing, onGenerate, isLoading, onToggleHistory }) => {
    const [prompt, setPrompt] = useState('');
    const [enhancedPrompt, setEnhancedPrompt] = useState<string | null>(null);
    const [isEnhancing, setIsEnhancing] = useState<boolean>(false);

    const handleGenerateClick = () => {
        if (!prompt.trim()) return;
        onGenerate(prompt);
        setPrompt('');
        setEnhancedPrompt(null);
    };

    const handleEnhancePrompt = async () => {
        if (!prompt.trim() || isEnhancing) return;
        setIsEnhancing(true);
        setEnhancedPrompt(null);
        try {
            const suggestion = await enhancePrompt(prompt);
            setEnhancedPrompt(suggestion);
        } catch (error) {
            console.error("Failed to enhance prompt:", error);
            // Optionally, show an error to the user
        } finally {
            setIsEnhancing(false);
        }
    };

    const handleUseSuggestion = () => {
        if (enhancedPrompt) {
            setPrompt(enhancedPrompt);
            setEnhancedPrompt(null);
        }
    };

    const handleDismissSuggestion = () => {
        setEnhancedPrompt(null);
    };

    return (
        <div className="flex flex-col h-full">
            {/* Top section */}
            <div>
                <div className="flex justify-between items-center">
                    <label htmlFor="prompt-input" className="font-semibold text-gray-800 dark:text-zinc-200">
                        {isEditing ? 'Describe the changes you want to make' : 'Describe the web app you want to create'}
                    </label>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onToggleHistory}
                            className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 font-medium transition-colors p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-zinc-100"
                            aria-label="Toggle version history"
                        >
                            <HistoryIcon aria-hidden="true" className="w-5 h-5" />
                            <span>History</span>
                        </button>
                    </div>
                </div>

                {isEditing && (
                    <div className="mt-4 p-3 border border-gray-300 dark:border-zinc-600 bg-gray-200 dark:bg-zinc-700/50 rounded-lg text-sm text-gray-700 dark:text-zinc-300">
                        <span className="font-semibold text-gray-800 dark:text-zinc-200">Original Prompt:</span> {initialPrompt}
                    </div>
                )}
            </div>
            
            {/* Spacer */}
            <div className="flex-grow min-h-4"></div>

            {/* Bottom section */}
            <div className="flex flex-col gap-4">
                {isEnhancing && (
                    <div className="text-center p-2 text-sm text-gray-600 dark:text-zinc-400 animate-fade-in" role="status">
                        Enhancing your prompt...
                    </div>
                )}

                {enhancedPrompt && !isEnhancing && (
                    <div className="p-4 border border-indigo-300 bg-indigo-50 rounded-lg text-sm text-indigo-900 animate-fade-in">
                        <div className="flex justify-between items-start">
                            <div>
                                <strong className="font-semibold block mb-1">AI Suggestion:</strong>
                                <p className="italic">"{enhancedPrompt}"</p>
                            </div>
                            <button 
                                onClick={handleDismissSuggestion}
                                className="p-1 rounded-full hover:bg-indigo-200 -mt-1 -mr-1 flex-shrink-0"
                                aria-label="Dismiss suggestion"
                            >
                                <XIcon className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex gap-2 mt-3">
                            <button 
                                onClick={handleUseSuggestion}
                                className="text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500 px-3 py-1.5 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-600"
                            >
                                Use Suggestion
                            </button>
                        </div>
                    </div>
                )}
                
                <textarea
                    id="prompt-input"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={isEditing ? "e.g., Change the header to be sticky..." : "e.g., A simple landing page for a new SaaS product..."}
                    className="w-full p-3 border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 rounded-lg focus:ring-2 focus:ring-gray-900 dark:focus:ring-zinc-100 focus:border-gray-900 dark:focus:border-zinc-100 transition-shadow duration-200 resize-y placeholder-gray-500 dark:placeholder-zinc-400"
                    rows={isEditing ? 3 : 5}
                    disabled={isLoading}
                    aria-label={isEditing ? "Changes description" : "Web app description"}
                />
                
                <div className={`flex ${isEditing ? 'flex-row items-center' : 'flex-col'} gap-2`}>
                    <button
                        onClick={handleGenerateClick}
                        disabled={isLoading || !prompt.trim()}
                        className="w-full flex items-center justify-center bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold py-3 px-4 rounded-lg hover:bg-gray-700 dark:hover:bg-zinc-300 disabled:opacity-60 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 dark:focus:ring-zinc-100"
                        aria-busy={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <svg aria-hidden="true" className="animate-spin -ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                {isEditing ? 'Applying...' : 'Generating...'}
                            </>
                        ) : (isEditing ? 'Apply Changes' : 'Generate Web App')}
                    </button>
                    {isEditing && (
                        <button
                            type="button"
                            onClick={handleEnhancePrompt}
                            disabled={isLoading || isEnhancing || !prompt.trim()}
                            className="p-3 bg-gray-200 dark:bg-zinc-700 text-gray-800 dark:text-zinc-200 rounded-lg hover:bg-gray-300 dark:hover:bg-zinc-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 dark:focus:ring-zinc-100"
                            aria-label="Enhance prompt with AI"
                            aria-busy={isEnhancing}
                            title="Enhance prompt with AI"
                        >
                            {isEnhancing ? (
                                <svg aria-hidden="true" className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                <MagicIcon className="w-5 h-5" />
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};