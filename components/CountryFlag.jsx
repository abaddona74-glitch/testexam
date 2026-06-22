'use client';
import { useState } from 'react';

// Country Flag Component (with error handling)
export default function CountryFlag({ countryCode }) {
    const [imgError, setImgError] = useState(false);

    // Validate: countryCode must be a 2-letter ISO alpha-2 code
    const isValidCode = typeof countryCode === 'string' && /^[A-Za-z]{2}$/.test(countryCode);

    if (!countryCode || !isValidCode || imgError) {
        // Show a country-agnostic flag emoji as a safe fallback
        return <span className="text-lg" title={countryCode || 'Unknown'}>{'\uD83C\uDFF3\uFE0F'}</span>;
    }

    return (
        <img
            src={`/flags/${countryCode.toLowerCase()}.png`}
            alt={countryCode}
            width={24}
            height={18}
            className="inline-block shadow-sm rounded-[2px] object-cover"
            onError={() => setImgError(true)}
            loading="lazy"
        />
    );
}
