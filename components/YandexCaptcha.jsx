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

    if (token) return (
        <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 select-none">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            Verified
        </div>
    );

    return (
        <div className="yandex-captcha-wrapper">
            <SmartCaptcha
                sitekey={sitekey}
                onSuccess={handleSuccess}
                invisible={!visible}
            />
        </div>
    );
}
