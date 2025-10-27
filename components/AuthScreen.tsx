import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { Spinner } from './Spinner';
import { PasswordStrengthMeter, getPasswordStrength } from './PasswordStrengthMeter';
import { MagicIcon } from './icons/MagicIcon';

interface AuthScreenProps {
    logoUrl: string;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ logoUrl }) => {
    const [view, setView] = useState<'login' | 'signup' | 'forgot'>('login');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    useEffect(() => {
        // Reset fields and messages when the view changes
        setError(null);
        setMessage(null);
        setName('');
        // Keep email if switching from forgot password back to login
        if (view !== 'login') setEmail('');
        setPhone('');
        setPassword('');
        setConfirmPassword('');
    }, [view]);


    const generateStrongPassword = () => {
        const length = 14;
        const chars = {
            lower: 'abcdefghijklmnopqrstuvwxyz',
            upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
            number: '0123456789',
            symbol: '!@#$%^&*()_+-=[]{}|;:,.<>?'
        };

        let pass = '';
        pass += chars.lower[Math.floor(Math.random() * chars.lower.length)];
        pass += chars.upper[Math.floor(Math.random() * chars.upper.length)];
        pass += chars.number[Math.floor(Math.random() * chars.number.length)];
        pass += chars.symbol[Math.floor(Math.random() * chars.symbol.length)];

        const allChars = chars.lower + chars.upper + chars.number + chars.symbol;
        for (let i = pass.length; i < length; i++) {
            pass += allChars[Math.floor(Math.random() * allChars.length)];
        }
        
        const shuffledPassword = pass.split('').sort(() => 0.5 - Math.random()).join('');
        setPassword(shuffledPassword);
        setConfirmPassword(shuffledPassword);
    };

    const handleAuthAction = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            if (view === 'login') {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
            } else if (view === 'signup') {
                if (password !== confirmPassword) {
                    throw new Error("Passwords do not match.");
                }
                if (getPasswordStrength(password) < 4) {
                    throw new Error("Password is not strong enough. Please meet the requirements.");
                }

                const { error } = await supabase.auth.signUp({ 
                    email, 
                    password,
                    options: {
                        data: {
                            full_name: name,
                            phone: phone,
                        }
                    }
                });

                if (error) throw error;
                setMessage('Check your email for the confirmation link!');
            }
        } catch (err: any) {
            setError(err.error_description || err.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin, // Redirect back to the app's root
            });
            if (error) throw error;
            setMessage('If an account exists, a password reset link has been sent to your email.');
        } catch (err: any) {
            setError(err.error_description || err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-zinc-900 px-4 py-8">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <img src={logoUrl} alt="TheVibeCoders Logo" className="w-16 h-16 rounded-2xl mb-4 inline-block shadow-md" />
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-zinc-100 tracking-tight">
                        {view === 'forgot' ? 'Reset Password' : 'Welcome to TheVibeCoders'}
                    </h1>
                    <p className="mt-3 text-md text-gray-600 dark:text-zinc-400">
                        {view === 'login' && 'Sign in to continue'}
                        {view === 'signup' && 'Create an account to get started'}
                        {view === 'forgot' && 'Enter your email to receive a reset link.'}
                    </p>
                </div>

                <div className="bg-white dark:bg-zinc-800 p-8 rounded-2xl shadow-lg border border-gray-200 dark:border-zinc-700">
                    {view === 'forgot' ? (
                        <form onSubmit={handlePasswordReset} className="flex flex-col gap-4 animate-fade-in">
                            <div>
                                <label htmlFor="email" className="block text-sm font-semibold text-gray-800 dark:text-zinc-200 mb-2">
                                    Email Address
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    className="w-full p-3 border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-zinc-100 rounded-lg focus:ring-2 focus:ring-gray-900 dark:focus:ring-zinc-100"
                                    required
                                    disabled={loading}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold py-3 px-4 rounded-lg hover:bg-gray-700 dark:hover:bg-zinc-300 disabled:opacity-60 disabled:cursor-not-allowed transition-colors mt-2"
                            >
                                {loading ? <Spinner /> : 'Send Reset Link'}
                            </button>
                             {error && <p className="text-sm text-center text-red-600 dark:text-red-400">{error}</p>}
                             {message && <p className="text-sm text-center text-green-600 dark:text-green-400">{message}</p>}
                        </form>
                    ) : (
                        <form onSubmit={handleAuthAction} className="flex flex-col gap-4">
                            {view === 'signup' && (
                                <div className="animate-fade-in">
                                    <label htmlFor="name" className="block text-sm font-semibold text-gray-800 dark:text-zinc-200 mb-2">
                                        Full Name
                                    </label>
                                    <input
                                        id="name"
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g., Jane Doe"
                                        className="w-full p-3 border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-zinc-100 rounded-lg focus:ring-2 focus:ring-gray-900 dark:focus:ring-zinc-100"
                                        required
                                        disabled={loading}
                                    />
                                </div>
                            )}
                            <div>
                                <label htmlFor="email" className="block text-sm font-semibold text-gray-800 dark:text-zinc-200 mb-2">
                                    Email Address
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    className="w-full p-3 border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-zinc-100 rounded-lg focus:ring-2 focus:ring-gray-900 dark:focus:ring-zinc-100"
                                    required
                                    disabled={loading}
                                />
                            </div>
                            {view === 'signup' && (
                                <div className="animate-fade-in">
                                    <label htmlFor="phone" className="block text-sm font-semibold text-gray-800 dark:text-zinc-200 mb-2">
                                        Phone Number (Optional)
                                    </label>
                                    <input
                                        id="phone"
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="e.g., (555) 123-4567"
                                        className="w-full p-3 border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-zinc-100 rounded-lg focus:ring-2 focus:ring-gray-900 dark:focus:ring-zinc-100"
                                        disabled={loading}
                                    />
                                </div>
                            )}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label htmlFor="password"className="text-sm font-semibold text-gray-800 dark:text-zinc-200">
                                        Password
                                    </label>
                                    {view === 'signup' && (
                                        <button
                                            type="button"
                                            onClick={generateStrongPassword}
                                            disabled={loading}
                                            className="flex items-center gap-1 text-xs font-semibold text-gray-600 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-zinc-100"
                                        >
                                            <MagicIcon className="w-3.5 h-3.5" />
                                            Suggest
                                        </button>
                                    )}
                                </div>
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full p-3 border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-zinc-100 rounded-lg focus:ring-2 focus:ring-gray-900 dark:focus:ring-zinc-100"
                                    required
                                    minLength={view === 'signup' ? 8 : undefined}
                                    disabled={loading}
                                />
                                {view === 'login' && (
                                    <div className="text-right mt-2">
                                        <button
                                            type="button"
                                            onClick={() => setView('forgot')}
                                            className="text-xs text-gray-500 dark:text-zinc-400 hover:underline"
                                        >
                                            Forgot Password?
                                        </button>
                                    </div>
                                )}
                                {view === 'signup' && password && <PasswordStrengthMeter password={password} />}
                            </div>

                            {view === 'signup' && (
                                <div className="animate-fade-in">
                                    <label htmlFor="confirm-password"className="block text-sm font-semibold text-gray-800 dark:text-zinc-200 mb-2">
                                        Confirm Password
                                    </label>
                                    <input
                                        id="confirm-password"
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full p-3 border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-zinc-100 rounded-lg focus:ring-2 focus:ring-gray-900 dark:focus:ring-zinc-100"
                                        required
                                        disabled={loading}
                                    />
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold py-3 px-4 rounded-lg hover:bg-gray-700 dark:hover:bg-zinc-300 disabled:opacity-60 disabled:cursor-not-allowed transition-colors mt-2"
                            >
                                {loading ? <Spinner /> : (view === 'login' ? 'Sign In' : 'Sign Up')}
                            </button>

                            {error && <p className="text-sm text-center text-red-600 dark:text-red-400">{error}</p>}
                            {message && <p className="text-sm text-center text-green-600 dark:text-green-400">{message}</p>}
                        </form>
                    )}
                </div>
                
                <p className="mt-8 text-center text-sm text-gray-600 dark:text-zinc-400">
                    {view === 'login' && "Don't have an account? "}
                    {view === 'signup' && "Already have an account? "}
                    {view === 'forgot' && "Remember your password? "}
                    <button onClick={() => setView(view === 'login' ? 'signup' : 'login')} className="font-semibold text-gray-800 dark:text-zinc-200 hover:underline ml-1">
                        {view === 'login' && 'Sign Up'}
                        {view === 'signup' && 'Sign In'}
                        {view === 'forgot' && 'Sign In'}
                    </button>
                </p>
            </div>
        </div>
    );
};