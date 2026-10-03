import React, { useState } from 'react';
import { TouchstoneEngine } from '../engine/touchstone';
import { SParameterPoint } from '../types/circuit';
import { Download, Copy, Upload, Check, FileText, X } from 'lucide-react';

interface TouchstoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  sPoints: SParameterPoint[];
  circuitName: string;
  z0?: number;
  onImportTouchstone?: (points: SParameterPoint[], filename: string) => void;
}

export const TouchstoneModal: React.FC<TouchstoneModalProps> = ({
  isOpen,
  onClose,
  sPoints,
  circuitName,
  z0 = 50,
  onImportTouchstone,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [format, setFormat] = useState<'DB' | 'MA' | 'RI'>('DB');
  const [copied, setCopied] = useState(false);
  const [importedText, setImportedText] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const exportedContent = TouchstoneEngine.exportS2P(sPoints, circuitName, z0, format);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportedContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleDownload = () => {
    const blob = new Blob([exportedContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${circuitName.toLowerCase().replace(/\s+/g, '_')}.s2p`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setImportedText(text);
      processImport(text, file.name);
    };
    reader.readAsText(file);
  };

  const processImport = (content: string, filename: string = 'imported.s2p') => {
    try {
      const parsed = TouchstoneEngine.parse(content, filename);
      if (parsed.rows.length === 0) {
        setImportStatus('No valid data points found in Touchstone file.');
        return;
      }

      const points: SParameterPoint[] = parsed.rows.map((row) => {
        let s11MagDb = 0, s11Phase = 0, s11Real = 0, s11Imag = 0;
        let s21MagDb = 0, s21Phase = 0, s21Real = 0, s21Imag = 0;
        let s12MagDb = 0, s12Phase = 0, s12Real = 0, s12Imag = 0;
        let s22MagDb = 0, s22Phase = 0, s22Real = 0, s22Imag = 0;

        if (parsed.header.format === 'DB') {
          s11MagDb = row.s11.a; s11Phase = row.s11.b;
          s21MagDb = row.s21.a; s21Phase = row.s21.b;
          s12MagDb = row.s12.a; s12Phase = row.s12.b;
          s22MagDb = row.s22.a; s22Phase = row.s22.b;
        } else if (parsed.header.format === 'MA') {
          s11MagDb = 20 * Math.log10(Math.max(1e-12, row.s11.a)); s11Phase = row.s11.b;
          s21MagDb = 20 * Math.log10(Math.max(1e-12, row.s21.a)); s21Phase = row.s21.b;
          s12MagDb = 20 * Math.log10(Math.max(1e-12, row.s12.a)); s12Phase = row.s12.b;
          s22MagDb = 20 * Math.log10(Math.max(1e-12, row.s22.a)); s22Phase = row.s22.b;
        } else {
          // RI
          s11Real = row.s11.a; s11Imag = row.s11.b;
          s11MagDb = 20 * Math.log10(Math.max(1e-12, Math.hypot(s11Real, s11Imag)));
          s11Phase = (Math.atan2(s11Imag, s11Real) * 180) / Math.PI;

          s21Real = row.s21.a; s21Imag = row.s21.b;
          s21MagDb = 20 * Math.log10(Math.max(1e-12, Math.hypot(s21Real, s21Imag)));
          s21Phase = (Math.atan2(s21Imag, s21Real) * 180) / Math.PI;

          s12Real = row.s12.a; s12Imag = row.s12.b;
          s12MagDb = 20 * Math.log10(Math.max(1e-12, Math.hypot(s12Real, s12Imag)));
          s12Phase = (Math.atan2(s12Imag, s12Real) * 180) / Math.PI;

          s22Real = row.s22.a; s22Imag = row.s22.b;
          s22MagDb = 20 * Math.log10(Math.max(1e-12, Math.hypot(s22Real, s22Imag)));
          s22Phase = (Math.atan2(s22Imag, s22Real) * 180) / Math.PI;
        }

        const magS11 = Math.pow(10, s11MagDb / 20);
        const vswr = magS11 >= 1 ? 99.9 : (1 + magS11) / (1 - magS11);

        return {
          freqMHz: row.freqHz / 1e6,
          s11MagDb, s11PhaseDeg: s11Phase, s11Real, s11Imag,
          s21MagDb, s21PhaseDeg: s21Phase, s21Real, s21Imag,
          s12MagDb, s12PhaseDeg: s12Phase, s12Real, s12Imag,
          s22MagDb, s22PhaseDeg: s22Phase, s22Real, s22Imag,
          vswrIn: vswr,
          vswrOut: 1.0,
          groupDelayNs: 0,
          kFactor: 1.5,
          muFactor: 1.2,
        };
      });

      if (onImportTouchstone) {
        onImportTouchstone(points, filename);
        setImportStatus(`Successfully loaded ${points.length} points from ${filename}!`);
      }
    } catch (err: unknown) {
      setImportStatus(`Import failed: ${(err as Error).message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-2xl text-slate-100 flex flex-col max-h-[88vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-sky-400" />
            <h3 className="font-semibold text-white text-sm">Touchstone S2P Exchange</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-2 my-3">
          <button
            onClick={() => setActiveTab('export')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'export' ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-400'
            }`}
          >
            Export .s2p File
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'import' ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-400'
            }`}
          >
            Import External .s2p / .s1p
          </button>
        </div>

        {activeTab === 'export' ? (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Format choice & actions */}
            <div className="flex items-center justify-between gap-2 mb-2 text-xs">
              <div className="flex items-center gap-1">
                <span className="text-slate-400">Format:</span>
                {(['DB', 'MA', 'RI'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer ${
                      format === f ? 'bg-sky-500 text-white font-bold' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              </div>
            </div>

            {/* Code preview block */}
            <pre className="flex-1 overflow-auto rounded-xl bg-slate-950 p-3 font-mono text-[10px] text-slate-300 border border-slate-800/80 leading-relaxed scrollbar-thin">
              {exportedContent}
            </pre>
          </div>
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden space-y-3">
            <div className="p-4 rounded-xl border-2 border-dashed border-slate-700 bg-slate-950/40 text-center">
              <Upload className="w-6 h-6 text-sky-400 mx-auto mb-2" />
              <label className="cursor-pointer">
                <span className="text-xs text-sky-400 font-semibold hover:underline">Choose .s2p / .s1p file</span>
                <input type="file" accept=".s2p,.s1p,.txt" onChange={handleFileUpload} className="hidden" />
              </label>
              <p className="text-[10px] text-slate-500 mt-1">Accepts standard VNA Touchstone measurement files</p>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Or Paste Touchstone Raw Text:
              </label>
              <textarea
                value={importedText}
                onChange={(e) => setImportedText(e.target.value)}
                placeholder="# MHz S DB R 50 ..."
                className="w-full h-32 rounded-xl bg-slate-950 border border-slate-800 p-2 font-mono text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>

            {importStatus && (
              <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/30 text-xs text-sky-300">
                {importStatus}
              </div>
            )}

            <button
              onClick={() => processImport(importedText, 'pasted_data.s2p')}
              disabled={!importedText.trim()}
              className="w-full py-2 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-white font-medium text-xs shadow transition cursor-pointer"
            >
              Parse & Load into Simulator
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
