/**
 * 2x2 Complex Matrix library for 2-port RF network cascading
 * [ A  B ]
 * [ C  D ]
 */
import { Complex } from './complex';

export class Matrix2x2 {
  readonly a: Complex;
  readonly b: Complex;
  readonly c: Complex;
  readonly d: Complex;

  constructor(a: Complex, b: Complex, c: Complex, d: Complex) {
    this.a = a;
    this.b = b;
    this.c = c;
    this.d = d;
  }

  static readonly IDENTITY = new Matrix2x2(
    Complex.ONE,
    Complex.ZERO,
    Complex.ZERO,
    Complex.ONE
  );

  // Series impedance element: [1, Z; 0, 1]
  static seriesZ(z: Complex): Matrix2x2 {
    return new Matrix2x2(Complex.ONE, z, Complex.ZERO, Complex.ONE);
  }

  // Shunt admittance element: [1, 0; Y, 1]
  static shuntY(y: Complex): Matrix2x2 {
    return new Matrix2x2(Complex.ONE, Complex.ZERO, y, Complex.ONE);
  }

  // Ideal lossless transmission line:
  // [ cos(theta),      j * Z0 * sin(theta) ]
  // [ j * sin(theta)/Z0, cos(theta)        ]
  static transmissionLine(z0: number, thetaRad: number): Matrix2x2 {
    const cosT = new Complex(Math.cos(thetaRad), 0);
    const sinT = Math.sin(thetaRad);
    const bElem = new Complex(0, z0 * sinT);
    const cElem = new Complex(0, sinT / z0);
    return new Matrix2x2(cosT, bElem, cElem, cosT);
  }

  // Lossy transmission line:
  // gamma = alpha + j*beta
  // [ cosh(gamma * L),      Z0 * sinh(gamma * L) ]
  // [ sinh(gamma * L) / Z0, cosh(gamma * L)      ]
  static lossyTransmissionLine(z0: number, alphaNpPerM: number, betaRadPerM: number, lengthM: number): Matrix2x2 {
    const gammaL = new Complex(alphaNpPerM * lengthM, betaRadPerM * lengthM);
    const coshGL = gammaL.cosh();
    const sinhGL = gammaL.sinh();
    const b = sinhGL.mul(z0);
    const c = sinhGL.div(z0);
    return new Matrix2x2(coshGL, b, c, coshGL);
  }

  // Shunt open stub: input admittance Y = j * (1/Z0) * tan(theta)
  static shuntOpenStub(z0: number, thetaRad: number): Matrix2x2 {
    const tanT = Math.tan(thetaRad);
    const yStub = new Complex(0, (1 / z0) * tanT);
    return Matrix2x2.shuntY(yStub);
  }

  // Shunt short stub: input admittance Y = -j * (1/Z0) * cot(theta)
  static shuntShortStub(z0: number, thetaRad: number): Matrix2x2 {
    const tanT = Math.tan(thetaRad);
    if (Math.abs(tanT) < 1e-12) {
      // near short circuit
      return Matrix2x2.shuntY(new Complex(0, -1e12));
    }
    const cotT = 1 / tanT;
    const yStub = new Complex(0, (-1 / z0) * cotT);
    return Matrix2x2.shuntY(yStub);
  }

  // Matrix multiplication: this * other
  mul(other: Matrix2x2): Matrix2x2 {
    return new Matrix2x2(
      this.a.mul(other.a).add(this.b.mul(other.c)),
      this.a.mul(other.b).add(this.b.mul(other.d)),
      this.c.mul(other.a).add(this.d.mul(other.c)),
      this.c.mul(other.b).add(this.d.mul(other.d))
    );
  }

  det(): Complex {
    return this.a.mul(this.d).sub(this.b.mul(this.c));
  }

  inv(): Matrix2x2 {
    const determinant = this.det();
    return new Matrix2x2(
      this.d.div(determinant),
      this.b.neg().div(determinant),
      this.c.neg().div(determinant),
      this.a.div(determinant)
    );
  }
}
