
export async function verifyRecaptcha(token) {
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    const minScore = Number(process.env.RECAPTCHA_MIN_SCORE ?? 0.3);
    const expectedAction = 'ai_help';

    // Dev mode bypass (local testing)
    if (process.env.NEXT_PUBLIC_DEV_MODE === 'true') {
        console.warn("⚠️ DEV MODE: Skipping reCAPTCHA verification.");
        return { success: true, score: 1.0, bypassed: true };
    }
    
    if (!secretKey) {
        // If developer hasn't set up keys yet, we can either block or allow.
        // For now, let's log a warning and ALLOW (so app doesn't break during setup)
        console.warn("⚠️ RECAPTCHA_SECRET_KEY is missing. Skipping verification.");
        return { success: true, score: 1.0 }; 
    }

    if (!token) {
        return { success: false, error: 'Token missing' };
    }

    try {
        const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `secret=${secretKey}&response=${token}`,
        });

        const data = await response.json();

        // Debugging: Show exactly what Google says
        if (!data.success || (typeof data.score === 'number' && data.score < minScore)) {
            console.error("❌ reCAPTCHA Verification Failed:", JSON.stringify(data, null, 2));
        }

        if (!data.success) {
            return { success: false, error: (data['error-codes'] || []).join(', ') || 'invalid-token', score: data.score };
        }

        // Validate action if provided by Google
        if (data.action && data.action !== expectedAction) {
            return { success: false, error: `action-mismatch:${data.action}`, score: data.score };
        }

        // Score-based gate (v3). Some environments return low scores; allow tuning via env.
        if (typeof data.score === 'number' && data.score < minScore) {
            return { success: false, error: `low-score:${data.score}`, score: data.score };
        }

        return { success: true, score: data.score };
    } catch (error) {
        console.error('Recaptcha verification failed:', error);
        return { success: false, error: 'Verification error' };
    }
}
