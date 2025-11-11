// Central definition of all app settings.
// Add new items here; the menu will pick them up automatically.

export const SETTINGS_VERSION = 1; // bump if structure changes
export const STORAGE_KEY = `app.settings.v${SETTINGS_VERSION}`;

export const registry = {
    themeMode: {
        label: 'Theme',
        group: 'Appearance', // optional section header

        type: 'radio', // 'radio' | 'toggle' | 'select'
        default: 'system',
        options: [
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
            { value: 'system', label: 'System' }
        ]
    }

    // compactUI: {
    //     type: 'toggle',
    //     label: 'Compact UI',
    //     group: 'Appearance',
    //     default: false
    // },

    // showTimestamps: {
    //     type: 'toggle',
    //     label: 'Show timestamps',
    //     group: 'Chat',
    //     default: true
    // }

    // test: {
    //     type: 'select',
    //     label: 'Test',
    //     group: 'Appearance',
    //     default: 'A',
    //     options: [
    //         { value: 'a', label: 'A' },
    //         { value: 'b', label: 'B' },
    //         { value: 'c', label: 'C' },
    //         { value: 'd', label: 'D' }
    //     ]
    // }

    // Example for a select:
    // dateFormat: {
    //   type: 'select',
    //   label: 'Date format',
    //   group: 'Chat',
    //   default: 'relative',
    //   options: [
    //     { value: 'relative', label: 'Relative (e.g., 2m ago)' },
    //     { value: 'absolute', label: 'YYYY-MM-DD HH:mm' },
    //   ],
    // },
};
