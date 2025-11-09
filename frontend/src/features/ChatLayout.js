import React from 'react';
import {
    AppBar,
    Toolbar,
    Typography,
    Box,
    Drawer,
    IconButton,
    Stack,
    useTheme
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import ModelSelector from './ModelSelector'; // assumes you already have this
import Settings from './Settings'; // assumes you already have this
import ChatBox from './ChatBox';
import InputBar from './InputBar';

const APPBAR_HEIGHT = 64;

export default function ChatLayout({
    title = 'LLM Chat',
    models = [],
    modelSelectorSx,
    themeMode, // optional: only used if your Settings menu needs it
    setThemeMode // optional
}) {
    const theme = useTheme();

    // Model selector - default to first model
    const [model, setModel] = React.useState(models?.[0]?.id ?? '');

    // Settings menu anchor
    const [settingsAnchorEl, setSettingsAnchorEl] = React.useState(null);
    const settingsOpen = Boolean(settingsAnchorEl);

    // Streaming chat state (kept OUT of App.js)
    const [messages, setMessages] = React.useState([
        { id: 1, role: 'assistant', content: 'Hi! Ask me anything.' }
    ]);
    const [isStreaming, setIsStreaming] = React.useState(false);
    const eventSourceRef = React.useRef(null);

    const endpointFor = React.useCallback((mode) => {
        switch (mode) {
            case 'gemini':
                return '/gemini_stream';
            case 'geminiNative':
                return '/gemini_native_stream';
            case 'dms':
                return '/dms_stream';
            case 'openrouter':
                return '/openrouter_stream';
            case 'rag':
                return '/stream'; // your default RAG/Edge endpoint
            default:
                return '/stream';
        }
    }, []);

    const handleSend = React.useCallback(
        (text) => {
            if (!text?.trim() || isStreaming) return;

            const userQuestion = text.trim();
            setIsStreaming(true);

            // 1) append user message
            setMessages((prev) => [
                ...prev,
                { role: 'user', content: userQuestion, id: crypto.randomUUID() }
            ]);

            // 2) append assistant placeholder
            const chatbotMessageId = crypto.randomUUID();
            setMessages((prev) => [
                ...prev,
                {
                    role: 'assistant',
                    content: '請稍後...',
                    id: chatbotMessageId,
                    streaming: ''
                }
            ]);

            // 3) open SSE
            const endpoint = endpointFor(model);
            const url = `/api${endpoint}?question=${encodeURIComponent(
                userQuestion
            )}`;

            const es = new EventSource(url);
            eventSourceRef.current = es;

            let accumulatedText = '';
            let isFirstChunk = true;

            es.onmessage = (event) => {
                if (event.data === '[DONE]') {
                    es.close();
                    setIsStreaming(false);
                    return;
                }

                if (event.data?.startsWith?.('[錯誤]')) {
                    setMessages((prev) => {
                        const copy = [...prev];
                        const last = copy.length - 1;
                        copy[last] = {
                            ...copy[last],
                            content: `[連線錯誤] ${event.data}`
                        };
                        return copy;
                    });
                    es.close();
                    setIsStreaming(false);
                    return;
                }

                if (isFirstChunk) {
                    accumulatedText = '';
                    isFirstChunk = false;
                }
                if (event.data) {
                    accumulatedText += event.data;
                    setMessages((prev) => {
                        const copy = [...prev];
                        const last = copy.length - 1;
                        copy[last] = {
                            ...copy[last],
                            content: accumulatedText,
                            timestamp: Date.now()
                        };
                        return copy;
                    });
                }
            };

            es.onerror = (err) => {
                console.error('EventSource error:', err);
                es.close();
                setIsStreaming(false);
            };
        },
        [endpointFor, isStreaming, model]
    );

    const handleStop = React.useCallback(() => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
            setIsStreaming(false);
        }
    }, []);

    return (
        <Box
            sx={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}
        >
            {/* Top AppBar: white/very light in light theme */}
            <AppBar
                position="fixed"
                elevation={1}
                color="default"
                sx={{
                    height: APPBAR_HEIGHT,
                    justifyContent: 'center',
                    bgcolor: (t) => t.palette.background.paper,
                    color: (t) => t.palette.text.primary
                }}
            >
                <Toolbar sx={{ minHeight: APPBAR_HEIGHT, gap: 1 }}>
                    <ModelSelector
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        models={models}
                        sx={modelSelectorSx}
                        showLabel={false}
                        disabled={isStreaming}
                    />

                    <Typography
                        variant="h6"
                        component="div"
                        sx={{ flex: 1, textAlign: 'center', fontWeight: 600 }}
                    >
                        {title}
                    </Typography>

                    <IconButton
                        edge="end"
                        aria-label="settings"
                        onClick={(e) => setSettingsAnchorEl(e.currentTarget)}
                    >
                        <SettingsIcon />
                    </IconButton>

                    {/** Settings menu (with Light/Dark/System if you wired it) */}
                    <Settings
                        anchorEl={settingsAnchorEl}
                        open={settingsOpen}
                        onClose={() => setSettingsAnchorEl(null)}
                        themeMode={themeMode}
                        setThemeMode={setThemeMode}
                    />
                </Toolbar>
            </AppBar>

            {/* Middle + Bottom: persistent Drawer (fills below AppBar) */}
            <Drawer
                variant="persistent"
                anchor="bottom"
                open
                PaperProps={{
                    sx: {
                        height: `calc(100dvh - ${APPBAR_HEIGHT}px)`,
                        top: APPBAR_HEIGHT,
                        borderTopLeftRadius: 16,
                        borderTopRightRadius: 16,
                        overflow: 'hidden',
                        display: 'flex'
                    }
                }}
            >
                <Stack sx={{ flex: 1, minHeight: 0 }}>
                    <ChatBox messages={messages} sx={{ flex: 1 }} />
                    <Box
                        sx={{
                            px: 2,
                            pb: 2,
                            pt: 1,
                            borderTop: `1px solid ${theme.palette.divider}`
                        }}
                    >
                        <InputBar
                            disabled={false}
                            isStreaming={isStreaming}
                            onSend={handleSend}
                            onStop={handleStop}
                        />
                    </Box>
                </Stack>
            </Drawer>

            {/* spacer for fixed AppBar safety */}
            <Box sx={{ height: APPBAR_HEIGHT }} />
        </Box>
    );
}
