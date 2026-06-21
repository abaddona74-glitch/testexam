'use client';

import { useState, useEffect, useRef } from 'react';
import clsx from 'clsx';

// ─── Loading Animation Registry ─────────────────────────────
// Add new animations here. The id is stored in localStorage.
export const LOADING_ANIMATIONS = [
  {
    id: 'gif',
    name: 'Classic GIF',
    description: 'Asl GIF animatsiya',
    preview: 'gif',
  },
  {
    id: 'classic',
    name: 'Spinner',
    description: 'Simple spinning loader',
    preview: 'simple', // component variant key
  },
  {
    id: 'ship',
    name: 'Ship',
    description: 'Chizilgan uslubdagi kema animatsiyasi',
    preview: 'ship',
  },
];

const STORAGE_KEY = 'examApp_loadingAnimation';

export function getStoredLoadingAnimation() {
  if (typeof window === 'undefined') return 'gif';
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && LOADING_ANIMATIONS.some(a => a.id === stored)) return stored;
  } catch {}
  return 'gif';
}

export function setStoredLoadingAnimation(id) {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {}
}

// ─── GIF Classic Loading (original loading.gif) ────────────
function GifLoading() {
  return (
    <div className="flex items-center justify-center w-full h-full">
      <img
        src="/loading.gif"
        alt="Loading..."
        className="w-24 h-24 object-contain"
      />
    </div>
  );
}

// ─── Classic Loading (Spinner) ──────────────────────────────
function ClassicSpinner() {
  return (
    <div className="flex items-center justify-center w-full h-full">
      <svg
        className="animate-spin h-16 w-16 text-blue-500"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );
}

