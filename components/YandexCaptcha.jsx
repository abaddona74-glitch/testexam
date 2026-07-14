'use client';

import { InvisibleSmartCaptcha } from '@yandex/smart-captcha';
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
    'base-background-color': '#030712',
    'base-border': '1px solid #6b6b72',
    'base-border-radius': '11px',
    'popup-border-radius': '24px',
    'base-checkbox-background-color': '#030712',
    'base-checkbox-background-color-error': 'rgba(255, 51, 51, 0.12)',
    'base-checkbox-background-color-checked': '#5c81d1',
    'base-checkbox-check-mark-color': '#fff',
    'base-checkbox-border': '2px solid #6b6b72',
    'base-checkbox-spin-color': '#5c81d1',
    'popup-image-container-background-color': '#1e1f2b',
    'popup-textinput-background-color': '#030712',
    'popup-textinput-border': '2px solid #ffffff26',
    'popup-textinput-border-focus': '2px solid #ffffff50',
    'popup-textinput-text-color': '#ffffff80',
    'popup-action-button-background-color': '#5c81d1',
    'popup-action-button-background-color-hover': '#6b94f7',
    'popup-action-button-text-color': '#fff',
    'popup-listen-button-background-color': '#fff',
    'popup-listen-button-text-color': 'red',
    'popup-tooltip-text-color': '#030712',
    'popup-tooltip-background-color': '#adafb6',
    'base-error-color': '#f33',
};

export default function YandexCaptcha({ onToken, trigger }) {
    const [obtained, setObtained] = useState(false);
    const { resolvedTheme } = useTheme();
    const sitekey = process.env.NEXT_PUBLIC_YCAPTCHA_SITEKEY;

    if (!sitekey) return null;

    const handleSuccess = useCallback((t) => {
        setObtained(true);
        onToken?.(t);
    }, [onToken]);

    const isDark = resolvedTheme === 'dark';

    return (
        <div style={{ height: 0, overflow: 'visible' }}>
            {obtained ? null : (
                <InvisibleSmartCaptcha
                    sitekey={sitekey}
                    onSuccess={handleSuccess}
                    host="smartcaptcha.yandexcloud.net"
                    hideShield
                    visible={trigger}
                    theme={isDark ? 'dark' : 'light'}
                    style={isDark ? darkStyle : lightStyle}
                />
            )}
        </div>
    );
}