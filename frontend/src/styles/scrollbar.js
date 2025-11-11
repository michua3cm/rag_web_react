// ============================
// src/styles/scrollbar.js
// ============================
import { alpha } from '@mui/material/styles';

/**
 * Theme-aware scrollbar styles for WebKit + Firefox.
 * @param {MUI.Theme} theme
 * @param {{ number, string }} [opts]
 */
export function scrollbar(theme, opts = {}) {
    const { width = 8, variant = 'neutral' } = opts;

    // Colors derived from theme, switchable per variant.
    const track =
        variant === 'primary'
            ? alpha(
                  theme.palette.primary.main,
                  theme.palette.mode === 'light' ? 0.06 : 0.12
              )
            : theme.palette.mode === 'light'
            ? theme.palette.grey[100]
            : theme.palette.grey[900];

    const thumbBase =
        variant === 'primary'
            ? theme.palette.primary.main
            : theme.palette.mode === 'light'
            ? theme.palette.grey[400]
            : theme.palette.grey[600];

    const thumbHover =
        variant === 'primary'
            ? alpha(thumbBase, 0.85)
            : theme.palette.mode === 'light'
            ? theme.palette.grey[500]
            : theme.palette.grey[500];

    return {
        /* Chrome / Edge / Safari */
        '::-webkit-scrollbar': { width },
        '::-webkit-scrollbar-track': {
            backgroundColor: track,
            borderRadius: 8
        },
        '::-webkit-scrollbar-thumb': {
            backgroundColor: thumbBase,
            borderRadius: 8
        },
        '::-webkit-scrollbar-thumb:hover': { backgroundColor: thumbHover },

        /* Firefox */
        scrollbarWidth: 'thin',
        scrollbarColor: `${thumbBase} ${track}`
    };
}
