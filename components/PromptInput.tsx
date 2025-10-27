import React, { useState, useRef, useEffect } from 'react';
import { HistoryIcon } from './icons/HistoryIcon';
import { XIcon } from './icons/XIcon';
import { MagicIcon } from './icons/MagicIcon';
import { enhancePrompt, Suggestion } from '../services/geminiService';
import { LightbulbIcon } from './icons/LightbulbIcon';
import { CursorClickIcon } from './icons/CursorClickIcon';
import { PaperclipIcon } from './icons/PaperclipIcon';
import { BrainIcon } from './icons/BrainIcon';
import { DiscussionView } from './DiscussionView';
import { GenerationStatus } from '../App';
import { GenerationStatusView } from './GenerationStatusView';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { ChevronUpIcon } from './icons/ChevronUpIcon';
import { ArrowUpIcon } from './icons/ArrowUpIcon';

interface PromptInputProps {
    initialPrompt: string;
    isEditing: boolean;
    onGenerate: (prompt: string, attachments: File[]) => void;
    isLoading: boolean;
    onToggleHistory: () => void;
    suggestions: Suggestion[];
    isGeneratingSuggestions: boolean;
    onDismissSuggestions: () => void;
    selectedElement: { selector: string; html: string } | null;
    onClearSelection: () => void;
    isDiscussModeActive: boolean;
    onToggleDiscussMode: () => void;
    discussionHistory: Array<{ role: 'user' | 'model'; content: string }>;
    generationStatus: GenerationStatus;
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
    isDiscussModeActive,
    onToggleDiscussMode,
    discussionHistory,
    generationStatus,
}) => {
    const [prompt, setPrompt] = useState('');
    const [enhancedPrompt, setEnhancedPrompt] = useState<string | null>(null);
    const [isEnhancing, setIsEnhancing] = useState<boolean>(false);
    const [activeSuggestion, setActiveSuggestion] = useState<Suggestion | null>(null);
    const [attachments, setAttachments] = useState<File[]>([]);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isPromptExpanded, setIsPromptExpanded] = useState(false);

    useEffect(() => {
        if(isDiscussModeActive) {
            setEnhancedPrompt(null);
        }
    }, [isDiscussModeActive]);

    const handleAddFiles = (files: FileList | File[]) => {
        const newFilesArray = Array.from(files);
        setAttachments(prev => {
            const existingNames = new Set(prev.map((f: File) => f.name));
            const uniqueNewFiles = newFilesArray.filter((f: File) => f.name && !existingNames.has(f.name));
            return [...prev, ...uniqueNewFiles];
        });
    };

    const handleGenerateClick = () => {
        if (!prompt.trim() || isLoading) return;
        onGenerate(prompt, attachments);
        setPrompt('');
        setEnhancedPrompt(null);
        setAttachments([]);
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleGenerateClick();
        }
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
    
    const handleAttachClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            handleAddFiles(e.target.files);
        }
        if(fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleRemoveAttachment = (fileName: string) => {
        setAttachments(prev => prev.filter((f: File) => f.name !== fileName));
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

    const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        if (e.clipboardData.files && e.clipboardData.files.length > 0) {
            e.preventDefault();
            
            const pastedFiles = Array.from(e.clipboardData.files);
            // FIX: Use a type guard to correctly filter for File objects and handle cases where pasted items might not be files.
            const imageFiles = pastedFiles.filter((file): file is File => file instanceof File && file.type.startsWith('image/'));
    
            if (imageFiles.length > 0) {
                const uniquelyNamedFiles = imageFiles.map((file, index) => {
                    const extension = file.type.split('/')[1]?.split('+')[0] || 'png';
                    const newName = `pasted-image-${Date.now()}-${index}.${extension}`;
                    return new File([file], newName, { type: file.type });
                });
                handleAddFiles(uniquelyNamedFiles);
            }
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);
    };
    
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleAddFiles(e.dataTransfer.files);
            e.dataTransfer.clearData();
        }
    };


    return (
        <div 
            className="relative flex flex-col h-full bg-gray-100 dark:bg-zinc-900"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
             {isDraggingOver && (
                <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm rounded-lg z-10 flex items-center justify-center pointer-events-none">
                    <div className="text-center text-white border-2 border-dashed border-white p-8 rounded-lg">
                        <PaperclipIcon className="w-10 h-10 mx-auto mb-2"/>
                        <p className="font-semibold">Drop files to attach</p>
                    </div>
                </div>
            )}
            {/* Top section */}
            <div className="flex-shrink-0 p-4 lg:p-6 pb-0">
                <div className="flex justify-between items-center">
                    <label htmlFor="prompt-input" className="font-semibold text-gray-800 dark:text-zinc-200">
                        {isDiscussModeActive ? 'Discuss with AI' : (isEditing ? 'Describe the changes you want to make' : 'Describe the web app you want to create')}
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
                    <div className="mt-4 p-3 border border-gray-300 dark:border-zinc-600 bg-gray-200 dark:bg-zinc-700/50 rounded-lg text-sm text-gray-700 dark:text-zinc-300 transition-all duration-300 relative">
                        <div className="flex justify-between items-start">
                            <p className={`${isPromptExpanded ? '' : 'line-clamp-3'}`}>
                                <span className="font-semibold text-gray-800 dark:text-zinc-200">Original Prompt:</span> {initialPrompt}
                            </p>
                            <button 
                                onClick={() => setIsPromptExpanded(!isPromptExpanded)} 
                                className="ml-2 p-1 rounded-full hover:bg-gray-300 dark:hover:bg-zinc-600 flex-shrink-0" 
                                aria-label={isPromptExpanded ? "Collapse prompt" : "Expand prompt"}
                            >
                                {isPromptExpanded ? <ChevronUpIcon className="w-4 h-4"/> : <ChevronDownIcon className="w-4 h-4"/>}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {isDiscussModeActive ? (
                <DiscussionView history={discussionHistory} />
            ) : (
                <div className="flex-grow min-h-4"></div>
            )}
            
            {/* Bottom section */}
            {generationStatus.stage !== 'idle' && !isDiscussModeActive ? (
                <GenerationStatusView status={generationStatus} />
            ) : (
                <div className="flex-shrink-0 flex flex-col gap-4 p-4 lg:p-6">
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

                    {isEditing && !isDiscussModeActive && (
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
                    
                    {selectedElement && !isDiscussModeActive && (
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
                    
                    {attachments.length > 0 && !isDiscussModeActive && (
                        <div className="animate-fade-in p-3 border border-gray-300 dark:border-zinc-600 rounded-lg flex flex-col gap-3 bg-gray-50 dark:bg-zinc-800/50">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-zinc-400">Attachments</h4>
                            <div className="flex flex-wrap gap-2">
                                {attachments.map(file => (
                                    <div key={file.name} className="flex items-center gap-2 bg-gray-200 dark:bg-zinc-700 rounded-full pl-3 pr-1 py-1 text-sm text-gray-800 dark:text-zinc-200">
                                        <PaperclipIcon className="w-4 h-4 text-gray-600 dark:text-zinc-300 flex-shrink-0" />
                                        <span className="max-w-[150px] truncate" title={file.name}>{file.name}</span>
                                        <button 
                                            onClick={() => handleRemoveAttachment(file.name)} 
                                            className="p-1 rounded-full hover:bg-gray-300 dark:hover:bg-zinc-600 flex-shrink-0"
                                            aria-label={`Remove ${file.name}`}
                                        >
                                            <XIcon className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    <div className="flex items-end gap-2 p-2 bg-white dark:bg-zinc-800 rounded-lg ring-1 ring-inset ring-gray-300 dark:ring-zinc-600 focus-within:ring-2 focus-within:ring-gray-900 dark:focus-within:ring-zinc-100">
                        <textarea
                            id="prompt-input"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onPaste={handlePaste}
                            placeholder={isDiscussModeActive ? "Ask a question about your project..." : (isEditing ? "Make changes, add new features, ask for anything" : "e.g., A simple landing page for a new SaaS product...")}
                            className="w-full flex-grow p-1 bg-transparent border-none focus:ring-0 outline-none resize-y placeholder-gray-500 dark:placeholder-zinc-400 text-gray-900 dark:text-zinc-100"
                            rows={isEditing ? 3 : 5}
                            disabled={isLoading}
                            aria-label={isDiscussModeActive ? "Question about your project" : (isEditing ? "Changes description" : "Web app description")}
                        />
                         <button
                            onClick={handleGenerateClick}
                            disabled={isLoading || !prompt.trim()}
                            className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-md hover:bg-gray-700 dark:hover:bg-zinc-300 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                            aria-busy={isLoading}
                            aria-label={isDiscussModeActive ? 'Ask' : 'Apply Changes'}
                        >
                            {isLoading && isDiscussModeActive ? (
                                <svg aria-hidden="true" className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            ) : (
                                <ArrowUpIcon className="w-5 h-5" />
                            )}
                        </button>
                    </div>

                    {isEditing && (
                        <div className="flex-shrink-0 flex items-center gap-2 mt-2">
                             <button
                                type="button"
                                onClick={onToggleDiscussMode}
                                disabled={isLoading}
                                className={`p-2 rounded-lg hover:bg-gray-300 dark:hover:bg-zinc-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 dark:focus:ring-zinc-100 ${isDiscussModeActive ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-gray-200 dark:bg-zinc-700 text-gray-800 dark:text-zinc-200'}`}
                                aria-label={isDiscussModeActive ? 'End Discussion' : 'Start Discussion'}
                                aria-pressed={isDiscussModeActive}
                                title={isDiscussModeActive ? 'End Discussion' : 'Start Discussion'}
                            >
                                <BrainIcon className="w-5 h-5" />
                            </button>
                            <button
                                type="button"
                                onClick={handleEnhancePrompt}
                                disabled={isLoading || isEnhancing || !prompt.trim() || isDiscussModeActive}
                                className="p-2 bg-gray-200 dark:bg-zinc-700 text-gray-800 dark:text-zinc-200 rounded-lg hover:bg-gray-300 dark:hover:bg-zinc-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 dark:focus:ring-zinc-100"
                                aria-label="Enhance prompt with AI"
                                aria-busy={isEnhancing}
                                title="Enhance prompt with AI"
                            >
                                {isEnhancing ? (
                                    <svg aria-hidden="true" className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                ) : (
                                    <MagicIcon className="w-5 h-5" />
                                )}
                            </button>
                             <button
                                type="button"
                                onClick={handleAttachClick}
                                disabled={isLoading || isDiscussModeActive}
                                className="p-2 bg-gray-200 dark:bg-zinc-700 text-gray-800 dark:text-zinc-200 rounded-lg hover:bg-gray-300 dark:hover:bg-zinc-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 dark:focus:ring-zinc-100"
                                aria-label="Attach files"
                                title="Attach files"
                            >
                                <PaperclipIcon className="w-5 h-5" />
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                multiple
                                className="hidden"
                                aria-hidden="true"
                            />
                        </div>
                    )}
                </div>
            )}

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