/**
 * High-performance Complex Number library for CircuitRF
 */

export class Complex {
  readonly r: number;
  readonly i: number;

  constructor(real: number, imag: number = 0) {
    this.r = real;
    this.i = imag;
  }

  static readonly ZERO = new Complex(0, 0);
  static readonly ONE = new Complex(1, 0);
  static readonly J = new Complex(0, 1);

  static fromPolar(mag: number, angleRad: number): Complex {
    return new Complex(mag * Math.cos(angleRad), mag * Math.sin(angleRad));
  }

  static fromPolarDeg(mag: number, angleDeg: number): Complex {
    const rad = (angleDeg * Math.PI) / 180;
    return new Complex(mag * Math.cos(rad), mag * Math.sin(rad));
  }

  add(other: Complex | number): Complex {
    if (typeof other === 'number') {
      return new Complex(this.r + other, this.i);
    }
    return new Complex(this.r + other.r, this.i + other.i);
  }

  sub(other: Complex | number): Complex {
    if (typeof other === 'number') {
      return new Complex(this.r - other, this.i);
    }
    return new Complex(this.r - other.r, this.i - other.i);
  }

  mul(other: Complex | number): Complex {
    if (typeof other === 'number') {
      return new Complex(this.r * other, this.i * other);
    }
    return new Complex(
      this.r * other.r - this.i * other.i,
      this.r * other.i + this.i * other.r
    );
  }

  div(other: Complex | number): Complex {
    if (typeof other === 'number') {
      return new Complex(this.r / other, this.i / other);
    }
    const denom = other.r * other.r + other.i * other.i;
    if (denom === 0) {
      return new Complex(1e12, 1e12);
    }
    return new Complex(
      (this.r * other.r + this.i * other.i) / denom,
      (this.i * other.r - this.r * other.i) / denom
    );
  }

  neg(): Complex {
    return new Complex(-this.r, -this.i);
  }

  conj(): Complex {
    return new Complex(this.r, -this.i);
  }

  mag(): number {
    return Math.hypot(this.r, this.i);
  }

  magSq(): number {
    return this.r * this.r + this.i * this.i;
  }

  magDb(): number {
    const m = this.mag();
    if (m <= 1e-15) return -120;
    return 20 * Math.log10(m);
  }

  phaseRad(): number {
    return Math.atan2(this.i, this.r);
  }

  phaseDeg(): number {
    return (this.phaseRad() * 180) / Math.PI;
  }

  inv(): Complex {
    return Complex.ONE.div(this);
  }

  sqrt(): Complex {
    const m = this.mag();
    const angle = this.phaseRad();
    return Complex.fromPolar(Math.sqrt(m), angle / 2);
  }

  exp(): Complex {
    const expR = Math.exp(this.r);
    return new Complex(expR * Math.cos(this.i), expR * Math.sin(this.i));
  }

  sinh(): Complex {
    return this.exp().sub(this.neg().exp()).div(2);
  }

  cosh(): Complex {
    return this.exp().add(this.neg().exp()).div(2);
  }

  tanh(): Complex {
    const ez = this.exp();
    const emz = this.neg().exp();
    return ez.sub(emz).div(ez.add(emz));
  }

  // Helper for parallel impedances: (Z1 * Z2) / (Z1 + Z2)
  parallel(other: Complex): Complex {
    const sum = this.add(other);
    if (sum.magSq() === 0) return Complex.ZERO;
    return this.mul(other).div(sum);
  }
}
