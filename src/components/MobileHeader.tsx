import React from 'react';
import { RFPreset } from '../types/circuit';
import { CIRCUIT_PRESETS } from '../presets/circuits';
import { PWAInstallButton } from './PWAInstallButton';
import { Radio, Zap, FileText, GitBranch, ChevronDown } from 'lucide-react';

interface MobileHeaderProps {
  currentPreset: RFPreset;
  onSelectPreset: (preset: RFPreset) => void;
  onOpenMatchingModal: () => void;
  onOpenTouchstoneModal: () => void;
  onOpenGitHubModal: () => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  currentPreset,
  onSelectPreset,
  onOpenMatchingModal,
  onOpenTouchstoneModal,
  onOpenGitHubModal,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-2.5 py-1.5">
      <div className="flex items-center justify-between gap-2 max-w-5xl mx-auto">
        {/* Brand & Preset Dropdown */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-500 to-blue-700 flex items-center justify-center shadow-md shadow-sky-500/20 shrink-0 border border-sky-400/40">
            <Radio className="w-3.5 h-3.5 text-white animate-pulse" />
          </div>

          <div className="min-w-0 flex items-center gap-1.5">
            <span className="text-[11px] font-black tracking-wider text-sky-400 uppercase font-mono shrink-0">
              CircuitRF
            </span>

            {/* Custom Preset Selector */}
            <div className="relative inline-block text-left">
              <select
                value={currentPreset.id}
                onChange={(e) => {
                  const found = CIRCUIT_PRESETS.find((p) => p.id === e.target.value);
                  if (found) onSelectPreset(found);
                }}
                className="appearance-none bg-slate-900 border border-slate-800 rounded-md px-2 py-0.5 font-semibold text-xs text-white pr-5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-sky-500 truncate max-w-[140px] xs:max-w-[200px]"
              >
                {CIRCUIT_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id} className="bg-slate-900 text-slate-100">
                    {preset.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Quick Action Tools */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onOpenMatchingModal}
            className="flex items-center gap-1 px-1.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-800 text-[10px] font-semibold transition cursor-pointer"
            title="Auto Impedance Matching Synthesizer"
          >
            <Zap className="w-3 h-3" />
            <span className="hidden sm:inline">Match</span>
          </button>

          <button
            onClick={onOpenTouchstoneModal}
            className="flex items-center gap-1 px-1.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-sky-400 border border-slate-800 text-[10px] font-semibold transition cursor-pointer"
            title="Touchstone S2P File Exchange"
          >
            <FileText className="w-3 h-3" />
            <span className="hidden sm:inline">S2P</span>
          </button>

          <button
            onClick={onOpenGitHubModal}
            className="flex items-center gap-1 px-1.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-slate-800 text-[10px] font-semibold transition cursor-pointer"
            title="GitHub CI/CD & Deployment Instructions"
          >
            <GitBranch className="w-3 h-3" />
            <span className="hidden sm:inline">CI/CD</span>
          </button>

          <PWAInstallButton />
        </div>
      </div>
    </header>
  );
};
