import { describe, it, expect } from 'vitest';
import { Complex } from '../src/engine/complex';
import { Matrix2x2 } from '../src/engine/matrix';
import { RFMath } from '../src/engine/rfMath';
import { SParameterSolver } from '../src/engine/sParameterSolver';
import { MicrostripEngine, SUBSTRATES } from '../src/engine/microstrip';
import { HarmonicBalanceEngine } from '../src/engine/harmonicBalance';
import { MatchingSynthesizer } from '../src/engine/matchingSynthesizer';
import { TouchstoneEngine } from '../src/engine/touchstone';
import { RFComponent, SweepConfig } from '../src/types/circuit';

describe('Complex Number Operations', () => {
  it('correctly handles addition and multiplication', () => {
    const z1 = new Complex(3, 4);
    const z2 = new Complex(1, -2);

    const sum = z1.add(z2);
    expect(sum.r).toBe(4);
    expect(sum.i).toBe(2);

    const prod = z1.mul(z2);
    // (3 + 4j)(1 - 2j) = 3 - 6j + 4j - 8j^2 = 11 - 2j
    expect(prod.r).toBe(11);
    expect(prod.i).toBe(-2);
  });

  it('computes magnitude, phase, and polar conversion', () => {
    const z = new Complex(3, 4);
    expect(z.mag()).toBe(5);
    expect(z.phaseRad()).toBeCloseTo(Math.atan2(4, 3), 4);

    const polar = Complex.fromPolarDeg(5, 53.13);
    expect(polar.r).toBeCloseTo(3, 1);
    expect(polar.i).toBeCloseTo(4, 1);
  });

  it('correctly inverts and divides complex values', () => {
    const z = new Complex(0, 2);
    const inv = z.inv();
    // 1 / (2j) = -0.5j
    expect(inv.r).toBeCloseTo(0, 6);
    expect(inv.i).toBeCloseTo(-0.5, 6);
  });
});

describe('RF Network & S-Parameter Mathematics', () => {
  it('converts ABCD matrix to S-parameters for a matched 50-ohm reference', () => {
    // Identity ABCD matrix corresponds to a direct ideal zero-length through line
    const s = RFMath.abcdToS(Matrix2x2.IDENTITY, 50);
    expect(s.s11.mag()).toBeCloseTo(0, 5); // perfect match
    expect(s.s21.mag()).toBeCloseTo(1, 5); // 0 dB insertion loss
    expect(s.s12.mag()).toBeCloseTo(1, 5);
    expect(s.s22.mag()).toBeCloseTo(0, 5);
  });

  it('computes correct VSWR from reflection coefficient', () => {
    expect(RFMath.vswr(Complex.ZERO)).toBeCloseTo(1.0, 4);

    // |Gamma| = 0.33333 -> VSWR = (1 + 1/3) / (1 - 1/3) = (4/3) / (2/3) = 2.0
    const gamma2 = new Complex(1 / 3, 0);
    expect(RFMath.vswr(gamma2)).toBeCloseTo(2.0, 4);
  });

  it('converts impedance to Gamma and back with high accuracy', () => {
    // 50 Ohms normalized to 50 Ohms is z = 1 + j0 -> Gamma = 0
    const z50 = new Complex(1, 0);
    const gamma50 = RFMath.zToGamma(z50);
    expect(gamma50.mag()).toBeCloseTo(0, 5);

    // Short circuit z = 0 -> Gamma = -1
    const gammaShort = RFMath.zToGamma(Complex.ZERO);
    expect(gammaShort.r).toBeCloseTo(-1, 5);
    expect(gammaShort.i).toBeCloseTo(0, 5);

    // Arbitrary z = 0.5 + j1.2 -> convert to Gamma and back
    const zArbitrary = new Complex(0.5, 1.2);
    const gamma = RFMath.zToGamma(zArbitrary);
    const zRecovered = RFMath.gammaToZ(gamma);
    expect(zRecovered.r).toBeCloseTo(zArbitrary.r, 5);
    expect(zRecovered.i).toBeCloseTo(zArbitrary.i, 5);
  });

  it('simulates 10 dB attenuator pad with theoretical accuracy', () => {
    const components: RFComponent[] = [
      {
        id: 'pad_10db',
        name: 'Attenuator',
        type: 'attenuator_pad',
        value: 10.0,
        unit: 'dB',
        min: 1,
        max: 30,
        step: 1,
        secondaryValue: 50.0,
        enabled: true,
      },
    ];

    const sweep: SweepConfig = {
      startFreqMHz: 1000,
      stopFreqMHz: 2000,
      points: 3,
      z0: 50,
    };

    const results = SParameterSolver.solve(components, sweep);
    expect(results.length).toBe(3);
    for (const pt of results) {
      // S21 should be exactly -10 dB
      expect(pt.s21MagDb).toBeCloseTo(-10.0, 1);
      // S11 should be well matched (< -30 dB)
      expect(pt.s11MagDb).toBeLessThan(-30);
      expect(pt.vswrIn).toBeCloseTo(1.0, 2);
    }
  });
});

