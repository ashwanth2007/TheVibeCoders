import React, { useState, useEffect, useRef } from 'react';
import { SparklesIcon } from './icons/SparklesIcon';
import { UserIcon } from './icons/UserIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { CheckIcon } from './icons/CheckIcon';

const CodeBlock: React.FC<{ code: string }> = ({ code }) => {
    const [isCopied, setIsCopied] = useState(false);
    
    // Split language from code content
    const lines = code.trim().split('\n');
    const language = lines[0].trim();
    const codeContent = lines.slice(1).join('\n');

    const handleCopy = () => {
        navigator.clipboard.writeText(codeContent);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <div className="my-2 bg-gray-900 rounded-md overflow-hidden">
            <div className="flex justify-between items-center px-4 py-1.5 bg-zinc-700 text-xs text-zinc-300">
                <span>{language}</span>
                <button onClick={handleCopy} className="flex items-center gap-1.5 text-xs">
                    {isCopied ? <CheckIcon className="w-3 h-3 text-green-400" /> : <ClipboardIcon className="w-3 h-3" />}
                    {isCopied ? 'Copied' : 'Copy'}
                </button>
            </div>
            <pre className="p-4 overflow-x-auto"><code className="font-mono text-sm text-zinc-200">{codeContent}</code></pre>
        </div>
    );
};

const SimpleMarkdownRenderer: React.FC<{ text: string }> = ({ text }) => {
    const parts = text.split(/(```[\s\S]*?```)/g).filter(Boolean);
  
    return (
      <>
        {parts.map((part, index) => {
          if (part.startsWith('```') && part.endsWith('```')) {
            return <CodeBlock key={index} code={part.slice(3, -3)} />;
          }
          // Simple formatting for bold and italics
          const formattedPart = part
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');
          return <span key={index} dangerouslySetInnerHTML={{ __html: formattedPart }} />;
        })}
      </>
    );
};

interface DiscussionViewProps {
    history: Array<{ role: 'user' | 'model'; content: string }>;
}

export const DiscussionView: React.FC<DiscussionViewProps> = ({ history }) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [history]);

    return (
        <div className="flex-grow overflow-y-auto p-4 space-y-6">
            {history.map((message, index) => (
                <div key={index} className={`flex items-start gap-3 w-full ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {message.role === 'model' && (
                        <div className="w-8 h-8 flex-shrink-0 rounded-full bg-gray-200 dark:bg-zinc-700 flex items-center justify-center">
                            <SparklesIcon className="w-5 h-5 text-gray-600 dark:text-zinc-300" />
                        </div>
                    )}
                    <div className={`max-w-xl rounded-lg ${message.role === 'model' ? 'bg-gray-100 dark:bg-zinc-700/50 p-3' : 'bg-blue-600 text-white p-3'}`}>
                        {message.role === 'model' ? (
                            <div className="text-sm text-gray-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed">
                                <SimpleMarkdownRenderer text={message.content} />
                            </div>
                        ) : (
                            <p className="text-sm">{message.content}</p>
                        )}
                    </div>
                     {message.role === 'user' && (
                        <div className="w-8 h-8 flex-shrink-0 rounded-full bg-gray-200 dark:bg-zinc-700 flex items-center justify-center">
                            <UserIcon className="w-5 h-5 text-gray-600 dark:text-zinc-300" />
                        </div>
                    )}
                </div>
            ))}
            <div ref={messagesEndRef} />
        </div>
    );
};
