import React, { useState, useEffect } from 'react';
import { SparklesIcon } from './icons/SparklesIcon';

const loadingMessages = [
    'Thinking...',
    'Drafting the application blueprint...',
    'Gathering the required components...',
    'Laying the HTML foundation...',
    'Styling with CSS...',
    'Adding JavaScript interactivity...',
    'Assembling your app...',
    'Final touches...',
    'Almost ready!'
];

interface LoadingOverlayProps {
    isVisible: boolean;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ isVisible }) => {
    const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

    useEffect(() => {
        if (isVisible) {
            const interval = setInterval(() => {
                setCurrentMessageIndex(prevIndex => (prevIndex + 1) % loadingMessages.length);
            }, 2500);

            return () => {
                clearInterval(interval);
            };
        } else {
            setCurrentMessageIndex(0);
        }
    }, [isVisible]);

    if (!isVisible) {
        return null;
    }

    return (
        <div 
            className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in"
            role="status"
            aria-live="assertive"
        >
            <div className="text-center text-white flex flex-col items-center gap-4 p-8 rounded-lg">
                <SparklesIcon className="w-12 h-12 animate-pulse" />
                <p className="text-lg font-semibold tracking-wide">
                    {loadingMessages[currentMessageIndex]}
                </p>
            </div>
        </div>
    );
};
