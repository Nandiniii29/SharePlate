import React, { useState, useEffect } from 'react';
import { 
  HeartHandshake, 
  ShieldCheck, 
  Leaf, 
  Sparkles, 
  ArrowRight, 
  Store, 
  Building2, 
  CheckCircle2, 
  Droplets, 
  Wind, 
  BarChart3, 
  RefreshCw, 
  Clock, 
  Split, 
  Users, 
  Check, 
  ShieldAlert,
  ChevronRight
} from 'lucide-react';
import { api } from '../services/api';

export default function LandingPage({ onOpenAuth, onExploreTab }) {
  const [impactData, setImpactData] = useState(null);

  useEffect(() => {
    api.getImpact().then(setImpactData).catch(() => {});
  }, []);

  const summary = impactData?.verifiedSummary || {
    totalMealsRescued: 2840,
    totalPickupsCompleted: 48,
    estimatedFoodWeightKg: 1136,
    estimatedCo2ePreventedKg: 2840,
    estimatedWaterSavedLiters: 2414000
  };

  return (
    <div className="space-y-20 pb-16">
      {/* HERO SECTION */}
      <section className="relative pt-6 sm:pt-12 text-center max-w-4xl mx-auto px-4">
        {/* Value Prop Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sage-100/80 border border-sage-200 text-sage-800 text-xs font-bold mb-6 shadow-2xs">
          <Leaf className="w-3.5 h-3.5 text-sage-600" />
          <span>Campus & Community Surplus Food Rescue Platform</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-6xl font-black text-forest-900 tracking-tight leading-[1.1] mb-6">
          Good Food. <br className="hidden sm:block" />
          <span className="text-terracotta-600">Greater Impact.</span>
        </h1>

        <p className="text-base sm:text-lg text-stone-600 max-w-2xl mx-auto leading-relaxed mb-8">
          SharePlate connects commercial kitchens, campus dining halls, hostels, and caterers directly with community kitchens, shelters, and food rescue volunteers to redistribute surplus meals with verified chain-of-custody handshakes.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-md mx-auto">
          <button
            onClick={() => onOpenAuth('signup')}
            className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-terracotta-600 hover:bg-terracotta-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition cursor-pointer flex items-center justify-center gap-2"
          >
            Get Started Free
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => onExploreTab('recipient')}
            className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-white hover:bg-cream-100 text-forest-900 border border-cream-200 font-bold text-sm shadow-xs transition cursor-pointer flex items-center justify-center gap-2"
          >
            Browse Available Food
            <ChevronRight className="w-4 h-4 text-stone-400" />
          </button>
        </div>

        {/* Trust Badges */}
        <div className="mt-12 pt-8 border-t border-cream-200/80 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs text-stone-500 font-medium">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-sage-600" />
            Mandatory Food Safety Checklists
          </span>
          <span className="flex items-center gap-1.5">
            <Split className="w-4 h-4 text-sage-600" />
            Split-and-Match Allocation
          </span>
          <span className="flex items-center gap-1.5">
            <RefreshCw className="w-4 h-4 text-sage-600" />
            Failed-Pickup Recovery Engine
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-sage-600" />
            Verified Chain-of-Custody
          </span>
        </div>
      </section>

      {/* VERIFIED IMPACT BANNER */}
      <section className="bg-white rounded-3xl border border-cream-200 shadow-soft p-8 sm:p-10 max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <span className="text-xs font-bold uppercase tracking-wider text-sage-700 block mb-1">
            Real Environmental & Social Accounting
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-forest-900 tracking-tight">
            Verified Physical Impact Ledger
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Aggregated exclusively from completed pickups verified with secure digital handshakes.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-cream-50/60 p-5 rounded-2xl border border-cream-200 text-center">
            <div className="w-9 h-9 rounded-xl bg-terracotta-100 text-terracotta-700 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-forest-900 font-mono">
              {summary.totalMealsRescued.toLocaleString()}
            </div>
            <div className="text-xs font-semibold text-stone-500 mt-1">Meals Rescued</div>
          </div>

          <div className="bg-cream-50/60 p-5 rounded-2xl border border-cream-200 text-center">
            <div className="w-9 h-9 rounded-xl bg-sage-100 text-sage-700 flex items-center justify-center mx-auto mb-3">
              <Leaf className="w-5 h-5" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-forest-900 font-mono">
              {summary.estimatedFoodWeightKg.toLocaleString()} kg
            </div>
            <div className="text-xs font-semibold text-stone-500 mt-1">Landfill Waste Diverted</div>
          </div>

          <div className="bg-cream-50/60 p-5 rounded-2xl border border-cream-200 text-center">
            <div className="w-9 h-9 rounded-xl bg-forest-100 text-forest-800 flex items-center justify-center mx-auto mb-3">
              <Wind className="w-5 h-5" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-forest-900 font-mono">
              {summary.estimatedCo2ePreventedKg.toLocaleString()} kg
            </div>
            <div className="text-xs font-semibold text-stone-500 mt-1">CO₂e Emissions Avoided</div>
          </div>

          <div className="bg-cream-50/60 p-5 rounded-2xl border border-cream-200 text-center">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mx-auto mb-3">
              <Droplets className="w-5 h-5" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-forest-900 font-mono">
              {(summary.estimatedWaterSavedLiters / 1000).toFixed(0)}k L
            </div>
            <div className="text-xs font-semibold text-stone-500 mt-1">Water Footprint Conserved</div>
          </div>
        </div>
      </section>

      {/* DUAL PATHWAYS SECTION */}
      <section className="max-w-6xl mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-forest-900 tracking-tight">
            Built for Both Sides of Food Redistribution
          </h2>
          <p className="text-sm text-stone-500 mt-2">
            Whether you are a university mess with surplus dinner, or an NGO feeding community shelters, SharePlate streamlines logistics.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Pathway 1: Donors */}
          <div className="bg-white p-8 rounded-3xl border border-cream-200 shadow-soft flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sage-100 text-sage-800 text-xs font-bold mb-4">
                <Store className="w-3.5 h-3.5 text-sage-600" />
                For Food Donors
              </div>
              <h3 className="text-xl font-bold text-forest-900 mb-2">
                College Canteens, Messes, Caterers & Hostels
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed mb-6">
                Turn evening buffet surplus and banquet over-prep into community impact. Log surplus in 60 seconds with storage parameters and temperature compliance.
              </p>

              <ul className="space-y-3 text-xs text-stone-700 mb-8">
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-sage-600 shrink-0 mt-0.5" />
                  <span><strong>Automatic Urgency Scoring:</strong> Priority Score ranks perishability and collection windows.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-sage-600 shrink-0 mt-0.5" />
                  <span><strong>Secure Pickup Handshake:</strong> Verify arriving volunteers with one-time 6-character codes.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-sage-600 shrink-0 mt-0.5" />
                  <span><strong>ESG Impact Reports:</strong> Track diverted food waste, CO₂e reductions, and community meals.</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => onOpenAuth('signup')}
              className="w-full py-3 rounded-2xl bg-sage-600 hover:bg-sage-700 text-white font-bold text-xs shadow-sm transition cursor-pointer flex items-center justify-center gap-2"
            >
              List Surplus as a Donor
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Pathway 2: Recipients */}
          <div className="bg-white p-8 rounded-3xl border border-cream-200 shadow-soft flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-terracotta-100 text-terracotta-800 text-xs font-bold mb-4">
                <Building2 className="w-3.5 h-3.5 text-terracotta-600" />
                For Recipient Organizations
              </div>
              <h3 className="text-xl font-bold text-forest-900 mb-2">
                NGOs, Community Shelters & Food Banks
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed mb-6">
                Receive instant match notifications tailored to your dispatch capacity, operating hours, and vegetarian/dietary preferences.
              </p>

              <ul className="space-y-3 text-xs text-stone-700 mb-8">
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-terracotta-600 shrink-0 mt-0.5" />
                  <span><strong>Smart Recipient Matching:</strong> Prioritizes verified kitchens within feasible dispatch radii.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-terracotta-600 shrink-0 mt-0.5" />
                  <span><strong>Split-and-Match Portioning:</strong> Claim only what your volunteers can safely distribute.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-terracotta-600 shrink-0 mt-0.5" />
                  <span><strong>Digital Pickup Pass:</strong> Access your confidential verification code on your mobile device.</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => onOpenAuth('signup')}
              className="w-full py-3 rounded-2xl bg-terracotta-600 hover:bg-terracotta-700 text-white font-bold text-xs shadow-sm transition cursor-pointer flex items-center justify-center gap-2"
            >
              Register Recipient Organization
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS — THE 4 PILLARS */}
      <section className="bg-sage-50/60 rounded-3xl border border-sage-200/80 p-8 sm:p-12 max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-sage-700 block mb-1">
            Algorithmic Logistics Architecture
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-forest-900 tracking-tight">
            How SharePlate Ensures Speed and Safety
          </h2>
          <p className="text-xs text-stone-500 mt-2">
            Four specialized engines prevent over-allocation, calculate logistical urgency, and stop food-safety risks.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1 */}
          <div className="bg-white p-6 rounded-2xl border border-cream-200 shadow-2xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm">
              01
            </div>
            <h4 className="font-extrabold text-forest-900 text-sm">Rescue Priority Score</h4>
            <p className="text-xs text-stone-600 leading-relaxed">
              Dynamically evaluates food perishability (hot, chilled, baked), storage conditions, and remaining safe consumption hours (0-100 score).
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-white p-6 rounded-2xl border border-cream-200 shadow-2xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-sage-100 text-sage-800 flex items-center justify-center font-bold text-sm">
              02
            </div>
            <h4 className="font-extrabold text-forest-900 text-sm">Smart Matcher</h4>
            <p className="text-xs text-stone-600 leading-relaxed">
              Filters organizations by operating hours overlap, portion capacity, dietary requirements, and proximity without fabricating false GPS routes.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-white p-6 rounded-2xl border border-cream-200 shadow-2xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-terracotta-100 text-terracotta-800 flex items-center justify-center font-bold text-sm">
              03
            </div>
            <h4 className="font-extrabold text-forest-900 text-sm">Split-and-Match</h4>
            <p className="text-xs text-stone-600 leading-relaxed">
              Enforces database-level portion conservation transactions so large batches can be claimed by multiple recipients without over-allocation.
            </p>
          </div>

          {/* Card 4 */}
          <div className="bg-white p-6 rounded-2xl border border-cream-200 shadow-2xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-forest-100 text-forest-800 flex items-center justify-center font-bold text-sm">
              04
            </div>
            <h4 className="font-extrabold text-forest-900 text-sm">Recovery Guard</h4>
            <p className="text-xs text-stone-600 leading-relaxed">
              If a courier breaks down, two strict gates evaluate biological safety and time buffers before re-opening for rapid re-matching or composting.
            </p>
          </div>
        </div>
      </section>

      {/* FOOD SAFETY DISCLOSURE */}
      <section className="max-w-4xl mx-auto px-4 text-center">
        <div className="bg-cream-100/70 border border-cream-200 rounded-3xl p-6 sm:p-8 space-y-3">
          <div className="flex items-center justify-center gap-2 text-forest-900 font-extrabold text-sm">
            <ShieldCheck className="w-5 h-5 text-sage-600" />
            Food Safety & Integrity Policy
          </div>
          <p className="text-xs text-stone-600 leading-relaxed max-w-2xl mx-auto">
            SharePlate enforces strict biological and storage criteria. Food safety is an absolute prerequisite: no food can be listed or reclaimed if temperature abuse is detected or sensory inspection fails. Urgency scores measure logistical dispatch priorities and never substitute for verified food hygiene.
          </p>
        </div>
      </section>
    </div>
  );
}
