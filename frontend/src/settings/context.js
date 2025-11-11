import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useMemo
} from 'react';
import { registry, STORAGE_KEY } from './registry';

function loadInitialState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw);
    } catch {}
    // Fill defaults from registry
    const init = {};
    for (const [key, def] of Object.entries(registry)) {
        init[key] = def.default;
    }
    return init;
}

const Context = createContext(null);

export function SettingsProvider({ children }) {
    const [state, setState] = useState(loadInitialState);

    // persist
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch {}
    }, [state]);

    // optional: cross-tab sync
    useEffect(() => {
        const onStorage = (e) => {
            if (e.key === STORAGE_KEY && e.newValue) {
                try {
                    setState(JSON.parse(e.newValue));
                } catch {}
            }
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    const get = useCallback((key) => state[key], [state]);
    const set = useCallback((key, value) => {
        setState((prev) => ({ ...prev, [key]: value }));
    }, []);

    const value = useMemo(() => ({ state, get, set }), [state, get, set]);
    return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useSettings() {
    const ctx = useContext(Context);
    if (!ctx)
        throw new Error('useSettings must be used within SettingsProvider');
    return ctx;
}

// Convenience hook for a single setting: const [val, setVal] = useSetting('themeMode');
export function useSetting(key) {
    const { get, set } = useSettings();
    const val = get(key);
    const setVal = useCallback((v) => set(key, v), [key, set]);
    return [val, setVal];
}
