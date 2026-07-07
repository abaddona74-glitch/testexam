'use client';

import { ServerError } from '@/components/error-page';

export default function GlobalError({ error, reset }) {
    return (
        <html lang="en">
            <body>
                <ServerError error={error} reset={reset} />
            </body>
        </html>
    );
}