// ─── Ship Loading Animation ─────────────────────────────────
function ShipLoading() {
  const [dots, setDots] = useState('');
  const [isMuted, setIsMuted] = useState(true);
  const audioRef = useRef(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => {
      clearInterval(interval);
      // Cleanup audio when loading screen unmounts
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const toggleSound = () => {
    setIsMuted(prev => !prev);
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.pause();
      }
    }
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = 0.3;
    }
  }, []);

  return (
    <div className="flex flex-col items-center justify-center w-full h-full relative">
      <style jsx>{`
        @keyframes rock {
          0%, 100% { transform: rotate(-3deg) translateY(4px); }
          25% { transform: rotate(0deg) translateY(0px); }
          50% { transform: rotate(3deg) translateY(4px); }
          75% { transform: rotate(0deg) translateY(8px); }
        }
        @keyframes wave {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes fly {
          0% { transform: translate(0px, 0px); }
          33% { transform: translate(-15px, -8px); }
          66% { transform: translate(10px, -12px); }
          100% { transform: translate(0px, 0px); }
        }
        @keyframes flutter {
          0%, 100% { transform: scaleX(1) skewY(0deg); }
          50% { transform: scaleX(0.85) skewY(15deg); }
        }
        @keyframes flap {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(-0.3); }
        }
        .animate-rock { animation: rock 3s ease-in-out infinite; transform-origin: center bottom; }
        .animate-wave-1 { animation: wave 4s linear infinite; }
        .animate-wave-2 { animation: wave 5s linear infinite reverse; }
        .animate-wave-3 { animation: wave 6s linear infinite; }
        .animate-bird-1 { animation: fly 6s ease-in-out infinite; }
        .animate-bird-2 { animation: fly 7s ease-in-out infinite 2s; }
        .animate-bird-3 { animation: fly 8s ease-in-out infinite 1s; }
        .animate-bird-4 { animation: fly 5s ease-in-out infinite 3s; }
        .animate-bird-5 { animation: fly 9s ease-in-out infinite 0.5s; }
        .animate-flutter { animation: flutter 0.6s ease-in-out infinite; transform-origin: 70px 25px; }
        .animate-flap-1 { animation: flap 0.4s ease-in-out infinite; transform-origin: center 10px; }
        .animate-flap-2 { animation: flap 0.5s ease-in-out infinite 0.2s; transform-origin: center 8px; }
        .animate-flap-3 { animation: flap 0.45s ease-in-out infinite 0.1s; transform-origin: center 6px; }
        .animate-flap-4 { animation: flap 0.6s ease-in-out infinite 0.4s; transform-origin: center 9px; }
        .animate-flap-5 { animation: flap 0.35s ease-in-out infinite; transform-origin: center 5px; }
        .sketch-stroke { stroke: currentColor; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; fill: none; }
        .sketch-fill { fill: transparent; }
      `}</style>

      {/* Wave sound audio */}
      <audio
        ref={audioRef}
        src="https://actions.google.com/sounds/v1/water/waves_crashing_on_rock_beach.ogg"
        loop
        muted={isMuted}
        autoPlay
      />

      {/* Sound toggle button */}
      <button
        onClick={toggleSound}
        className="absolute top-4 right-4 z-50 px-3 py-2 rounded-full border-2 border-gray-400 dark:border-gray-500 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors opacity-70 hover:opacity-100 flex items-center gap-2"
        title={isMuted ? 'Ovozni yoqish' : "Ovozni o'chirish"}
      >
        <span className="text-lg">{isMuted ? '🔇' : '🔊'}</span>
        <span className="text-xs font-bold tracking-wider">{isMuted ? 'OVOZ YOQISH' : "OVOZNI O'CHIRISH"}</span>
      </button>

      {/* Ship + Waves Container */}
      <div className="relative w-72 h-72 overflow-hidden flex items-end justify-center pb-8">
        {/* The Ship */}
        <div className="absolute animate-rock z-20 bottom-6 text-gray-800 dark:text-gray-200">
          <svg width="140" height="140" viewBox="0 0 140 140" className="opacity-90" fill="none">
            {/* Mast */}
            <path d="M 70,20 L 70,100" className="sketch-stroke" />
            <path d="M 72,22 L 72,100" className="sketch-stroke" opacity="0.5" />
            {/* Main Sail (Right) */}
            <path d="M 70,30 Q 110,50 115,90 L 70,90 Z" className="sketch-stroke" />
            <path d="M 75,40 Q 100,60 105,85 L 75,85" className="sketch-stroke" opacity="0.4" />
            {/* Front Sail (Left) */}
            <path d="M 70,35 Q 35,55 30,85 L 65,85 Z" className="sketch-stroke" />
            <path d="M 65,45 Q 45,60 40,80 L 60,80" className="sketch-stroke" opacity="0.4" />
            {/* Flag */}
            <g className="animate-flutter">
              <path d="M 70,20 L 95,25 L 70,30 Z" className="sketch-stroke" />
            </g>
            {/* Hull */}
            <path d="M 20,95 L 120,95 L 100,120 L 35,120 Z" className="sketch-stroke" />
            <path d="M 25,102 L 115,102 M 30,110 L 105,110" className="sketch-stroke" opacity="0.4" />
            {/* Windows */}
            <circle cx="50" cy="108" r="3" className="sketch-stroke" />
            <circle cx="70" cy="108" r="3" className="sketch-stroke" />
            <circle cx="90" cy="108" r="3" className="sketch-stroke" />
          </svg>
        </div>

        {/* Waves */}
        <div className="absolute bottom-0 w-[200%] h-20 flex items-end z-30 opacity-90 text-blue-400 dark:text-blue-500">
          <svg className="absolute w-full h-20 animate-wave-1" viewBox="0 0 800 80" preserveAspectRatio="none">
            <path d="M 0,25 Q 50,10 100,25 T 200,25 T 300,25 T 400,25 T 500,25 T 600,25 T 700,25 T 800,25 L 800,80 L 0,80 Z" className="sketch-stroke" />
          </svg>
          <svg className="absolute w-full h-20 animate-wave-2 mb-1 ml-10 opacity-80" viewBox="0 0 800 80" preserveAspectRatio="none">
            <path d="M 0,35 Q 50,20 100,35 T 200,35 T 300,35 T 400,35 T 500,35 T 600,35 T 700,35 T 800,35 L 800,80 L 0,80 Z" className="sketch-stroke" />
          </svg>
          <svg className="absolute w-full h-20 animate-wave-3 mb-2 ml-20 opacity-60" viewBox="0 0 800 80" preserveAspectRatio="none">
            <path d="M 0,45 Q 50,30 100,45 T 200,45 T 300,45 T 400,45 T 500,45 T 600,45 T 700,45 T 800,45 L 800,80 L 0,80 Z" className="sketch-stroke" />
          </svg>
        </div>

        {/* Birds */}
        <svg width="35" height="18" className="absolute top-3 right-6 opacity-60 animate-bird-1 overflow-visible z-10 text-gray-600 dark:text-gray-400">
          <g className="animate-flap-1"><path d="M 0,9 Q 8,0 17,9 Q 26,0 35,9" className="sketch-stroke" /></g>
        </svg>
        <svg width="25" height="12" className="absolute top-8 left-3 opacity-40 animate-bird-2 overflow-visible z-10 text-gray-600 dark:text-gray-400">
          <g className="animate-flap-2"><path d="M 0,6 Q 6,0 12,6 Q 18,0 25,6" className="sketch-stroke" /></g>
        </svg>
        <svg width="20" height="10" className="absolute top-5 right-20 opacity-50 animate-bird-3 overflow-visible z-10 text-gray-600 dark:text-gray-400">
          <g className="animate-flap-3"><path d="M 0,5 Q 5,0 10,5 Q 15,0 20,5" className="sketch-stroke" /></g>
        </svg>
        <svg width="30" height="15" className="absolute top-12 left-1/4 opacity-30 animate-bird-4 overflow-visible z-10 text-gray-600 dark:text-gray-400">
          <g className="animate-flap-4"><path d="M 0,8 Q 7,0 15,8 Q 22,0 30,8" className="sketch-stroke" /></g>
        </svg>
        <svg width="18" height="9" className="absolute top-4 left-1/3 opacity-40 animate-bird-5 overflow-visible z-10 text-gray-600 dark:text-gray-400">
          <g className="animate-flap-5"><path d="M 0,4 Q 4,0 9,4 Q 13,0 18,4" className="sketch-stroke" /></g>
        </svg>
      </div>

      {/* Loading Text */}
      <div className="mt-6 flex flex-col items-center text-gray-800 dark:text-gray-200">
        <h2 className="text-xl font-bold tracking-widest opacity-80">
          Yuklanmoqda{dots}
        </h2>
        <p className="mt-1 text-xs opacity-50 italic">Iltimos kuting...</p>
      </div>
    </div>
  );
}

