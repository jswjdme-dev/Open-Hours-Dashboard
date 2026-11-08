import React, { useState, useEffect } from 'react';
import {
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Save,
  RotateCcw,
} from 'lucide-react';
import { TeamSettingsConfig } from '../../types/index.ts';
import { getTeamSettings, updateTeamSettings } from '../../data/repo.ts';

export const TeamSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<TeamSettingsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Form states
  const [showRanking, setShowRanking] = useState(false);
  const [wOnTime, setWOnTime] = useState(35);
  const [wRevision, setWRevision] = useState(20);
  const [wTurnaround, setWTurnaround] = useState(20);
  const [wQa, setWQa] = useState(15);
  const [wConsistency, setWConsistency] = useState(10);

  const loadData = async () => {
    setLoading(true);
    const s = await getTeamSettings();
    setSettings(s);
    setShowRanking(s.showRankingToMembers);
    setWOnTime(Math.round(s.weights.onTimeCompletionWeight * 100));
    setWRevision(Math.round(s.weights.lowRevisionWeight * 100));
    setWTurnaround(Math.round(s.weights.turnaroundWeight * 100));
    setWQa(Math.round(s.weights.qaChecklistPassWeight * 100));
    setWConsistency(Math.round(s.weights.hoursConsistencyWeight * 100));
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalWeight = wOnTime + wRevision + wTurnaround + wQa + wConsistency;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totalWeight !== 100) {
      alert(`Weights must sum to 100% (currently ${totalWeight}%).`);
      return;
    }

    await updateTeamSettings({
      showRankingToMembers: showRanking,
      weights: {
        onTimeCompletionWeight: wOnTime / 100,
        lowRevisionWeight: wRevision / 100,
        turnaroundWeight: wTurnaround / 100,
        qaChecklistPassWeight: wQa / 100,
        hoursConsistencyWeight: wConsistency / 100,
      },
    });

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  if (loading || !settings) {
    return <div className="py-12 text-center text-xs text-[#A8A5A5]">Loading settings...</div>;
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-black/5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[24px] font-semibold text-[#101828] leading-tight tracking-tight">
              Team Settings
            </h1>
            <span className="px-2.5 py-0.5 rounded-full border border-black/10 text-[11px] font-medium text-[#6B6B6B] bg-white">
              Admin Only
            </span>
          </div>
          <p className="text-xs text-[#6B6B6B] mt-1">
            Configure performance score weights, leaderboard privacy, and operational thresholds.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
        {savedSuccess && (
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2 font-bold animate-in fade-in">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span>Settings saved successfully!</span>
          </div>
        )}

        {/* Visibility Setting */}
        <div className="bg-white rounded-[24px] p-6 border border-black/5 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-[#111111]">Ranking Visibility</h2>
          <div className="p-4 rounded-2xl bg-[#FAFAFA] border border-black/5 flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-[#111111]">Show ranking to members</div>
              <p className="text-[11px] text-[#6B6B6B] mt-0.5">
                When turned off (default), team members only see their own individual scorecard. Only
                Admin sees the complete leaderboard.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={showRanking}
                onChange={(e) => setShowRanking(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#D92D50]" />
            </label>
          </div>
        </div>

        {/* HYPOTHESIS Weights Configuration */}
        <div className="bg-white rounded-[24px] p-6 border border-black/5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#111111]">Performance Score Formulation</h2>
              <p className="text-xs text-[#6B6B6B]">
                Adjust the weights of the 5 key factors. Must sum to exactly 100%.
              </p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                totalWeight === 100
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              Total: {totalWeight}%
            </span>
          </div>

          <div className="space-y-3 pt-2">
            {[
              { label: 'On-time task completion (35% default)', val: wOnTime, set: setWOnTime },
              { label: 'Low revision count (20% default)', val: wRevision, set: setWRevision },
              { label: 'Request turnaround time (20% default)', val: wTurnaround, set: setWTurnaround },
              { label: 'QA / checklist pass rate (15% default)', val: wQa, set: setWQa },
              { label: 'Hours consistency (10% default)', val: wConsistency, set: setWConsistency },
            ].map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-2xl bg-[#FAFAFA] border border-black/5 flex items-center justify-between gap-4 text-xs"
              >
                <span className="font-medium text-[#111111]">{item.label}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={item.val}
                    onChange={(e) => item.set(parseInt(e.target.value) || 0)}
                    className="w-16 p-1.5 text-center font-bold text-xs bg-white border border-black/10 rounded-lg outline-none"
                  />
                  <span className="font-bold text-[#6B6B6B]">%</span>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-[#A8A5A5] italic">
            Labelled HYPOTHESIS: weights are subject to iterative review during client delivery sprints.
          </p>
        </div>

        <button
          type="submit"
          className="px-6 py-2.5 rounded-full bg-[#111111] hover:bg-black text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
        >
          <Save size={14} />
          <span>Save Team Settings</span>
        </button>
      </form>
    </div>
  );
};
