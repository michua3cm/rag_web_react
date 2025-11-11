// ============================
// src/components/CodeBlockRenderer.jsx (MUI version)
// ============================
import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
    Box,
    Paper,
    Stack,
    Tooltip,
    IconButton,
    Typography,
    Divider,
    TableContainer,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Chip
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import CopyAllIcon from '@mui/icons-material/CopyAll';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import SyncIcon from '@mui/icons-material/Sync';
import DocumentScannerIcon from '@mui/icons-material/DocumentScanner';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

import { copyText } from '../utils/copyText';
import { scrollbar } from '../styles/scrollbar';

/**
 * Custom renderer for Markdown code blocks and inline code, used with react-markdown.
 *
 * Props from react-markdown:
 * - inline: boolean — inline code vs fenced
 * - className: "language-xxx"
 * - children: code content
 */
export default function CodeBlockRenderer({
    inline,
    className,
    children,
    ...props
}) {
    // ST tool state
    const [variables, setVariables] = useState([]);
    const [logicCode, setLogicCode] = useState('');
    const [showVariables, setShowVariables] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const [copied, setCopied] = useState(null);
    const timerRef = useRef(null);

    const theme = useTheme();

    const raw = String(children ?? '');
    const lang =
        /language-([\w#+.-]+)/.exec(className || '')?.[1]?.toLowerCase() || '';

    // Heuristic: treat tiny, single-line, lang-less "blocks" as inline chips
    const looksInlineish = useMemo(
        () =>
            !inline && !lang && !raw.includes('\n') && raw.trim().length <= 80,
        [inline, lang, raw]
    );

    // Detect ST code
    const isSTCode = useMemo(() => {
        const lower = raw.toLowerCase();
        return lower.includes('var') && lower.includes('end_var');
    }, [raw]);

    // Theme-aware surfaces
    const surface = theme.palette.mode === 'dark' ? '#2e2e2e' : '#e5e7ea';
    const border = theme.palette.mode === 'dark' ? '#141414' : '#e5e9f0';
    const textPrimary = theme.palette.mode === 'dark' ? '#f8f8f2' : '#2c3e50';
    const subSurface =
        theme.palette.mode === 'dark'
            ? '#2a2a2a'
            : alpha(theme.palette.grey[100], 0.8);

    // Copy handler
    const handleCopy = async (kind) => {
        const textByKind = { all: raw, logic: logicCode };
        const text = textByKind[kind.toLowerCase()];
        if (!text) return;

        try {
            await copyText(text);
            setCopied(kind);
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => setCopied(null), 2000);
        } catch (err) {
            console.error('Copy failed:', err);
        }
    };

    useEffect(
        () => () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        },
        []
    );

    // ST parse
    const parseSTCode = async () => {
        setIsProcessing(true);
        try {
            const response = await fetch(`/api/parse_st_code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: raw, extract_type: 'both' })
            });
            if (!response.ok) throw new Error('API 失敗');
            const data = await response.json();
            if (data.success) {
                setVariables(data.variables || []);
                setLogicCode(data.logic_code || '');
            }
        } catch (error) {
            console.error('API 錯誤:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    // CSV helpers
    const convertToCSV = () => {
        if (variables.length === 0) return '';
        const headers = [
            'Class',
            'Identifier',
            'Address',
            'Type',
            'Initial Value',
            'Comment'
        ];
        const rows = variables.map((v) => [
            v.class_name,
            v.identifier,
            v.address,
            v.var_type,
            v.initial_value,
            v.comment
        ]);
        return [
            headers.join(','),
            ...rows.map((row) => row.map((c) => `"${c ?? ''}"`).join(','))
        ].join('\n');
    };

    const downloadCSV = () => {
        const csv = convertToCSV();
        if (!csv) return;
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `variables_${Date.now()}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Inline (or looks-inlineish) rendering
    if (inline || looksInlineish) {
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
                    fontFamily: 'Consolas, Monaco, monospace',
                    fontSize: '0.92em'
                }}
                {...props}
            >
                {raw}
            </Box>
        );
    }

    return (
        <>
            {/* Code block */}
            <Paper
                variant="outlined"
                sx={{
                    p: 1.25,
                    pt: 1, // keep the toolbar tight to the top
                    borderRadius: 2,
                    my: 1,
                    overflowX: 'auto',
                    fontFamily: 'Consolas, Monaco, monospace',
                    bgcolor: surface,
                    borderColor: border,
                    color: textPrimary
                }}
            >
                {/* Toolbar: caption (left) + buttons (right) */}
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
                        {/* Copy ALL */}
                        <Tooltip title="複製全部">
                            <span>
                                <IconButton
                                    size="small"
                                    onClick={() => handleCopy('all')}
                                    sx={{
                                        color: textPrimary,
                                        '&:active': { opacity: 0.6 }
                                    }}
                                >
                                    {copied === 'all' ? (
                                        <CheckIcon fontSize="small" />
                                    ) : (
                                        <CopyAllIcon fontSize="small" />
                                    )}
                                </IconButton>
                            </span>
                        </Tooltip>

                        {/* ST tools (only for ST) */}
                        {isSTCode && (
                            <>
                                {/* Parse */}
                                <Tooltip title="解析程式碼">
                                    <span>
                                        <IconButton
                                            size="small"
                                            onClick={parseSTCode}
                                            disabled={isProcessing}
                                            sx={{
                                                color: textPrimary,
                                                '& .spin': {
                                                    animation: isProcessing
                                                        ? 'spin 1s linear infinite'
                                                        : 'none'
                                                }
                                            }}
                                        >
                                            {isProcessing ? (
                                                <SyncIcon
                                                    className="spin"
                                                    fontSize="small"
                                                />
                                            ) : (
                                                <DocumentScannerIcon fontSize="small" />
                                            )}
                                        </IconButton>
                                    </span>
                                </Tooltip>

                                {/* Copy logic (only if parsed) */}
                                {logicCode && (
                                    <>
                                        <Tooltip title="複製程式碼">
                                            <span>
                                                <IconButton
                                                    size="small"
                                                    onClick={() =>
                                                        handleCopy('logic')
                                                    }
                                                    sx={{ color: textPrimary }}
                                                >
                                                    {copied === 'logic' ? (
                                                        <CheckIcon fontSize="small" />
                                                    ) : (
                                                        <ContentCopyIcon fontSize="small" />
                                                    )}
                                                </IconButton>
                                            </span>
                                        </Tooltip>

                                        {/* Toggle variables */}
                                        <Tooltip
                                            title={
                                                showVariables
                                                    ? '關閉預覽'
                                                    : '預覽變數'
                                            }
                                        >
                                            <span>
                                                <IconButton
                                                    size="small"
                                                    onClick={() =>
                                                        setShowVariables(
                                                            (v) => !v
                                                        )
                                                    }
                                                    disabled={
                                                        variables.length === 0
                                                    }
                                                    sx={{ color: textPrimary }}
                                                >
                                                    {showVariables ? (
                                                        <VisibilityOffIcon fontSize="small" />
                                                    ) : (
                                                        <VisibilityIcon fontSize="small" />
                                                    )}
                                                </IconButton>
                                            </span>
                                        </Tooltip>

                                        {/* Count */}
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                ml: -0.25,
                                                mr: 0.25,
                                                opacity: 0.75
                                            }}
                                        >
                                            {variables.length > 0
                                                ? `(${variables.length})`
                                                : ''}
                                        </Typography>

                                        {/* Download CSV */}
                                        <Tooltip title="下載 CSV">
                                            <span>
                                                <IconButton
                                                    size="small"
                                                    onClick={downloadCSV}
                                                    disabled={
                                                        variables.length === 0
                                                    }
                                                    sx={{ color: textPrimary }}
                                                >
                                                    <FileDownloadIcon fontSize="small" />
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                    </>
                                )}
                            </>
                        )}
                    </Box>
                </Stack>

                {/* Variables table now INSIDE the code block, below buttons/caption, above divider */}
                {showVariables && variables.length > 0 && (
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
                                '&': {
                                    ...scrollbar(theme, { variant: 'neutral' })
                                }
                            }}
                        >
                            <Table size="small" stickyHeader>
                                <TableHead>
                                    <TableRow
                                        sx={{
                                            '& th': {
                                                bgcolor:
                                                    theme.palette.mode ===
                                                    'dark'
                                                        ? '#333'
                                                        : alpha(
                                                              theme.palette
                                                                  .grey[200],
                                                              0.6
                                                          )
                                            }
                                        }}
                                    >
                                        <TableCell>識別符</TableCell>
                                        <TableCell>類型</TableCell>
                                        <TableCell>位址</TableCell>
                                        <TableCell>初始值</TableCell>
                                        <TableCell>註解</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {variables.map((v, i) => (
                                        <TableRow key={i} hover>
                                            <TableCell>
                                                {v.identifier}
                                            </TableCell>
                                            <TableCell>{v.var_type}</TableCell>
                                            <TableCell>
                                                {v.address || '-'}
                                            </TableCell>
                                            <TableCell>
                                                {v.initial_value || '-'}
                                            </TableCell>
                                            <TableCell>
                                                {v.comment || '-'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                )}

                <Divider
                    sx={{ mb: 1, borderColor: alpha(textPrimary, 0.12) }}
                />

                {/* Code content */}
                <Box
                    component="pre"
                    sx={{
                        m: 0,
                        whiteSpace: 'pre',
                        overflowX: 'auto',
                        lineHeight: 1.5,
                        tabSize: 4,
                        fontSize: '0.95em',
                        color: textPrimary,
                        bgcolor: 'transparent',
                        '&': { ...scrollbar(theme, { variant: 'neutral' }) }
                    }}
                >
                    <Box component="code" className={className} {...props}>
                        {raw}
                    </Box>
                </Box>
            </Paper>

            {/* tiny keyframes for the spinner */}
            <style>{`@keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }`}</style>
        </>
    );
}
