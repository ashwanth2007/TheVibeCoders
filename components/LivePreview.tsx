import React, { useMemo } from 'react';
import { File } from '../services/geminiService';

interface LivePreviewProps {
    files: File[];
}

const createBlobUrl = (htmlContent: string): string => {
    const blob = new Blob([htmlContent], { type: 'text/html' });
    return URL.createObjectURL(blob);
};

export const LivePreview: React.FC<LivePreviewProps> = ({ files }) => {
    const srcDoc = useMemo(() => {
        if (!files || files.length === 0) return '';
    
        const htmlFile = files.find(f => f.path.endsWith('index.html'));
        if (!htmlFile) return '<html><body>No index.html file found in the project.</body></html>';

        let processedHtml = htmlFile.content;

        // Inline CSS
        // Fix: Use String.prototype.replace with a replacer function to avoid using String.prototype.matchAll, which may not be available in all environments.
        processedHtml = processedHtml.replace(/<link.+?href="([^"]+\.css)"[^>]*>/g, (linkTag, path) => {
            const cssFile = files.find(f => f.path === path);
            if (cssFile) {
                return `<style>\n${cssFile.content}\n</style>`;
            }
            return linkTag;
        });

        // Inline JS
        // Fix: Use String.prototype.replace with a replacer function to avoid using String.prototype.matchAll, which may not be available in all environments.
        processedHtml = processedHtml.replace(/<script.+?src="([^"]+)"[^>]*><\/script>/g, (scriptTag, path) => {
            const jsFile = files.find(f => f.path === path);
            if (jsFile) {
                return `<script>\n${jsFile.content}\n</script>`;
            }
            return scriptTag;
        });
    
        return processedHtml;
    }, [files]);
    
    // Using a blob URL for better isolation and to handle base URLs for relative paths within the HTML.
    const blobUrl = useMemo(() => {
        if (!srcDoc) return undefined;
        const url = createBlobUrl(srcDoc);
        return url;
    }, [srcDoc]);

    // Clean up the blob URL when the component unmounts or the URL changes
    React.useEffect(() => {
        return () => {
            if (blobUrl) {
                URL.revokeObjectURL(blobUrl);
            }
        };
    }, [blobUrl]);

    return (
        <div className="w-full h-full flex flex-col bg-white">
            {files.length === 0 ? (
                 <div className="flex-grow flex items-center justify-center">
                    <div className="text-center text-gray-500">
                        <p>Your generated app will appear here.</p>
                        <p className="text-sm">Describe your app and click "Generate".</p>
                    </div>
                </div>
            ) : (
                <iframe
                    key={blobUrl} // Re-mount iframe when blobUrl changes
                    src={blobUrl}
                    title="Live Preview"
                    sandbox="allow-scripts allow-same-origin allow-forms"
                    className="w-full h-full border-0"
                />
            )}
        </div>
    );
};