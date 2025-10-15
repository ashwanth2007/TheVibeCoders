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

const App: React.FC = () => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
    const [prompt, setPrompt] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<ActiveTab>('preview');
    const [isProjectsSidebarOpen, setProjectsSidebarOpen] = useState<boolean>(true);
    const [isHistorySidebarOpen, setHistorySidebarOpen] = useState<boolean>(false);
    
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
        }
        if (activeProjectId) {
            localStorage.setItem('activeProjectId', activeProjectId);
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
            setProjectsSidebarOpen(true);
            setPrompt('');
        } catch (e) {
            console.error(e);
            setError('Failed to generate the web app. Please check your API key and try again.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleGenerate = useCallback(async () => {
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
            setPrompt(''); // Clear input for next edit
        } catch (e) {
            console.error(e);
            setError('Failed to generate the web app. Please check your API key and try again.');
        } finally {
            setIsLoading(false);
        }
    }, [prompt, isLoading, activeProject, currentFiles, isEditing]);

    const handleResetProject = useCallback(() => {
        if (!activeProjectId) return;
        // This effectively clears the project, ready for regeneration.
        const originalProject = projects.find(p => p.id === activeProjectId);
        if (originalProject) {
            handleCreateProject(originalProject.name, originalProject.initialPrompt);
        }
        setPrompt('');
        setError(null);
        setActiveTab('preview');
    }, [activeProjectId, projects, handleCreateProject]);

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
        return <WelcomeScreen onCreateProject={handleCreateProject} isLoading={isLoading} />;
    }
    
    if (!activeProject && projects.length > 0) {
        return <WelcomeScreen onCreateProject={handleCreateProject} isLoading={isLoading} />;
    }
    
    if (!activeProject) {
        return <div className="flex items-center justify-center h-screen">Error: No active project selected.</div>;
    }

    return (
        <div className="min-h-screen flex flex-col bg-gray-100 text-gray-900">
            <Header 
                projectName={activeProject.name}
                onToggleSidebar={() => setProjectsSidebarOpen(prev => !prev)}
            />
            <div className="flex flex-grow overflow-hidden">
                <ProjectsSidebar 
                    isOpen={isProjectsSidebarOpen}
                    onClose={() => setProjectsSidebarOpen(false)}
                    projects={projects}
                    activeProjectId={activeProjectId}
                    onSelectProject={handleSelectProject}
                    onCreateNew={handleCreateNewApp}
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
                            prompt={prompt}
                            setPrompt={setPrompt}
                            initialPrompt={activeProject.initialPrompt}
                            isEditing={isEditing}
                            onGenerate={handleGenerate}
                            onStartOver={handleResetProject}
                            isLoading={isLoading}
                            onToggleHistory={() => setHistorySidebarOpen(prev => !prev)}
                        />
                        {error && <div role="alert" className="text-red-600 bg-red-100 p-3 rounded-md">{error}</div>}
                    </div>
                    
                    <div 
                        role="separator"
                        aria-orientation="vertical"
                        className="w-1.5 bg-gray-300 cursor-col-resize hover:bg-gray-400 focus:bg-blue-500 focus:outline-none transition-colors"
                        onMouseDown={handleMouseDown}
                        tabIndex={0}
                        aria-label="Resize panels"
                    />

                    <div id="right-panel" className="flex flex-col flex-grow" style={{ width: `${100 - leftPanelWidth}%`}}>
                        <div role="tablist" aria-label="Output view" className="flex justify-between items-center p-2 px-4 bg-gray-200 border-b border-l border-gray-300">
                            <div className="flex items-center gap-2">
                            <button 
                                    role="tab"
                                    aria-selected={activeTab === 'preview'}
                                    onClick={() => setActiveTab('preview')} 
                                    className={`px-3 py-1 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-900 ${activeTab === 'preview' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:bg-gray-300'}`}
                                >
                                    <span aria-hidden="true" className="mr-1.5">•</span>
                                    Preview
                            </button>
                            <button 
                                    role="tab"
                                    aria-selected={activeTab === 'code'}
                                    onClick={() => setActiveTab('code')} 
                                    className={`px-3 py-1 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-900 ${activeTab === 'code' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:bg-gray-300'}`}
                            >
                                    Code
                            </button>
                            </div>
                            {activeTab === 'preview' && (
                                <button 
                                    onClick={handleFullScreen} 
                                    className="flex items-center gap-2 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-900"
                                    aria-label="Enter full screen preview"
                                >
                                    <FullScreenIcon aria-hidden="true" className="w-4 h-4" />
                                    Full screen
                                </button>
                            )}
                        </div>
                        <div className="relative w-full h-full flex-grow bg-white border-l border-gray-300">
                            {isLoading && (
                                <div role="status" className="absolute inset-0 flex items-center justify-center bg-gray-100/80 backdrop-blur-sm z-20">
                                <div className="text-center">
                                        <Spinner />
                                        <p className="mt-2 text-gray-700">{isEditing ? 'Applying changes...' : 'Generating your app...'}</p>
                                        <p className="text-sm text-gray-600">This might take a moment.</p>
                                </div>
                                </div>
                            )}
                            <div 
                                ref={previewContainerRef} 
                                className={`w-full h-full ${activeTab === 'preview' ? 'block' : 'hidden'}`}
                            >
                                <LivePreview files={currentFiles} />
                            </div>
                            <div className={`w-full h-full ${activeTab === 'code' ? 'block' : 'hidden'}`}>
                                <CodeDisplay 
                                    files={currentFiles}
                                    onFilesChange={handleFilesChange}
                                    onUndo={handleUndo}
                                    onRedo={handleRedo}
                                    canUndo={canUndo}
                                    canRedo={canRedo}
                                />
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default App;