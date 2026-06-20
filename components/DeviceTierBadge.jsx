'use client';

import { useState, useEffect } from 'react';
import { getTierLabel, getStoredDeviceTier, detectDeviceTier } from '@/lib/device-tier';
import { Monitor, Cpu, HardDrive } from 'lucide-react';

export default function DeviceTierBadge({ className = '' }) {
  const [info, setInfo] = useState(null);

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

  // Format GPU name: remove ANGLE wrapper, Direct3D/version clutter, duplicate vendors, hex IDs
  const formatGpuName = (raw) => {
    if (!raw) return null;
    let name = raw
      .replace(/^ANGLE \(([^)]+)\)/, '$1')           // Remove ANGLE(...) wrapper
      .replace(/ \(0x[0-9a-fA-F]+[^)]*\)/g, '')      // Remove (0x... hex) groups
      .replace(/Direct3D[^\s]*/g, '')                  // Remove Direct3D11 etc.
      .replace(/vs_\d+_\d+/g, '')                      // Remove vs_5_0 etc.
      .replace(/ps_\d+_\d+/g, '')                      // Remove ps_5_0 etc.
      .replace(/D3D\d+/g, '')                           // Remove D3D11 etc.
      .replace(/ \/ PCIe\/SSE2.*$/, '')                // Clean trailing / PCIe/SSE2...
      .replace(/ \/[\s\S]*$/, '')                     // Remove anything after /
      .replace(/,\s*AMD\s+/i, ' ')                     // Fix "AMD, AMD Radeon" → "AMD Radeon"
      .replace(/,\s*Intel\s+/i, ' ')                   // Fix "Intel, Intel" → "Intel"
      .replace(/,\s*NVIDIA\s+/i, ' ')                  // Fix "NVIDIA, NVIDIA" → "NVIDIA"
      .replace(/,?\s*\([^)]*\)/g, '')                 // Remove any remaining (...)
      .replace(/\s{2,}/g, ' ')                          // Collapse multiple spaces
      .trim();
    return name || null;
  };

  const gpuName = formatGpuName(info.details.gpuRenderer) ||
    (info.details.gpuTier === 'high' ? 'High-end GPU' :
     info.details.gpuTier === 'medium' ? 'Mid-range GPU' :
     'Basic GPU');

  return (
    <div className={`${className}`}>
      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 p-3.5 text-xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-medium text-gray-700 dark:text-gray-300">
            <Monitor size={13} />
            Device
          </span>
          <span className={`inline-flex items-center gap-1 font-bold ${label.color}`}>
            {label.icon} {label.name}
            <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${label.bg}`}>
              {info.score}/100
            </span>
          </span>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-1.5">
            <Cpu size={11} className="shrink-0" />
            <span className="truncate" title={`${info.details.cpuCores} cores`}>
              CPU: <span className="font-medium text-gray-800 dark:text-gray-200">{info.details.cpuCores} cores</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <HardDrive size={11} className="shrink-0" />
            <span>
              RAM: <span className="font-medium text-gray-800 dark:text-gray-200">
                {info.details.ram === 'N/A' ? 'N/A' : `${info.details.ram} GB`}
              </span>
            </span>
          </div>
          <div className="col-span-2 flex items-start gap-1.5">
            <Cpu size={11} className="shrink-0 mt-0.5" />
            <span className="min-w-0">
              GPU: <span className="font-medium text-gray-800 dark:text-gray-200" title={info.details.gpuRenderer || gpuName}>
                {gpuName}
              </span>
              {info.details.vramMB > 0 && (
                <span className="ml-1 text-[10px] px-1 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {info.details.vramMB >= 1024
                    ? `${(info.details.vramMB / 1024).toFixed(1)} GB`
                    : `${info.details.vramMB} MB`}
                </span>
              )}
            </span>
          </div>
        </div>

        <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight pt-0.5 border-t border-gray-100 dark:border-gray-800">
          {label.description} · Auto-detected from your browser
        </p>
      </div>
    </div>
  );
}
