'use client';

import { SmartCaptcha } from '@yandex/smart-captcha';
import { useState, useCallback } from 'react';

export default function YandexCaptcha({ onToken, visible = false }) {
    const [token, setToken] = useState('');
    const sitekey = process.env.NEXT_PUBLIC_YCAPTCHA_SITEKEY;

    if (!sitekey) return null;

    const handleSuccess = useCallback((t) => {
        setToken(t);
        onToken?.(t);
    }, [onToken]);

    // Token bor bo'lsa captcha componentini ko'rsatmaslik
    if (token) return null;

    return (
        <SmartCaptcha
            sitekey={sitekey}
            onSuccess={handleSuccess}
            invisible={!visible}
        />
    );
}
