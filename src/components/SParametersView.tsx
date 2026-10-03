import React, { useState, useMemo } from 'react';
import { SParameterPoint } from '../types/circuit';
import { Activity, ShieldCheck, ShieldAlert, Sparkles, TrendingUp, Info } from 'lucide-react';

interface SParametersViewProps {
  sPoints: SParameterPoint[];
  markerFreqMHz: number;
  onMarkerFreqChange: (freq: number) => void;
  z0?: number;
}

type PlotMode = 'logmag' | 'phase' | 'vswr' | 'group_delay';

export const SParametersView: React.FC<SParametersViewProps> = ({
  sPoints,
  markerFreqMHz,
  onMarkerFreqChange,
  z0 = 50,
}) => {
  const [plotMode, setPlotMode] = useState<PlotMode>('logmag');
  const [showS11, setShowS11] = useState(true);
  const [showS21, setShowS21] = useState(true);
  const [showS12, setShowS12] = useState(false);
  const [showS22, setShowS22] = useState(true);

  // SVG dimensions
  const width = 420;
  const height = 240;
  const padLeft = 45;
  const padRight = 15;
  const padTop = 20;
  const padBottom = 30;

  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  // Active marker point
  const currentPoint = useMemo(() => {
    if (!sPoints.length) return null;
    return sPoints.reduce((prev, curr) =>
      Math.abs(curr.freqMHz - markerFreqMHz) < Math.abs(prev.freqMHz - markerFreqMHz) ? curr : prev
    );
  }, [sPoints, markerFreqMHz]);

  // Frequency bounds
  const minFreq = sPoints[0]?.freqMHz ?? 1000;
  const maxFreq = sPoints[sPoints.length - 1]?.freqMHz ?? 3000;

  // Vertical scale based on plotMode
  const { yMin, yMax, yUnit, yTicks } = useMemo(() => {
    switch (plotMode) {
      case 'logmag': {
        // typically -50 to +25 dB
        let minVal = -40;
        let maxVal = 20;
        sPoints.forEach((p) => {
          if (showS11) minVal = Math.min(minVal, p.s11MagDb);
          if (showS21) maxVal = Math.max(maxVal, p.s21MagDb);
          if (showS22) minVal = Math.min(minVal, p.s22MagDb);
        });
        const yTop = Math.ceil(maxVal / 10) * 10;
        const yBot = Math.floor(Math.min(minVal, -20) / 10) * 10;
        const span = yTop - yBot;
        return {
          yMin: yBot,
          yMax: yTop,
          yUnit: 'dB',
          yTicks: [yBot, yBot + span * 0.25, yBot + span * 0.5, yBot + span * 0.75, yTop],
        };
      }
      case 'phase':
        return {
          yMin: -180,
          yMax: 180,
          yUnit: '°',
          yTicks: [-180, -90, 0, 90, 180],
        };
      case 'vswr':
        return {
          yMin: 1.0,
          yMax: 5.0,
          yUnit: ':1',
          yTicks: [1, 2, 3, 4, 5],
        };
      case 'group_delay':
        return {
          yMin: 0,
          yMax: 10,
          yUnit: 'ns',
          yTicks: [0, 2.5, 5.0, 7.5, 10],
        };
    }
  }, [plotMode, sPoints, showS11, showS21, showS22]);

  // Coordinate transforms
  const freqToX = (freq: number) => {
    if (maxFreq === minFreq) return padLeft;
    return padLeft + ((freq - minFreq) / (maxFreq - minFreq)) * plotW;
  };

  const valToY = (val: number) => {
    const clamped = Math.max(yMin, Math.min(yMax, val));
    return padTop + plotH - ((clamped - yMin) / (yMax - yMin)) * plotH;
  };

  // Build SVG path strings
  const getPathForTrace = (extractor: (p: SParameterPoint) => number) => {
    if (!sPoints.length) return '';
    return sPoints
      .map((p, i) => {
        const x = freqToX(p.freqMHz);
        const y = valToY(extractor(p));
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  };

  const s11Path = useMemo(() => {
    switch (plotMode) {
      case 'logmag':
        return getPathForTrace((p) => p.s11MagDb);
      case 'phase':
        return getPathForTrace((p) => p.s11PhaseDeg);
      case 'vswr':
        return getPathForTrace((p) => p.vswrIn);
      case 'group_delay':
        return '';
    }
  }, [sPoints, plotMode, minFreq, maxFreq, yMin, yMax]);

  const s21Path = useMemo(() => {
    switch (plotMode) {
      case 'logmag':
        return getPathForTrace((p) => p.s21MagDb);
      case 'phase':
        return getPathForTrace((p) => p.s21PhaseDeg);
      case 'vswr':
        return '';
      case 'group_delay':
        return getPathForTrace((p) => p.groupDelayNs);
    }
  }, [sPoints, plotMode, minFreq, maxFreq, yMin, yMax]);

  const s12Path = useMemo(() => {
    switch (plotMode) {
      case 'logmag':
        return getPathForTrace((p) => p.s12MagDb);
      case 'phase':
        return getPathForTrace((p) => p.s12PhaseDeg);
      default:
        return '';
    }
  }, [sPoints, plotMode, minFreq, maxFreq, yMin, yMax]);

  const s22Path = useMemo(() => {
    switch (plotMode) {
      case 'logmag':
        return getPathForTrace((p) => p.s22MagDb);
      case 'phase':
        return getPathForTrace((p) => p.s22PhaseDeg);
      case 'vswr':
        return getPathForTrace((p) => p.vswrOut);
      default:
        return '';
    }
  }, [sPoints, plotMode, minFreq, maxFreq, yMin, yMax]);

  // Touch pointer interaction for frequency scrubbing
  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const touchX = ((e.clientX - rect.left) / rect.width) * width;
    const clampedX = Math.max(padLeft, Math.min(padLeft + plotW, touchX));
    const freq = minFreq + ((clampedX - padLeft) / plotW) * (maxFreq - minFreq);
    onMarkerFreqChange(freq);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.buttons === 1) {
      handlePointerDown(e);
    }
  };

  // Find peak gain & best return loss
  const stats = useMemo(() => {
    if (!sPoints.length) return null;
    let maxS21 = -999;
    let maxS21Freq = minFreq;
    let minS11 = 999;
    let minS11Freq = minFreq;

    sPoints.forEach((p) => {
      if (p.s21MagDb > maxS21) {
        maxS21 = p.s21MagDb;
        maxS21Freq = p.freqMHz;
      }
      if (p.s11MagDb < minS11) {
        minS11 = p.s11MagDb;
        minS11Freq = p.freqMHz;
      }
    });

    return { maxS21, maxS21Freq, minS11, minS11Freq };
  }, [sPoints, minFreq]);

  return (
    <div className="flex flex-col rounded-2xl bg-slate-950 border border-slate-800/80 p-3 shadow-xl select-none">
      {/* Top Header & Plot Mode Selector */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/60 text-xs">
        <div className="flex items-center gap-1.5 font-bold tracking-wider text-slate-100 uppercase text-[11px]">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span>S-Parameter Sweeps</span>
        </div>

        {/* Mode Selector Buttons */}
        <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-800">
          {(
            [
              { id: 'logmag', label: 'dB Mag' },
              { id: 'phase', label: 'Phase' },
              { id: 'vswr', label: 'VSWR' },
              { id: 'group_delay', label: 'Delay' },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              onClick={() => setPlotMode(m.id)}
              className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition cursor-pointer ${
                plotMode === m.id
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Trace Selector Checkboxes */}
      <div className="flex items-center justify-between gap-2 py-2 px-1 text-[11px]">
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showS11}
              onChange={(e) => setShowS11(e.target.checked)}
              className="accent-sky-400 rounded cursor-pointer"
            />
            <span className="font-mono font-bold text-sky-400">S11 (Return Loss)</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showS21}
              onChange={(e) => setShowS21(e.target.checked)}
              className="accent-emerald-400 rounded cursor-pointer"
            />
            <span className="font-mono font-bold text-emerald-400">S21 (Gain/Loss)</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showS22}
              onChange={(e) => setShowS22(e.target.checked)}
              className="accent-amber-400 rounded cursor-pointer"
            />
            <span className="font-mono font-bold text-amber-400">S22 (Out Match)</span>
          </label>
        </div>

        {/* Rollett Stability Badge */}
        {currentPoint && (
          <div
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
              currentPoint.kFactor > 1 && currentPoint.muFactor > 1
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
            }`}
            title="Rollett stability factor K and Edwards-Sinsky mu"
          >
            {currentPoint.kFactor > 1 ? (
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
            ) : (
              <ShieldAlert className="w-3 h-3 text-rose-400" />
            )}
            <span>K={currentPoint.kFactor.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* SVG Multi-Trace Chart */}
      <div className="relative touch-none rounded-xl bg-slate-950/70 border border-slate-900 overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto cursor-crosshair"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
        >
          {/* Grid lines: Horizontal */}
          {yTicks.map((tickVal) => {
            const y = valToY(tickVal);
            return (
              <g key={`ytick-${tickVal}`}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="#1e293b"
                  strokeWidth="0.8"
                  strokeDasharray={tickVal === 0 ? '' : '3 3'}
                />
                <text
                  x={padLeft - 6}
                  y={y + 3}
                  fill="#64748b"
                  fontSize="9"
                  fontFamily="monospace"
                  textAnchor="end"
                >
                  {tickVal.toFixed(0)}
                  {yUnit}
                </text>
              </g>
            );
          })}

          {/* Grid lines: Vertical Frequency ticks */}
          {[0, 0.25, 0.5, 0.75, 1.0].map((frac) => {
            const f = minFreq + frac * (maxFreq - minFreq);
            const x = freqToX(f);
            return (
              <g key={`xtick-${frac}`}>
                <line
                  x1={x}
                  y1={padTop}
                  x2={x}
                  y2={height - padBottom}
                  stroke="#1e293b"
                  strokeWidth="0.8"
                  strokeDasharray="3 3"
                />
                <text
                  x={x}
                  y={height - padBottom + 14}
                  fill="#64748b"
                  fontSize="9"
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  {f >= 1000 ? `${(f / 1000).toFixed(2)}G` : `${f.toFixed(0)}M`}
                </text>
              </g>
            );
          })}

          {/* Plot Traces */}
          {showS12 && s12Path && (
            <path d={s12Path} fill="none" stroke="#a855f7" strokeWidth="1.8" opacity="0.75" />
          )}
          {showS22 && s22Path && (
            <path d={s22Path} fill="none" stroke="#f59e0b" strokeWidth="2.0" strokeLinecap="round" />
          )}
          {showS11 && s11Path && (
            <path d={s11Path} fill="none" stroke="#38bdf8" strokeWidth="2.2" strokeLinecap="round" />
          )}
          {showS21 && s21Path && (
            <path d={s21Path} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
          )}

          {/* Vertical Scrub Crosshair Marker */}
          {currentPoint && (
            <g>
              <line
                x1={freqToX(currentPoint.freqMHz)}
                y1={padTop}
                x2={freqToX(currentPoint.freqMHz)}
                y2={height - padBottom}
                stroke="#f43f5e"
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />
              {/* Highlight Dots on traces */}
              {showS11 && (
                <circle
                  cx={freqToX(currentPoint.freqMHz)}
                  cy={valToY(plotMode === 'logmag' ? currentPoint.s11MagDb : plotMode === 'phase' ? currentPoint.s11PhaseDeg : currentPoint.vswrIn)}
                  r="4"
                  fill="#38bdf8"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
              )}
              {showS21 && (
                <circle
                  cx={freqToX(currentPoint.freqMHz)}
                  cy={valToY(plotMode === 'logmag' ? currentPoint.s21MagDb : plotMode === 'phase' ? currentPoint.s21PhaseDeg : currentPoint.groupDelayNs)}
                  r="4"
                  fill="#10b981"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
              )}
            </g>
          )}
        </svg>
      </div>

      {/* Marker Live Readout Bar */}
      {currentPoint && (
        <div className="mt-2.5 grid grid-cols-4 gap-1.5 p-2 rounded-xl bg-slate-900/90 border border-slate-800 text-center font-mono">
          <div className="p-1 rounded bg-slate-950/60">
            <div className="text-[9px] text-slate-400 uppercase">Frequency</div>
            <div className="text-xs font-bold text-white">
              {currentPoint.freqMHz >= 1000
                ? `${(currentPoint.freqMHz / 1000).toFixed(3)} GHz`
                : `${currentPoint.freqMHz.toFixed(1)} MHz`}
            </div>
          </div>

          <div className="p-1 rounded bg-slate-950/60">
            <div className="text-[9px] text-sky-400 uppercase font-bold">S11 (Return)</div>
            <div className="text-xs font-bold text-sky-300">
              {currentPoint.s11MagDb.toFixed(2)} dB
            </div>
          </div>

          <div className="p-1 rounded bg-slate-950/60">
            <div className="text-[9px] text-emerald-400 uppercase font-bold">S21 (Gain)</div>
            <div className="text-xs font-bold text-emerald-300">
              {currentPoint.s21MagDb.toFixed(2)} dB
            </div>
          </div>

          <div className="p-1 rounded bg-slate-950/60">
            <div className="text-[9px] text-amber-400 uppercase font-bold">VSWR In</div>
            <div className="text-xs font-bold text-amber-300">
              {currentPoint.vswrIn.toFixed(2)}:1
            </div>
          </div>
        </div>
      )}

      {/* Summary KPI Badges */}
      {stats && (
        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 px-1">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>Peak Gain: <strong className="text-emerald-300 font-mono">{stats.maxS21.toFixed(2)} dB</strong> @ {(stats.maxS21Freq / 1000).toFixed(2)} GHz</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>Best S11: <strong className="text-sky-300 font-mono">{stats.minS11.toFixed(2)} dB</strong> @ {(stats.minS11Freq / 1000).toFixed(2)} GHz</span>
          </div>
        </div>
      )}
    </div>
  );
};
