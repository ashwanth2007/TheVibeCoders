import React from 'react';
import { GoogleIcon } from './icons/GoogleIcon';

interface LoginScreenProps {
    onSignIn: () => void;
    logoUrl: string;
    error: string | null;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onSignIn, logoUrl, error }) => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-zinc-900 px-4">
            <div className="w-full max-w-md text-center">
                <img src={logoUrl} alt="TheVibeCoders Logo" className="w-20 h-20 rounded-2xl mb-6 inline-block shadow-md" />
                <h1 className="text-4xl font-bold text-gray-900 dark:text-zinc-100 tracking-tight">Welcome to TheVibeCoders</h1>
                <p className="mt-4 text-lg text-gray-600 dark:text-zinc-400">Sign in to create, manage, and save your web projects in the cloud.</p>

                <div className="mt-8">
                    <button
                        onClick={onSignIn}
                        className="w-full inline-flex items-center justify-center gap-3 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 font-semibold py-3 px-4 rounded-lg border border-gray-300 dark:border-zinc-600 hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 dark:focus:ring-zinc-100"
                    >
                        <GoogleIcon className="w-5 h-5" />
                        Sign in with Google
                    </button>
                </div>
                {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
            </div>
        </div>
    );
};
