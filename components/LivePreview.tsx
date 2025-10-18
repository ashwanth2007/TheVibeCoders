import React, { useState, useMemo, useEffect } from 'react';
import { File } from '../services/geminiService';

interface LivePreviewProps {
    files: File[];
}

const createBlobUrl = (htmlContent: string): string => {
    const blob = new Blob([htmlContent], { type: 'text/html' });
    return URL.createObjectURL(blob);
};

export const LivePreview: React.FC<LivePreviewProps> = ({ files }) => {
    const [activePath, setActivePath] = useState('index.html');

    // Reset to index.html when files change (e.g., new generation or project switch)
    useEffect(() => {
        setActivePath('index.html');
    }, [files]);

    // Listen for navigation messages from the iframe
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data && event.data.type === 'navigate' && typeof event.data.path === 'string') {
                const newPath = event.data.path || 'index.html'; // Default to index.html if path is empty
                if (newPath !== activePath) {
                    setActivePath(newPath);
                }
            }
        };

        window.addEventListener('message', handleMessage);
        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, [activePath]); // Rerun when activePath changes

    const srcDoc = useMemo(() => {
        if (!files || files.length === 0) return '';
    
        const htmlFile = files.find(f => f.path === activePath);
        
        if (!htmlFile) {
            // If the target file doesn't exist, show a helpful error message inside the iframe.
             return `
                <html>
                    <head>
                        <style>
                            :root {
                                --bg-color: #f8f9fa;
                                --text-color: #343a40;
                                --container-bg: #ffffff;
                                --code-bg: #e9ecef;
                            }
                            @media (prefers-color-scheme: dark) {
                                :root {
                                    --bg-color: #18181b;
                                    --text-color: #e4e4e7;
                                    --container-bg: #27272a;
                                    --code-bg: #3f3f46;
                                }
                            }
                            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: var(--bg-color); color: var(--text-color); display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                            .container { text-align: center; padding: 2rem; background-color: var(--container-bg); border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                            h1 { font-size: 1.5rem; color: #d9480f; }
                            code { background-color: var(--code-bg); padding: 0.2em 0.4em; margin: 0; font-size: 85%; border-radius: 3px; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <h1>Page Not Found</h1>
                            <p>Could not find the file <code>${activePath}</code> in your project.</p>
                        </div>
                    </body>
                </html>
            `;
        }

        let processedHtml = htmlFile.content;

        // Inline CSS: Use a replacer function to handle multiple link tags
        processedHtml = processedHtml.replace(/<link.+?href="([^"]+\.css)"[^>]*>/g, (linkTag, path) => {
            const cssFile = files.find(f => f.path === path);
            if (cssFile) {
                return `<style>\n${cssFile.content}\n</style>`;
            }
            return linkTag;
        });

        // Inline JS: Use a replacer function to handle multiple script tags
        processedHtml = processedHtml.replace(/<script.+?src="([^"]+)"[^>]*><\/script>/g, (scriptTag, path) => {
            const jsFile = files.find(f => f.path === path);
            if (jsFile) {
                return `<script>\n${jsFile.content}\n</script>`;
            }
            return scriptTag;
        });

        // Inject navigation interception script
        const navigationScript = `
            <script>
                document.addEventListener('click', function(e) {
                    let target = e.target;
                    while (target && target.tagName !== 'A') {
                        target = target.parentElement;
                    }

                    if (target && target.hasAttribute('href')) {
                        const href = target.getAttribute('href');
                        // Prevent navigation for empty, hash, or javascript links
                        if (!href || href.trim() === '#' || href.trim().toLowerCase().startsWith('javascript:')) {
                             e.preventDefault();
                             return;
                        }

                        const url = new URL(href, window.location.origin);
                        
                        // Handle internal navigation
                        if (url.origin === window.location.origin) {
                            e.preventDefault();
                            const path = url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname;
                            window.parent.postMessage({ type: 'navigate', path: path }, '*');
                        }
                        // Force external links to open in a new tab for better UX
                        else if (url.origin !== window.location.origin) {
                            e.preventDefault();
                            window.open(url, '_blank');
                        }
                    }
                }, true); // Use capture phase to catch event early
            </script>
        `;

        // Add script before closing body tag
        if (processedHtml.includes('</body>')) {
            processedHtml = processedHtml.replace('</body>', `${navigationScript}</body>`);
        } else {
            processedHtml += navigationScript;
        }
    
        return processedHtml;
    }, [files, activePath]);
    
    // Using a blob URL for better isolation and to handle base URLs for relative paths within the HTML.
    const blobUrl = useMemo(() => {
        if (!srcDoc) return undefined;
        return createBlobUrl(srcDoc);
    }, [srcDoc]);

    // Clean up the blob URL when the component unmounts or the URL changes
    useEffect(() => {
        let currentBlobUrl = blobUrl;
        return () => {
            if (currentBlobUrl) {
                URL.revokeObjectURL(currentBlobUrl);
            }
        };
    }, [blobUrl]);

    return (
        <div className="w-full h-full flex flex-col bg-white">
            {files.length === 0 ? (
                 <div className="flex-grow flex items-center justify-center">
                    <div className="text-center text-gray-500 dark:text-zinc-400">
                        <p>Your generated app will appear here.</p>
                        <p className="text-sm">Describe your app and click "Generate".</p>
                    </div>
                </div>
            ) : (
                <iframe
                    key={blobUrl} // Re-mount iframe when blobUrl changes, ensuring scripts re-run
                    src={blobUrl}
                    title="Live Preview"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups" // allow-popups for window.open
                    className="w-full h-full border-0"
                />
            )}
        </div>
    );
};