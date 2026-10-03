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
    <div className="flex flex-col gap-2">
      {/* Workbench Subheader / View Mode Selector */}
      <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800/80 rounded-lg px-2.5 py-1 backdrop-blur-sm">
        <div className="flex items-center gap-1.5">
          <div className="flex -space-x-1 items-center">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          </div>
          <span className="text-[11px] font-semibold text-slate-200">
            Interactive RF Workbench
          </span>
          <span className="hidden xs:inline-block text-[9px] text-slate-400 font-mono bg-slate-800/90 px-1 py-0.2 rounded">
            Live Smith & Schematic Sync
          </span>
        </div>

        {/* Layout Mode Switcher */}
        <div className="flex items-center bg-slate-950/80 border border-slate-800/80 rounded-md p-0.5">
          <button
            onClick={() => setLayout('both')}
            title="Split View (Both Smith Chart and Schematic)"
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
              layout === 'both'
                ? 'bg-sky-500/20 text-sky-300 font-semibold shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <SplitSquareVertical className="w-3 h-3" />
            <span>Both</span>
          </button>

          <button
            onClick={() => setLayout('smith')}
            title="Smith Chart Only"
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
              layout === 'smith'
                ? 'bg-sky-500/20 text-sky-300 font-semibold shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-3 h-3" />
            <span>Smith</span>
          </button>

          <button
            onClick={() => setLayout('schematic')}
            title="Schematic Only"
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
              layout === 'schematic'
                ? 'bg-sky-500/20 text-sky-300 font-semibold shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3 h-3" />
            <span>Schematic</span>
          </button>
        </div>
      </div>

      {/* Main Content Area based on Layout */}
      {layout === 'both' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-start">
          {/* Smith Chart - Left Column on Desktop / Top on Mobile */}
          <div className="lg:col-span-6 w-full">
            <SmithChart
              sPoints={sPoints}
              markerFreqMHz={markerFreqMHz}
              onMarkerFreqChange={onMarkerFreqChange}
              z0={z0}
              loadpullResult={loadpullResult}
              matchingSolution={matchingSolution}
            />
          </div>

          {/* Schematic & Tuner - Right Column on Desktop / Bottom on Mobile */}
          <div className="lg:col-span-6 w-full">
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
        <div className="w-full">
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
        <div className="w-full">
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
