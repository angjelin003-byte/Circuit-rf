/**
 * 2-Port S-Parameter Solver for RF Networks
 */
import { Complex } from './complex';
import { Matrix2x2 } from './matrix';
import { RFMath } from './rfMath';
import { MicrostripEngine } from './microstrip';
import { RFComponent, SweepConfig, SParameterPoint } from '../types/circuit';

export class SParameterSolver {
  /**
   * Run frequency sweep simulation on a list of cascaded RF components
   */
  static solve(
    components: RFComponent[],
    sweep: SweepConfig,
    activeTransistorModel?: { biasVds: number; biasIdsMa: number }
  ): SParameterPoint[] {
    const points: SParameterPoint[] = [];
    const enabledComponents = components.filter((c) => c.enabled);

    const freqStep =
      sweep.points > 1
        ? (sweep.stopFreqMHz - sweep.startFreqMHz) / (sweep.points - 1)
        : 0;

    let prevPhaseS21Rad: number | null = null;
    let prevFreqHz: number | null = null;

    for (let i = 0; i < sweep.points; i++) {
      const freqMHz = sweep.startFreqMHz + i * freqStep;
      const freqHz = freqMHz * 1e6;
      const omega = 2 * Math.PI * freqHz;

      // Start with Identity ABCD matrix
      let totalAbcd = Matrix2x2.IDENTITY;

      for (const comp of enabledComponents) {
        const elemAbcd = this.componentToAbcd(comp, freqHz, omega, activeTransistorModel);
        totalAbcd = totalAbcd.mul(elemAbcd);
      }

      // Convert combined ABCD to S-parameters
      const s = RFMath.abcdToS(totalAbcd, sweep.z0);

      // VSWR
      const vswrIn = RFMath.vswr(s.s11);
      const vswrOut = RFMath.vswr(s.s22);

      // Stability
      const { k: kFactor } = RFMath.stabilityK(s);
      const muFactor = RFMath.stabilityMu(s);

      // Group delay: - d(phase_s21_rad) / d(omega)
      let groupDelayNs = 0;
      const currentPhaseS21Rad = s.s21.phaseRad();

      if (prevPhaseS21Rad !== null && prevFreqHz !== null && freqHz > prevFreqHz) {
        let deltaPhase = currentPhaseS21Rad - prevPhaseS21Rad;
        // Unwrap phase jump
        while (deltaPhase > Math.PI) deltaPhase -= 2 * Math.PI;
        while (deltaPhase < -Math.PI) deltaPhase += 2 * Math.PI;

        const deltaOmega = 2 * Math.PI * (freqHz - prevFreqHz);
        if (deltaOmega > 0) {
          groupDelayNs = (-deltaPhase / deltaOmega) * 1e9;
        }
      }
      prevPhaseS21Rad = currentPhaseS21Rad;
      prevFreqHz = freqHz;

      points.push({
        freqMHz,
        s11MagDb: s.s11.magDb(),
        s11PhaseDeg: s.s11.phaseDeg(),
        s11Real: s.s11.r,
        s11Imag: s.s11.i,

        s21MagDb: s.s21.magDb(),
        s21PhaseDeg: s.s21.phaseDeg(),
        s21Real: s.s21.r,
        s21Imag: s.s21.i,

        s12MagDb: s.s12.magDb(),
        s12PhaseDeg: s.s12.phaseDeg(),
        s12Real: s.s12.r,
        s12Imag: s.s12.i,

        s22MagDb: s.s22.magDb(),
        s22PhaseDeg: s.s22.phaseDeg(),
        s22Real: s.s22.r,
        s22Imag: s.s22.i,

        vswrIn,
        vswrOut,
        groupDelayNs: Math.max(-100, Math.min(100, groupDelayNs)),
        kFactor,
        muFactor,
      });
    }

    return points;
  }

