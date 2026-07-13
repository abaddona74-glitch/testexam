/**
 * Yandex SmartCaptcha server-side verification
 */

export async function verifyCaptcha(token, clientIp) {
    const secret = process.env.YCAPTCHA_SECRET;

    if (!secret) {
        console.warn("YCAPTCHA_SECRET is missing. Skipping verification.");
        return { success: true, score: 1, bypassed: true };
    }

    if (!token) {
        return { success: false, error: 'Token missing' };
    }

    try {
        const params = { secret, token };
        if (clientIp) params.ip = clientIp;

        const response = await fetch('https://smartcaptcha.yandexcloud.net/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams(params).toString()
        });

        const data = await response.json();
        data._httpStatus = response.status;

        if (data.status === 'ok') {
            return { success: true, score: 1 };
        }

        console.error("Yandex captcha verification failed:", JSON.stringify(data));
        return {
            success: false,
            error: `captcha_failed:${data.status}`,
            details: data,
            score: 0
        };
    } catch (error) {
        console.error('Yandex Captcha verification error:', error);
        return { success: false, error: 'Verification error' };
    }
}
