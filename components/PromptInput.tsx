import React, { useState, useRef } from 'react';
import { HistoryIcon } from './icons/HistoryIcon';
import { XIcon } from './icons/XIcon';
import { MagicIcon } from './icons/MagicIcon';
import { enhancePrompt, Suggestion } from '../services/geminiService';
import { LightbulbIcon } from './icons/LightbulbIcon';
import { CursorClickIcon } from './icons/CursorClickIcon';

interface PromptInputProps {
    initialPrompt: string;
    isEditing: boolean;
    onGenerate: (prompt: string) => void;
    isLoading: boolean;
    onToggleHistory: () => void;
    suggestions: Suggestion[];
    isGeneratingSuggestions: boolean;
    onDismissSuggestions: () => void;
    selectedElement: { selector: string; html: string } | null;
    onClearSelection: () => void;
}

export const PromptInput: React.FC<PromptInputProps> = ({ 
    initialPrompt, 
    isEditing, 
    onGenerate, 
    isLoading, 
    onToggleHistory,
    suggestions,
    isGeneratingSuggestions,
    onDismissSuggestions,
    selectedElement,
    onClearSelection,
}) => {
    const [prompt, setPrompt] = useState('');
    const [enhancedPrompt, setEnhancedPrompt] = useState<string | null>(null);
    const [isEnhancing, setIsEnhancing] = useState<boolean>(false);
    const [activeSuggestion, setActiveSuggestion] = useState<Suggestion | null>(null);

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
    
    const handleSuggestionClick = (suggestion: Suggestion) => {
        setActiveSuggestion(suggestion);
    };

    const handleUseDetailedSuggestion = () => {
        if (activeSuggestion) {
            setPrompt(activeSuggestion.detailedPrompt);
            setActiveSuggestion(null);
        }
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

                {isEditing && (
                    <div className="flex flex-col gap-2">
                        {(isGeneratingSuggestions && suggestions.length === 0) && (
                            <div className="text-center p-2 text-sm text-gray-500 dark:text-zinc-500 animate-pulse" role="status">
                                Generating suggestions...
                            </div>
                        )}
                        {suggestions.length > 0 && (
                             <div className="animate-fade-in">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-zinc-200">
                                        <LightbulbIcon className="w-5 h-5 text-yellow-400" />
                                        Suggestions
                                    </h3>
                                    <button
                                        onClick={onDismissSuggestions}
                                        className="p-1 rounded-full text-gray-500 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700"
                                        aria-label="Dismiss suggestions"
                                    >
                                        <XIcon className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="flex gap-2 pb-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                                    {suggestions.map((suggestion, index) => (
                                        <button
                                            key={index}
                                            onClick={() => handleSuggestionClick(suggestion)}
                                            className="flex-shrink-0 text-sm bg-gray-200 dark:bg-zinc-700 text-gray-800 dark:text-zinc-200 hover:bg-gray-300 dark:hover:bg-zinc-600 px-3 py-1.5 rounded-full transition-colors"
                                        >
                                            {suggestion.title}
                                        </button>
                                    ))}
                                </div>
                             </div>
                        )}
                    </div>
                )}
                
                {selectedElement && (
                    <div className="animate-fade-in p-3 border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/20 rounded-r-lg relative">
                        <div className="flex items-start gap-3">
                            <CursorClickIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">Modifying selected element</p>
                                <code className="text-xs text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 px-1 py-0.5 rounded break-all">
                                    {selectedElement.selector}
                                </code>
                            </div>
                        </div>
                         <button
                            onClick={onClearSelection}
                            className="absolute top-2 right-2 p-1 rounded-full text-blue-600 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800"
                            aria-label="Clear selected element"
                        >
                            <XIcon className="w-4 h-4" />
                        </button>
                    </div>
                )}

                <textarea
                    id="prompt-input"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={isEditing ? "Make changes, add new features, ask for anything" : "e.g., A simple landing page for a new SaaS product..."}
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

            {activeSuggestion && (
                <div 
                    className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" 
                    role="dialog" 
                    aria-modal="true" 
                    aria-labelledby="suggestion-title"
                    onClick={() => setActiveSuggestion(null)}
                >
                    <div 
                        className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl w-full max-w-lg p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-start">
                             <h3 id="suggestion-title" className="text-lg font-semibold text-gray-900 dark:text-zinc-100">{activeSuggestion.title}</h3>
                             <button onClick={() => setActiveSuggestion(null)} className="p-1 -mt-1 -mr-1 rounded-full text-gray-500 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700" aria-label="Close suggestion detail">
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="mt-4 text-sm text-gray-700 dark:text-zinc-300 whitespace-pre-wrap">
                            {activeSuggestion.detailedPrompt}
                        </p>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setActiveSuggestion(null)}
                                className="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 dark:border-zinc-600 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 dark:focus:ring-zinc-100"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleUseDetailedSuggestion}
                                className="px-4 py-2 text-sm font-medium rounded-md border border-transparent bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-gray-700 dark:hover:bg-zinc-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 dark:focus:ring-zinc-100"
                            >
                                Use this prompt
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};