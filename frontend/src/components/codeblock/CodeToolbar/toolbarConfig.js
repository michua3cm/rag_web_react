// ============================
// src/components/codeblock/CodeToolbar/toolbarConfig.js
// ============================
import CheckIcon from '@mui/icons-material/Check';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CopyAllIcon from '@mui/icons-material/CopyAll';
import DocumentScannerIcon from '@mui/icons-material/DocumentScanner';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SyncIcon from '@mui/icons-material/Sync';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

/**
 * ctx shape (passed from CodeToolbar props):
 * {
 *   textPrimary,
 *   isProcessing,
 *   hasLogicCode,
 *   copiedKind,
 *   showVariables,
 *   hasVariables,
 *   variablesCount,
 *   onCopyAll,
 *   onParse,
 *   onCopyLogic,
 *   onToggleVariables,
 *   onDownloadCSV,
 * }
 */

export const BUTTONS_BASE = [
    {
        id: 'copyAll',
        kind: 'button',
        title: '複製全部',
        icon: (ctx) =>
            ctx.copiedKind === 'all' ? (
                <CheckIcon fontSize="small" />
            ) : (
                <CopyAllIcon fontSize="small" />
            ),
        onClick: (ctx) => ctx.onCopyAll(),
        disabled: () => false,
        sx: (ctx) => ({
            color: ctx.textPrimary,
            '&:active': { opacity: 0.6 }
        })
    }
];

export const ITEMS_ST = [
    {
        id: 'parse',
        kind: 'button',
        title: '解析程式碼',
        icon: (ctx) =>
            ctx.isProcessing ? (
                <SyncIcon className="spin" fontSize="small" />
            ) : (
                <DocumentScannerIcon fontSize="small" />
            ),
        onClick: (ctx) => ctx.onParse(),
        disabled: (ctx) => ctx.isProcessing,
        sx: (ctx) => ({
            color: ctx.textPrimary,
            '& .spin': {
                animation: ctx.isProcessing ? 'spin 1s linear infinite' : 'none'
            }
        }),
        show: () => true
    },
    {
        id: 'copyLogic',
        kind: 'button',
        title: '複製程式碼',
        icon: (ctx) =>
            ctx.copiedKind === 'logic' ? (
                <CheckIcon fontSize="small" />
            ) : (
                <ContentCopyIcon fontSize="small" />
            ),
        onClick: (ctx) => ctx.onCopyLogic(),
        disabled: (ctx) => !ctx.hasLogicCode,
        sx: (ctx) => ({
            color: ctx.textPrimary
        }),
        show: (ctx) => ctx.hasLogicCode
    },
    {
        id: 'toggleVariables',
        kind: 'button',
        title: (ctx) => (ctx.showVariables ? '關閉預覽' : '預覽變數'),
        icon: (ctx) =>
            ctx.showVariables ? (
                <VisibilityOffIcon fontSize="small" />
            ) : (
                <VisibilityIcon fontSize="small" />
            ),
        onClick: (ctx) => ctx.onToggleVariables(),
        disabled: (ctx) => !ctx.hasVariables,
        sx: (ctx) => ({
            color: ctx.textPrimary
        }),
        show: (ctx) => ctx.hasLogicCode
    },
    {
        id: 'variablesCount',
        kind: 'label',
        render: (ctx) =>
            ctx.hasVariables && ctx.variablesCount > 0
                ? `(${ctx.variablesCount})`
                : '',
        show: (ctx) => ctx.hasLogicCode && ctx.hasVariables
    },
    {
        id: 'downloadCsv',
        kind: 'button',
        title: '下載 CSV',
        icon: () => <FileDownloadIcon fontSize="small" />,
        onClick: (ctx) => ctx.onDownloadCSV(),
        disabled: (ctx) => !ctx.hasVariables,
        sx: (ctx) => ({
            color: ctx.textPrimary
        }),
        show: (ctx) => ctx.hasLogicCode
    }
];
