// ============================
// src/features/Settings.js
// ============================
import React from 'react';
import { Menu, MenuItem, ListItemText, ListItemIcon } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';

const OPTIONS = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'System' }
];

export default function Settings({
    anchorEl,
    open,
    onClose,
    themeMode,
    setThemeMode
}) {
    return (
        <Menu anchorEl={anchorEl} open={open} onClose={onClose} keepMounted>
            {OPTIONS.map((opt) => (
                <MenuItem
                    key={opt.value}
                    selected={themeMode === opt.value}
                    onClick={() => {
                        setThemeMode(opt.value);
                        onClose?.();
                    }}
                >
                    <ListItemIcon sx={{ minWidth: 28 }}>
                        {themeMode === opt.value ? (
                            <CheckIcon fontSize="small" />
                        ) : null}
                    </ListItemIcon>
                    <ListItemText primary={opt.label} />
                </MenuItem>
            ))}
        </Menu>
    );
}
