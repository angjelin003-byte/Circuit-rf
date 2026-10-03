/**
 * Microstrip and Planar Transmission Line Synthesizer & Analyzer
 * Implements standard Hammerstad-Jensen equations with dispersion & loss.
 */
import { SubstrateMaterial, MicrostripResult } from '../types/circuit';

export const SUBSTRATES: SubstrateMaterial[] = [
  {
    id: 'ro4350b',
    name: 'Rogers RO4350B (High-Freq)',
    er: 3.66,
    lossTangent: 0.0037,
    roughnessUm: 1.5,
    conductivity: 5.8e7, // Copper
  },
  {
    id: 'rt5880',
    name: 'Rogers RT/duroid 5880 (Low-Loss PTFE)',
    er: 2.20,
    lossTangent: 0.0009,
    roughnessUm: 1.0,
    conductivity: 5.8e7,
  },
  {
    id: 'fr4',
    name: 'FR-4 Standard PCB',
    er: 4.40,
    lossTangent: 0.02,
    roughnessUm: 2.5,
    conductivity: 5.8e7,
  },
  {
    id: 'alumina',
    name: 'Alumina 99.6% (Thin-Film Microwave)',
    er: 9.90,
    lossTangent: 0.0001,
    roughnessUm: 0.1,
    conductivity: 4.1e7, // Gold
  },
  {
    id: 'polyimide',
    name: 'Polyimide Flexible (Kapton)',
    er: 3.50,
    lossTangent: 0.008,
    roughnessUm: 1.2,
    conductivity: 5.8e7,
  },
];

export class MicrostripEngine {
  private static readonly C0 = 299792458; // speed of light in m/s
  private static readonly MU0 = 4 * Math.PI * 1e-7;

  /**
   * Analysis: Given Physical Width W (mm), Height h (mm), and Dielectric Er,
   * compute Characteristic Impedance Z0 (Ohms) and Effective Dielectric Constant Er_eff.
   * Uses Hammerstad and Jensen closed-form equations.
   */
  static analyze(
    wMm: number,
    hMm: number,
    er: number,
    freqGHz: number = 2.4,
    tCopperMm: number = 0.035
  ): { z0: number; erEff: number; erEffFreq: number } {
    const u = wMm / hMm;
    const t = tCopperMm / hMm;

    // Thickness correction for u
    let deltaU = 0;
    if (t > 0) {
      const deltaT = (t / Math.PI) * (1 + Math.log((4 * Math.PI * (t <= 1 ? 1 : u)) / t));
      deltaU = deltaT;
    }
    const uEff = u + deltaU;

    // Hammerstad-Jensen effective dielectric constant (quasi-static)
    const a = 1 + (1 / 49) * Math.log((Math.pow(uEff, 4) + Math.pow(uEff / 52, 2)) / (Math.pow(uEff, 4) + 0.432)) + (1 / 18.7) * Math.log(1 + Math.pow(uEff / 18.1, 3));
    const b = 0.564 * Math.pow((er - 0.9) / (er + 3), 0.053);
    const erEffQuasi = (er + 1) / 2 + ((er - 1) / 2) * Math.pow(1 + 10 / uEff, -a * b);

    // Hammerstad-Jensen characteristic impedance of air microstrip
    const fU = 6 + (2 * Math.PI - 6) * Math.exp(-Math.pow(30.666 / uEff, 0.7528));
    const zAir = 60 * Math.log(fU / uEff + Math.sqrt(1 + Math.pow(2 / uEff, 2)));

    const z0Quasi = zAir / Math.sqrt(erEffQuasi);

    // High frequency dispersion (Getsinger & Kirschning-Jansen dispersion model)
    const fp = z0Quasi / (2 * 4 * Math.PI * 1e-7 * (hMm * 1e-3)); // cutoff reference
    const p = 0.5 + 0.01 * (2 * er - 1) * Math.log(100 / uEff);
    const g = 0.6 + 0.009 * z0Quasi;
    const fRel = (freqGHz * 1e9) / (fp * 1e6);
    const erEffFreq = er - (er - erEffQuasi) / (1 + Math.pow(fRel / g, p));

    const z0Freq = z0Quasi * Math.sqrt(erEffQuasi / erEffFreq);

    return {
      z0: Math.max(1, z0Freq),
      erEff: erEffQuasi,
      erEffFreq: Math.max(1, erEffFreq),
    };
  }

