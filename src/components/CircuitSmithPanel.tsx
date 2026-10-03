import React, { useState } from 'react';
import { RFComponent, SParameterPoint, LoadpullResult } from '../types/circuit';
import { MatchingSolution } from '../engine/matchingSynthesizer';
import { SmithChart } from './SmithChart';
import { SchematicView } from './SchematicView';
import { Compass, Sliders, SplitSquareVertical } from 'lucide-react';

export type WorkbenchLayout = 'both' | 'smith' | 'schematic';

interface CircuitSmithPanelProps {
  components: RFComponent[];
  onUpdateComponent: (id: string, updates: Partial<RFComponent>) => void;
  onToggleComponent: (id: string) => void;
  onAddComponent: (type: RFComponent['type']) => void;
  onDeleteComponent: (id: string) => void;
  z0: number;
  sPoints: SParameterPoint[];
  markerFreqMHz: number;
  onMarkerFreqChange: (freq: number) => void;
  loadpullResult?: LoadpullResult | null;
  matchingSolution?: MatchingSolution | null;
}

export const CircuitSmithPanel: React.FC<CircuitSmithPanelProps> = ({
  components,
  onUpdateComponent,
  onToggleComponent,
  onAddComponent,
  onDeleteComponent,
  z0,
  sPoints,
  markerFreqMHz,
  onMarkerFreqChange,
  loadpullResult,
  matchingSolution,
}) => {
  const [layout, setLayout] = useState<WorkbenchLayout>('both');

  return (
    <div className="h-full flex-1 min-h-0 flex flex-col overflow-hidden gap-1">
      {/* Workbench Subheader / View Mode Selector */}
      <div className="shrink-0 flex items-center justify-between bg-slate-900/80 border border-slate-800/80 rounded-lg px-2 py-0.5 backdrop-blur-sm">
        <div className="flex items-center gap-1.5">
          <div className="flex -space-x-1 items-center">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          </div>
          <span className="text-[10px] font-semibold text-slate-200">
            RF Workbench
          </span>
          <span className="hidden xs:inline-block text-[8px] text-slate-400 font-mono bg-slate-800/90 px-1 py-0.2 rounded">
            Smith & Schematic
          </span>
        </div>

        {/* Layout Mode Switcher */}
        <div className="flex items-center bg-slate-950/80 border border-slate-800/80 rounded-md p-0.5">
          <button
            onClick={() => setLayout('both')}
            title="Split View (Both Smith Chart and Schematic)"
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors cursor-pointer ${
              layout === 'both'
                ? 'bg-sky-500/20 text-sky-300 font-semibold shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <SplitSquareVertical className="w-2.5 h-2.5" />
            <span>Both</span>
          </button>

          <button
            onClick={() => setLayout('smith')}
            title="Smith Chart Only"
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors cursor-pointer ${
              layout === 'smith'
                ? 'bg-sky-500/20 text-sky-300 font-semibold shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-2.5 h-2.5" />
            <span>Smith</span>
          </button>

          <button
            onClick={() => setLayout('schematic')}
            title="Schematic Only"
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors cursor-pointer ${
              layout === 'schematic'
                ? 'bg-sky-500/20 text-sky-300 font-semibold shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-2.5 h-2.5" />
            <span>Schematic</span>
          </button>
        </div>
      </div>

      {/* Main Content Area based on Layout - Locked to 100% available viewport */}
      {layout === 'both' && (
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-1 overflow-hidden">
          {/* Smith Chart - Top on Mobile / Left on Desktop */}
          <div className="flex-1 min-h-0 h-[48%] lg:h-full lg:w-1/2 overflow-hidden">
            <SmithChart
              sPoints={sPoints}
              markerFreqMHz={markerFreqMHz}
              onMarkerFreqChange={onMarkerFreqChange}
              z0={z0}
              loadpullResult={loadpullResult}
              matchingSolution={matchingSolution}
            />
          </div>

          {/* Schematic & Tuner - Bottom on Mobile / Right on Desktop */}
          <div className="flex-1 min-h-0 h-[52%] lg:h-full lg:w-1/2 overflow-hidden">
            <SchematicView
              components={components}
              onUpdateComponent={onUpdateComponent}
              onToggleComponent={onToggleComponent}
              onAddComponent={onAddComponent}
              onDeleteComponent={onDeleteComponent}
              z0={z0}
            />
          </div>
        </div>
      )}

      {layout === 'smith' && (
        <div className="flex-1 min-h-0 h-full w-full overflow-hidden">
          <SmithChart
            sPoints={sPoints}
            markerFreqMHz={markerFreqMHz}
            onMarkerFreqChange={onMarkerFreqChange}
            z0={z0}
            loadpullResult={loadpullResult}
            matchingSolution={matchingSolution}
          />
        </div>
      )}

      {layout === 'schematic' && (
        <div className="flex-1 min-h-0 h-full w-full overflow-hidden">
          <SchematicView
            components={components}
            onUpdateComponent={onUpdateComponent}
            onToggleComponent={onToggleComponent}
            onAddComponent={onAddComponent}
            onDeleteComponent={onDeleteComponent}
            z0={z0}
          />
        </div>
      )}
    </div>
  );
};
