// ============================
// src/components/codeblock/CodeToolbar/index.jsx
// ============================
import {
    Box,
    Chip,
    IconButton,
    Stack,
    Tooltip,
    Typography
} from '@mui/material';
import { alpha } from '@mui/material/styles';

import { BUTTONS_BASE, ITEMS_ST } from './toolbarConfig';

function ToolbarIconButton({ title, disabled, onClick, sx, children }) {
    return (
        <Tooltip title={title}>
            <span>
                <IconButton
                    size="small"
                    disabled={disabled}
                    onClick={onClick}
                    sx={sx}
                >
                    {children}
                </IconButton>
            </span>
        </Tooltip>
    );
}

export default function CodeToolbar({
    lang,
    textPrimary,
    isSTCode,
    isProcessing,
    hasLogicCode,
    copiedKind,
    onCopyAll,
    onParse,
    onCopyLogic,
    showVariables,
    onToggleVariables,
    variablesCount,
    hasVariables,
    onDownloadCSV
}) {
    const ctx = {
        textPrimary,
        isProcessing,
        hasLogicCode,
        copiedKind,
        showVariables,
        hasVariables,
        variablesCount,
        onCopyAll,
        onParse,
        onCopyLogic,
        onToggleVariables,
        onDownloadCSV
    };

    const stItems = isSTCode
        ? ITEMS_ST.filter((item) => (item.show ? item.show(ctx) : true))
        : [];

    return (
        <Stack
            direction="row"
            alignItems="center"
            sx={{ minHeight: 28, mb: 1 }}
        >
            {/* Lang chip (hidden if none) */}
            {lang ? (
                <Chip
                    label={lang.toUpperCase()}
                    size="small"
                    variant="outlined"
                    sx={{
                        borderColor: alpha(textPrimary, 0.3),
                        color: alpha(textPrimary, 0.9),
                        bgcolor: alpha(textPrimary, 0.04),
                        fontWeight: 500
                    }}
                />
            ) : (
                <Box />
            )}

            {/* Buttons pinned to far right */}
            <Box
                sx={{
                    ml: 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5
                }}
            >
                {/* Base buttons */}
                {BUTTONS_BASE.map((btn) => (
                    <ToolbarIconButton
                        key={btn.id}
                        title={
                            typeof btn.title === 'function'
                                ? btn.title(ctx)
                                : btn.title
                        }
                        disabled={btn.disabled ? btn.disabled(ctx) : false}
                        onClick={() => btn.onClick(ctx)}
                        sx={btn.sx ? btn.sx(ctx) : undefined}
                    >
                        {btn.icon(ctx)}
                    </ToolbarIconButton>
                ))}

                {/* ST-specific items */}
                {stItems.map((item) =>
                    item.kind === 'label' ? (
                        <Typography
                            key={item.id}
                            variant="caption"
                            sx={{
                                ml: -0.25,
                                mr: 0.25,
                                opacity: 0.75
                            }}
                        >
                            {item.render(ctx)}
                        </Typography>
                    ) : (
                        <ToolbarIconButton
                            key={item.id}
                            title={
                                typeof item.title === 'function'
                                    ? item.title(ctx)
                                    : item.title
                            }
                            disabled={
                                item.disabled ? item.disabled(ctx) : false
                            }
                            onClick={() => item.onClick(ctx)}
                            sx={item.sx ? item.sx(ctx) : undefined}
                        >
                            {item.icon(ctx)}
                        </ToolbarIconButton>
                    )
                )}
            </Box>
        </Stack>
    );
}
