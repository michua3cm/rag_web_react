// ============================
// src/features/ModelSelector.js
// ============================
import React, { useMemo, useState } from 'react';
import { ButtonBase, Menu, MenuItem, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { scrollbar } from '../styles/scrollbar';

export default function ModelSelector({ value, onChange, models = [], sx }) {
    const effectiveValue = value ?? models[0]?.id ?? '';
    const currentLabel = useMemo(
        () =>
            models.find((m) => m.id === effectiveValue)?.label ??
            models[0]?.label ??
            'Model',
        [models, effectiveValue]
    );

    const [anchorEl, setAnchorEl] = useState(null);
    const open = Boolean(anchorEl);

    const handleClick = (e) => setAnchorEl(e.currentTarget);
    const handleClose = () => setAnchorEl(null);

    const selectModel = (id) => {
        // mimic Select’s onChange signature if caller expects it
        onChange?.({ target: { value: id } });
        handleClose();
    };

    return (
        <>
            <ButtonBase
                aria-label={`Model selector, current: ${currentLabel}`}
                aria-haspopup="menu"
                aria-expanded={open ? 'true' : 'false'}
                onClick={handleClick}
                sx={(theme) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    borderRadius: 2,
                    minHeight: 36,
                    px: 1.5, // ≈ px-2.5
                    typography: 'body1',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    outline: 'none',

                    // hover / focus-visible background using theme tokens
                    '&:hover': {
                        backgroundColor: theme.palette.action.selected
                    },
                    '&.Mui-focusVisible': {
                        backgroundColor: theme.palette.action.selected
                    },

                    // keep the hover bg while menu is open
                    ...(open && {
                        backgroundColor: theme.palette.action.selected
                    }),

                    ...sx
                })}
            >
                <Typography component="span">{currentLabel}</Typography>
                <ExpandMoreIcon
                    fontSize="medium"
                    sx={(theme) => ({
                        color: theme.palette.text.secondary,
                        ml: -0.25,
                        mr: -1
                    })}
                />
            </ButtonBase>

            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                PaperProps={{
                    sx: (theme) => ({
                        mt: 0.5,
                        maxHeight: 320,
                        borderRadius: 2,
                        '& .MuiList-root': {
                            overflowY: 'auto',
                            ...scrollbar(theme, { variant: 'neutral' })
                        }
                    })
                }}
            >
                {models.map((m) => (
                    <MenuItem
                        key={m.id}
                        selected={m.id === effectiveValue}
                        onClick={() => selectModel(m.id)}
                    >
                        {m.label}
                    </MenuItem>
                ))}
            </Menu>
        </>
    );
}
