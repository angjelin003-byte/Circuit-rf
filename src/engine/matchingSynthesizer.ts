/**
 * Automated RF Impedance Matching Network Synthesizer
 */
import { Complex } from './complex';
import { RFMath } from './rfMath';

export interface MatchingSolution {
  name: string;
  topology: 'Low-Pass (Shunt C, Series L)' | 'High-Pass (Shunt L, Series C)' | 'Quarter-Wave Line' | 'Series L, Shunt C';
  cValuePf?: number;
  lValueNh?: number;
  z0Line?: number;
  lengthMmLine?: number;
  qFactor: number;
  trajectoryGamma: { u: number; v: number; label: string }[];
}

export class MatchingSynthesizer {
  /**
   * Synthesize L-network to match Source Zs to Load ZL at freqMHz
   */
  static synthesizeLMatch(
    rs: number,
    xs: number,
    rl: number,
    xl: number,
    freqMHz: number,
    z0: number = 50
  ): MatchingSolution[] {
    const omega = 2 * Math.PI * freqMHz * 1e6;
    const solutions: MatchingSolution[] = [];

    // Starting normalized point (Source conjugate or Load)
    const zStart = new Complex(rl / z0, xl / z0);
    const gammaStart = RFMath.zToGamma(zStart);

    // Case 1: RL < RS -> Shunt element across Source, series with Load
    // Or standard 8-cases for arbitrary Rs, Xs and RL, XL
    // Let's solve standard L-match absorbing reactances
    const rSmall = Math.min(rs, rl);
    const rLarge = Math.max(rs, rl);

    if (rLarge > rSmall && rSmall > 0) {
      const q = Math.sqrt(rLarge / rSmall - 1);

      // Low-Pass Topology: Shunt C, Series L
      // Reactance of shunt element: X_p = rLarge / Q
      // Reactance of series element: X_s = Q * rSmall
      const xShunt = rLarge / q;
      const xSeries = q * rSmall;

      const cPf = (1 / (omega * xShunt)) * 1e12;
      const lNh = (xSeries / omega) * 1e9;

      // Trajectory points on Smith Chart
      const intermediateZ = new Complex(rSmall / z0, (xl + (rl < rs ? xSeries : 0)) / z0);
      const gammaInter = RFMath.zToGamma(intermediateZ);
      const gammaTarget = RFMath.zToGamma(new Complex(rs / z0, xs / z0));

      solutions.push({
        name: 'Low-Pass L-Match',
        topology: 'Low-Pass (Shunt C, Series L)',
        cValuePf: Math.abs(cPf),
        lValueNh: Math.abs(lNh),
        qFactor: q,
        trajectoryGamma: [
          { u: gammaStart.r, v: gammaStart.i, label: 'Z_Load' },
          { u: gammaInter.r, v: gammaInter.i, label: 'After Series L' },
          { u: gammaTarget.r, v: gammaTarget.i, label: 'Z_Matched' },
        ],
      });

      // High-Pass Topology: Shunt L, Series C
      const lShuntNh = (xShunt / omega) * 1e9;
      const cSeriesPf = (1 / (omega * xSeries)) * 1e12;

      solutions.push({
        name: 'High-Pass L-Match',
        topology: 'High-Pass (Shunt L, Series C)',
        cValuePf: Math.abs(cSeriesPf),
        lValueNh: Math.abs(lShuntNh),
        qFactor: q,
        trajectoryGamma: [
          { u: gammaStart.r, v: gammaStart.i, label: 'Z_Load' },
          { u: gammaInter.r, v: -gammaInter.i, label: 'After Series C' },
          { u: gammaTarget.r, v: gammaTarget.i, label: 'Z_Matched' },
        ],
      });
    }

    // Quarter-wave transformer solution (for resistive match)
    if (Math.abs(xs) < 1e-3 && Math.abs(xl) < 1e-3 && rs > 0 && rl > 0) {
      const z0Line = Math.sqrt(rs * rl);
      // Lambda/4 length in mm for standard air or substrate (assuming er=3.66)
      const vp = 299792458 / Math.sqrt(3.0);
      const lambdaMm = (vp / (freqMHz * 1e6)) * 1000;
      const lengthMm = lambdaMm / 4;

      solutions.push({
        name: 'Quarter-Wave Transformer',
        topology: 'Quarter-Wave Line',
        z0Line: Math.round(z0Line * 10) / 10,
        lengthMmLine: Math.round(lengthMm * 100) / 100,
        qFactor: Math.abs(rs - rl) / Math.sqrt(rs * rl),
        trajectoryGamma: [
          { u: gammaStart.r, v: gammaStart.i, label: 'Z_Load' },
          { u: 0, v: 0, label: '50Ω Match' },
        ],
      });
    }

    return solutions;
  }
}
