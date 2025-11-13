// ============================
// src/components/codeblock/CodeBlockRenderer.jsx
// ============================
import { useEffect, useMemo, useRef, useState } from 'react';
import { Divider, Paper } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

import { copyText } from '../../utils/copyText';

import InlineCode from './InlineCode';
import CodeToolbar from './CodeToolbar';
import VariablesTable from './VariablesTable';
import CodeContent from './CodeContent';

function SpinKeyframes() {
    return (
        <style>{`@keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }`}</style>
    );
}

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
        return <InlineCode raw={raw} {...props} />;
    }

    return (
        <>
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
                {/* Toolbar */}
                <CodeToolbar
                    lang={lang}
                    textPrimary={textPrimary}
                    isSTCode={isSTCode}
                    isProcessing={isProcessing}
                    hasLogicCode={Boolean(logicCode)}
                    copiedKind={copied}
                    onCopyAll={() => handleCopy('all')}
                    onParse={parseSTCode}
                    onCopyLogic={() => handleCopy('logic')}
                    showVariables={showVariables}
                    onToggleVariables={() =>
                        setShowVariables((current) => !current)
                    }
                    variablesCount={variables.length}
                    hasVariables={variables.length > 0}
                    onDownloadCSV={downloadCSV}
                />

                {/* Variables table (optional) */}
                <VariablesTable
                    show={showVariables}
                    variables={variables}
                    subSurface={subSurface}
                />

                <Divider
                    sx={{ mb: 1, borderColor: alpha(textPrimary, 0.12) }}
                />

                {/* Code content */}
                <CodeContent
                    className={className}
                    raw={raw}
                    textPrimary={textPrimary}
                    {...props}
                />
            </Paper>

            <SpinKeyframes />
        </>
    );
}
