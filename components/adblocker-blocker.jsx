'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Shield, RefreshCcw, X } from 'lucide-react';

/**
 * AdBlocker/Extension Blocker Component
 * 
 * Bu komponent adblocker aniqlanganda to'liq ekran qoplamasini ko'rsatadi.
 * Foydalanuvchi adblockerni o'chirmaguncha, saytga kirishi bloklanadi.
 * Faqat "Refresh" (sahifani qayta yuklash) tugmasi mavjud.
 */
export default function AdBlockerBlocker({ onRetry }) {
  const [showContent, setShowContent] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  // Animatsiya bilan kirish
  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Sekundomer
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsElapsed(s => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRetrying(true);
    // Qisqa kechikish bilan qayta tekshirish
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{
        background: 'radial-gradient(ellipse at center, #1a1a2e 0%, #0a0a14 50%, #000000 100%)',
      }}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-yellow-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }} />
      </div>

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Content */}
      <div
        className={`relative z-10 max-w-lg w-full mx-4 px-6 py-10 sm:px-10 sm:py-12 text-center transition-all duration-700 ${
          showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        {/* Icon */}
        <div className="relative mx-auto w-24 h-24 mb-8">
          <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
          <div className="absolute inset-0 bg-red-500/10 rounded-full animate-pulse" style={{ animationDuration: '2s' }} />
          <div className="relative w-24 h-24 flex items-center justify-center bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-full border-2 border-red-500/30">
            <Shield size={48} className="text-red-400" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl font-black text-white mb-4 tracking-tight">
          <span className="bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent">
            Ad Blocker Detected
          </span>
        </h1>

        <div className="space-y-4 mb-8">
          <p className="text-gray-300 text-base sm:text-lg leading-relaxed">
            For exam security and platform integrity, please disable your ad blocker
            and browser extensions before continuing.
          </p>

          {/* Warning Cards */}
          <div className="space-y-3 text-left">
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-300 font-semibold text-sm">Why is this required?</p>
                  <p className="text-gray-400 text-sm mt-1">
                    Ad blockers can interfere with exam proctoring, camera access, and
                    other essential security features.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="text-yellow-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-yellow-300 font-semibold text-sm">How to disable:</p>
                  <p className="text-gray-400 text-sm mt-1">
                    Click the extension icon in your browser toolbar and disable it for this site.
                    Then refresh the page.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleRefresh}
          disabled={retrying}
          className="group relative w-full px-8 py-4 rounded-2xl font-bold text-base bg-gradient-to-r from-red-500 to-orange-500 text-white hover:from-red-400 hover:to-orange-400 disabled:opacity-50 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-red-500/25 hover:shadow-red-500/40 overflow-hidden"
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            {retrying ? (
              <>
                <RefreshCcw size={20} className="animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <RefreshCcw size={20} className="group-hover:rotate-180 transition-transform duration-500" />
                I've disabled it — Refresh
              </>
            )}
          </span>
        </button>

        {/* Timer info */}
        <p className="text-gray-600 text-xs mt-6">
          Page blocked for {secondsElapsed} second{secondsElapsed !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}
