/**
 * Loadpull / Sourcepull Analysis Engine for CircuitRF
 * Generates power and efficiency contours mapped on the Smith Chart.
 */
import { Complex } from './complex';
import { RFMath } from './rfMath';
import { LoadpullResult, LoadpullContour } from '../types/circuit';

export class LoadpullEngine {
  /**
   * Solve loadpull for an active RF transistor at frequency f0
   */
  static solve(
    freqMHz: number = 2400,
    pinDbm: number = 10,
    z0: number = 50,
    baseMaxPowerDbm: number = 31.5,
    baseMaxPae: number = 64.0
  ): LoadpullResult {
    // Optimum load impedance for maximum power: e.g. 15 + j*12 Ohms (typical GaN)
    // Normalized to 50 ohms: zOpt = 0.3 + j0.24
    const zOptPowerReal = 18.0;
    const zOptPowerImag = 14.0;
    const zOptPowerNorm = new Complex(zOptPowerReal / z0, zOptPowerImag / z0);
    const gammaOptPower = RFMath.zToGamma(zOptPowerNorm);

    // Optimum for efficiency is slightly shifted towards higher resistance
    const zOptPaeReal = 24.0;
    const zOptPaeImag = 22.0;
    const zOptPaeNorm = new Complex(zOptPaeReal / z0, zOptPaeImag / z0);
    const gammaOptPae = RFMath.zToGamma(zOptPaeNorm);

    // Generate closed contour loops for Power (Pmax, -1dB, -2dB, -3dB)
    const powerLevels = [
      baseMaxPowerDbm,
      baseMaxPowerDbm - 1.0,
      baseMaxPowerDbm - 2.0,
      baseMaxPowerDbm - 3.5,
    ];

    const powerContours: LoadpullContour[] = powerLevels.map((lvl) => {
      const dropDb = baseMaxPowerDbm - lvl;
      // Ellipse semi-axes in Gamma plane centered near gammaOptPower
      const aRadius = 0.08 + dropDb * 0.11;
      const bRadius = 0.06 + dropDb * 0.085;
      const tiltAngleRad = 0.45; // tilt in radians

      const points = [];
      const numPts = 36;
      for (let i = 0; i <= numPts; i++) {
        const phi = (i / numPts) * 2 * Math.PI;
        const dx = aRadius * Math.cos(phi);
        const dy = bRadius * Math.sin(phi);

        // Rotate
        const rotX = dx * Math.cos(tiltAngleRad) - dy * Math.sin(tiltAngleRad);
        const rotY = dx * Math.sin(tiltAngleRad) + dy * Math.cos(tiltAngleRad);

        const u = gammaOptPower.r + rotX;
        const v = gammaOptPower.i + rotY;

        // Convert back to Z
        const zComp = RFMath.gammaToZ(new Complex(u, v)).mul(z0);
        points.push({ u, v, zReal: zComp.r, zImag: zComp.i });
      }

      return {
        level: lvl,
        type: 'power',
        points,
      };
    });

    // Generate closed contour loops for PAE (e.g. 60%, 55%, 48%, 38%)
    const paeLevels = [baseMaxPae - 4, baseMaxPae - 10, baseMaxPae - 18];
    const paeContours: LoadpullContour[] = paeLevels.map((lvl) => {
      const dropPct = baseMaxPae - lvl;
      const aRadius = 0.09 + dropPct * 0.016;
      const bRadius = 0.07 + dropPct * 0.012;
      const tiltAngleRad = 0.35;

      const points = [];
      const numPts = 36;
      for (let i = 0; i <= numPts; i++) {
        const phi = (i / numPts) * 2 * Math.PI;
        const dx = aRadius * Math.cos(phi);
        const dy = bRadius * Math.sin(phi);

        const rotX = dx * Math.cos(tiltAngleRad) - dy * Math.sin(tiltAngleRad);
        const rotY = dx * Math.sin(tiltAngleRad) + dy * Math.cos(tiltAngleRad);

        const u = gammaOptPae.r + rotX;
        const v = gammaOptPae.i + rotY;

        const zComp = RFMath.gammaToZ(new Complex(u, v)).mul(z0);
        points.push({ u, v, zReal: zComp.r, zImag: zComp.i });
      }

      return {
        level: lvl,
        type: 'pae',
        points,
      };
    });

    return {
      freqMHz,
      pinDbm,
      z0,
      maxPowerDbm: baseMaxPowerDbm,
      maxPaePercent: baseMaxPae,
      zOptPower: { r: zOptPowerReal, x: zOptPowerImag },
      zOptPae: { r: zOptPaeReal, x: zOptPaeImag },
      powerContours,
      paeContours,
    };
  }
}
