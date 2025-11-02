import React, { useRef, useEffect, useState } from 'react';

// Define a type for the Monaco editor instance to avoid using `any`
type MonacoEditor = import('monaco-editor').editor.IStandaloneCodeEditor;

// FIX: Extend the Window interface to include `monaco` and `require` which are loaded dynamically.
// This resolves TypeScript errors about these properties not existing on `window`.
declare global {
    interface Window {
        monaco: any;
        require: any;
    }
}

interface EditorProps {
    value: string;
    language: string;
    onChange: (value: string) => void;
    readOnly?: boolean;
}

// Global state to track Monaco loading, ensuring it's only initialized once.
let monacoLoadingPromise: Promise<void> | null = null;

export const Editor: React.FC<EditorProps> = ({ value, language, onChange, readOnly = false }) => {
    const editorContainerRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<MonacoEditor | null>(null);
    const [isMonacoReady, setIsMonacoReady] = useState(false);

    // Effect to load Monaco scripts and set a ready state.
    useEffect(() => {
        if (!monacoLoadingPromise) {
            monacoLoadingPromise = new Promise<void>((resolve) => {
                if (window.monaco) {
                    resolve();
                } else {
                    window.require(['vs/editor/editor.main'], () => {
                        resolve();
                    });
                }
            });
        }

        monacoLoadingPromise.then(() => {
            setIsMonacoReady(true);
        });
    }, []);

    // Effect to initialize the editor instance once Monaco is ready and the container is mounted.
    useEffect(() => {
        if (isMonacoReady && editorContainerRef.current) {
            if (!editorRef.current) {
                editorRef.current = window.monaco.editor.create(editorContainerRef.current, {
                    value: value,
                    language: language,
                    theme: 'vs-dark',
                    automaticLayout: true,
                    minimap: { enabled: false },
                    readOnly: readOnly,
                    wordWrap: 'on',
                    fontSize: 14,
                    fontFamily: "'Source Code Pro', monospace",
                });

                // Set up a listener for content changes to call the passed `onChange` handler.
                editorRef.current.onDidChangeModelContent(() => {
                    const currentValue = editorRef.current?.getValue();
                    if (currentValue !== undefined && currentValue !== value) {
                        onChange(currentValue);
                    }
                });
            }
        }
        
        // Cleanup on unmount: dispose of the editor instance to free up resources.
        return () => {
            if (editorRef.current) {
                editorRef.current.dispose();
                editorRef.current = null;
            }
        };
    }, [isMonacoReady]);

    // Effect to update the editor's content if the `value` prop changes from the outside (e.g., AI typing, file switch, undo/redo).
    useEffect(() => {
        if (editorRef.current && value !== editorRef.current.getValue()) {
            editorRef.current.setValue(value);
        }
    }, [value]);

    // Effect to update the editor's language if the `language` prop changes.
    useEffect(() => {
        if (editorRef.current && window.monaco) {
            window.monaco.editor.setModelLanguage(editorRef.current.getModel()!, language);
        }
    }, [language]);
    
    // Effect to toggle the read-only state of the editor.
    useEffect(() => {
        editorRef.current?.updateOptions({ readOnly: readOnly });
    }, [readOnly]);


    return <div ref={editorContainerRef} style={{ width: '100%', height: '100%' }} />;
};
