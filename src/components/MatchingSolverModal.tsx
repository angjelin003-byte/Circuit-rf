import React, { useState } from 'react';
import { MatchingSynthesizer, MatchingSolution } from '../engine/matchingSynthesizer';
import { RFComponent } from '../types/circuit';
import { GitCompare, Check, X, ArrowRight, Zap } from 'lucide-react';

interface MatchingSolverModalProps {
  isOpen: boolean;
  onClose: () => void;
  freqMHz: number;
  z0?: number;
  onApplySolution: (components: RFComponent[]) => void;
  onSelectSolutionForSmith: (sol: MatchingSolution) => void;
}

export const MatchingSolverModal: React.FC<MatchingSolverModalProps> = ({
  isOpen,
  onClose,
  freqMHz,
  z0 = 50,
  onApplySolution,
  onSelectSolutionForSmith,
}) => {
  const [rs, setRs] = useState(50);
  const [xs, setXs] = useState(0);
  const [rl, setRl] = useState(18);
  const [xl, setXl] = useState(25);

  if (!isOpen) return null;

  const solutions = MatchingSynthesizer.synthesizeLMatch(rs, xs, rl, xl, freqMHz, z0);

  const applySolution = (sol: MatchingSolution) => {
    const newComps: RFComponent[] = [];

    if (sol.topology.includes('Low-Pass')) {
      if (sol.cValuePf) {
        newComps.push({
          id: `match_c_${Date.now()}`,
          name: 'C_match (Shunt)',
          type: 'capacitor_shunt',
          value: Math.round(sol.cValuePf * 100) / 100,
          unit: 'pF',
          min: 0.1,
          max: Math.ceil(sol.cValuePf * 3),
          step: 0.1,
          enabled: true,
        });
      }
      if (sol.lValueNh) {
        newComps.push({
          id: `match_l_${Date.now() + 1}`,
          name: 'L_match (Series)',
          type: 'inductor_series',
          value: Math.round(sol.lValueNh * 100) / 100,
          unit: 'nH',
          min: 0.1,
          max: Math.ceil(sol.lValueNh * 3),
          step: 0.1,
          enabled: true,
        });
      }
    } else if (sol.topology.includes('High-Pass')) {
      if (sol.lValueNh) {
        newComps.push({
          id: `match_l_sh_${Date.now()}`,
          name: 'L_match (Shunt)',
          type: 'inductor_shunt',
          value: Math.round(sol.lValueNh * 100) / 100,
          unit: 'nH',
          min: 0.1,
          max: Math.ceil(sol.lValueNh * 3),
          step: 0.1,
          enabled: true,
        });
      }
      if (sol.cValuePf) {
        newComps.push({
          id: `match_c_ser_${Date.now() + 1}`,
          name: 'C_match (Series)',
          type: 'capacitor_series',
          value: Math.round(sol.cValuePf * 100) / 100,
          unit: 'pF',
          min: 0.1,
          max: Math.ceil(sol.cValuePf * 3),
          step: 0.1,
          enabled: true,
        });
      }
    } else if (sol.z0Line && sol.lengthMmLine) {
      newComps.push({
        id: `match_qwave_${Date.now()}`,
        name: 'λ/4 Transformer',
        type: 'transmission_line',
        value: sol.z0Line,
        unit: 'Ω',
        min: 20,
        max: 120,
        step: 0.5,
        secondaryValue: 90,
        secondaryUnit: '°',
        enabled: true,
      });
    }

    onApplySolution(newComps);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-2xl text-slate-100 flex flex-col max-h-[88vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <h3 className="font-semibold text-white text-sm">Automated L-Match Synthesizer</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Impedance Inputs */}
        <div className="grid grid-cols-2 gap-3 my-3 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider block mb-1">
              Source (Zs)
            </span>
            <div className="space-y-1.5 font-mono">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Rs:</span>
                <input
                  type="number"
                  value={rs}
                  onChange={(e) => setRs(parseFloat(e.target.value) || 0)}
                  className="w-16 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-right text-white"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Xs:</span>
                <input
                  type="number"
                  value={xs}
                  onChange={(e) => setXs(parseFloat(e.target.value) || 0)}
                  className="w-16 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-right text-white"
                />
              </div>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">
              Load (ZL)
            </span>
            <div className="space-y-1.5 font-mono">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">RL:</span>
                <input
                  type="number"
                  value={rl}
                  onChange={(e) => setRl(parseFloat(e.target.value) || 0)}
                  className="w-16 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-right text-white"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">XL:</span>
                <input
                  type="number"
                  value={xl}
                  onChange={(e) => setXl(parseFloat(e.target.value) || 0)}
                  className="w-16 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-right text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Synthesized Solutions */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Synthesized Solutions @ {freqMHz} MHz
          </div>

          {solutions.length === 0 ? (
            <div className="p-3 text-center text-xs text-slate-400 bg-slate-950 rounded-xl">
              No matching required (Impedance already matched)
            </div>
          ) : (
            solutions.map((sol, idx) => (
              <div
                key={`sol-${idx}`}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 hover:border-slate-700 transition"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300">{sol.name}</span>
                  <span className="text-[10px] font-mono text-slate-400">Q = {sol.qFactor.toFixed(2)}</span>
                </div>

                <div className="text-xs text-slate-300 font-mono flex items-center gap-3">
                  {sol.cValuePf !== undefined && (
                    <span className="text-sky-400 font-bold">C = {sol.cValuePf.toFixed(2)} pF</span>
                  )}
                  {sol.lValueNh !== undefined && (
                    <span className="text-emerald-400 font-bold">L = {sol.lValueNh.toFixed(2)} nH</span>
                  )}
                  {sol.z0Line !== undefined && (
                    <span className="text-purple-400 font-bold">Z₀ = {sol.z0Line} Ω</span>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => onSelectSolutionForSmith(sol)}
                    className="flex-1 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition cursor-pointer"
                  >
                    View Trajectory
                  </button>
                  <button
                    onClick={() => applySolution(sol)}
                    className="flex-1 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-[11px] font-semibold transition cursor-pointer"
                  >
                    Apply to Circuit
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
