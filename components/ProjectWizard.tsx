import React, { useState, useEffect, useMemo, useRef } from 'react';
import { LoadingOverlay } from './LoadingOverlay';
import { Spinner } from './Spinner';
import { WizardPrefillData } from './WelcomeScreen';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';

interface ProjectWizardProps {
    initialData: { name: string; prompt: string; prefill?: WizardPrefillData };
    onCreateProject: (name: string, finalPrompt: string) => void;
    onCancel: () => void;
    isLoading: boolean;
    logoUrl: string;
}

interface Section {
    name: string;
    description: string;
}

const backgroundSuggestions = [
    'A light gray to white vertical gradient',
    'Dark charcoal or navy blue theme',
    'A clean, minimalist white background',
    'Warm, parchment paper-like texture',
    'Professional dark blue with subtle patterns'
];

const googleFonts = [
    "Roboto", "Open Sans", "Lato", "Montserrat", "Oswald", "Source Sans Pro",
    "Slabo 27px", "Raleway", "PT Sans", "Merriweather", "Noto Sans", "Poppins",
    "Ubuntu", "Playfair Display", "Roboto Condensed", "Roboto Slab", "Lora",
    "Inter", "Nunito", "Bricolage Grotesque", "Source Code Pro", "Fira Code",
    "Work Sans", "Nunito Sans", "Quicksand", "Karla", "Inconsolata", "Rubik",
    "DM Sans", "Arimo"
];

const PREDEFINED_SECTIONS: { [key: string]: string } = {
    features: 'Features',
    pricing: 'Pricing',
    testimonials: 'Testimonials',
    about: 'About Us',
    contact: 'Contact Form',
    faq: 'FAQ',
    gallery: 'Gallery',
    team: 'Team',
    blog: 'Blog Preview',
    footer: 'Footer',
};

