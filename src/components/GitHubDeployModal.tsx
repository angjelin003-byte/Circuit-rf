import React, { useState } from 'react';
import { GitBranch, CheckCircle2, ShieldCheck, Terminal, Copy, Check, ExternalLink, X, Flame } from 'lucide-react';

interface GitHubDeployModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GitHubDeployModal: React.FC<GitHubDeployModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const gitCommands = `# Initialize and push to your GitHub repo
git init
git add .
git commit -m "feat: CircuitRF Mobile PWA with CI/CD pipeline and RF simulation engines"
git branch -M main
git remote add origin https://github.com/<your-username>/circuitRF-mobile.git
git push -u origin main`;

  const cicdWorkflowYaml = `name: CircuitRF CI/CD Pipeline
on:
  push:
    branches: [ "main", "master" ]
  pull_request:
    branches: [ "main", "master" ]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [20.x, 22.x]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy-pages:
    needs: build-and-test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/deploy-pages@v4`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-2xl text-slate-100 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-sky-400" />
            <h3 className="font-semibold text-white text-sm">GitHub Deployment & CI/CD</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 py-3 pr-1 text-xs">
          {/* Status Badges */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <div className="font-semibold text-emerald-300">CI/CD Configured</div>
                <div className="text-[10px] text-slate-400">GitHub Actions Pages deployment ready</div>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" />
              <div>
                <div className="font-semibold text-sky-300">RF Test Suites</div>
                <div className="text-[10px] text-slate-400">Vitest test runner configured in package.json</div>
              </div>
            </div>
          </div>

          {/* Step 1: Git Push Commands */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-sky-400" />
                1. Push to your GitHub Repository
              </span>
              <button
                onClick={() => copyToClipboard(gitCommands, 'git')}
                className="flex items-center gap-1 text-[10px] text-sky-400 hover:text-sky-300 cursor-pointer"
              >
                {copied === 'git' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied === 'git' ? 'Copied' : 'Copy Commands'}</span>
              </button>
            </div>
            <pre className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[10px] text-slate-300 overflow-x-auto">
              {gitCommands}
            </pre>
          </div>

          {/* Step 2: GitHub Pages Activation */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
            <span className="font-bold text-slate-200 block text-[11px]">
              2. Enable Automatic GitHub Pages Deployment
            </span>
            <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[11px] leading-relaxed">
              <li>In your GitHub repo, navigate to <strong className="text-white">Settings → Pages</strong>.</li>
              <li>Under <strong className="text-white">Build and deployment → Source</strong>, select <strong className="text-sky-400">GitHub Actions</strong>.</li>
              <li>Every push to <code className="text-amber-300">main</code> automatically runs the test matrix and publishes the live PWA!</li>
            </ol>
          </div>

          {/* Step 3: CI/CD Workflow Preview */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
                Workflow: .github/workflows/ci-cd.yml
              </span>
              <button
                onClick={() => copyToClipboard(cicdWorkflowYaml, 'yaml')}
                className="flex items-center gap-1 text-[10px] text-sky-400 hover:text-sky-300 cursor-pointer"
              >
                {copied === 'yaml' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied === 'yaml' ? 'Copied' : 'Copy YAML'}</span>
              </button>
            </div>
            <pre className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[9px] text-slate-400 overflow-x-auto max-h-40 scrollbar-thin">
              {cicdWorkflowYaml}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
