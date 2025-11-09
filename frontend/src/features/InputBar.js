import { useState, useMemo, useCallback } from 'react';
import { Box } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import StopIcon from '@mui/icons-material/Stop';
import HybridTextField from '../components/HybridTextField';

export default function InputBar({ onSend, onStop, isStreaming, disabled }) {
    const [value, setValue] = useState('');
    const canSend = value.trim().length > 0;

    // Stable submit handler
    const submit = useCallback(() => {
        const text = value.trim();
        if (!text) return;
        onSend?.(text);
        setValue('');
    }, [onSend, value]);

    const adornments = useMemo(
        () => ({
            end: {
                icon: isStreaming ? <StopIcon /> : <SendIcon />,
                onClick: isStreaming ? onStop : canSend ? submit : undefined,
                disabled: (!canSend && !isStreaming) || disabled,
                ariaLabel: isStreaming ? 'stop' : 'send',
                tooltip: isStreaming ? 'Stop' : 'Send'
            }
        }),
        [isStreaming, disabled, canSend, onStop, submit]
    );

    const onKeyDown = (e) => {
        if (e.isComposing) return;
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!isStreaming && canSend) submit();
        }
    };

    return (
        <Box>
            <HybridTextField
                fullWidth
                placeholder={isStreaming ? 'Receiving…' : 'Type your message'}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={onKeyDown}
                disabled={disabled}
                minRows={1}
                maxRows={6}
                adornments={adornments}
            />
        </Box>
    );
}
