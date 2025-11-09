// features/ChatBox.js
import React, { useEffect, useRef } from 'react';
import { Box, Stack, Paper, Typography } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// NOTE: path is from /src/features to /src/components/CodeBlockRenderer/index
import CodeBlockRenderer from '../components/CodeBlockRenderer/index';

export default function ChatBox({ messages = [], sx }) {
    const scrollRef = useRef(null);

    useEffect(() => {
        scrollRef.current?.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: 'smooth'
        });
    }, [messages]);

    return (
        <Box ref={scrollRef} sx={{ px: 2, py: 2, overflowY: 'auto', ...sx }}>
            <Stack spacing={1.5}>
                {messages.map((m) => (
                    <MessageBubble
                        key={m.id || Math.random()}
                        role={m.role}
                        content={m.content}
                    />
                ))}
            </Stack>
        </Box>
    );
}

function MessageBubble({ role, content }) {
    const isUser = role === 'user';
    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: isUser ? 'flex-end' : 'flex-start'
            }}
        >
            <Paper
                elevation={0}
                sx={{
                    maxWidth: isUser ? '66%' : '100%', // user ≤ 2/3 width; assistant full-width style
                    px: 2,
                    py: isUser ? 0 : 1.25,
                    borderRadius: 2,
                    bgcolor: isUser ? 'action.selected' : 'background.paper',
                    border: isUser ? 1 : 0,
                    borderColor: isUser ? 'divider' : undefined,
                    width: isUser ? 'auto' : '100%'
                }}
            >
                <Typography
                    component="div"
                    sx={{
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        my: isUser ? -1 : 0
                    }}
                >
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                            code: (props) => <CodeBlockRenderer {...props} /> // your renderer
                        }}
                    >
                        {content || ''}
                    </ReactMarkdown>
                </Typography>
            </Paper>
        </Box>
    );
}