  /**
   * Synthesis: Given Target Z0 (Ohms), Height h (mm), and Dielectric Er,
   * find required Physical Width W (mm).
   */
  static synthesize(
    targetZ0: number,
    hMm: number,
    er: number,
    freqGHz: number = 2.4
  ): number {
    // Wheeler's initial estimate
    const a = (targetZ0 / 60) * Math.sqrt((er + 1) / 2) + ((er - 1) / (er + 1)) * (0.23 + 0.11 / er);
    const b = (377 * Math.PI) / (2 * targetZ0 * Math.sqrt(er));

    let uEst = 0;
    if (a > 1.52) {
      uEst = (8 * Math.exp(a)) / (Math.exp(2 * a) - 2);
    } else {
      uEst = (2 / Math.PI) * (b - 1 - Math.log(2 * b - 1) + ((er - 1) / (2 * er)) * (Math.log(b - 1) + 0.39 - 0.61 / er));
    }

    let wEst = uEst * hMm;

    // Newton-Raphson refinement
    for (let iter = 0; iter < 12; iter++) {
      const { z0 } = this.analyze(wEst, hMm, er, freqGHz);
      const diff = z0 - targetZ0;
      if (Math.abs(diff) < 0.01) break;

      const deltaW = 0.001;
      const { z0: z0High } = this.analyze(wEst + deltaW, hMm, er, freqGHz);
      const derivative = (z0High - z0) / deltaW;

      if (Math.abs(derivative) > 1e-6) {
        wEst = Math.max(0.01, wEst - diff / derivative);
      } else {
        break;
      }
    }

    return Math.max(0.02, wEst);
  }

  /**
   * Complete calculation package: electrical to physical length & attenuation
   */
  static calculate(
    wMm: number,
    hMm: number,
    lengthMm: number,
    substrate: SubstrateMaterial,
    freqGHz: number,
    tCopperMm: number = 0.035
  ): MicrostripResult {
    const { z0, erEffFreq } = this.analyze(wMm, hMm, substrate.er, freqGHz, tCopperMm);

    const vp = this.C0 / Math.sqrt(erEffFreq);
    const lambda0M = this.C0 / (freqGHz * 1e9);
    const lambdaGuidedM = lambda0M / Math.sqrt(erEffFreq);
    const lambdaGuidedMm = lambdaGuidedM * 1000;

    // Electrical length theta = 360 * (length / lambda_g)
    const electricalLengthDeg = (360 * lengthMm) / lambdaGuidedMm;

    // Losses:
    // Dielectric loss: alpha_d = (omega * tan(delta) / 2c) * (er / sqrt(erEff)) * (erEff - 1) / (er - 1)
    const k0 = (2 * Math.PI * freqGHz * 1e9) / this.C0;
    const alphaD_NpM = (k0 * substrate.lossTangent * substrate.er * (erEffFreq - 1)) / (2 * Math.sqrt(erEffFreq) * (substrate.er - 1));
    const alphaD_DbM = alphaD_NpM * 8.686;

    // Conductor skin depth: delta = sqrt(1 / (pi * f * mu * sigma))
    const skinDepthM = Math.sqrt(1 / (Math.PI * freqGHz * 1e9 * this.MU0 * substrate.conductivity));
    const surfaceResistance = 1 / (substrate.conductivity * skinDepthM);
    // Attenuation conductor
    const alphaC_DbM = 8.686 * (surfaceResistance / (z0 * (wMm * 1e-3)));

    const totalLossDbM = alphaD_DbM + alphaC_DbM;

    return {
      z0,
      erEff: erEffFreq,
      lambdaGuidedMm,
      phaseVelocityMps: vp,
      attenuationDbPerM: totalLossDbM,
      electricalLengthDeg,
      physicalLengthMm: lengthMm,
      widthMm: wMm,
      heightMm: hMm,
    };
  }
}
