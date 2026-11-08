import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Activity,
  Layers,
  ArrowRight,
  Database,
  Lock,
} from 'lucide-react';
import { runAllLiveConsistencyChecks } from '../data/repo.ts';
import { ConsistencyCheckResult } from '../lib/events.ts';

export const ConsistencyCheckPage: React.FC = () => {
  const [results, setResults] = useState<ConsistencyCheckResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRun, setLastRun] = useState<string>('');

  const runChecks = async () => {
    setLoading(true);
    const res = await runAllLiveConsistencyChecks();
    setResults(res);
    setLastRun(new Date().toLocaleTimeString());
    setLoading(false);
  };

  useEffect(() => {
    runChecks();
  }, []);

  const passCount = results.filter((r) => r.status === 'PASS').length;
  const failCount = results.filter((r) => r.status === 'FAIL').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300/80">
              Dev-Only Diagnostic Tool
            </span>
            <span className="text-xs text-[#A8A5A5]">Single Event Path Validator</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#111111] tracking-tight">
            Consistency Check
          </h1>
          <p className="text-xs text-[#6B6B6B] mt-0.5">
            Live cross-link assertion engine verifying single source of truth across all modules.
          </p>
        </div>

        <button
          type="button"
          onClick={runChecks}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#111111] hover:bg-black text-white text-xs font-bold transition-all cursor-pointer shadow-xs shrink-0"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>{loading ? 'Evaluating...' : 'Re-run Checks'}</span>
        </button>
      </div>

      {/* KPI Status Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white rounded-2xl p-4 border border-black/5 shadow-2xs">
          <span className="text-[11px] font-semibold text-[#A8A5A5] block mb-1">
            Overall Health
          </span>
          <div className="flex items-center gap-2">
            {failCount === 0 ? (
              <>
                <CheckCircle2 size={22} className="text-emerald-600" />
                <span className="text-xl font-bold text-emerald-800">100% Consistent</span>
              </>
            ) : (
              <>
                <XCircle size={22} className="text-[#D92D50]" />
                <span className="text-xl font-bold text-[#D92D50]">{failCount} Disagreements</span>
              </>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-black/5 shadow-2xs">
          <span className="text-[11px] font-semibold text-[#A8A5A5] block mb-1">
            Checks Passed
          </span>
          <span className="text-2xl font-bold text-emerald-700 tabular-nums">
            {passCount} <span className="text-xs text-[#A8A5A5] font-normal">/ {results.length}</span>
          </span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-black/5 shadow-2xs">
          <span className="text-[11px] font-semibold text-[#A8A5A5] block mb-1">
            Last Evaluation
          </span>
          <span className="text-sm font-bold text-[#111111]">{lastRun || 'Evaluating...'}</span>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-[24px] border border-black/5 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-black/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-[#D92D50]" />
            <h2 className="text-sm font-bold text-[#111111]">
              Live Cross-Link Assertion Log
            </h2>
          </div>
          <span className="text-[11px] text-[#A8A5A5]">
            Evaluated directly against live in-memory repository stores
          </span>
        </div>

        <div className="divide-y divide-black/5">
          {loading ? (
            <div className="p-8 text-center text-xs text-[#A8A5A5]">
              Computing live mathematical assertions across selectors...
            </div>
          ) : (
            results.map((check) => (
              <div key={check.id} className="p-4 sm:p-5 hover:bg-black/1 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          check.status === 'PASS'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {check.status === 'PASS' ? (
                          <CheckCircle2 size={11} />
                        ) : (
                          <XCircle size={11} />
                        )}
                        <span>{check.status}</span>
                      </span>
                      <h3 className="text-xs font-bold text-[#111111]">{check.name}</h3>
                    </div>
                    <p className="text-[11px] text-[#6B6B6B]">{check.description}</p>
                    <div className="text-[11px] font-mono text-[#4B5563] bg-[#F8F7F7] px-3 py-1.5 rounded-lg mt-2 border border-black/5">
                      {check.details}
                    </div>
                  </div>

                  <span className="text-[10px] text-[#A8A5A5] shrink-0 tabular-nums">
                    {new Date(check.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
