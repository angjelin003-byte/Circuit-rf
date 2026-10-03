# CircuitRF Mobile 📡⚡

> **Lightweight, cross-platform mobile RF circuit and electromagnetic simulator**  
> Inspired by [potatobeanradio/circuitRF](https://github.com/potatobeanradio/circuitRF).

CircuitRF Mobile brings microwave engineering, S-parameters, Harmonic Balance, and Loadpull analysis into a fast, touch-first mobile Progressive Web App (PWA) with complete CI/CD automation for GitHub.

---

## 🚀 Key Features

- **Interactive Smith Chart**:
  - Constant resistance ($r$), reactance ($x$), and admittance ($g, b$) grid circles.
  - Constant $Q$ contours ($Q = 0.5, 1, 2, 5$).
  - Real-time S11 & S22 frequency trace locus.
  - Touch-probe impedance inspection: $Z = R + jX\ \Omega$, $Y = G + jB\ \text{mS}$, Reflection $|\Gamma|\angle\theta^\circ$, VSWR, and equivalent series/parallel L/C values.
  - Overlay Loadpull power & PAE efficiency contours.
  - Step-by-step impedance matching trajectory paths.

- **2-Port S-Parameter Engine**:
  - Wideband frequency sweep (LogMag dB, Phase, VSWR, Group Delay $\tau_g$).
  - N-element cascade matrix solver (Series/Shunt RLC, Ideal Transmission Lines, Microstrip lines, Open/Shorted stubs, Attenuators, and Active Transistors).
  - Rollett stability factor $K$ and Edwards-Sinsky $\mu$ stability factor calculation.

- **Non-Linear Harmonic Balance Simulator**:
  - $P_{\text{in}}$ vs $P_{\text{out}}$ large-signal power sweep.
  - Automated 1dB Gain Compression Point ($P_{1\text{dB}}$ in and out).
  - Harmonic spectrum bar chart ($f_0, 2f_0, 3f_0, 4f_0, 5f_0$ in dBm).
  - Power-Added Efficiency ($PAE\%$) and Total Harmonic Distortion ($THD\%$).
  - Two-tone Third-Order Intercept Point ($OIP_3$ and $IIP_3$).

- **Loadpull & Sourcepull Analysis**:
  - Constant Output Power contours and PAE efficiency contours mapped directly onto the Smith Chart.
  - Determines optimum impedances $Z_{\text{opt\_power}}$ and $Z_{\text{opt\_PAE}}$.

- **Microstrip & Planar EM Synthesizer**:
  - Closed-form Hammerstad & Jensen synthesis ($Z_0 \rightarrow W$) and analysis ($W \rightarrow Z_0$).
  - High-frequency dispersion and dielectric/conductor attenuation calculations.
  - Substrate library: Rogers RO4350B, RT/duroid 5880, FR-4, Alumina 99.6%, Polyimide.
  - Live cross-section diagram with dimensional callouts.

- **Automated Impedance Matching**:
  - Synthesizes 4-topology L-networks (Low-Pass Shunt C / Series L, High-Pass Series C / Shunt L, etc.).
  - Calculates component values ($C$ in pF, $L$ in nH) and quarter-wave lines.
  - One-tap "Apply to Circuit" injects matching network directly into active schematic.

- **Touchstone File Support (.s1p / .s2p)**:
  - Full Touchstone 1.1 parser and serializer (DB, MA, RI formats).
  - Import external VNA measurement files or export simulated networks to share with Keysight ADS, AWR Microwave Office, and circuitRF.

- **PWA & Mobile Ready**:
  - Compliant Web App Manifest and offline service worker caching.
  - Installable directly to home screen on iOS Safari and Android Chromium.

---

## 🛠️ GitHub CI/CD & Automated Deployment

The repository includes pre-configured GitHub Actions workflows in `.github/workflows/`:

### 1. `ci-cd.yml` (Continuous Integration & GitHub Pages Deployment)
- Triggers on every `push` to `main`/`master` and on `pull_request`.
- Multi-version Node.js matrix (`20.x`, `22.x`).
- Runs:
  ```bash
  npm ci
  npm run lint    # TypeScript compile check
  npm test        # Comprehensive RF math & simulation unit tests
  npm run build   # Production Vite PWA build
  ```
- Automatically deploys `./dist` to **GitHub Pages** on merge to `main`.

### 2. `release.yml` (Automated Release Builds)
- Triggers whenever a git version tag is pushed (e.g. `git tag v1.0.0 && git push --tags`).
- Builds web assets and packages `circuitrf-mobile-web.tar.gz` and `.zip` archives.
- Publishes a formal GitHub Release.

### Enabling GitHub Pages Deployment:
1. Push repository to GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment → Source**, choose **GitHub Actions**.
4. Every push to `main` will build and publish the live web app automatically!

---

## 💻 Local Development

```bash
# Clone the repository
git clone https://github.com/<your-username>/circuitRF-mobile.git
cd circuitRF-mobile

# Install dependencies
npm install

# Start local development server (port 3000)
npm run dev

# Run RF simulation unit test suites
npm test

# Build for production
npm run build
```

---

## 🧪 Unit Tests

Run the test suite:
```bash
npm test
```

Test coverage includes:
- Complex number arithmetic and polar transformations
- 2-port ABCD $\leftrightarrow$ S-parameter conversions
- VSWR and Reflection Coefficient fidelity
- Microstrip Hammerstad-Jensen synthesis against standard microwave benchmarks
- Harmonic Balance $P_{1\text{dB}}$ compression and spectrum routines
- Touchstone `.s2p` file format round-trip serialization and parsing

---

## 📄 License

MIT License. Inspired by the open-source circuitRF project.
