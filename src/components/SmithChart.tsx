import React, { useState, useRef, useMemo } from 'react';
import { RFMath } from '../engine/rfMath';
import { Complex } from '../engine/complex';
import { SParameterPoint, LoadpullResult } from '../types/circuit';
import { MatchingSolution } from '../engine/matchingSynthesizer';
import { Eye, Layers, Compass, Crosshair, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface SmithChartProps {
  sPoints: SParameterPoint[];
  markerFreqMHz: number;
  onMarkerFreqChange: (freq: number) => void;
  z0?: number;
  loadpullResult?: LoadpullResult | null;
  matchingSolution?: MatchingSolution | null;
  className?: string;
}

export const SmithChart: React.FC<SmithChartProps> = ({
  sPoints,
  markerFreqMHz,
  onMarkerFreqChange,
  z0 = 50,
  loadpullResult,
  matchingSolution,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Display toggles
  const [showAdmittance, setShowAdmittance] = useState(false);
  const [showQCurves, setShowQCurves] = useState(false);
  const [showS11, setShowS11] = useState(true);
  const [showS22, setShowS22] = useState(true);
  const [showLoadpull, setShowLoadpull] = useState(true);

  // Zoom & Pan state
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  // Free touch-probe cursor
  const [freeCursor, setFreeCursor] = useState<{ u: number; v: number } | null>(null);

  // SVG chart geometry (compact footprint)
  const size = 310;
  const cx = size / 2;
  const cy = size / 2;
  const radius = (size / 2) - 18;

  // Find nearest S-point to marker frequency
  const currentPoint = useMemo(() => {
    if (!sPoints.length) return null;
    return sPoints.reduce((prev, curr) =>
      Math.abs(curr.freqMHz - markerFreqMHz) < Math.abs(prev.freqMHz - markerFreqMHz) ? curr : prev
    );
  }, [sPoints, markerFreqMHz]);

  // Compute marker impedance
  const markerImpedance = useMemo(() => {
    if (freeCursor) {
      const gamma = new Complex(freeCursor.u, freeCursor.v);
      const zNorm = RFMath.gammaToZ(gamma);
      const zReal = zNorm.r * z0;
      const zImag = zNorm.i * z0;
      const vswr = RFMath.vswr(gamma);
      const returnLossDb = -gamma.magDb();
      const yNorm = zNorm.inv();
      const yRealMs = (yNorm.r / z0) * 1000;
      const yImagMs = (yNorm.i / z0) * 1000;

      // Equivalent L / C at marker frequency
      const omega = 2 * Math.PI * markerFreqMHz * 1e6;
      let eqElem = '';
      if (Math.abs(zImag) > 0.01) {
        if (zImag > 0) {
          const lNh = (zImag / omega) * 1e9;
          eqElem = `+ ${lNh.toFixed(2)} nH`;
        } else {
          const cPf = (-1 / (omega * zImag)) * 1e12;
          eqElem = `- ${cPf.toFixed(2)} pF`;
        }
      }

      return {
        r: zReal,
        x: zImag,
        mag: gamma.mag(),
        angDeg: gamma.phaseDeg(),
        vswr,
        returnLossDb,
        yRealMs,
        yImagMs,
        eqElem,
        isCustom: true,
      };
    }

    if (!currentPoint) return null;
    const gammaS11 = new Complex(currentPoint.s11Real, currentPoint.s11Imag);
    const zNorm = RFMath.gammaToZ(gammaS11);
    const zReal = zNorm.r * z0;
    const zImag = zNorm.i * z0;
    const vswr = currentPoint.vswrIn;
    const returnLossDb = -currentPoint.s11MagDb;
    const yNorm = zNorm.inv();
    const yRealMs = (yNorm.r / z0) * 1000;
    const yImagMs = (yNorm.i / z0) * 1000;

    const omega = 2 * Math.PI * currentPoint.freqMHz * 1e6;
    let eqElem = '';
    if (Math.abs(zImag) > 0.01) {
      if (zImag > 0) {
        const lNh = (zImag / omega) * 1e9;
        eqElem = `+ ${(zImag / omega * 1e9).toFixed(2)} nH`;
      } else {
        const cPf = (-1 / (omega * zImag)) * 1e12;
        eqElem = `- ${cPf.toFixed(2)} pF`;
      }
    }

    return {
      r: zReal,
      x: zImag,
      mag: gammaS11.mag(),
      angDeg: gammaS11.phaseDeg(),
      vswr,
      returnLossDb,
      yRealMs,
      yImagMs,
      eqElem,
      isCustom: false,
    };
  }, [freeCursor, currentPoint, z0, markerFreqMHz]);

  // Touch & pointer handlers for interactive probing & dragging
  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left - pan.x) / zoom;
    const py = (e.clientY - rect.top - pan.y) / zoom;
    const gamma = RFMath.pixelToGamma(px, py, cx, cy, radius);

    if (Math.hypot(gamma.u, gamma.v) <= 1.05) {
      setFreeCursor({ u: Math.min(0.99, gamma.u), v: Math.min(0.99, gamma.v) });
    }
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.buttons === 1) {
      const rect = e.currentTarget.getBoundingClientRect();
      const px = (e.clientX - rect.left - pan.x) / zoom;
      const py = (e.clientY - rect.top - pan.y) / zoom;
      const gamma = RFMath.pixelToGamma(px, py, cx, cy, radius);

      if (Math.hypot(gamma.u, gamma.v) <= 1.05) {
        setFreeCursor({ u: Math.max(-0.99, Math.min(0.99, gamma.u)), v: Math.max(-0.99, Math.min(0.99, gamma.v)) });
      }
    }
  };

  // Precomputed constant resistance circles
  const rValues = [0, 0.2, 0.5, 1.0, 2.0, 5.0];
  const xValues = [0.2, 0.5, 1.0, 2.0, 5.0];

  // Helper to build SVG path for constant reactance arc x
  const getReactanceArcPath = (x: number, isAdmittance = false) => {
    // Arc in Smith chart inside unit circle
    const centerU = isAdmittance ? -1 : 1;
    const centerV = 1 / x;
    const rArc = 1 / Math.abs(x);

    // Calculate intersection with unit circle: u^2 + v^2 = 1
    // (u - 1)^2 + (v - 1/x)^2 = (1/x)^2 => u^2 - 2u + 1 + v^2 - 2v/x = 0
    // since u^2 + v^2 = 1: 2 - 2u - 2v/x = 0 => 1 - u = v/x => v = x*(1-u)
    // u^2 + x^2*(1-u)^2 = 1 => (1 + x^2)*u^2 - 2*x^2*u + (x^2 - 1) = 0
    const a = 1 + x * x;
    const b = -2 * x * x;
    const c = x * x - 1;
    const disc = b * b - 4 * a * c;
    if (disc < 0) return '';
    const uInt = (-b + Math.sqrt(disc)) / (2 * a);
    const vInt = x * (1 - uInt);

    const start = RFMath.gammaToPixel(uInt, vInt, cx, cy, radius);
    const end = RFMath.gammaToPixel(1, 0, cx, cy, radius);

    const rxPx = rArc * radius;
    const ryPx = rArc * radius;
    const sweepFlag = x > 0 ? 0 : 1;

    return `M ${start.x} ${start.y} A ${rxPx} ${ryPx} 0 0 ${sweepFlag} ${end.x} ${end.y}`;
  };

  // Trace paths for S11 and S22
  const s11Path = useMemo(() => {
    if (!sPoints.length) return '';
    return sPoints
      .map((pt, i) => {
        const { x, y } = RFMath.gammaToPixel(pt.s11Real, pt.s11Imag, cx, cy, radius);
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }, [sPoints, cx, cy, radius]);

  const s22Path = useMemo(() => {
    if (!sPoints.length) return '';
    return sPoints
      .map((pt, i) => {
        const { x, y } = RFMath.gammaToPixel(pt.s22Real, pt.s22Imag, cx, cy, radius);
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }, [sPoints, cx, cy, radius]);

  // Marker screen coordinates
  const markerS11Pos = useMemo(() => {
    if (!currentPoint) return { x: cx, y: cy };
    return RFMath.gammaToPixel(currentPoint.s11Real, currentPoint.s11Imag, cx, cy, radius);
  }, [currentPoint, cx, cy, radius]);

  const customCursorPos = useMemo(() => {
    if (!freeCursor) return null;
    return RFMath.gammaToPixel(freeCursor.u, freeCursor.v, cx, cy, radius);
  }, [freeCursor, cx, cy, radius]);

  return (
    <div className={`h-full flex flex-col rounded-xl bg-slate-950 border border-slate-800/80 p-2 shadow-lg overflow-hidden select-none ${className}`}>
      {/* Top Header & Layer Toggles */}
      <div className="flex items-center justify-between pb-1 border-b border-slate-800/60 text-xs shrink-0">
        <div className="flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5 text-sky-400" />
          <span className="font-bold tracking-wider text-slate-100 uppercase text-[10px]">Smith Chart (Z0={z0}Ω)</span>
        </div>

        {/* Toolbar Toggles */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowAdmittance(!showAdmittance)}
            className={`px-1.5 py-0.5 rounded text-[9px] font-semibold transition cursor-pointer ${
              showAdmittance
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Admittance Chart (Y)"
          >
            Y-Chart
          </button>
          <button
            onClick={() => setShowQCurves(!showQCurves)}
            className={`px-1.5 py-0.5 rounded text-[9px] font-semibold transition cursor-pointer ${
              showQCurves
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Constant Q Contours"
          >
            Q-Curves
          </button>
          {loadpullResult && (
            <button
              onClick={() => setShowLoadpull(!showLoadpull)}
              className={`px-1.5 py-0.5 rounded text-[9px] font-semibold transition cursor-pointer ${
                showLoadpull
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle Loadpull Contours"
            >
              Loadpull
            </button>
          )}
          {freeCursor && (
            <button
              onClick={() => setFreeCursor(null)}
              className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 text-[9px] flex items-center gap-1 hover:bg-sky-500/30"
              title="Reset to S11 Marker"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>Snap</span>
            </button>
          )}
        </div>
      </div>

      {/* SVG Smith Chart Canvas - Flexible Viewport Fitting */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0 relative flex items-center justify-center my-1 touch-none overflow-hidden rounded-lg bg-slate-950/60 border border-slate-900"
      >
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="max-h-full max-w-full aspect-square cursor-crosshair drop-shadow-md"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
        >
          <defs>
            <radialGradient id="smithBg" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#0b1329" />
              <stop offset="90%" stopColor="#060a16" />
              <stop offset="100%" stopColor="#04060d" />
            </radialGradient>
            <filter id="neonTraceS11" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#38bdf8" />
            </filter>
            <filter id="neonTraceS22" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#f59e0b" />
            </filter>
          </defs>

          {/* Transform group for Zoom & Pan */}
          <g
            transform={`translate(${pan.x}, ${pan.y}) translate(${cx}, ${cy}) scale(${zoom}) translate(${-cx}, ${-cy})`}
            style={{ transformOrigin: `${cx}px ${cy}px` }}
          >
            {/* Outer Unit Circle (|Gamma| = 1.0, R = 0) */}
            <circle cx={cx} cy={cy} r={radius} fill="url(#smithBg)" stroke="#1e3a5f" strokeWidth="2" />

            {/* Horizontal Real Resistance Axis */}
            <line x1={cx - radius} y1={cy} x2={cx + radius} y2={cy} stroke="#1d4ed8" strokeWidth="1.2" opacity="0.6" />

            {/* Constant Resistance Circles */}
            {rValues.map((r) => {
              if (r === 0) return null;
              const { u, radius: rCircle } = RFMath.smithResistanceCircle(r);
              const pCenter = RFMath.gammaToPixel(u, 0, cx, cy, radius);
              const pRadius = rCircle * radius;
              const is50Ohm = r === 1.0;
              return (
                <circle
                  key={`r-${r}`}
                  cx={pCenter.x}
                  cy={pCenter.y}
                  r={pRadius}
                  fill="none"
                  stroke={is50Ohm ? '#0284c7' : '#1e3a5f'}
                  strokeWidth={is50Ohm ? '1.8' : '0.8'}
                  opacity={is50Ohm ? '0.9' : '0.5'}
                />
              );
            })}

            {/* Constant Reactance Arcs (Inductive / Upper half and Capacitive / Lower half) */}
            {xValues.map((x) => (
              <g key={`x-${x}`}>
                <path d={getReactanceArcPath(x)} fill="none" stroke="#1e3a5f" strokeWidth="0.8" opacity="0.45" />
                <path d={getReactanceArcPath(-x)} fill="none" stroke="#1e3a5f" strokeWidth="0.8" opacity="0.45" />
              </g>
            ))}

            {/* Admittance Overlay (Mirror circles in rose/red) */}
            {showAdmittance && (
              <g opacity="0.35">
                {[0.5, 1.0, 2.0].map((g) => {
                  const u = -g / (1 + g);
                  const pCenter = RFMath.gammaToPixel(u, 0, cx, cy, radius);
                  const pRadius = (1 / (1 + g)) * radius;
                  return (
                    <circle
                      key={`g-${g}`}
                      cx={pCenter.x}
                      cy={pCenter.y}
                      r={pRadius}
                      fill="none"
                      stroke="#f43f5e"
                      strokeWidth={g === 1.0 ? '1.2' : '0.7'}
                      strokeDasharray={g === 1.0 ? '' : '3 2'}
                    />
                  );
                })}
              </g>
            )}

            {/* Constant Q Curves (Q = 1, 2) */}
            {showQCurves && (
              <g opacity="0.4">
                {/* Upper and lower constant Q hyperbolas */}
                <path
                  d={`M ${cx - radius * 0.9} ${cy - radius * 0.4} Q ${cx - radius * 0.2} ${cy - radius * 0.8} ${cx + radius} ${cy}`}
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="1"
                  strokeDasharray="4 3"
                />
                <path
                  d={`M ${cx - radius * 0.9} ${cy + radius * 0.4} Q ${cx - radius * 0.2} ${cy + radius * 0.8} ${cx + radius} ${cy}`}
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="1"
                  strokeDasharray="4 3"
                />
              </g>
            )}

            {/* Loadpull Contours Overlay */}
            {showLoadpull && loadpullResult && (
              <g>
                {/* Power Contours */}
                {loadpullResult.powerContours.map((contour, idx) => {
                  if (!contour.points.length) return null;
                  const dPath = contour.points
                    .map((pt, i) => {
                      const { x, y } = RFMath.gammaToPixel(pt.u, pt.v, cx, cy, radius);
                      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                    })
                    .join(' ') + ' Z';
                  return (
                    <path
                      key={`lp-pwr-${idx}`}
                      d={dPath}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="1.5"
                      opacity={0.85 - idx * 0.18}
                    />
                  );
                })}

                {/* PAE Contours */}
                {loadpullResult.paeContours.map((contour, idx) => {
                  if (!contour.points.length) return null;
                  const dPath = contour.points
                    .map((pt, i) => {
                      const { x, y } = RFMath.gammaToPixel(pt.u, pt.v, cx, cy, radius);
                      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                    })
                    .join(' ') + ' Z';
                  return (
                    <path
                      key={`lp-pae-${idx}`}
                      d={dPath}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="1.2"
                      strokeDasharray="3 2"
                      opacity={0.8 - idx * 0.18}
                    />
                  );
                })}

                {/* Z_opt Power marker */}
                {(() => {
                  const zNorm = new Complex(loadpullResult.zOptPower.r / z0, loadpullResult.zOptPower.x / z0);
                  const g = RFMath.zToGamma(zNorm);
                  const pos = RFMath.gammaToPixel(g.r, g.i, cx, cy, radius);
                  return (
                    <g>
                      <circle cx={pos.x} cy={pos.y} r="5" fill="#10b981" />
                      <text x={pos.x + 7} y={pos.y + 3} fill="#10b981" fontSize="9" fontWeight="bold">
                        Pmax ({loadpullResult.maxPowerDbm.toFixed(1)}dBm)
                      </text>
                    </g>
                  );
                })()}
              </g>
            )}

            {/* Matching Network Trajectory Path */}
            {matchingSolution && matchingSolution.trajectoryGamma.length > 1 && (
              <g>
                {matchingSolution.trajectoryGamma.map((step, idx) => {
                  if (idx === 0) return null;
                  const pPrev = RFMath.gammaToPixel(matchingSolution.trajectoryGamma[idx - 1].u, matchingSolution.trajectoryGamma[idx - 1].v, cx, cy, radius);
                  const pCurr = RFMath.gammaToPixel(step.u, step.v, cx, cy, radius);
                  return (
                    <line
                      key={`match-seg-${idx}`}
                      x1={pPrev.x}
                      y1={pPrev.y}
                      x2={pCurr.x}
                      y2={pCurr.y}
                      stroke="#ec4899"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  );
                })}
              </g>
            )}

            {/* S22 Frequency Trace (Amber) */}
            {showS22 && s22Path && (
              <path
                d={s22Path}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0.85"
                filter="url(#neonTraceS22)"
              />
            )}

            {/* S11 Frequency Trace (Cyan) */}
            {showS11 && s11Path && (
              <path
                d={s11Path}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2.5"
                strokeLinecap="round"
                filter="url(#neonTraceS11)"
              />
            )}

            {/* Prime Center Match Marker (Normalized 1.0, 50Ω) */}
            <circle cx={cx} cy={cy} r="4" fill="#0284c7" />
            <circle cx={cx} cy={cy} r="1.5" fill="#ffffff" />

            {/* Active S11 Marker Point */}
            {currentPoint && !freeCursor && (
              <g>
                <circle cx={markerS11Pos.x} cy={markerS11Pos.y} r="8" fill="#38bdf8" opacity="0.3" className="animate-ping" />
                <circle cx={markerS11Pos.x} cy={markerS11Pos.y} r="6" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
              </g>
            )}

            {/* Free Probe Cursor (Touch Dragged) */}
            {customCursorPos && (
              <g>
                <circle cx={customCursorPos.x} cy={customCursorPos.y} r="8" fill="#f43f5e" opacity="0.3" className="animate-ping" />
                <circle cx={customCursorPos.x} cy={customCursorPos.y} r="6" fill="#f43f5e" stroke="#ffffff" strokeWidth="2" />
                <line x1={customCursorPos.x - 10} y1={customCursorPos.y} x2={customCursorPos.x + 10} y2={customCursorPos.y} stroke="#ffffff" strokeWidth="1" />
                <line x1={customCursorPos.x} y1={customCursorPos.y - 10} x2={customCursorPos.x} y2={customCursorPos.y + 10} stroke="#ffffff" strokeWidth="1" />
              </g>
            )}
          </g>
        </svg>

        {/* Trace Legend Pills */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 text-[10px]">
          <button
            onClick={() => setShowS11(!showS11)}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border transition cursor-pointer ${
              showS11
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/50'
                : 'bg-slate-900/60 text-slate-500 border-slate-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            <span className="font-mono font-bold">S11 (In)</span>
          </button>
          <button
            onClick={() => setShowS22(!showS22)}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border transition cursor-pointer ${
              showS22
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                : 'bg-slate-900/60 text-slate-500 border-slate-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="font-mono font-bold">S22 (Out)</span>
          </button>
        </div>
      </div>

      {/* Interactive Readout HUD */}
      {markerImpedance && (
        <div className="shrink-0 grid grid-cols-2 gap-1.5 p-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-[10px]">
          <div className="space-y-0.5 min-w-0">
            <div className="text-[8px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Crosshair className="w-2.5 h-2.5 text-sky-400 shrink-0" />
              <span className="truncate">{markerImpedance.isCustom ? 'Touch Probe' : `@ ${markerFreqMHz.toFixed(0)} MHz`}</span>
            </div>
            <div className="font-mono text-[11px] font-bold text-sky-300 leading-tight">
              {markerImpedance.r.toFixed(1)} {markerImpedance.x >= 0 ? '+' : '-'} j{Math.abs(markerImpedance.x).toFixed(1)} Ω
            </div>
            <div className="text-[9px] text-slate-300 font-mono truncate leading-tight">
              Y={markerImpedance.yRealMs.toFixed(1)}{markerImpedance.yImagMs >= 0 ? '+' : '-'}j{Math.abs(markerImpedance.yImagMs).toFixed(1)}mS
            </div>
          </div>

          <div className="space-y-0.5 text-right min-w-0">
            <div className="text-[8px] text-slate-400 uppercase tracking-wider">Reflection & VSWR</div>
            <div className="font-mono text-[10px] font-semibold text-emerald-300 leading-tight">
              |Γ|={markerImpedance.mag.toFixed(3)} ∠{markerImpedance.angDeg.toFixed(1)}°
            </div>
            <div className="text-[9px] text-slate-300 font-mono truncate leading-tight">
              VSWR: <span className="font-bold text-white">{markerImpedance.vswr.toFixed(2)}</span> | RL: <span className="font-bold text-white">{markerImpedance.returnLossDb.toFixed(1)}dB</span>
            </div>
            {markerImpedance.eqElem && (
              <div className="text-[8px] text-sky-400 font-mono font-medium truncate leading-tight">
                Eq: {markerImpedance.eqElem}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Frequency Scrub Slider */}
      {sPoints.length > 0 && (
        <div className="shrink-0 mt-1 pt-0.5 border-t border-slate-800/60 flex items-center gap-1.5">
          <span className="text-[8px] text-slate-400 font-mono shrink-0">
            {sPoints[0].freqMHz.toFixed(0)}M
          </span>
          <input
            type="range"
            min={sPoints[0].freqMHz}
            max={sPoints[sPoints.length - 1].freqMHz}
            step={(sPoints[sPoints.length - 1].freqMHz - sPoints[0].freqMHz) / (sPoints.length - 1)}
            value={markerFreqMHz}
            onChange={(e) => onMarkerFreqChange(parseFloat(e.target.value))}
            className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-sky-400"
          />
          <span className="text-[8px] text-slate-400 font-mono shrink-0">
            {sPoints[sPoints.length - 1].freqMHz.toFixed(0)}M
          </span>
        </div>
      )}
    </div>
  );
};
