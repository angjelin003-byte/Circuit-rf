import React, { useState, useMemo } from 'react';
import { HarmonicBalanceEngine } from '../engine/harmonicBalance';
import { HarmonicBalanceResult } from '../types/circuit';
import { Zap, BarChart2, Radio, Gauge, Sliders, AlertCircle } from 'lucide-react';

interface HarmonicBalanceViewProps {
  centerFreqMHz: number;
  smallSignalGainDb?: number;
}

export const HarmonicBalanceView: React.FC<HarmonicBalanceViewProps> = ({
  centerFreqMHz,
  smallSignalGainDb = 14.5,
}) => {
  const [pinDbm, setPinDbm] = useState<number>(5.0);
  const [vds, setVds] = useState<number>(28.0); // GaN bias
  const [idsMa, setIdsMa] = useState<number>(100.0);

  // Run Harmonic Balance simulation
  const hbResult: HarmonicBalanceResult = useMemo(() => {
    return HarmonicBalanceEngine.solve(
      centerFreqMHz,
      pinDbm,
      smallSignalGainDb,
      28.5, // Psat dBm
      vds,
      idsMa
    );
  }, [centerFreqMHz, pinDbm, smallSignalGainDb, vds, idsMa]);

  const [activeTab, setActiveTab] = useState<'compression' | 'spectrum' | 'pae'>('compression');

  // SVG dimensions for plots
  const width = 400;
  const height = 220;
  const padLeft = 45;
  const padRight = 15;
  const padTop = 15;
  const padBottom = 30;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  // Compression Plot Paths
  const minPin = -30;
  const maxPin = 25;
  const minPout = -15;
  const maxPout = 32;

  const pinToX = (p: number) => padLeft + ((p - minPin) / (maxPin - minPin)) * plotW;
  const poutToY = (p: number) => padTop + plotH - ((p - minPout) / (maxPout - minPout)) * plotH;

  const poutActualPath = useMemo(() => {
    return hbResult.powerSweep
      .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pinToX(pt.pinDbm).toFixed(1)} ${poutToY(pt.poutDbm).toFixed(1)}`)
      .join(' ');
  }, [hbResult]);

  const poutLinearPath = useMemo(() => {
    return hbResult.powerSweep
      .filter((pt) => pt.linearPoutDbm <= maxPout + 5)
      .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pinToX(pt.pinDbm).toFixed(1)} ${poutToY(pt.linearPoutDbm).toFixed(1)}`)
      .join(' ');
  }, [hbResult]);

  const paePath = useMemo(() => {
    return hbResult.powerSweep
      .map((pt, i) => {
        const x = pinToX(pt.pinDbm);
        const y = padTop + plotH - (pt.paePercent / 80) * plotH;
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }, [hbResult]);

  return (
    <div className="flex flex-col rounded-2xl bg-slate-950 border border-slate-800/80 p-3 shadow-xl select-none">
      {/* Header & View Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/60 text-xs">
        <div className="flex items-center gap-1.5 font-bold tracking-wider text-slate-100 uppercase text-[11px]">
          <Zap className="w-4 h-4 text-amber-400" />
          <span>Harmonic Balance & Non-Linear</span>
        </div>

        <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-800">
          <button
            onClick={() => setActiveTab('compression')}
            className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition cursor-pointer ${
              activeTab === 'compression' ? 'bg-amber-500 text-black font-bold shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Pin vs Pout (P1dB)
          </button>
          <button
            onClick={() => setActiveTab('spectrum')}
            className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition cursor-pointer ${
              activeTab === 'spectrum' ? 'bg-amber-500 text-black font-bold shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Harmonic Spectrum
          </button>
          <button
            onClick={() => setActiveTab('pae')}
            className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition cursor-pointer ${
              activeTab === 'pae' ? 'bg-amber-500 text-black font-bold shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            PAE & Efficiency
          </button>
        </div>
      </div>

      {/* Live RF Drive & Bias Tuners */}
      <div className="grid grid-cols-2 gap-2 my-2.5 p-2 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs">
        <div>
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-slate-400">Input RF Drive (Pin):</span>
            <span className="font-mono font-bold text-amber-400">{pinDbm > 0 ? `+${pinDbm}` : pinDbm} dBm</span>
          </div>
          <input
            type="range"
            min={-20}
            max={20}
            step={0.5}
            value={pinDbm}
            onChange={(e) => setPinDbm(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
        </div>

        <div>
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-slate-400">DC Quiescent Ids:</span>
            <span className="font-mono font-bold text-sky-400">{idsMa} mA</span>
          </div>
          <input
            type="range"
            min={30}
            max={250}
            step={10}
            value={idsMa}
            onChange={(e) => setIdsMa(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
          />
        </div>
      </div>

      {/* Main Plot Area */}
      {activeTab === 'compression' && (
        <div className="relative touch-none rounded-xl bg-slate-950/70 border border-slate-900 overflow-hidden">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
            {/* Grid */}
            {[-10, 0, 10, 20, 30].map((pVal) => (
              <g key={`ygrid-${pVal}`}>
                <line
                  x1={padLeft}
                  y1={poutToY(pVal)}
                  x2={width - padRight}
                  y2={poutToY(pVal)}
                  stroke="#1e293b"
                  strokeWidth="0.8"
                  strokeDasharray="3 3"
                />
                <text x={padLeft - 6} y={poutToY(pVal) + 3} fill="#64748b" fontSize="9" fontFamily="monospace" textAnchor="end">
                  {pVal}dBm
                </text>
              </g>
            ))}

            {[-30, -15, 0, 15].map((pinVal) => (
              <g key={`xgrid-${pinVal}`}>
                <line
                  x1={pinToX(pinVal)}
                  y1={padTop}
                  x2={pinToX(pinVal)}
                  y2={height - padBottom}
                  stroke="#1e293b"
                  strokeWidth="0.8"
                  strokeDasharray="3 3"
                />
                <text x={pinToX(pinVal)} y={height - padBottom + 14} fill="#64748b" fontSize="9" fontFamily="monospace" textAnchor="middle">
                  {pinVal}dBm
                </text>
              </g>
            ))}

            {/* Linear Reference Line (Dashed Slate) */}
            <path d={poutLinearPath} fill="none" stroke="#475569" strokeWidth="1.5" strokeDasharray="4 4" />

            {/* Saturated Non-linear Curve (Amber) */}
            <path d={poutActualPath} fill="none" stroke="#f59e0b" strokeWidth="2.8" strokeLinecap="round" />

            {/* P1dB Marker Point */}
            <circle cx={pinToX(hbResult.p1dbInDbm)} cy={poutToY(hbResult.p1dbOutDbm)} r="5" fill="#f43f5e" stroke="#ffffff" strokeWidth="1.5" />
            <text
              x={pinToX(hbResult.p1dbInDbm) + 8}
              y={poutToY(hbResult.p1dbOutDbm) + 4}
              fill="#f43f5e"
              fontSize="10"
              fontWeight="bold"
              fontFamily="monospace"
            >
              P1dB ({hbResult.p1dbOutDbm.toFixed(1)} dBm)
            </text>

            {/* Active Pin Operating Point */}
            {(() => {
              const curPt = hbResult.powerSweep.find((p) => Math.abs(p.pinDbm - pinDbm) < 0.6);
              if (!curPt) return null;
              return (
                <circle cx={pinToX(curPt.pinDbm)} cy={poutToY(curPt.poutDbm)} r="6" fill="#38bdf8" stroke="#ffffff" strokeWidth="2" />
              );
            })()}
          </svg>

          {/* Legend */}
          <div className="absolute top-2 right-2 flex items-center gap-3 text-[10px] bg-slate-900/80 px-2 py-1 rounded-md border border-slate-800">
            <span className="flex items-center gap-1 text-amber-400">
              <span className="w-2.5 h-0.5 bg-amber-400 rounded-full" /> Actual Pout
            </span>
            <span className="flex items-center gap-1 text-slate-400">
              <span className="w-2.5 h-0.5 bg-slate-400 rounded-full" /> Linear Extrap.
            </span>
          </div>
        </div>
      )}

      {/* Harmonic Spectrum Bar Chart */}
      {activeTab === 'spectrum' && (
        <div className="relative touch-none rounded-xl bg-slate-950/70 border border-slate-900 p-3">
          <div className="flex items-end justify-between h-[180px] gap-3 px-4 pt-4 border-b border-slate-800">
            {hbResult.harmonics.map((h) => {
              const maxBarHeight = 130;
              const barHeight = Math.max(12, ((h.powerDbm - -30) / 60) * maxBarHeight);
              return (
                <div key={`harm-${h.harmonic}`} className="flex flex-col items-center flex-1 h-full justify-end">
                  <span className="text-[10px] font-mono font-bold text-amber-300 mb-1">
                    {h.powerDbm.toFixed(1)}
                  </span>
                  <div
                    style={{ height: `${barHeight}px` }}
                    className={`w-full max-w-[36px] rounded-t-lg transition-all duration-300 ${
                      h.harmonic === 1
                        ? 'bg-gradient-to-t from-amber-600 to-amber-400 shadow-lg shadow-amber-500/20'
                        : 'bg-gradient-to-t from-sky-800 to-sky-500'
                    }`}
                  />
                  <div className="mt-2 text-center">
                    <span className="text-xs font-mono font-bold text-white block">
                      H{h.harmonic}
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono">
                      {(h.freqMHz / 1000).toFixed(2)}G
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="text-[10px] text-center text-slate-400 mt-2">
            Harmonic Power Spectrum @ Pin = {pinDbm} dBm (Output in dBm)
          </div>
        </div>
      )}

      {/* PAE Efficiency Tab */}
      {activeTab === 'pae' && (
        <div className="relative touch-none rounded-xl bg-slate-950/70 border border-slate-900 overflow-hidden">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
            {/* PAE Grid */}
            {[0, 20, 40, 60, 80].map((paeVal) => (
              <g key={`pae-grid-${paeVal}`}>
                <line
                  x1={padLeft}
                  y1={padTop + plotH - (paeVal / 80) * plotH}
                  x2={width - padRight}
                  y2={padTop + plotH - (paeVal / 80) * plotH}
                  stroke="#1e293b"
                  strokeWidth="0.8"
                />
                <text x={padLeft - 6} y={padTop + plotH - (paeVal / 80) * plotH + 3} fill="#64748b" fontSize="9" fontFamily="monospace" textAnchor="end">
                  {paeVal}%
                </text>
              </g>
            ))}

            <path d={paePath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <div className="absolute top-2 right-2 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 font-bold">
            Max PAE: {hbResult.maxPaePercent.toFixed(1)}%
          </div>
        </div>
      )}

      {/* Non-Linear KPI Matrix */}
      <div className="mt-2.5 grid grid-cols-4 gap-1.5 text-center font-mono">
        <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-[9px] text-slate-400 uppercase">P1dB (Out)</div>
          <div className="text-xs font-bold text-rose-400">{hbResult.p1dbOutDbm.toFixed(1)} dBm</div>
        </div>
        <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-[9px] text-slate-400 uppercase">OIP3 Intercept</div>
          <div className="text-xs font-bold text-emerald-400">{hbResult.oip3Dbm.toFixed(1)} dBm</div>
        </div>
        <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-[9px] text-slate-400 uppercase">THD %</div>
          <div className="text-xs font-bold text-amber-400">{hbResult.thdPercent.toFixed(2)}%</div>
        </div>
        <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-[9px] text-slate-400 uppercase">DC Power</div>
          <div className="text-xs font-bold text-sky-400">{hbResult.dcPowerWatts.toFixed(2)} W</div>
        </div>
      </div>
    </div>
  );
};