describe('Microstrip Synthesis & Analysis (Hammerstad-Jensen)', () => {
  it('synthesizes ~50 Ohm line on Rogers RO4350B substrate', () => {
    const targetZ0 = 50.0;
    const hMm = 0.8;
    const er = 3.66; // RO4350B
    const freqGHz = 2.4;

    const widthMm = MicrostripEngine.synthesize(targetZ0, hMm, er, freqGHz);
    expect(widthMm).toBeGreaterThan(1.5);
    expect(widthMm).toBeLessThan(2.0);

    // Reverse analysis should match target Z0 within 0.1 Ohm
    const analysis = MicrostripEngine.analyze(widthMm, hMm, er, freqGHz);
    expect(analysis.z0).toBeCloseTo(targetZ0, 1);
    expect(analysis.erEff).toBeGreaterThan(1.0);
    expect(analysis.erEff).toBeLessThan(er);
  });

  it('calculates guided wavelength and physical quarter-wave length', () => {
    const substrate = SUBSTRATES[0]; // RO4350B
    const freqGHz = 2.4;
    const result = MicrostripEngine.calculate(1.8, 0.8, 10, substrate, freqGHz);

    expect(result.lambdaGuidedMm).toBeGreaterThan(50);
    expect(result.lambdaGuidedMm).toBeLessThan(90);
    expect(result.phaseVelocityMps).toBeLessThan(3e8);
    expect(result.attenuationDbPerM).toBeGreaterThan(0);
  });
});

describe('Harmonic Balance & Large-Signal Analysis', () => {
  it('determines P1dB gain compression point and harmonic components', () => {
    const f0MHz = 2400;
    const result = HarmonicBalanceEngine.solve(f0MHz, 0, 15.0, 28.0, 28.0, 120.0);

    expect(result.harmonics.length).toBe(5);
    expect(result.harmonics[0].harmonic).toBe(1);
    expect(result.harmonics[0].freqMHz).toBe(2400);
    expect(result.harmonics[1].freqMHz).toBe(4800);

    // Output 1dB compression point should be ~ 25 to 28 dBm
    expect(result.p1dbOutDbm).toBeGreaterThan(20);
    expect(result.p1dbOutDbm).toBeLessThan(30);

    // OIP3 should be greater than P1dB
    expect(result.oip3Dbm).toBeGreaterThan(result.p1dbOutDbm);
  });
});

describe('Impedance Matching Synthesizer', () => {
  it('synthesizes valid L-match between 50 Ohm source and complex load', () => {
    const rs = 50;
    const xs = 0;
    const rl = 18;
    const xl = 25;
    const freqMHz = 2400;

    const solutions = MatchingSynthesizer.synthesizeLMatch(rs, xs, rl, xl, freqMHz, 50);
    expect(solutions.length).toBeGreaterThan(0);

    const lowPass = solutions.find((s) => s.topology.includes('Low-Pass'));
    expect(lowPass).toBeDefined();
    expect(lowPass?.cValuePf).toBeGreaterThan(0);
    expect(lowPass?.lValueNh).toBeGreaterThan(0);
    expect(lowPass?.trajectoryGamma.length).toBeGreaterThanOrEqual(2);
  });
});

describe('Touchstone S2P Exporter and Parser', () => {
  it('exports and round-trip parses standard .s2p Touchstone files', () => {
    const sweep: SweepConfig = {
      startFreqMHz: 1000,
      stopFreqMHz: 2000,
      points: 5,
      z0: 50,
    };

    const dummyPoints = SParameterSolver.solve([], sweep);
    const s2pText = TouchstoneEngine.exportS2P(dummyPoints, 'Test_Circuit', 50, 'DB');

    expect(s2pText).toContain('# MHz S DB R 50');
    expect(s2pText).toContain('! Generated by CircuitRF Mobile');

    // Parse it back
    const parsed = TouchstoneEngine.parse(s2pText, 'test.s2p');
    expect(parsed.rows.length).toBe(5);
    expect(parsed.header.referenceResistance).toBe(50);
    expect(parsed.header.format).toBe('DB');
    expect(parsed.rows[0].freqHz).toBe(1000 * 1e6);
  });
});
