import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { PromptInput } from './components/PromptInput';
import { CodeDisplay } from './components/CodeDisplay';
import { LivePreview } from './components/LivePreview';
import { generateWebApp, File } from './services/geminiService';
import { Spinner } from './components/Spinner';
import { FullScreenIcon } from './components/icons/FullScreenIcon';
import { WelcomeScreen } from './components/WelcomeScreen';
import { ProjectsSidebar } from './components/ProjectsSidebar';
import { HistorySidebar } from './components/HistorySidebar';
import { DeviceSelector, DeviceType } from './components/DeviceSelector';
import { DeleteConfirmationModal } from './components/DeleteConfirmationModal';

type ActiveTab = 'preview' | 'code';

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
    const [projects, setProjects] = useState<Project[]>([]);
    const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<ActiveTab>('preview');
    const [isProjectsSidebarOpen, setProjectsSidebarOpen] = useState<boolean>(false);
    const [isHistorySidebarOpen, setHistorySidebarOpen] = useState<boolean>(false);
    const [previewDevice, setPreviewDevice] = useState<DeviceType>('current');
    const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

    
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
            const savedProjects = localStorage.getItem('projects');
            const savedActiveId = localStorage.getItem('activeProjectId');
            if (savedProjects) {
                const parsedProjects: any[] = JSON.parse(savedProjects);
                
                // Migration logic for old project structure
                const migratedProjects = parsedProjects.map((p): Project => {
                    if (p.codeHistory && p.codeHistory.history.length > 0) {
                        const firstEntry = p.codeHistory.history[0];
                        // Check if the first entry is an array of files (old format)
                        if (Array.isArray(firstEntry)) {
                            const newHistory: HistoryEntry[] = (p.codeHistory.history as File[][]).map((files, index) => ({
                                files: files,
                                prompt: index === 0 ? p.initialPrompt : `Legacy Version ${index + 1}`,
                                timestamp: Date.now() - (p.codeHistory.history.length - index) * 60000 // Fake timestamps
                            }));
                             // Handle case where old format had an empty initial state
                            if (newHistory.length > 0 && newHistory[0].files.length === 0) {
                                newHistory.shift();
                                p.codeHistory.currentIndex--;
                            }
                            return { ...p, codeHistory: { ...p.codeHistory, history: newHistory } };
                        }
                    }
                    return p as Project;
                });

                setProjects(migratedProjects);

                if (savedActiveId && migratedProjects.some(p => p.id === savedActiveId)) {
                    setActiveProjectId(savedActiveId);
                } else if (migratedProjects.length > 0) {
                    setActiveProjectId(migratedProjects[0].id);
                }
            }
        } catch (e) {
            console.error("Failed to parse or migrate projects from localStorage", e);
        }
    }, []);

    useEffect(() => {
        if (projects.length > 0) {
            localStorage.setItem('projects', JSON.stringify(projects));
        } else {
            localStorage.removeItem('projects');
        }

        if (activeProjectId) {
            localStorage.setItem('activeProjectId', activeProjectId);
        } else {
            localStorage.removeItem('activeProjectId');
        }
    }, [projects, activeProjectId]);
    
    const handleCreateProject = useCallback(async (name: string, initialPrompt: string) => {
        setIsLoading(true);
        setError(null);
        setActiveTab('preview');
        
        const newProject: Project = {
            id: Date.now().toString(),
            name,
            initialPrompt,
            codeHistory: { history: [], currentIndex: -1 },
        };

        try {
            const files = await generateWebApp(initialPrompt);
            const newEntry: HistoryEntry = { files, prompt: initialPrompt, timestamp: Date.now() };
            newProject.codeHistory.history.push(newEntry);
            newProject.codeHistory.currentIndex = 0;
            
            setProjects(prev => [...prev, newProject]);
            setActiveProjectId(newProject.id);
            setProjectsSidebarOpen(false);
        } catch (e) {
            console.error(e);
            setError('Failed to generate the web app. Please check your API key and try again.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleGenerate = useCallback(async (prompt: string) => {
        if (!prompt || isLoading || !activeProject) return;

        setIsLoading(true);
        setError(null);
        setActiveTab('preview');

        try {
            const files = await generateWebApp(prompt, isEditing ? currentFiles : undefined);
            const newEntry: HistoryEntry = { files, prompt, timestamp: Date.now() };

            setProjects(prevProjects => prevProjects.map(p => {
                if (p.id === activeProject.id) {
                    const newHistory = p.codeHistory.history.slice(0, p.codeHistory.currentIndex + 1);
                    newHistory.push(newEntry);
                    return {
                        ...p,
                        codeHistory: {
                            history: newHistory,
                            currentIndex: newHistory.length - 1,
                        }
                    };
                }
                return p;
            }));
        } catch (e) {
            console.error(e);
            setError('Failed to generate the web app. Please check your API key and try again.');
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, activeProject, currentFiles, isEditing]);

    const handleFilesChange = useCallback((newFiles: File[]) => {
        if (!activeProject) return;
        setProjects(prevProjects => prevProjects.map(p => {
            if (p.id === activeProject.id) {
                const newHistory = p.codeHistory.history.slice(0, p.codeHistory.currentIndex + 1);
                const newEntry: HistoryEntry = {
                    files: newFiles,
                    prompt: "Manual code edit",
                    timestamp: Date.now()
                };
                newHistory.push(newEntry);
                return {
                    ...p,
                    codeHistory: {
                        history: newHistory,
                        currentIndex: newHistory.length - 1,
                    }
                };
            }
            return p;
        }));
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

        setProjects(prevProjects => prevProjects.map(p => {
            if (p.id === activeProject.id) {
                const newHistory = p.codeHistory.history.slice(0, p.codeHistory.currentIndex + 1);
                newHistory.push(newEntry);
                return {
                    ...p,
                    codeHistory: {
                        history: newHistory,
                        currentIndex: newHistory.length - 1,
                    }
                };
            }
            return p;
        }));
        setHistorySidebarOpen(false); // Close sidebar after restoring
    }, [activeProject]);

    const handleUndo = useCallback(() => {
        if (canUndo && activeProject) {
            setProjects(prevProjects => prevProjects.map(p => 
                p.id === activeProject.id
                ? { ...p, codeHistory: { ...p.codeHistory, currentIndex: p.codeHistory.currentIndex - 1 } }
                : p
            ));
        }
    }, [canUndo, activeProject]);

    const handleRedo = useCallback(() => {
        if (canRedo && activeProject) {
            setProjects(prevProjects => prevProjects.map(p => 
                p.id === activeProject.id
                ? { ...p, codeHistory: { ...p.codeHistory, currentIndex: p.codeHistory.currentIndex + 1 } }
                : p
            ));
        }
    }, [canRedo, activeProject]);

    const handleSelectProject = (projectId: string) => {
        setActiveProjectId(projectId);
        setProjectsSidebarOpen(false); // Close on mobile after selection
    };

    const handleCreateNewApp = () => {
        setActiveProjectId(null);
        setProjectsSidebarOpen(false);
    };

    const handleRenameProject = useCallback((projectId: string, newName: string) => {
        setProjects(prevProjects =>
            prevProjects.map(p =>
                p.id === projectId ? { ...p, name: newName } : p
            )
        );
    }, []);

    const handleDeleteProject = useCallback((projectId: string) => {
        setProjects(prevProjects => {
            const projectIndex = prevProjects.findIndex(p => p.id === projectId);
            if (projectIndex === -1) return prevProjects;
    
            const newProjects = prevProjects.filter(p => p.id !== projectId);
            
            if (projectId === activeProjectId) {
                if (newProjects.length > 0) {
                    // Select the next item, or the last item if the deleted one was last
                    const newActiveIndex = Math.min(projectIndex, newProjects.length - 1);
                    setActiveProjectId(newProjects[newActiveIndex].id);
                } else {
                    setActiveProjectId(null);
                }
            }
            
            return newProjects;
        });
    }, [activeProjectId]);

    const handleCloneProject = useCallback((projectId: string) => {
        const projectToClone = projects.find(p => p.id === projectId);
        if (!projectToClone) return;

        const clonedProject: Project = {
            ...JSON.parse(JSON.stringify(projectToClone)),
            id: Date.now().toString(),
            name: `${projectToClone.name} Copy`,
        };

        setProjects(prevProjects => {
            const originalIndex = prevProjects.findIndex(p => p.id === projectId);
            const newProjects = [...prevProjects];
            newProjects.splice(originalIndex + 1, 0, clonedProject);
            return newProjects;
        });
        
        setActiveProjectId(clonedProject.id);
    }, [projects]);

    const handleDeleteConfirm = () => {
        if (projectToDelete) {
            handleDeleteProject(projectToDelete.id);
            setProjectToDelete(null);
        }
    };

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

    if (!activeProject && projects.length === 0) {
        return <WelcomeScreen onCreateProject={handleCreateProject} isLoading={isLoading} logoUrl={LOGO_URL} />;
    }
    
    if (!activeProject && projects.length > 0) {
        // This case handles the "Create New App" flow from the sidebar
        return <WelcomeScreen onCreateProject={handleCreateProject} isLoading={isLoading} logoUrl={LOGO_URL} />;
    }
    
    if (!activeProject) {
        // This case should ideally not be reached if there are projects, but is a safeguard.
        return <div className="flex items-center justify-center h-screen">Error: No active project selected.</div>;
    }

    return (
        <div className="min-h-screen flex flex-col bg-gray-100 text-gray-900 dark:bg-zinc-900 dark:text-zinc-100">
            <Header 
                projectName={activeProject.name}
                onToggleSidebar={() => setProjectsSidebarOpen(prev => !prev)}
                activeProjectId={activeProject.id}
                onRenameProject={handleRenameProject}
                onCloneProject={handleCloneProject}
                onSetProjectToDelete={() => setProjectToDelete(activeProject)}
            />
            <div className="flex flex-grow overflow-hidden">
                <ProjectsSidebar 
                    isOpen={isProjectsSidebarOpen}
                    onClose={() => setProjectsSidebarOpen(false)}
                    projects={projects}
                    activeProjectId={activeProjectId}
                    onSelectProject={handleSelectProject}
                    onCreateNew={handleCreateNewApp}
                    onRenameProject={handleRenameProject}
                    onSetProjectToDelete={setProjectToDelete}
                    onCloneProject={handleCloneProject}
                />
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
                                    <LivePreview files={currentFiles} />
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
