import React from 'react';
import {
    Menu,
    MenuItem,
    ListItemText,
    ListItemIcon,
    Divider,
    Switch,
    MenuList,
    ListSubheader
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import { registry } from '../settings/registry';
import { useSettings, useSetting } from '../settings/context';

function GroupedMenuItems({ onClose }) {
    // Create groups -> items map from registry
    const entries = Object.entries(registry);
    const groups = {};
    for (const [key, cfg] of entries) {
        const g = cfg.group ?? 'General';
        (groups[g] ??= []).push([key, cfg]);
    }

    return (
        <>
            {Object.entries(groups).map(([groupName, items], groupIdx) => (
                <MenuList
                    key={groupName}
                    subheader={
                        <ListSubheader disableSticky>{groupName}</ListSubheader>
                    }
                    dense
                    sx={{
                        minWidth: 240,
                        p: 0,
                        '& .MuiMenuItem-root': { py: 0.75 }
                    }}
                >
                    {items.map(([key, cfg]) => (
                        <SettingRow
                            key={key}
                            settingKey={key}
                            cfg={cfg}
                            onClose={onClose}
                        />
                    ))}
                    {groupIdx < Object.keys(groups).length - 1 && (
                        <Divider sx={{ my: 0.5 }} />
                    )}
                </MenuList>
            ))}
        </>
    );
}

function SettingRow({ settingKey, cfg, onClose }) {
    const [value, setValue] = useSetting(settingKey);

    if (cfg.type === 'toggle') {
        return (
            <MenuItem
                onClick={() => {
                    setValue(!value);
                    onClose?.();
                }}
            >
                <ListItemText primary={cfg.label} />
                <Switch edge="end" checked={!!value} />
            </MenuItem>
        );
    }

    if (cfg.type === 'select' || cfg.type === 'radio') {
        return (
            <>
                {cfg.options.map((opt) => {
                    const selected = value === opt.value;
                    return (
                        <MenuItem
                            key={opt.value}
                            selected={cfg.type === 'radio' ? selected : false}
                            onClick={() => {
                                setValue(opt.value);
                                onClose?.();
                            }}
                        >
                            <ListItemIcon sx={{ minWidth: 28 }}>
                                {cfg.type === 'radio' && selected ? (
                                    <CheckIcon fontSize="small" />
                                ) : null}
                            </ListItemIcon>
                            <ListItemText
                                primary={
                                    cfg.type === 'select'
                                        ? `${cfg.label}: ${opt.label}`
                                        : opt.label
                                }
                            />
                        </MenuItem>
                    );
                })}
            </>
        );
    }

    // Fallback (shouldn’t happen)
    return (
        <MenuItem disabled>
            <ListItemText primary={cfg.label} secondary="Unsupported type" />
        </MenuItem>
    );
}

export default function Settings({ anchorEl, open, onClose }) {
    return (
        <Menu anchorEl={anchorEl} open={open} onClose={onClose} keepMounted>
            <GroupedMenuItems onClose={onClose} />
        </Menu>
    );
}
