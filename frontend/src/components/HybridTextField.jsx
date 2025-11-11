// ============================
// src/components/HybridTextField.js
// ============================
import { TextField, InputAdornment, IconButton, Tooltip } from '@mui/material';
import { scrollbar } from '../styles/scrollbar';

/**
 * HybridTextField — a theme-aware TextField combining outlined borders with a filled background.
 * Supports start and end adornment buttons via the `adornments` prop.
 *
 * @param {object} props
 * @param {object} [props.adornments] - Optional adornments for the field.
 * @param {object} [props.adornments.start] - Start adornment config.
 * @param {MUI.icon} [props.adornments.start.icon] - Icon element.
 * @param {function} [props.adornments.start.onClick] - Click handler.
 * @param {boolean} [props.adornments.start.disabled] - Disable state.
 * @param {string} [props.adornments.start.ariaLabel] - Accessibility label.
 * @param {string} [props.adornments.start.tooltip] - Tooltip text.
 * @param {object} [props.adornments.end] - End adornment config (same fields as start).
 * @param {number} [props.minRows=1] - Minimum visible rows for multiline input.
 * @param {number} [props.maxRows=6] - Maximum visible rows for multiline input.
 * @param {object} [props.sx] - MUI system style overrides.
 * @returns {JSX.Element} Rendered hybrid text field component.
 */
export default function HybridTextField({
    adornments, // { start?: {...}, end?: {...} }
    sx,
    minRows = 1,
    maxRows = 6,
    ...props
}) {
    /**
     * Creates a positioned InputAdornment with an IconButton.
     *
     * @param {'start' | 'end'} pos - Adornment position.
     * @param {object} cfg - Configuration object for the adornment.
     * @param {React.ReactNode} [cfg.icon] - Icon element to display.
     * @param {function} [cfg.onClick] - Click handler for the button.
     * @param {boolean} [cfg.disabled=false] - Whether the button is disabled.
     * @param {string} [cfg.ariaLabel] - Accessibility label for the button.
     * @param {string} [cfg.tooltip] - Tooltip text for the button.
     * @returns {JSX.Element|null} The rendered InputAdornment, or null if no icon.
     */
    const mkAdornment = (pos, cfg) => {
        if (!cfg?.icon) return null;

        const Btn = (
            <IconButton
                edge={pos}
                size="small"
                disabled={!!cfg.disabled}
                onMouseDown={(e) => e.preventDefault()}
                onClick={cfg.onClick}
                aria-label={cfg.ariaLabel || `${pos} action`}
                sx={(theme) => {
                    const isStop =
                        cfg.tooltip === 'Stop' || cfg.color === 'error'; // fallback for future clarity
                    const isLightTheme = theme.palette.mode === 'light';

                    return {
                        color: isStop
                            ? isLightTheme
                                ? theme.palette.error.main
                                : theme.palette.divider.main
                            : theme.palette.primary.main,
                        '&:hover': {
                            backgroundColor: theme.palette.action.selected
                        }
                    };
                }}
            >
                {cfg.icon}
            </IconButton>
        );

        return (
            <InputAdornment
                position={pos}
                sx={{
                    alignItems: 'center',
                    display: 'flex'
                }}
            >
                {cfg.tooltip && !cfg.disabled ? (
                    <Tooltip title={cfg.tooltip}>{Btn}</Tooltip>
                ) : (
                    Btn
                )}
            </InputAdornment>
        );
    };

    const startAdornment = mkAdornment('start', adornments?.start);
    const endAdornment = mkAdornment('end', adornments?.end);

    return (
        <TextField
            variant="outlined"
            multiline
            minRows={minRows}
            maxRows={maxRows}
            slotProps={{
                input: {
                    sx: (theme) => ({
                        backgroundColor:
                            theme.palette.mode === 'light'
                                ? theme.palette.grey[50]
                                : theme.palette.grey[900],
                        '& fieldset': { borderColor: theme.palette.divider },
                        '&:hover fieldset': {
                            borderColor: theme.palette.text.primary
                        },
                        '&.Mui-focused fieldset': {
                            borderColor: theme.palette.primary.main
                        },
                        borderRadius: 8,

                        // Scrollbar on the textarea
                        '& .MuiInputBase-inputMultiline': {
                            ...scrollbar(theme, { variant: 'neutral' })
                        }
                    }),
                    startAdornment,
                    endAdornment
                }
            }}
            sx={sx}
            {...props}
        />
    );
}