  /**
   * Convert individual RF component to ABCD matrix at given frequency
   */
  private static componentToAbcd(
    comp: RFComponent,
    freqHz: number,
    omega: number,
    activeTransistorModel?: { biasVds: number; biasIdsMa: number }
  ): Matrix2x2 {
    switch (comp.type) {
      case 'resistor_series': {
        const r = new Complex(comp.value, 0);
        return Matrix2x2.seriesZ(r);
      }

      case 'resistor_shunt': {
        const r = Math.max(1e-4, comp.value);
        const y = new Complex(1 / r, 0);
        return Matrix2x2.shuntY(y);
      }

      case 'capacitor_series': {
        // C in pF -> value * 1e-12
        const cFarad = Math.max(1e-18, comp.value * 1e-12);
        const z = new Complex(0, -1 / (omega * cFarad));
        return Matrix2x2.seriesZ(z);
      }

      case 'capacitor_shunt': {
        const cFarad = Math.max(1e-18, comp.value * 1e-12);
        const y = new Complex(0, omega * cFarad);
        return Matrix2x2.shuntY(y);
      }

      case 'inductor_series': {
        // L in nH -> value * 1e-9
        const lHenry = Math.max(1e-15, comp.value * 1e-9);
        const z = new Complex(0, omega * lHenry);
        return Matrix2x2.seriesZ(z);
      }

      case 'inductor_shunt': {
        const lHenry = Math.max(1e-15, comp.value * 1e-9);
        const y = new Complex(0, -1 / (omega * lHenry));
        return Matrix2x2.shuntY(y);
      }

      case 'transmission_line': {
        // value = Z0 (Ohms), secondaryValue = electrical length theta0 (deg) at 1 GHz
        const z0 = Math.max(1, comp.value);
        const thetaRefDeg = comp.secondaryValue ?? 90;
        const refFreqHz = 1e9;
        const thetaRad = ((thetaRefDeg * (freqHz / refFreqHz)) * Math.PI) / 180;
        return Matrix2x2.transmissionLine(z0, thetaRad);
      }

      case 'microstrip': {
        // value = W (mm), secondaryValue = L (mm), tertiaryValue = Substrate Er (default 4.4)
        const wMm = Math.max(0.1, comp.value);
        const lMm = Math.max(0.1, comp.secondaryValue ?? 10);
        const er = comp.tertiaryValue ?? 4.4;
        const hMm = 0.8; // standard 0.8mm substrate
        const freqGHz = freqHz / 1e9;

        const { z0, erEffFreq } = MicrostripEngine.analyze(wMm, hMm, er, freqGHz);
        const vp = 299792458 / Math.sqrt(erEffFreq);
        const beta = (omega / vp);
        const thetaRad = beta * (lMm * 1e-3);
        return Matrix2x2.transmissionLine(z0, thetaRad);
      }

      case 'open_stub': {
        // Shunt open circuit stub: value = Z0, secondaryValue = electrical length at 1 GHz
        const z0 = Math.max(1, comp.value);
        const thetaRefDeg = comp.secondaryValue ?? 90;
        const thetaRad = ((thetaRefDeg * (freqHz / 1e9)) * Math.PI) / 180;
        return Matrix2x2.shuntOpenStub(z0, thetaRad);
      }

      case 'short_stub': {
        // Shunt shorted stub: value = Z0, secondaryValue = electrical length at 1 GHz
        const z0 = Math.max(1, comp.value);
        const thetaRefDeg = comp.secondaryValue ?? 90;
        const thetaRad = ((thetaRefDeg * (freqHz / 1e9)) * Math.PI) / 180;
        return Matrix2x2.shuntShortStub(z0, thetaRad);
      }

      case 'attenuator_pad': {
        // Pi-attenuator pad: comp.value = Attenuation in dB, Z0 = 50
        const attenDb = Math.max(0.1, comp.value);
        const z0 = comp.secondaryValue ?? 50;
        const k = Math.pow(10, attenDb / 20);
        const r1 = z0 * ((k + 1) / (k - 1)); // shunt resistor
        const r2 = z0 * ((k * k - 1) / (2 * k)); // series resistor

        const shuntY = Matrix2x2.shuntY(new Complex(1 / r1, 0));
        const seriesZ = Matrix2x2.seriesZ(new Complex(r2, 0));
        return shuntY.mul(seriesZ).mul(shuntY);
      }

      case 'transistor_active': {
        // Active RF transistor (GaN / HEMT / BJT) model
        // S21 gain decays with frequency (fT ~ 12 GHz), S11 capacitive, S12 feedback
        const freqGHz = freqHz / 1e9;
        const gmNorm = (comp.value / 10) * ((activeTransistorModel?.biasIdsMa ?? 40) / 40); // transconductance scale
        const fT = 14.0; // GHz
        const rollOff = 1 / Math.sqrt(1 + Math.pow(freqGHz / fT, 2));

        // Transistor S-parameters
        const s21Mag = Math.max(0.05, 3.5 * gmNorm * rollOff);
        const s21Phase = -45 - (freqGHz / fT) * 120;
        const s11Mag = Math.min(0.95, 0.75 / Math.sqrt(1 + freqGHz * 0.1));
        const s11Phase = -30 - freqGHz * 22;
        const s12Mag = Math.min(0.2, 0.04 * (1 + freqGHz * 0.25));
        const s12Phase = 45 - freqGHz * 15;
        const s22Mag = Math.min(0.85, 0.6 / Math.sqrt(1 + freqGHz * 0.15));
        const s22Phase = -25 - freqGHz * 18;

        const sTransistor = {
          s11: Complex.fromPolarDeg(s11Mag, s11Phase),
          s21: Complex.fromPolarDeg(s21Mag, s21Phase),
          s12: Complex.fromPolarDeg(s12Mag, s12Phase),
          s22: Complex.fromPolarDeg(s22Mag, s22Phase),
        };

        return RFMath.sToAbcd(sTransistor, 50);
      }

      case 'coupled_line': {
        // Coupled microstrip pair: value = Z0e (even), secondaryValue = Z0o (odd), tertiary = theta at 1GHz
        const z0e = comp.value;
        const z0o = comp.secondaryValue ?? 35;
        const thetaRefDeg = comp.tertiaryValue ?? 90;
        const thetaRad = ((thetaRefDeg * (freqHz / 1e9)) * Math.PI) / 180;

        // Approximate coupled section equivalent ABCD
        const z0 = Math.sqrt(z0e * z0o);
        const couplingC = (z0e - z0o) / (z0e + z0o);
        return Matrix2x2.transmissionLine(z0 * (1 - couplingC * 0.2), thetaRad);
      }

      default:
        return Matrix2x2.IDENTITY;
    }
  }
}
