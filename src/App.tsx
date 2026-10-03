/**
 * CircuitRF Mobile - Main Application Entry
 * Cross-platform RF Circuit & Electromagnetic Simulator
 */
import React, { useState, useMemo } from 'react';
import { CIRCUIT_PRESETS } from './presets/circuits';
import { RFPreset, RFComponent, SweepConfig } from './types/circuit';
import { SParameterSolver } from './engine/sParameterSolver';
import { LoadpullEngine } from './engine/loadpullSolver';
import { MatchingSolution } from './engine/matchingSynthesizer';
import { MobileHeader } from './components/MobileHeader';
import { MobileBottomNav, ActiveTab } from './components/MobileBottomNav';
import { CircuitSmithPanel } from './components/CircuitSmithPanel';
import { SParametersView } from './components/SParametersView';
import { HarmonicBalanceView } from './components/HarmonicBalanceView';
import { MicrostripView } from './components/MicrostripView';
import { MatchingSolverModal } from './components/MatchingSolverModal';
import { TouchstoneModal } from './components/TouchstoneModal';
import { GitHubDeployModal } from './components/GitHubDeployModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { Info, Sparkles, RefreshCw } from 'lucide-react';

export default function App() {
  // Preset & Circuit state
  const [currentPreset, setCurrentPreset] = useState<RFPreset>(CIRCUIT_PRESETS[0]);
  const [components, setComponents] = useState<RFComponent[]>(CIRCUIT_PRESETS[0].components);
  const [sweep, setSweep] = useState<SweepConfig>(CIRCUIT_PRESETS[0].defaultSweep);
  const [markerFreqMHz, setMarkerFreqMHz] = useState<number>(CIRCUIT_PRESETS[0].centerFreqMHz);

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<ActiveTab>('circuit-smith');

  // Modals state
  const [isMatchingOpen, setIsMatchingOpen] = useState(false);
  const [isTouchstoneOpen, setIsTouchstoneOpen] = useState(false);
  const [isGitHubOpen, setIsGitHubOpen] = useState(false);

  // Active matching solution for Smith Chart trajectory overlay
  const [selectedMatchingSol, setSelectedMatchingSol] = useState<MatchingSolution | null>(null);

  // Switch preset handler
  const handleSelectPreset = (preset: RFPreset) => {
    setCurrentPreset(preset);
    setComponents(preset.components);
    setSweep(preset.defaultSweep);
    setMarkerFreqMHz(preset.centerFreqMHz);
    setSelectedMatchingSol(null);
  };

  // Component modification handlers
  const handleUpdateComponent = (id: string, updates: Partial<RFComponent>) => {
    setComponents((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const handleToggleComponent = (id: string) => {
    setComponents((prev) =>
      prev.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c))
    );
  };

  const handleAddComponent = (type: RFComponent['type']) => {
    const newId = `elem_${Date.now()}`;
    let newComp: RFComponent;

    switch (type) {
      case 'capacitor_series':
        newComp = {
          id: newId,
          name: 'C_series',
          type,
          value: 2.2,
          unit: 'pF',
          min: 0.2,
          max: 20.0,
          step: 0.1,
          enabled: true,
        };
        break;
      case 'inductor_series':
        newComp = {
          id: newId,
          name: 'L_series',
          type,
          value: 3.3,
          unit: 'nH',
          min: 0.5,
          max: 25.0,
          step: 0.2,
          enabled: true,
        };
        break;
      case 'transmission_line':
        newComp = {
          id: newId,
          name: 'T-Line',
          type,
          value: 50.0,
          unit: 'Ω',
          min: 20,
          max: 100,
          step: 1,
          secondaryValue: 45,
          secondaryUnit: '°',
          enabled: true,
        };
        break;
      case 'open_stub':
        newComp = {
          id: newId,
          name: 'Open Stub',
          type,
          value: 50.0,
          unit: 'Ω',
          min: 20,
          max: 100,
          step: 1,
          secondaryValue: 45,
          secondaryUnit: '°',
          enabled: true,
        };
        break;
      default:
        newComp = {
          id: newId,
          name: 'Resistor',
          type: 'resistor_series',
          value: 50.0,
          unit: 'Ω',
          min: 1,
          max: 200,
          step: 1,
          enabled: true,
        };
    }

    setComponents((prev) => [...prev, newComp]);
  };

  const handleDeleteComponent = (id: string) => {
    setComponents((prev) => prev.filter((c) => c.id !== id));
  };

  // Run full 2-port S-parameter simulation
  const sPoints = useMemo(() => {
    return SParameterSolver.solve(components, sweep);
  }, [components, sweep]);

  // Loadpull simulation (active when GaN amplifier preset is active or available)
  const loadpullResult = useMemo(() => {
    const isAmp = currentPreset.category === 'Amplifier';
    if (!isAmp) return null;
    return LoadpullEngine.solve(markerFreqMHz, 10, sweep.z0, 31.2, 63.5);
  }, [currentPreset, markerFreqMHz, sweep.z0]);

  // Apply matching solution to active circuit
  const handleApplyMatching = (newComps: RFComponent[]) => {
    setComponents((prev) => [...prev, ...newComps]);
  };

  return (
    <div className="h-[100dvh] max-h-[100dvh] bg-[#070b14] text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white overflow-hidden select-none pb-11">
      <OfflineIndicator />

      {/* Header */}
      <MobileHeader
        currentPreset={currentPreset}
        onSelectPreset={handleSelectPreset}
        onOpenMatchingModal={() => setIsMatchingOpen(true)}
        onOpenTouchstoneModal={() => setIsTouchstoneOpen(true)}
        onOpenGitHubModal={() => setIsGitHubOpen(true)}
      />

      {/* Circuit Description & Quick Center Info Banner */}
      <div className="shrink-0 bg-slate-900/60 border-b border-slate-800/60 px-2 py-0.5 text-[10px]">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-slate-300 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            <span className="truncate">{currentPreset.description}</span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 font-mono text-[9px]">
            <span className="text-slate-400">
              f₀: <strong className="text-sky-300">{(markerFreqMHz / 1000).toFixed(2)}GHz</strong>
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">
              Z₀: <strong className="text-emerald-300">{sweep.z0}Ω</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Main View Area - Strictly non-scrolling single page */}
      <main className="flex-1 min-h-0 w-full max-w-6xl mx-auto p-1 sm:p-1.5 flex flex-col overflow-hidden">
        {/* Render Tab Views */}
        {activeTab === 'circuit-smith' && (
          <CircuitSmithPanel
            components={components}
            onUpdateComponent={handleUpdateComponent}
            onToggleComponent={handleToggleComponent}
            onAddComponent={handleAddComponent}
            onDeleteComponent={handleDeleteComponent}
            z0={sweep.z0}
            sPoints={sPoints}
            markerFreqMHz={markerFreqMHz}
            onMarkerFreqChange={setMarkerFreqMHz}
            loadpullResult={loadpullResult}
            matchingSolution={selectedMatchingSol}
          />
        )}

        {activeTab === 'sparams' && (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <SParametersView
              sPoints={sPoints}
              markerFreqMHz={markerFreqMHz}
              onMarkerFreqChange={setMarkerFreqMHz}
              z0={sweep.z0}
            />
          </div>
        )}

        {activeTab === 'harmonic' && (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <HarmonicBalanceView
              centerFreqMHz={markerFreqMHz}
              smallSignalGainDb={
                sPoints.find((p) => Math.abs(p.freqMHz - markerFreqMHz) < 20)?.s21MagDb ?? 14.5
              }
            />
          </div>
        )}

        {activeTab === 'microstrip' && (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <MicrostripView
              freqMHz={markerFreqMHz}
            />
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <MobileBottomNav activeTab={activeTab} onChangeTab={setActiveTab} />

      {/* Modals */}
      <MatchingSolverModal
        isOpen={isMatchingOpen}
        onClose={() => setIsMatchingOpen(false)}
        freqMHz={markerFreqMHz}
        z0={sweep.z0}
        onApplySolution={handleApplyMatching}
        onSelectSolutionForSmith={(sol) => {
          setSelectedMatchingSol(sol);
          setActiveTab('circuit-smith');
          setIsMatchingOpen(false);
        }}
      />

      <TouchstoneModal
        isOpen={isTouchstoneOpen}
        onClose={() => setIsTouchstoneOpen(false)}
        sPoints={sPoints}
        circuitName={currentPreset.name}
        z0={sweep.z0}
        onImportTouchstone={(importedPoints, filename) => {
          setIsTouchstoneOpen(false);
          setActiveTab('sparams');
        }}
      />

      <GitHubDeployModal
        isOpen={isGitHubOpen}
        onClose={() => setIsGitHubOpen(false)}
      />
    </div>
  );
}
