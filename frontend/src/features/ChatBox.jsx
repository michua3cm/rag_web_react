// ============================
// src/features/ChatBox.js
// ============================
import React, { useEffect, useRef } from 'react';
import { Box, Stack, Paper, Typography } from '@mui/material';
import { scrollbar } from '../styles/scrollbar';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import CodeBlockRenderer from '../components/codeblock/CodeBlockRenderer';

export default function ChatBox({ messages = [], sx, maxWidth = 768 }) {
    const scrollRef = useRef(null);

    useEffect(() => {
        scrollRef.current?.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: 'smooth'
        });
    }, [messages]);

    return (
        <Box
            ref={scrollRef}
            sx={(theme) => ({
                overflowY: 'auto',
                '&': { ...scrollbar(theme, { variant: 'neutral' }) },
                ...sx
            })}
        >
            {/* centered inner wrapper */}
            <Stack spacing={1} sx={{ mx: 'auto', width: '100%', maxWidth }}>
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
        <Paper
            elevation={0}
            sx={{
                alignSelf: isUser ? 'flex-end' : 'flex-start', // instead of parent flex
                maxWidth: isUser ? '66%' : '100%',
                width: isUser ? 'auto' : '100%', // user ≤ 2/3 width; assistant full-width style

                px: isUser ? 2 : 0,
                py: 0,
                borderRadius: isUser ? 4 : 0,
                bgcolor: isUser ? 'action.selected' : 'transparent',

                // optional quality-of-life tweaks that don't alter markdown spacing
                '& pre': { overflowX: 'auto' }, // allow code to scroll horizontally
                '& img': { maxWidth: '100%' } // responsive images
            }}
        >
            <Typography
                component="div"
                sx={{
                    display: 'contents',
                    color: 'inherit',
                    lineHeight: 'inherit',
                    fontSize: 'inherit'
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
    );
}
