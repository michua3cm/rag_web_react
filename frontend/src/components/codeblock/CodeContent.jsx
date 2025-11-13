// ============================
// src/components/codeblock/CodeContent.jsx
// ============================
import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';

import { scrollbar } from '../../styles/scrollbar';

export default function CodeContent({ className, raw, textPrimary, ...props }) {
    const theme = useTheme();

    return (
        <Box
            component="pre"
            sx={{
                mx: { xs: 0.5, sm: 1.0, md: 1.5 },
                whiteSpace: 'pre',
                overflowX: 'auto',
                lineHeight: 1.5,
                tabSize: 4,
                fontSize: '0.8em',
                fontFamily: 'Consolas, Monaco, Menlo, monospace',
                color: textPrimary,
                bgcolor: 'transparent',
                '&': { ...scrollbar(theme, { variant: 'neutral' }) }
            }}
        >
            <Box component="code" className={className} {...props}>
                {raw}
            </Box>
        </Box>
    );
}
