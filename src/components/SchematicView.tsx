import React from 'react';
import { RFComponent } from '../types/circuit';
import { ToggleLeft, ToggleRight, Trash2, Activity, Minus, Plus } from 'lucide-react';

interface SchematicViewProps {
  components: RFComponent[];
  onUpdateComponent: (id: string, updates: Partial<RFComponent>) => void;
  onToggleComponent: (id: string) => void;
  onAddComponent: (type: RFComponent['type']) => void;
  onDeleteComponent: (id: string) => void;
  z0?: number;
  className?: string;
}

export const SchematicView: React.FC<SchematicViewProps> = ({
  components,
  onUpdateComponent,
  onToggleComponent,
  onAddComponent,
  onDeleteComponent,
  z0 = 50,
  className = '',
}) => {
  return (
    <div className={`h-full flex flex-col rounded-xl bg-slate-950 border border-slate-800/80 p-2 shadow-lg overflow-hidden select-none ${className}`}>
      {/* Header & Quick Add Element Buttons */}
      <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/60 text-xs shrink-0">
        <div className="flex items-center gap-1.5 font-bold tracking-wider text-slate-100 uppercase text-[10px]">
          <Activity className="w-3.5 h-3.5 text-sky-400" />
          <span>Schematic & Live Tuning</span>
        </div>

        {/* Quick Add Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onAddComponent('capacitor_series')}
            className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-sky-400 border border-slate-800 text-[9px] font-mono cursor-pointer transition active:scale-95"
            title="Add Series Capacitor"
          >
            +C
          </button>
          <button
            onClick={() => onAddComponent('inductor_series')}
            className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-slate-800 text-[9px] font-mono cursor-pointer transition active:scale-95"
            title="Add Series Inductor"
          >
            +L
          </button>
          <button
            onClick={() => onAddComponent('transmission_line')}
            className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-800 text-[9px] font-mono cursor-pointer transition active:scale-95"
            title="Add Transmission Line"
          >
            +TL
          </button>
          <button
            onClick={() => onAddComponent('open_stub')}
            className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-purple-400 border border-slate-800 text-[9px] font-mono cursor-pointer transition active:scale-95"
            title="Add Open Stub"
          >
            +Stub
          </button>
        </div>
      </div>

      {/* Visual Cascade Flow */}
      <div className="my-1 p-1 rounded-md bg-slate-900/60 border border-slate-800/80 overflow-x-auto scrollbar-thin shrink-0">
        <div className="flex items-center gap-1 min-w-max py-0.5">
          {/* Port 1 Source */}
          <div className="flex flex-col items-center justify-center w-10 h-9 rounded bg-sky-950/80 border border-sky-800/80 text-center shrink-0">
            <span className="text-[8px] font-bold text-sky-300 leading-none">P1</span>
            <span className="text-[8px] font-mono text-slate-400 leading-none mt-0.5">{z0}Ω</span>
          </div>

          <div className="w-2.5 h-0.5 bg-sky-500/60 shrink-0" />

          {/* Cascaded Components */}
          {components.map((comp, idx) => (
            <React.Fragment key={`block-${comp.id}`}>
              <div
                className={`flex flex-col items-center justify-center px-1.5 py-0.5 rounded border text-center transition min-w-[54px] h-9 shrink-0 ${
                  comp.enabled
                    ? 'bg-slate-900 border-slate-700 shadow-xs'
                    : 'bg-slate-950/40 border-slate-800 opacity-40'
                }`}
              >
                <span className="text-[8px] font-bold text-slate-300 truncate max-w-[50px] leading-tight">
                  {comp.name.split(' ')[0]}
                </span>
                <span className="text-[9px] font-mono font-bold text-sky-400 leading-tight">
                  {comp.value}{comp.unit}
                </span>
              </div>

              {idx < components.length - 1 && <div className="w-2 h-0.5 bg-slate-700 shrink-0" />}
            </React.Fragment>
          ))}

          <div className="w-2.5 h-0.5 bg-emerald-500/60 shrink-0" />

          {/* Port 2 Load */}
          <div className="flex flex-col items-center justify-center w-10 h-9 rounded bg-emerald-950/80 border border-emerald-800/80 text-center shrink-0">
            <span className="text-[8px] font-bold text-emerald-300 leading-none">P2</span>
            <span className="text-[8px] font-mono text-slate-400 leading-none mt-0.5">{z0}Ω</span>
          </div>
        </div>
      </div>

      {/* Component Tuning List - strictly contained and scrolls internally */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-0.5">
        {components.map((comp) => {
          const stepVal = comp.step ?? (comp.max - comp.min) / 100;
          return (
            <div
              key={comp.id}
              className={`p-1.5 rounded-lg border transition ${
                comp.enabled
                  ? 'bg-slate-900/80 border-slate-800'
                  : 'bg-slate-950/40 border-slate-900 opacity-50'
              }`}
            >
              {/* Row 1: Header info, Value and Delete */}
              <div className="flex items-center justify-between gap-1 text-[11px] mb-0.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <button
                    onClick={() => onToggleComponent(comp.id)}
                    className="cursor-pointer text-slate-400 hover:text-white shrink-0"
                    title={comp.enabled ? 'Disable component' : 'Enable component'}
                  >
                    {comp.enabled ? (
                      <ToggleRight className="w-3.5 h-3.5 text-sky-400" />
                    ) : (
                      <ToggleLeft className="w-3.5 h-3.5 text-slate-600" />
                    )}
                  </button>
                  <span className="font-semibold text-slate-200 truncate text-[10px]">
                    {comp.name}
                  </span>
                  <span className="text-[8px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 font-mono shrink-0">
                    {comp.type.replace('_', ' ')}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {/* Step decreaser */}
                  <button
                    onClick={() => {
                      const next = Math.max(comp.min, Number((comp.value - stepVal).toFixed(2)));
                      onUpdateComponent(comp.id, { value: next });
                    }}
                    disabled={!comp.enabled || comp.value <= comp.min}
                    className="w-4 h-4 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] cursor-pointer disabled:opacity-30"
                  >
                    <Minus className="w-2.5 h-2.5" />
                  </button>

                  <span className="text-[10px] font-mono font-bold text-sky-300 min-w-[44px] text-center">
                    {comp.value} {comp.unit}
                  </span>

                  {/* Step increaser */}
                  <button
                    onClick={() => {
                      const next = Math.min(comp.max, Number((comp.value + stepVal).toFixed(2)));
                      onUpdateComponent(comp.id, { value: next });
                    }}
                    disabled={!comp.enabled || comp.value >= comp.max}
                    className="w-4 h-4 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] cursor-pointer disabled:opacity-30"
                  >
                    <Plus className="w-2.5 h-2.5" />
                  </button>

                  <button
                    onClick={() => onDeleteComponent(comp.id)}
                    className="p-0.5 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 cursor-pointer ml-1"
                    title="Delete element"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Row 2: Smooth Range Slider */}
              <div className="flex items-center gap-1.5">
                <span className="text-[8px] font-mono text-slate-500 shrink-0 w-7 text-right">
                  {comp.min}
                </span>
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
                  className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-sky-400 disabled:opacity-30"
                />
                <span className="text-[8px] font-mono text-slate-500 shrink-0 w-7">
                  {comp.max}
                </span>
              </div>

              {/* Secondary Slider (for transmission line length / angle) */}
              {comp.secondaryValue !== undefined && comp.secondaryUnit && (
                <div className="mt-1 pt-0.5 border-t border-slate-800/50 flex items-center justify-between gap-1 text-[9px]">
                  <span className="text-slate-400 text-[8px] shrink-0">
                    {comp.type === 'transistor_active' ? 'Ids:' : 'θ:'}
                  </span>
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
                    className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-amber-400 disabled:opacity-30"
                  />
                  <span className="font-mono text-amber-300 shrink-0 text-[8px] min-w-[28px] text-right">
                    {comp.secondaryValue}{comp.secondaryUnit}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
