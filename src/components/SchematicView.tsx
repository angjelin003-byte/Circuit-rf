import React from 'react';
import { RFComponent } from '../types/circuit';
import { Sliders, ToggleLeft, ToggleRight, Trash2, Plus, Zap, Activity } from 'lucide-react';

interface SchematicViewProps {
  components: RFComponent[];
  onUpdateComponent: (id: string, updates: Partial<RFComponent>) => void;
  onToggleComponent: (id: string) => void;
  onAddComponent: (type: RFComponent['type']) => void;
  onDeleteComponent: (id: string) => void;
  z0?: number;
}

export const SchematicView: React.FC<SchematicViewProps> = ({
  components,
  onUpdateComponent,
  onToggleComponent,
  onAddComponent,
  onDeleteComponent,
  z0 = 50,
}) => {
  return (
    <div className="flex flex-col rounded-2xl bg-slate-950 border border-slate-800/80 p-3 shadow-xl select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/60 text-xs">
        <div className="flex items-center gap-1.5 font-bold tracking-wider text-slate-100 uppercase text-[11px]">
          <Activity className="w-4 h-4 text-sky-400" />
          <span>Schematic & Real-Time Tuning</span>
        </div>

        {/* Quick Add Dropdown / Button */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onAddComponent('capacitor_series')}
            className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-sky-400 border border-slate-800 text-[10px] font-mono cursor-pointer"
          >
            +C
          </button>
          <button
            onClick={() => onAddComponent('inductor_series')}
            className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-slate-800 text-[10px] font-mono cursor-pointer"
          >
            +L
          </button>
          <button
            onClick={() => onAddComponent('transmission_line')}
            className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-800 text-[10px] font-mono cursor-pointer"
          >
            +TLine
          </button>
          <button
            onClick={() => onAddComponent('open_stub')}
            className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-purple-400 border border-slate-800 text-[10px] font-mono cursor-pointer"
          >
            +Stub
          </button>
        </div>
      </div>

      {/* Visual Cascade Flow */}
      <div className="my-2.5 p-2 rounded-xl bg-slate-900/60 border border-slate-800/80 overflow-x-auto scrollbar-thin">
        <div className="flex items-center gap-1 min-w-max py-1">
          {/* Port 1 Source */}
          <div className="flex flex-col items-center justify-center w-14 h-14 rounded-lg bg-sky-950/80 border border-sky-800 text-center shrink-0">
            <span className="text-[10px] font-bold text-sky-300">PORT 1</span>
            <span className="text-[9px] font-mono text-slate-400">{z0}Ω</span>
          </div>

          <div className="w-4 h-0.5 bg-sky-500/60" />

          {/* Cascaded Components */}
          {components.map((comp, idx) => (
            <React.Fragment key={`block-${comp.id}`}>
              <div
                className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition min-w-[76px] h-14 shrink-0 ${
                  comp.enabled
                    ? 'bg-slate-900 border-slate-700 shadow-sm'
                    : 'bg-slate-950/40 border-slate-800 opacity-40'
                }`}
              >
                <span className="text-[10px] font-bold text-slate-200 truncate max-w-[68px]">
                  {comp.name.split(' ')[0]}
                </span>
                <span className="text-[11px] font-mono font-bold text-sky-400">
                  {comp.value} {comp.unit}
                </span>
              </div>

              {idx < components.length - 1 && <div className="w-3 h-0.5 bg-slate-700 shrink-0" />}
            </React.Fragment>
          ))}

          <div className="w-4 h-0.5 bg-emerald-500/60" />

          {/* Port 2 Load */}
          <div className="flex flex-col items-center justify-center w-14 h-14 rounded-lg bg-emerald-950/80 border border-emerald-800 text-center shrink-0">
            <span className="text-[10px] font-bold text-emerald-300">PORT 2</span>
            <span className="text-[9px] font-mono text-slate-400">{z0}Ω</span>
          </div>
        </div>
      </div>

      {/* Component Tuning Card List */}
      <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
        {components.map((comp) => (
          <div
            key={comp.id}
            className={`p-2.5 rounded-xl border transition ${
              comp.enabled
                ? 'bg-slate-900/80 border-slate-800'
                : 'bg-slate-950/50 border-slate-900 opacity-50'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onToggleComponent(comp.id)}
                  className="cursor-pointer text-slate-400 hover:text-white"
                  title="Enable/Disable Component"
                >
                  {comp.enabled ? (
                    <ToggleRight className="w-5 h-5 text-sky-400" />
                  ) : (
                    <ToggleLeft className="w-5 h-5 text-slate-600" />
                  )}
                </button>
                <span className="text-xs font-semibold text-slate-200">{comp.name}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                  {comp.type.replace('_', ' ')}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-sky-400">
                  {comp.value} {comp.unit}
                </span>
                <button
                  onClick={() => onDeleteComponent(comp.id)}
                  className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 cursor-pointer"
                  title="Delete element"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Primary Slider */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={comp.min}
                  max={comp.max}
                  step={comp.step}
                  value={comp.value}
                  disabled={!comp.enabled}
                  onChange={(e) =>
                    onUpdateComponent(comp.id, { value: parseFloat(e.target.value) })
                  }
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400 disabled:opacity-30"
                />
              </div>
            </div>

            {/* Secondary Parameter Slider (if applicable, e.g. electrical length, bias) */}
            {comp.secondaryValue !== undefined && comp.secondaryUnit && (
              <div className="mt-2 pt-2 border-t border-slate-800/60">
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">
                    {comp.type === 'transistor_active'
                      ? 'Bias Current (Ids):'
                      : comp.type === 'attenuator_pad'
                      ? 'Reference Z0:'
                      : 'Electrical Length (θ):'}
                  </span>
                  <span className="font-mono font-bold text-amber-400">
                    {comp.secondaryValue} {comp.secondaryUnit}
                  </span>
                </div>
                <input
                  type="range"
                  min={comp.secondaryMin ?? 1}
                  max={comp.secondaryMax ?? 180}
                  step={comp.secondaryStep ?? 1}
                  value={comp.secondaryValue}
                  disabled={!comp.enabled}
                  onChange={(e) =>
                    onUpdateComponent(comp.id, {
                      secondaryValue: parseFloat(e.target.value),
                    })
                  }
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400 disabled:opacity-30"
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
