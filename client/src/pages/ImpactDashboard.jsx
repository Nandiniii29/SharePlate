import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Leaf, 
  Droplets, 
  Wind, 
  CheckCircle2, 
  Award, 
  ShieldCheck, 
  Info, 
  RefreshCw, 
  Trophy, 
  Building2, 
  Store 
} from 'lucide-react';
import { api } from '../services/api';

export default function ImpactDashboard() {
  const [impactData, setImpactData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadImpact = async () => {
    setLoading(true);
    try {
      const data = await api.getImpact();
      setImpactData(data);
      setError(null);
    } catch (err) {
      setError(`Failed to load impact metrics: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadImpact();
  }, []);

  const summary = impactData?.verifiedSummary || {
    totalPickupsCompleted: 0,
    totalMealsRescued: 0,
    estimatedFoodWeightKg: 0,
    estimatedCo2ePreventedKg: 0,
    estimatedWaterSavedLiters: 0
  };

  const donors = impactData?.leaderboard?.donors || [];
  const recipients = impactData?.leaderboard?.recipients || [];
  const assumptions = impactData?.methodologyAndAssumptions || {};

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-cream-200 shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sage-100 text-sage-800 text-xs font-bold mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-sage-600" />
            Verified Chain-of-Custody Accounting
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-forest-900 tracking-tight">
            Verified Environmental & Social Impact
          </h1>
          <p className="text-xs text-stone-500 mt-1 max-w-xl">
            Environmental and humanitarian metrics are calculated <strong>strictly upon physical pickup verification</strong>. Unverified, pending, or expired listings are never counted.
          </p>
        </div>

        <button
          onClick={loadImpact}
          disabled={loading}
          className="p-3 rounded-2xl border border-cream-200 text-stone-600 hover:bg-cream-100 transition cursor-pointer self-start md:self-auto"
          title="Refresh metrics"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {error}
        </div>
      )}

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Meals Rescued */}
        <div className="bg-white p-6 rounded-3xl border border-cream-200 shadow-soft flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="w-11 h-11 rounded-2xl bg-terracotta-100 text-terracotta-700 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sage-100 text-sage-800">
              Verified
            </span>
          </div>
          <div>
            <span className="text-xs font-semibold text-stone-500 block mb-1">Total Meals Rescued</span>
            <div className="text-3xl font-black text-forest-900 font-mono tracking-tight">
              {summary.totalMealsRescued.toLocaleString()}
            </div>
            <p className="text-[11px] text-stone-400 mt-1">Across {summary.totalPickupsCompleted} verified handshakes</p>
          </div>
        </div>

        {/* Card 2: Food Waste Diverted */}
        <div className="bg-white p-6 rounded-3xl border border-cream-200 shadow-soft flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="w-11 h-11 rounded-2xl bg-sage-100 text-sage-700 flex items-center justify-center">
              <Leaf className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cream-200 text-forest-800">
              Landfill Diversion
            </span>
          </div>
          <div>
            <span className="text-xs font-semibold text-stone-500 block mb-1">Food Waste Diverted</span>
            <div className="text-3xl font-black text-forest-900 font-mono tracking-tight">
              {summary.estimatedFoodWeightKg.toLocaleString()} <span className="text-lg font-sans">kg</span>
            </div>
            <p className="text-[11px] text-stone-400 mt-1">Estimated at 0.40 kg per average portion</p>
          </div>
        </div>

        {/* Card 3: GHG Emissions Avoided */}
        <div className="bg-white p-6 rounded-3xl border border-cream-200 shadow-soft flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="w-11 h-11 rounded-2xl bg-forest-100 text-forest-800 flex items-center justify-center">
              <Wind className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cream-200 text-forest-800">
              Climate Impact
            </span>
          </div>
          <div>
            <span className="text-xs font-semibold text-stone-500 block mb-1">CO₂e Emissions Prevented</span>
            <div className="text-3xl font-black text-forest-900 font-mono tracking-tight">
              {summary.estimatedCo2ePreventedKg.toLocaleString()} <span className="text-lg font-sans">kg</span>
            </div>
            <p className="text-[11px] text-stone-400 mt-1">Landfill methane avoidance (UNEP benchmark)</p>
          </div>
        </div>

        {/* Card 4: Water Footprint Saved */}
        <div className="bg-white p-6 rounded-3xl border border-cream-200 shadow-soft flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="w-11 h-11 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Droplets className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-800">
              Resource Conservation
            </span>
          </div>
          <div>
            <span className="text-xs font-semibold text-stone-500 block mb-1">Water Footprint Conserved</span>
            <div className="text-3xl font-black text-forest-900 font-mono tracking-tight">
              {(summary.estimatedWaterSavedLiters / 1000).toFixed(0)}k <span className="text-lg font-sans">L</span>
            </div>
            <p className="text-[11px] text-stone-400 mt-1">Agricultural irrigation conserved (Water Footprint Network)</p>
          </div>
        </div>
      </div>

      {/* Leaderboards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Donors Leaderboard */}
        <div className="bg-white p-6 rounded-3xl border border-cream-200 shadow-soft space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sage-100 text-sage-800 flex items-center justify-center">
              <Store className="w-4 h-4 text-sage-600" />
            </div>
            <div>
              <h3 className="font-extrabold text-forest-900 text-sm">Top Food Donors</h3>
              <p className="text-[11px] text-stone-400">Ranked by verified completed portion handovers</p>
            </div>
          </div>

          <div className="divide-y divide-cream-200">
            {donors.length === 0 ? (
              <div className="py-8 text-center text-xs text-stone-400">
                No verified donor pickups recorded yet.
              </div>
            ) : (
              donors.map((d, idx) => (
                <div key={d.donorName} className="py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="w-5 font-mono font-bold text-stone-400 text-center">#{idx + 1}</span>
                    <span className="font-bold text-forest-900">{d.donorName}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-black text-sage-700">{d.mealsRescued} portions</span>
                    <span className="text-[10px] text-stone-400 block">({d.pickups} pickups)</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recipients Leaderboard */}
        <div className="bg-white p-6 rounded-3xl border border-cream-200 shadow-soft space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-terracotta-100 text-terracotta-800 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-terracotta-600" />
            </div>
            <div>
              <h3 className="font-extrabold text-forest-900 text-sm">Top Community Recipients</h3>
              <p className="text-[11px] text-stone-400">Ranked by verified portion distribution</p>
            </div>
          </div>

          <div className="divide-y divide-cream-200">
            {recipients.length === 0 ? (
              <div className="py-8 text-center text-xs text-stone-400">
                No verified recipient pickups recorded yet.
              </div>
            ) : (
              recipients.map((r, idx) => (
                <div key={r.recipientName} className="py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="w-5 font-mono font-bold text-stone-400 text-center">#{idx + 1}</span>
                    <span className="font-bold text-forest-900">{r.recipientName}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-black text-terracotta-700">{r.mealsReceived} portions</span>
                    <span className="text-[10px] text-stone-400 block">({r.pickups} pickups)</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Methodology & Assumptions Card */}
      <div className="bg-white p-6 rounded-3xl border border-cream-200 shadow-soft space-y-4">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-sage-600" />
          <h4 className="font-extrabold text-forest-900 text-xs uppercase tracking-wider">
            Calculation Methodology & Assumptions
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-stone-600">
          <div className="p-4 rounded-2xl bg-cream-50/70 border border-cream-200 space-y-1">
            <span className="font-bold text-forest-900 block text-[11px] uppercase tracking-wider">Portion Benchmark</span>
            <p className="text-[11px] leading-relaxed">
              {assumptions.mealWeightBenchmark || '0.40 kg per average cafeteria meal portion'}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-cream-50/70 border border-cream-200 space-y-1">
            <span className="font-bold text-forest-900 block text-[11px] uppercase tracking-wider">Emissions Avoidance Factor</span>
            <p className="text-[11px] leading-relaxed">
              {assumptions.co2eConversionFactor || '2.5 kg CO2e per kg food diverted from anaerobic landfill decomposition (UNEP)'}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-cream-50/70 border border-cream-200 space-y-1">
            <span className="font-bold text-forest-900 block text-[11px] uppercase tracking-wider">Embedded Water Footprint</span>
            <p className="text-[11px] leading-relaxed">
              {assumptions.waterFootprintFactor || '850 liters of agricultural freshwater conserved per meal (Water Footprint Network)'}
            </p>
          </div>
        </div>

        <div className="text-[11px] text-stone-400 leading-relaxed border-t border-cream-200 pt-3">
          <strong>Transparency Disclosure:</strong> Environmental metrics are research-backed estimates calculated strictly from verified completed pickups. No metrics are counted on speculative or pending listings.
        </div>
      </div>
    </div>
  );
}
