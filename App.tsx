import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';

import { Header } from './components/Header';
import { PromptInput } from './components/PromptInput';
import { CodeDisplay } from './components/CodeDisplay';
import { LivePreview } from './components/LivePreview';
import { generateWebApp, File, Suggestion, generateSuggestions } from './services/geminiService';
import { Spinner } from './components/Spinner';
import { FullScreenIcon } from './components/icons/FullScreenIcon';
import { WelcomeScreen, WizardPrefillData } from './components/WelcomeScreen';
import { ProjectsSidebar } from './components/ProjectsSidebar';
import { HistorySidebar } from './components/HistorySidebar';
import { DeviceSelector, DeviceType } from './components/DeviceSelector';
import { DeleteConfirmationModal } from './components/DeleteConfirmationModal';
import { MenuIcon } from './components/icons/MenuIcon';
import { CursorClickIcon } from './components/icons/CursorClickIcon';
import { LoadingOverlay } from './components/LoadingOverlay';
import { ProjectWizard } from './components/ProjectWizard';

type ActiveTab = 'preview' | 'code';
type SelectedElement = { selector: string; html: string };

export interface HistoryEntry {
    files: File[];
    prompt: string;
    timestamp: number;
}

export interface Project {
    id: string;
    name: string;
    initialPrompt: string;
    codeHistory: {
        history: HistoryEntry[];
        currentIndex: number;
    };
}

const LOGO_URL = "https://styles.redditmedia.com/t5_2qh32/styles/communityIcon_4ke1237b6a841.png";

