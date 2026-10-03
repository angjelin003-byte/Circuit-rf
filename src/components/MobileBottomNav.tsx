import React from 'react';
import { Compass, Activity, Zap, Cpu } from 'lucide-react';

export type ActiveTab = 'circuit-smith' | 'sparams' | 'harmonic' | 'microstrip';

interface MobileBottomNavProps {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onChangeTab,
}) => {
  const tabs = [
    { id: 'circuit-smith' as ActiveTab, label: 'Circuit & Smith', icon: Compass },
    { id: 'sparams' as ActiveTab, label: 'S-Params', icon: Activity },
    { id: 'harmonic' as ActiveTab, label: 'Harmonic', icon: Zap },
    { id: 'microstrip' as ActiveTab, label: 'Microstrip', icon: Cpu },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800/80 px-1.5 py-0.5 pb-safe">
      <div className="flex items-center justify-around max-w-sm mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`flex flex-col items-center justify-center py-0.5 px-2 rounded-lg transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'text-sky-400 font-bold scale-102'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div
                className={`p-1 rounded-md transition-colors ${
                  isActive ? 'bg-sky-500/15 shadow-xs shadow-sky-500/20' : 'bg-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'stroke-[2.2]' : 'stroke-[1.8]'}`} />
              </div>
              <span className="text-[9px] tracking-tight leading-none mt-0.5">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
