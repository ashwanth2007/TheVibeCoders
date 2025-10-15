import React, { useState, useRef } from 'react';
import { HistoryIcon } from './icons/HistoryIcon';
import { PaperclipIcon } from './icons/PaperclipIcon';
import { XIcon } from './icons/XIcon';

interface PromptInputProps {
    initialPrompt: string;
    isEditing: boolean;
    onGenerate: (prompt: string, image?: { base64: string, mimeType: string }) => void;
    isLoading: boolean;
    onToggleHistory: () => void;
}

interface AttachedImage {
    file: File;
    base64: string;
}

export const PromptInput: React.FC<PromptInputProps> = ({ initialPrompt, isEditing, onGenerate, isLoading, onToggleHistory }) => {
    const [prompt, setPrompt] = useState('');
    const [attachedImage, setAttachedImage] = useState<AttachedImage | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleGenerateClick = () => {
        if (!prompt.trim() && !attachedImage) return;

        let imagePayload;
        if (attachedImage) {
            const base64Data = attachedImage.base64.split(',')[1];
            imagePayload = {
                base64: base64Data,
                mimeType: attachedImage.file.type
            };
        }
        onGenerate(prompt, imagePayload);
        setPrompt('');
        setAttachedImage(null);
    };

    const handleAttachClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setAttachedImage({
                    file: file,
                    base64: reader.result as string,
                });
            };
            reader.readAsDataURL(file);
        }
        // Reset file input value to allow re-uploading the same file
        event.target.value = '';
    };
    
    const handleRemoveImage = () => {
        setAttachedImage(null);
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                    <label htmlFor="prompt-input" className="font-semibold text-gray-800">
                        {isEditing ? 'Describe the changes you want to make' : 'Describe the web app you want to create'}
                    </label>
                    <div className="flex items-center gap-2">
                         <button
                            onClick={handleAttachClick}
                            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
                            aria-label="Attach an image"
                            disabled={isLoading}
                        >
                            <PaperclipIcon aria-hidden="true" className="w-5 h-5" />
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                            accept="image/*"
                            aria-hidden="true"
                        />
                        <button
                            onClick={onToggleHistory}
                            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
                            aria-label="Toggle version history"
                        >
                            <HistoryIcon aria-hidden="true" className="w-5 h-5" />
                            <span>History</span>
                        </button>
                    </div>
                </div>

                {isEditing && (
                    <div className="p-3 border border-gray-300 bg-gray-200 rounded-lg text-sm text-gray-700">
                        <span className="font-semibold text-gray-800">Original Prompt:</span> {initialPrompt}
                    </div>
                )}
                
                <textarea
                    id="prompt-input"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={isEditing ? "e.g., Change the header to be sticky..." : "e.g., A simple landing page for a new SaaS product..."}
                    className="w-full p-3 border border-gray-300 bg-white text-gray-900 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-shadow duration-200 resize-y placeholder-gray-500"
                    rows={isEditing ? 3 : 5}
                    disabled={isLoading}
                    aria-label={isEditing ? "Changes description" : "Web app description"}
                />

                {attachedImage && (
                    <div className="relative w-32 h-32 mt-2 group animate-fade-in">
                        <img src={attachedImage.base64} alt="Preview" className="w-full h-full object-cover rounded-lg border border-gray-300"/>
                        <button 
                            onClick={handleRemoveImage}
                            className="absolute -top-2 -right-2 bg-gray-800 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-900"
                            aria-label="Remove attached image"
                        >
                            <XIcon className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>
            
            <div className={`flex gap-2 ${isEditing ? 'flex-row-reverse' : 'flex-col'}`}>
                <button
                    onClick={handleGenerateClick}
                    disabled={isLoading || (!prompt.trim() && !attachedImage)}
                    className="w-full bg-gray-900 text-white font-semibold py-3 px-4 rounded-lg hover:bg-gray-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 flex items-center justify-center gap-2"
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
            </div>
        </div>
    );
};