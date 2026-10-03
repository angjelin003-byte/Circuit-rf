/**
 * CircuitRF Mobile - Type Definitions
 * Inspired by potatobeanradio/circuitRF
 */

export type RFComponentType =
  | 'resistor_series'
  | 'resistor_shunt'
  | 'capacitor_series'
  | 'capacitor_shunt'
  | 'inductor_series'
  | 'inductor_shunt'
  | 'transmission_line'
  | 'microstrip'
  | 'open_stub'
  | 'short_stub'
  | 'transistor_active'
  | 'attenuator_pad'
  | 'coupled_line';

export interface RFComponent {
  id: string;
  name: string;
  type: RFComponentType;
  // Parameters
  value: number; // e.g. R in Ohms, C in pF, L in nH, Z0 in Ohms, Attenuation in dB
  unit: string;
  min: number;
  max: number;
  step: number;
  // Extra parameters for transmission lines / microstrip / active
  secondaryValue?: number; // e.g. electrical length in deg, or length in mm, or Transistor bias (mA)
  secondaryUnit?: string;
  secondaryMin?: number;
  secondaryMax?: number;
  secondaryStep?: number;
  tertiaryValue?: number; // e.g. width in mm for microstrip, or Vds for transistor
  tertiaryUnit?: string;
  enabled: boolean;
}

export interface SweepConfig {
  startFreqMHz: number;
  stopFreqMHz: number;
  points: number;
  z0: number; // Reference impedance, default 50 Ohms
}

export interface SParameterPoint {
  freqMHz: number;
  // S11
  s11MagDb: number;
  s11PhaseDeg: number;
  s11Real: number;
  s11Imag: number;
  // S21
  s21MagDb: number;
  s21PhaseDeg: number;
  s21Real: number;
  s21Imag: number;
  // S12
  s12MagDb: number;
  s12PhaseDeg: number;
  s12Real: number;
  s12Imag: number;
  // S22
  s22MagDb: number;
  s22PhaseDeg: number;
  s22Real: number;
  s22Imag: number;
  // Derived metrics
  vswrIn: number;
  vswrOut: number;
  groupDelayNs: number;
  kFactor: number; // Rollett stability factor
  muFactor: number;
}

export interface HarmonicPoint {
  harmonic: number;
  freqMHz: number;
  powerDbm: number;
  phaseDeg: number;
}

export interface PowerSweepPoint {
  pinDbm: number;
  poutDbm: number;
  linearPoutDbm: number;
  gainDb: number;
  compressionDb: number;
  paePercent: number;
  thdPercent: number;
}

export interface HarmonicBalanceResult {
  fundamentalFreqMHz: number;
  nominalPinDbm: number;
  harmonics: HarmonicPoint[];
  powerSweep: PowerSweepPoint[];
  p1dbInDbm: number;
  p1dbOutDbm: number;
  oip3Dbm: number;
  iip3Dbm: number;
  thdPercent: number;
  dcPowerWatts: number;
  maxPaePercent: number;
}

export interface LoadpullContour {
  level: number; // e.g. 30 dBm, 29 dBm, or 60% PAE
  type: 'power' | 'pae';
  points: { u: number; v: number; zReal: number; zImag: number }[];
}

export interface LoadpullResult {
  freqMHz: number;
  pinDbm: number;
  z0: number;
  maxPowerDbm: number;
  maxPaePercent: number;
  zOptPower: { r: number; x: number };
  zOptPae: { r: number; x: number };
  powerContours: LoadpullContour[];
  paeContours: LoadpullContour[];
}

export interface SubstrateMaterial {
  id: string;
  name: string;
  er: number; // Dielectric constant
  lossTangent: number; // tan(delta)
  roughnessUm: number;
  conductivity: number; // S/m (e.g. Copper 5.8e7)
}

export interface MicrostripResult {
  z0: number;
  erEff: number;
  lambdaGuidedMm: number;
  phaseVelocityMps: number;
  attenuationDbPerM: number;
  electricalLengthDeg: number;
  physicalLengthMm: number;
  widthMm: number;
  heightMm: number;
}

export interface RFPreset {
  id: string;
  name: string;
  category: 'Amplifier' | 'Filter' | 'Passive' | 'Matching' | 'Coupler';
  description: string;
  defaultSweep: SweepConfig;
  centerFreqMHz: number;
  components: RFComponent[];
}
