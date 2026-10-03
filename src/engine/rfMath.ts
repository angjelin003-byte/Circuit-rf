/**
 * Core RF Network & Microwave Mathematics for CircuitRF
 */
import { Complex } from './complex';
import { Matrix2x2 } from './matrix';

export interface SParameters {
  s11: Complex;
  s21: Complex;
  s12: Complex;
  s22: Complex;
}

export class RFMath {
  /**
   * Convert ABCD parameters to S-parameters referenced to Z0 (standard 50 ohms).
   *
   * Denom = A + B/Z0 + C*Z0 + D
   * S11 = (A + B/Z0 - C*Z0 - D) / Denom
   * S12 = 2 * (A*D - B*C) / Denom
   * S21 = 2 / Denom
   * S22 = (-A + B/Z0 - C*Z0 + D) / Denom
   */
  static abcdToS(m: Matrix2x2, z0: number = 50): SParameters {
    const bOverZ0 = m.b.div(z0);
    const cTimesZ0 = m.c.mul(z0);

    const denom = m.a.add(bOverZ0).add(cTimesZ0).add(m.d);
    if (denom.magSq() === 0) {
      return {
        s11: Complex.ZERO,
        s21: Complex.ZERO,
        s12: Complex.ZERO,
        s22: Complex.ZERO,
      };
    }

    const det = m.det();

    const s11 = m.a.add(bOverZ0).sub(cTimesZ0).sub(m.d).div(denom);
    const s12 = det.mul(2).div(denom);
    const s21 = new Complex(2, 0).div(denom);
    const s22 = m.a.neg().add(bOverZ0).sub(cTimesZ0).add(m.d).div(denom);

    return { s11, s21, s12, s22 };
  }

  /**
   * Convert S-parameters to ABCD parameters referenced to Z0.
   */
  static sToAbcd(s: SParameters, z0: number = 50): Matrix2x2 {
    const twoS21 = s.s21.mul(2);
    const deltaS = s.s11.mul(s.s22).sub(s.s12.mul(s.s21));

    const a = Complex.ONE.add(s.s11).sub(s.s22).sub(deltaS).div(twoS21);
    const b = Complex.ONE.add(s.s11).add(s.s22).add(deltaS).mul(z0).div(twoS21);
    const c = Complex.ONE.sub(s.s11).sub(s.s22).add(deltaS).div(twoS21).div(z0);
    const d = Complex.ONE.sub(s.s11).add(s.s22).sub(deltaS).div(twoS21);

    return new Matrix2x2(a, b, c, d);
  }

  /**
   * Calculate Voltage Standing Wave Ratio (VSWR) from reflection coefficient Gamma.
   * VSWR = (1 + |Gamma|) / (1 - |Gamma|)
   */
  static vswr(gamma: Complex): number {
    const mag = gamma.mag();
    if (mag >= 0.99999) return 99.99;
    return (1 + mag) / (1 - mag);
  }

  /**
   * Convert normalized impedance z = r + jx to reflection coefficient Gamma:
   * Gamma = (z - 1) / (z + 1)
   */
  static zToGamma(zNorm: Complex): Complex {
    return zNorm.sub(1).div(zNorm.add(1));
  }

  /**
   * Convert reflection coefficient Gamma to normalized impedance:
   * z = (1 + Gamma) / (1 - Gamma)
   */
  static gammaToZ(gamma: Complex): Complex {
    const num = Complex.ONE.add(gamma);
    const den = Complex.ONE.sub(gamma);
    if (den.magSq() < 1e-12) return new Complex(1e6, 1e6);
    return num.div(den);
  }

  /**
   * Rollett's stability factor K and determinant Delta:
   * Delta = S11*S22 - S12*S21
   * K = (1 - |S11|^2 - |S22|^2 + |Delta|^2) / (2 * |S12 * S21|)
   * Stable if K > 1 and |Delta| < 1.
   */
  static stabilityK(s: SParameters): { k: number; deltaMag: number } {
    const delta = s.s11.mul(s.s22).sub(s.s12.mul(s.s21));
    const deltaMag = delta.mag();
    const denom = 2 * s.s12.mag() * s.s21.mag();
    if (denom < 1e-12) return { k: 99.9, deltaMag };

    const num = 1 - s.s11.magSq() - s.s22.magSq() + deltaMag * deltaMag;
    return { k: num / denom, deltaMag };
  }

  /**
   * Edwards-Sinsky mu stability factor:
   * mu = (1 - |S11|^2) / (|S22 - Delta*conj(S11)| + |S12*S21|)
   * Unconditionally stable if mu > 1.
   */
  static stabilityMu(s: SParameters): number {
    const delta = s.s11.mul(s.s22).sub(s.s12.mul(s.s21));
    const s11MagSq = s.s11.magSq();
    const term1 = s.s22.sub(delta.mul(s.s11.conj())).mag();
    const term2 = s.s12.mag() * s.s21.mag();
    const denom = term1 + term2;
    if (denom < 1e-12) return 99.9;
    return (1 - s11MagSq) / denom;
  }

  /**
   * Smith Chart: Circle parameters for constant normalized resistance r:
   * Center u = r / (1 + r), v = 0
   * Radius R = 1 / (1 + r)
   */
  static smithResistanceCircle(r: number): { u: number; v: number; radius: number } {
    return {
      u: r / (1 + r),
      v: 0,
      radius: 1 / (1 + r),
    };
  }

  /**
   * Smith Chart: Arc parameters for constant normalized reactance x:
   * Center u = 1, v = 1 / x
   * Radius R = 1 / |x|
   */
  static smithReactanceArc(x: number): { u: number; v: number; radius: number } {
    return {
      u: 1,
      v: 1 / x,
      radius: 1 / Math.abs(x),
    };
  }

  /**
   * Convert Gamma (u, v) in range [-1, 1] to Smith chart pixel coordinates (px, py)
   * on a canvas of width, height with padding.
   */
  static gammaToPixel(
    u: number,
    v: number,
    cx: number,
    cy: number,
    chartRadius: number
  ): { x: number; y: number } {
    return {
      x: cx + u * chartRadius,
      y: cy - v * chartRadius, // SVG / screen y-axis is inverted
    };
  }

  /**
   * Convert screen/canvas coordinates to Gamma (u, v)
   */
  static pixelToGamma(
    px: number,
    py: number,
    cx: number,
    cy: number,
    chartRadius: number
  ): { u: number; v: number } {
    return {
      u: (px - cx) / chartRadius,
      v: (cy - py) / chartRadius,
    };
  }
}
