import React, { createContext, useState, useContext, useEffect, useMemo } from 'react';

// 1. Create the context
const ThemeContext = createContext();

// 2. Create the provider component
export const ThemeProvider = ({ children }) => {
    // Initialize state from localStorage or default to 'dark'
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

    // Effect to update localStorage and the body class whenever the theme changes
    useEffect(() => {
        localStorage.setItem('theme', theme);
        // Add a class to the body element for global CSS targeting
        document.body.className = ''; // Clear previous classes
        document.body.classList.add(`${theme}-theme`);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    // The value provided to consuming components
    const value = useMemo(() => ({ theme, toggleTheme }), [theme]);

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

// 3. Create a custom hook for easy consumption
export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};