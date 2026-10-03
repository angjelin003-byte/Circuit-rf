import React from 'react';
import { Sliders, Compass, Activity, Zap, Cpu } from 'lucide-react';

export type ActiveTab = 'schematic' | 'smith' | 'sparams' | 'harmonic' | 'microstrip';

interface MobileBottomNavProps {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onChangeTab,
}) => {
  const tabs = [
    { id: 'schematic' as ActiveTab, label: 'Schematic', icon: Sliders },
    { id: 'smith' as ActiveTab, label: 'Smith Chart', icon: Compass },
    { id: 'sparams' as ActiveTab, label: 'S-Params', icon: Activity },
    { id: 'harmonic' as ActiveTab, label: 'Harmonic', icon: Zap },
    { id: 'microstrip' as ActiveTab, label: 'Microstrip', icon: Cpu },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-lg border-t border-slate-800/80 px-2 py-1.5 pb-safe">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'text-sky-400 font-bold scale-105'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div
                className={`p-1 rounded-lg transition-colors ${
                  isActive ? 'bg-sky-500/15 shadow-sm shadow-sky-500/20' : 'bg-transparent'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.2]' : 'stroke-[1.8]'}`} />
              </div>
              <span className="text-[10px] tracking-tight mt-0.5">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
