

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { Session } from '@supabase/supabase-js';

import { Header } from './components/Header';
import { PromptInput } from './components/PromptInput';
import { CodeDisplay } from './components/CodeDisplay';
import { LivePreview, LivePreviewHandle } from './components/LivePreview';
import { generateWebApp, File, Suggestion, generateSuggestions, discussCode, GenerationResult, initializeAi } from './services/geminiService';
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
import { DiscussionView } from './components/DiscussionView';
import { ReloadIcon } from './components/icons/ReloadIcon';
import { supabase } from './services/supabaseClient';
import { AuthScreen } from './components/AuthScreen';
import { AlertTriangleIcon } from './components/icons/AlertTriangleIcon';
import { XIcon } from './components/icons/XIcon';
import { SettingsModal } from './components/SettingsModal';

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
    discussionHistory?: Array<{ role: 'user' | 'model'; content: string }>;
    // Supabase fields
    userId: string;
    createdAt: string;
}

export interface GenerationStatus {
    stage: 'idle' | 'thinking' | 'editing' | 'applying' | 'reloading';
    message: string;
    plan?: string;
    filesBeingEdited?: { current: number; total: number };
    timer: number;
}

const LOGO_URL = "https://styles.redditmedia.com/t5_2qh32/styles/communityIcon_4ke1237b6a841.png";

