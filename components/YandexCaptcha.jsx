'use client';

import { SmartCaptcha } from '@yandex/smart-captcha';
import { useState, useCallback } from 'react';
import { useTheme } from 'next-themes';

const lightStyle = {
    'text-color-primary': '#000',
    'focus-color': 'rgb(250, 192, 0)',
    'base-background-color': '#fff',
    'base-border': '1px solid #d9d9d9',
    'base-border-radius': '11px',
    'popup-border-radius': '24px',
    'base-checkbox-background-color': '#fff',
    'base-checkbox-background-color-error': 'rgba(255, 51, 51, 0.12)',
    'base-checkbox-background-color-checked': '#5282ff',
    'base-checkbox-check-mark-color': '#fff',
    'base-checkbox-border': '2px solid #ccc',
    'base-checkbox-spin-color': '#5282ff',
    'popup-image-container-background-color': 'rgba(0, 0, 0, 0.05)',
    'popup-textinput-background-color': '#fff',
    'popup-textinput-border': '2px solid rgba(0, 0, 0, 0.1)',
    'popup-textinput-border-focus': '2px solid rgba(0, 0, 0, 0.3)',
    'popup-textinput-text-color': '#000',
    'popup-action-button-background-color': '#5282ff',
    'popup-action-button-background-color-hover': '#5173cf',
    'popup-action-button-text-color': '#fff',
    'popup-listen-button-background-color': '#fff',
    'popup-listen-button-text-color': '#000',
    'popup-tooltip-text-color': '#fff',
    'popup-tooltip-background-color': '#333',
    'base-error-color': '#f33',
};

const darkStyle = {
    'text-color-primary': '#dfdfe0',
    'focus-color': 'rgb(250, 192, 0)',
    'base-background-color': '#313036',
    'base-border': '1px solid #d9d9d9',
    'base-border-radius': '11px',
    'popup-border-radius': '24px',
    'base-checkbox-background-color': '#313036',
    'base-checkbox-background-color-error': 'rgba(255, 51, 51, 0.12)',
    'base-checkbox-background-color-checked': '#5c81d1',
    'base-checkbox-check-mark-color': '#fff',
    'base-checkbox-border': '2px solid #6b6b72',
    'base-checkbox-spin-color': '#5c81d1',
    'popup-image-container-background-color': '#414148',
    'popup-textinput-background-color': '#313036',
    'popup-textinput-border': '2px solid #ffffff26',
    'popup-textinput-border-focus': '2px solid #ffffff50',
    'popup-textinput-text-color': '#ffffff80',
    'popup-action-button-background-color': '#5c81d1',
    'popup-action-button-background-color-hover': '#6b94f7',
    'popup-action-button-text-color': '#fff',
    'popup-listen-button-background-color': '#fff',
    'popup-listen-button-text-color': 'red',
    'popup-tooltip-text-color': '#313036',
    'popup-tooltip-background-color': '#adafb6',
    'base-error-color': '#f33',
};

export default function YandexCaptcha({ onToken }) {
    const [token, setToken] = useState('');
    const { resolvedTheme } = useTheme();
    const sitekey = process.env.NEXT_PUBLIC_YCAPTCHA_SITEKEY;

    if (!sitekey) return null;

    const handleSuccess = useCallback((t) => {
        setToken(t);
        onToken?.(t);
    }, [onToken]);

    if (token) return (
        <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 select-none">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            Verified
        </div>
    );

    const isDark = resolvedTheme === 'dark';

    return (
        <div className="fixed bottom-0 right-0 z-[9999]" style={{ lineHeight: 0 }}>
            <SmartCaptcha
                sitekey={sitekey}
                onSuccess={handleSuccess}
                host="smartcaptcha.yandexcloud.net"
                theme={isDark ? 'dark' : 'light'}
                style={isDark ? darkStyle : lightStyle}
            />
        </div>
    );
}