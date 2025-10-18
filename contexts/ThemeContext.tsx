import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [theme] = useState<Theme>('dark');

    useEffect(() => {
        const root = window.document.documentElement;
        // Ensure light class is removed and dark class is present
        root.classList.remove('light');
        if (!root.classList.contains('dark')) {
            root.classList.add('dark');
        }
        localStorage.setItem('theme', 'dark');
    }, []); // Run only once on mount

    // The toggle function does nothing to enforce a permanent dark mode.
    const toggleTheme = () => {};

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};