// ============================
// src/features/ModelSelector.js
// ============================
import React from 'react';
import { FormControl, Select, MenuItem } from '@mui/material';

export default function ModelSelector({ value, onChange, models = [], sx }) {
    const effectiveValue = value ?? models[0]?.id ?? '';
    return (
        <FormControl size="small" sx={{ ...sx }}>
            <Select
                id="model-select"
                value={effectiveValue}
                onChange={onChange}
                displayEmpty
                renderValue={(value) =>
                    models.find((m) => m.id === value)?.label ||
                    models[0]?.label ||
                    'Select Model'
                }
                MenuProps={{
                    PaperProps: {
                        sx: (theme) => ({
                            maxHeight: 320,

                            // Scrollbar customization (WebKit browsers)
                            '&::-webkit-scrollbar': {
                                width: 8 // width (or height) of the scrollbar track
                            },
                            '&::-webkit-scrollbar-track': {
                                // the rail behind the thumb
                                backgroundColor:
                                    theme.palette.mode === 'light'
                                        ? theme.palette.grey[100] // light mode = light grey
                                        : theme.palette.grey[800], // dark mode = dark grey
                                borderRadius: 8 // smooth corners at both ends of the rail
                            },
                            '&::-webkit-scrollbar-thumb': {
                                // actual draggable thumb
                                backgroundColor:
                                    theme.palette.mode === 'light'
                                        ? theme.palette.grey[400]
                                        : theme.palette.grey[600],
                                borderRadius: 8 // rounded ends for consistency
                            },
                            '&::-webkit-scrollbar-thumb:hover': {
                                // darker tone when hovered
                                backgroundColor:
                                    theme.palette.mode === 'light'
                                        ? theme.palette.grey[500]
                                        : theme.palette.grey[500]
                            }
                        })
                    }
                }}
            >
                {models.map((model) => (
                    <MenuItem key={model.id} value={model.id}>
                        {model.label}
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
    );
}
