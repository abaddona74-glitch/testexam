'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Home, RefreshCw, ArrowLeft } from 'lucide-react';
import { useEffect } from 'react';

export default function ErrorPage({ code, title, message, icon: Icon, accent = 'blue' }) {
    const palettes = {
        blue: {
            blob1: 'bg-blue-500/20',
            blob2: 'bg-cyan-500/20',
            blob3: 'bg-indigo-500/20',
            grad: 'from-blue-500 via-cyan-500 to-indigo-500',
            btn: 'from-blue-600 to-indigo-600 hover:shadow-blue-500/30',
            ring: 'ring-blue-500/20',
            glow: 'shadow-[0_0_40px_rgba(59,130,246,0.35)]',
            text: 'text-blue-500',
        },
        red: {
            blob1: 'bg-red-500/20',
            blob2: 'bg-orange-500/20',
            blob3: 'bg-rose-500/20',
            grad: 'from-red-500 via-orange-500 to-rose-500',
            btn: 'from-red-600 to-orange-600 hover:shadow-red-500/30',
            ring: 'ring-red-500/20',
            glow: 'shadow-[0_0_40px_rgba(239,68,68,0.35)]',
            text: 'text-red-500',
        },
    };
    const p = palettes[accent] || palettes.blue;

    return (
        <div className="relative min-h-screen flex items-center justify-center overflow-hidden px-4 py-16">
            {/* Animated background blobs */}
            <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
                <div className={`absolute top-[-10%] left-[-10%] h-[40vmax] w-[40vmax] rounded-full ${p.blob1} blur-3xl animate-blob`} />
                <div className={`absolute top-[20%] right-[-10%] h-[35vmax] w-[35vmax] rounded-full ${p.blob2} blur-3xl animate-blob animation-delay-2000`} />
                <div className={`absolute bottom-[-10%] left-[30%] h-[35vmax] w-[35vmax] rounded-full ${p.blob3} blur-3xl animate-blob animation-delay-4000`} />
            </div>

            {/* Grid overlay */}
            <div
                className="pointer-events-none absolute inset-0 -z-10 opacity-[0.04] dark:opacity-[0.07]"
                style={{
                    backgroundImage:
                        'linear-gradient(rgba(120,120,120,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(120,120,120,.6) 1px, transparent 1px)',
                    backgroundSize: '48px 48px',
                    maskImage: 'radial-gradient(ellipse at center, black 35%, transparent 75%)',
                    WebkitMaskImage: 'radial-gradient(ellipse at center, black 35%, transparent 75%)',
                }}
            />

            <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="relative w-full max-w-xl text-center"
            >
                {/* Icon badge */}
                {Icon && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.15, duration: 0.5, ease: 'backOut' }}
                        className={`mx-auto mb-8 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm ring-1 ${p.ring} ${p.glow} animate-float`}
                    >
                        <Icon className={`h-10 w-10 ${p.text}`} strokeWidth={1.8} />
                    </motion.div>
                )}

                {/* Big code number */}
                <motion.h1
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className={`select-none bg-gradient-to-br ${p.grad} bg-clip-text text-[7rem] sm:text-[10rem] font-black leading-none tracking-tighter text-transparent drop-shadow-sm`}
                >
                    {code}
                </motion.h1>

                {/* Title */}
                <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25, duration: 0.5 }}
                    className="mt-2 text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-50"
                >
                    {title}
                </motion.h2>

                {/* Message */}
                {message && (
                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35, duration: 0.5 }}
                        className="mx-auto mt-4 max-w-md text-base text-gray-600 dark:text-gray-400"
                    >
                        {message}
                    </motion.p>
                )}

                {/* Action buttons */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45, duration: 0.5 }}
                    className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3"
                >
                    <Link
                        href="/"
                        className={`group inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-gradient-to-r ${p.btn} px-6 py-3 font-semibold text-white shadow-lg transition-all hover:scale-[1.03] active:scale-95`}
                    >
                        <Home size={18} className="transition-transform group-hover:-translate-x-0.5" />
                        Bosh sahifaga qaytish
                    </Link>

                    <button
                        onClick={() => {
                            if (typeof window !== 'undefined') window.location.reload();
                        }}
                        className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-900/60 px-6 py-3 font-semibold text-gray-700 dark:text-gray-200 backdrop-blur-sm transition-all hover:scale-[1.03] hover:bg-white dark:hover:bg-gray-800 active:scale-95"
                    >
                        <RefreshCw size={18} />
                        Qayta urinib ko'rish
                    </button>
                </motion.div>

                {/* Back link */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                    className="mt-8"
                >
                    <Link
                        href="/"
                        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
                    >
                        <ArrowLeft size={14} />
                        test-exam.uz
                    </Link>
                </motion.div>
            </motion.div>
        </div>
    );
}

/** Wrapper for the not-found (404) variant */
export function NotFound() {
    return (
        <ErrorPage
            code={404}
            title="Sahifa topilmadi"
            message="Kechirasiz, siz qidirgan sahifa mavjud emas yoki ko'chirilgan bo'lishi mumkin. URL manzilni tekshirib ko'ring."
            accent="blue"
        />
    );
}

/** Wrapper for the error (500) variant - must be client + receive reset */
export function ServerError({ error, reset }) {
    useEffect(() => {
        if (process.env.NODE_ENV !== 'production') {
            // eslint-disable-next-line no-console
            console.error('App error boundary:', error);
        }
    }, [error]);

    return (
        <ErrorPage
            code={500}
            title="Server xatosi"
            message="Nimadir noto'g'ri ketdi. Texnik nosozlik yuzaga keldi — birozdan so'ng qayta urinib ko'ring."
            accent="red"
        />
    );
}