const App: React.FC = () => {
    const [projects, setProjects] = useState<Project[]>(() => {
        try {
            const localData = localStorage.getItem('thevibeCodersProjects');
            return localData ? JSON.parse(localData) : [];
        } catch (error) {
            console.error("Could not parse projects from localStorage", error);
            return [];
        }
    });
    const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<ActiveTab>('preview');
    const [isProjectsSidebarOpen, setProjectsSidebarOpen] = useState<boolean>(false); // Default to closed
    const [isSidebarHovered, setSidebarHovered] = useState<boolean>(false);
    const [isHistorySidebarOpen, setHistorySidebarOpen] = useState<boolean>(false);
    const [previewDevice, setPreviewDevice] = useState<DeviceType>('current');
    const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState<boolean>(false);
    const [isSelectionModeActive, setIsSelectionModeActive] = useState<boolean>(false);
    const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);

    const [wizardData, setWizardData] = useState<{ name: string; prompt: string; prefill?: WizardPrefillData } | null>(null);
    
    const [isDragging, setIsDragging] = useState(false);
    const [leftPanelWidth, setLeftPanelWidth] = useState(33.33);
    const mainRef = useRef<HTMLDivElement>(null);
    const previewContainerRef = useRef<HTMLDivElement>(null);

    const activeProject = useMemo(() => {
        return projects.find(p => p.id === activeProjectId);
    }, [projects, activeProjectId]);
    
    const currentFiles = activeProject?.codeHistory.history[activeProject.codeHistory.currentIndex]?.files || [];
    const isEditing = !!currentFiles && currentFiles.length > 0;
    const canUndo = (activeProject?.codeHistory.currentIndex ?? 0) > 0;
    const canRedo = activeProject ? activeProject.codeHistory.currentIndex < activeProject.codeHistory.history.length - 1 : false;
    
    useEffect(() => {
        try {
            localStorage.setItem('thevibeCodersProjects', JSON.stringify(projects));
        } catch (error) {
            console.error("Could not save projects to localStorage", error);
        }
    }, [projects]);


    useEffect(() => {
        const fetchSuggestions = async () => {
            if (activeProject && currentFiles.length > 0) {
                setIsGeneratingSuggestions(true);
                setSuggestions([]); // Clear old suggestions
                try {
                    const newSuggestions = await generateSuggestions(currentFiles);
                    setSuggestions(newSuggestions);
                } catch (e) {
                    console.error("Failed to generate suggestions", e);
                } finally {
                    setIsGeneratingSuggestions(false);
                }
            } else {
                setSuggestions([]); // Clear suggestions if no active project or no files
            }
        };
    
        fetchSuggestions();
    }, [activeProject, activeProject?.codeHistory.currentIndex]);
    
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data && event.data.type === 'elementSelected') {
                const { selector, html } = event.data.payload;
                setSelectedElement({ selector, html });
                setIsSelectionModeActive(false); 
            }
        };

        window.addEventListener('message', handleMessage);
        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, []);

    const handleToggleSelectionMode = () => {
        setIsSelectionModeActive(prev => {
            const newMode = !prev;
            if (!newMode) {
                setSelectedElement(null);
            }
            return newMode;
        });
    };
    
    const handleStartWizard = (name: string, prompt: string, prefill?: WizardPrefillData) => {
        setWizardData({ name, prompt, prefill });
    };

    const handleCancelWizard = () => {
        setWizardData(null);
    };
    
    const handleCreateProject = useCallback(async (name: string, finalPrompt: string) => {
        setIsLoading(true);
        setError(null);
        setActiveTab('preview');
        
        try {
            const files = await generateWebApp(finalPrompt);
            const newEntry: HistoryEntry = { files, prompt: finalPrompt, timestamp: Date.now() };
            
            const newProject: Project = {
                id: Date.now().toString() + Math.random().toString(36).substring(2),
                name,
                initialPrompt: finalPrompt,
                codeHistory: { history: [newEntry], currentIndex: 0 },
            };

            setProjects(prev => [...prev, newProject]);
            setActiveProjectId(newProject.id);
            setProjectsSidebarOpen(false);
        } catch (e) {
            console.error(e);
            setError('Failed to generate the web app. Please check your API key and try again.');
        } finally {
            setIsLoading(false);
            setWizardData(null);
        }
    }, []);

    const handleGenerate = useCallback(async (prompt: string) => {
        if (!prompt || isLoading || !activeProject) return;

        setIsLoading(true);
        setError(null);
        setActiveTab('preview');
        
        let finalPrompt = prompt;
        if (selectedElement) {
            finalPrompt = `The user has selected a specific element on the page to modify.
- CSS Selector: \`${selectedElement.selector}\`
- Element HTML: \`\`\`html\n${selectedElement.html}\n\`\`\`

With this context, apply the following change: "${prompt}"`;
        }


        try {
            const files = await generateWebApp(finalPrompt, isEditing ? currentFiles : undefined);
            const newEntry: HistoryEntry = { files, prompt: prompt, timestamp: Date.now() };

            const updatedProject = { ...activeProject };
            const newHistory = updatedProject.codeHistory.history.slice(0, updatedProject.codeHistory.currentIndex + 1);
            newHistory.push(newEntry);
            updatedProject.codeHistory = {
                history: newHistory,
                currentIndex: newHistory.length - 1,
            };

            setProjects(prevProjects => prevProjects.map(p => 
                p.id === updatedProject.id ? updatedProject : p
            ));
             setSelectedElement(null);
        } catch (e) {
            console.error(e);
            setError('Failed to generate the web app. Please check your API key and try again.');
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, activeProject, currentFiles, isEditing, selectedElement]);

    const handleFilesChange = useCallback((newFiles: File[]) => {
        if (!activeProject) return;
        
        const updatedProject = { ...activeProject };
        const newHistory = updatedProject.codeHistory.history.slice(0, updatedProject.codeHistory.currentIndex + 1);
        const newEntry: HistoryEntry = {
            files: newFiles,
            prompt: "Manual code edit",
            timestamp: Date.now()
        };
        newHistory.push(newEntry);
        updatedProject.codeHistory = {
            history: newHistory,
            currentIndex: newHistory.length - 1,
        };
        setProjects(prevProjects => prevProjects.map(p => p.id === updatedProject.id ? updatedProject : p));
    }, [activeProject]);

    const handleRestoreVersion = useCallback((indexToRestore: number) => {
        if (!activeProject) return;

        const versionToRestore = activeProject.codeHistory.history[indexToRestore];
        if (!versionToRestore) return;

        const newEntry: HistoryEntry = {
            files: versionToRestore.files,
            prompt: `Restored from version created at ${new Date(versionToRestore.timestamp).toLocaleTimeString()}`,
            timestamp: Date.now()
        };
        
        const updatedProject = { ...activeProject };
        const newHistory = updatedProject.codeHistory.history.slice(0, updatedProject.codeHistory.currentIndex + 1);
        newHistory.push(newEntry);
        updatedProject.codeHistory = {
            history: newHistory,
            currentIndex: newHistory.length - 1,
        };

        setProjects(prevProjects => prevProjects.map(p => p.id === updatedProject.id ? updatedProject : p));
        setHistorySidebarOpen(false);
    }, [activeProject]);
    
    const updateCurrentIndex = (newIndex: number) => {
        if (!activeProject) return;
        const updatedProject = { 
            ...activeProject, 
            codeHistory: { ...activeProject.codeHistory, currentIndex: newIndex }
        };
        setProjects(prevProjects => prevProjects.map(p => p.id === updatedProject.id ? updatedProject : p));
    };

    const handleUndo = useCallback(() => {
        if (canUndo && activeProject) {
            updateCurrentIndex(activeProject.codeHistory.currentIndex - 1);
        }
    }, [canUndo, activeProject]);

    const handleRedo = useCallback(() => {
        if (canRedo && activeProject) {
            updateCurrentIndex(activeProject.codeHistory.currentIndex + 1);
        }
    }, [canRedo, activeProject]);


    const handleSelectProject = (projectId: string) => {
        setActiveProjectId(projectId);
        setProjectsSidebarOpen(false);
        setSidebarHovered(false);
        setSelectedElement(null);
        setIsSelectionModeActive(false);
    };

    const handleCreateNewApp = () => {
        setActiveProjectId(null);
        setProjectsSidebarOpen(true);
    };

    const handleRenameProject = useCallback(async (projectId: string, newName: string) => {
        const projectToUpdate = projects.find(p => p.id === projectId);
        if (!projectToUpdate) return;

        const updatedProject = { ...projectToUpdate, name: newName };
        setProjects(prevProjects =>
            prevProjects.map(p =>
                p.id === projectId ? updatedProject : p
            )
        );
    }, [projects]);

    const handleDeleteProject = useCallback(async (projectId: string) => {
        setProjects(prevProjects => {
            const newProjects = prevProjects.filter(p => p.id !== projectId);
            if (projectId === activeProjectId) {
                setActiveProjectId(null);
            }
            return newProjects;
        });
    }, [activeProjectId]);

    const handleCloneProject = useCallback(async (projectId: string) => {
        const projectToClone = projects.find(p => p.id === projectId);
        if (!projectToClone) return;

        const clonedProject: Project = {
            ...JSON.parse(JSON.stringify(projectToClone)),
            id: Date.now().toString() + Math.random().toString(36).substring(2),
            name: `${projectToClone.name} Copy`,
        };
        
        setProjects(prevProjects => [...prevProjects, clonedProject]);
        setActiveProjectId(clonedProject.id);
    }, [projects]);

    const handleDeleteConfirm = () => {
        if (projectToDelete) {
            handleDeleteProject(projectToDelete.id);
            setProjectToDelete(null);
        }
    };
    
    const handleToggleSidebar = useCallback(() => {
        const willBeOpen = !isProjectsSidebarOpen;
        setProjectsSidebarOpen(willBeOpen);
        if (willBeOpen) {
            setSidebarHovered(false);
        }
    }, [isProjectsSidebarOpen]);

    const handleMouseDown = useCallback(() => setIsDragging(true), []);
    const handleMouseUp = useCallback(() => setIsDragging(false), []);
    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging || !mainRef.current) return;
        const bounds = mainRef.current.getBoundingClientRect();
        const newWidth = ((e.clientX - bounds.left) / bounds.width) * 100;
        setLeftPanelWidth(Math.max(25, Math.min(75, newWidth)));
    }, [isDragging]);

    const handleFullScreen = () => {
        if (previewContainerRef.current) {
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                previewContainerRef.current.requestFullscreen().catch(err => {
                    console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
                });
            }
        }
    };

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, handleMouseMove, handleMouseUp]);

    if (wizardData) {
        return (
            <ProjectWizard
                initialData={wizardData}
                onCreateProject={handleCreateProject}
                onCancel={handleCancelWizard}
                isLoading={isLoading}
                logoUrl={LOGO_URL}
            />
        );
    }
    
    if (projects.length === 0) {
        return <WelcomeScreen onFormSubmit={handleStartWizard} isLoading={isLoading} logoUrl={LOGO_URL} isStandalone />;
    }
    
    const isSidebarEffectivelyOpen = isProjectsSidebarOpen || isSidebarHovered;
    
    return (
        <div className="min-h-screen flex flex-col bg-gray-100 text-gray-900 dark:bg-zinc-900 dark:text-zinc-100">
            <div className="flex flex-grow overflow-hidden">
                <ProjectsSidebar 
                    isOpen={isSidebarEffectivelyOpen}
                    onClose={() => setProjectsSidebarOpen(false)}
                    onMouseLeave={() => {
                        if (!isProjectsSidebarOpen) {
                            setSidebarHovered(false);
                        }
                    }}
                    projects={projects}
                    activeProjectId={activeProjectId}
                    onSelectProject={handleSelectProject}
                    onCreateNew={handleCreateNewApp}
                    onRenameProject={handleRenameProject}
                    onSetProjectToDelete={setProjectToDelete}
                    onCloneProject={handleCloneProject}
                />
                
                <div className="flex-grow flex flex-col overflow-hidden">
                    {activeProject && (
                        <Header 
                            projectName={activeProject.name}
                            onToggleSidebar={handleToggleSidebar}
                            activeProjectId={activeProject.id}
                            onRenameProject={handleRenameProject}
                            onCloneProject={handleCloneProject}
                            onSetProjectToDelete={() => setProjectToDelete(activeProject)}
                        />
                    )}
                    
                    <div className="relative flex-grow flex flex-row overflow-hidden">
                         {!isProjectsSidebarOpen &&
                            <div
                                className="absolute left-0 top-0 h-full w-4 z-20"
                                onMouseEnter={() => setSidebarHovered(true)}
                            ></div>
                        }

                        {!activeProject && (
                            <div className="absolute top-0 left-0 p-4 z-10">
                                <button
                                    onClick={handleToggleSidebar}
                                    className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-zinc-100"
                                    aria-label="Toggle projects sidebar"
                                >
                                    <MenuIcon className="w-5 h-5" />
                                </button>
                            </div>
                        )}

                        {activeProject ? (
                            <>
                                <HistorySidebar
                                    isOpen={isHistorySidebarOpen}
                                    onClose={() => setHistorySidebarOpen(false)}
                                    history={activeProject.codeHistory.history}
                                    currentIndex={activeProject.codeHistory.currentIndex}
                                    onRestore={handleRestoreVersion}
                                />
                                <main ref={mainRef} className="flex-grow flex flex-row overflow-hidden">
                                    <div id="left-panel" className="flex flex-col gap-4 p-4 lg:p-6 h-full overflow-y-auto" style={{ width: `${leftPanelWidth}%`}}>
                                        <PromptInput
                                            initialPrompt={activeProject.initialPrompt}
                                            isEditing={isEditing}
                                            onGenerate={handleGenerate}
                                            isLoading={isLoading}
                                            onToggleHistory={() => setHistorySidebarOpen(prev => !prev)}
                                            suggestions={suggestions}
                                            isGeneratingSuggestions={isGeneratingSuggestions}
                                            onDismissSuggestions={() => setSuggestions([])}
                                            selectedElement={selectedElement}
                                            onClearSelection={() => setSelectedElement(null)}
                                        />
                                        {error && <div role="alert" className="text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30 p-3 rounded-md">{error}</div>}
                                    </div>
                                    
                                    <div 
                                        role="separator"
                                        aria-orientation="vertical"
                                        className="w-1.5 bg-gray-300 dark:bg-zinc-700 cursor-col-resize hover:bg-gray-400 dark:hover:bg-zinc-600 focus:bg-blue-500 dark:focus:bg-blue-400 focus:outline-none transition-colors"
                                        onMouseDown={handleMouseDown}
                                        tabIndex={0}
                                        aria-label="Resize panels"
                                    />

                                    <div id="right-panel" className="flex flex-col flex-grow" style={{ width: `${100 - leftPanelWidth}%`}}>
                                        <div role="tablist" aria-label="Output view" className="flex justify-between items-center p-2 px-4 bg-gray-200 dark:bg-zinc-800 border-b border-l border-gray-300 dark:border-zinc-700">
                                            <div className="flex items-center gap-2">
                                            <button 
                                                    role="tab"
                                                    aria-selected={activeTab === 'preview'}
                                                    onClick={() => setActiveTab('preview')} 
                                                    className={`px-3 py-1 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-900 dark:focus:ring-zinc-100 dark:focus:ring-offset-zinc-800 ${activeTab === 'preview' ? 'bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 shadow-sm' : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-300 dark:hover:bg-zinc-700'}`}
                                                >
                                                    <span aria-hidden="true" className="mr-1.5">•</span>
                                                    Preview
                                            </button>
                                            <button 
                                                    role="tab"
                                                    aria-selected={activeTab === 'code'}
                                                    onClick={() => setActiveTab('code')} 
                                                    className={`px-3 py-1 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-900 dark:focus:ring-zinc-100 dark:focus:ring-offset-zinc-800 ${activeTab === 'code' ? 'bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 shadow-sm' : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-300 dark:hover:bg-zinc-700'}`}
                                            >
                                                    Code
                                            </button>
                                            </div>
                                            {activeTab === 'preview' && (
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={handleToggleSelectionMode}
                                                        className={`flex items-center gap-2 px-3 py-1 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-900 dark:focus:ring-zinc-100 dark:focus:ring-offset-zinc-800 transition-colors ${
                                                            isSelectionModeActive 
                                                            ? 'bg-blue-600 text-white hover:bg-blue-500' 
                                                            : 'text-gray-700 dark:text-zinc-300 hover:bg-gray-300 dark:hover:bg-zinc-700'
                                                        }`}
                                                        aria-label="Toggle element selection mode"
                                                        aria-pressed={isSelectionModeActive}
                                                    >
                                                        <CursorClickIcon aria-hidden="true" className="w-4 h-4" />
                                                        Select
                                                    </button>
                                                    <DeviceSelector selectedDevice={previewDevice} onSelectDevice={setPreviewDevice} />
                                                    <button 
                                                        onClick={handleFullScreen} 
                                                        className="flex items-center gap-2 px-3 py-1 text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-300 dark:hover:bg-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-900 dark:focus:ring-zinc-100 dark:focus:ring-offset-zinc-800"
                                                        aria-label="Enter full screen preview"
                                                    >
                                                        <FullScreenIcon aria-hidden="true" className="w-4 h-4" />
                                                        Full Screen
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <div ref={previewContainerRef} className="flex-grow bg-white dark:bg-zinc-900 border-l border-gray-300 dark:border-zinc-700 relative">
                                            {isLoading ? (
                                                <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-zinc-900/50">
                                                    <Spinner />
                                                </div>
                                            ) : null}
                                            <div className={`w-full h-full transition-all duration-300 mx-auto ${previewDevice === 'mobile' ? 'max-w-sm' : ''} ${previewDevice === 'tablet' ? 'max-w-3xl' : ''}`}>
                                                {activeTab === 'preview' && (
                                                    <LivePreview files={currentFiles} isSelectionModeActive={isSelectionModeActive} />
                                                )}
                                                {activeTab === 'code' && (
                                                    <CodeDisplay 
                                                        files={currentFiles} 
                                                        onFilesChange={handleFilesChange}
                                                        onUndo={handleUndo}
                                                        onRedo={handleRedo}
                                                        canUndo={canUndo}
                                                        canRedo={canRedo}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </main>
                            </>
                        ) : (
                            <main className="flex-grow overflow-y-auto">
                                <WelcomeScreen 
                                    onFormSubmit={handleStartWizard} 
                                    isLoading={isLoading} 
                                    logoUrl={LOGO_URL} 
                                />
                            </main>
                        )}
                    </div>
                </div>
            </div>
            {projectToDelete && (
                <DeleteConfirmationModal
                    isOpen={!!projectToDelete}
                    onClose={() => setProjectToDelete(null)}
                    onConfirm={handleDeleteConfirm}
                    projectName={projectToDelete.name}
                />
            )}
        </div>
    );
};

export default App;