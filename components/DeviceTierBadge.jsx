'use client';

import { useState, useEffect } from 'react';
import { getTierLabel, getStoredDeviceTier, detectDeviceTier } from '@/lib/device-tier';
import { Monitor, Cpu, Wifi } from 'lucide-react';

export default function DeviceTierBadge({ className = '' }) {
  const [info, setInfo] = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    // Try reading from localStorage (set by auto-init)
    const stored = getStoredDeviceTier();
    if (stored) {
      setInfo(stored);
      return;
    }
    // Fallback: run detection directly
    setInfo(detectDeviceTier());
  }, []);

  if (!info) return null;

  const label = getTierLabel(info.tier);

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold transition-all ${label.bg} ${label.color} hover:scale-105 active:scale-95 cursor-pointer`}
        title="Device performance tier (auto-detected)"
      >
        <Monitor size={12} />
        <span>{label.icon}</span>
        <span className="hidden sm:inline">{label.name}</span>
      </button>

      {expanded && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setExpanded(false)} />
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 min-w-[200px]">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-3 text-xs">
              <div className="font-bold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-1.5">
                <Monitor size={14} />
                Device Tier
              </div>
              <div className="space-y-1.5 text-gray-600 dark:text-gray-400">
                <div className="flex justify-between">
                  <span className="flex items-center gap-1">
                    <Cpu size={11} /> CPU Cores:
                  </span>
                  <span className="font-mono font-medium text-gray-800 dark:text-gray-200">
                    {info.details.cpuCores || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-1">
                    <Wifi size={11} /> RAM:
                  </span>
                  <span className="font-mono font-medium text-gray-800 dark:text-gray-200">
                    {info.details.ram === 'N/A' ? 'N/A' : `${info.details.ram} GB`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>GPU:</span>
                  <span className="font-mono font-medium text-gray-800 dark:text-gray-200 capitalize">
                    {info.details.gpuTier}
                  </span>
                </div>
                <div className="pt-1.5 mt-1.5 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                  <span className="font-semibold">Tier:</span>
                  <span className={`inline-flex items-center gap-1 font-bold ${label.color}`}>
                    {label.icon} {label.name}
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  {label.description} · Score: {info.score}/100
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
