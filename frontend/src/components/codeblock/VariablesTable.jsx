// ============================
// src/components/codeblock/VariablesTable.jsx
// ============================
import {
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

import { scrollbar } from '../../styles/scrollbar';

// Column definitions — expand anytime easily
const COLUMNS = [
    { key: 'identifier', label: '識別符' },
    { key: 'var_type', label: '類型' },
    { key: 'address', label: '位址', default: '-' },
    { key: 'initial_value', label: '初始值', default: '-' },
    { key: 'comment', label: '註解', default: '-' }
];

export default function VariablesTable({ show, variables, subSurface }) {
    const theme = useTheme();

    if (!show || variables.length === 0) return null;

    return (
        <Paper
            variant="outlined"
            sx={{
                mb: 1,
                p: 1,
                borderRadius: 1,
                bgcolor: subSurface
            }}
        >
            <TableContainer
                sx={{
                    maxHeight: 320,
                    '&': { ...scrollbar(theme, { variant: 'neutral' }) }
                }}
            >
                <Table size="small" stickyHeader>
                    {/* ========== HEADER ========== */}
                    <TableHead>
                        <TableRow
                            sx={{
                                '& th': {
                                    bgcolor:
                                        theme.palette.mode === 'dark'
                                            ? '#333'
                                            : alpha(
                                                  theme.palette.grey[200],
                                                  0.6
                                              )
                                }
                            }}
                        >
                            {COLUMNS.map((col) => (
                                <TableCell key={col.key}>{col.label}</TableCell>
                            ))}
                        </TableRow>
                    </TableHead>

                    {/* ========== BODY ========== */}
                    <TableBody>
                        {variables.map((v, i) => (
                            <TableRow key={i} hover>
                                {COLUMNS.map((col) => (
                                    <TableCell key={col.key}>
                                        {v[col.key] ?? col.default ?? ''}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    );
}
