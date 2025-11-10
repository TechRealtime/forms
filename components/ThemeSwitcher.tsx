import React, { useState, useEffect } from 'react';
import { SunIcon, MoonIcon } from './Icons';

const ThemeSwitcher: React.FC = () => {
    const [isDarkMode, setIsDarkMode] = useState(() => {
        const storedTheme = localStorage.getItem('enterprise-forms-theme');
        if (storedTheme) {
            return storedTheme === 'dark';
        }
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    });

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('enterprise-forms-theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('enterprise-forms-theme', 'light');
        }
    }, [isDarkMode]);

    const toggleDarkMode = () => {
        setIsDarkMode(prevMode => !prevMode);
    };

    return (
        <button 
            onClick={toggleDarkMode} 
            className="p-2 rounded-full hover:bg-secondary transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Toggle theme"
        >
            {isDarkMode ? <SunIcon className="w-5 h-5 text-yellow-400" /> : <MoonIcon className="w-5 h-5 text-gray-700" />}
        </button>
    );
};

export default ThemeSwitcher;