// ─── Mini Preview for Settings ──────────────────────────────
function MiniGifPreview() {
  return (
    <div className="flex items-center justify-center w-full h-full bg-emerald-50 dark:bg-gray-900/50 rounded-lg">
      <img src="/loading.gif" alt="" className="w-12 h-12 object-contain" />
    </div>
  );
}

function MiniClassicPreview() {
  return (
    <div className="flex items-center justify-center w-full h-full bg-emerald-50 dark:bg-gray-900/50 rounded-lg">
      <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
    </div>
  );
}

function MiniShipPreview() {
  return (
    <div className="flex items-center justify-center w-full h-full bg-emerald-50 dark:bg-gray-900/50 rounded-lg overflow-hidden">
      <style jsx>{`
        @keyframes miniRock {
          0%, 100% { transform: rotate(-2deg); }
          50% { transform: rotate(2deg); }
        }
        @keyframes miniWave {
          0% { transform: translateX(0); }
          100% { transform: translateX(-30%); }
        }
        .animate-mini-rock { animation: miniRock 3s ease-in-out infinite; transform-origin: center bottom; }
        .animate-mini-wave { animation: miniWave 3s linear infinite; }
      `}</style>
      <div className="relative w-20 h-20 flex items-end justify-center">
        <div className="absolute animate-mini-rock z-20 bottom-2 text-gray-700 dark:text-gray-300">
          <svg width="40" height="40" viewBox="0 0 140 140" fill="none">
            <path d="M 70,20 L 70,100" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            <path d="M 70,30 Q 110,50 115,90 L 70,90 Z" stroke="currentColor" strokeWidth="2.5" fill="none" />
            <path d="M 70,35 Q 35,55 30,85 L 65,85 Z" stroke="currentColor" strokeWidth="2.5" fill="none" />
            <path d="M 20,95 L 120,95 L 100,120 L 35,120 Z" stroke="currentColor" strokeWidth="2.5" fill="none" />
          </svg>
        </div>
        <div className="absolute bottom-0 w-[200%] h-6 flex items-end text-blue-400">
          <svg className="absolute w-full h-6 animate-mini-wave" viewBox="0 0 200 20" preserveAspectRatio="none">
            <path d="M 0,5 Q 25,2 50,5 T 100,5 T 150,5 T 200,5 L 200,20 L 0,20 Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </svg>
        </div>
      </div>
    </div>
  );
}

// ─── Main Loading Screen Component ──────────────────────────
export default function LoadingScreen({ animationId, mini = false }) {
  // During SSR/hydration, animationId is null → render empty placeholder
  // to avoid showing Classic before the user's preferred animation (e.g. Ship).
  if (animationId === null || animationId === undefined) {
    if (mini) {
      return <div className="w-20 h-20 bg-emerald-50 dark:bg-gray-900/50 rounded-lg" />;
    }
    return <div className="flex items-center justify-center w-full h-full" />;
  }

  const id = animationId;

  if (mini) {
    // Mini preview versions for settings
    switch (id) {
      case 'gif':
        return <MiniGifPreview />;
      case 'ship':
        return <MiniShipPreview />;
      case 'classic':
      default:
        return <MiniClassicPreview />;
    }
  }

  // Full-size versions
  switch (id) {
    case 'gif':
      return <GifLoading />;
    case 'ship':
      return <ShipLoading />;
    case 'classic':
    default:
      return <ClassicSpinner />;
  }
}
