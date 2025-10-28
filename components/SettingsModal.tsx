import React, { useState, useEffect } from 'react';
import { XIcon } from './icons/XIcon';

const ButtonSpinner: React.FC = () => (
    <svg className="animate-spin h-5 w-5 text-white dark:text-zinc-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);


interface SettingsModalProps {
    isOpen: boolean;
    onClose: (skipped: boolean) => void;
    onSave: (apiKey: string) => Promise<void>;
    currentApiKey: string | null;
    isSkippable: boolean;
    isLoading: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSave, currentApiKey, isSkippable, isLoading: isSaving }) => {
    const [apiKey, setApiKey] = useState('');
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setApiKey(currentApiKey || '');
        }
    }, [isOpen, currentApiKey]);

    if (!isOpen) {
        return null;
    }

    const handleSave = async () => {
        await onSave(apiKey);
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="settings-modal-title">
            <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl w-full max-w-lg p-6 relative" onClick={(e) => e.stopPropagation()}>
                <h3 id="settings-modal-title" className="text-lg font-semibold text-gray-900 dark:text-zinc-100">Settings</h3>
                
                <div className="mt-4">
                    <label htmlFor="api-key-input" className="block text-sm font-semibold text-gray-800 dark:text-zinc-200 mb-2">
                        Gemini API Key
                    </label>
                    <p className="text-sm text-gray-600 dark:text-zinc-400 mb-3">
                        Your API key is required to generate projects. Get your key from{' '}
                        <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                            Google AI Studio
                        </a>. It's stored securely and only used for your requests.
                    </p>
                    <div className="relative">
                        <input
                            id="api-key-input"
                            type={isPasswordVisible ? 'text' : 'password'}
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            className="w-full p-3 pr-10 border border-gray-300 dark:border-zinc-600 rounded-md focus:ring-2 focus:ring-gray-900 dark:focus:ring-zinc-100 bg-white dark:bg-zinc-700 text-gray-900 dark:text-zinc-100"
                            placeholder="Enter your API key"
                            autoComplete="off"
                        />
                        <button 
                            type="button" 
                            onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-200"
                            aria-label={isPasswordVisible ? "Hide API key" : "Show API key"}
                        >
                            {isPasswordVisible ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.502 1.057L3.707 2.293zM10.707 7.293a1 1 0 00-1.414 0l-1 1a1 1 0 001.414 1.414l1-1z" clipRule="evenodd" />
                                    <path d="M10 5a5 5 0 015 5c0 .647-.122 1.255-.348 1.817l-1.09.955A3.003 3.003 0 0010 7a3 3 0 00-3 3c0 .26.034.51.098.752l-1.13 1.131A5.003 5.003 0 015 10c0-2.757 2.243-5 5-5z" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>

                <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end sm:gap-3">
                    {isSkippable && (
                        <button
                            type="button"
                            onClick={() => onClose(true)}
                            className="w-full sm:w-auto mt-3 sm:mt-0 justify-center flex items-center bg-white dark:bg-zinc-700 text-gray-800 dark:text-zinc-200 font-semibold py-2 px-4 rounded-lg border border-gray-300 dark:border-zinc-600 hover:bg-gray-100 dark:hover:bg-zinc-600 transition-colors"
                        >
                            Skip for now
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving || !apiKey.trim()}
                        className="w-full sm:w-auto justify-center flex items-center bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold py-2 px-4 rounded-lg hover:bg-gray-700 dark:hover:bg-zinc-300 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                    >
                        {isSaving ? <ButtonSpinner /> : 'Save Key'}
                    </button>
                </div>

                {isSkippable && (
                     <button onClick={() => onClose(false)} className="absolute top-4 right-4 p-1 rounded-full text-gray-500 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700" aria-label="Close settings">
                        <XIcon className="w-5 h-5" />
                    </button>
                )}
            </div>
        </div>
    );
};