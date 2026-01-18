'use client';

import { useState, useEffect } from 'react';
import clsx from 'clsx';

export const LiquidGlassClock = () => {
    const [time, setTime] = useState(null);

    useEffect(() => {
        setTime(new Date());
        const timer = setInterval(() => {
            setTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    if (!time) return null; // Prevent hydration mismatch

    const formatTime = (date) => {
        let hours = date.getHours();
        const minutes = date.getMinutes();
        const seconds = date.getSeconds();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        
        hours = hours % 12;
        hours = hours ? hours : 12; 
        
        const pad = (num) => num.toString().padStart(2, '0');
        return {
            time: `${pad(hours)}:${pad(minutes)}`,
            seconds: pad(seconds),
            ampm
        };
    };

    const { time: timeStr, seconds, ampm } = formatTime(time);

    return (
        <div className="hidden lg:flex relative items-center justify-center p-3 rounded-2xl overflow-hidden group select-none">
            {/* Liquid Background Effect */}
            <div className="absolute inset-0 bg-white/30 dark:bg-black/30 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-2xl shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] z-0"></div>
            
            {/* Animated Gradient Blob */}
            <div className="absolute -top-10 -left-10 w-24 h-24 bg-blue-500/30 rounded-full blur-2xl animate-blob"></div>
            <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-purple-500/30 rounded-full blur-2xl animate-blob animation-delay-2000"></div>
            
            {/* Glass Shine */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl z-10 pointer-events-none"></div>

            {/* Content */}
            <div className="relative z-20 flex items-baseline gap-1.5 text-gray-800 dark:text-white drop-shadow-sm font-mono tracking-widest">
                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-800 to-gray-600 dark:from-white dark:to-gray-300">
                    {timeStr}
                </span>
                <span className="text-xs font-medium opacity-60 w-[18px]">
                    {seconds}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-100 dark:bg-gray-800 px-1 rounded text-gray-500 dark:text-gray-400">
                    {ampm}
                </span>
            </div>

            {/* Interactive Liquid Border on Hover */}
            <div className="absolute inset-0 rounded-2xl border border-transparent group-hover:border-blue-400/30 transition-colors duration-300"></div>
        </div>
    );
};
