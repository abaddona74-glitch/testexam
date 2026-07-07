'use client';

import { ServerError } from '@/components/error-page';

export default function Error({ error, reset }) {
    return <ServerError error={error} reset={reset} />;
}
