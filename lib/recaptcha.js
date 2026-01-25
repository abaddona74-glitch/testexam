
export async function verifyRecaptcha(token) {
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;

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
        if (!data.success || data.score < 0.5) {
            console.error("❌ reCAPTCHA Verification Failed:", JSON.stringify(data, null, 2));
        }

        if (data.success && data.score >= 0.5) {
            return { success: true, score: data.score };
        } else {
            return { success: false, error: 'Low score or invalid token', score: data.score };
        }
    } catch (error) {
        console.error('Recaptcha verification failed:', error);
        return { success: false, error: 'Verification error' };
    }
}