export const ProjectWizard: React.FC<ProjectWizardProps> = ({ initialData, onCreateProject, onCancel, isLoading, logoUrl }) => {
    const [backgroundColor, setBackgroundColor] = useState(initialData.prefill?.backgroundColor || '');
    const [fontFamily, setFontFamily] = useState(initialData.prefill?.fontFamily || 'Bricolage Grotesque');
    const [selectedPredefined, setSelectedPredefined] = useState<{ [key: string]: boolean }>({});
    const [customSections, setCustomSections] = useState<Section[]>([]);
    const [brandContext, setBrandContext] = useState('');
    
    const [fontSearch, setFontSearch] = useState('');
    const [isFontDropdownOpen, setIsFontDropdownOpen] = useState(false);
    const fontDropdownRef = useRef<HTMLDivElement>(null);

    // Effect for pre-filling the form from a template
    useEffect(() => {
        const initialSelected: { [key: string]: boolean } = {};
        if (initialData.prefill?.predefinedSections) {
            for (const sectionKey of initialData.prefill.predefinedSections) {
                initialSelected[sectionKey] = true; 
            }
        }
        // Ensure footer is checked by default for new projects if no prefill exists
        else if (!initialData.prefill) {
             initialSelected['footer'] = true;
        }
        setSelectedPredefined(initialSelected);
        setCustomSections(initialData.prefill?.customSections || []);
    }, [initialData.prefill]);


    // Dynamically load the selected font for previewing it within the wizard UI (e.g., on the button).
    // This does not affect the main application's styling.
    useEffect(() => {
        if (!fontFamily) return;

        const fontId = 'wizard-font-preview-stylesheet';
        
        // Remove the previous font stylesheet if it exists from a prior selection.
        const existingLink = document.getElementById(fontId);
        if (existingLink) {
            existingLink.remove();
        }
    
        const fontUrl = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, '+')}:wght@400;700&display=swap`;
        
        const link = document.createElement('link');
        link.id = fontId;
        link.rel = 'stylesheet';
        link.href = fontUrl;
        
        document.head.appendChild(link);
    
        // Cleanup: when the component unmounts, remove the stylesheet.
        return () => {
            const linkToRemove = document.getElementById(fontId);
            if (linkToRemove) {
                linkToRemove.remove();
            }
        };
    }, [fontFamily]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (fontDropdownRef.current && !fontDropdownRef.current.contains(event.target as Node)) {
                setIsFontDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handlePredefinedSectionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setSelectedPredefined(prev => ({ ...prev, [name]: checked }));
    };

    const handleCustomSectionChange = (index: number, field: 'name' | 'description', value: string) => {
        const newSections = [...customSections];
        newSections[index][field] = value;
        setCustomSections(newSections);
    };

    const addCustomSection = () => {
        setCustomSections(prev => [...prev, { name: '', description: '' }]);
    };
    
    const removeCustomSection = (index: number) => {
        setCustomSections(prev => prev.filter((_, i) => i !== index));
    };

    const handleFontSelect = (font: string) => {
        setFontFamily(font);
        setIsFontDropdownOpen(false);
        setFontSearch('');
    };

    const filteredFonts = useMemo(() =>
        googleFonts.filter(font => font.toLowerCase().includes(fontSearch.toLowerCase())),
        [fontSearch]
    );

    const fontSuggestions = useMemo(() => {
        const promptText = initialData.prompt.toLowerCase();
        if (promptText.includes('portfolio') || promptText.includes('developer')) return ["Source Code Pro", "Inter", "Roboto"];
        if (promptText.includes('saas') || promptText.includes('product')) return ["Inter", "Poppins", "Montserrat"];
        if (promptText.includes('blog') || promptText.includes('recipe')) return ["Playfair Display", "Lora", "Merriweather"];
        return ["Bricolage Grotesque", "Playfair Display", "Roboto"];
    }, [initialData.prompt]);


    const buildFinalPrompt = (): string => {
        const selectedPredefinedList = Object.entries(selectedPredefined)
            .filter(([, checked]) => checked)
            .map(([key]) => `- A "${PREDEFINED_SECTIONS[key]}" section.`);

        const customSectionsList = customSections
            .filter(section => section.name.trim() || section.description.trim())
            .map((section, index) => `
     **Custom Section ${index + 1}:**
       - **Title/Name:** "${section.name || `Unnamed Section`}"
       - **Content/Purpose:** "${section.description}"
     `.trim())
            .join('\n\n');
            
        const finalPrompt = `
You are an expert web developer creating a web application named "${initialData.name}".

**Primary Goal & Core Concept:**
${initialData.prompt}

---

**Detailed Specifications:**

**1. Visual Design & Typography:**
   - **Background:** The user wants a background described as: "${backgroundColor || 'a clean, modern default background'}". Implement this in the CSS.
   - **Typography:** The primary font for the entire application MUST be "${fontFamily}". Please import this font from Google Fonts in the HTML and apply it to the 'body' tag in the CSS.

**2. Overall Structure & Content:**
   - **Predefined Sections:**
     The following common sections MUST be included, in a logical order, after the main hero section:
     ${selectedPredefinedList.length > 0 ? selectedPredefinedList.join('\n') : '- No predefined sections were selected.'}

   - **Custom Sections:**
     ${customSectionsList || 'No custom sections were specified.'}

**3. Brand & Contextual Information:**
   - **About the Brand/Project:**
     ${brandContext || 'No additional brand context was provided.'}

---

Please generate the complete, production-ready web application with HTML, CSS, and JavaScript files based on ALL of the detailed requirements above. Ensure the design is cohesive and professional.
`;
        return finalPrompt.trim();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const finalPrompt = buildFinalPrompt();
        onCreateProject(initialData.name, finalPrompt);
    };

    return (
        <>
            <LoadingOverlay isVisible={isLoading} />
            <div className={`relative transition-all duration-300 bg-gray-100 dark:bg-zinc-900 ${isLoading ? 'blur-md' : ''} min-h-screen flex items-center justify-center px-4 py-12`}>
                <div className="w-full max-w-3xl mx-auto">
                    <div className="text-center mb-8">
                        <img src={logoUrl} alt="TheVibeCoders Logo" className="w-16 h-16 rounded-2xl mb-4 inline-block" />
                        <h1 className="text-4xl font-bold text-gray-900 dark:text-zinc-100 tracking-tight">Add More Details</h1>
                        <p className="mt-3 text-lg text-gray-600 dark:text-zinc-400">Provide more specific details for a better result.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-800 p-8 rounded-2xl shadow-lg border border-gray-200 dark:border-zinc-700 flex flex-col gap-8">
                        {/* Design Section */}
                        <fieldset>
                            <legend className="text-lg font-semibold text-gray-800 dark:text-zinc-200 mb-4">Design & Style</legend>
                            <div className="flex flex-col gap-6">
                                <div>
                                    <label htmlFor="background-color" className="block text-sm font-semibold text-gray-800 dark:text-zinc-200 mb-2">Background</label>
                                    <input id="background-color" type="text" value={backgroundColor} onChange={e => setBackgroundColor(e.target.value)} placeholder="e.g., A light blue to white vertical gradient" className="w-full p-3 border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 rounded-lg" />
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        {backgroundSuggestions.map((suggestion) => (
                                            <button
                                                key={suggestion}
                                                type="button"
                                                onClick={() => setBackgroundColor(suggestion)}
                                                className="text-xs bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-zinc-200 hover:bg-gray-300 dark:hover:bg-zinc-600 px-2.5 py-1 rounded-full transition-colors"
                                            >
                                                {suggestion}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-800 dark:text-zinc-200 mb-2">Typography</label>
                                    <div ref={fontDropdownRef} className="relative">
                                        <button type="button" onClick={() => setIsFontDropdownOpen(prev => !prev)} className="w-full flex justify-between items-center text-left p-3 border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 rounded-lg">
                                            <span style={{ fontFamily: `'${fontFamily}', sans-serif` }}>{fontFamily}</span>
                                            <ChevronDownIcon className={`w-5 h-5 text-gray-500 dark:text-zinc-400 transition-transform ${isFontDropdownOpen ? 'rotate-180' : ''}`} />
                                        </button>
                                        {isFontDropdownOpen && (
                                            <div className="absolute z-10 top-full mt-2 w-full bg-white dark:bg-zinc-800 rounded-md shadow-lg border border-gray-200 dark:border-zinc-700">
                                                <div className="p-2">
                                                    <input type="text" value={fontSearch} onChange={e => setFontSearch(e.target.value)} placeholder="Search fonts..." className="w-full p-2 text-sm border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 rounded-md" />
                                                </div>
                                                <ul className="max-h-60 overflow-y-auto p-1">
                                                    {filteredFonts.map(font => (
                                                        <li key={font}>
                                                            <button type="button" onClick={() => handleFontSelect(font)} className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-zinc-700" style={{ fontFamily: `'${font}', sans-serif` }}>{font}</button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        <span className="text-xs text-gray-500 dark:text-zinc-400 self-center">Suggestions:</span>
                                        {fontSuggestions.map((suggestion) => (
                                            <button
                                                key={suggestion}
                                                type="button"
                                                onClick={() => handleFontSelect(suggestion)}
                                                className="text-xs bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-zinc-200 hover:bg-gray-300 dark:hover:bg-zinc-600 px-2.5 py-1 rounded-full transition-colors"
                                            >
                                                {suggestion}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </fieldset>

                        {/* Structure Section */}
                        <fieldset>
                            <legend className="text-lg font-semibold text-gray-800 dark:text-zinc-200 mb-4">App Structure</legend>
                            <div className="flex flex-col gap-6">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-800 dark:text-zinc-200 mb-2">Predefined Sections</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-3">
                                        {Object.entries(PREDEFINED_SECTIONS).map(([key, label]) => (
                                            <div key={key} className="flex items-center">
                                                <input id={`predefined-${key}`} name={key} type="checkbox" checked={!!selectedPredefined[key]} onChange={handlePredefinedSectionChange} className="h-4 w-4 text-gray-800 dark:text-zinc-200 border-gray-300 dark:border-zinc-500 rounded focus:ring-gray-900 dark:focus:ring-zinc-100" />
                                                <label htmlFor={`predefined-${key}`} className="ml-2 block text-sm text-gray-800 dark:text-zinc-300">{label}</label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-800 dark:text-zinc-200 mb-2">Custom Sections</label>
                                    <div className="flex flex-col gap-4">
                                        {customSections.map((section, index) => (
                                            <div key={index} className="p-4 border border-gray-200 dark:border-zinc-700 rounded-lg animate-fade-in flex flex-col gap-3 bg-gray-50 dark:bg-zinc-800/50 relative">
                                                <h4 className="text-sm font-semibold text-gray-800 dark:text-zinc-200">Custom Section {index + 1}</h4>
                                                <input type="text" value={section.name} onChange={e => handleCustomSectionChange(index, 'name', e.target.value)} placeholder="Section Name (e.g., Our Mission)" className="w-full p-2 text-sm border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 rounded-md" />
                                                <textarea value={section.description} onChange={e => handleCustomSectionChange(index, 'description', e.target.value)} placeholder="Describe what this section is about..." rows={2} className="w-full p-2 text-sm border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 rounded-md resize-y" />
                                                <button type="button" onClick={() => removeCustomSection(index)} className="absolute top-2 right-2 p-1.5 text-gray-500 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-full" aria-label={`Remove custom section ${index + 1}`}>
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                        <button type="button" onClick={addCustomSection} className="w-full flex items-center justify-center gap-2 text-sm font-medium p-2 border-2 border-dashed border-gray-300 dark:border-zinc-600 text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg transition-colors">
                                            <PlusIcon className="w-4 h-4" />
                                            Add Custom Section
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </fieldset>

                        {/* Context Section */}
                        <fieldset>
                            <legend className="text-lg font-semibold text-gray-800 dark:text-zinc-200 mb-4">Additional Context</legend>
                            <div>
                                <label htmlFor="brand-context" className="block text-sm font-semibold text-gray-800 dark:text-zinc-200 mb-2">Brand Information / Profile</label>
                                <textarea id="brand-context" value={brandContext} onChange={e => setBrandContext(e.target.value)} placeholder="Provide any details about your brand, target audience, tone of voice, etc." rows={4} className="w-full p-3 border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 rounded-lg resize-y" />
                            </div>
                        </fieldset>
                        
                        <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:gap-3 pt-4 border-t border-gray-200 dark:border-zinc-700">
                             <button type="button" onClick={onCancel} disabled={isLoading} className="w-full sm:w-auto mt-3 sm:mt-0 justify-center flex items-center bg-white dark:bg-zinc-700 text-gray-800 dark:text-zinc-200 font-semibold py-3 px-4 rounded-lg border border-gray-300 dark:border-zinc-600 hover:bg-gray-100 dark:hover:bg-zinc-600 transition-colors">
                                Back
                            </button>
                            <button type="submit" disabled={isLoading} className="w-full sm:w-auto justify-center flex items-center bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold py-3 px-4 rounded-lg hover:bg-gray-700 dark:hover:bg-zinc-300 disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
                                {isLoading ? (<><Spinner /> Generating...</>) : 'Generate App'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
};
