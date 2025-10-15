import React, { useState } from 'react';
import { Spinner } from './Spinner';
import { LoadingOverlay } from './LoadingOverlay';

interface WelcomeScreenProps {
    onCreateProject: (name: string, prompt: string) => void;
    isLoading: boolean;
}

const categorizedPrompts = {
    "Landing Pages": [
        { title: "SaaS Product", prompt: "A sleek landing page for a new SaaS product called 'InnovateAI'. It should feature a modern hero section with a call-to-action button, a features section highlighting three key benefits with icons, a simple pricing table with three tiers, and a clean footer." },
        { title: "Mobile App", prompt: "A vibrant landing page for a mobile fitness app named 'FitTrack'. Include sections for app features, high-quality screenshots inside a phone mockup, user testimonials, and prominent download buttons for the App Store and Google Play." },
        { title: "Webinar", prompt: "A professional registration page for an upcoming webinar on 'The Future of AI in Web Development'. The page needs a countdown timer, speaker biographies with photos, an outline of the topics to be covered, and a simple registration form." },
    ],
    "Utility Apps": [
        { title: "To-Do List", prompt: "A fully functional to-do list application. Users should be able to add new tasks, mark tasks as complete (which should strike them through), and delete tasks. The list should persist even after a page reload by using local storage." },
        { title: "Unit Converter", prompt: "A simple and intuitive unit converter app that can convert between different units of length (e.g., meters, feet, inches) and weight (e.g., kilograms, pounds, ounces). It should have dropdowns to select the units and input fields for the values." },
        { title: "Weather App", prompt: "A weather dashboard that fetches and displays the current weather for a city. Include a search bar for the city, and display the temperature, humidity, wind speed, and an icon representing the current weather conditions. Use a free weather API." },
    ],
    "Portfolios & Pages": [
        { title: "Developer Portfolio", prompt: "A clean and modern portfolio website for a software developer. It must include a brief 'About Me' section, a project gallery with placeholders for images and descriptions, a list of technical skills, and a functional contact form." },
        { title: "Recipe Card", prompt: "A beautifully designed recipe card for classic chocolate chip cookies. It should have a section for an image, a list of ingredients, and step-by-step instructions. Make it look clean and easy to read." },
        { title: "FAQ Page", prompt: "A frequently asked questions (FAQ) page for a fictional company. The questions should be displayed in an accordion style, where clicking on a question smoothly reveals the answer." },
    ],
};

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onCreateProject, isLoading }) => {
    const [appName, setAppName] = useState('');
    const [appPrompt, setAppPrompt] = useState('');

    const canSubmit = appName.trim() && appPrompt.trim() && !isLoading;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (canSubmit) {
            onCreateProject(appName, appPrompt);
        }
    };

    const handleExampleClick = (example: { title: string, prompt: string }) => {
        setAppName(example.title);
        setAppPrompt(example.prompt);
    };

    return (
        <>
            <LoadingOverlay isVisible={isLoading} />
            <div className={`min-h-screen flex items-center justify-center bg-gray-100 px-4 py-12 transition-all duration-300 ${isLoading ? 'blur-md' : ''}`}>
                <div className="w-full max-w-3xl mx-auto">
                    <div className="text-center mb-8">
                        <img src="https://codingweek.org/wp-content/uploads/2023/09/code-6622549_1280-768x768.png" alt="TheVibeCoders Logo" className="w-16 h-16 rounded-2xl mb-4 inline-block" />
                        <h1 className="text-4xl font-bold text-gray-900 tracking-tight">TheVibeCoders</h1>
                        <p className="mt-3 text-lg text-gray-600">Let's start by creating your first project.</p>
                    </div>
                    
                    <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200 flex flex-col gap-6">
                        <div>
                            <label htmlFor="app-name" className="block text-sm font-semibold text-gray-800 mb-2">
                                App Name
                            </label>
                            <input
                                id="app-name"
                                type="text"
                                value={appName}
                                onChange={(e) => setAppName(e.target.value)}
                                placeholder="e.g., My Awesome Portfolio"
                                className="w-full p-3 border border-gray-300 bg-white text-gray-900 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-shadow duration-200"
                                required
                                disabled={isLoading}
                            />
                        </div>

                        <div>
                            <label htmlFor="app-prompt" className="block text-sm font-semibold text-gray-800 mb-2">
                                What do you want to build?
                            </label>
                            <textarea
                                id="app-prompt"
                                value={appPrompt}
                                onChange={(e) => setAppPrompt(e.target.value)}
                                placeholder="Describe the web app you want to create. For example, 'A simple landing page for a new SaaS product...'"
                                className="w-full p-3 border border-gray-300 bg-white text-gray-900 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-shadow duration-200 resize-y"
                                rows={6}
                                required
                                disabled={isLoading}
                            />
                        </div>
                        
                        <button
                            type="submit"
                            disabled={!canSubmit}
                            className="w-full bg-gray-900 text-white font-semibold py-3 px-4 rounded-lg hover:bg-gray-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Spinner />
                                    Creating Project...
                                </>
                            ) : (
                                'Create App'
                            )}
                        </button>
                    </form>

                    <div className="mt-10">
                        <h2 className="text-center text-lg font-semibold text-gray-800 mb-1">Not sure where to start?</h2>
                        <p className="text-center text-gray-600 mb-6">Try one of these examples.</p>
                        
                        <div className="flex flex-col gap-5">
                            {Object.entries(categorizedPrompts).map(([category, prompts]) => (
                                <div key={category} className="flex flex-col gap-3">
                                    <h3 className="font-semibold text-sm text-gray-800 tracking-wide uppercase">{category}</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {prompts.map((example) => (
                                            <button
                                                key={example.title}
                                                onClick={() => handleExampleClick(example)}
                                                className="text-sm text-left bg-white text-gray-800 hover:bg-gray-200 border border-gray-200 px-4 py-3 rounded-lg transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-900"
                                                disabled={isLoading}
                                                title={example.prompt}
                                            >
                                                <span className="font-semibold">{example.title}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </>
    );
};