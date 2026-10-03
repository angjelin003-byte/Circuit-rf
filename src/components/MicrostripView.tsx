import React, { useState, useMemo } from 'react';
import { MicrostripEngine, SUBSTRATES } from '../engine/microstrip';
import { SubstrateMaterial } from '../types/circuit';
import { Cpu, ArrowRightLeft, Layers, Sliders, Check } from 'lucide-react';

interface MicrostripViewProps {
  freqMHz: number;
  onApplyLineToCircuit?: (z0: number, lengthMm: number, er: number) => void;
}

export const MicrostripView: React.FC<MicrostripViewProps> = ({
  freqMHz,
  onApplyLineToCircuit,
}) => {
  const [selectedSubstrate, setSelectedSubstrate] = useState<SubstrateMaterial>(SUBSTRATES[0]);
  const [calcMode, setCalcMode] = useState<'synthesis' | 'analysis'>('synthesis');

  // Input states
  const [targetZ0, setTargetZ0] = useState<number>(50.0);
  const [widthMm, setWidthMm] = useState<number>(1.85);
  const [heightMm, setHeightMm] = useState<number>(0.813); // typical 32mil RO4350B
  const [copperThicknessUm, setCopperThicknessUm] = useState<number>(35); // 1oz copper
  const [lengthMm, setLengthMm] = useState<number>(15.0);
  const [targetThetaDeg, setTargetThetaDeg] = useState<number>(90.0); // quarter wave

  const freqGHz = freqMHz / 1000;

  // Synthesis calculation: Z0 -> W
  const synthesizedWidth = useMemo(() => {
    return MicrostripEngine.synthesize(targetZ0, heightMm, selectedSubstrate.er, freqGHz);
  }, [targetZ0, heightMm, selectedSubstrate, freqGHz]);

  // Active width based on mode
  const activeWidthMm = calcMode === 'synthesis' ? synthesizedWidth : widthMm;

  // Full calculation package
  const results = useMemo(() => {
    return MicrostripEngine.calculate(
      activeWidthMm,
      heightMm,
      lengthMm,
      selectedSubstrate,
      freqGHz,
      copperThicknessUm / 1000
    );
  }, [activeWidthMm, heightMm, lengthMm, selectedSubstrate, freqGHz, copperThicknessUm]);

  // Physical length for target electrical length (e.g. 90 deg quarter wave)
  const quarterWaveMm = results.lambdaGuidedMm / 4;
  const targetLengthForThetaMm = (targetThetaDeg / 360) * results.lambdaGuidedMm;

  return (
    <div className="flex flex-col rounded-2xl bg-slate-950 border border-slate-800/80 p-3 shadow-xl select-none">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/60 text-xs">
        <div className="flex items-center gap-1.5 font-bold tracking-wider text-slate-100 uppercase text-[11px]">
          <Cpu className="w-4 h-4 text-sky-400" />
          <span>Microstrip & Planar EM Synthesis</span>
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-800">
          <button
            onClick={() => setCalcMode('synthesis')}
            className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition cursor-pointer ${
              calcMode === 'synthesis' ? 'bg-sky-500 text-white font-bold shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Synthesis (Z₀ → Width)
          </button>
          <button
            onClick={() => setCalcMode('analysis')}
            className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition cursor-pointer ${
              calcMode === 'analysis' ? 'bg-sky-500 text-white font-bold shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Analysis (Width → Z₀)
          </button>
        </div>
      </div>

      {/* Substrate Material Selector */}
      <div className="my-2.5">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
          Substrate Dielectric Material
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {SUBSTRATES.map((sub) => (
            <button
              key={sub.id}
              onClick={() => setSelectedSubstrate(sub)}
              className={`p-1.5 rounded-lg border text-left transition cursor-pointer ${
                selectedSubstrate.id === sub.id
                  ? 'bg-sky-500/10 border-sky-500 text-white'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="text-[11px] font-semibold truncate text-slate-200">{sub.name.split(' (')[0]}</div>
              <div className="text-[9px] font-mono text-sky-400">εr = {sub.er.toFixed(2)} | tanδ = {sub.lossTangent}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Physical Microstrip Cross-Section Graphic */}
      <div className="my-2 p-3 rounded-xl bg-slate-950/80 border border-slate-900 flex flex-col items-center">
        <div className="w-full max-w-[280px] h-[90px] relative flex flex-col justify-end">
          {/* Top Microstrip Trace */}
          <div className="flex justify-center mb-0.5">
            <div
              style={{
                width: `${Math.min(220, Math.max(25, (activeWidthMm / (heightMm * 3)) * 120))}px`,
                height: '8px',
              }}
              className="bg-amber-400 rounded-t-sm shadow-md shadow-amber-500/20 border-t border-x border-amber-300 relative group"
            >
              <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] font-mono font-bold text-amber-300 whitespace-nowrap">
                W = {activeWidthMm.toFixed(2)} mm
              </span>
            </div>
          </div>

          {/* Dielectric Substrate Layer */}
          <div className="w-full h-[40px] bg-gradient-to-b from-slate-700 to-slate-800 rounded-sm border border-slate-600 flex items-center justify-between px-3 text-[10px] font-mono text-slate-300 relative">
            <span>Dielectric (εr = {selectedSubstrate.er})</span>
            <span className="text-slate-400 text-[9px]">h = {heightMm} mm</span>
          </div>

          {/* Bottom Ground Plane */}
          <div className="w-full h-[8px] bg-amber-500/80 rounded-b-sm border-b border-x border-amber-400/60 relative">
            <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[8px] font-mono text-slate-400 whitespace-nowrap">
              Continuous Ground Plane
            </span>
          </div>
        </div>
      </div>

      {/* Numerical Sliders & Inputs */}
      <div className="grid grid-cols-2 gap-2 my-2 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
        {calcMode === 'synthesis' ? (
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-slate-400">Target Z₀ Impedance:</span>
              <span className="font-mono font-bold text-sky-400">{targetZ0.toFixed(1)} Ω</span>
            </div>
            <input
              type="range"
              min={15}
              max={130}
              step={0.5}
              value={targetZ0}
              onChange={(e) => setTargetZ0(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
            />
          </div>
        ) : (
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-slate-400">Trace Width (W):</span>
              <span className="font-mono font-bold text-sky-400">{widthMm.toFixed(2)} mm</span>
            </div>
            <input
              type="range"
              min={0.1}
              max={8.0}
              step={0.05}
              value={widthMm}
              onChange={(e) => setWidthMm(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
            />
          </div>
        )}

        <div>
          <div className="flex justify-between text-[11px] mb-1">
            <span className="text-slate-400">Substrate Height (h):</span>
            <span className="font-mono font-bold text-emerald-400">{heightMm.toFixed(3)} mm</span>
          </div>
          <input
            type="range"
            min={0.1}
            max={2.5}
            step={0.05}
            value={heightMm}
            onChange={(e) => setHeightMm(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
          />
        </div>

        <div>
          <div className="flex justify-between text-[11px] mb-1">
            <span className="text-slate-400">Physical Length (L):</span>
            <span className="font-mono font-bold text-purple-400">{lengthMm.toFixed(1)} mm</span>
          </div>
          <input
            type="range"
            min={1}
            max={60}
            step={0.5}
            value={lengthMm}
            onChange={(e) => setLengthMm(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-400"
          />
        </div>

        <div>
          <div className="flex justify-between text-[11px] mb-1">
            <span className="text-slate-400">Quarter-Wave (λ/4):</span>
            <span className="font-mono font-bold text-amber-400">{quarterWaveMm.toFixed(2)} mm</span>
          </div>
          <button
            onClick={() => setLengthMm(Math.round(quarterWaveMm * 100) / 100)}
            className="w-full py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono cursor-pointer transition"
          >
            Set L = λ/4 (90°)
          </button>
        </div>
      </div>

      {/* Output Results Grid */}
      <div className="grid grid-cols-3 gap-1.5 text-center font-mono">
        <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-[9px] text-slate-400 uppercase">Characteristic Z₀</div>
          <div className="text-xs font-bold text-sky-400">{results.z0.toFixed(2)} Ω</div>
        </div>

        <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-[9px] text-slate-400 uppercase">Effective εr_eff</div>
          <div className="text-xs font-bold text-emerald-400">{results.erEff.toFixed(3)}</div>
        </div>

        <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-[9px] text-slate-400 uppercase">Guided λg</div>
          <div className="text-xs font-bold text-purple-400">{results.lambdaGuidedMm.toFixed(2)} mm</div>
        </div>

        <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-[9px] text-slate-400 uppercase">Electrical Length θ</div>
          <div className="text-xs font-bold text-amber-400">{results.electricalLengthDeg.toFixed(1)}°</div>
        </div>

        <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-[9px] text-slate-400 uppercase">Total Attenuation</div>
          <div className="text-xs font-bold text-rose-400">{results.attenuationDbPerM.toFixed(2)} dB/m</div>
        </div>

        <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-[9px] text-slate-400 uppercase">Phase Velocity</div>
          <div className="text-xs font-bold text-slate-200">{(results.phaseVelocityMps / 1e8).toFixed(2)} × 10⁸ m/s</div>
        </div>
      </div>
    </div>
  );
};
