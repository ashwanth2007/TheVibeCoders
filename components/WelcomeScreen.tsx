import React, { useState } from 'react';
import { Spinner } from './Spinner';
import { LoadingOverlay } from './LoadingOverlay';

export interface WizardPrefillData {
    backgroundColor: string;
    fontFamily: string;
    predefinedSections: string[];
    customSections: { name: string; description: string }[];
}

interface ExampleProject {
    title: string;
    prompt: string;
    wizardData?: WizardPrefillData;
}

interface WelcomeScreenProps {
    onFormSubmit: (name: string, prompt: string, wizardData?: WizardPrefillData) => void;
    isLoading: boolean;
    logoUrl: string;
    isStandalone?: boolean;
}

const categorizedPrompts: { [key: string]: ExampleProject[] } = {
    "Landing Pages": [
        { 
            title: "SaaS Product", 
            prompt: "A sleek landing page for a new SaaS product called 'InnovateAI'. It should feature a modern hero section with a call-to-action button, a features section highlighting three key benefits with icons, a simple pricing table with three tiers, and a clean footer.",
            wizardData: {
                backgroundColor: "A subtle light gray to white gradient",
                fontFamily: "Inter",
                predefinedSections: ['features', 'pricing', 'footer'],
                customSections: [{ name: "How It Works", description: "A simple 3-step visual guide on how to use InnovateAI." }]
            }
        },
        { 
            title: "E-Commerce Product", 
            prompt: "A stylish landing page for a new e-commerce brand 'Artisan Goods' selling handmade ceramics. It should have a large hero image showcasing the products, a grid of 'Featured Products' with images, names, and prices, and a prominent 'Shop The Collection' button.",
            wizardData: {
                backgroundColor: "A clean, off-white or light beige color",
                fontFamily: "Playfair Display",
                predefinedSections: ['gallery', 'contact', 'footer'],
                customSections: [
                    { name: "Customer Reviews", description: "A section showcasing testimonials from happy customers." },
                    { name: "About Our Craft", description: "A brief story about the artisans and the process behind the handmade ceramics." }
                ]
            }
        },
        { 
            title: "Webinar", 
            prompt: "A professional registration page for an upcoming webinar on 'The Future of AI in Web Development'. The page needs a countdown timer, speaker biographies with photos, an outline of the topics to be covered, and a simple registration form.",
            wizardData: {
                backgroundColor: "A professional dark blue or deep purple",
                fontFamily: "Roboto",
                predefinedSections: ['footer'],
                customSections: [
                    { name: "Meet the Speakers", description: "Biographies and photos for the webinar speakers." },
                    { name: "Webinar Agenda", description: "An outline of the topics to be covered during the session." }
                ]
            }
        },
    ],
    "Utility Apps": [
        { 
            title: "To-Do List", 
            prompt: "A fully functional to-do list application. Users should be able to add new tasks, mark tasks as complete (which should strike them through), and delete tasks. The list should persist even after a page reload by using local storage.",
            wizardData: {
                backgroundColor: "A simple, clean white background",
                fontFamily: "Bricolage Grotesque",
                predefinedSections: [],
                customSections: []
            }
        },
        { 
            title: "Unit Converter", 
            prompt: "A simple and intuitive unit converter app that can convert between different units of length (e.g., meters, feet, inches) and weight (e.g., kilograms, pounds, ounces). It should have dropdowns to select the units and input fields for the values.",
            wizardData: {
                backgroundColor: "A light gray background with a darker gray card for the converter",
                fontFamily: "Lato",
                predefinedSections: ['footer'],
                customSections: []
            }
        },
        { 
            title: "Weather App", 
            prompt: "A weather dashboard that fetches and displays the current weather for a city. Include a search bar for the city, and display the temperature, humidity, wind speed, and an icon representing the current weather conditions. Use a free weather API.",
            wizardData: {
                backgroundColor: "A dynamic gradient that represents the time of day (e.g., blue for day, dark blue for night)",
                fontFamily: "Montserrat",
                predefinedSections: [],
                customSections: []
            }
        },
    ],
    "Portfolios & Pages": [
        { 
            title: "Developer Portfolio", 
            prompt: "A clean and modern portfolio website for a software developer. It must include a brief 'About Me' section, a project gallery with placeholders for images and descriptions, a list of technical skills, and a functional contact form.",
            wizardData: {
                backgroundColor: "A dark charcoal or navy blue theme",
                fontFamily: "Source Code Pro",
                predefinedSections: ['gallery', 'contact', 'footer'],
                customSections: [
                    { name: "About Me", description: "A brief, personal introduction." },
                    { name: "Technical Skills", description: "A list or grid of programming languages, frameworks, and tools." }
                ]
            }
        },
        { 
            title: "Recipe Card", 
            prompt: "A beautifully designed recipe card for classic chocolate chip cookies. It should have a section for an image, a list of ingredients, and step-by-step instructions. Make it look clean and easy to read.",
            wizardData: {
                backgroundColor: "A warm, parchment paper-like texture or color",
                fontFamily: "Playfair Display",
                predefinedSections: [],
                customSections: []
            }
        },
        { 
            title: "FAQ Page", 
            prompt: "A frequently asked questions (FAQ) page for a fictional company. The questions should be displayed in an accordion style, where clicking on a question smoothly reveals the answer.",
            wizardData: {
                backgroundColor: "A clean, minimalist white or light gray",
                fontFamily: "Open Sans",
                predefinedSections: ['faq', 'contact', 'footer'],
                customSections: []
            }
        },
    ],
};

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onFormSubmit, isLoading, logoUrl, isStandalone = false }) => {
    const [appName, setAppName] = useState('');
    const [appPrompt, setAppPrompt] = useState('');
    const [selectedExample, setSelectedExample] = useState<ExampleProject | null>(null);

    const canSubmit = appName.trim() && appPrompt.trim() && !isLoading;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (canSubmit) {
            onFormSubmit(appName, appPrompt, selectedExample?.wizardData);
        }
    };

    const handleExampleClick = (example: ExampleProject) => {
        setAppName(example.title);
        setAppPrompt(example.prompt);
        setSelectedExample(example);
    };

    const handleInputChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setter(e.target.value);
        // If user types, it's a custom prompt, so clear the pre-fill data.
        setSelectedExample(null);
    }

    return (
        <>
            <LoadingOverlay isVisible={isLoading} />
            <div className={`relative transition-all duration-300 bg-gray-100 dark:bg-zinc-900 ${isLoading ? 'blur-md' : ''} ${
                isStandalone 
                ? 'min-h-screen flex items-center justify-center px-4 py-12' 
                : 'h-full flex items-center justify-center p-4'
            }`}>
                <div className={`w-full max-w-3xl mx-auto ${isStandalone ? '' : 'p-4 lg:p-8'}`}>
                    <div className="text-center mb-8">
                        <img src={logoUrl} alt="TheVibeCoders Logo" className="w-16 h-16 rounded-2xl mb-4 inline-block" />
                        <h1 className="text-4xl font-bold text-gray-900 dark:text-zinc-100 tracking-tight">TheVibeCoders</h1>
                        <p className="mt-3 text-lg text-gray-600 dark:text-zinc-400">Let's start by creating your first project.</p>
                    </div>
                    
                    <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-800 p-8 rounded-2xl shadow-lg border border-gray-200 dark:border-zinc-700 flex flex-col gap-6">
                        <div>
                            <label htmlFor="app-name" className="block text-sm font-semibold text-gray-800 dark:text-zinc-200 mb-2">
                                App Name
                            </label>
                            <input
                                id="app-name"
                                type="text"
                                value={appName}
                                onChange={handleInputChange(setAppName)}
                                placeholder="e.g., My Awesome Portfolio"
                                className="w-full p-3 border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-zinc-100 rounded-lg focus:ring-2 focus:ring-gray-900 dark:focus:ring-zinc-100 focus:border-gray-900 dark:focus:border-zinc-100 transition-shadow duration-200"
                                required
                                disabled={isLoading}
                            />
                        </div>

                        <div>
                            <label htmlFor="app-prompt" className="block text-sm font-semibold text-gray-800 dark:text-zinc-200 mb-2">
                                What do you want to build?
                            </label>
                            <textarea
                                id="app-prompt"
                                value={appPrompt}
                                onChange={handleInputChange(setAppPrompt)}
                                placeholder="Describe the web app you want to create. For example, 'A simple landing page for a new SaaS product...'"
                                className="w-full p-3 border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-zinc-100 rounded-lg focus:ring-2 focus:ring-gray-900 dark:focus:ring-zinc-100 focus:border-gray-900 dark:focus:border-zinc-100 transition-shadow duration-200 resize-y"
                                rows={6}
                                required
                                disabled={isLoading}
                            />
                        </div>
                        
                        <button
                            type="submit"
                            disabled={!canSubmit}
                            className="w-full bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold py-3 px-4 rounded-lg hover:bg-gray-700 dark:hover:bg-zinc-300 disabled:opacity-60 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 dark:focus:ring-zinc-100"
                        >
                            Continue
                        </button>
                    </form>

                    <div className="mt-10">
                        <h2 className="text-center text-lg font-semibold text-gray-800 dark:text-zinc-200 mb-1">Not sure where to start?</h2>
                        <p className="text-center text-gray-600 dark:text-zinc-400 mb-6">Try one of these examples.</p>
                        
                        <div className="flex flex-col gap-5">
                            {Object.entries(categorizedPrompts).map(([category, prompts]) => (
                                <div key={category} className="flex flex-col gap-3">
                                    <h3 className="font-semibold text-sm text-gray-800 dark:text-zinc-300 tracking-wide uppercase">{category}</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {prompts.map((example) => (
                                            <button
                                                key={example.title}
                                                onClick={() => handleExampleClick(example)}
                                                className="text-sm text-left bg-white dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 hover:bg-gray-200 dark:hover:bg-zinc-700 border border-gray-200 dark:border-zinc-700 px-4 py-3 rounded-lg transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-zinc-100"
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
