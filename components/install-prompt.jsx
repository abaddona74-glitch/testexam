"use client";
import { useEffect, useState } from "react";
import { Download, X, Smartphone } from "lucide-react";

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    // Check local storage for dismissal
    const isForeverDismissed = localStorage.getItem('installPromptDismissedForever');
    const dismissedUntil = localStorage.getItem('installPromptDismissedUntil');
    const now = new Date().getTime();

    if (isForeverDismissed === 'true') {
      return;
    }

    if (dismissedUntil && now < parseInt(dismissedUntil)) {
      return;
    }

    // Check if device is iOS
    const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(isIosDevice);

    const handler = (e) => {
      // Prevent browser's default mini-infobar
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Show the prompts
      setIsVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Also check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsVisible(false);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
      setIsVisible(false);
    }
    
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    if (dontShowAgain) {
      localStorage.setItem('installPromptDismissedForever', 'true');
    } else {
      const tomorrow = new Date().getTime() + 24 * 60 * 60 * 1000;
      localStorage.setItem('installPromptDismissedUntil', tomorrow.toString());
    }
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 animate-in slide-in-from-bottom duration-500">
      <div className="flex justify-between items-start mb-3">
        <div className="flex gap-3">
          <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center shrink-0">
            <Smartphone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Ilovani o‘rnatish</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-snug">
              Tezkor kirish va oflayn ishlash uchun ilovani telefoningizga o‘rnating.
            </p>
          </div>
        </div>
        <button 
          onClick={() => setIsVisible(false)} 
          className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 p-1"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex items-center gap-2 mb-3 px-1">
        <input
          type="checkbox"
          id="dont-show"
          checked={dontShowAgain}
          onChange={(e) => setDontShowAgain(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
        />
        <label htmlFor="dont-show" className="text-xs text-gray-600 dark:text-gray-300 cursor-pointer select-none">
          Boshqa ko‘rsatilmasin
        </label>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleInstallClick}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold shadow-sm transition-colors flex items-center justify-center gap-2"
        >
          <Download className="h-4 w-4" />
          O‘rnatish
        </button>
        <button
          onClick={handleDismiss}
          className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          Keyinroq
        </button>
      </div>
      
      {/* iOS instructions specific hint if needed, though 'beforeinstallprompt' doesn't fire on iOS usually */}
      {isIOS && (
        <p className="text-[10px] text-gray-400 mt-2 text-center">
          iOS da o‘rnatish uchun "Share" tugmasini bosib, "Add to Home Screen" ni tanlang.
        </p>
      )}
    </div>
  );
}
