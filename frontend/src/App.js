// ============================
// src/App.js
// ============================
import React from 'react';
import {
    ThemeProvider,
    createTheme,
    CssBaseline,
    useMediaQuery
} from '@mui/material';
import ChatLayout from './features/ChatLayout';

// App-level config you wanted to import from root
const APP_TITLE = 'TDD Chatbot';

// Models and sx for the selector are defined at the root, then passed down
const MODELS = [
    { id: 'geminiNative', label: 'Gemeni Native' },
    { id: 'gemini', label: 'Gemini' },
    { id: 'dms', label: 'DMS' },
    { id: 'openrouter', label: 'OpenRouter' }
];

const selectorSx = {
    minWidth: 200,
    mr: 2,
    '& .MuiSelect-select': { py: 0.75 }
};

export default function App() {
    // themeMode: 'light' | 'dark' | 'system'
    const [themeMode, setThemeMode] = React.useState('system');
    const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
    const effectiveMode =
        themeMode === 'system' ? (prefersDark ? 'dark' : 'light') : themeMode;
    const theme = React.useMemo(
        () => createTheme({ palette: { mode: effectiveMode } }),
        [effectiveMode]
    );

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <ChatLayout
                title={APP_TITLE}
                models={MODELS}
                modelSelectorSx={selectorSx}
                themeMode={themeMode}
                setThemeMode={setThemeMode}
            />
        </ThemeProvider>
    );
}
