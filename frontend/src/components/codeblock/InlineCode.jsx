// ============================
// src/components/codeblock/InlineCode.jsx
// ============================
import { Box } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

export default function InlineCode({ raw, ...props }) {
    const theme = useTheme();

    return (
        <Box
            component="code"
            sx={{
                px: 0.75,
                py: 0.25,
                borderRadius: 0.75,
                bgcolor:
                    theme.palette.mode === 'dark'
                        ? alpha('#fff', 0.16)
                        : '#dee1e4',
                fontFamily: 'Consolas, Monaco, Menlo, monospace',
                fontSize: '0.85em'
            }}
            {...props}
        >
            {raw}
        </Box>
    );
}
