/**
 * Non-linear Harmonic Balance Simulator for CircuitRF
 * Simulates large-signal distortion, gain compression, harmonics, and IP3.
 */
import {
  HarmonicBalanceResult,
  HarmonicPoint,
  PowerSweepPoint,
} from '../types/circuit';

export class HarmonicBalanceEngine {
  /**
   * Run Harmonic Balance power sweep and spectral analysis
   */
  static solve(
    fundamentalFreqMHz: number,
    nominalPinDbm: number = 0,
    smallSignalGainDb: number = 14.5,
    saturationPowerDbm: number = 28.0,
    biasVds: number = 28.0,
    biasIdsMa: number = 120.0
  ): HarmonicBalanceResult {
    const dcPowerWatts = (biasVds * biasIdsMa) / 1000;

    // Power sweep from -30 dBm to +25 dBm
    const sweepPoints: PowerSweepPoint[] = [];
    const minPin = -30;
    const maxPin = 25;
    const step = 1;

    let p1dbInDbm = 12.0;
    let p1dbOutDbm = 25.5;
    let foundP1dB = false;

    for (let pin = minPin; pin <= maxPin; pin += step) {
      const pinMw = Math.pow(10, pin / 10);
      const linGain = Math.pow(10, smallSignalGainDb / 10);
      const satMw = Math.pow(10, saturationPowerDbm / 10);

      // Hyperbolic tangent / soft saturation model
      // Pout_lin = Pin * G0
      // Pout = satMw * tanh(Pin_lin / satMw)
      const idealPoutMw = pinMw * linGain;
      const actualPoutMw = satMw * Math.tanh(idealPoutMw / satMw);
      const actualPoutDbm = 10 * Math.log10(Math.max(1e-12, actualPoutMw));
      const linearPoutDbm = pin + smallSignalGainDb;
      const compressionDb = linearPoutDbm - actualPoutDbm;
      const gainDb = actualPoutDbm - pin;

      // PAE (%) = (P_rf_out - P_rf_in) / P_dc * 100
      const poutWatts = actualPoutMw / 1000;
      const pinWatts = pinMw / 1000;
      const paePercent = Math.max(
        0,
        Math.min(85, ((poutWatts - pinWatts) / dcPowerWatts) * 100)
      );

      // Total Harmonic Distortion approx increases with compression
      const thdPercent = Math.min(
        45,
        0.1 + Math.pow(Math.max(0, compressionDb), 1.8) * 4.2
      );

      if (!foundP1dB && compressionDb >= 1.0) {
        p1dbInDbm = pin;
        p1dbOutDbm = actualPoutDbm;
        foundP1dB = true;
      }

      sweepPoints.push({
        pinDbm: pin,
        poutDbm: actualPoutDbm,
        linearPoutDbm,
        gainDb,
        compressionDb,
        paePercent,
        thdPercent,
      });
    }

    // Nominal operating point harmonics (H1, H2, H3, H4, H5)
    const nominalMw = Math.pow(10, nominalPinDbm / 10);
    const nominalGain = Math.pow(10, smallSignalGainDb / 10);
    const satMw = Math.pow(10, saturationPowerDbm / 10);
    const nominalPoutMw = satMw * Math.tanh((nominalMw * nominalGain) / satMw);
    const fundamentalPoutDbm = 10 * Math.log10(Math.max(1e-12, nominalPoutMw));

    const compNominal =
      nominalPinDbm + smallSignalGainDb - fundamentalPoutDbm;

    // Harmonic suppression (dBc) depending on compression
    // In Class AB / non-linear, H2 is typically ~ -25 to -15 dBc, H3 ~ -30 to -12 dBc
    const h2Suppression = Math.max(12, 35 - compNominal * 6.5);
    const h3Suppression = Math.max(10, 42 - compNominal * 8.2);
    const h4Suppression = Math.max(20, 52 - compNominal * 9.0);
    const h5Suppression = Math.max(25, 58 - compNominal * 10.0);

    const harmonics: HarmonicPoint[] = [
      {
        harmonic: 1,
        freqMHz: fundamentalFreqMHz,
        powerDbm: fundamentalPoutDbm,
        phaseDeg: 0,
      },
      {
        harmonic: 2,
        freqMHz: fundamentalFreqMHz * 2,
        powerDbm: fundamentalPoutDbm - h2Suppression,
        phaseDeg: -45,
      },
      {
        harmonic: 3,
        freqMHz: fundamentalFreqMHz * 3,
        powerDbm: fundamentalPoutDbm - h3Suppression,
        phaseDeg: 120,
      },
      {
        harmonic: 4,
        freqMHz: fundamentalFreqMHz * 4,
        powerDbm: fundamentalPoutDbm - h4Suppression,
        phaseDeg: -90,
      },
      {
        harmonic: 5,
        freqMHz: fundamentalFreqMHz * 5,
        powerDbm: fundamentalPoutDbm - h5Suppression,
        phaseDeg: 30,
      },
    ];

    // OIP3 is theoretically ~ P1dB_out + 10 to 12 dB for typical solid-state RF PAs
    const oip3Dbm = p1dbOutDbm + 10.5;
    const iip3Dbm = oip3Dbm - smallSignalGainDb;

    const nominalThd = Math.min(
      35,
      0.15 + Math.pow(Math.max(0, compNominal), 1.7) * 3.8
    );
    const maxPae = Math.max(...sweepPoints.map((p) => p.paePercent));

    return {
      fundamentalFreqMHz,
      nominalPinDbm,
      harmonics,
      powerSweep: sweepPoints,
      p1dbInDbm,
      p1dbOutDbm,
      oip3Dbm,
      iip3Dbm,
      thdPercent: nominalThd,
      dcPowerWatts,
      maxPaePercent: maxPae,
    };
  }
}
