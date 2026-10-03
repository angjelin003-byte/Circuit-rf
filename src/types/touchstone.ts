/**
 * Touchstone 1.1 Specification Types (.s1p / .s2p)
 */

export type TouchstoneFreqUnit = 'HZ' | 'KHZ' | 'MHZ' | 'GHZ';
export type TouchstoneFormat = 'DB' | 'MA' | 'RI'; // LogMag-Angle, Mag-Angle, Real-Imag
export type TouchstoneParam = 'S' | 'Y' | 'Z' | 'G' | 'H';

export interface TouchstoneHeader {
  freqUnit: TouchstoneFreqUnit;
  parameterType: TouchstoneParam;
  format: TouchstoneFormat;
  referenceResistance: number; // typically 50.0
}

export interface Touchstone2PortDataRow {
  freq: number; // in raw header unit
  freqHz: number;
  s11: { a: number; b: number }; // [db, deg] or [mag, deg] or [re, im]
  s21: { a: number; b: number };
  s12: { a: number; b: number };
  s22: { a: number; b: number };
}

export interface TouchstoneFile {
  filename: string;
  comments: string[];
  header: TouchstoneHeader;
  rows: Touchstone2PortDataRow[];
}
