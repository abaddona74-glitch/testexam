'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { ArrowRight, Loader2, Upload, Play, CheckCircle2, XCircle, RefreshCcw, User, Save, List, Trophy, AlertTriangle, Settings, Crown, Gem, Shield, Swords, Flag, MessageSquare, ArrowLeft, Clock, Folder, Smartphone, Monitor, Eye, EyeOff, X, Heart, CreditCard, Calendar, Lightbulb, Ghost, Skull, Zap, ChevronUp, ChevronDown, Star, Moon, Sun, ChevronRight, ChevronLeft, Gift, Lock, LockOpen, Key, Reply } from 'lucide-react';
import clsx from 'clsx';
import { useTheme } from 'next-themes';
import { ThemeToggle } from '@/components/theme-toggle';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

const DIFFICULTIES = [
    { id: 'easy', name: 'Easy', hints: 3, icon: Lightbulb, color: 'text-green-500', bg: 'bg-green-100', border: 'border-green-200', timeLimit: null },
    { id: 'middle', name: 'Middle', hints: 1, icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-100', border: 'border-yellow-200', timeLimit: null },
    { id: 'hard', name: 'Hard', hints: 0, icon: Swords, color: 'text-orange-500', bg: 'bg-orange-100', border: 'border-orange-200', timeLimit: 30 },
    { id: 'insane', name: 'Insane', hints: 0, icon: Skull, color: 'text-red-500', bg: 'bg-red-100', border: 'border-red-200', timeLimit: 20 },
    { id: 'impossible', name: 'Impossible', hints: 0, icon: Ghost, color: 'text-purple-600', bg: 'bg-purple-100', border: 'border-purple-200', timeLimit: 8 }
];

const EXAM_SCHEDULE = [
    { isHeader: true, title: "Call 1" },
    { name: "Digitalization", day: "13", month: "Jan", time: "10:00", room: "Lab-403", teacher: "Abdurasul B." },
    { name: "Data Mining", day: "15", month: "Jan", time: "10:00", room: "Lab-403", teacher: "Abdurasul B." },
    { name: "Software Project Management", day: "17", month: "Jan", time: "12:00", room: "Lab-403", teacher: "Usmanov M." },
    { name: "Software for Sustainable Development", day: "20", month: "Jan", time: "10:00", room: "Lab-403", teacher: "Jamshid Y." },
    { name: "Mobile Apps (Native and web)", day: "22", month: "Jan", time: "10:00", room: "Lab-403", teacher: "Salokhiddinov M." },
    { isHeader: true, title: "Call 2" },
    { name: "Digitalization", day: "23", month: "Jan", time: "10:00", room: "Lab-403/407", teacher: "Abdurasul B." },
    { name: "Data Mining", day: "26", month: "Jan", time: "10:00", room: "Lab-403/407", teacher: "Abdurasul B." },
    { name: "Software Project Management", day: "27", month: "Jan", time: "12:00", room: "Lab-403/407", teacher: "Usmanov M." },
    { name: "Software for Sustainable Development", day: "30", month: "Jan", time: "09:00", room: "Lab-403/407", teacher: "Jamshid Y." },
    { name: "Mobile Apps (Native and web)", day: "31", month: "Jan", time: "10:00", room: "Lab-403/407", teacher: "Salokhiddinov M." },
];

function getLeague(score, total, difficulty, duration = 0, questions = [], answers = {}) {
    const percentage = (score / total) * 100;

    // --- MYTHIC LOGIC (Impossible Mode) ---
    // If questions < 30: Need 100% Streak (Correct == Total)
    // If questions >= 30: Need Streak of 30 consecutive correct answers
    let qualifiesForMythic = false;

    if (difficulty === 'impossible') {
        if (total < 30) {
            // Short test: Requires Perfection (100% score) - which implies full streak
            if (percentage === 100) qualifiesForMythic = true;
        } else {
            // Long test: Requires 30 consecutive correct answers
            let maxStreak = 0;
            // Best effort streak calculation (requires answers data)
            if (questions && questions.length > 0 && answers) {
                let currentStreak = 0;
                questions.forEach((q, idx) => {
                    if (answers[idx] === q.correct_answer) {
                        currentStreak++;
                        if (currentStreak > maxStreak) maxStreak = currentStreak;
                    } else {
                        currentStreak = 0;
                    }
                });
            } else {
                // Fallback if detailed data missing but Score is high enough to mathematically prove streak?
                // Hard to prove without data. Assume if Score == Total then Streak == Total >= 30.
                if (percentage === 100) maxStreak = total; 
            }
            
            if (maxStreak >= 30) qualifiesForMythic = true;
        }
    }

    if (qualifiesForMythic) {
        return {
            name: 'Mythic',
            badgeClass: 'bg-gray-900/5 text-transparent bg-clip-text bg-gradient-to-r from-red-800 via-red-600 to-red-800 border-red-600 shadow-[0_0_15px_rgba(255,0,0,0.6)] font-extrabold',
            textClass: 'font-extrabold mythic-blood',
            rowClass: 'bg-gradient-to-r from-red-100/30 via-red-50/20 to-red-100/30 border-l-4 border-l-[#ff0000]',
            icon: Trophy
        };
    }

    // --- LEGENDARY LOGIC (Insane Mode) ---
    // If questions < 50: Need 100% Score
    // If questions >= 50: Need >= 95% Score (Mercy rule for fatigue)
    let qualifiesForLegendary = false;

    if (difficulty === 'insane') {
        if (total < 50) {
            if (percentage === 100) qualifiesForLegendary = true;
        } else {
            if (percentage >= 95) qualifiesForLegendary = true;
        }
    }

    if (qualifiesForLegendary) {
        return {
            name: 'Legendary',
            badgeClass: 'legendary-border-tail border-transparent legendary-rgb-text font-bold',
            textClass: 'font-bold legendary-rgb-text drop-shadow-[0_1px_1px_rgba(251,191,36,0.3)]',
            rowClass: 'bg-gradient-to-r from-amber-50/50 to-transparent border-l-4 border-l-amber-400',
            icon: Crown
        };
    }

    // Hard Mode max cap: Epic (Or simply apply percentage rules below, but block Legendary/Mythic)
    // Actually, normal percentage rules apply, but we just ensured Legendary/Mythic are harder to get.
    // However, if someone gets 100% in Hard mode, they shouldn't get Legendary. They get Epic or Diamond?
    // User requested: "hard mode niki 30sek vaqti unda legendary dan pastlarni ochsa boladi (epic ruby shunga oxwawlarni)"
    // So 100% in Hard -> Epic.

    if (percentage >= 85) return {
        name: 'Epic',
        badgeClass: 'bg-purple-50 text-purple-700 border-purple-200 font-semibold',
        textClass: 'font-semibold text-purple-700',
        rowClass: 'hover:bg-purple-50/30 border-l-4 border-l-transparent hover:border-l-purple-300',
        icon: Swords
    };

    if (percentage >= 70) return {
        name: 'Diamond',
        badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200',
        textClass: 'font-medium text-cyan-700',
        rowClass: 'hover:bg-cyan-50/30 transition-colors',
        icon: Gem
    };

    if (percentage >= 55) return {
        name: 'Ruby',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
        textClass: 'text-rose-600',
        rowClass: 'hover:bg-rose-50/30 transition-colors',
        icon: Shield
    };

    if (percentage >= 40) return {
        name: 'Iron',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
        textClass: 'text-slate-600',
        rowClass: 'hover:bg-slate-50 transition-colors',
        icon: Shield
    };

    return {
        name: 'Copper',
        badgeClass: 'bg-orange-100 text-orange-800 border-orange-200',
        textClass: 'text-orange-900',
        rowClass: 'hover:bg-orange-50 transition-colors',
        icon: Shield
    };
}

// Helper for Duration Formatting
function formatDuration(ms) {
    if (!ms) return "-";
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
}

// Helper for Score Formatting (rounds to 1 decimal place)
function formatScore(score) {
    if (score === undefined || score === null) return "0";
    // If it's a whole number, show without decimals
    if (Number.isInteger(score)) return score.toString();
    // Otherwise round to 1 decimal place
    return score.toFixed(1);
}

// Helper for relative time (simple version)
function timeAgo(dateString) {
    if (!dateString) return "-";
    const diff = (new Date() - new Date(dateString)) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return Math.floor(diff / 86400) + 'd ago';
}

function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

// Separate component or reused part for detailed review
function DetailedReview({ questions, answers }) {
    const [reportReason, setReportReason] = useState("");
    const [activeReportQuestion, setActiveReportQuestion] = useState(null);
    const [showReportModal, setShowReportModal] = useState(false);
    const [isReporting, setIsReporting] = useState(false);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800/50 overflow-hidden">
            <div className="p-0">
                <div className="bg-gray-50 dark:bg-gray-950 px-6 py-4 border-b border-gray-100 dark:border-gray-800/50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-700">Detailed Review</h3>
                </div>
                <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                    {questions.map((q, idx) => {
                        const userAnswer = answers[idx];
                        const isCorrect = userAnswer === q.correct_answer;
                        const userOption = q.shuffledOptions.find(o => o.id === userAnswer);
                        const correctOption = q.shuffledOptions.find(o => o.id === q.correct_answer);

                        return (
                            <div key={q.id || idx} className="p-6 hover:bg-gray-50 dark:bg-gray-950 transition-colors group">
                                <div className="flex gap-4">
                                    <div className="mt-1">
                                        {isCorrect ? (
                                            <CheckCircle2 className="text-green-500" size={24} />
                                        ) : (
                                            <XCircle className="text-red-500" size={24} />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-2">
                                            <p className="font-medium text-gray-900 dark:text-gray-100 pr-4">
                                                <span className="text-gray-400 mr-2">#{idx + 1}</span>
                                                {q.question}
                                            </p>
                                        </div>
                                        <div className="text-sm space-y-1">
                                            <div className={clsx("flex items-center gap-2", isCorrect ? "text-green-700" : "text-red-700")}>
                                                <span className="font-semibold w-24 flex-shrink-0">Your Answer:</span>
                                                <span>{userOption ? userOption.text : `Skipped or invalid (${userAnswer || 'None'})`}</span>
                                            </div>
                                            {!isCorrect && (
                                                <div className="flex items-center gap-2 text-green-700">
                                                    <span className="font-semibold w-24 flex-shrink-0">Correct:</span>
                                                    <span>{correctOption?.text || "Unknown"}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// Device Detection
function getDeviceType() {
    if (typeof window === 'undefined') return 'desktop';
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
        return 'mobile';
    }
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
        return 'mobile';
    }
    return 'desktop';
}

// Country Flag Component
function CountryFlag({ countryCode }) {
    if (!countryCode) return <span className="text-lg">🏳️</span>;
    return (
        <img
            src={`https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`}
            alt={countryCode}
            width={24}
            height={18}
            className="inline-block shadow-sm rounded-[2px] object-cover"
        />
    );
}

function validateJson(json) {
    if (!json || typeof json !== 'object') {
        return { valid: false, error: "Invalid JSON format. Root must be an object." };
    }
    // Check for common mistake: user uploaded array directly
    if (Array.isArray(json)) {
        return { valid: false, error: "Root must be an object { test_questions: [...] }, not an array." };
    }

    if (!json.test_questions || !Array.isArray(json.test_questions)) {
        return { valid: false, error: "Root object must contain 'test_questions' array." };
    }
    if (json.test_questions.length === 0) {
        return { valid: false, error: "'test_questions' array is empty." };
    }

    // Check structure of first 3 items or all
    for (let i = 0; i < Math.min(json.test_questions.length, 5); i++) {
        const q = json.test_questions[i];
        if (!q.question) return { valid: false, error: `Question #${i + 1} is missing 'question' field.` };
        if (!q.options) return { valid: false, error: `Question #${i + 1} is missing 'options' object.` };
        if (!q.correct_answer) return { valid: false, error: `Question #${i + 1} is missing 'correct_answer' field.` };

        // Check options is object
        if (typeof q.options !== 'object' || Array.isArray(q.options)) {
            return { valid: false, error: `Question #${i + 1}: 'options' must be an object { key: "value" }.` };
        }
    }

    return { valid: true };
}

const SPINNER_ITEMS = [
    { id: 'h10', label: '+10 Hints', type: 'hint', amount: 10, color: 'bg-orange-100 text-orange-600', icon: Lightbulb, probability: 0.1 },
    { id: 'e1', label: 'Try Again', type: 'empty', color: 'bg-gray-100 text-gray-400', icon: XCircle, probability: 0.1 },
    { id: 'h20', label: '+20 Hints', type: 'hint', amount: 20, color: 'bg-yellow-200 text-yellow-700', icon: Lightbulb, probability: 0.05 },
    { id: 'e2', label: 'Try Again', type: 'empty', color: 'bg-gray-100 text-gray-400', icon: XCircle, probability: 0.1 },
    { id: 's25', label: '+25 Stars', type: 'star', amount: 25, color: 'bg-blue-100 text-blue-600', icon: Star, probability: 0.15 },
    { id: 'e3', label: 'Try Again', type: 'empty', color: 'bg-gray-100 text-gray-400', icon: XCircle, probability: 0.1 },
    { id: 's50', label: '+50 Stars', type: 'star', amount: 50, color: 'bg-blue-200 text-blue-700', icon: Star, probability: 0.1 },
    { id: 'e4', label: 'Try Again', type: 'empty', color: 'bg-gray-100 text-gray-400', icon: XCircle, probability: 0.1 },
    { id: 's100', label: '+100 Stars', type: 'star', amount: 100, color: 'bg-blue-600 text-white', icon: Star, probability: 0.02 },
    { id: 'e5', label: 'Try Again', type: 'empty', color: 'bg-gray-100 text-gray-400', icon: XCircle, probability: 0.08 },
    { id: 'm2x', label: '2x (1h)', type: 'multiplier', val: 2, duration: 3600000, color: 'bg-purple-100 text-purple-600', icon: Zap, probability: 0.05 },
    { id: 'e6', label: 'Try Again', type: 'empty', color: 'bg-gray-100 text-gray-400', icon: XCircle, probability: 0.1 },
    { id: 'm3x', label: '3x (15m)', type: 'multiplier', val: 3, duration: 900000, color: 'bg-rose-100 text-rose-600', icon: Zap, probability: 0.02 },
    { id: 'e7', label: 'Try Again', type: 'empty', color: 'bg-gray-100 text-gray-400', icon: XCircle, probability: 0.08 },
    { id: 's10', label: '+10 Stars', type: 'star', amount: 10, color: 'bg-gray-100 text-gray-600', icon: Star, probability: 0.1 },
    { id: 'e8', label: 'Try Again', type: 'empty', color: 'bg-gray-100 text-gray-400', icon: XCircle, probability: 0.1 },
];

function DailySpinner({ onClose, onReward, freeSpins, userStars, onSpinStart, nextSpin, forceLucky, soundVolume = 0.8 }) {
    const [spinning, setSpinning] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [prize, setPrize] = useState(null);
    const isDev = process.env.NEXT_PUBLIC_DEV_MODE === 'true';
    const winAudioRef = useRef(null);
    const [needsWinSoundTap, setNeedsWinSoundTap] = useState(false);
    const spinAudioRef = useRef(null);
    const [needsSpinSoundTap, setNeedsSpinSoundTap] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (winAudioRef.current) return;
        try {
            const audio = new Audio('/congratulations-you-are-the-winner.mp3');
            audio.preload = 'auto';
            audio.volume = Math.max(0, Math.min(1, soundVolume));
            winAudioRef.current = audio;
        } catch { }
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (spinAudioRef.current) return;
        try {
            const audio = new Audio('/electric-slot-machine.mp3');
            audio.preload = 'auto';
            audio.loop = true;
            audio.volume = Math.max(0, Math.min(1, soundVolume));
            spinAudioRef.current = audio;
        } catch { }
    }, []);

    useEffect(() => {
        const audio = winAudioRef.current;
        if (!audio) return;
        audio.volume = Math.max(0, Math.min(1, soundVolume));
    }, [soundVolume]);

    useEffect(() => {
        const audio = spinAudioRef.current;
        if (!audio) return;
        audio.volume = Math.max(0, Math.min(1, soundVolume));
    }, [soundVolume]);

    const stopSpinSound = () => {
        const audio = spinAudioRef.current;
        if (!audio) return;
        try {
            audio.pause();
            audio.currentTime = 0;
        } catch { }
        setNeedsSpinSoundTap(false);
    };

    useEffect(() => {
        return () => {
            const audio = spinAudioRef.current;
            if (!audio) return;
            try {
                audio.pause();
                audio.currentTime = 0;
            } catch { }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const primeWinSound = () => {
        const audio = winAudioRef.current;
        if (!audio) return;
        try {
            const previousVolume = Math.max(0, Math.min(1, soundVolume));
            audio.volume = 0;
            audio.currentTime = 0;
            const p = audio.play();
            if (p && typeof p.then === 'function') {
                p.then(() => {
                    audio.pause();
                    audio.currentTime = 0;
                    audio.volume = previousVolume;
                }).catch(() => {
                    audio.volume = previousVolume;
                });
            } else {
                audio.pause();
                audio.currentTime = 0;
                audio.volume = previousVolume;
            }
        } catch { }
    };


    const playWinSound = async () => {
        const audio = winAudioRef.current;
        if (!audio) return;
        try {
            audio.currentTime = 0;
            await audio.play();
            setNeedsWinSoundTap(false);
        } catch {
            setNeedsWinSoundTap(true);
        }
    };

    const playSpinSound = async () => {
        let audio = spinAudioRef.current;
        if (!audio && typeof window !== 'undefined') {
            try {
                const created = new Audio('/electric-slot-machine.mp3');
                created.preload = 'auto';
                created.loop = true;
                created.volume = Math.max(0, Math.min(1, soundVolume));
                spinAudioRef.current = created;
                audio = created;
            } catch { }
        }
        if (!audio) return;
        try {
            audio.currentTime = 0;
            await audio.play();
            setNeedsSpinSoundTap(false);
        } catch (e) {
            console.warn('[spin sound] play blocked/failed', e);
            setNeedsSpinSoundTap(true);
        }
    };

    const handleSpin = (type) => {
        if (spinning) return;
        setPrize(null);
        setNeedsWinSoundTap(false);
        setNeedsSpinSoundTap(false);

        // Prime audio on user gesture to reduce autoplay blocks later
        primeWinSound();

        // Attempt to start spin
        const success = onSpinStart(type);
        if (!success) return;

        setSpinning(true);
        playSpinSound();

        // Determine result based on weighted probability
        let selectedIndex = 0;

        if (forceLucky) {
            const luckyItems = SPINNER_ITEMS.filter(i => i.type !== 'empty');
            const luckyItem = luckyItems[Math.floor(Math.random() * luckyItems.length)];
            selectedIndex = SPINNER_ITEMS.findIndex(i => i.id === luckyItem.id);
        } else {
            const rand = Math.random();
            let cumulative = 0;

            for (let i = 0; i < SPINNER_ITEMS.length; i++) {
                cumulative += SPINNER_ITEMS[i].probability;
                if (rand <= cumulative) {
                    selectedIndex = i;
                    break;
                }
            }
        }

        // Calculate rotation
        const segmentAngle = 360 / SPINNER_ITEMS.length;
        const randomOffset = Math.floor(Math.random() * (segmentAngle - 4)) - (segmentAngle / 2 - 2);

        // Target angle for the selected item to be at the top
        // Start from a clean modulo 360 representation of where we want to land
        const targetBaseAngle = (360 - (selectedIndex * segmentAngle)) + randomOffset;

        // Add minimum spins to the CURRENT rotation
        const minSpins = 360 * 8; // 8 full spins
        const rawNextRotation = rotation + minSpins;

        // Calculate adjustment needed to land on targetBaseAngle
        // (rawNextRotation + adjustment) % 360 = targetBaseAngle
        const currentMod = rawNextRotation % 360;
        let adjustment = targetBaseAngle - currentMod;

        // Ensure we always rotate forward or at least don't spin "backwards" too much relative to the visual velocity
        // Actually, ensuring adjustment is positive is safest for consistent speed feeling
        if (adjustment < 0) adjustment += 360;

        const totalRotation = rawNextRotation + adjustment;

        setRotation(totalRotation);

        setTimeout(() => {
            stopSpinSound();
            setSpinning(false);
            const wonItem = SPINNER_ITEMS[selectedIndex];
            setPrize(wonItem);

            if (wonItem.type !== 'empty') {
                playWinSound();
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 },
                    zIndex: 9999
                });
                setTimeout(() => {
                    onReward(wonItem);
                }, 1500);
            }
        }, 5000); // 5s spin duration matching CSS ease-out
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="relative max-w-sm w-full mx-4">
                <button
                    onClick={() => {
                        stopSpinSound();
                        onClose();
                    }}
                    className="absolute -top-12 right-0 text-white/70 hover:text-white transition-colors"
                    disabled={spinning}
                >
                    <XCircle size={32} />
                </button>

                <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-2xl overflow-hidden relative border border-gray-100 dark:border-gray-700">
                    <div className="text-center mb-8">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex flex-col items-start gap-1">
                                <div className="text-xs font-mono bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded text-gray-500">
                                    Spins: <span className={freeSpins > 0 || isDev ? "text-green-600 font-bold" : "text-gray-500"}>
                                        {isDev ? "Infinite" : `${freeSpins}/10`}
                                    </span>
                                </div>
                                {!isDev && freeSpins < 10 && nextSpin && (
                                    <span className="text-[10px] text-gray-400 font-mono pl-1">
                                        Next in: {nextSpin}
                                    </span>
                                )}
                            </div>
                            <div className="text-xs font-mono bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded text-yellow-700 dark:text-yellow-500">
                                Stars: {userStars}
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent">
                            Lucky Spin
                        </h2>
                        <p className="text-gray-500 text-sm">Hourly free spins (Stack up to 10)</p>
                    </div>

                    {/* Wheel Container */}
                    <div className="relative w-64 h-64 mx-auto mb-8">
                        {/* Pointer */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 z-20 text-red-500 filter drop-shadow-md">
                            <div className="w-8 h-8 rotate-180">
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2L2 22h20L12 2z" />
                                </svg>
                            </div>
                        </div>

                        {/* The Wheel */}
                        <div
                            className="w-full h-full rounded-full border-4 border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden relative transition-transform duration-[5000ms] ease-[cubic-bezier(0.1,0.7,0.1,1)]"
                            style={{ transform: `rotate(${rotation}deg)` }}
                        >
                            {/* Simplified Wheel using Conic Gradient Background + Absolute Icons */}
                            <div className="absolute inset-0 rounded-full"
                                style={{
                                    background: `conic-gradient(
                                        from -11.25deg,
                                        #fee2e2 0deg 22.5deg,   
                                        #f3f4f6 22.5deg 45deg,  
                                        #fef3c7 45deg 67.5deg,  
                                        #f3f4f6 67.5deg 90deg, 
                                        #dbeafe 90deg 112.5deg, 
                                        #f3f4f6 112.5deg 135deg,
                                        #d1fae5 135deg 157.5deg,
                                        #f3f4f6 157.5deg 180deg,
                                        #e0e7ff 180deg 202.5deg,
                                        #f3f4f6 202.5deg 225deg,
                                        #fae8ff 225deg 247.5deg,
                                        #f3f4f6 247.5deg 270deg,
                                        #ffe4e6 270deg 292.5deg,
                                        #f3f4f6 292.5deg 315deg,
                                        #fff1f2 315deg 337.5deg, 
                                        #f3f4f6 337.5deg 360deg
                                    )`
                                }}>
                            </div>

                            {/* Render Items */}
                            {SPINNER_ITEMS.map((item, idx) => {
                                const angle = (360 / SPINNER_ITEMS.length) * idx;
                                return (
                                    <div
                                        key={item.id}
                                        className="absolute top-0 left-1/2 w-0 h-[50%] origin-bottom flex flex-col items-center justify-start pt-3"
                                        style={{ transform: `translateX(-50%) rotate(${angle}deg)` }}
                                    >
                                        <div className="text-[10px] font-bold text-gray-600 dark:text-gray-800 text-center w-16 break-words leading-tight">
                                            {item.label}
                                        </div>
                                        <div className={`mt-1 p-1 rounded-full ${item.color.split(' ')[0]}`}>
                                            <item.icon size={14} className={item.color.split(' ')[1] || 'text-gray-700'} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Center Cap */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white dark:bg-gray-800 rounded-full shadow-lg border-2 border-gray-100 flex items-center justify-center z-10">
                            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                        </div>
                    </div>

                    <div className="text-center space-y-3">
                        {spinning && needsSpinSoundTap && (
                            <button
                                onClick={playSpinSound}
                                className="w-full px-4 py-2 rounded-xl text-xs font-bold tracking-wide bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 transition-colors"
                            >
                                Tap to enable spin sound
                            </button>
                        )}
                        {prize && (
                            <div className="animate-in zoom-in duration-300 mb-6">
                                {prize.type !== 'empty' ? (
                                    <>
                                        <p className="text-gray-500 mb-2">You won:</p>
                                        <div className={clsx("p-4 rounded-xl border-2 mb-4 flex items-center gap-3 justify-center", prize.color)}>
                                            <prize.icon size={24} />
                                            <span className="font-bold text-lg">{prize.label}</span>
                                        </div>

                                        {needsWinSoundTap && (
                                            <button
                                                onClick={playWinSound}
                                                className="w-full px-4 py-2 rounded-xl text-xs font-bold tracking-wide bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100 transition-colors"
                                            >
                                                Tap to play winner sound
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <div className="text-center mb-6">
                                        <div className="text-4xl mb-2">😢</div>
                                        <h3 className="text-xl font-bold text-gray-700 dark:text-gray-200">Better luck next time!</h3>
                                        <p className="text-gray-400 text-sm mt-1">Don't give up!</p>
                                    </div>
                                )}
                            </div>
                        )}

                        <button
                            onClick={() => handleSpin('free')}
                            disabled={freeSpins <= 0 || spinning}
                            className={clsx(
                                "px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all transform hover:scale-105 active:scale-95 w-full flex items-center justify-center gap-2",
                                freeSpins <= 0
                                    ? "bg-gray-300 dark:bg-gray-700 cursor-not-allowed"
                                    : "bg-gradient-to-r from-green-500 to-emerald-600 hover:shadow-green-500/25"
                            )}
                        >
                            {spinning ? 'Spinning...' : 'SPIN FREE'}
                            {freeSpins > 0 && <span className="bg-white/20 text-xs px-2 py-0.5 rounded-full">{freeSpins}</span>}
                        </button>

                        <button
                            onClick={() => handleSpin('paid')}
                            disabled={userStars < 10 || spinning}
                            className={clsx(
                                "px-8 py-2 rounded-xl font-bold text-sm transition-all transform hover:scale-105 active:scale-95 w-full border-2 flex items-center justify-center gap-2",
                                spinning ? "opacity-50 cursor-not-allowed" : "",
                                userStars < 10
                                    ? "border-gray-200 text-gray-400 cursor-not-allowed"
                                    : "border-yellow-500 text-yellow-600 hover:bg-yellow-50 dark:text-yellow-500 dark:hover:bg-yellow-900/20"
                            )}
                        >
                            Spin for 10 Stars <Star size={14} />
                        </button>

                        <button
                            onClick={onClose}
                            className="mt-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-sm underline decoration-gray-300 underline-offset-4"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ToastContainer({ toasts, removeToast }) {
    return (
        <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
            <AnimatePresence mode="popLayout">
                {toasts.map((toast) => (
                    <motion.div
                        key={toast.id}
                        layout
                        initial={{ opacity: 0, x: 20, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 20, scale: 0.9 }}
                        className={clsx(
                            "pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-md min-w-[300px]",
                            toast.type === 'success' ? "bg-white/90 dark:bg-gray-800/90 border-green-200 text-green-700" :
                                toast.type === 'error' ? "bg-white/90 dark:bg-gray-800/90 border-red-200 text-red-700" :
                                    "bg-white/90 dark:bg-gray-800/90 border-gray-200 text-gray-700"
                        )}
                    >
                        {toast.type === 'success' ? <CheckCircle2 size={20} className="text-green-500" /> :
                            toast.type === 'error' ? <XCircle size={20} className="text-red-500" /> :
                                <div className="w-5 h-5 rounded-full bg-gray-200" />}

                        <div className="flex-1">
                            <p className="font-semibold text-sm">{toast.title}</p>
                            {toast.message && <p className="text-xs opacity-90">{toast.message}</p>}
                        </div>

                        <button onClick={() => removeToast(toast.id)} className="text-gray-400 hover:text-gray-600">
                            <X size={16} />
                        </button>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}

export default function Home() {
    const { resolvedTheme } = useTheme();
    const [tests, setTests] = useState({ defaultTests: [], uploadedTests: [] });
    const [folders, setFolders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('list'); // 'list', 'test', 'upload', 'history', 'review'
    const [activeTest, setActiveTest] = useState(null);
    const [activeReview, setActiveReview] = useState(null); // For history review
    const [headerExpanded, setHeaderExpanded] = useState(true); // Navbar toggle state
    const [showDifficultyModal, setShowDifficultyModal] = useState(false);
    const [showAchievements, setShowAchievements] = useState(false);
    const [pendingTest, setPendingTest] = useState(null);

    const [userName, setUserName] = useState('');
    const [userId, setUserId] = useState(''); // Unique Session ID
    const [nameInput, setNameInput] = useState('');
    const [isNameSet, setIsNameSet] = useState(false);
    const [leaderboard, setLeaderboard] = useState([]);
    const [filterPeriod, setFilterPeriod] = useState('today'); // Filter state
    const [showSettings, setShowSettings] = useState(false);
    const [soundVolume, setSoundVolume] = useState(() => {
        if (typeof window === 'undefined') return 0.8;
        try {
            const stored = localStorage.getItem('examApp_soundVolume');
            if (stored === null || stored === undefined) return 0.8;
            const parsed = parseFloat(stored);
            if (Number.isNaN(parsed)) return 0.8;
            return Math.max(0, Math.min(1, parsed));
        } catch {
            return 0.8;
        }
    }); // 0..1
    const [showDonateModal, setShowDonateModal] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('uzum');
    const [cardCopied, setCardCopied] = useState(false);
    const [globalActiveUsers, setGlobalActiveUsers] = useState([]);
    const [isUsersLoaded, setIsUsersLoaded] = useState(false); // New loading state
    const [userCountry, setUserCountry] = useState(null);
    const [spectatingUser, setSpectatingUser] = useState(null); // State for Spectator Mode
    const [sidebarExpanded, setSidebarExpanded] = useState(true);

    // Premium / Unlock State
    const [unlockedTests, setUnlockedTests] = useState(new Set());
    const [allPremiumUnlocked, setAllPremiumUnlocked] = useState(false); // Master key unlock
    const [showKeyModal, setShowKeyModal] = useState(false);
    const [keyInput, setKeyInput] = useState('');
    const [targetTestForUnlock, setTargetTestForUnlock] = useState(null);
    const [keyError, setKeyError] = useState('');
    const [showPaymentOptions, setShowPaymentOptions] = useState(false);

    // Toast State
    const [toasts, setToasts] = useState([]);

    // Sound (shared volume from Settings)
    const startAudioRef = useRef(null);

    const addToast = (title, message = '', type = 'success') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, title, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    };

    const removeToast = (id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    // Init start sound
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (startAudioRef.current) return;
        try {
            const audio = new Audio('/start.mp3');
            audio.preload = 'auto';
            audio.volume = Math.max(0, Math.min(1, soundVolume));
            startAudioRef.current = audio;
        } catch { }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Keep start sound volume in sync
    useEffect(() => {
        const audio = startAudioRef.current;
        if (!audio) return;
        audio.volume = Math.max(0, Math.min(1, soundVolume));
    }, [soundVolume]);

    const playStartSound = async () => {
        const audio = startAudioRef.current;
        if (!audio) return;
        try {
            audio.currentTime = 0;
            await audio.play();
        } catch {
            // Ignore autoplay blocks; start is usually a user click anyway
        }
    };

    // Cheats / Promo Codes
    const [promoInput, setPromoInput] = useState('');
    const [activatedCheats, setActivatedCheats] = useState([]);
    const [isCheatsLoaded, setIsCheatsLoaded] = useState(false);

    // Spinner State
    const [showSpinner, setShowSpinner] = useState(false);
    const [freeSpins, setFreeSpins] = useState(0);
    const [lastAccrualTime, setLastAccrualTime] = useState(0);

    // New States for Stars and Achievements
    const [userStars, setUserStars] = useState(0);
    const [unlockedLeagues, setUnlockedLeagues] = useState([]); // Array of strings: ['Legendary', 'Mythic', etc.]
    const [boostInfo, setBoostInfo] = useState({ active: false, total: 1, details: [] });

    // Sync spectating user with realtime data
    useEffect(() => {
        if (spectatingUser) {
            const updatedUser = globalActiveUsers.find(u => u.userId === spectatingUser.userId);
            if (updatedUser) {
                setSpectatingUser(updatedUser);
            }
        }
    }, [globalActiveUsers]); // Update whenever global list updates

    // Upload State
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadFolder, setUploadFolder] = useState('');
    const [jsonError, setJsonError] = useState(null);

    // Upload feature flag (server-driven via GET /api/tests)
    const [testUploadMode, setTestUploadMode] = useState('off');
    const testUploadsEnabled = testUploadMode !== 'off';
    const isGodmode = activatedCheats.includes('godmode');
    const canUploadTests = testUploadsEnabled || isGodmode;

    // Persistent state for resuming tests
    const [savedProgress, setSavedProgress] = useState({});

    useEffect(() => {
        // 0. Initialize User ID
        let currentUserId = localStorage.getItem('examApp_userId');
        if (!currentUserId) {
            currentUserId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('examApp_userId', currentUserId);
        }
        setUserId(currentUserId);

        // Load Activated Cheats
        const storedCheats = localStorage.getItem('examApp_activatedCheats');
        if (storedCheats) {
            try {
                const parsedCheats = JSON.parse(storedCheats);
                if (Array.isArray(parsedCheats)) setActivatedCheats(parsedCheats);
            } catch (e) { }
        }
        setIsCheatsLoaded(true);

        // 1. Load persisted user name FIRST
        const storedName = localStorage.getItem('examApp_userName');
        if (storedName) {
            setUserName(storedName);
            setNameInput(storedName);
            setIsNameSet(true);
        }

        // 2. Load persisted progress
        const storedProgress = localStorage.getItem('examApp_progress');
        if (storedProgress) {
            try {
                setSavedProgress(JSON.parse(storedProgress));
            } catch (e) { console.error("Failed to parse progress", e); }
        }

        // Load Stars and Unlocks
        const storedStars = localStorage.getItem('examApp_stars');
        if (storedStars) setUserStars(parseInt(storedStars, 10));

        const storedLeagues = localStorage.getItem('examApp_unlockedLeagues');
        if (storedLeagues) {
            try {
                const parsed = JSON.parse(storedLeagues);
                if (Array.isArray(parsed)) setUnlockedLeagues(parsed);
            } catch (e) { }
        }

        // Load Premium Unlocks
        const storedPremiumUnlocks = localStorage.getItem('examApp_premiumUnlocks');
        
        // Check for master key (all premium unlocked)
        const storedMasterUnlock = localStorage.getItem('examApp_allPremiumUnlocked');
        if (storedMasterUnlock) {
            try {
                const masterData = JSON.parse(storedMasterUnlock);
                const now = Date.now();
                if (masterData.expiry > now) {
                    setAllPremiumUnlocked(true);
                } else {
                    localStorage.removeItem('examApp_allPremiumUnlocked');
                }
            } catch (e) {
                console.error("Failed to parse master unlock", e);
            }
        }
        
        if (storedPremiumUnlocks) {
            try {
                const parsedUnlocks = JSON.parse(storedPremiumUnlocks);
                const now = Date.now();
                const validUnlocks = new Set();
                
                Object.keys(parsedUnlocks).forEach(testId => {
                    // Check if subscription is still valid
                    if (parsedUnlocks[testId] > now) {
                        validUnlocks.add(testId);
                    }
                });
                
                if (validUnlocks.size > 0) {
                    setUnlockedTests(validUnlocks);
                }
            } catch (e) {
                console.error("Failed to parse premium unlocks", e);
            }
        }

        // Load Last Spin and Calculate Accrual
        const loadSpins = () => {
            const storedLastAccrual = parseInt(localStorage.getItem('examApp_lastAccrual') || '0');
            const storedFreeSpins = parseInt(localStorage.getItem('examApp_freeSpins') || '0');

            const now = Date.now();
            let newFreeSpins = storedFreeSpins;
            let newLastAccrual = storedLastAccrual;

            // First time setup
            if (storedLastAccrual === 0) {
                newLastAccrual = now;
                newFreeSpins = 1; // Start with 1 free spin
                localStorage.setItem('examApp_lastAccrual', newLastAccrual);
                localStorage.setItem('examApp_freeSpins', newFreeSpins);
                setFreeSpins(newFreeSpins);
                setLastAccrualTime(newLastAccrual);
                return;
            }

            // Calculate Accrual
            const msPassed = now - storedLastAccrual;
            const hoursPassed = Math.floor(msPassed / (3600 * 1000));

            if (hoursPassed > 0) {
                if (newFreeSpins < 10) {
                    const toAdd = Math.min(10 - newFreeSpins, hoursPassed);
                    newFreeSpins += toAdd;
                    newLastAccrual = storedLastAccrual + (hoursPassed * 3600 * 1000);

                    localStorage.setItem('examApp_freeSpins', newFreeSpins);
                    localStorage.setItem('examApp_lastAccrual', newLastAccrual);
                } else {
                    // If already full, reset timer to now so it starts counting when they spend one
                    newLastAccrual = now;
                    localStorage.setItem('examApp_lastAccrual', newLastAccrual);
                }
            }

            setFreeSpins(newFreeSpins);
            setLastAccrualTime(newLastAccrual);
        };

        const updateBoosts = () => {
            const multEnd = parseInt(localStorage.getItem('examApp_multiplierEnd') || '0');
            const multVal = parseInt(localStorage.getItem('examApp_multiplierVal') || '1');

            // Spin Timer Logic
            const storedLastAccrual = parseInt(localStorage.getItem('examApp_lastAccrual') || '0');
            const storedFreeSpins = parseInt(localStorage.getItem('examApp_freeSpins') || '0');
            let nextSpinStr = '';

            const now = Date.now();

            if (storedFreeSpins < 10 && storedLastAccrual > 0) {
                const nextAccrual = storedLastAccrual + 3600000; // 1 hour
                if (nextAccrual > now) {
                    const left = nextAccrual - now;
                    const m = Math.floor(left / 60000);
                    const s = Math.floor((left % 60000) / 1000);
                    nextSpinStr = `${m}:${s < 10 ? '0' + s : s}`;
                }
            }

            const details = [];
            let total = 1;

            // Time Boost
            if (now < multEnd) {
                const leftMs = multEnd - now;
                const hours = Math.floor(leftMs / 3600000);
                const mins = Math.ceil((leftMs % 3600000) / 60000);
                const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

                total = Math.max(total, multVal);
                details.push({
                    type: 'time',
                    source: `Time Boost (x${multVal})`,
                    remaining: `${timeStr} remaining`,
                    val: multVal,
                    color: 'text-purple-500'
                });
            }

            // Rank Boost
            if (unlockedLeagues.includes('Mythic')) {
                total = Math.max(total, 3);
                details.push({
                    type: 'rank',
                    source: 'Mythic Status',
                    remaining: 'Permanent x3',
                    val: 3,
                    color: 'text-red-600'
                });
            } else if (unlockedLeagues.includes('Legendary')) {
                total = Math.max(total, 2);
                details.push({
                    type: 'rank',
                    source: 'Legendary Status',
                    remaining: 'Permanent x2',
                    val: 2,
                    color: 'text-amber-500'
                });
            }

            setBoostInfo({
                multiplier: total,
                activeBoosts: details,
                nextSpin: nextSpinStr,
                active: details.length > 0
            });

        };

        loadSpins();
        updateBoosts(); // Initial check

        // 3. Fetch initial data
        // fetchTests is now handled by its own useEffect to safely handle cheat loading
        fetchLeaderboard();
        fetchGlobalActiveUsers();

        // Warn about legendary/mythic bonuses
        if (storedLeagues) {
            try {
                const leagues = JSON.parse(storedLeagues);
                if (leagues.includes('Mythic')) {
                    // Optional: Show toast "Welcome back Mythic Player!"
                }
            } catch (e) { }
        }

        // Fetch Country (with local storage caching to avoid 429 errors)
        const storedCountry = localStorage.getItem('examApp_userCountry');
        if (storedCountry) {
            setUserCountry(storedCountry);
        } else {
            fetch('/api/country')
                .then(res => res.json())
                .then(data => {
                    if (data.country_code) {
                        setUserCountry(data.country_code);
                        localStorage.setItem('examApp_userCountry', data.country_code);
                    }
                })
                .catch(err => console.error("Country fetch failed", err));
        }

        // 4. Set up intervals
        const interval = setInterval(fetchGlobalActiveUsers, 5000);
        const spinInterval = setInterval(loadSpins, 60000);
        const boostInterval = setInterval(updateBoosts, 1000); // Update boost timer every second

        // 5. Send heartbeat for "Browsing" status if we have a username
        // Note: accessing userCountry here directly inside [] dependency effect won't work well 
        // because this effect runs ONCE on mount.
        // userCountry is null initially.
        // Instead of relying on closure for userCountry, we should use a ref or read from state in a separate effect that depends on userCountry.
        // However, the `heartbeatInterval` is convenient.
        // Better strategy: Let the separate effect below handle ALL heartbeats when in 'list' view.
        // And remove this one to avoid duplication?
        // The separate effect (lines ~280) handles 'list' view heartbeat.
        // This one (lines ~250) seems to be a general fallback or legacy? 
        // It runs every 10s regardless of view. If we are in 'test' view, TestRunner sends heartbeat.
        // If we are in 'list' view, the other effect sends it.
        // So this one might be redundant or causing conflict if it sends incorrect data (null country).
        // Let's REMOVE this duplicate heartbeat interval to clean up logic and rely on the reactive effect below.

        return () => {
            clearInterval(interval);
            clearInterval(spinInterval);
            clearInterval(boostInterval);
        };
    }, []);

    // Persist sound volume
    useEffect(() => {
        try {
            localStorage.setItem('examApp_soundVolume', String(soundVolume));
        } catch { }
    }, [soundVolume]);

    const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE === 'true';
    const canSpin = isDevMode || freeSpins > 0;

    const handleSpinStart = (type) => {
        if (type === 'free') {
            if (isDevMode) return true;
            if (freeSpins > 0) {
                const newCount = freeSpins - 1;
                setFreeSpins(newCount);
                localStorage.setItem('examApp_freeSpins', newCount.toString());
                return true;
            }
        } else if (type === 'paid') {
            if (userStars >= 10) {
                const newTotal = userStars - 10;
                setUserStars(newTotal);
                localStorage.setItem('examApp_stars', newTotal.toString());
                return true;
            }
        }
        return false;
    };

    const updateUserStars = (amount) => {
        // Apply Multiplier based on Achievements
        let multiplier = 1;

        // check for active time multiplier
        const multEnd = parseInt(localStorage.getItem('examApp_multiplierEnd') || '0');
        if (Date.now() < multEnd) {
            const val = parseInt(localStorage.getItem('examApp_multiplierVal') || '1');
            multiplier = Math.max(multiplier, val);
        }

        if (unlockedLeagues.includes('Mythic')) multiplier = Math.max(multiplier, 3);
        else if (unlockedLeagues.includes('Legendary')) multiplier = Math.max(multiplier, 2);

        const earned = amount * multiplier;
        const newTotal = userStars + earned;

        setUserStars(newTotal);
        localStorage.setItem('examApp_stars', newTotal.toString());

        // Optional: Visual feedback could be added here
    };

    const handleSpinReward = (prize) => {
        if (prize.type === 'star') {
            // Bypass multiplier for direct wins? Or apply it? 
            // Usually spin rewards are fixed. So let's just add raw amount.
            // But updateUserStars applies multiplier. let's create a raw add function or just manually add.
            const newTotal = userStars + prize.amount;
            setUserStars(newTotal);
            localStorage.setItem('examApp_stars', newTotal.toString());
        } else if (prize.type === 'hint') {
            const currentExtra = parseInt(localStorage.getItem('examApp_extraHints') || '0', 10);
            localStorage.setItem('examApp_extraHints', (currentExtra + prize.amount).toString());
        } else if (prize.type === 'multiplier') {
            const endTime = Date.now() + prize.duration;
            localStorage.setItem('examApp_multiplierEnd', endTime.toString());
            localStorage.setItem('examApp_multiplierVal', prize.val.toString());
        }
    };

    const spendStars = (amount) => {
        if (userStars >= amount) {
            const newTotal = userStars - amount;
            setUserStars(newTotal);
            localStorage.setItem('examApp_stars', newTotal.toString());
            return true;
        }
        return false;
    };

    const updateUserUnlocks = (newLeagueName) => {
        // Only track Legendary and Mythic
        if (!['Legendary', 'Mythic'].includes(newLeagueName)) return;

        if (!unlockedLeagues.includes(newLeagueName)) {
            const newLeagues = [...unlockedLeagues, newLeagueName];
            setUnlockedLeagues(newLeagues);
            localStorage.setItem('examApp_unlockedLeagues', JSON.stringify(newLeagues));
            // Maybe show a toast/confetti here?
            alert(`Congratulations! You unlocked the ${newLeagueName} Achievement!`);
        }
    };

    // Block screenshots during test
    useEffect(() => {
        if (view !== 'test') return;
        if (isGodmode) return;

        // Create Warning Overlay
        let warningEl = document.getElementById('anti-cheat-overlay');
        if (!warningEl) {
            warningEl = document.createElement('div');
            warningEl.id = 'anti-cheat-overlay';
            warningEl.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background-color: #000;
            color: #fff;
            display: none;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 2147483647;
            font-family: system-ui, -apple-system, sans-serif;
            text-align: center;
        `;
            warningEl.innerHTML = `
            <div style="font-size: 64px; margin-bottom: 20px;">⚠️</div>
            <h1 style="font-size: 32px; font-weight: bold; margin-bottom: 10px; color: #ef4444;">Warning: Focus Lost</h1>
            <p style="font-size: 18px; color: #fff;">External resources and extensions are prohibited.</p>
        `;
            document.body.appendChild(warningEl);
        }

        const showWarning = () => {
            if (warningEl) warningEl.style.display = 'flex';
        };

        const hideWarning = () => {
            if (warningEl) warningEl.style.display = 'none';
        };

        const handleKeyDown = (e) => {
            if (isGodmode) return;
            const isPrintScreen = e.key === 'PrintScreen' || e.keyCode === 44;
            const isSnippingTool = (e.ctrlKey) && e.shiftKey && (e.key.toLowerCase() === 's');
            const isMeta = e.key === 'Meta';

            if (isPrintScreen || isSnippingTool || isMeta) {
                if (isPrintScreen || isSnippingTool) e.preventDefault();

                showWarning();
                navigator.clipboard.writeText('').catch(() => { });

                // For PrintScreen/Snipping, keep the warning visible for 3 seconds
                if (isPrintScreen || isSnippingTool) {
                    // Clear any existing timeout to avoid premature hiding if pressed multiple times
                    if (window.screenshotTimeout) clearTimeout(window.screenshotTimeout);

                    window.screenshotTimeout = setTimeout(() => {
                        hideWarning();
                    }, 3000);
                }
            }
        };

        const handleKeyUp = (e) => {
            if (isGodmode) return;
            // Restore visibility when Meta key is released
            if (e.key === 'Meta') {
                setTimeout(hideWarning, 300);
            }
            if (e.key === 'PrintScreen' || e.keyCode === 44) {
                navigator.clipboard.writeText('').catch(() => { });
                // Re-enforce warning on keyup just in case
                showWarning();
                if (window.screenshotTimeout) clearTimeout(window.screenshotTimeout);
                window.screenshotTimeout = setTimeout(() => {
                    hideWarning();
                }, 3000);
            }
        };

        // Also hide when window loses focus (e.g. switching to Snipping Tool overlay or Mobile App Switcher)
        const handleBlur = () => {
            if (isGodmode) return;
            showWarning();
        };

        const handleFocus = () => {
            if (isGodmode) return;
            // Only hide if we aren't currently showing the screenshot warning timer
            // But for simplicity, we usually want to recover on focus
            // Unless it was a blur caused by Snipping Tool... 

            // Let's just clear clipboard and hide warning, assuming user returned to app
            navigator.clipboard.writeText('').catch(() => { });

            // Wait a tiny bit before hiding to ensure no screenshot is being finished
            setTimeout(hideWarning, 200);
        };

        // Mobile: Handle page visibility change (browsers minimize/background)
        const handleVisibilityChange = () => {
            if (isGodmode) return;
            if (document.hidden) {
                showWarning();
            } else {
                hideWarning();
                navigator.clipboard.writeText('').catch(() => { });
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('blur', handleBlur);
        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (warningEl) warningEl.remove();
            if (window.screenshotTimeout) clearTimeout(window.screenshotTimeout);
        };
    }, [view, isGodmode]);

    // Separate effect for main page heartbeat
    useEffect(() => {
        // Send heartbeat for all views EXCEPT 'test' (because TestRunner handles 'in-test' status)
        // This ensures user stays "Online" even while in History/Upload/Review
        if (view !== 'test' && isNameSet && userName && userId) {
            const getPresenceStatus = () => {
                if (typeof document === 'undefined') return 'browsing';
                const hasFocus = typeof document.hasFocus === 'function' ? document.hasFocus() : true;
                return (document.hidden || !hasFocus) ? 'afk' : 'browsing';
            };

            const sendHeartbeat = () => {
                const status = getPresenceStatus();
                fetch('/api/active', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: userId,
                        name: userName,
                        status,
                        device: getDeviceType(),
                        country: userCountry,
                        stars: userStars, // Send star count
                        theme: resolvedTheme
                    })
                }).catch(e => console.error(e));
            };

            let interval = null;
            const restartInterval = () => {
                if (interval) clearInterval(interval);
                const status = getPresenceStatus();
                const ms = status === 'afk' ? 20000 : 10000;
                interval = setInterval(sendHeartbeat, ms);
            };

            const handlePresenceChange = () => {
                sendHeartbeat();
                restartInterval();
            };

            sendHeartbeat(); // Immediate
            restartInterval();

            document.addEventListener('visibilitychange', handlePresenceChange);
            window.addEventListener('focus', handlePresenceChange);
            window.addEventListener('blur', handlePresenceChange);

            // Cleanup on unmount/close
            const cleanup = () => {
                fetch('/api/active?userId=' + userId, {
                    method: 'DELETE',
                    keepalive: true
                });
            };
            window.addEventListener('beforeunload', cleanup);

            return () => {
                if (interval) clearInterval(interval);
                window.removeEventListener('beforeunload', cleanup);
                document.removeEventListener('visibilitychange', handlePresenceChange);
                window.removeEventListener('focus', handlePresenceChange);
                window.removeEventListener('blur', handlePresenceChange);
                // Optional: cleanup(); // Don't allow cleanup on component unmount (navigating within app), only on unload/close. 
                // Actually, component unmount happens on route change too.
                // If we navigate to "Test", we want to remove "Browsing" status.
                // But "Test" component will immediately establish "Taking Test" status.
                // So updating status is better than delete.
                // Let's rely on heartbeat overwrite for status change.
                // But for closing tab, we need DELETE.
            };
        }
    }, [view, isNameSet, userName, userId, userCountry, userStars, resolvedTheme]); // Re-run when stars change too

    // Disable copy/paste/context menu and some keys when taking a test
    useEffect(() => {
        if (view === 'test') {
            if (isGodmode) {
                // If Godmode is active, we attach a "Force Copy" listener to help with clipboard issues
                const handleGodmodeKeys = (e) => {
                    // Force Copy on Ctrl+C
                    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
                        const selectedText = window.getSelection().toString();
                        if (selectedText) {
                            // Try both methods to be safe
                            try {
                                navigator.clipboard.writeText(selectedText);
                            } catch (err) { }
                        }
                    }
                };
                window.addEventListener('keydown', handleGodmodeKeys);
                return () => window.removeEventListener('keydown', handleGodmodeKeys);
            }

            const handleContextMenu = (e) => {
                if (isGodmode) return;
                e.preventDefault();
                return false;
            };

            const handleCopyPaste = (e) => {
                if (isGodmode) return;
                e.preventDefault();
                return false;
            };

            const handleKeyDown = (e) => {
                if (isGodmode) return;
                // Disable PrintScreen
                if (e.key === 'PrintScreen') {
                    navigator.clipboard.writeText('').catch(() => { }); // Clear clipboard (best effort)
                    alert('Screenshots are disabled during the test!');
                    e.preventDefault();
                }

                // Disable Ctrl+Shift+I, J, C (DevTools)
                if ((e.ctrlKey && e.shiftKey) && ['i', 'j', 'c'].includes(e.key.toLowerCase())) {
                    e.preventDefault();
                    alert('Developer tools are disabled!');
                    return false;
                }

                // Disable Ctrl+Shift+S (Some screenshot tools) or Win+Shift+S attempt (OS level, hard to block but we try)
                if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 's') {
                    e.preventDefault();
                    alert('Screenshots are disabled!');
                    return false;
                }

                // Disable Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+S, Ctrl+P, Ctrl+U (view source), Ctrl+A
                if (
                    (e.ctrlKey || e.metaKey) &&
                    ['c', 'v', 'x', 's', 'p', 'u', 'a'].includes(e.key.toLowerCase())
                ) {
                    e.preventDefault();
                }

                // Prevent F12
                if (e.key === 'F12') {
                    e.preventDefault();
                }
            };

            // Anti-screenshot for mobile/blur approach
            const handleVisibilityChange = () => {
                if (isGodmode) return;
                if (document.hidden) {
                    // Determine if we should secure content (blur it)
                    const appRoot = document.getElementById('app-root') || document.body;
                    appRoot.style.filter = 'blur(20px)';
                    document.title = "⚠️ Return to test!";
                } else {
                    const appRoot = document.getElementById('app-root') || document.body;
                    appRoot.style.filter = 'none';
                    document.title = "Exam App";
                }
            };

            // Aggressive CSS injection to stop selection on mobile
            let style;
            if (!isGodmode) {
                style = document.createElement('style');
                style.innerHTML = `
            body, #root, * {
                -webkit-touch-callout: none !important;
                -webkit-user-select: none !important;
                -khtml-user-select: none !important;
                -moz-user-select: none !important;
                -ms-user-select: none !important;
                user-select: none !important;
                -webkit-tap-highlight-color: transparent !important;
            }
            /* Hide content when printing */
            @media print {
                html, body {
                    display: none !important;
                }
            }
          `;
                document.head.appendChild(style);
            }

            document.addEventListener('contextmenu', handleContextMenu);
            document.addEventListener('copy', handleCopyPaste);
            document.addEventListener('cut', handleCopyPaste);
            document.addEventListener('paste', handleCopyPaste);
            document.addEventListener('keydown', handleKeyDown);
            document.addEventListener('selectstart', handleContextMenu); // Disable text selection
            document.addEventListener('visibilitychange', handleVisibilityChange);
            window.addEventListener('blur', handleVisibilityChange); // Also blur on window focus loss (snipping tool activation)
            window.addEventListener('focus', handleVisibilityChange);

            return () => {
                document.removeEventListener('contextmenu', handleContextMenu);
                document.removeEventListener('copy', handleCopyPaste);
                document.removeEventListener('cut', handleCopyPaste);
                document.removeEventListener('paste', handleCopyPaste);
                document.removeEventListener('keydown', handleKeyDown);
                document.removeEventListener('selectstart', handleContextMenu);
                document.removeEventListener('visibilitychange', handleVisibilityChange);
                window.removeEventListener('blur', handleVisibilityChange);
                window.removeEventListener('focus', handleVisibilityChange);

                if (style && document.head.contains(style)) {
                    document.head.removeChild(style);
                }
                document.body.style.filter = 'none'; // Cleanup blur
                document.title = "Exam App"; // Reset title
            };
        }
    }, [view, isGodmode]);

    const fetchGlobalActiveUsers = async () => {
        try {
            const res = await fetch('/api/active');
            if (res.ok) {
                const data = await res.json();
                setGlobalActiveUsers(data);
                setIsUsersLoaded(true);
            }
        } catch (e) { console.error(e); }
    };

    const fetchTests = async () => {
        setLoading(true);
        try {
            const showHidden = activatedCheats.includes('showhidden');
            const res = await fetch(`/api/tests?showHidden=${showHidden}`);
            const data = await res.json();
            setTests(data);
            if (data.folders) setFolders(data.folders);
            if (data.uploadMode) setTestUploadMode(data.uploadMode);
        } catch (error) {
            console.error("Failed to fetch tests", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Only fetch tests once cheats have been restored from localStorage (or confirmed empty)
        // This prevents a "flash" of missing hidden files if the user reloads with the cheat active
        if (isCheatsLoaded) {
            fetchTests();
        }
    }, [activatedCheats, isCheatsLoaded]);

    useEffect(() => {
        if (isCheatsLoaded) {
            localStorage.setItem('examApp_activatedCheats', JSON.stringify(activatedCheats));
        }
    }, [activatedCheats, isCheatsLoaded]);

    const [leaderboardPage, setLeaderboardPage] = useState(1);
    const [leaderboardLimit, setLeaderboardLimit] = useState(10);
    const [leaderboardTotal, setLeaderboardTotal] = useState(0);

    const fetchLeaderboard = async () => {
        try {
            const res = await fetch(`/api/leaderboard?period=${filterPeriod}&page=${leaderboardPage}&limit=${leaderboardLimit}`);
            if (res.ok) {
                const json = await res.json();
                if (json.data) {
                    setLeaderboard(json.data);
                    setLeaderboardTotal(json.pagination.total);
                } else {
                    // Fallback for old API response format if cached or error
                    setLeaderboard(Array.isArray(json) ? json : []);
                }
            }
        } catch (e) {
            console.error("Leaderboard fetch error", e);
        }
    };

    useEffect(() => {
        fetchLeaderboard();
        const interval = setInterval(fetchLeaderboard, 5000);
        return () => clearInterval(interval);
    }, [filterPeriod, leaderboardPage, leaderboardLimit]);

    const handlePromoSubmit = (e) => {
        e.preventDefault();
        const code = promoInput.toLowerCase().trim();

        let validCodes = ['dontgiveup', 'haveluckyday', 'godmode', 'showhidden'];

        if (validCodes.includes(code)) {
            // Special toggle logic for godmode or showhidden
            if ((code === 'godmode' || code === 'showhidden') && activatedCheats.includes(code)) {
                setActivatedCheats(prev => prev.filter(c => c !== code));
                addToast('Cheat Deactivated', `${code} mode disabled`, 'info');
                setPromoInput('');
                return;
            }

            if (!activatedCheats.includes(code)) {
                setActivatedCheats(prev => [...prev, code]);
                addToast('Cheat Activated!', `${code} mode enabled`, 'success');
            } else {
                addToast('Already Active', `${code} is already running`, 'info');
            }
            setPromoInput('');
        } else {
            addToast('Invalid Code', 'That code does not exist', 'error');
        }
    };

    const handleNameSubmit = (e) => {
        e.preventDefault();
        if (nameInput.trim()) {
            setUserName(nameInput);
            localStorage.setItem('examApp_userName', nameInput);
            setIsNameSet(true);
            setShowSettings(false);
        }
    };

    const handleUnlockSubmit = async (e) => {
        e.preventDefault();
        setKeyError('');

        // Master Key - Unlocks ALL premium tests
        const MASTER_KEY = 'ALLPREMIUM2026';
        if (keyInput.toUpperCase() === MASTER_KEY) {
            const expiryDate = Date.now() + (30 * 24 * 60 * 60 * 1000); // 30 days
            setAllPremiumUnlocked(true);
            localStorage.setItem('examApp_allPremiumUnlocked', JSON.stringify({ expiry: expiryDate }));
            addToast('🎉 All Premium Unlocked!', 'All premium tests are now accessible for 30 days', 'success');
            setShowKeyModal(false);
            setKeyInput('');
            
            // Start the test immediately if one was targeted
            if (targetTestForUnlock) {
                const test = targetTestForUnlock;
                let translationContent = null;
                const isEn = test.id.endsWith('en.json');
                const isUz = test.id.endsWith('uz.json');

                if (isEn || isUz) {
                    const targetId = isEn ? test.id.replace('en.json', 'uz.json') : test.id.replace('uz.json', 'en.json');
                    const allTests = [...(tests.defaultTests || []), ...(tests.uploadedTests || [])];
                    const translation = allTests.find(t => t.id === targetId);
                    if (translation) translationContent = translation.content;
                }

                if (savedProgress[test.id]) {
                    setActiveTest({
                        ...test,
                        ...savedProgress[test.id],
                        translationContent,
                        isResumed: true
                    });
                    playStartSound();
                    setView('test');
                } else {
                    setSelectedTestForDifficulty({ ...test, translationContent });
                    setShowDifficultyModal(true);
                }
            }
            return;
        }

        // Admin Secret to Generate Keys (Hidden Feature)
        if (keyInput.startsWith('admin:gen:')) {
            const secret = keyInput.split(':')[2];
            try {
                const res = await fetch('/api/admin/generate-key', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ adminSecret: secret || 'admin123', count: 1 })
                });
                const data = await res.json();
                if (data.success) {
                    const newKey = data.keys[0];
                    await navigator.clipboard.writeText(newKey);
                    alert(`NEW KEY GENERATED & COPIED TO CLIPBOARD:\n${newKey}`);
                    setKeyInput('');
                } else {
                    setKeyError(data.message);
                }
            } catch (err) {
                setKeyError('Failed to contact server');
            }
            return;
        }

        try {
            // Call Server to Validate
            const res = await fetch('/api/validate-key', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: keyInput, userId: userId })
            });
            const data = await res.json();

            if (data.success) {
                const expiryDate = data.expiryDate;

                // Update State - Unlock EVERYTHING
                setAllPremiumUnlocked(true);

                // Persist to LocalStorage
                try {
                    localStorage.setItem('examApp_allPremiumUnlocked', JSON.stringify({ expiry: expiryDate }));
                    
                    addToast('Premium Unlocked!', `Full Access Granted! Valid until ${new Date(expiryDate).toLocaleDateString()}`, 'success');
                } catch (err) {
                    console.error("Failed to save unlock", err);
                }

                // Proceed to start test logic immediately
                const test = targetTestForUnlock;
                let translationContent = null;
                const isEn = test.id.endsWith('en.json');
                const isUz = test.id.endsWith('uz.json');

                if (isEn || isUz) {
                    const targetId = isEn ? test.id.replace('en.json', 'uz.json') : test.id.replace('uz.json', 'en.json');
                    const allTests = [...(tests.defaultTests || []), ...(tests.uploadedTests || [])];
                    const translation = allTests.find(t => t.id === targetId);
                    if (translation) translationContent = translation.content;
                }

                if (savedProgress[test.id]) {
                    setActiveTest({
                        ...test,
                        ...savedProgress[test.id],
                        translationContent,
                        isResumed: true
                    });
                    playStartSound();
                    setView('test');
                } else {
                    setPendingTest({ ...test, translationContent });
                    setShowDifficultyModal(true);
                }

                setShowKeyModal(false);
                setKeyInput('');
                setKeyError('');
                setTargetTestForUnlock(null);
                setShowPaymentOptions(false);
            } else {
                setKeyError(data.message || 'Invalid Key');
            }
        } catch (err) {
            console.error(err);
            setKeyError('Connection failed. Please check internet.');
        } 
    };

    const startTest = (test) => {
        // Premium Check - use baseId if available (for translated tests)
        const checkId = test.baseId || test.id;
        if (test.isPremium && !allPremiumUnlocked && !unlockedTests.has(checkId)) {
            // Store the original test with baseId for unlock
            setTargetTestForUnlock({ ...test, id: checkId });
            setShowKeyModal(true);
            return;
        }

        // Check if there is a translation available (auto-detect counterpart in same folder)
        let translationContent = null;
        const isEn = test.id.endsWith('en.json');
        const isUz = test.id.endsWith('uz.json');

        if (isEn || isUz) {
            const targetId = isEn ? test.id.replace('en.json', 'uz.json') : test.id.replace('uz.json', 'en.json');
            // Search in all available tests
            const allTests = [...(tests.defaultTests || []), ...(tests.uploadedTests || [])];
            const translation = allTests.find(t => t.id === targetId);
            if (translation) translationContent = translation.content;
        }

        // Check if we have saved progress for this test
        if (savedProgress[test.id]) {
            setActiveTest({
                ...test,
                ...savedProgress[test.id],
                translationContent, // Add translation content to resumable state
                isResumed: true
            });
            playStartSound();
            setView('test');
            return;
        }

        // Open Difficulty Modal
        setPendingTest({ ...test, translationContent });
        setShowDifficultyModal(true);
    };

    const launchTest = (difficultyId) => {
        if (!pendingTest) return;

        // Find Difficulty Settings
        const difficulty = DIFFICULTIES.find(d => d.id === difficultyId);

        // Normalize content (Handle Array/Object mismatch from legacy/Mongo)
        let contentObj = pendingTest.content;
        if (Array.isArray(contentObj)) {
            if (contentObj[0]?.test_questions) contentObj = contentObj[0];
            else if (contentObj[0]?.question) contentObj = { test_questions: contentObj };
        }

        // New test setup
        const rawQuestions = contentObj?.test_questions || [];

        // Easy mode limit logic (User request: 20 random questions for easy mode)
        let questionsPool = shuffleArray(rawQuestions);
        if (difficultyId === 'easy' && questionsPool.length > 20) {
            questionsPool = questionsPool.slice(0, 20);
        }

        const preparedQuestions = questionsPool.map(q => {
            // Allow flexible options (object to array)
            const optionsArray = Object.entries(q.options).map(([key, value]) => ({
                id: key,
                text: value
            }));

            return {
                ...q,
                shuffledOptions: shuffleArray(optionsArray)
            };
        });

        const newTestState = {
            ...pendingTest,
            questions: preparedQuestions,
            translationContent: pendingTest.translationContent, // Retrieve translation
            currentQuestionIndex: 0,
            answers: {}, // { questionId: optionId }
            isFinished: false,
            score: 0,
            startTime: Date.now(), // Track start time

            // Difficulty Setting
            hintsLeft: difficulty ? difficulty.hints : 0,
            difficultyMode: difficultyId,
            revealedHints: {}
        };

        setActiveTest(newTestState);
        playStartSound();
        setView('test');
        setShowDifficultyModal(false);
        setPendingTest(null);
    };

    const saveCurrentProgress = (testId, progressData) => {
        setSavedProgress(prev => {
            const newState = {
                ...prev,
                [testId]: progressData
            };
            localStorage.setItem('examApp_progress', JSON.stringify(newState));
            return newState;
        });
    };

    const clearProgress = (testId) => {
        setSavedProgress(prev => {
            const newState = { ...prev };
            delete newState[testId];
            localStorage.setItem('examApp_progress', JSON.stringify(newState));
            return newState;
        });
    };

    const handleUploadSubmit = async (e) => {
        e.preventDefault();

        if (!canUploadTests) {
            setJsonError('Test upload is temporarily disabled.');
            addToast('Upload disabled', 'Test upload is temporarily disabled.', 'info');
            return;
        }

        const fileInput = e.target.elements.fileInput;
        const file = fileInput?.files[0];

        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const json = JSON.parse(event.target.result);

                // Validation
                const validation = validateJson(json);
                if (!validation.valid) {
                    setJsonError(validation.error);
                    return;
                }

                const name = file.name.replace('.json', '');

                const res = await fetch('/api/tests', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name,
                        content: json,
                        folder: uploadFolder,
                        godmode: isGodmode
                    })
                });

                if (res.ok) {
                    await fetchTests();
                    setShowUploadModal(false);
                    setUploadFolder('');
                } else {
                    const errData = await res.json();
                    setJsonError(errData.error || "Failed to upload test");
                }
            } catch (err) {
                setJsonError("Invalid JSON syntax. Please check your file format.");
            }
        };
        reader.readAsText(file);
    };

    useEffect(() => {
        if (showUploadModal && !canUploadTests) {
            setShowUploadModal(false);
            addToast('Upload disabled', 'Test upload is temporarily disabled.', 'info');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showUploadModal, canUploadTests]);

    useEffect(() => {
        // Disable right-click context menu
        document.addEventListener('contextmenu', function (e) {
            e.preventDefault();
        });

        // Disable copy and paste keyboard shortcuts
        document.addEventListener('keydown', function (e) {
            if (e.ctrlKey && (e.key === 'c' || e.key === 'v')) {
                e.preventDefault();
            }
        });

        return () => {
            document.removeEventListener('contextmenu', () => { });
            document.removeEventListener('keydown', () => { });
        };
    }, []);

    if (loading && view === 'list') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-emerald-50 dark:bg-gray-950 text-gray-800 dark:text-gray-200">
                <Image 
                    src="/loading.gif" 
                    alt="Loading..." 
                    width={96} 
                    height={96} 
                    className="object-contain"
                    priority
                    unoptimized
                />
            </div>
        );
    }

    if (!isNameSet) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-emerald-50 dark:bg-gray-950 px-4">
                <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg max-w-md w-full border border-gray-100 dark:border-gray-800/50">
                    <div className="text-center mb-6">
                        <div className="bg-blue-100 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 text-blue-600">
                            <User size={32} />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Welcome!</h1>
                        <p className="text-gray-500 mt-2">Please enter your name to start.</p>
                    </div>
                    <form onSubmit={handleNameSubmit}>
                        <input
                            type="text"
                            required
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all mb-4 text-gray-900 dark:text-gray-100"
                            placeholder="Your full name"
                            value={nameInput}
                            onChange={(e) => setNameInput(e.target.value)}
                        />
                        <button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors"
                        >
                            Continue
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-emerald-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans p-4 md:p-8 pb-32">
            <div className="max-w-7xl mx-auto">
                <header className={clsx(
                    "mb-8 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800/50 sticky top-4 z-40 transition-all duration-300 ease-in-out",
                    headerExpanded ? "p-6" : "p-0 py-2 border-transparent shadow-none bg-transparent"
                )}>
                    <div className={clsx(
                        "flex justify-between items-center transition-all duration-300 overflow-hidden",
                        headerExpanded ? "opacity-100 max-h-[100px]" : "opacity-0 max-h-0 pointer-events-none"
                    )}>
                        <div className="flex items-center gap-2 md:gap-4">
                            <div>
                                <h1 className="text-lg md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                    Exam Platform
                                </h1>
                                <p className="text-gray-500 text-[10px] md:text-xs mt-1">
                                    <span className="hidden md:inline">Logged in as </span>
                                    <span className="font-semibold text-gray-700 dark:text-gray-100">{userName}</span>
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-1 md:gap-2 items-center">
                            {/* Daily Spinner */}
                            <button
                                onClick={() => { playStartSound(); setShowSpinner(true); }}
                                className="p-1.5 md:p-2 rounded-lg text-fuchsia-500 hover:bg-fuchsia-50 dark:hover:bg-fuchsia-900/20 transition-colors relative flex items-center gap-1"
                                title="Hourly Spin"
                            >
                                <Gift size={18} className={clsx("md:w-5 md:h-5", canSpin ? "animate-bounce" : "")} />
                                {canSpin && (
                                    <span className="absolute top-1 right-1 w-1.5 h-1.5 md:w-2 md:h-2 bg-red-500 rounded-full animate-ping" />
                                )}
                                {!canSpin && boostInfo?.nextSpin && (
                                    <span className="text-[10px] font-mono font-medium hidden md:block">{boostInfo.nextSpin}</span>
                                )}
                            </button>

                            <button
                                onClick={() => { playStartSound(); setShowDonateModal(true); }}
                                className="p-1.5 md:p-2 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors animate-pulse"
                                title="Support Project"
                            >
                                <Heart size={18} className="md:w-5 md:h-5" />
                            </button>
                            <button
                                onClick={() => { playStartSound(); setView('history'); }}
                                className={clsx(
                                    "p-1.5 md:p-2 rounded-lg transition-colors",
                                    view === 'history' ? "bg-blue-50 text-blue-600" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:bg-gray-950"
                                )}
                                title="History"
                            >
                                <Clock size={18} className="md:w-5 md:h-5" />
                            </button>
                            <button
                                onClick={() => {
                                    playStartSound();
                                    setNameInput(userName);
                                    setShowSettings(true);
                                }}
                                className="p-1.5 md:p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:bg-gray-950 rounded-lg transition-colors"
                            >
                                <Settings size={18} className="md:w-5 md:h-5" />
                            </button>
                            <div className="mx-0.5 md:mx-1 scale-90 md:scale-100">
                                <ThemeToggle onToggle={playStartSound} />
                            </div>
                            {/* Achievements Icon */}
                            <button
                                onClick={() => { playStartSound(); setShowAchievements(!showAchievements); }}
                                className="p-1.5 md:p-2 rounded-lg transition-colors relative text-orange-500 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-gray-800"
                                title="Achievements"
                            >
                                <Trophy size={18} className="md:w-5 md:h-5" />
                                {unlockedLeagues.includes('Mythic') && <span className="absolute top-1 right-1 w-1.5 h-1.5 md:w-2 md:h-2 bg-red-500 rounded-full animate-pulse" />}
                            </button>

                            {/* Stars Icon */}
                            <div className="relative group">
                                <div className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-900/10 px-1.5 py-1 md:px-2 md:py-1.5 rounded-lg border border-yellow-200 dark:border-yellow-700/30 cursor-help">
                                    <img src="/star.gif" alt="Star" className="w-[18px] h-[18px] md:w-6 md:h-6 object-contain" />
                                    <span className="text-xs md:text-sm font-bold text-yellow-700 dark:text-yellow-500">{userStars}</span>
                                </div>

                                {/* Boost Status Tooltip */}
                                <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700/50 p-3 opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all duration-200 z-50 pointer-events-none transform translate-y-2 group-hover:translate-y-0">
                                    <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-100 dark:border-gray-700">
                                        <span className="text-xs font-semibold text-gray-500">Active Multiplier</span>
                                        <span className="text-sm font-bold text-blue-600">x{boostInfo?.multiplier || 1}</span>
                                    </div>

                                    <div className="space-y-2">
                                        {boostInfo?.activeBoosts?.length > 0 ? (
                                            boostInfo.activeBoosts.map((boost, idx) => (
                                                <div key={idx} className="flex items-center justify-between text-xs">
                                                    <div className="flex items-center gap-2">
                                                        <Zap size={12} className={boost.type === 'rank' ? "text-purple-500" : "text-yellow-500"} />
                                                        <span className="text-gray-700 dark:text-gray-300">{boost.source}</span>
                                                    </div>
                                                    {boost.remaining && (
                                                        <span className="font-mono text-gray-500 text-[10px]">{boost.remaining}</span>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-xs text-gray-400 text-center py-1">No active boosts</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {view !== 'list' && (
                                <button
                                    onClick={() => {
                                        // Just switch view, state is preserved in activeTest/savedProgress via TestRunner effect usually but here we rely on active set
                                        // Actually, if we just set view to list, testrunner unmounts.
                                        // We need to ensure progress is saved. TestRunner does this on unmount/change usually if we pass a handler.
                                        // Ideally "Back" just hides the view.
                                        setView('list');
                                        // Note: activeTest in State is kept until we null it or replace it.
                                        // But to be sure, we rely on SavedProgress state which is updated by TestRunner.
                                        setActiveTest(null);
                                    }}
                                    className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors bg-gray-50 dark:bg-gray-950 px-3 py-1.5 md:px-4 md:py-2 rounded-lg"
                                >
                                    <Reply size={16} /> <span className="hidden md:inline">Back to List</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Navbar Toggle Handle - Up/Down Logic for Header */}
                    <button
                        onClick={() => setHeaderExpanded(!headerExpanded)}
                        className={clsx(
                            "absolute left-1/2 -translate-x-1/2 flex items-center justify-center w-12 h-6 rounded-b-xl bg-white dark:bg-gray-900 border-x border-b border-gray-100 dark:border-gray-800 shadow-sm text-gray-400 hover:text-blue-600 transition-all z-20",
                            headerExpanded ? "bottom-0 translate-y-full" : "bottom-0 translate-y-full"
                        )}
                        title={headerExpanded ? "Collapse Header" : "Expand Header"}
                    >
                        {headerExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                </header>

                {showSettings && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-sm w-full p-6 relative">
                            <button onClick={() => setShowSettings(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                                <XCircle size={24} />
                            </button>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">Settings</h2>
                            <form onSubmit={handleNameSubmit} className="mb-6 border-b border-gray-100 pb-6 dark:border-gray-700">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Your Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all mb-4 text-gray-900 dark:text-gray-100"
                                    placeholder="Your full name"
                                    value={nameInput}
                                    onChange={(e) => setNameInput(e.target.value)}
                                />
                                <button
                                    type="submit"
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors"
                                >
                                    Save Changes
                                </button>
                            </form>

                            <form onSubmit={handlePromoSubmit}>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Promo Code</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        className="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all text-gray-900 dark:text-gray-100"
                                        placeholder="Enter cheat code..."
                                        value={promoInput}
                                        onChange={(e) => setPromoInput(e.target.value)}
                                    />
                                    <button
                                        type="submit"
                                        className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 rounded-lg transition-colors"
                                    >
                                        Apply
                                    </button>
                                </div>
                            </form>

                            <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                                Upload privilege:{" "}
                                <span className={clsx(canUploadTests ? "text-green-600" : "text-gray-400")}>
                                    {canUploadTests ? "Enabled" : "Disabled"}
                                </span>
                                {isGodmode && <span className="ml-2 text-purple-600">(godmode)</span>}
                            </div>

                            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Sound Volume
                                    <span className="ml-2 text-xs text-gray-400 font-mono">{Math.round(soundVolume * 100)}%</span>
                                </label>
                                <input
                                    type="range"
                                    min={0}
                                    max={100}
                                    step={1}
                                    value={Math.round(soundVolume * 100)}
                                    onChange={(e) => setSoundVolume(Math.max(0, Math.min(1, Number(e.target.value) / 100)))}
                                    className="w-full accent-blue-600"
                                />
                                <div className="mt-2 text-[11px] text-gray-400">
                                    Applies to celebration + spin win sounds.
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Achievements Modal */}
                {showAchievements && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
                        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
                            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800/50 bg-gray-50 dark:bg-gray-950/50">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                        <Trophy className="text-yellow-500" fill="currentColor" />
                                        Achievements
                                    </h2>
                                    <p className="text-gray-500 text-sm mt-1">Unlock badges by dominating the tests.</p>
                                </div>
                                <button onClick={() => setShowAchievements(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="overflow-y-auto p-6 space-y-4">
                                {/* Mythic */}
                                <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-red-50 to-white dark:bg-none dark:bg-gray-800 border border-red-100 dark:border-red-900/30 relative overflow-hidden group">
                                    <div className="bg-red-100 p-3 rounded-full text-red-600 z-10">
                                        <Trophy size={32} />
                                    </div>
                                    <div className="flex-1 z-10">
                                        <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                            Mythic
                                            <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">Ultimate</span>
                                        </h3>
                                        <p className="text-sm text-gray-600 mt-1">
                                            Answer <span className="font-bold text-gray-900 dark:text-gray-100">30 questions consecutively</span> in <span className="font-bold text-purple-600">Impossible Mode</span>.
                                        </p>
                                    </div>
                                    <div className="absolute -right-6 -bottom-6 text-red-500/10 z-0">
                                        <Trophy size={120} />
                                    </div>
                                </div>

                                {/* Legendary */}
                                <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-amber-50 to-white dark:bg-none dark:bg-gray-800 border border-amber-100 dark:border-amber-900/30 relative overflow-hidden group">
                                    <div className="bg-amber-100 p-3 rounded-full text-amber-600 z-10">
                                        <Crown size={32} />
                                    </div>
                                    <div className="flex-1 z-10">
                                        <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                            Legendary
                                            <span className="text-[10px] bg-amber-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">Elite</span>
                                        </h3>
                                        <p className="text-sm text-gray-600 mt-1">
                                            Get <span className="font-bold text-gray-900 dark:text-gray-100">100% Score</span> in <span className="font-bold text-red-600">Insane Mode</span>.
                                        </p>
                                    </div>
                                </div>

                                {/* Epic */}
                                <div className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:bg-gray-950 transition-colors">
                                    <div className="bg-purple-100 p-3 rounded-full text-purple-600">
                                        <Swords size={28} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 dark:text-gray-100">Epic</h3>
                                        <p className="text-sm text-gray-500">Score 85% or higher (Max available in Hard Mode).</p>
                                    </div>
                                </div>

                                {/* Diamond */}
                                <div className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:bg-gray-950 transition-colors">
                                    <div className="bg-cyan-100 p-3 rounded-full text-cyan-600">
                                        <Gem size={28} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 dark:text-gray-100">Diamond</h3>
                                        <p className="text-sm text-gray-500">Score 70% or higher.</p>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                )}

                {showSpinner && (
                    <DailySpinner
                        onClose={() => setShowSpinner(false)}
                        onReward={handleSpinReward}
                        freeSpins={activatedCheats.includes('godmode') ? 9999 : freeSpins}
                        userStars={userStars}
                        onSpinStart={handleSpinStart}
                        nextSpin={boostInfo?.nextSpin}
                        forceLucky={activatedCheats.includes('haveluckyday') || activatedCheats.includes('godmode')}
                        soundVolume={soundVolume}
                    />
                )}

                {showDonateModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-sm w-full p-6 relative overflow-hidden">
                            {/* Decorative Background */}
                            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-rose-500 to-pink-600 opacity-10 rounded-b-[3rem] pointer-events-none" />

                            <button
                                onClick={() => setShowDonateModal(false)}
                                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-50"
                            >
                                <XCircle size={24} />
                            </button>

                            <div className="relative z-10 text-center">
                                <div className="bg-rose-100 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 text-rose-600 ring-4 ring-rose-50">
                                    <Heart size={32} className="fill-rose-500 animate-pulse" />
                                </div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Loyiha Rivojiga Hissa Qo'shing</h2>
                                <p className="text-gray-500 text-sm mb-6">
                                    Agar ushbu loyiha sizga foydali bo'lgan bo'lsa, o'z minnatdorchiligingizni bildirishingiz mumkin.
                                </p>

                                <div className="space-y-3 text-left">
                                    {/* TBC Bank Card */}
                                    <div
                                        className="relative w-full aspect-[1.586/1] rounded-xl shadow-lg group cursor-pointer hover:scale-[1.02] transition-transform duration-300 select-none overflow-hidden bg-gray-900"
                                        onClick={() => {
                                            navigator.clipboard.writeText('9860356624152985');
                                            setCardCopied(true);
                                            setTimeout(() => setCardCopied(false), 2000);
                                        }}
                                    >
                                        <img
                                            src="/card.webp"
                                            alt="Bank Card"
                                            className="absolute inset-0 w-full h-full object-cover"
                                        />

                                        {/* Dark Overlay for reliability if image is too bright */}
                                        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors"></div>

                                        <div className="flex flex-col justify-between h-full relative z-10 p-5">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-lg tracking-wider text-white drop-shadow-md">TBC BANK</span>
                                                </div>
                                                <span className={clsx(
                                                    "text-[10px] px-2 py-1 rounded-md transition-colors duration-300 font-medium flex items-center gap-1 backdrop-blur-md shadow-sm border border-white/20",
                                                    cardCopied ? "bg-green-500 text-white" : "bg-black/40 text-white"
                                                )}>
                                                    {cardCopied ? (
                                                        <>
                                                            <CheckCircle2 size={12} />
                                                            Nusxalandi
                                                        </>
                                                    ) : "Nusxalash"}
                                                </span>
                                            </div>

                                            <div className="flex flex-col items-center justify-center flex-1 my-2">
                                                <div className="font-mono text-xl sm:text-2xl tracking-[0.14em] drop-shadow-md text-white whitespace-nowrap">
                                                    9860 3566 2415 2985
                                                </div>
                                            </div>

                                            <div className="flex justify-between items-end">
                                                <div className="flex flex-col">
                                                    <span className="text-[8px] text-white/80 uppercase tracking-widest mb-0.5">Card Holder</span>
                                                    <div className="text-sm font-medium uppercase tracking-widest text-shadow text-white">Maxmudbek Muzaffarov</div>
                                                </div>
                                                <div className="mb-0.5">
                                                    {/* Humo Logo text fallback or icon */}
                                                    <span className="font-bold italic text-xl tracking-widest text-white/90 drop-shadow-md">HUMO</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Payment Method Selection & QR Code */}
                                <div className="mt-6">
                                    <div className="flex bg-gray-100 p-1 rounded-xl mb-4">
                                        {['payme', 'click', 'uzum'].map((method) => (
                                            <button
                                                key={method}
                                                onClick={() => setPaymentMethod(method)}
                                                className={clsx(
                                                    "flex-1 py-2 rounded-lg text-sm font-semibold capitalize transition-all duration-200",
                                                    paymentMethod === method
                                                        ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm"
                                                        : "text-gray-500 hover:text-gray-700"
                                                )}
                                            >
                                                {method}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="bg-white dark:bg-gray-800 border-2 border-dashed border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center relative group min-h-[180px]">
                                        <div className="w-40 h-40 bg-gray-50 dark:bg-gray-950 rounded-lg flex items-center justify-center mb-2 overflow-hidden shadow-inner relative">
                                            {/* Default Placeholder Icon if image fails to load */}
                                            <div className="absolute inset-0 flex items-center justify-center z-0">
                                                <Smartphone className="text-gray-300 w-12 h-12" />
                                            </div>

                                            {/* Actual QR Image - Place files named qr-payme.jpg, qr-click.jpg, qr-uzum.jpg in public folder */}
                                            <img
                                                key={paymentMethod}
                                                src={`/qr-${paymentMethod}.jpg`}
                                                alt={`${paymentMethod} QR`}
                                                className="w-full h-full object-cover relative z-10"
                                                onError={(e) => e.currentTarget.style.display = 'none'} // Hide if not found
                                            />
                                        </div>
                                        <p className="text-sm font-medium text-gray-600">Scan to pay via <span className="capitalize font-bold text-gray-800 dark:text-gray-200">{paymentMethod}</span></p>
                                        <p className="text-[10px] text-gray-400 mt-1">Camera to'g'rilang</p>
                                    </div>
                                </div>

                                <p className="text-xs text-gray-400 mt-6">
                                    Sizning yordamingiz server xarajatlari va yangi testlar qo'shish uchun sarflanadi. Rahmat! ❤️
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {showUploadModal && canUploadTests && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6 relative">
                            <button onClick={() => setShowUploadModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                                <XCircle size={24} />
                            </button>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                                <Upload className="text-blue-600" /> Upload Test
                            </h2>
                            <form onSubmit={handleUploadSubmit}>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Select Subject</label>
                                <select
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none mb-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                    value={uploadFolder}
                                    onChange={(e) => setUploadFolder(e.target.value)}
                                >
                                    <option value="">General (Root)</option>
                                    {folders.map(f => (
                                        <option key={f} value={f}>{f}</option>
                                    ))}
                                </select>

                                <label className="block text-sm font-medium text-gray-700 mb-1">Test File (JSON)</label>
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 dark:bg-gray-950 transition-colors mb-6 relative">
                                    <input
                                        type="file"
                                        name="fileInput"
                                        accept=".json"
                                        required
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <Upload className="mx-auto text-gray-400 mb-2" />
                                    <p className="text-sm text-gray-500">Click or Drag JSON file here</p>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors"
                                >
                                    Upload Test
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {view === 'list' && (
                    <div className="flex flex-col lg:flex-row gap-6 items-start">
                        {/* Main Content */}
                        <div className="transition-all duration-500 ease-in-out space-y-8 flex-1 w-full min-w-0">
                            <section>
                                <div className="flex justify-between items-end mb-6">
                                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                        <List className="text-blue-500" /> Available Tests
                                    </h2>
                                    <button
                                        onClick={() => {
                                            if (!canUploadTests) {
                                                addToast('Upload disabled', 'Test upload is temporarily disabled.', 'info');
                                                return;
                                            }
                                            playStartSound();
                                            setUploadFolder(folders[0] || '');
                                            setShowUploadModal(true);
                                        }}
                                        disabled={!canUploadTests}
                                        title={!canUploadTests ? 'Upload is temporarily disabled' : 'Upload a new test'}
                                        className={clsx(
                                            "bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5",
                                            !canUploadTests && "opacity-50 cursor-not-allowed hover:bg-blue-600 hover:shadow-md hover:translate-y-0"
                                        )}
                                    >
                                        <Upload size={16} /> Upload Test
                                    </button>
                                </div>

                                <div className="space-y-8">
                                    {/* Default Tests Grouped by Category */}
                                    {Object.entries(tests.defaultTests.reduce((acc, test) => {
                                        const category = test.category || 'General';
                                        if (!acc[category]) acc[category] = [];
                                        acc[category].push(test);
                                        return acc;
                                    }, folders.reduce((acc, f) => ({ ...acc, [f]: [] }), {}))).sort(([catA, testsA], [catB, testsB]) => {
                                        const hasTestsA = testsA.length > 0;
                                        const hasTestsB = testsB.length > 0;
                                        if (hasTestsA && !hasTestsB) return -1;
                                        if (!hasTestsA && hasTestsB) return 1;

                                        // Sort by Exam Schedule Priority (Closest Date >= Today first)
                                        const getPriority = (catName) => {
                                            const now = new Date();
                                            now.setHours(0,0,0,0);
                                            const months = {Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11};
                                            const year = now.getFullYear();

                                            const exams = EXAM_SCHEDULE.filter(e => !e.isHeader && e.name === catName);
                                            if (!exams.length) return Infinity; // No schedule = lowest priority

                                            let minDiff = Infinity;
                                            exams.forEach(e => {
                                                const examDate = new Date(year, months[e.month], parseInt(e.day));
                                                // Only consider upcoming or today's exams
                                                if (examDate >= now) {
                                                    const diff = examDate.getTime() - now.getTime();
                                                    if (diff < minDiff) minDiff = diff;
                                                }
                                            });
                                            return minDiff;
                                        };

                                        const pA = getPriority(catA);
                                        const pB = getPriority(catB);

                                        if (pA !== pB) {
                                            return pA - pB;
                                        }

                                        return catA.localeCompare(catB);
                                    }).map(([category, categoryTests]) => (
                                        <div key={category} className="bg-gray-50 dark:bg-gray-900/30 rounded-xl p-6 border border-gray-100 dark:border-gray-800/30">
                                            <h3 className="text-lg font-bold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
                                                <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-500 p-2 rounded-lg">
                                                    <Folder size={20} className="fill-current" />
                                                </span>
                                                {category}
                                            </h3>
                                            <div className="grid md:grid-cols-2 gap-4">
                                                {categoryTests.length > 0 ? categoryTests.map(test => {
                                                    const isCommunity = test.type === 'uploaded';
                                                    const badgeLabel = isCommunity ? "Community" : "Official";
                                                    const badgeColor = isCommunity ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700";

                                                    // Check if Updated recently (within 1 day)
                                                    const isUpdated = test.updatedAt && (new Date() - new Date(test.updatedAt) < 1 * 24 * 60 * 60 * 1000);

                                                    // Check unlock status - also check with common base patterns
                                                    const testIsUnlocked = allPremiumUnlocked || (test.isPremium && (
                                                        unlockedTests.has(test.id) || 
                                                        unlockedTests.has(`${test.id}_en`) || 
                                                        unlockedTests.has(`${test.id}_uz`)
                                                    ));

                                                    return (
                                                        <TestCard
                                                            key={test.id}
                                                            test={test}
                                                            activeUsers={globalActiveUsers}
                                                            onStart={(t) => startTest(t || test)}
                                                            badge={badgeLabel}
                                                            badgeColor={badgeColor}
                                                            isUpdated={isUpdated}
                                                            hasProgress={!!savedProgress[test.id]}
                                                            isLocked={test.isPremium && !testIsUnlocked}
                                                            isUnlocked={test.isPremium && testIsUnlocked}
                                                        />
                                                    );
                                                }) : (
                                                    <div className="col-span-2 text-center py-8 text-gray-400 text-sm italic border-2 border-dashed border-gray-100 dark:border-gray-800/50 rounded-lg">
                                                        No tests available in this subject.{" "}
                                                        {canUploadTests ? (
                                                            <button
                                                                onClick={() => {
                                                                    setUploadFolder(category);
                                                                    setShowUploadModal(true);
                                                                }}
                                                                className="text-blue-500 hover:underline"
                                                            >
                                                                Upload one?
                                                            </button>
                                                        ) : (
                                                            <span className="text-gray-400">Upload disabled</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    {/* Uploaded Tests */}
                                    {tests.uploadedTests.length > 0 && (
                                        <div className="bg-gray-50 dark:bg-gray-950/50 rounded-xl p-6 border border-gray-100 dark:border-gray-800/50">
                                            <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
                                                <span className="bg-blue-100 text-blue-600 p-2 rounded-lg">
                                                    <Upload size={20} />
                                                </span>
                                                Uploaded / Community
                                            </h3>
                                            <div className="grid md:grid-cols-2 gap-4">
                                                {tests.uploadedTests.map(test => (
                                                    <TestCard
                                                        key={test.id}
                                                        test={test}
                                                        activeUsers={globalActiveUsers}
                                                        onStart={(t) => startTest(t || test)}
                                                        badge="Community"
                                                        badgeColor="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                                        hasProgress={!!savedProgress[test.id]}
                                                        isLocked={false} // Community tests are never locked
                                                        isUnlocked={false}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {tests.defaultTests.length === 0 && tests.uploadedTests.length === 0 && (
                                        <div className="col-span-2 p-12 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 dark:bg-gray-950/50">
                                            No tests available. Upload one to get started.
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* Leaderboard Section */}
                            <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800/50 p-6">
                                <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
                                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                        <Trophy className="text-yellow-500" /> Leaderboard
                                    </h2>

                                    <div className="flex flex-wrap justify-center items-center gap-3">
                                        <button
                                            onClick={() => setShowAchievements(true)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all border bg-white dark:bg-transparent text-gray-500 border-gray-200 dark:border-orange-500/50 dark:text-orange-500 hover:text-orange-600 hover:border-orange-300 shadow-sm"
                                        >
                                            <Crown size={14} /> Achievements Rules
                                        </button>

                                        <div className="flex justify-center gap-2 bg-gray-50 dark:bg-gray-950 p-1 rounded-xl border border-gray-100 dark:border-gray-800/50">
                                            {['today', '3days', '7days', 'all'].map((p) => (
                                                <button
                                                    key={p}
                                                    onClick={() => setFilterPeriod(p)}
                                                    className={clsx(
                                                        "px-4 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wide transition-all",
                                                        filterPeriod === p
                                                            ? "bg-white dark:bg-gray-800 text-blue-600 shadow-sm border border-gray-100 dark:border-gray-800/50"
                                                            : "text-gray-400 hover:text-gray-600"
                                                    )}
                                                >
                                                    {p === 'all' ? 'All Time' : p === '3days' ? '3 Days' : p === '7days' ? '7 Days' : 'Today'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                {leaderboard.length === 0 ? (
                                    <div className="text-center py-8 text-gray-400 italic">No results yet. Be the first!</div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-center">
                                            <thead>
                                                <tr className="border-b border-gray-100 dark:border-gray-800/50 text-xs uppercase text-gray-400 font-semibold tracking-wider">
                                                    <th className="pb-3 w-16 px-1">Rank</th>
                                                    <th className="pb-3 w-48 px-2">User</th>
                                                    <th className="pb-3 w-32 px-2">Title</th>
                                                    <th className="pb-3 px-2">Test</th>
                                                    <th className="pb-3 w-24 px-2">Mode</th>
                                                    <th className="pb-3 w-24 px-2">Time</th>
                                                    <th className="pb-3 w-24 px-2">Duration</th>
                                                    <th className="pb-3 w-24 px-2 text-right">Score</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                                                {leaderboard.map((entry, idx) => {
                                                    const percentage = (entry.score / entry.total) * 100;
                                                    const league = getLeague(entry.score, entry.total, entry.difficulty, entry.duration, entry.questions, entry.answers);

                                                    const diffConfig = DIFFICULTIES.find(d => d.id === (entry.difficulty || 'easy')) || DIFFICULTIES[0];
                                                    const DiffIcon = diffConfig.icon;

                                                    const LeagueIcon = league.icon;
                                                    return (
                                                        <tr key={idx} className={clsx("transition-all", league.rowClass)}>
                                                            <td className="py-4 px-2 flex justify-center">
                                                                {idx < 3 ? (
                                                                    <div className={clsx(
                                                                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-sm border-2",
                                                                        idx === 0 ? "bg-yellow-100 text-yellow-700 border-yellow-200" :
                                                                            idx === 1 ? "bg-gray-100 text-gray-700 border-gray-200" :
                                                                                "bg-orange-50 text-orange-800 border-orange-200"
                                                                    )}>
                                                                        {idx + 1}
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-gray-400 font-mono text-sm">#{idx + 1}</span>
                                                                )}
                                                            </td>
                                                            <td className="py-3 px-2">
                                                                <div className="flex flex-col">
                                                                    {league.name === 'Mythic' ? (
                                                                        <span className="text-base font-extrabold flex justify-center">
                                                                            {entry.name.split('').map((char, i) => (
                                                                                <span key={i} className="mythic-blood relative inline-block mx-[0.5px]">
                                                                                    {char === ' ' ? '\u00A0' : char}
                                                                                </span>
                                                                            ))}
                                                                        </span>
                                                                    ) : (
                                                                        <span className={clsx("text-base font-medium", league.textClass)}>
                                                                            {entry.name}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="py-3 px-2">
                                                                {league.name === 'Mythic' ? (
                                                                    <span className={clsx(
                                                                        "inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border shadow-sm font-semibold mx-auto",
                                                                        league.badgeClass,
                                                                        "animate-pulse" // Added pulse here
                                                                    )}>
                                                                        <Trophy size={12} className="text-[#ff0000] drop-shadow-sm" />
                                                                        {league.name}
                                                                    </span>
                                                                ) : (
                                                                    <span className={clsx("inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border shadow-sm font-semibold mx-auto", league.badgeClass)}>
                                                                        <LeagueIcon size={12} className={percentage === 100 ? "animate-pulse" : ""} />
                                                                        {league.name}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="py-3 text-sm text-gray-500 font-medium px-2">{entry.testName}</td>
                                                            <td className="py-3 px-2">
                                                                <div className={clsx("inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] uppercase font-bold border", diffConfig.bg, diffConfig.color, diffConfig.border)}>
                                                                    <DiffIcon size={10} />
                                                                    {diffConfig.name}
                                                                </div>
                                                            </td>
                                                            <td className="py-3 text-sm text-gray-400 px-2">{timeAgo(entry.date)}</td>
                                                            <td className="py-3 text-sm text-gray-500 font-mono px-2">{formatDuration(entry.duration)}</td>
                                                            <td className="py-3 text-right px-2">
                                                                <span className={clsx(
                                                                    "font-bold text-lg",
                                                                    (() => {
                                                                        const pct = Math.round((entry.score / entry.total) * 100);
                                                                        if (pct >= 90) return "text-emerald-700 dark:text-emerald-400"; // Dark Green
                                                                        if (pct >= 75) return "text-green-500 dark:text-green-400";     // Light Green
                                                                        if (pct >= 60) return "text-yellow-500 dark:text-yellow-400";    // Yellow/Orange
                                                                        if (pct >= 40) return "text-red-400 dark:text-red-400";          // Light Red
                                                                        return "text-red-700 dark:text-red-600";                         // Dark Red
                                                                    })()
                                                                )}>
                                                                    {Math.round((entry.score / entry.total) * 100)}%
                                                                </span>
                                                                <span className="text-gray-400 text-xs ml-1 block">
                                                                    ({formatScore(entry.score)}/{entry.total})
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {/* Pagination Controls */}
                                {filterPeriod === 'all' && leaderboard.length > 0 && (
                                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-4 text-xs font-medium text-gray-500 border-t border-gray-100 pt-4">
                                        <div className="flex items-center gap-2">
                                            <span>Rows per page:</span>
                                            <select
                                                value={leaderboardLimit}
                                                onChange={(e) => {
                                                    setLeaderboardLimit(Number(e.target.value));
                                                    setLeaderboardPage(1); // Reset to first page
                                                }}
                                                className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 outline-none focus:border-blue-500 dark:text-gray-200 transition-colors"
                                            >
                                                {[10, 20, 30, 50, 100].map(n => (
                                                    <option key={n} value={n}>{n}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <span>
                                                {(leaderboardPage - 1) * leaderboardLimit + 1}-{Math.min(leaderboardPage * leaderboardLimit, leaderboardTotal)} of {leaderboardTotal}
                                            </span>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => setLeaderboardPage(p => Math.max(1, p - 1))}
                                                    disabled={leaderboardPage === 1}
                                                    className="p-1 hover:bg-gray-100 rounded disabled:opacity-30 transition-colors"
                                                >
                                                    <ChevronLeft size={16} />
                                                </button>
                                                <button
                                                    onClick={() => setLeaderboardPage(p => (p * leaderboardLimit < leaderboardTotal ? p + 1 : p))}
                                                    disabled={leaderboardPage * leaderboardLimit >= leaderboardTotal}
                                                    className="p-1 hover:bg-gray-100 rounded disabled:opacity-30 transition-colors"
                                                >
                                                    <ChevronRight size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </section>
                        </div>

                        {/* Sidebar - Online Users & Schedule */}
                        {/* Sidebar Toggle Handle */}
                        <div className="fixed right-0 top-1/2 -translate-y-1/2 z-[60] hidden lg:block">
                            <button
                                onClick={() => setSidebarExpanded(!sidebarExpanded)}
                                className={clsx(
                                    "flex items-center justify-center w-6 h-16 rounded-l-2xl bg-white dark:bg-gray-800 border-y border-l border-gray-200 dark:border-gray-700 shadow-[0_0_15px_rgba(0,0,0,0.1)] text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all hover:w-8 hover:bg-gray-50 dark:hover:bg-gray-700",
                                )}
                                title={sidebarExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
                            >
                                {sidebarExpanded ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                            </button>
                        </div>

                        <div className={clsx("transition-all duration-500 ease-in-out relative shrink-0", sidebarExpanded ? "w-full lg:w-80 opacity-100" : "w-0 opacity-0 overflow-hidden")}>
                            <div className="sticky top-28 space-y-6 lg:w-80">
                                {/* Active Users Widget */}
                                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800/50 p-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="relative">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                            <div className="w-2.5 h-2.5 bg-green-500 rounded-full relative"></div>
                                        </div>
                                        <h3 className="font-bold text-gray-800 dark:text-gray-200">Online Users</h3>
                                        <span className="text-xs font-mono text-gray-400 ml-auto bg-gray-50 dark:bg-gray-950 px-2 py-0.5 rounded-full border border-gray-100 dark:border-gray-800/50">
                                            {globalActiveUsers.length}
                                        </span>
                                    </div>

                                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                                        {!isUsersLoaded && globalActiveUsers.length === 0 ? (
                                            <div className="flex justify-center p-4">
                                                <Loader2 className="animate-spin text-blue-500" size={20} />
                                            </div>
                                        ) : globalActiveUsers.length === 0 ? (
                                            <p className="text-sm text-gray-400 text-center py-4">No active users.</p>
                                        ) : (
                                            [...globalActiveUsers]
                                                .sort((a, b) => (a.userId === userId ? -1 : b.userId === userId ? 1 : 0))
                                                .map((user, idx) => {
                                                    const isMe = user.userId === userId;
                                                    return (
                                                        <div key={idx} className={clsx(
                                                            "flex items-center gap-3 p-2 rounded-lg transition-colors border",
                                                            isMe
                                                                ? "bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30"
                                                                : "hover:bg-gray-50 dark:bg-gray-950 border-transparent hover:border-gray-100 dark:border-gray-800/50"
                                                        )}>
                                                            <div className={clsx(
                                                                "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border",
                                                                isMe
                                                                    ? "bg-blue-600 text-white border-blue-600 animate-float"
                                                                    : "bg-gradient-to-br from-blue-100 to-indigo-100 text-indigo-600 border-indigo-200"
                                                            )}>
                                                                {isMe ? <User size={14} /> : user.name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex justify-between items-center">
                                                                    <div className="flex items-center gap-1.5 truncate">
                                                                        {user.stars !== undefined && (
                                                                            <span className="flex items-center gap-0.5 text-[10px] font-bold text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-[#1a1b26] px-1 py-0.5 rounded border border-yellow-100 dark:border-yellow-600/30" title="Total Stars">
                                                                                <span>⭐</span>{user.stars}
                                                                            </span>
                                                                        )}
                                                                        <p className={clsx("text-sm font-semibold truncate", isMe ? "text-blue-700 dark:text-blue-400" : "text-gray-700 dark:text-gray-100")}>
                                                                            {isMe ? "Me" : user.name}
                                                                        </p>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span title={user.country || "Unknown Country"} className="cursor-help select-none transition-all">
                                                                            <CountryFlag countryCode={user.country} />
                                                                        </span>
                                                                        {user.device === 'mobile'
                                                                            ? <Smartphone size={12} className="text-gray-400" />
                                                                            : <Monitor size={12} className="text-gray-400" />
                                                                        }
                                                                        {/* Theme Indicator */}
                                                                        {user.theme === 'dark' ? (
                                                                            <Moon size={12} className="text-gray-400" title="Dark Mode" />
                                                                        ) : (
                                                                            <Sun size={12} className="text-amber-500" title="Light Mode" />
                                                                        )}

                                                                        {/* Spectate Button */}
                                                                        {!isMe && user.status === 'in-test' && (
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setSpectatingUser(user);
                                                                                }}
                                                                                title="Watch this user"
                                                                                className="p-1 hover:bg-indigo-100 text-indigo-400 hover:text-indigo-600 rounded transition-colors"
                                                                            >
                                                                                <Eye size={14} />
                                                                            </button>
                                                                        )}
                                                                        {user.status === 'browsing' && (
                                                                            <span className="w-2 h-2 rounded-full bg-green-500" title="Browsing"></span>
                                                                        )}
                                                                        {user.status === 'afk' && (
                                                                            <span className="w-2 h-2 rounded-full bg-yellow-400" title="AFK"></span>
                                                                        )}
                                                                    </div>
                                                                </div>


                                                                {user.status === 'in-test' ? (
                                                                    <div
                                                                        onClick={() => !isMe && setSpectatingUser(user)}
                                                                        className="flex items-center gap-1.5 mt-0.5 cursor-pointer hover:opacity-80"
                                                                    >
                                                                        <span className="text-[10px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 rounded truncate max-w-[100px] inline-block">
                                                                            Taking Test
                                                                        </span>
                                                                        <div className="h-1 flex-1 bg-gray-100 rounded-full overflow-hidden max-w-[60px]">
                                                                            <div
                                                                                className="h-full bg-blue-500"
                                                                                style={{ width: `${((user.progress) / user.total) * 100}%` }}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <p className={clsx("text-[10px] mt-0.5", isMe ? "text-blue-400" : "text-gray-400")}>
                                                                        {user.status === 'afk' ? 'AFK' : 'Browsing list...'}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                        )}
                                    </div>

                                    <div className="mt-6 pt-4 border-t border-gray-50">
                                        <p className="text-xs text-center text-gray-400">
                                            Shows users currently active in a test
                                        </p>
                                    </div>
                                </div>

                                {/* Exam Schedule Widget */}
                                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800/50 overflow-hidden">
                                    <div className="p-4 border-b border-gray-100 dark:border-gray-800/50">
                                        <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                            <Calendar className="text-emerald-500 dark:text-emerald-400" size={18} /> Exam Schedule
                                        </h3>
                                    </div>
                                    <div className="p-4 space-y-3">
                                        {EXAM_SCHEDULE.map((item, idx, arr) => {
                                            if (item.isHeader) {
                                                return (
                                                    <div key={idx} className="bg-red-500/10 border border-red-500/30 rounded-lg py-2 text-center">
                                                        <span className="text-red-400 font-bold uppercase text-sm tracking-widest">{item.title}</span>
                                                    </div>
                                                );
                                            }

                                            // Calculate time remaining (Year 2026)
                                            const examDate = new Date(`${item.month} ${item.day}, 2026 ${item.time}`);
                                            const now = new Date();
                                            const diffMs = examDate - now;
                                            const isFinished = diffMs < 0;

                                            // Find if this is the NEXT upcoming exam
                                            const upcomingExams = arr.filter(e => !e.isHeader).map(e => {
                                                const d = new Date(`${e.month} ${e.day}, 2026 ${e.time}`);
                                                return { ...e, date: d, diff: d - now };
                                            }).filter(e => e.diff > 0).sort((a, b) => a.diff - b.diff);
                                            const isNext = upcomingExams.length > 0 && 
                                                upcomingExams[0].day === item.day && 
                                                upcomingExams[0].month === item.month &&
                                                upcomingExams[0].name === item.name;

                                            let timeStatus = "";
                                            if (isFinished) {
                                                timeStatus = "Finished";
                                            } else {
                                                const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                                                const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                                                const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

                                                if (diffDays > 0) {
                                                    timeStatus = `${diffDays}d ${diffHours}h`;
                                                } else if (diffHours > 0) {
                                                    timeStatus = `${diffHours}h ${diffMinutes}m`;
                                                } else {
                                                    timeStatus = `${diffMinutes}m`;
                                                }
                                            }

                                            return (
                                                <div key={idx} className="relative">
                                                    {/* Arrow indicator for next exam */}
                                                    {isNext && (
                                                        <div className="absolute -left-6 top-1/2 -translate-y-1/2 text-emerald-400">
                                                            <ChevronRight size={20} className="animate-bounce-x" />
                                                        </div>
                                                    )}

                                                    {/* Card */}
                                                    <div className={clsx(
                                                        "flex-1 flex gap-3 items-center p-3 rounded-xl border transition-all",
                                                        isFinished 
                                                            ? "bg-gray-50 dark:bg-[#111824]/50 border-gray-100 dark:border-gray-700/50 opacity-70" 
                                                            : isNext
                                                                ? "bg-white dark:bg-[#111824] border-blue-500 shadow-md ring-1 ring-blue-500/20"
                                                                : "bg-white dark:bg-[#111824] border-gray-100 dark:border-gray-700/50 shadow-sm"
                                                    )}>
                                                        {/* Date Box */}
                                                        <div className={clsx(
                                                            "flex flex-col items-center justify-center rounded-lg p-2 w-14 h-14 shrink-0 transition-colors",
                                                            isFinished ? "bg-gray-200 dark:bg-gray-700" : "bg-gray-100 dark:bg-[#1f2937]"
                                                        )}>
                                                            <span className="text-[10px] font-bold text-red-500 dark:text-red-400 uppercase">{item.month}</span>
                                                            <span className="text-xl font-black text-gray-800 dark:text-white leading-none">{item.day}</span>
                                                        </div>

                                                        {/* Info */}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex justify-between items-start gap-2">
                                                                <h4 className="text-sm font-bold text-gray-800 dark:text-white truncate">{item.name}</h4>
                                                                
                                                                {/* Status Badge */}
                                                                {isFinished ? (
                                                                    <div className="flex items-center gap-1 bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0">
                                                                        <CheckCircle2 size={12} />
                                                                        <span>Finished</span>
                                                                    </div>
                                                                ) : (
                                                                    <span className={clsx(
                                                                        "text-[10px] font-bold whitespace-nowrap px-2 py-0.5 rounded-full shrink-0",
                                                                        isNext 
                                                                            ? "bg-blue-500 text-white" 
                                                                            : "bg-blue-500/20 text-blue-300"
                                                                    )}>
                                                                        {timeStatus}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-400">
                                                                <Clock size={10} />
                                                                <span>{item.time}</span>
                                                                <span className="text-gray-600">•</span>
                                                                <span>{item.room}</span>
                                                            </div>

                                                            <p className="text-[10px] text-gray-500 mt-0.5">{item.teacher}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
                }

                {
                    view === 'history' && (
                        <div className="max-w-4xl mx-auto">
                            <div className="mb-6 flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                    <Clock className="text-blue-500" /> Your History
                                </h2>
                                <button
                                    onClick={() => { playStartSound(); setView('list'); }}
                                    className="text-gray-500 hover:text-gray-700 font-medium text-sm flex items-center gap-1"
                                >
                                    <ArrowLeft size={16} /> Back
                                </button>
                            </div>

                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800/50 p-6">
                                {leaderboard.filter(e => e.name === userName).length === 0 ? (
                                    <div className="text-center py-12 text-gray-400">
                                        <Clock size={48} className="mx-auto mb-4 opacity-20" />
                                        <p>No test history found for <strong>{userName}</strong>.</p>
                                        <button onClick={() => setView('list')} className="text-blue-500 hover:underline mt-2">Take a test</button>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-center">
                                            <thead>
                                                <tr className="border-b border-gray-100 dark:border-gray-800/50 text-xs uppercase text-gray-400 font-semibold tracking-wider">
                                                    <th className="pb-3 w-48 text-left pl-4">Test</th>
                                                    <th className="pb-3 w-32">Rank</th>
                                                    <th className="pb-3 w-32">Date</th>
                                                    <th className="pb-3 w-24">Duration</th>
                                                    <th className="pb-3 text-right pr-4">Score</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {leaderboard
                                                    .filter(e => e.name === userName)
                                                    .sort((a, b) => new Date(b.date) - new Date(a.date)) // Sort by newest
                                                    .map((entry, idx) => {
                                                        // Pass difficulty/duration to get new Badge logic
                                                        const league = getLeague(entry.score, entry.total, entry.difficulty, entry.duration, entry.questions, entry.answers);
                                                        const LeagueIcon = league.icon;
                                                        return (
                                                            <tr
                                                                key={idx}
                                                                className="hover:bg-gray-50 dark:bg-gray-950 transition-colors cursor-pointer group"
                                                                onClick={() => {
                                                                    if (entry.questions && entry.answers) {
                                                                        setActiveReview(entry);
                                                                        setView('review');
                                                                    } else {
                                                                        alert("Detailed review not available for this record.");
                                                                    }
                                                                }}
                                                            >
                                                                <td className="py-4 pl-4 text-left font-medium text-gray-700 group-hover:text-blue-600">
                                                                    {entry.testName}
                                                                    {(!entry.questions || !entry.answers) && <span className="ml-2 text-[10px] text-gray-400 border px-1 rounded">No Details</span>}
                                                                </td>
                                                                <td className="py-4">
                                                                    <span className={clsx("inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border shadow-sm font-semibold", league.badgeClass)}>
                                                                        <LeagueIcon size={12} /> {league.name}
                                                                    </span>
                                                                </td>
                                                                <td className="py-4 text-sm text-gray-500">
                                                                    {new Date(entry.date).toLocaleDateString()} <span className="text-xs opacity-50">{new Date(entry.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                                </td>
                                                                <td className="py-4 text-sm text-gray-500 font-mono">
                                                                    {formatDuration(entry.duration)}
                                                                </td>
                                                                <td className="py-4 text-right pr-4">
                                                                    <span className="font-bold text-lg text-gray-700">{formatScore(entry.score)}</span>
                                                                    <span className="text-gray-400 text-xs ml-1">/ {entry.total}</span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                }

                {
                    view === 'review' && activeReview && (
                        <div className="max-w-4xl mx-auto">
                            <div className="mb-6 flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                    <CheckCircle2 className="text-green-500" /> Test Review: {activeReview.testName}
                                </h2>
                                <button
                                    onClick={() => { playStartSound(); setView('history'); }}
                                    className="text-gray-500 hover:text-gray-700 font-medium text-sm flex items-center gap-1"
                                >
                                    <ArrowLeft size={16} /> Back to History
                                </button>
                            </div>

                            {/* Score Summary */}
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800/50 mb-6 flex justify-around items-center">
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{formatScore(activeReview.score)} / {activeReview.total}</div>
                                    <div className="text-xs text-gray-500 uppercase tracking-widest mt-1">Score</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-blue-600">{Math.round((activeReview.score / activeReview.total) * 100)}%</div>
                                    <div className="text-xs text-gray-500 uppercase tracking-widest mt-1">Accuracy</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-xl font-bold text-gray-700">{formatDuration(activeReview.duration)}</div>
                                    <div className="text-xs text-gray-500 uppercase tracking-widest mt-1">Time</div>
                                </div>
                            </div>

                            <DetailedReview questions={activeReview.questions} answers={activeReview.answers} />
                        </div>
                    )
                }

                {
                    view === 'test' && activeTest && (
                        <TestRunner
                            key={`${activeTest.id}-${activeTest.startTime}`} // Add key to force remount on retake
                            test={activeTest}
                            userName={userName}
                            userId={userId}
                            userCountry={userCountry}
                            activatedCheats={activatedCheats}
                            soundVolume={soundVolume}
                            playClickSound={playStartSound}
                            onBack={() => setView('list')}
                            onLeaveWithoutResult={() => {
                                clearProgress(activeTest.id);
                                saveCurrentProgress(activeTest.id, null);
                                setActiveTest(null);
                                setView('list');
                            }}
                            onProgressUpdate={(progress) => saveCurrentProgress(activeTest.id, progress)}
                            userStars={userStars}
                            unlockedLeagues={unlockedLeagues}
                            updateUserStars={updateUserStars}
                            updateUserUnlocks={updateUserUnlocks}
                            spendStars={spendStars}
                            onFinish={(results) => {
                                setActiveTest(prev => ({ ...prev, isFinished: true, ...results }));
                                clearProgress(activeTest.id); // Clear progress on finish
                                saveCurrentProgress(activeTest.id, null); // Ensure cleared in state
                                fetchLeaderboard(); // Refresh leaderboard
                            }}
                            onRetake={() => {
                                clearProgress(activeTest.id);

                                // Re-shuffle for retake
                                const rawQuestions = activeTest.content.test_questions || [];

                                // Easy mode limit logic (User request: 20 random questions for easy mode)
                                let questionsPool = shuffleArray(rawQuestions);
                                if (activeTest.difficultyMode === 'easy' && questionsPool.length > 20) {
                                    questionsPool = questionsPool.slice(0, 20);
                                }

                                const preparedQuestions = questionsPool.map(q => {
                                    const optionsArray = Object.entries(q.options).map(([key, value]) => ({ id: key, text: value }));
                                    return { ...q, shuffledOptions: shuffleArray(optionsArray) };
                                });

                                setActiveTest({
                                    ...activeTest,
                                    questions: preparedQuestions,
                                    currentQuestionIndex: 0,
                                    answers: {},
                                    isFinished: false,
                                    score: 0,
                                    startTime: Date.now() // Update startTime to trigger key change
                                });
                            }}
                        />
                    )
                }
            </div >
            {/* Spectator Modal */}
            {
                spectatingUser && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
                            {/* Header */}
                            <div className="p-4 border-b flex justify-between items-center bg-gradient-to-r from-gray-50 to-white">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg border border-indigo-200">
                                        {spectatingUser.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-gray-900 dark:text-gray-100">Watching {spectatingUser.name}</h3>
                                            {spectatingUser.device === 'mobile' ? <Smartphone size={14} className="text-gray-400" /> : <Monitor size={14} className="text-gray-400" />}
                                            <span className="text-lg"><CountryFlag countryCode={spectatingUser.country} /></span>
                                        </div>
                                        <p className="text-xs text-gray-500 flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                            Live Stream • Question {(spectatingUser.progress || 0) + 1} of {spectatingUser.total}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSpectatingUser(null)}
                                    className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-950">
                                {(() => {
                                    // Try to find the test
                                    // We look in both defaultTests and uploadedTests (from state)
                                    var test;
                                    if (tests) {
                                        test = [...(tests.defaultTests || []), ...(tests.uploadedTests || [])].find(t => t.id === spectatingUser.testId);
                                    }

                                    if (!test) return (
                                        <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
                                            <EyeOff size={48} className="mb-4" />
                                            <p>This user is taking a private or locally uploaded test.</p>
                                            <p className="text-sm">Cannot display question content.</p>
                                        </div>
                                    );

                                    // Safely access questions: test.questions OR test.content.test_questions
                                    const questions = test.questions || test.content?.test_questions;
                                    if (!questions) return <div className="p-4 text-center">Cannot load questions data.</div>;

                                    const question = questions[spectatingUser.progress || 0];
                                    if (!question) return <div className="p-4 text-center">Waiting for question data...</div>;

                                    return (
                                        <div className="max-w-2xl mx-auto">
                                            {/* Question Card */}
                                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 p-6 mb-4">
                                                <div className="flex justify-between items-start mb-4">
                                                    <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                                                        Question {(spectatingUser.progress || 0) + 1}
                                                    </span>
                                                </div>
                                                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 leading-relaxed">
                                                    {question.question}
                                                </h2>
                                            </div>

                                            {/* Options */}
                                            <div className="space-y-3">
                                                {(() => {
                                                    // Handle options whether they are Array or Object
                                                    let optionsArray = [];
                                                    if (Array.isArray(question.options)) {
                                                        optionsArray = question.options;
                                                    } else if (typeof question.options === 'object' && question.options !== null) {
                                                        optionsArray = Object.entries(question.options).map(([key, value]) => ({
                                                            id: key,
                                                            text: value
                                                        }));
                                                    }

                                                    return optionsArray.map((option) => {
                                                        const isSelected = spectatingUser.currentAnswer === option.id;
                                                        return (
                                                            <div key={option.id} className={clsx(
                                                                "p-4 rounded-xl border-2 transition-all relative overflow-hidden",
                                                                isSelected
                                                                    ? "border-indigo-500 bg-indigo-50/50 shadow-md transform scale-[1.01]"
                                                                    : "border-gray-100 dark:border-gray-800/50 bg-white dark:bg-gray-800 opacity-60"
                                                            )}>
                                                                <div className="flex items-center gap-4">
                                                                    <div className={clsx(
                                                                        "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm transition-colors border",
                                                                        isSelected
                                                                            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                                                            : "bg-gray-50 dark:bg-gray-950 text-gray-500 border-gray-200"
                                                                    )}>
                                                                        {option.id}
                                                                    </div>
                                                                    <div className="font-medium text-gray-700">{option.text}</div>
                                                                </div>
                                                                {isSelected && (
                                                                    <div className="absolute top-1/2 -translate-y-1/2 right-4 text-indigo-600 font-medium text-xs bg-indigo-100 px-2 py-1 rounded-full flex items-center gap-1">
                                                                        <Eye size={12} />
                                                                        Selected
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    });
                                                })()}
                                            </div>

                                            <div className="mt-8 text-center text-xs text-gray-400">
                                                Watching in real-time. Content updates as the user progresses.
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Difficulty Selection Modal */}
            {
                showDifficultyModal && pendingTest && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden scale-100">
                            <div className="p-8 pb-6 border-b border-gray-100 dark:border-gray-800/50 bg-gray-50 dark:bg-gray-950/50">
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">Select Difficulty</h3>
                                <p className="text-gray-500">Choose your challenge level for <span className="font-semibold text-gray-800 dark:text-gray-200">{pendingTest.name}</span></p>
                            </div>
                            <div className="p-6 space-y-3">
                                {DIFFICULTIES.map((diff) => (
                                    <button
                                        key={diff.id}
                                        onClick={() => launchTest(diff.id)}
                                        className={`w-full group relative flex items-center p-4 rounded-xl border-2 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${diff.border} dark:border-transparent ${diff.bg || 'bg-white dark:bg-gray-800'} hover:border-current`}
                                    >
                                        <div className={`mr-4 p-3 rounded-full bg-white dark:bg-gray-800 shadow-sm ${diff.color}`}>
                                            <diff.icon size={24} strokeWidth={2.5} />
                                        </div>
                                        <div className="text-left flex-1">
                                            <div className={`font-bold text-lg ${diff.color}`}>{diff.name}</div>
                                            <div className="text-sm text-gray-600 font-medium">
                                                {diff.hints === 0 ? "No hints available" : `${diff.hints} ${diff.hints === 1 ? 'hint' : 'hints'} available`}
                                            </div>
                                        </div>
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity -mr-2">
                                            <div className={`p-2 rounded-full ${diff.color} bg-white dark:bg-gray-800 shadow-sm`}>
                                                <Play size={20} fill="currentColor" />
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800/50 text-center">
                                <button
                                    onClick={() => {
                                        setShowDifficultyModal(false);
                                        setPendingTest(null);
                                    }}
                                    className="text-gray-500 hover:text-gray-800 dark:text-gray-200 font-medium text-sm py-2 px-4 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Key Unlock Modal */}
            {
                showKeyModal && (
                    <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md border border-gray-100 dark:border-gray-800 overflow-hidden transform transition-all scale-100">
                            {showPaymentOptions ? (
                                <div className="p-6">
                                     <div className="flex items-center gap-2 mb-6">
                                        <button 
                                            onClick={() => setShowPaymentOptions(false)}
                                            className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                        >
                                            <ArrowLeft size={20} className="text-gray-500" />
                                        </button>
                                        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Select Payment Method</h2>
                                    </div>
                                    
                                    <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                                        <div className="text-center mb-4">
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Send 30,000 UZS to this card:</p>
                                            <div className="flex items-center justify-center gap-2 bg-white dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm group cursor-pointer"
                                                 onClick={() => {
                                                     navigator.clipboard.writeText('9860356624152985');
                                                     setCardCopied(true);
                                                     setTimeout(() => setCardCopied(false), 2000);
                                                 }}
                                            >
                                                <span className="font-mono text-xl font-bold text-gray-800 dark:text-gray-200 tracking-wider">9860 35... 2985</span>
                                                {cardCopied ? <CheckCircle2 size={18} className="text-green-500" /> : <div className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"><span className="text-xs font-bold text-blue-500">COPY</span></div>}
                                            </div>
                                            <p className="text-xs text-gray-500 mt-2">Owner: Muzaffarov M.</p>
                                        </div>

                                        <p className="text-sm text-center text-gray-600 dark:text-gray-400 mb-3">
                                            Pay via your favorite app:
                                        </p>

                                        <div className="flex flex-col sm:flex-row justify-center gap-3 mb-4">
                                            {/* Click */}
                                            <a 
                                                href="https://my.click.uz" 
                                                target="_blank" 
                                                rel="noreferrer"
                                                className="flex flex-1 items-center justify-center bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md rounded-xl py-3 px-4 transition-all group"
                                            >
                                                <div className="h-8 w-auto flex items-center gap-2">
                                                    <svg className="h-full w-auto" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <g clipPath="url(#clip0_843_14736)">
                                                            <path fillRule="evenodd" clipRule="evenodd" d="M912 512C912 665.333 665.333 912 512 912C358.667 912 112 665.333 112 512C112 358.667 358.667 112 512 112C665.333 112 912 358.667 912 512ZM672 512C672 572 572 672 512 672C452 672 352 572 352 512C352 452 452 352 512 352C572 352 672 452 672 512Z" fill="#0077FF"/>
                                                        </g>
                                                        <defs>
                                                            <clipPath id="clip0_843_14736">
                                                                <rect width="800" height="800" fill="white" transform="translate(112 112)"/>
                                                            </clipPath>
                                                        </defs>
                                                    </svg>
                                                    <span className="font-bold text-[#0077FF] text-lg">Click</span>
                                                </div>
                                            </a>

                                            {/* Payme */}
                                            <a 
                                                href="https://payme.uz" 
                                                target="_blank" 
                                                rel="noreferrer"
                                                className="flex flex-1 items-center justify-center bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md rounded-xl py-3 px-4 transition-all group"
                                            >
                                                <svg className="h-8 w-auto dark:invert dark:brightness-0 dark:sepia-0 dark:invert-100" viewBox="0 0 138 40" xmlns="http://www.w3.org/2000/svg">
                                                    <defs><style>{`.cls-1{fill:#333;}.cls-2{fill:#3cc;}.cls-3{fill:#fff;}`}</style></defs>
                                                    <g id="Layer_2" data-name="Layer 2">
                                                        <g id="Layer_1-2" data-name="Layer 1-2">
                                                            <path className="cls-1" d="M22.73,3.95a7.1,7.1,0,0,0-1.85-2A9.18,9.18,0,0,0,18.45.77,13.68,13.68,0,0,0,15.56.16,34,34,0,0,0,12.1,0h-10A1.74,1.74,0,0,0,.2,1.62s0,.06,0,.09V17.95a15.37,15.37,0,0,0,6.57,7V21.69a1.92,1.92,0,0,1,1.75-2.08h3q6.14,0,9.37-2.57t3.28-7.62a12,12,0,0,0-.34-2.88A9,9,0,0,0,22.73,3.95Zm-5.86,8.35a3.52,3.52,0,0,1-1.49,1.39,6,6,0,0,1-2.15.57,19.58,19.58,0,0,1-2.47.15H7.88c-.69,0-1.12-.56-1.12-1.38V6.33A1,1,0,0,1,7.88,5.27h2.88q1.4,0,2.64.08a5.76,5.76,0,0,1,2.13.52A3.21,3.21,0,0,1,17,7.19a5.09,5.09,0,0,1,.51,2.52A5.08,5.08,0,0,1,16.87,12.29ZM6.78,25.93A18.19,18.19,0,0,1,.2,21.79v7.85a1.12,1.12,0,0,0,1,1.27H5.72c1.2,0,1.06-1.28,1.06-1.28ZM68.9,8.55H65a1.58,1.58,0,0,0-1.64,1.21L58.83,22.24s-4-11.37-4.3-12.25a1.82,1.82,0,0,0-1.76-1.45H49.18c-1.28,0-1.28,1-1.11,1.39s5.08,13.85,7,19a7.52,7.52,0,0,1,.63,2,5.28,5.28,0,0,1-.76,1.92,4.93,4.93,0,0,1-.5.7c3.7-1.1,8-5.11,10.16-9.44,2.18-6,5.05-14,5.18-14.41C69.92,9.07,69.92,8.55,68.9,8.55ZM51.52,34.77a9.47,9.47,0,0,1-1-.08c-.41-.06-1.19,0-1.19.7v3c0,1.15.56,1.23.85,1.31A12.92,12.92,0,0,0,53,40a7.29,7.29,0,0,0,3.25-.67,7.76,7.76,0,0,0,2.43-1.92,13.29,13.29,0,0,0,1.92-2.88q.83-1.66,1.58-3.67l.58-1.59C61.6,30.42,56.48,35.25,51.52,34.77ZM45.62,12.14a5.26,5.26,0,0,0-.86-1.39,6.06,6.06,0,0,0-1.22-1A8.92,8.92,0,0,0,42,8.91a11.53,11.53,0,0,0-1.69-.51,13.72,13.72,0,0,0-2-.29Q37.23,8,35.89,8q-8.94,0-10.18,5.64a1,1,0,0,0,.88,1.24h3.67c1,0,1-.31,1.38-1.17a2.57,2.57,0,0,1,.86-1.18,5.15,5.15,0,0,1,3.16-.81,4.5,4.5,0,0,1,2.95.73,3.44,3.44,0,0,1,1.09,2.38c0,1.24-.38,2.06-1.92,2.06-3.65-.13-7.57.28-9.78,1.55a7.23,7.23,0,0,0-3.46,6.38,6.52,6.52,0,0,0,.59,2.88,5.71,5.71,0,0,0,1.65,2A7,7,0,0,0,29.26,31a11.53,11.53,0,0,0,3.14.4,13.59,13.59,0,0,0,4.21-.6A15.7,15.7,0,0,0,40,28.89v.7c0,.69.21,1.31,1,1.31h4.25c.86,0,1.06-.61,1.06-1.37V16.44A16.14,16.14,0,0,0,46.14,14,7.68,7.68,0,0,0,45.62,12.14ZM39.81,25s-1.1,2.3-5,2.3a4.41,4.41,0,0,1-2.64-.73,2.61,2.61,0,0,1-1-2.28,2.88,2.88,0,0,1,1.65-2.82,12.59,12.59,0,0,1,4.95-.83,1.81,1.81,0,0,1,2.08,1.8Z"/>
                                                            <path className="cls-2" d="M137,16.58a5,5,0,0,1,0,5.28c-1,1.52-6.45,7.34-8.25,9.21-1.56,1.62-3.67,3.26-5.76,3.26H79.7c-5.86,0-6.21-2-6.21-6.46V9.68c0-4.57,1.35-5.9,5.36-5.9h44.24c2.07,0,3.92,1.06,6,3.2C130.91,8.81,136.28,15.5,137,16.58Z"/>
                                                            <path className="cls-3" d="M83.32,10.81V10.7c0-.59,0-1.16-1-1.16H78.69c-.85,0-.89.46-.89,1.18v4.8A15.17,15.17,0,0,1,83.32,10.81Z"/>
                                                            <path className="cls-3" d="M107.63,28.17v-.26h0V16.33q0-7.27-6.42-7.27a6.4,6.4,0,0,0-3.36,1,12.18,12.18,0,0,0-2.93,2.56,5.1,5.1,0,0,0-2.08-2.63,6.89,6.89,0,0,0-3.61-.85,8.39,8.39,0,0,0-5.11,1.76c-.32.32-6.33,5-6.33,9.88v7.41c0,.23-.12,1.13.89,1.13h3.77c1.17,0,1.06-.77,1.06-1.09v-12c.63-.85,1.92-2.88,4.05-2.88a1.92,1.92,0,0,1,1.76.83,5.25,5.25,0,0,1,.54,2.76v9.35h0v1.92c0,.23-.12,1.13.89,1.13h3.73c1.17,0,1.06-.77,1.06-1.09v-.26h0V16.19c.68-.85,2-2.88,4.05-2.88a2,2,0,0,1,1.79.83,5.18,5.18,0,0,1,.55,2.76v9.35h0v1.92c0,.23-.12,1.13.89,1.13h3.77C107.77,29.24,107.63,28.48,107.63,28.17Z"/>
                                                            <path className="cls-3" d="M128.42,23.46a8.63,8.63,0,0,1-8.54,5.61c-5.76,0-9.6-3.92-9.6-9.8s4-10,9.4-10,9,3.74,9.23,9.77c0,.77-.19,1.45-1.16,1.45H115.53c.08,3.23,1.63,5,4.39,5a3.84,3.84,0,0,0,3.54-2.14,1.36,1.36,0,0,1,1.15-.59h3.15a.63.63,0,0,1,.65.74ZM119.7,13c-2.29,0-3.84,1.59-4.18,4.21h8.2C123.51,14.92,122.27,13,119.7,13Z"/>
                                                        </g>
                                                    </g>
                                                </svg>
                                            </a>

                                            {/* Uzum */}
                                            <a 
                                                href="https://uzum.uz" 
                                                target="_blank" 
                                                rel="noreferrer"
                                                className="flex flex-1 items-center justify-center bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md rounded-xl py-3 px-4 transition-all group"
                                            >
                                                <svg className="h-8 w-auto" viewBox="0 0 472 175" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <g clipPath="url(#clip0_148_495)">
                                                        <rect y="0.5" width="174" height="174" rx="87" fill="#A6FC6F"/>
                                                        <path d="M166.959 5.68649C174.791 13.5181 178.706 17.434 180.174 21.9494C181.464 25.9213 181.464 30.1998 180.174 34.1717C178.706 38.6871 174.791 42.6029 166.959 50.4346L103.049 114.345C95.2172 122.176 91.3013 126.092 86.7859 127.559C82.814 128.85 78.5355 128.85 74.5636 127.559C70.0482 126.092 66.1324 122.176 58.3007 114.345L34.2147 90.2587C26.383 82.427 22.4672 78.5112 21.0001 73.9958C19.7095 70.0239 19.7095 65.7454 21.0001 61.7735C22.4672 57.2581 26.383 53.3422 34.2147 45.5106L98.1248 -18.3995C105.956 -26.2312 109.872 -30.147 114.388 -31.6142C118.36 -32.9047 122.638 -32.9047 126.61 -31.6142C131.125 -30.147 135.041 -26.2312 142.873 -18.3995L166.959 5.68649Z" fill="#7000FF"/>
                                                        <path d="M141.093 87.226C148.925 95.0577 152.841 98.9735 154.308 103.489C155.598 107.461 155.598 111.739 154.308 115.711C152.841 120.227 148.925 124.142 141.093 131.974L77.1831 195.884C69.3515 203.716 65.4356 207.632 60.9202 209.099C56.9483 210.389 52.6698 210.389 48.6979 209.099C44.1825 207.632 40.2667 203.716 32.435 195.884L8.34898 171.798C0.517325 163.967 -3.3985 160.051 -4.86565 155.535C-6.1562 151.563 -6.1562 147.285 -4.86565 143.313C-3.3985 138.798 0.517327 134.882 8.34898 127.05L72.2591 63.14C80.0907 55.3084 84.0066 51.3925 88.522 49.9254C92.4939 48.6348 96.7724 48.6348 100.744 49.9254C105.26 51.3925 109.176 55.3084 117.007 63.14L141.093 87.226Z" fill="#7000FF"/>
                                                    </g>
                                                    <rect x="4.23299" y="4.73299" width="165.534" height="165.534" rx="82.767" stroke="#A6FC6F" strokeWidth="8.46599"/>
                                                    <path d="M111.65 60.731C114.271 61.308 116.807 61.801 119.296 62.4382C121.941 63.1114 124.562 63.929 127.183 64.6623C127.555 64.7705 127.7 64.9148 127.7 65.3356C127.688 73.5229 127.772 81.7223 127.664 89.9097C127.543 98.7102 124.766 106.669 119.416 113.666C113.453 121.469 105.651 126.494 96.105 128.779C92.342 129.68 88.5069 129.981 84.6477 129.752C75.4747 129.211 67.3477 125.977 60.3988 119.978C53.2335 113.811 48.7131 106.044 46.8977 96.7385C46.3808 94.0935 46.1764 91.4125 46.1764 88.7195C46.1644 80.9649 46.1764 73.2224 46.1523 65.4678C46.1523 64.9509 46.3207 64.7705 46.7895 64.6263C51.7908 63.0273 56.8883 61.7649 62.0458 60.8271C62.0939 60.8151 62.142 60.8271 62.2622 60.8151C62.2622 61.0195 62.2622 61.2239 62.2622 61.4162C62.2622 71.1425 62.2262 80.8807 62.2863 90.607C62.3223 95.5122 62.9836 100.357 64.6547 105.01C65.9771 108.701 67.9367 111.995 70.8582 114.664C73.5993 117.153 76.8092 118.728 80.4039 119.497C85.4893 120.591 90.5627 120.507 95.552 118.932C101.443 117.081 105.53 113.161 108.151 107.643C109.558 104.697 110.4 101.572 110.928 98.3615C111.518 94.7908 111.662 91.1841 111.662 87.5773C111.662 78.897 111.662 70.2047 111.662 61.5244C111.65 61.296 111.65 61.0796 111.65 60.731Z" fill="white"/>
                                                    <path d="M94.0847 78.7657C89.2878 78.7657 84.539 78.7657 79.7661 78.7657C79.7661 67.5848 79.7661 56.4158 79.7661 45.2589C81.2569 44.79 91.2474 44.7539 94.0847 45.2228C94.0847 56.4038 94.0847 67.5848 94.0847 78.7657Z" fill="white"/>
                                                    <path d="M368.811 54.7536C368.811 62.3915 364.585 65.9128 358.296 65.9128C352.006 65.9128 347.926 62.4411 347.926 54.7536V29.5586H334.352V55.2496C334.352 71.9884 348.072 78.5599 358.368 78.5599C368.665 78.5599 382.41 71.9884 382.41 55.2496V29.5586H368.835L368.811 54.7536Z" fill="#7000FF"/>
                                                    <path d="M322.913 41.2634V29.5586H278.838V41.2634H304.919L277.77 65.9624V77.6672H324.54V65.9624H295.813L322.913 41.2634Z" fill="#7000FF"/>
                                                    <path d="M450.331 28.6426C441.735 28.6426 435.251 32.2135 432.046 37.6443C428.767 32.2135 421.676 28.6426 414.294 28.6426C399.796 28.6426 392.244 38.0659 392.244 49.7211V77.6687H405.819V51.705C405.819 46.1253 408.684 41.2401 415.265 41.2401C416.601 41.1657 417.961 41.3641 419.199 41.86C420.462 42.356 421.603 43.1 422.551 44.0671C423.498 45.0342 424.226 46.1997 424.712 47.4893C425.173 48.7788 425.392 50.1427 425.295 51.5066V77.6935H438.869V51.4818C438.869 45.9022 442.099 41.1905 448.607 41.1905C455.115 41.1905 458.248 46.1006 458.248 51.6554V77.6191H471.823V49.7459C471.823 38.0907 464.829 28.6674 450.234 28.6674L450.331 28.6426Z" fill="#7000FF"/>
                                                    <path d="M255.282 54.7536C255.282 62.3915 251.056 65.9128 244.815 65.9128C238.574 65.9128 234.398 62.4411 234.398 54.7536V29.5586H220.823V55.2496C220.823 71.9884 234.495 78.5599 244.84 78.5599C255.209 78.5599 268.832 71.9884 268.832 55.2496V29.5586H255.257L255.282 54.7536Z" fill="#7000FF"/>
                                                    <path d="M336.585 137.904V106.732H323.156L323.229 114.32C320.315 109.857 315.167 105.74 306.06 105.74C290.373 105.74 282.335 118.214 282.335 130.687C282.044 143.334 291.15 155.882 305.405 155.882C312.981 155.882 319.829 152.411 323.156 146.459C323.933 148.964 325.488 151.146 327.625 152.659C329.737 154.171 332.287 154.915 334.861 154.766H342.632V143.111H340.471C337.8 143.111 336.585 142.094 336.585 137.928V137.904ZM308.902 143.88C301.228 143.88 295.424 138.449 295.424 130.811C295.424 123.173 301.252 117.941 308.902 117.941C316.867 117.941 322.622 123.223 322.622 130.811C322.622 138.375 316.867 143.88 308.902 143.88Z" fill="#7000FF"/>
                                                    <path d="M248.652 155.932C232.406 155.932 220.823 148.096 220.823 129.002V91.8042H234.398V111.742C238.283 107.824 243.455 105.914 250.886 105.914C267.084 105.914 276.117 117.222 276.117 130.886C276.117 147.179 263.684 155.932 248.749 155.932H248.652ZM248.506 117.842C240.784 117.842 234.932 123.273 234.932 130.911C234.932 138.549 240.736 143.781 248.506 143.781C256.253 143.781 262.227 138.45 262.227 130.911C262.227 123.372 256.472 117.842 248.506 117.842Z" fill="#7000FF"/>
                                                    <path d="M413.227 154.867H426.777V131.284L447.88 154.867H463.908L442.028 130.168L462.208 106.758H446.277L426.753 129.275V91.8794H413.203V154.867H413.227Z" fill="#7000FF"/>
                                                    <path d="M352.395 106.758H365.97V115.388H366.723C367.524 113.776 368.69 112.337 370.196 111.073C371.458 110.031 373.158 108.99 375.319 108.072C377.481 107.155 380.249 106.659 383.673 106.659C386.442 106.659 389.016 107.055 391.444 107.849C393.872 108.643 395.961 109.882 397.758 111.569C399.555 113.255 400.939 115.412 401.959 117.991C402.955 120.571 403.465 123.645 403.465 127.241V154.792H389.89V131.159C389.89 127.043 388.797 123.993 386.612 121.984C384.426 119.975 381.512 118.983 377.942 118.983C373.984 118.983 370.997 120.124 368.981 122.406C366.99 124.687 365.946 127.613 365.946 131.159V154.792H352.371V106.758H352.395Z" fill="#7000FF"/>
                                                    <defs>
                                                        <clipPath id="clip0_148_495">
                                                            <rect y="0.5" width="174" height="174" rx="87" fill="white"/>
                                                        </clipPath>
                                                    </defs>
                                                </svg>
                                            </a>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-3">
                                        <button
                                            onClick={() => window.open('https://t.me/TheDarkLord_555', '_blank')}
                                            className="w-full py-3 px-4 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 transition-all animate-pulse"
                                        >
                                            <MessageSquare size={20} />
                                            <span>Send Receipt & Get Key</span>
                                        </button>
                                        <p className="text-xs text-center text-gray-500 px-4">
                                            After payment, send the screenshot to admin via Telegram to receive your access key immediately.
                                        </p>
                                    </div>
                                    
                                    <p className="text-center text-sm text-gray-500 mt-6">
                                        Subscription cost: <span className="font-bold text-gray-900 dark:text-white">30,000 UZS</span> / week
                                    </p>
                                </div>
                            ) : (
                                <div className="p-6 text-center">
                                    <div className="w-16 h-16 bg-gradient-to-tr from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/30">
                                        <Lock size={32} className="text-white" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Premium Content</h2>
                                    <p className="text-gray-500 mb-6">
                                        This test is locked. Please enter your access key to continue.
                                    </p>

                                    <form onSubmit={handleUnlockSubmit} className="space-y-4">
                                        <div>
                                            <div className="relative flex items-center">
                                                <div className="absolute left-3 pointer-events-none z-10">
                                                    <Key className="text-gray-400" size={20} />
                                                </div>
                                                <input
                                                    type="text"
                                                    value={keyInput}
                                                    onChange={(e) => setKeyInput(e.target.value)}
                                                    placeholder="Enter access key..."
                                                    className="w-full pl-10 pr-20 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-lg dark:text-white"
                                                    autoComplete="off"
                                                    autoFocus
                                                />
                                                <button
                                                    type="button"
                                                    onClick={async () => {
                                                        try {
                                                            const text = await navigator.clipboard.readText();
                                                            if (text) setKeyInput(text);
                                                        } catch (err) {
                                                            console.error('Failed to read clipboard', err);
                                                        }
                                                    }}
                                                    className="absolute right-2 top-2 bottom-2 px-3 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold rounded-md transition-colors z-10 flex items-center"
                                                >
                                                    PASTE
                                                </button>
                                            </div>
                                            {keyError && <p className="text-red-500 text-sm mt-2 font-medium animate-pulse">{keyError}</p>}
                                        </div>

                                        <div className="pt-2">
                                            <button
                                                type="button"
                                                onClick={() => setShowPaymentOptions(true)}
                                                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold shadow-lg shadow-blue-500/20 transform hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3 group border border-blue-400/20"
                                            >
                                                <div className="p-2 bg-white/10 rounded-lg group-hover:bg-white/20 transition-colors">
                                                    <CreditCard size={20} className="text-white" />
                                                </div>
                                                <div className="flex flex-col items-start">
                                                    <span className="text-xs font-medium text-blue-100">Get Subscription for 1 week</span>
                                                    <span className="text-sm">30,000 UZS</span>
                                                </div>
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 pt-2">
                                            <button
                                                type="button"
                                                onClick={() => { setShowKeyModal(false); setKeyInput(''); setKeyError(''); setTargetTestForUnlock(null); setShowPaymentOptions(false); }}
                                                className="px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold shadow-lg shadow-orange-500/20 transform hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                                            >
                                                Unlock
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}
                        </div>
                    </div>
                )
            }
            {/* JSON Error Modal */}
            {
                jsonError && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border-2 border-red-100">
                            <div className="p-6 bg-red-50 border-b border-red-100 flex items-center gap-4">
                                <div className="p-3 bg-red-100 rounded-full text-red-600">
                                    <AlertTriangle size={32} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-red-900">Format Error</h3>
                                    <p className="text-red-600/90 text-sm">The uploaded JSON file is invalid</p>
                                </div>
                            </div>
                            <div className="p-6">
                                <div className="p-4 bg-red-50 rounded-xl border border-red-100 mb-6">
                                    <p className="text-red-700 font-medium mb-2">Error Details:</p>
                                    <p className="text-red-900 font-mono text-sm break-words">{jsonError}</p>
                                </div>

                                <div className="space-y-3">
                                    <p className="text-gray-900 dark:text-gray-100 font-semibold mb-2">Expected JSON Structure:</p>
                                    <div className="bg-slate-900 rounded-xl p-4 overflow-x-auto">
                                        <pre className="text-xs text-blue-300 font-mono">
                                            {`{
  "test_questions": [
    {
      "question": "What is 2+2?",
      "options": {
        "a": "3",
        "b": "4",
        "c": "5"
      },
      "correct_answer": "b"
    }
  ]
}`}
                                        </pre>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800/50 flex justify-end">
                                <button
                                    onClick={() => setJsonError(null)}
                                    className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 px-6 rounded-xl transition-all shadow-sm active:scale-95"
                                >
                                    Understood
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            <ToastContainer toasts={toasts} removeToast={removeToast} />

        </main >
    );
}

function TestCard({ test, onStart, badge, badgeColor = "bg-blue-100 text-blue-700", hasProgress, isUpdated, activeUsers = [], isLocked, isUnlocked }) {
    const [selectedLang, setSelectedLang] = useState(() => {
        if (!test.translations) return null;
        return Object.keys(test.translations).includes('en') ? 'en' : Object.keys(test.translations)[0];
    });

    let activeContent = selectedLang && test.translations ? test.translations[selectedLang] : test.content;

    // Normalize content for display
    if (Array.isArray(activeContent)) {
        if (activeContent[0]?.test_questions) activeContent = activeContent[0];
        else if (activeContent[0]?.question) activeContent = { test_questions: activeContent };
    }

    const questionCount = activeContent?.test_questions?.length || 0;

    const languages = test.translations ? Object.keys(test.translations) : [];

    // Filter active users for this test
    const currentTestUsers = activeUsers.filter(u => u.testId === test.id && u.status === 'in-test');

    // Get the base ID (without language suffix) for premium checking
    const baseTestId = test.id;

    const handleStart = () => {
        if (selectedLang && test.translations) {
            onStart({
                ...test,
                id: `${test.id}_${selectedLang}`, // Unique ID for progress saving
                baseId: baseTestId, // Keep base ID for premium checking
                content: activeContent,
                language: selectedLang
            });
        } else {
            onStart(test);
        }
    };

    return (
        <div className="bg-white/70 dark:bg-gray-900/40 backdrop-blur-xl p-6 rounded-xl shadow-sm hover:shadow-md transition-all border border-white/20 dark:border-white/10 flex flex-col justify-between group relative overflow-hidden">
            <div className="flex absolute top-0 right-0">
                {isUpdated && (
                    <div
                        className={clsx(
                            "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200 text-xs px-2 py-1 font-bold flex items-center gap-1 shadow-sm border border-emerald-200/60 dark:border-emerald-700/40 z-10",
                            (!hasProgress && !isLocked && !isUnlocked) ? "rounded-bl-lg" : ""
                        )}
                    >
                        <RefreshCcw size={12} strokeWidth={3} /> UPDATED
                    </div>
                )}
                {hasProgress && !isLocked && (
                    <div className={clsx("bg-orange-100 text-orange-700 text-xs px-2 py-1 font-medium flex items-center gap-1", isUpdated ? "" : "rounded-bl-lg")}>
                        <Save size={12} /> Resumable
                    </div>
                )}
                {isLocked && (
                    <div className={clsx("bg-amber-100/80 dark:bg-amber-900/25 text-[#b8860b] dark:text-[#ffd700] text-xs px-2 py-1 font-bold flex items-center gap-1 border border-amber-200/60 dark:border-amber-700/40", isUpdated ? "" : "rounded-bl-lg")}>
                        <Lock size={12} /> PREMIUM
                    </div>
                )}
                {isUnlocked && (
                    <div className={clsx("bg-green-100 text-green-700 text-xs px-2 py-1 font-bold flex items-center gap-1", isUpdated ? "" : "rounded-bl-lg")}>
                        <div className="relative">
                           <LockOpen size={12} className="text-green-700"/>
                        </div> 
                        UNLOCKED
                    </div>
                )}
            </div>
            <div>
                <div className="flex justify-between items-start mb-3 mt-1">
                    <span className={clsx("px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide", badgeColor)}>
                        {badge}
                    </span>
                    <div className="flex gap-2">
                        {languages.length > 1 && (
                            <div
                                className="relative bg-gray-100 dark:bg-gray-700 p-1 rounded-full flex cursor-pointer select-none h-8 w-24 shadow-inner"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    // Toggle between first 2 languages for simplicity if clickable
                                    const currentIndex = languages.indexOf(selectedLang);
                                    const nextIndex = (currentIndex + 1) % languages.length;
                                    setSelectedLang(languages[nextIndex]);
                                }}
                            >
                                {/* Calculated Active Background */}
                                <div
                                    className="absolute top-1 bottom-1 bg-white dark:bg-gray-800 rounded-full shadow-sm transition-all duration-300 ease-out z-0"
                                    style={{
                                        width: `calc(${100 / languages.length}% - 8px)`,
                                        left: `calc(${(languages.indexOf(selectedLang) * (100 / languages.length))}% + 4px)`
                                    }}
                                />
                                {languages.map(lang => (
                                    <div
                                        key={lang}
                                        onClick={(e) => { e.stopPropagation(); setSelectedLang(lang); }}
                                        className={clsx(
                                            "flex-1 z-10 flex items-center justify-center text-[10px] font-extrabold uppercase transition-colors rounded-full",
                                            selectedLang === lang ? "text-blue-600 dark:text-blue-400 scale-110" : "text-gray-400 dark:text-gray-300 hover:text-gray-600 dark:hover:text-gray-100"
                                        )}
                                    >
                                        {lang}
                                    </div>
                                ))}
                            </div>
                        )}
                        {/* JSON label removed (cleaner card UI) */}
                    </div>
                </div>
                <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200 mb-1 group-hover:text-blue-600 transition-colors">
                    {test.name}
                </h3>
                <div className="flex justify-between items-center">
                    <p className="text-gray-500 text-sm">
                        {questionCount} Questions
                    </p>

                    {/* Active Users Avatars */}
                    {currentTestUsers.length > 0 && (
                        <div className="flex -space-x-2 h-8 items-center" title={`${currentTestUsers.length} people solving this`}>
                            {currentTestUsers.slice(0, 3).map((user, i) => (
                                <div
                                    key={i}
                                    className="inline-flex h-8 w-8 rounded-full ring-2 ring-white dark:ring-gray-800 bg-indigo-100 items-center justify-center text-xs font-bold text-indigo-700 cursor-help relative group/avatar z-10 hover:z-50"
                                >
                                    {user.name.charAt(0).toUpperCase()}
                                    <div className="absolute top-1/2 right-full mr-2 -translate-y-1/2 hidden group-hover/avatar:block bg-gray-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-50 shadow-lg">
                                        {user.name}
                                        {/* Little Triangle Pointer */}
                                        <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                                    </div>
                                </div>
                            ))}
                            {currentTestUsers.length > 3 && (
                                <div className="inline-flex h-8 w-8 rounded-full ring-2 ring-white dark:ring-gray-800 bg-gray-100 items-center justify-center text-xs font-bold text-gray-500 z-0">
                                    +{currentTestUsers.length - 3}
                                </div>
                            )}
                            <span className="ml-2 w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Solving now"></span>
                        </div>
                    )}
                </div>
            </div>
            <button
                onClick={handleStart}
                className={clsx(
                    "mt-4 w-full py-2.5 rounded-lg border font-medium transition-all flex items-center justify-center gap-2",
                    isLocked
                        ? "bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-100 hover:border-amber-300 shadow-sm"
                        : (isUnlocked 
                            ? "bg-green-600 border-green-600 text-white hover:bg-green-700 shadow-md transform hover:-translate-y-0.5"
                            : (hasProgress
                                ? "bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-400"
                                : "border-gray-200 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700 hover:text-blue-600 hover:border-blue-200 dark:hover:text-blue-400 dark:hover:border-blue-700"
                            )
                        )
                )}
            >
                {isLocked ? <Lock size={18} /> : <Play size={18} className={isUnlocked ? "fill-white" : ""} />}
                {isLocked ? "Unlock Access" : (hasProgress ? "Resume Attempt" : (isUnlocked ? "Start Premium Attempt" : "Start Attempt"))}
            </button>
        </div>
    );
}

function TranslatableText({ text, translation, type = 'text' }) {
    if (!translation) return <span>{text}</span>;

    return (
        <div className="group relative inline-block cursor-help border-b border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50/50 transition-colors rounded px-1 -mx-1">
            {text}
            <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200 bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[300px] z-50 pointer-events-none">
                <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-xl relative text-center leading-relaxed">
                    <span className="text-[10px] uppercase text-gray-400 font-bold block mb-0.5 border-b border-gray-700 pb-1">Translation</span>
                    {translation}
                    <div className="w-2 h-2 bg-gray-900 absolute top-full left-1/2 -translate-x-1/2 -translate-y-1 rotate-45"></div>
                </div>
            </div>
        </div>
    );
}

// Colors for godmode matching hints - each pair gets a unique color
const MATCH_COLORS = [
    { border: 'border-red-500', bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-600 dark:text-red-400' },
    { border: 'border-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400' },
    { border: 'border-green-500', bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-600 dark:text-green-400' },
    { border: 'border-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-600 dark:text-yellow-400' },
    { border: 'border-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-600 dark:text-purple-400' },
    { border: 'border-pink-500', bg: 'bg-pink-50 dark:bg-pink-900/20', text: 'text-pink-600 dark:text-pink-400' },
    { border: 'border-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-600 dark:text-orange-400' },
    { border: 'border-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-900/20', text: 'text-cyan-600 dark:text-cyan-400' },
    { border: 'border-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-600 dark:text-indigo-400' },
    { border: 'border-teal-500', bg: 'bg-teal-50 dark:bg-teal-900/20', text: 'text-teal-600 dark:text-teal-400' },
];

function MatchingQuestionComponent({ question, answers, currentIndex, handleAnswer, revealedHints, activatedCheats, translatedQuestion }) {
    // Parse Pairs from "A -> B" strings
    // Need state to track user's matches: { [leftText]: rightText }
    // Problem: Page re-renders when `answers` changes, but we shouldn't submit answer until ALL pairs are matched.
    // So we need local state here, and only call `handleAnswer` when done?
    // BUT `handleAnswer` expects a single ID (e.g. "A"). For multiple choice we select one.
    // The JSON says `correct_answer: "A, B, C, D"`. This implies we need to submit ALL of them?
    // Or just submit "A_B_C_D"?
    // The current engine checks `answers[currentIndex] === question.correct_answer`.
    // So if correct_answer is "A, B, C, D", we need to construct exactly that string?
    // Wait, the user's logic might be "Select all that apply" OR "Matching".
    // For Matching, the "game" is to match Lefts to Rights.
    // If we assume a "Matching" type, the concept of "Option ID" is reusable if we map pairs back to IDs.

    const isGodMode = activatedCheats?.includes('godmode');

     // Parse correct answer IDs
    const correctIds = useMemo(() => {
        return (question.correct_answer || "").split(',').map(s => s.trim());
    }, [question]);

    // Let's parse all potential options first.
    const allPairs = useMemo(() => {
        return question.shuffledOptions.map(opt => {
            const parts = opt.text.split('→').map(s => s.trim());
            return {
                id: opt.id,
                left: parts[0],
                right: parts[1], // This is the Correct Right for this Left
            };
        });
    }, [question]);

    // Filter to get only the slots we need to fill (Left Side)
    const activePairs = useMemo(() => {
        // Only create slots for options that exist in the correct answer key
        return allPairs.filter(p => correctIds.includes(p.id));
    }, [allPairs, correctIds]);

    // Initialize local state for the Drag/Drop interaction
    // Left items are now based on activePairs only.
    
    // Provide Right items pool shuffled - BUT include ALL options (distractors too)
    const [rightPool, setRightPool] = useState(() => {
        const rights = allPairs.map(p => p.right);
        // Shuffle
        return rights.sort(() => Math.random() - 0.5);
    });

    const [matches, setMatches] = useState({}); // { leftText: rightText }
    const [draggedText, setDraggedText] = useState(null);

    // Track how many hints have been applied to auto-place correct matches
    const [hintsApplied, setHintsApplied] = useState(0);

    // When revealedHints changes, auto-place one correct match for each new hint
    useEffect(() => {
        const currentHints = revealedHints[currentIndex] || [];
        const newHintCount = currentHints.length;

        // If new hints were added, auto-place correct matches
        if (newHintCount > hintsApplied) {
            const hintsToApply = newHintCount - hintsApplied;

            setMatches(prevMatches => {
                const newMatches = { ...prevMatches };
                let applied = 0;

                // Find unmatched pairs and auto-place correct matches
                // We only care about activePairs slots
                for (const pair of activePairs) {
                    // Skip if already matched correctly
                    if (newMatches[pair.left] === pair.right) continue;

                    // Auto-place the correct match
                    // First, remove this right value if used elsewhere
                    Object.keys(newMatches).forEach(key => {
                        if (newMatches[key] === pair.right) delete newMatches[key];
                    });

                    newMatches[pair.left] = pair.right;
                    applied++;

                    if (applied >= hintsToApply) break;
                }

                return newMatches;
            });

            setHintsApplied(newHintCount);
        }
    }, [revealedHints, currentIndex, activePairs, hintsApplied]);

    const handleMatch = (left, right) => {
        setMatches(prev => {
            const newMatches = { ...prev };
            // If right was already used elsewhere, remove it from there
            Object.keys(newMatches).forEach(key => {
                if (newMatches[key] === right) delete newMatches[key];
            });

            if (newMatches[left] === right) {
                delete newMatches[left]; // Toggle off if clicked again? Or just set.
            } else {
                newMatches[left] = right;
            }
            return newMatches;
        });
    };

    useEffect(() => {
        const userMatchedIDs = [];
        let allMatched = true;

        // Check every Left Item (Active Slots Only)
        activePairs.forEach(p => {
            const userRight = matches[p.left];
            if (!userRight) {
                allMatched = false;
                return;
            }

            // Did user match correctly?
            if (userRight === p.right) {
                userMatchedIDs.push(p.id);
            }
        });

        // If user has filled ALL slots
        if (Object.keys(matches).length === activePairs.length) {
            // Construct answer string based on matches found.
            // Since we only exposed activePairs slots, logical max is getting all activePairs correct.
            const derivedAnswer = userMatchedIDs.sort().join(', ');
            handleAnswer(derivedAnswer === "" ? "NO_MATCH" : derivedAnswer);
        }
    }, [matches, activePairs]);

    return (
        <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2 mb-2">
                <Settings size={16} />
                <span>Match the items on the left with the correct category on the right.</span>
            </div>

            <div className="space-y-3 select-none">
                {activePairs.map((p, i) => {
                    // Is this pair correct in God Mode? Yes, activePairs are by definition correct slots.
                    // But we might want color consistency from original index?
                    // Let's just use index in activePairs for color.
                    const godModeColor = isGodMode ? MATCH_COLORS[i % MATCH_COLORS.length] : null;
                    const filled = matches[p.left];

                    return (
                        <div key={p.id} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                            {/* Left Side */}
                            <div 
                                className={clsx(
                                    "flex items-center justify-between p-3 bg-white dark:bg-gray-800 border-2 rounded-xl transition-all h-full",
                                    godModeColor 
                                        ? `${godModeColor.border} ${godModeColor.bg}` 
                                        : "border-gray-100 dark:border-gray-700"
                                )}
                            >
                                <span className={clsx(
                                    "font-bold",
                                    godModeColor ? godModeColor.text : "text-gray-800 dark:text-gray-200"
                                )}>{p.left}</span>
                                <div className={clsx("h-4 w-4", godModeColor ? godModeColor.text : "text-gray-400")}>
                                    <ArrowRight size={16} />
                                </div>
                            </div>

                            {/* Right Side */}
                            <div
                                className={clsx(
                                    "p-3 rounded-xl border-2 border-dashed flex items-center justify-between min-h-[52px] transition-all h-full",
                                    godModeColor
                                        ? `${godModeColor.border} ${godModeColor.bg}`
                                        : filled
                                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                                            : (draggedText ? "border-blue-400 bg-blue-50/50 animate-pulse scale-[1.02]" : "border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50")
                                )}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    if (draggedText) {
                                        handleMatch(p.left, draggedText);
                                        setDraggedText(null);
                                    }
                                }}
                            >
                                {filled ? (
                                    <div className="flex items-center justify-between w-full">
                                        <span className={clsx(
                                            "font-semibold",
                                            godModeColor ? godModeColor.text : "text-blue-700 dark:text-blue-300"
                                        )}>{filled}</span>
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setMatches(curr => {
                                                    const next = { ...curr };
                                                    delete next[p.left];
                                                    return next;
                                                });
                                            }}
                                            className="p-1 hover:bg-red-100 rounded-full text-blue-400 hover:text-red-500 transition-colors"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <span className={clsx(
                                        "text-sm italic",
                                        godModeColor ? godModeColor.text : "text-gray-400"
                                    )}>Drop item here...</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Pool of Options */}
            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Available Options (Drag and Drop)</p>
                <div className="flex flex-wrap gap-2">
                    {rightPool.map((text, idx) => {
                        // Check if used
                        const isUsed = Object.values(matches).includes(text);
                        if (isUsed) return null; // Hide used options

                        // In godmode, find which pair this right text belongs to and use that color
                        // We must search in ACTIVE pairs for godMode matching color
                        const pairIndex = isGodMode ? activePairs.findIndex(p => p.right === text) : -1;
                        const godModeColor = pairIndex >= 0 ? MATCH_COLORS[pairIndex % MATCH_COLORS.length] : null;

                        return (
                            <div
                                key={idx}
                                draggable
                                onDragStart={(e) => {
                                    setDraggedText(text);
                                    e.dataTransfer.setData('text/plain', text);
                                    e.dataTransfer.effectAllowed = "move";
                                }}
                                onClick={() => {
                                    // Find first empty slot
                                    const firstEmptyLeft = activePairs.find(p => !matches[p.left]);
                                    if (firstEmptyLeft) {
                                        handleMatch(firstEmptyLeft.left, text);
                                    }
                                }}
                                className={clsx(
                                    "px-3 py-2 rounded-lg shadow-sm hover:shadow-md transition-all font-medium text-sm border-2 cursor-grab active:cursor-grabbing hover:cursor-pointer select-none",
                                    godModeColor
                                        ? `${godModeColor.border} ${godModeColor.bg} ${godModeColor.text}`
                                        : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-400 text-gray-700 dark:text-gray-300"
                                )}
                            >
                                {text}
                            </div>
                        );
                    })}
                    {rightPool.every(t => Object.values(matches).includes(t)) && (
                        <span className="text-sm text-gray-400 italic py-2">All items placed. Review your matches.</span>
                    )}
                </div>
            </div>
        </div>
    );
}

function TestRunner({ test, userName, userId, userCountry, onFinish, onRetake, onProgressUpdate, onBack, onLeaveWithoutResult, userStars, unlockedLeagues, updateUserStars, updateUserUnlocks, spendStars, activatedCheats, soundVolume = 0.8, playClickSound }) {
    const { resolvedTheme } = useTheme();
    const [currentIndex, setCurrentIndex] = useState(test.currentQuestionIndex || 0);
    const [answers, setAnswers] = useState(test.answers || {});
    const [isFinished, setIsFinished] = useState(test.isFinished || false);
    const [animatedScorePercent, setAnimatedScorePercent] = useState(0);
    const [showLegendaryEffect, setShowLegendaryEffect] = useState(false);
    const celebrationAudioRef = useRef(null);
    const [needsSoundTap, setNeedsSoundTap] = useState(false);

    const stopCelebrationSound = () => {
        const audio = celebrationAudioRef.current;
        if (!audio) return;
        try {
            audio.pause();
            audio.currentTime = 0;
        } catch { }
    };

    const playCelebrationSound = async () => {
        const audio = celebrationAudioRef.current;
        if (!audio) return;
        try {
            audio.currentTime = 0;
            await audio.play();
            setNeedsSoundTap(false);
        } catch (e) {
            // Autoplay may be blocked unless user taps/clicks
            setNeedsSoundTap(true);
        }
    };

    // Prepare celebration audio once
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (celebrationAudioRef.current) return;
        try {
            const audio = new Audio('/Celebration_Sound_Effect.mp3');
            audio.preload = 'auto';
            audio.volume = Math.max(0, Math.min(1, soundVolume));
            celebrationAudioRef.current = audio;
        } catch { }

        return () => {
            stopCelebrationSound();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const audio = celebrationAudioRef.current;
        if (!audio) return;
        audio.volume = Math.max(0, Math.min(1, soundVolume));
    }, [soundVolume]);

    // Try to play as soon as the congratulations/finished screen shows
    useEffect(() => {
        if (!isFinished) {
            setNeedsSoundTap(false);
            stopCelebrationSound();
            return;
        }
        const score = test.questions.reduce((acc, q, idx) => acc + (answers[idx] === q.correct_answer ? 1 : 0), 0);
        const totalQuestions = test.questions.length;
        const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;

        if (percentage >= 70) {
            playCelebrationSound();
        } else {
            setNeedsSoundTap(false);
            stopCelebrationSound();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isFinished, test.questions, answers]);

    // Fallback: if autoplay blocked, play on the next user click/tap anywhere
    useEffect(() => {
        if (!needsSoundTap || typeof window === 'undefined') return;
        const handler = () => {
            playCelebrationSound();
        };
        window.addEventListener('click', handler, { once: true });
        return () => window.removeEventListener('click', handler);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [needsSoundTap]);

    useEffect(() => {
        if (isFinished) {
            const score = test.questions.reduce((acc, q, idx) => acc + (answers[idx] === q.correct_answer ? 1 : 0), 0);
            const totalQuestions = test.questions.length;
            const percentage = Math.round((score / totalQuestions) * 100);

            // Small delay to allow render before animating
            const timer = setTimeout(() => {
                setAnimatedScorePercent(percentage);
                if (percentage === 100) {
                    setShowLegendaryEffect(true);
                    confetti({
                        particleCount: 100,
                        spread: 70,
                        origin: { y: 0.6 },
                        zIndex: 9999
                    });

                    setTimeout(() => setShowLegendaryEffect(false), 3000);
                }
            }, 100);
            return () => clearTimeout(timer);
        } else {
            setAnimatedScorePercent(0);
        }
    }, [isFinished, test.questions, answers]);

    // Determine max hints based on unlocks
    const getMaxHints = (mode) => {
        let max = 0;
        const diffConfig = DIFFICULTIES.find(d => d.id === mode);
        if (diffConfig) max = diffConfig.hints; // Default

        // Apply Multipliers
        // Legendary: ~3.33x -> Easy(3->10)
        // Mythic: ~5x -> Easy(3->15)

        let multiplier = 1;
        if (unlockedLeagues && unlockedLeagues.includes('Mythic')) multiplier = 5;
        else if (unlockedLeagues && unlockedLeagues.includes('Legendary')) multiplier = 3.33;

        // Apply to base. 
        // Easy (3): 3 * 3.33 ~ 10. 3 * 5 = 15.
        // Middle (1): 1 * 3.33 ~ 3. 1 * 5 = 5.
        // Hard/Insane/Impossible (0). Multiplier doesn't help if base is 0.
        // But user said: "qolgan mode larda mos ravishda bolsin" which implies they should also get bonuses?
        // Usually Hard/Insane have 0 hints. 10 * 0 = 0.
        // Let's assume user wants *some* hints even in hard modes if they are Legendary?
        // Or strictly proportional. 
        // Let's assume strictly proportional to *Easy* base if base is 0? No, that's cheating.
        // Let's stick to Easy/Middle multipliers first.
        // If mode is 'hard' (0), maybe give 1 for Legendary, 2 for Mythic?

        if (max === 0) {
            // Bonus for 0-hint modes
            if (multiplier >= 5) max = 2;       // Mythic gets 2 in Hard/Insane/Imp?
            else if (multiplier >= 3) max = 1;  // Legendary gets 1
        } else {
            max = Math.round(max * multiplier);
        }

        return max;
    };

    const initialHintsCount = test.hintsLeft !== undefined ? test.hintsLeft : getMaxHints(test.difficultyMode);
    const [hintsLeft, setHintsLeft] = useState(initialHintsCount);
    const [revealedHints, setRevealedHints] = useState(test.revealedHints || {}); // { qIdx: [id1, id2] }

    // Logic for Spinner Bonus Hints
    const [extraHints, setExtraHints] = useState(0);
    useEffect(() => {
        const storedExtra = localStorage.getItem('examApp_extraHints');
        if (storedExtra) setExtraHints(parseInt(storedExtra, 10));
    }, []);

    // Timed Mode State
    const difficultyConfig = DIFFICULTIES.find(d => d.id === test.difficultyMode) || DIFFICULTIES[0];
    const baseTimeLimit = difficultyConfig.timeLimit; // seconds or null

    // Initial Time is Base + Banked (only for current question, but careful about resuming)
    // If resuming, `test.timeLeft` might be saved? `timeLeft` isn't in onProgressUpdate schema explicitly I think?
    // Let's assume new question or reset.
    // If we have saved progress, we probably should have saved `timeLeft`.
    // For now, let's treat "initialTime" as the starting pool for the *current* question.

    // If we are strictly following "Impossible" mode per-question timer:
    // When index changes, we reset `timeLeft`.

    // Restore BankedTime State
    const [bankedTime, setBankedTime] = useState(test.bankedTime || 0);

    const getQuestionsTimeLimit = () => {
        if (test.difficultyMode === 'impossible' && baseTimeLimit) {
            return baseTimeLimit + bankedTime;
        }
        return baseTimeLimit;
    };

    const [currentQuestionTimeLimit, setCurrentQuestionTimeLimit] = useState(getQuestionsTimeLimit());
    const [timeLeft, setTimeLeft] = useState(test.timeLeft !== undefined ? test.timeLeft : currentQuestionTimeLimit);

    // Track first render to handle resume gracefully
    const isFirstRender = useRef(true);

    // Reset logic when question changes (Standard for Impossible mode which is usually per question)
    useEffect(() => {
        // Skip reset on first render if we have a resumed time to preserve it
        if (isFirstRender.current) {
            isFirstRender.current = false;
            if (test.timeLeft !== undefined) return;
        }

        // When index changes, reset timer
        if (baseTimeLimit !== null && !isFinished) {
            // Reset to base time limit + bonus
            const newLimit = (test.difficultyMode === 'impossible' ? baseTimeLimit + bankedTime : baseTimeLimit);
            setCurrentQuestionTimeLimit(newLimit);
            setTimeLeft(newLimit);
        }
    }, [currentIndex, baseTimeLimit, isFinished]); // Removed bankedTime from deps because we act on index change

    // Timer Countdown Effect
    useEffect(() => {
        if (baseTimeLimit === null || isFinished) return;

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    proceedToNext(0); // Auto-skip with 0 time left
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [currentIndex, isFinished, answers, baseTimeLimit]); // Re-start when index changes

    const [showConfirmFinish, setShowConfirmFinish] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    // Report System State
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportReason, setReportReason] = useState("");
    const [isReporting, setIsReporting] = useState(false);
    const [activeReportQuestion, setActiveReportQuestion] = useState(null);
    const [showConfirmSkip, setShowConfirmSkip] = useState(false);

    const [activeUsers, setActiveUsers] = useState([]);

    // User local country state isn't available inside TestRunner props unless passed.
    // However, we need to send it in heartbeat.
    // We can fetch it again or pass it. 
    // Fetching again is easiest to avoid prop drilling mania for now, or just use localStorage if we saved it.
    // To keep it clean, let's grab it from localStorage if available or re-fetch lightly.
    // Actually, TestRunner is child of Home, but Home holds the state `userCountry`.
    // Let's pass `userCountry` as prop to TestRunner.


    const question = test.questions[currentIndex];

    // Hint Logic
    const handleUseHint = () => {
        const infiniteHints = activatedCheats?.includes('dontgiveup') || activatedCheats?.includes('godmode');
        if ((hintsLeft <= 0 && extraHints <= 0 && !infiniteHints) || isFinished) return;

        const currentRevealed = revealedHints[currentIndex] || [];
        
        // Multi-choice correct answer parsing
        const correctIds = question.correct_answer.includes(',') 
            ? question.correct_answer.split(',').map(s => s.trim())
            : [question.correct_answer];

        // Only consider options that are WRONG and NOT YET REVEALED
        const incorrectOptions = question.shuffledOptions.filter(o =>
            !correctIds.includes(o.id) &&
            !currentRevealed.includes(o.id)
        );

        if (incorrectOptions.length === 0) return; // No more hints possible

        // Eliminate one random incorrect option
        const toEliminate = incorrectOptions[Math.floor(Math.random() * incorrectOptions.length)];

        const newRevealed = [...(revealedHints[currentIndex] || []), toEliminate.id];

        setRevealedHints(prev => ({
            ...prev,
            [currentIndex]: newRevealed
        }));

        // Auto-select if ONLY correct answers remain
        // Check if we have eliminated ALL incorrect options
        const totalIncorrectCount = question.shuffledOptions.length - correctIds.length;
        
        if (newRevealed.length >= totalIncorrectCount) {
             // Auto-fill logic checks
             if (question.correct_answer.includes(',')) {
                 // For multi: verify we haven't already answered fully? 
                 // Just set the answer to the normalized correct string if empty
                 if (!answers[currentIndex]) {
                    const sortedCorrect = correctIds.sort().join(', ');
                    setAnswers(prev => ({ ...prev, [currentIndex]: sortedCorrect }));
                 }
             } else {
                 // Single choice
                 if (!answers[currentIndex]) {
                     // Can safely call handleAnswer for single ID
                     handleAnswer(question.correct_answer);
                 }
             }
        }

        if (infiniteHints) return; // Don't consume hints

        if (hintsLeft > 0) {
            setHintsLeft(prev => prev - 1);
        } else if (extraHints > 0) {
            const newVal = extraHints - 1;
            setExtraHints(newVal);
            localStorage.setItem('examApp_extraHints', newVal.toString());
        }
    };

    // Find translation if available
    const translatedQuestion = test.translationContent?.test_questions?.find(q => q.id === question.id);

    const totalQuestions = test.questions.length;

    // Determine which question is being reported (default to current if not set)
    const reportingQuestion = activeReportQuestion || question;

    // Use a ref to access current onProgressUpdate without triggering effect
    const onProgressUpdateRef = useRef(onProgressUpdate);
    useEffect(() => {
        onProgressUpdateRef.current = onProgressUpdate;
    });

    // Report progress to parent whenever state changes
    useEffect(() => {
        if (!isFinished) {
            if (onProgressUpdateRef.current) {
                onProgressUpdateRef.current({
                    questions: test.questions, // Keep the same shuffled order
                    currentQuestionIndex: currentIndex,
                    answers: answers,
                    hintsLeft,
                    revealedHints,
                    difficultyMode: test.difficultyMode, // SAVE DIFFICULTY MODE
                    bankedTime, // Save banked time too for correct resume
                    timeLeft: timeLeft // Save remaining time for exact resume
                });
            }

            // Post to active sessions
            fetch('/api/active', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    testId: test.id,
                    userId: userId, // Use stable ID
                    name: userName,
                    progress: currentIndex,
                    total: totalQuestions,
                    device: getDeviceType(),
                    country: userCountry,
                    currentAnswer: answers[currentIndex], // Send the selected answer for the current question
                    stars: userStars, // Send star count
                    theme: resolvedTheme
                })
            }).catch(e => console.error("Active status update failed", e));
        }
    }, [currentIndex, answers, isFinished, test.questions, test.id, userName, userId, totalQuestions, userCountry, hintsLeft, revealedHints, userStars, resolvedTheme]);

    // Keep in-test presence alive even if the user pauses (no answers for a while).
    useEffect(() => {
        if (isFinished) return;
        if (!userId || !userName || !test?.id) return;

        const ping = () => {
            const hasFocus = typeof document !== 'undefined' && typeof document.hasFocus === 'function'
                ? document.hasFocus()
                : true;
            const isAfk = typeof document !== 'undefined' ? (document.hidden || !hasFocus) : false;
            const status = isAfk ? 'afk' : 'in-test';

            fetch('/api/active', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    testId: test.id,
                    userId: userId,
                    name: userName,
                    progress: currentIndex,
                    total: totalQuestions,
                    status,
                    device: getDeviceType(),
                    country: userCountry,
                    currentAnswer: answers[currentIndex],
                    stars: userStars,
                    theme: resolvedTheme
                })
            }).catch(() => { });
        };

        ping();
        const interval = setInterval(ping, 15000);
        return () => clearInterval(interval);
    }, [isFinished, test?.id, userId, userName, currentIndex, totalQuestions, userCountry, userStars, resolvedTheme]);

    // Poll for other active users
    useEffect(() => {
        const fetchActive = async () => {
            try {
                const res = await fetch(`/api/active?testId=${test.id}`);
                const data = await res.json();
                // Filter out self by ID
                const others = data.filter(u => u.userId !== userId);
                setActiveUsers(others);
            } catch (e) { console.error(e); }
        };

        const interval = setInterval(fetchActive, 5000);
        fetchActive();

        return () => clearInterval(interval);
    }, [test.id, userId]);

    const handleReportSubmit = async () => {
        if (!reportReason.trim()) return;

        setIsReporting(true);
        try {
            await fetch('/api/report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    testId: test.id,
                    questionId: reportingQuestion.id,
                    questionText: reportingQuestion.question,
                    reason: reportReason,
                    user: userName
                })
            });

            setShowReportModal(false);
            setReportReason("");
            setActiveReportQuestion(null);
            alert("Thanks! We'll review this question.");
        } catch (error) {
            console.error(error);
            alert("Failed to submit report");
        } finally {
            setIsReporting(false);
        }
    };

    const handleAnswer = (optionId) => {
        playClickSound?.();
        
        // Multi-select logic check
        const isMulti = question?.correct_answer?.includes(',');

        if (isMulti) {
            setAnswers(prev => {
                const currentStr = prev[currentIndex] || "";
                let currentIds = currentStr ? currentStr.split(',').map(s => s.trim()).filter(Boolean) : [];

                if (currentIds.includes(optionId)) {
                    currentIds = currentIds.filter(id => id !== optionId);
                } else {
                    currentIds.push(optionId);
                }
                
                // Sort alphabetically to be safe and clean
                currentIds.sort();
                
                const newAnswer = currentIds.join(', ');
                return { ...prev, [currentIndex]: newAnswer };
            });
        } else {
            setAnswers(prev => ({ ...prev, [currentIndex]: optionId }));
        }
    };

    const handleNext = () => {
        // Check if answered
        if (!answers[currentIndex]) {
            setShowConfirmSkip(true);
            return;
        }
        proceedToNext();
    };

    const proceedToNext = (remainingTimeOverride) => {
        // Time Banking Logic
        if (test.difficultyMode === 'impossible' && baseTimeLimit !== null) {
            // FIX: Use override if provided (e.g. 0 from timeout)
            const finalTimeLabel = remainingTimeOverride !== undefined ? remainingTimeOverride : timeLeft;
            const unusedTime = Math.max(0, finalTimeLabel);
            setBankedTime(unusedTime);
        }

        if (currentIndex < totalQuestions - 1) {
            setCurrentIndex(currentIndex + 1);
            setShowConfirmSkip(false);
        } else {
            setShowConfirmFinish(true);
        }
    };

    // Clear active user session on unmount or finish
    useEffect(() => {
        const cleanup = () => {
            fetch(`/api/active?userId=${userId}`, { method: 'DELETE', keepalive: true });
        };
        // Add beforeunload for tab close
        window.addEventListener('beforeunload', cleanup);

        return () => {
            window.removeEventListener('beforeunload', cleanup);
            cleanup();
        };
    }, [test.id, userId]);

    const confirmFinish = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);

        try {
            let score = 0;
            test.questions.forEach((q, idx) => {
                const ua = answers[idx];
                const ca = q.correct_answer;

                // Normalize helper
                const norm = (s) => s ? s.split(',').map(x => x.trim()).sort().join(',') : '';

                if (norm(ua) === norm(ca)) {
                    score++;
                } else if (ca && ca.includes(',')) {
                    // Partial Credit for Multi/Matching
                    const correctIds = ca.split(',').map(s => s.trim());
                    const userIds = (ua || '').split(',').map(s => s.trim());

                    // Filter out empty or invalid "NO_MATCH"
                    const validUserIds = userIds.filter(id => id && id !== 'NO_MATCH');

                    // Count CORRECT matches (User selected specific correct option)
                    const correctMatches = validUserIds.filter(id => correctIds.includes(id)).length;
                    
                    // Count WRONG selections (User selected an incorrect option)
                    // Usually in partial credit, wrong answers might penalize or just not count.
                    // User request: "1/3 per correct answer".
                    // Standard logic: Score = Correctly Selected / Total Correct Options.
                    // Does selecting a WRONG answer subtract? 
                    // Usually simple partial credit is just (Right / TotalRights).
                    // If I select A, B (Correct: A, B, C) -> 2/3.
                    // If I select A, B, D (Correct: A, B, C) -> 2/3 (D ignores) or penalty?
                    // Let's stick to simple ratio of covered correct answers.
                    
                    if (correctIds.length > 0) {
                        score += (correctMatches / correctIds.length);
                    }
                }
            });

            // Calculate duration
            const endTime = Date.now();
            const durationMs = endTime - (test.startTime || endTime); // prevent negative if startTime missing based on reload

            // Remove from active users list specifically on finish
            try {
                await fetch(`/api/active?userId=${userId}`, { method: 'DELETE' });
            } catch (e) {
                console.error("Failed to clear active session", e);
            }

            // Submit to leaderboard
            await fetch('/api/leaderboard', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: userName,
                    testName: test.name, // Ensure this matches schema
                    score: score,
                    total: totalQuestions,
                    date: new Date().toISOString(),
                    duration: durationMs,
                    questions: test.questions, // Store snapshot
                    answers: answers,
                    difficulty: test.difficultyMode // Save Difficulty to Leaderboard
                })
            });

            setIsFinished(true);
            setShowConfirmFinish(false);

            // --- NEW REWARD LOGIC ---
            // 1. Stars: "har bir togri savolga yulduz berilsin"
            let starMultiplier = 1;
            if (unlockedLeagues && unlockedLeagues.includes('Mythic')) starMultiplier = 2;
            else if (unlockedLeagues && unlockedLeagues.includes('Legendary')) starMultiplier = 1.5;

            const starsEarned = Math.floor(score * starMultiplier);

            if (updateUserStars) {
                // Add score to current stars
                updateUserStars(starsEarned);
            }

            // 2. Achievements (Unlocks)
            // Check if achieved Mythic/Legendary
            const league = getLeague(score, totalQuestions, test.difficultyMode, durationMs, test.questions, answers);
            if (updateUserUnlocks && league.name) {
                updateUserUnlocks(league.name);
            }

            // Pass up results
            onFinish({ answers, isFinished: true, score });
        } catch (error) {
            console.error("Finish error", error);
            alert("Error submitting results. Please try again.");
            setIsSubmitting(false);
        }
    };

    const leaveWithoutResult = async () => {
        if (isSubmitting) return;
        stopCelebrationSound();
        setNeedsSoundTap(false);
        setShowConfirmFinish(false);
        try {
            await fetch(`/api/active?userId=${userId}`, { method: 'DELETE', keepalive: true });
        } catch { }
        if (onLeaveWithoutResult) {
            onLeaveWithoutResult();
        } else if (onBack) {
            onBack();
        }
    };

    if (isFinished) {
        // Calculate score with partial credit logic for display
        const score = test.questions.reduce((acc, q, idx) => {
            const ua = answers[idx];
            const ca = q.correct_answer;
            const norm = (s) => s ? s.split(',').map(x => x.trim()).sort().join(',') : '';

            if (norm(ua) === norm(ca)) {
                return acc + 1;
            } else if (ca && ca.includes(',')) {
                const correctIds = ca.split(',').map(s => s.trim());
                const userIds = (ua || '').split(',').map(s => s.trim());
                const validUserIds = userIds.filter(id => id && id !== 'NO_MATCH');
                const correctMatches = validUserIds.filter(id => correctIds.includes(id)).length;
                
                if (correctIds.length > 0) {
                    return acc + (correctMatches / correctIds.length);
                }
            }
            return acc;
        }, 0);

        const percentage = Math.round((score / totalQuestions) * 100);

        let starMultiplier = 1;
        if (unlockedLeagues && unlockedLeagues.includes('Mythic')) starMultiplier = 2;
        else if (unlockedLeagues && unlockedLeagues.includes('Legendary')) starMultiplier = 1.5;

        const starsEarned = Math.floor(score * starMultiplier);

        return (
            <>
                {showLegendaryEffect && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
                        <svg viewBox="0 0 500 200" className="w-[80vw] max-w-2xl animate-in zoom-in-50 duration-500 drop-shadow-[0_0_15px_rgba(234,179,8,0.8)]">
                            <defs>
                                <path id="curve" d="M 50 150 Q 250 20 450 150" fill="transparent" />
                                <linearGradient id="gold-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" stopColor="#FDE68A" />
                                    <stop offset="50%" stopColor="#F59E0B" />
                                    <stop offset="100%" stopColor="#B45309" />
                                </linearGradient>
                            </defs>
                            <text width="500">
                                <textPath xlinkHref="#curve" startOffset="50%" textAnchor="middle" className="text-6xl font-black uppercase tracking-widest" style={{ fill: "url(#gold-grad)", fontSize: "60px", fontWeight: "900", fontFamily: "cursive, sans-serif" }}>
                                    LEGENDARY
                                </textPath>
                            </text>
                        </svg>
                    </div>
                )}
                {/* Back Button for Finished View */}
                <button
                    onClick={() => {
                        playClickSound?.();
                        stopCelebrationSound();
                        onBack();
                    }}
                    className="mb-6 flex items-center gap-2 text-gray-500 hover:text-gray-700 font-medium transition-colors bg-white dark:bg-gray-800 px-4 py-2 rounded-lg border border-gray-200 shadow-sm hover:shadow-md"
                >
                    <ArrowLeft size={16} /> Back to List
                </button>

                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800/50 overflow-hidden">
                    <div className="p-8 text-center bg-gray-900 text-white flex flex-col items-center">
                        <h2 className="text-3xl font-bold mb-2">Test Completed!</h2>
                        <p className="opacity-80 mb-8">Here is how you performed</p>

                        {needsSoundTap && (
                            <button
                                onClick={playCelebrationSound}
                                className="mb-4 text-xs font-bold tracking-wide px-3 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 transition-colors"
                            >
                                Tap to play celebration sound
                            </button>
                        )}

                        {/* Speedometer Gauge - Full Neon Style */}
                        <div className="relative w-72 h-36 overflow-hidden mb-4 p-4">
                            {/* Outer Neon Glow Ring */}
                            <div 
                                className="absolute bottom-4 left-1/2 -translate-x-1/2 w-64 h-32 overflow-hidden pointer-events-none"
                                style={{
                                    filter: 'blur(8px)',
                                    opacity: 0.6
                                }}
                            >
                                <div className="w-64 h-64 rounded-full"
                                    style={{
                                        background: `conic-gradient(from 180deg, 
                                        #ef4444 0deg, #ef4444 54deg,
                                        #eab308 54deg, #eab308 90deg,
                                        #3b82f6 90deg, #3b82f6 126deg,
                                        #22c55e 126deg, #22c55e 180deg,
                                        transparent 180deg, transparent 360deg)`,
                                        maskImage: 'radial-gradient(transparent 55%, black 56%, black 66%, transparent 67%)',
                                        WebkitMaskImage: 'radial-gradient(transparent 55%, black 56%, black 66%, transparent 67%)'
                                    }}
                                ></div>
                            </div>

                            {/* Scale Ticks (Lines) - Neon Cyan */}
                            {Array.from({ length: 11 }).map((_, i) => {
                                const deg = (i * 10 / 100) * 180 - 90;
                                return (
                                    <div
                                        key={i}
                                        className="absolute bottom-4 left-1/2 w-0.5 h-36 origin-bottom z-20 pointer-events-none"
                                        style={{ transform: `translateX(-50%) rotate(${deg}deg)` }}
                                    >
                                        <div 
                                            className="w-full h-3 bg-cyan-400 absolute top-0"
                                            style={{
                                                boxShadow: '0 0 4px #22d3ee, 0 0 8px #22d3ee'
                                            }}
                                        ></div>
                                    </div>
                                );
                            })}

                            {/* Gauge Background (Colored Segments) - With Neon Glow */}
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-64 h-32 overflow-hidden">
                                <div className="w-64 h-64 rounded-full"
                                    style={{
                                        background: `conic-gradient(from 180deg, 
                                        #ef4444 0deg, #ef4444 54deg,
                                        #eab308 54deg, #eab308 90deg,
                                        #3b82f6 90deg, #3b82f6 126deg,
                                        #22c55e 126deg, #22c55e 180deg,
                                        transparent 180deg, transparent 360deg)`,
                                        maskImage: 'radial-gradient(transparent 60%, black 61%)',
                                        WebkitMaskImage: 'radial-gradient(transparent 60%, black 61%)',
                                        boxShadow: 'inset 0 0 20px rgba(34, 211, 238, 0.3), 0 0 30px rgba(34, 211, 238, 0.2)'
                                    }}
                                ></div>
                            </div>

                            {/* Needle - Neon Style */}
                            <div
                                className="absolute bottom-4 left-1/2 w-1 h-32 origin-bottom transition-transform duration-[2000ms] cubic-bezier(0.34, 1.56, 0.64, 1) z-30"
                                style={{
                                    transform: `translateX(-50%) rotate(${(animatedScorePercent / 100) * 180 - 90}deg)`
                                }}
                            >
                                <div 
                                    className="w-1.5 h-[90%] bg-cyan-400 rounded-t-full mx-auto mt-[10%]"
                                    style={{
                                        boxShadow: '0 0 6px #22d3ee, 0 0 12px #22d3ee, 0 0 24px #06b6d4'
                                    }}
                                ></div>
                                <div 
                                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-6 bg-cyan-400 rounded-full z-40"
                                    style={{
                                        boxShadow: '0 0 10px #22d3ee, 0 0 20px #22d3ee, 0 0 40px #06b6d4'
                                    }}
                                ></div>
                            </div>

                            {/* Internal Text - Neon Speedometer Style */}
                            <div className="absolute bottom-10 left-0 w-full text-center z-30">
                                <div 
                                    className="text-5xl font-black text-cyan-400"
                                    style={{
                                        textShadow: '0 0 5px #22d3ee, 0 0 10px #22d3ee, 0 0 20px #22d3ee, 0 0 40px #06b6d4, 0 0 80px #06b6d4'
                                    }}
                                >
                                    {formatScore(score)}
                                </div>
                                <div 
                                    className="text-xs text-cyan-200 uppercase tracking-widest mt-1"
                                    style={{
                                        textShadow: '0 0 5px #22d3ee, 0 0 10px #22d3ee'
                                    }}
                                >
                                    of {totalQuestions}
                                </div>
                            </div>
                        </div>

                        <div className="mt-2 text-3xl font-bold bg-gradient-to-r from-blue-200 to-white bg-clip-text text-transparent">
                            {percentage}% Score
                        </div>

                        {/* Stars and Multiplier Display */}
                        <div className="mt-4 flex items-center justify-center gap-4 bg-gray-800/50 py-2 px-6 rounded-full border border-gray-700/50 backdrop-blur-sm">
                            <div className="flex items-center gap-2 text-yellow-400 font-bold text-xl">
                                <Star className="fill-yellow-400" size={24} />
                                <span>+{starsEarned}</span>
                            </div>

                            <div className={clsx(
                                "text-xs font-bold px-2 py-1 rounded uppercase tracking-wider",
                                starMultiplier > 1 ? "bg-purple-900 text-purple-200 border border-purple-700" : "bg-gray-700 text-gray-400 border border-gray-600"
                            )}>
                                Multiplier x{starMultiplier}
                            </div>
                        </div>
                    </div>

                    <div className="p-0">
                        <div className="bg-gray-50 dark:bg-gray-950 px-6 py-4 border-b border-gray-100 dark:border-gray-800/50 flex justify-between items-center">
                            <h3 className="font-bold text-gray-700">Detailed Review</h3>
                        </div>
                        <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                            {test.questions.map((q, idx) => {
                                const userAnswer = answers[idx];
                                // Normalize for comparison (ignore whitespace around commas)
                                const norm = (s) => s ? s.split(',').map(x => x.trim()).sort().join(',') : '';
                                const isCorrect = norm(userAnswer) === norm(q.correct_answer);
                                
                                // Multi-Answer / Matching Logic check
                                const isMulti = q.correct_answer && q.correct_answer.includes(',');

                                // Helper to formatting
                                const formatAnswer = (ansStr) => {
                                    if (!ansStr || ansStr === 'NO_MATCH') return "No valid selection";
                                    if (!ansStr.includes(',')) {
                                        const opt = q.shuffledOptions.find(o => o.id === ansStr);
                                        return opt ? opt.text : ansStr;
                                    }
                                    // Multi handling
                                    return ansStr.split(',').map(id => {
                                        const trimmedId = id.trim();
                                        const opt = q.shuffledOptions.find(o => o.id === trimmedId);
                                        // For matching, option text is "Left -> Right"
                                        return opt ? `[${trimmedId}] ${opt.text}` : id;
                                    }).join('  |  ');
                                };

                                return (
                                    <div key={q.id} className="p-6 hover:bg-gray-50 dark:bg-gray-950 transition-colors group">
                                        <div className="flex gap-4">
                                            <div className="mt-1">
                                                {isCorrect ? (
                                                    <CheckCircle2 className="text-green-500" size={24} />
                                                ) : (
                                                    <div className="relative">
                                                        <XCircle className="text-red-500" size={24} />
                                                        {isMulti && (
                                                            <span className="absolute -bottom-2 -right-2 text-[10px] bg-blue-100 text-blue-800 px-1 rounded border border-blue-200">
                                                                Partial
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start mb-2">
                                                    <p className="font-medium text-gray-900 dark:text-gray-100 pr-4">
                                                        <span className="text-gray-400 mr-2">#{idx + 1}</span>
                                                        {q.question}
                                                    </p>
                                                    <button
                                                        onClick={() => {
                                                            setActiveReportQuestion(q);
                                                            setShowReportModal(true);
                                                        }}
                                                        className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                        title="Report Issue"
                                                    >
                                                        <Flag size={16} />
                                                    </button>
                                                </div>
                                                <div className="text-sm space-y-2 mt-3 p-3 bg-gray-50/50 dark:bg-gray-900/30 rounded-lg border border-gray-100 dark:border-gray-800/50">
                                                    <div className={clsx("flex flex-col gap-1", isCorrect ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400")}>
                                                        <span className="font-bold text-xs uppercase tracking-wider opacity-70">Your Answer</span>
                                                        {isMulti ? (
                                                            <div className="flex flex-col gap-2 mt-1">
                                                                {(() => {
                                                                    const selections = (userAnswer || "").split(',').filter(Boolean);
                                                                    if (selections.length === 0) {
                                                                        return (
                                                                            <div className="px-3 py-2 rounded-md border flex items-start gap-2 text-sm bg-red-50 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800">
                                                                                <div className="mt-0.5 shrink-0">
                                                                                    <XCircle size={16} />
                                                                                </div>
                                                                                <span className="italic">No valid selection</span>
                                                                            </div>
                                                                        );
                                                                    }
                                                                    return selections.map((idRaw, i) => {
                                                                        const id = idRaw.trim();
                                                                        if (id === "NO_MATCH") return <span key={i} className="text-gray-500 italic">No Selection</span>;

                                                                        const correctIds = q.correct_answer.split(',').map(s => s.trim());
                                                                        const isItemCorrect = correctIds.includes(id);
                                                                        const opt = q.shuffledOptions.find(o => o.id === id);
                                                                        const text = opt ? (opt.text.includes('→') ? `${opt.text}` : opt.text) : id;
                                                                        
                                                                        return (
                                                                            <div key={i} className={clsx(
                                                                                "px-3 py-2 rounded-md border flex items-start gap-2 text-sm",
                                                                                isItemCorrect 
                                                                                    ? "bg-green-50 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800" 
                                                                                    : "bg-red-50 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800"
                                                                            )}>
                                                                                <div className="mt-0.5 shrink-0">
                                                                                    {isItemCorrect ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                                                                                </div>
                                                                                <span><span className="font-bold">[{id}]</span> {text}</span>
                                                                            </div>
                                                                        )
                                                                    });
                                                                })()}
                                                            </div>
                                                        ) : (
                                                            <span className="font-medium bg-white dark:bg-gray-800 px-3 py-2 rounded-md shadow-sm border border-gray-100 dark:border-gray-700/50">
                                                                {formatAnswer(userAnswer)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {!isCorrect && (
                                                        <div className="flex flex-col gap-1 text-green-700 dark:text-green-400 mobile-mt-2">
                                                            <span className="font-bold text-xs uppercase tracking-wider opacity-70">Correct Answer</span>
                                                            {isMulti ? (
                                                                <div className="flex flex-col gap-2 mt-1">
                                                                    {q.correct_answer.split(',').map((idRaw, i) => {
                                                                        const id = idRaw.trim();
                                                                        const opt = q.shuffledOptions.find(o => o.id === id);
                                                                        const text = opt ? (opt.text.includes('→') ? `${opt.text}` : opt.text) : id;
                                                                        
                                                                        return (
                                                                            <div key={i} className="px-3 py-2 rounded-md border flex items-start gap-2 text-sm bg-green-50 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800">
                                                                                <div className="mt-0.5 shrink-0">
                                                                                    <CheckCircle2 size={16} />
                                                                                </div>
                                                                                <span><span className="font-bold">[{id}]</span> {text}</span>
                                                                            </div>
                                                                        )
                                                                    })}
                                                                </div>
                                                            ) : (
                                                                <span className="font-medium bg-white dark:bg-gray-800 px-3 py-2 rounded-md shadow-sm border border-green-100 dark:border-green-900/30 bg-green-50/10">
                                                                    {formatAnswer(q.correct_answer)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <div className="p-6 bg-gray-50 dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800/50 flex justify-center">
                        <button
                            onClick={() => {
                                stopCelebrationSound();
                                onRetake();
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                        >
                            <RefreshCcw size={20} /> Retake Test
                        </button>
                    </div>
                </div>

                {/* Report Modal (Duplicate for Finished State) */}
                {showReportModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                            <div className="flex items-center gap-3 text-gray-900 dark:text-gray-100 mb-4">
                                <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                                    <Flag size={20} />
                                </div>
                                <h3 className="text-lg font-bold">Report Issue</h3>
                            </div>
                            <p className="text-gray-500 mb-4 text-sm">
                                Help us improve! What's wrong with Question <span className="font-mono bg-gray-100 px-1 rounded">#{reportingQuestion.id}</span>?
                            </p>

                            {/* Quick Reason Buttons */}
                            <div className="flex flex-wrap gap-2 mb-4">
                                {["Answer is incorrect", "Question is incomplete", "Spelling mistake", "Duplicate question"].map((reason) => (
                                    <button
                                        key={reason}
                                        onClick={() => setReportReason(prev => prev ? prev + ", " + reason : reason)}
                                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-medium rounded-full transition-colors border border-gray-200"
                                    >
                                        {reason}
                                    </button>
                                ))}
                            </div>

                            <textarea
                                value={reportReason}
                                onChange={(e) => setReportReason(e.target.value)}
                                placeholder="E.g. The correct answer should be B because..."
                                className="w-full border border-gray-200 bg-gray-50 dark:bg-gray-950 rounded-xl p-4 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none mb-4 min-h-[120px] resize-none transition-all placeholder:text-gray-400"
                                autoFocus
                            />
                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setShowReportModal(false);
                                        setReportReason("");
                                        setActiveReportQuestion(null);
                                    }}
                                    className="flex-1 py-2.5 rounded-xl border border-gray-200 font-semibold text-gray-700 hover:bg-gray-50 dark:bg-gray-950 transition-colors text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleReportSubmit}
                                    disabled={!reportReason.trim() || isReporting}
                                    className="flex-1 py-2.5 rounded-xl bg-red-600 font-semibold text-white hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                                >
                                    {isReporting ? 'Submitting...' : 'Submit Report'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    }

    if (!question) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-8 text-center mt-12">
                <div className="text-4xl mb-4">⚠️</div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Error Loading Question</h3>
                <p className="text-gray-500 mb-6">Unable to load question #{currentIndex + 1}.</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                >
                    Refresh Application
                </button>
            </div>
        );
    }

    return (
        <>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800/50 flex flex-col min-h-[500px] mt-12 relative">
                {/* Progress Bar */}
                <div className="h-8 bg-gray-200 w-full relative rounded-t-2xl">
                    {/* Steps */}
                    <div className="flex h-full rounded-2xl overflow-hidden gap-[1px]">
                        {Array.from({ length: totalQuestions }).map((_, i) => {
                            let statusColor = "bg-gray-200 dark:bg-gray-700"; // Default/Pending
                            if (i === currentIndex) {
                                statusColor = "progress-wave shadow-[0_0_10px_rgba(37,99,235,0.5)] z-10 border-none"; // Current with wave animation
                            } else if (answers[i]) {
                                statusColor = "bg-green-500"; // Answered
                            } else if (i < currentIndex) {
                                statusColor = "bg-yellow-400"; // Skipped/Unanswered passed
                            }

                            return (
                                <div
                                    key={i}
                                    className={`flex-1 transition-all duration-300 ${statusColor}`}
                                />
                            );
                        })}
                    </div>
                    {/* Active User Markers */}
                    {/* Current User Marker */}
                    <div
                        className="absolute bottom-full flex flex-col items-center z-20 group transition-all duration-300 ease-out -translate-x-1/2 animate-float"
                        style={{ left: `calc(${((currentIndex) / totalQuestions) * 100}% - 1px)` }}
                    >
                        <div className="bg-green-600 text-white text-[10px] uppercase font-bold px-1.5 py-0.5 rounded mb-0.5 shadow-sm whitespace-nowrap">You</div>
                        <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-green-600"></div>
                    </div>

                    {activeUsers.map((user, idx) => (
                        <div
                            key={idx}
                            className="absolute bottom-full flex flex-col items-center z-10 transition-all duration-500 ease-out -translate-x-1/2"
                            style={{ left: `calc(${((user.progress) / totalQuestions) * 100}% - 1px)` }}
                            title={`${user.name} is here`}
                        >
                            <div className="bg-amber-100 border border-amber-300 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm mb-0.5 whitespace-nowrap min-w-[20px] text-center">
                                {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px] border-t-amber-400"></div>
                        </div>
                    ))}
                </div>

                <div className="p-6 md:p-10 flex-1 flex flex-col">
                    <div className="flex justify-between items-center mb-6 text-sm text-gray-500">
                        <div className="flex items-center gap-3">
                            {/* Stars Display */}
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-yellow-50 text-yellow-700 border border-yellow-200 dark:bg-[#282b33] dark:text-yellow-500 dark:border-transparent rounded-lg font-bold text-xs" title="Your Stars">
                                <span>⭐</span>
                                <span>{userStars}</span>
                            </div>
                            <button
                                onClick={() => { playClickSound?.(); onBack(); }}
                                className="text-gray-400 hover:text-gray-600 transition-colors mr-1 hover:bg-gray-100 p-1 rounded-lg"
                                title="Back to list"
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <span>Question {currentIndex + 1} of {totalQuestions}</span>
                        </div>

                        {/* Timer Display */}
                        {timeLeft !== null && (
                            <div className={clsx(
                                "flex items-center gap-1.5 font-bold font-mono text-lg rounded px-2 py-0.5",
                                timeLeft <= 5 ? "text-red-600 bg-red-100 animate-pulse" : "text-gray-700 bg-gray-100"
                            )}>
                                <Clock size={16} />
                                {timeLeft}s
                            </div>
                        )}

                        <div className="flex items-center gap-2">
                            {/* Hint Button */}
                            {(hintsLeft > 0 || extraHints > 0 || activatedCheats?.includes('dontgiveup') || activatedCheats?.includes('godmode')) ? (
                                <button
                                    onClick={handleUseHint}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border border-yellow-200 dark:bg-[#282b33] dark:hover:bg-[#323640] dark:text-yellow-500 dark:border-transparent rounded-lg transition-colors text-xs font-bold mr-2 animate-in fade-in"
                                    title="Use a hint to remove one wrong answer"
                                >
                                    <Lightbulb size={14} className="fill-yellow-500 text-yellow-500" />
                                    <span>Use Hint ({(activatedCheats?.includes('dontgiveup') || activatedCheats?.includes('godmode')) ? '∞' : hintsLeft + extraHints})</span>
                                </button>
                            ) : (
                                /* Buy Hint Button */
                                <button
                                    onClick={() => {
                                        if (spendStars && userStars >= 5) {
                                            if (spendStars(5)) {
                                                setHintsLeft(prev => prev + 1);
                                            }
                                        } else {
                                            alert("Not enough stars! You need 5 stars for a hint.");
                                        }
                                    }}
                                    className={clsx(
                                        "flex items-center gap-1.5 px-3 py-1.5 border rounded-lg transition-colors text-xs font-bold mr-2",
                                        userStars >= 5
                                            ? "bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 cursor-pointer"
                                            : "bg-gray-50 dark:bg-gray-950 text-gray-400 border-gray-200 cursor-not-allowed"
                                    )}
                                    title="Buy a hint for 5 stars"
                                >
                                    <div className='flex items-center gap-1'>
                                        <span>⭐ 5</span>
                                        <span>Buy Hint</span>
                                    </div>
                                </button>
                            )}
                            <span className="bg-gray-100 px-2 py-1 rounded text-xs font-mono text-gray-600">ID: {question.id}</span>
                            <button
                                onClick={() => setShowReportModal(true)}
                                className="text-gray-400 hover:text-gray-600 transition-colors mr-1 hover:bg-gray-100 p-1 rounded-lg"
                                title="Back to listuestion"
                            >
                                <Flag size={14} />
                            </button>
                        </div>
                    </div>

                    <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-8 leading-relaxed">
                        <TranslatableText
                            text={question.question}
                            translation={translatedQuestion?.question}
                        />
                    </h2>

                    <div className="space-y-3 flex-1">
                        {/* Check if it's a Matching Question (contains '→') */}
                        {question.shuffledOptions.every(o => o.text.includes('→')) ? (
                            <MatchingQuestionComponent
                                key={question.id} // Reset state on new question
                                question={question}
                                answers={answers}
                                currentIndex={currentIndex}
                                handleAnswer={handleAnswer}
                                revealedHints={revealedHints}
                                activatedCheats={activatedCheats}
                                translatedQuestion={translatedQuestion}
                            />
                        ) : (
                            question.shuffledOptions.map((option, idx) => {
                                // Multi logic
                                const isMulti = question.correct_answer && question.correct_answer.includes(',');
                                const answerStr = answers[currentIndex] || '';
                                const userSelectedIds = isMulti 
                                    ? answerStr.split(',').map(s => s.trim()) 
                                    : [answerStr];
                                    
                                const isSelected = userSelectedIds.includes(option.id);

                                const isEliminated = (revealedHints[currentIndex] || []).includes(option.id);
                                const translatedOptionText = translatedQuestion?.options?.[option.id];
                                
                                // Godmode logic
                                const correctIds = isMulti
                                    ? question.correct_answer.split(',').map(s => s.trim())
                                    : [question.correct_answer];
                                const isCorrect = correctIds.includes(option.id);
                                const isGodMode = activatedCheats?.includes('godmode');

                                return (
                                    <button
                                        key={idx}
                                        disabled={isEliminated}
                                        onClick={() => !isEliminated && handleAnswer(option.id)}
                                        className={clsx(
                                            "w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-center gap-3",
                                            isEliminated ? "opacity-30 cursor-not-allowed border-gray-100 dark:border-gray-800/50 bg-gray-50 dark:bg-gray-950 grayscale" : (
                                                isSelected
                                                    ? "border-blue-600 bg-blue-50 text-blue-900 shadow-sm"
                                                    : (isGodMode && isCorrect)
                                                        ? "border-green-500 bg-green-50 text-green-900 shadow-sm ring-2 ring-green-400"
                                                        : "border-gray-100 dark:border-gray-800/50 hover:border-blue-200 hover:bg-gray-50 dark:bg-gray-950 text-gray-700 dark:text-gray-100"
                                            )
                                        )}
                                    >
                                        <div className={clsx(
                                            "w-8 h-8 flex items-center justify-center font-bold text-sm border transiton-colors",
                                            isMulti ? "rounded-md" : "rounded-full",
                                            isSelected ? "bg-blue-600 border-blue-600 text-white" : "bg-white dark:bg-gray-800 border-gray-200 text-gray-400"
                                        )}>
                                             {isMulti && isSelected ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="20 6 9 17 4 12"></polyline>
                                                </svg>
                                            ) : (
                                                String.fromCharCode(65 + idx)
                                            )}
                                        </div>
                                        <span className="font-medium">
                                            <TranslatableText
                                                text={option.text}
                                                translation={translatedOptionText}
                                            />
                                        </span>
                                    </button>
                                );
                            })
                        )}
                    </div>

                    <div className="mt-10 flex justify-between items-center">
                        <button
                            onClick={() => {
                                // Explicit early finish
                                setShowConfirmFinish(true);
                            }}
                            className="text-gray-500 hover:text-red-600 font-medium text-sm px-4 py-2 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                        >
                            End Test Now
                        </button>

                        <button
                            onClick={() => { playClickSound?.(); handleNext(); }}
                            className={clsx(
                                "px-8 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all",
                                answers[currentIndex]
                                    ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                                    : "bg-orange-500 hover:bg-orange-600 text-white shadow-md hover:shadow-lg cursor-pointer"
                            )}
                        >
                            {currentIndex === totalQuestions - 1 ? 'Finish Test' : 'Next Question'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Confirmation Modal */}
            {showConfirmFinish && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center gap-3 text-amber-600 mb-4">
                            <AlertTriangle size={28} />
                            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Finish Test?</h3>
                        </div>
                        <p className="text-gray-600 mb-6">
                            Are you sure you want to finish? {Object.keys(answers).length < totalQuestions && (
                                <span className="block mt-2 text-red-600 font-medium">
                                    You have {totalQuestions - Object.keys(answers).length} unanswered questions.
                                </span>
                            )}
                        </p>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={leaveWithoutResult}
                                disabled={isSubmitting}
                                className="w-full py-2.5 rounded-lg border border-red-200 bg-red-50 font-semibold text-red-700 hover:bg-red-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                Leave (no result)
                            </button>
                            <button
                                onClick={() => setShowConfirmFinish(false)}
                                className="w-full py-2.5 rounded-lg border border-gray-300 font-semibold text-gray-700 hover:bg-gray-50 dark:bg-gray-950 transition-colors"
                            >
                                No, Continue
                            </button>
                            <button
                                onClick={confirmFinish}
                                disabled={isSubmitting}
                                className="w-full py-2.5 rounded-lg bg-blue-600 font-semibold text-white hover:bg-blue-700 transition-colors shadow-md disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="animate-spin" size={18} />
                                        Saving...
                                    </>
                                ) : "Yes, Finish"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Report Modal */}
            {showReportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center gap-3 text-gray-900 dark:text-gray-100 mb-4">
                            <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                                <Flag size={20} />
                            </div>
                            <h3 className="text-lg font-bold">Report Issue</h3>
                        </div>
                        <p className="text-gray-500 mb-4 text-sm">
                            Help us improve! What's wrong with Question <span className="font-mono bg-gray-100 px-1 rounded">#{reportingQuestion.id}</span>?
                        </p>

                        {/* Quick Reason Buttons */}
                        <div className="flex flex-wrap gap-2 mb-4">
                            {["Answer is incorrect", "Question is incomplete", "Spelling mistake", "Duplicate question"].map((reason) => (
                                <button
                                    key={reason}
                                    onClick={() => setReportReason(prev => prev ? prev + ", " + reason : reason)}
                                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-medium rounded-full transition-colors border border-gray-200"
                                >
                                    {reason}
                                </button>
                            ))}
                        </div>

                        <textarea
                            value={reportReason}
                            onChange={(e) => setReportReason(e.target.value)}
                            placeholder="E.g. The correct answer should be B because..."
                            className="w-full border border-gray-200 bg-gray-50 dark:bg-gray-950 rounded-xl p-4 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none mb-4 min-h-[120px] resize-none transition-all placeholder:text-gray-400"
                            autoFocus
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowReportModal(false);
                                    setReportReason("");
                                    setActiveReportQuestion(null);
                                }}
                                className="flex-1 py-2.5 rounded-xl border border-gray-200 font-semibold text-gray-700 hover:bg-gray-50 dark:bg-gray-950 transition-colors text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReportSubmit}
                                disabled={!reportReason.trim() || isReporting}
                                className="flex-1 py-2.5 rounded-xl bg-red-600 font-semibold text-white hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                            >
                                {isReporting ? 'Submitting...' : 'Submit Report'}
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* Skip Confirmation Modal */}
            {showConfirmSkip && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center gap-3 text-amber-600 mb-4">
                            <AlertTriangle size={28} />
                            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Skip Question?</h3>
                        </div>
                        <p className="text-gray-600 mb-6">
                            Are you sure you want to skip this question without answering? It will be marked as incorrect.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowConfirmSkip(false)}
                                className="flex-1 py-2.5 rounded-lg border border-gray-300 font-semibold text-gray-700 hover:bg-gray-50 dark:bg-gray-950 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => { playClickSound?.(); proceedToNext(); }}
                                className="flex-1 py-2.5 rounded-lg bg-yellow-500 font-semibold text-white hover:bg-yellow-600 transition-colors shadow-md"
                            >
                                Yes, Skip
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// Additional components like TranslatableText should remain if not imported?
// Assuming they are defined elsewhere or above in scope if this was a full replace.
// But since we are multi-replacing, they are fine.