const App: React.FC = () => {
    const [session, setSession] = useState<Session | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true); // Start true for session check
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<ActiveTab>('preview');
    const [isProjectsSidebarOpen, setProjectsSidebarOpen] = useState<boolean>(false);
    const [isSidebarHovered, setSidebarHovered] = useState<boolean>(false);
    const [isHistorySidebarOpen, setHistorySidebarOpen] = useState<boolean>(false);
    const [previewDevice, setPreviewDevice] = useState<DeviceType>('current');
    const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState<boolean>(false);
    const [isSelectionModeActive, setIsSelectionModeActive] = useState<boolean>(false);
    const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);
    const [isDiscussModeActive, setIsDiscussModeActive] = useState<boolean>(false);
    const [aiTargetFiles, setAiTargetFiles] = useState<File[] | undefined>(undefined);
    const [wizardData, setWizardData] = useState<{ name: string; prompt: string; prefill?: WizardPrefillData } | null>(null);
    const [initialProjectsLoaded, setInitialProjectsLoaded] = useState<boolean>(false);
    
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [isApiKeyRequired, setIsApiKeyRequired] = useState(false);
    const [isSavingApiKey, setIsSavingApiKey] = useState(false);
    const [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(null);
    
    const [isDragging, setIsDragging] = useState(false);
    const [leftPanelWidth, setLeftPanelWidth] = useState(25);
    const mainRef = useRef<HTMLDivElement>(null);
    const previewContainerRef = useRef<HTMLDivElement>(null);
    const livePreviewRef = useRef<LivePreviewHandle>(null);
    
    const [generationStatus, setGenerationStatus] = useState<GenerationStatus>({ stage: 'idle', message: '', timer: 0 });
    const timerIntervalRef = useRef<number | null>(null);
    
    // Auth and Data Loading Effect
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            const metadata = session?.user?.user_metadata;
            const apiKey = metadata?.gemini_api_key;
            initializeAi(apiKey);
            if (session && !metadata?.has_seen_api_key_prompt) {
                setIsSettingsModalOpen(true);
                setIsApiKeyRequired(false); // It's skippable on first login
            }
            setIsLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            const apiKey = session?.user?.user_metadata?.gemini_api_key;
            initializeAi(apiKey);
        });

        return () => subscription.unsubscribe();
    }, []);
    
    useEffect(() => {
        const fetchProjects = async () => {
            if (session) {
                setIsLoading(true);
                const { data, error } = await supabase
                    .from('projects')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) {
                    console.error('Error fetching projects:', error.message, error);
                    let detailedError = `An unexpected error occurred. (Details: ${error.message})`;
                    if (error.code === 'PGRST301' || error.message.includes("relation \"public.projects\" does not exist")) {
                        detailedError = "It looks like the 'projects' table is missing from your Supabase database. Please run the setup SQL provided in the documentation to create it.";
                    }
                    setError(`Could not load your projects. ${detailedError}`);
                } else {
                    // Map snake_case to camelCase
                    const fetchedProjects = data.map(p => ({
                        id: p.id,
                        name: p.name,
                        initialPrompt: p.initial_prompt,
                        codeHistory: p.code_history,
                        discussionHistory: p.discussion_history,
                        userId: p.user_id,
                        createdAt: p.created_at,
                    }));
                    setProjects(fetchedProjects);
                    if (fetchedProjects.length > 0 && !activeProjectId && !initialProjectsLoaded) {
                        setActiveProjectId(fetchedProjects[0].id);
                    }
                    setInitialProjectsLoaded(true);
                }
                setIsLoading(false);
            } else {
                // If user logs out, clear projects and state
                setProjects([]);
                setActiveProjectId(null);
                setIsLoading(false);
                setInitialProjectsLoaded(false);
            }
        };

        fetchProjects();
    }, [session]);


    const activeProject = useMemo(() => {
        return projects.find(p => p.id === activeProjectId);
    }, [projects, activeProjectId]);
    
    const currentFiles = activeProject?.codeHistory.history[activeProject.codeHistory.currentIndex]?.files || [];
    const isEditing = !!currentFiles && currentFiles.length > 0;
    const canUndo = (activeProject?.codeHistory.currentIndex ?? 0) > 0;
    const canRedo = activeProject ? activeProject.codeHistory.currentIndex < activeProject.codeHistory.history.length - 1 : false;
    
    useEffect(() => {
        const fetchSuggestions = async () => {
            if (activeProject && currentFiles.length > 0 && session?.user?.user_metadata?.gemini_api_key) {
                setIsGeneratingSuggestions(true);
                setSuggestions([]);
                try {
                    const newSuggestions = await generateSuggestions(currentFiles);
                    setSuggestions(newSuggestions);
                } catch (e) {
                    console.error("Failed to generate suggestions", e);
                } finally {
                    setIsGeneratingSuggestions(false);
                }
            } else {
                setSuggestions([]);
            }
        };
    
        fetchSuggestions();
    }, [activeProject, activeProject?.codeHistory.currentIndex, session]);
    
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

    // Effect to trigger a pending action after the API key has been successfully saved and the session has been updated.
    useEffect(() => {
        if (pendingAction && session?.user?.user_metadata?.gemini_api_key) {
            const runAction = async () => {
                setIsSettingsModalOpen(false);
                await pendingAction();
                setPendingAction(null);
            }
            runAction();
        }
    }, [session, pendingAction]);


    const handleToggleSelectionMode = () => setIsSelectionModeActive(prev => !prev);
    
    const handleStartWizard = (name: string, prompt: string, prefill?: WizardPrefillData) => setWizardData({ name, prompt, prefill });

    const handleCancelWizard = () => setWizardData(null);
    
    const checkApiKey = useCallback((action: () => Promise<void>): boolean => {
        const apiKey = session?.user?.user_metadata?.gemini_api_key;
        if (!apiKey) {
            setIsApiKeyRequired(true);
            setPendingAction(() => action); // Store the action
            setIsSettingsModalOpen(true);
            return false;
        }
        return true;
    }, [session]);

    const handleCreateProject = useCallback(async (name: string, finalPrompt: string) => {
        if (!session) return;

        const action = async () => {
            setIsLoading(true);
            setError(null);
            setActiveTab('preview');
            
            try {
                const result = await generateWebApp(finalPrompt);
                const newEntry: HistoryEntry = { files: result.files, prompt: finalPrompt, timestamp: Date.now() };
                
                const newProjectData = {
                    name,
                    initial_prompt: finalPrompt,
                    code_history: { history: [newEntry], currentIndex: 0 },
                    discussion_history: [],
                    user_id: session.user.id
                };

                const { data, error } = await supabase.from('projects').insert(newProjectData).select().single();

                if (error) throw error;
                
                const newProject: Project = {
                    id: data.id,
                    name: data.name,
                    initialPrompt: data.initial_prompt,
                    codeHistory: data.code_history,
                    discussionHistory: data.discussion_history,
                    userId: data.user_id,
                    createdAt: data.created_at,
                };

                setProjects(prev => [newProject, ...prev]);
                setActiveProjectId(newProject.id);
                setProjectsSidebarOpen(false);
            } catch (e: any) {
                console.error(e);
                setError(`Failed to create project: ${e.message}`);
            } finally {
                setIsLoading(false);
                setWizardData(null);
            }
        };
        
        if (checkApiKey(action)) {
            await action();
        }
    }, [session, checkApiKey]);
    
    const updateProjectInDb = async (project: Project) => {
        const { id, ...updateData } = project;
        const dbPayload = {
            name: updateData.name,
            initial_prompt: updateData.initialPrompt,
            code_history: updateData.codeHistory,
            discussion_history: updateData.discussionHistory,
        };
        const { error } = await supabase.from('projects').update(dbPayload).eq('id', id);
        if (error) {
            console.error('Error updating project:', error);
            setError('Failed to save changes. Please check your connection.');
        }
    };

    const handleFileAnimationStart = useCallback((path: string, index: number, total: number) => {
        setGenerationStatus(prev => ({
            ...prev,
            stage: 'editing',
            message: `Editing ${path}`,
            filesBeingEdited: { current: index, total: total }
        }));
    }, []);

    // FIX: Updated `handleAnimationComplete` to accept `animatedFiles` as an argument.
    // This makes the data flow more explicit and avoids potential stale state issues.
    const handleAnimationComplete = useCallback((animatedFiles: File[]) => {
        if (!activeProject || !animatedFiles) return;

        const runAsync = async () => {
            setGenerationStatus(prev => ({ ...prev, stage: 'applying', message: 'Applying changes...' }));
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const lastPrompt = activeProject.codeHistory.history[activeProject.codeHistory.currentIndex]?.prompt || "AI edit";
            const newEntry: HistoryEntry = { files: animatedFiles, prompt: lastPrompt, timestamp: Date.now() };
    
            const updatedProject = { ...activeProject };
            const newHistory = updatedProject.codeHistory.history.slice(0, updatedProject.codeHistory.currentIndex + 1);
            newHistory.push(newEntry);
            updatedProject.codeHistory = {
                history: newHistory,
                currentIndex: newHistory.length - 1,
            };
    
            setProjects(prevProjects => prevProjects.map(p => p.id === updatedProject.id ? updatedProject : p));
            await updateProjectInDb(updatedProject);
            
            setSelectedElement(null);
            setAiTargetFiles(undefined);
    
            setGenerationStatus(prev => ({ ...prev, stage: 'reloading', message: 'Reloading preview...' }));
            await new Promise(resolve => setTimeout(resolve, 500));
            setActiveTab('preview');
            livePreviewRef.current?.reload();
            
            await new Promise(resolve => setTimeout(resolve, 500));
            setGenerationStatus({ stage: 'idle', message: '', timer: 0 });
        };

        runAsync();
    }, [activeProject]);

    const handleGenerate = useCallback(async (prompt: string, attachments: globalThis.File[] = []) => {
        if (generationStatus.stage !== 'idle' || !prompt || !activeProject) return;

        const action = async () => {
            setError(null);

            if (isDiscussModeActive) {
                setGenerationStatus({ stage: 'thinking', message: 'Thinking...', timer: 0 });
                try {
                    const answer = await discussCode(prompt, currentFiles);
                    const userMessage = { role: 'user' as const, content: prompt };
                    const modelMessage = { role: 'model' as const, content: answer };

                    const updatedProject = { ...activeProject };
                    const newDiscussionHistory = [...(updatedProject.discussionHistory || []), userMessage, modelMessage];
                    updatedProject.discussionHistory = newDiscussionHistory;

                    setProjects(prevProjects => prevProjects.map(p => p.id === updatedProject.id ? updatedProject : p));
                    await updateProjectInDb(updatedProject);
                } catch (e: any) {
                    console.error(e);
                    setError(`Failed to get a response: ${e.message}`);
                } finally {
                    setGenerationStatus({ stage: 'idle', message: '', timer: 0 });
                }
                return;
            }
            
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = window.setInterval(() => setGenerationStatus(prev => ({ ...prev, timer: prev.timer + 1 })), 1000);

            try {
                setGenerationStatus({ stage: 'thinking', message: 'Thinking...', timer: 0 });

                let finalPrompt = prompt;
                if (selectedElement) {
                    finalPrompt = `The user has selected a specific element on the page to modify.
- CSS Selector: \`${selectedElement.selector}\`
- Element HTML: \`\`\`html\n${selectedElement.html}\n\`\`\`

With this context, apply the following change: "${prompt}"`;
                }

                const result: GenerationResult = await generateWebApp(finalPrompt, isEditing ? currentFiles : undefined, attachments);
                if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
                
                setGenerationStatus(prev => ({
                    ...prev,
                    stage: 'editing',
                    message: 'Preparing to edit files...',
                    plan: result.plan,
                    timer: prev.timer,
                    filesBeingEdited: { current: 0, total: result.files.length }
                }));
                
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                setActiveTab('code');
                setAiTargetFiles(result.files);

            } catch (e: any) {
                console.error(e);
                setError(`Failed to generate: ${e.message}`);
                if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
                setGenerationStatus({ stage: 'idle', message: '', timer: 0 });
                setAiTargetFiles(undefined);
            }
        };

        if (checkApiKey(action)) {
            await action();
        }
    }, [generationStatus.stage, activeProject, currentFiles, isEditing, selectedElement, isDiscussModeActive, checkApiKey]);

    const handleFilesChange = useCallback(async (newFiles: File[]) => {
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
        await updateProjectInDb(updatedProject);
    }, [activeProject]);

    const handleRestoreVersion = useCallback(async (indexToRestore: number) => {
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
        updatedProject.codeHistory = { history: newHistory, currentIndex: newHistory.length - 1 };

        setProjects(prevProjects => prevProjects.map(p => p.id === updatedProject.id ? updatedProject : p));
        await updateProjectInDb(updatedProject);
        setHistorySidebarOpen(false);
    }, [activeProject]);
    
    const updateCurrentIndex = async (newIndex: number) => {
        if (!activeProject) return;
        const updatedProject = { ...activeProject, codeHistory: { ...activeProject.codeHistory, currentIndex: newIndex } };
        setProjects(prevProjects => prevProjects.map(p => p.id === updatedProject.id ? updatedProject : p));
        await updateProjectInDb(updatedProject);
    };

    const handleUndo = useCallback(() => {
        if (canUndo && activeProject) updateCurrentIndex(activeProject.codeHistory.currentIndex - 1);
    }, [canUndo, activeProject]);

    const handleRedo = useCallback(() => {
        if (canRedo && activeProject) updateCurrentIndex(activeProject.codeHistory.currentIndex + 1);
    }, [canRedo, activeProject]);

    const handleSelectProject = (projectId: string) => {
        setActiveProjectId(projectId);
        setProjectsSidebarOpen(false);
        setSidebarHovered(false);
        setSelectedElement(null);
        setIsSelectionModeActive(false);
        setIsDiscussModeActive(false);
    };

    const handleCreateNewApp = () => setActiveProjectId(null);

    const handleRenameProject = useCallback(async (projectId: string, newName: string) => {
        const { error } = await supabase.from('projects').update({ name: newName }).eq('id', projectId);
        if (error) {
            console.error("Error renaming project:", error);
            setError(`Failed to rename project: ${error.message}`);
        } else {
            setProjects(prevProjects => prevProjects.map(p => p.id === projectId ? { ...p, name: newName } : p));
        }
    }, []);

    const handleCloneProject = useCallback(async (projectId: string) => {
        if (!session) return;
        const projectToClone = projects.find(p => p.id === projectId);
        if (!projectToClone) return;

        setIsLoading(true);
        try {
            const newName = `${projectToClone.name} (Copy)`;
            const newProjectData = {
                name: newName,
                initial_prompt: projectToClone.initialPrompt,
                code_history: projectToClone.codeHistory,
                discussion_history: projectToClone.discussionHistory || [],
                user_id: session.user.id
            };
            const { data, error } = await supabase.from('projects').insert(newProjectData).select().single();
            if (error) throw error;

            const newProject: Project = {
                id: data.id,
                name: data.name,
                initialPrompt: data.initial_prompt,
                codeHistory: data.code_history,
                discussionHistory: data.discussion_history,
                userId: data.user_id,
                createdAt: data.created_at,
            };
            setProjects(prev => [newProject, ...prev]);
            setActiveProjectId(newProject.id);
        } catch (e: any) {
            setError(`Failed to clone project: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    }, [projects, session]);

    const handleDeleteProject = useCallback(async () => {
        if (!projectToDelete || !session) return;
        const projectToDeleteId = projectToDelete.id;

        setIsLoading(true);
        const { error } = await supabase.from('projects').delete().eq('id', projectToDeleteId);
        
        if (error) {
            console.error('Error deleting project:', error);
            setError('Failed to delete project.');
        } else {
            const remainingProjects = projects.filter(p => p.id !== projectToDeleteId);
            setProjects(remainingProjects);
            if (activeProjectId === projectToDeleteId) {
                setActiveProjectId(remainingProjects.length > 0 ? remainingProjects[0].id : null);
            }
        }
        setProjectToDelete(null);
        setIsLoading(false);

    }, [projectToDelete, activeProjectId, projects, session]);
    
    const startDragging = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const stopDragging = useCallback(() => {
        if (isDragging) setIsDragging(false);
    }, [isDragging]);

    const onDrag = useCallback((e: MouseEvent) => {
        if (!isDragging || !mainRef.current) return;
        const bounds = mainRef.current.getBoundingClientRect();
        const newWidth = ((e.clientX - bounds.left) / bounds.width) * 100;
        if (newWidth > 20 && newWidth < 80) { // set bounds for resizing
            setLeftPanelWidth(newWidth);
        }
    }, [isDragging]);

    useEffect(() => {
        if (isDragging) {
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            document.addEventListener('mousemove', onDrag);
            document.addEventListener('mouseup', stopDragging);
        } else {
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            document.removeEventListener('mousemove', onDrag);
            document.removeEventListener('mouseup', stopDragging);
        }
        return () => {
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            document.removeEventListener('mousemove', onDrag);
            document.removeEventListener('mouseup', stopDragging);
        };
    }, [isDragging, onDrag, stopDragging]);

    const handleSaveApiKey = async (apiKey: string) => {
        if (!session) return;
        setIsSavingApiKey(true);
        
        const { error } = await supabase.auth.updateUser({
            data: { 
                gemini_api_key: apiKey,
                has_seen_api_key_prompt: true 
            }
        });
    
        if (error) {
            setError(`Failed to save API key: ${error.message}`);
            // If save fails, clear pending action so user isn't stuck
            setPendingAction(null);
        }
        // On success, the onAuthStateChange listener and the useEffect for pendingAction will handle the next steps.
        setIsSavingApiKey(false);
    };

    const handleCloseSettingsModal = async (skipped: boolean) => {
        setIsSettingsModalOpen(false);
        // If the user closes the modal, any pending action should be cancelled.
        setPendingAction(null);
        // If the user explicitly skips the initial prompt, mark it as seen.
        if (skipped && session && !session.user.user_metadata.has_seen_api_key_prompt) {
            await supabase.auth.updateUser({
                data: { has_seen_api_key_prompt: true }
            });
             // onAuthStateChange will trigger session update.
        }
    };


    if (isLoading && !session) {
        return <LoadingOverlay isVisible={true} />;
    }

    if (!session) {
        return <AuthScreen logoUrl={LOGO_URL} />;
    }
    
    // Abstracted Modal rendering
    const renderSettingsModal = () => (
        <SettingsModal
            isOpen={isSettingsModalOpen}
            onClose={handleCloseSettingsModal}
            onSave={handleSaveApiKey}
            currentApiKey={session?.user?.user_metadata?.gemini_api_key || null}
            isSkippable={!isApiKeyRequired}
            isLoading={isSavingApiKey}
        />
    );

    if (wizardData) {
        return (
            <>
                {renderSettingsModal()}
                <ProjectWizard 
                    initialData={wizardData}
                    onCreateProject={handleCreateProject}
                    onCancel={handleCancelWizard}
                    isLoading={generationStatus.stage !== 'idle' || isLoading}
                    logoUrl={LOGO_URL}
                />
            </>
        );
    }

    if (!activeProjectId && projects.length === 0 && isLoading) {
         return <LoadingOverlay isVisible={true} />;
    }

    if (!activeProjectId) {
        return (
            <>
                {renderSettingsModal()}
                <WelcomeScreen 
                    onFormSubmit={handleStartWizard} 
                    isLoading={generationStatus.stage !== 'idle'} 
                    logoUrl={LOGO_URL} 
                    isStandalone={true}
                    onOpenSettings={() => { setIsApiKeyRequired(false); setIsSettingsModalOpen(true); }}
                />
            </>
        );
    }

    if (!activeProject) {
        return <LoadingOverlay isVisible={true} />;
    }

    return (
        <div className="flex h-screen flex-col bg-gray-100 dark:bg-zinc-900 overflow-hidden relative">
            {renderSettingsModal()}
            <Header
                projectName={activeProject.name || 'New Project'}
                onToggleSidebar={() => setProjectsSidebarOpen(prev => !prev)}
                activeProjectId={activeProjectId}
                onRenameProject={handleRenameProject}
                onCloneProject={handleCloneProject}
                onSetProjectToDelete={() => setProjectToDelete(activeProject)}
                onOpenSettings={() => { setIsApiKeyRequired(false); setIsSettingsModalOpen(true); }}
                userEmail={session.user.email}
            />
            <main className="flex flex-grow overflow-hidden relative">
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
                    onMouseLeave={() => isSidebarHovered && setProjectsSidebarOpen(false)}
                />
                <div ref={mainRef} className="flex flex-grow overflow-hidden">
                    <div className="h-full flex flex-col" style={{ width: `${leftPanelWidth}%` }}>
                        <PromptInput
                            initialPrompt={activeProject.initialPrompt}
                            isEditing={isEditing}
                            onGenerate={handleGenerate}
                            isLoading={generationStatus.stage !== 'idle'}
                            onToggleHistory={() => setHistorySidebarOpen(prev => !prev)}
                            suggestions={suggestions}
                            isGeneratingSuggestions={isGeneratingSuggestions}
                            onDismissSuggestions={() => setSuggestions([])}
                            selectedElement={selectedElement}
                            onClearSelection={() => setSelectedElement(null)}
                            isDiscussModeActive={isDiscussModeActive}
                            onToggleDiscussMode={() => setIsDiscussModeActive(prev => !prev)}
                            discussionHistory={activeProject.discussionHistory || []}
                            generationStatus={generationStatus}
                        />
                    </div>
                    <div
                        onMouseDown={startDragging}
                        className="w-1.5 cursor-col-resize bg-gray-200 dark:bg-zinc-700 hover:bg-gray-900 dark:hover:bg-zinc-500 transition-colors flex-shrink-0"
                    />
                    <div className={`h-full flex flex-col ${isDragging ? 'pointer-events-none' : ''}`} style={{ width: `calc(${100 - leftPanelWidth}% - 6px)` }}>
                        <div className="flex-shrink-0 flex items-center justify-between p-2 px-4 bg-gray-200 dark:bg-zinc-800 border-b border-gray-300 dark:border-zinc-700">
                             <div className="flex items-center gap-1">
                                <button onClick={() => setActiveTab('preview')} className={`px-3 py-1 text-sm font-medium rounded-md ${activeTab === 'preview' ? 'bg-white dark:bg-zinc-700' : 'hover:bg-gray-300 dark:hover:bg-zinc-700/50'}`}>Preview</button>
                                <button onClick={() => setActiveTab('code')} className={`px-3 py-1 text-sm font-medium rounded-md ${activeTab === 'code' ? 'bg-white dark:bg-zinc-700' : 'hover:bg-gray-300 dark:hover:bg-zinc-700/50'}`}>Code</button>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => livePreviewRef.current?.reload()} className="p-1.5 text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 rounded-md hover:bg-gray-300 dark:hover:bg-zinc-700" aria-label="Reload preview"><ReloadIcon className="w-4 h-4" /></button>
                                <DeviceSelector selectedDevice={previewDevice} onSelectDevice={setPreviewDevice} />
                                <button onClick={handleToggleSelectionMode} className={`flex items-center gap-1.5 p-1.5 text-sm rounded-md ${isSelectionModeActive ? 'bg-blue-600 text-white' : 'text-gray-500 dark:text-zinc-400 hover:bg-gray-300 dark:hover:bg-zinc-700'}`} aria-label="Select element"><CursorClickIcon className="w-4 h-4" /></button>
                                <button onClick={() => previewContainerRef.current?.requestFullscreen()} className="p-1.5 text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 rounded-md hover:bg-gray-300 dark:hover:bg-zinc-700" aria-label="Fullscreen preview"><FullScreenIcon className="w-4 h-4" /></button>
                            </div>
                        </div>

                        <div className="flex-grow overflow-hidden bg-white dark:bg-zinc-900">
                            {activeTab === 'code' && (
                                <CodeDisplay 
                                    files={currentFiles}
                                    onFilesChange={handleFilesChange}
                                    onUndo={handleUndo}
                                    onRedo={handleRedo}
                                    canUndo={canUndo}
                                    canRedo={canRedo}
                                    aiTargetFiles={aiTargetFiles}
                                    onAnimationStart={handleFileAnimationStart}
                                    onAnimationComplete={handleAnimationComplete}
                                />
                            )}
                            {activeTab === 'preview' && (
                                <div ref={previewContainerRef} className={`mx-auto h-full transition-all duration-300 ${previewDevice === 'mobile' ? 'w-[375px]' : previewDevice === 'tablet' ? 'w-[768px]' : 'w-full'} bg-white shadow-lg`}>
                                    <LivePreview ref={livePreviewRef} files={currentFiles} isSelectionModeActive={isSelectionModeActive} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <HistorySidebar
                    isOpen={isHistorySidebarOpen}
                    onClose={() => setHistorySidebarOpen(false)}
                    history={activeProject.codeHistory.history}
                    currentIndex={activeProject.codeHistory.currentIndex}
                    onRestore={handleRestoreVersion}
                />

                {projectToDelete && (
                    <DeleteConfirmationModal
                        isOpen={!!projectToDelete}
                        onClose={() => setProjectToDelete(null)}
                        onConfirm={handleDeleteProject}
                        projectName={projectToDelete.name}
                    />
                )}

                {error && (
                    <div className="absolute bottom-4 right-4 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-500/50 text-red-700 dark:text-red-300 px-4 py-3 rounded-md shadow-lg z-50 flex items-start gap-3 animate-fade-in">
                        <AlertTriangleIcon className="w-5 h-5 mt-0.5 text-red-600 dark:text-red-400 flex-shrink-0"/>
                        <div>
                            <p className="font-bold">An Error Occurred</p>
                            <p className="text-sm">{error}</p>
                        </div>
                        <button onClick={() => setError(null)} className="p-1 -mt-1 -mr-1 rounded-full hover:bg-red-200 dark:hover:bg-red-900/50"><XIcon className="w-4 h-4"/></button>
                    </div>
                )}
            </main>
        </div>
    );
};

export default App;