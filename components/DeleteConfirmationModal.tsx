import React, { useState, useEffect } from 'react';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';

interface DeleteConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    projectName: string;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({ isOpen, onClose, onConfirm, projectName }) => {
    const [inputValue, setInputValue] = useState('');
    const [isChecked, setIsChecked] = useState(false);

    // Reset state when modal opens or project changes
    useEffect(() => {
        if (isOpen) {
            setInputValue('');
            setIsChecked(false);
        }
    }, [isOpen]);

    if (!isOpen) {
        return null;
    }

    const isConfirmed = inputValue === projectName && isChecked;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
            <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start gap-4">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                        <AlertTriangleIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
                    </div>
                    <div className="flex-grow">
                        <h3 id="delete-modal-title" className="text-lg font-semibold text-gray-900 dark:text-zinc-100">Delete Project</h3>
                        <p className="mt-2 text-sm text-gray-600 dark:text-zinc-400">
                            This action is permanent and cannot be undone. To confirm, please type the project name <strong className="text-gray-800 dark:text-zinc-200 break-all">{projectName}</strong> below.
                        </p>
                    </div>
                </div>

                <div className="mt-4 flex flex-col gap-4">
                    <div>
                        <label htmlFor="delete-confirm-input" className="sr-only">Project Name</label>
                        <input
                            id="delete-confirm-input"
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            className="w-full p-2 border border-gray-300 dark:border-zinc-600 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white dark:bg-zinc-700 text-gray-900 dark:text-zinc-100"
                            autoComplete="off"
                        />
                    </div>
                    <div className="flex items-start">
                        <input
                            id="delete-confirm-checkbox"
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => setIsChecked(e.target.checked)}
                            className="h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500 mt-0.5"
                        />
                        <label htmlFor="delete-confirm-checkbox" className="ml-2 block text-sm text-gray-700 dark:text-zinc-300">
                            I understand this will permanently delete the project and all its associated data.
                        </label>
                    </div>
                </div>

                <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end sm:gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-300 dark:border-zinc-600 shadow-sm px-4 py-2 bg-white dark:bg-zinc-800 text-base font-medium text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 dark:focus:ring-zinc-100 mt-3 sm:mt-0"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={!isConfirmed}
                        className="w-full sm:w-auto inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Delete Project
                    </button>
                </div>
            </div>
        </div>
    );
};