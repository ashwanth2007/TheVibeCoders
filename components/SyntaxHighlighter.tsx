import React, { useMemo } from 'react';

// A simple utility to escape HTML characters to prevent XSS
const escapeHtml = (unsafe: string): string => {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

const highlight = (code: string, language: string): string => {
    // Start with escaped code to be safe
    let highlightedCode = escapeHtml(code);
    
    // Simple language detection and highlighting rules
    switch (language) {
        case 'js':
        case 'jsx':
        case 'ts':
        case 'tsx':
            highlightedCode = highlightedCode
                // Comments (single and multi-line)
                .replace(/(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g, '<span class="token-comment">$1</span>')
                // Strings (template, single, double)
                .replace(/(`[\s\S]*?`|'[^']*'|"[^"]*")/g, '<span class="token-string">$1</span>')
                // Keywords
                .replace(/\b(const|let|var|function|return|if|else|for|while|import|export|from|async|await|new|class|extends|super|try|catch|finally|throw|switch|case|default|break|continue|of|in|instanceof|typeof|delete|void|debugger|with|true|false|null|undefined)\b/g, '<span class="token-keyword">$1</span>')
                // Function names (simple lookahead for parentheses)
                .replace(/(\w+)\s*(?=\()/g, '<span class="token-function">$1</span>')
                // Numbers
                .replace(/\b(\d+(\.\d+)?)\b/g, '<span class="token-number">$1</span>')
                // Punctuation
                .replace(/([{}()[\],.;=+\-*/%&|<>?!~^])/g, '<span class="token-punctuation">$1</span>');
            break;

        case 'css':
            highlightedCode = highlightedCode
                // Comments
                .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="token-comment">$1</span>')
                // Selectors (very basic)
                .replace(/(^|[\s,}{])([.#&]?[a-zA-Z0-9-_*:]+)/g, '$1<span class="token-selector">$2</span>')
                // Properties
                .replace(/([a-zA-Z-]+)\s*:/g, '<span class="token-property">$1</span>:')
                // Values (simple, covers strings and numbers)
                .replace(/:\s*([^;]+);/g, (match, value) => `: <span class="token-value">${value}</span>;`)
                // Punctuation
                .replace(/([{}[\],.;:=])/g, '<span class="token-punctuation">$1</span>');
            break;
            
        case 'html':
            highlightedCode = highlightedCode
                // Comments
                .replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="token-comment">$1</span>')
                // Tags (including closing tags)
                .replace(/(&lt;\/?)([a-zA-Z0-9-]+)/g, '$1<span class="token-tag">$2</span>')
                // Attributes
                .replace(/(\s+)([a-zA-Z-]+)(?==)/g, '$1<span class="token-attr-name">$2</span>')
                // Attribute values
                .replace(/(=)(".*?"|'.*?')/g, '$1<span class="token-attr-value">$2</span>');
            break;
    }

    return highlightedCode;
};

interface SyntaxHighlighterProps {
    code: string;
    language: string;
}

export const SyntaxHighlighter: React.FC<SyntaxHighlighterProps> = ({ code, language }) => {
    // useMemo helps to avoid re-highlighting on every render if the code hasn't changed
    const highlightedHtml = useMemo(() => highlight(code, language), [code, language]);

    return (
        <code
            className={`language-${language}`}
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
        />
    );
};