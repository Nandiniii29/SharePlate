import React, { useState, useEffect } from 'react';
import { 
  PlusCircle, 
  Utensils, 
  Clock,
  Check, 
  MapPin, 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  ChevronDown, 
  ChevronUp,
  RefreshCw,
  Search,
  Edit2,
  XCircle,
  Tag,
  AlertTriangle,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import PriorityBadge from '../components/PriorityBadge';
import StatusBadge from '../components/StatusBadge';
import VerifyPickupModal from '../components/VerifyPickupModal';

export default function DonorView({ currentUser }) {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [editingDonation, setEditingDonation] = useState(null);
  const [verifyingClaim, setVerifyingClaim] = useState(null);
  const [activeDonationForVerify, setActiveDonationForVerify] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Form State
  const defaultFormData = {
    title: '',
    category: 'PREPARED_MEALS',
    donorName: currentUser?.organization?.name || currentUser?.fullName || 'Campus Dining Services',
    donorContact: currentUser?.email || 'dining@campus.edu',
    location: currentUser?.organization?.location || 'Central Dining Hall, Ground Floor',
    foodType: 'COOKED_HOT',
    storageCondition: 'HOT_HOLDING',
    totalPortions: 80,
    isVeg: true,
    dietaryInfo: 'Vegetarian, Nut-Free',
    allergens: 'Dairy (curd/paneer), Gluten',
    pickupWindowStart: '20:30',
    pickupWindowEnd: '22:30',
    safeConsumptionDeadline: new Date(Date.now() + 2.5 * 3600000).toISOString().slice(0, 16),
    isCertifiedSafe: true,
    hasTemperatureAbuse: false,
    sensoryInspectionPassed: true,
    certifiedBy: currentUser?.fullName || 'Chef / Supervisor',
    safetyNotes: 'Held in hot-holding vessels above 65°C. Clean commercial containers.'
  };

  const [formData, setFormData] = useState(defaultFormData);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const loadDonations = async () => {
    setLoading(true);
    try {
      const data = await api.getDonations();
      setDonations(data.donations || []);
      setError(null);
    } catch (err) {
      setError(`Failed to load donations: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDonations();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingDonation(null);
    setFormData({
      ...defaultFormData,
      donorName: currentUser?.organization?.name || currentUser?.fullName || 'Campus Dining Services',
      donorContact: currentUser?.email || 'dining@campus.edu',
      location: currentUser?.organization?.location || 'Central Dining Hall, Ground Floor'
    });
    setFormError(null);
    setShowPostModal(true);
  };

  const handleOpenEditModal = (donation) => {
    setEditingDonation(donation);
    setFormData({
      title: donation.title,
      category: donation.category || 'PREPARED_MEALS',
      donorName: donation.donorName,
      donorContact: donation.donorContact,
      location: donation.location,
      foodType: donation.foodType,
      storageCondition: donation.storageCondition,
      totalPortions: donation.totalPortions,
      isVeg: donation.isVeg,
      dietaryInfo: donation.dietaryInfo || '',
      allergens: donation.allergens || '',
      pickupWindowStart: donation.pickupWindowStart,
      pickupWindowEnd: donation.pickupWindowEnd,
      safeConsumptionDeadline: donation.safeConsumptionDeadline ? donation.safeConsumptionDeadline.slice(0, 16) : '',
      isCertifiedSafe: donation.safetyStatus?.isCertifiedSafe ?? true,
      hasTemperatureAbuse: donation.safetyStatus?.hasTemperatureAbuse ?? false,
      sensoryInspectionPassed: donation.safetyStatus?.sensoryInspectionPassed ?? true,
      certifiedBy: donation.safetyStatus?.certifiedBy || '',
      safetyNotes: donation.safetyStatus?.notes || ''
    });
    setFormError(null);
    setShowPostModal(true);
  };

  const handleSubmitDonation = async (e) => {
    e.preventDefault();
    setFormError(null);

    // Food Safety Gate
    if (!formData.isCertifiedSafe) {
      setFormError('Food safety certification is mandatory. Food cannot be listed for redistribution without verified safety compliance.');
      return;
    }

    if (formData.hasTemperatureAbuse) {
      setFormError('Cannot redistribute food flagged for temperature danger zone abuse. Food must be composted or audited.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingDonation) {
        await api.updateDonation(editingDonation.id, {
          title: formData.title,
          category: formData.category,
          location: formData.location,
          foodType: formData.foodType,
          storageCondition: formData.storageCondition,
          totalPortions: Number(formData.totalPortions),
          isVeg: Boolean(formData.isVeg),
          dietaryInfo: formData.dietaryInfo,
          allergens: formData.allergens,
          pickupWindowStart: formData.pickupWindowStart,
          pickupWindowEnd: formData.pickupWindowEnd
        });
      } else {
        await api.createDonation({
          title: formData.title,
          category: formData.category,
          donorName: formData.donorName,
          donorContact: formData.donorContact,
          location: formData.location,
          foodType: formData.foodType,
          storageCondition: formData.storageCondition,
          totalPortions: Number(formData.totalPortions),
          isVeg: Boolean(formData.isVeg),
          dietaryInfo: formData.dietaryInfo,
          allergens: formData.allergens,
          pickupWindowStart: formData.pickupWindowStart,
          pickupWindowEnd: formData.pickupWindowEnd,
          safeConsumptionDeadline: new Date(formData.safeConsumptionDeadline).toISOString(),
          safetyStatus: {
            isCertifiedSafe: formData.isCertifiedSafe,
            hasTemperatureAbuse: formData.hasTemperatureAbuse,
            sensoryInspectionPassed: formData.sensoryInspectionPassed,
            certifiedBy: formData.certifiedBy,
            notes: formData.safetyNotes
          }
        });
      }

      setShowPostModal(false);
      setEditingDonation(null);
      await loadDonations();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelDonation = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this donation batch? Any active portion reservations will be released.')) {
      return;
    }

    try {
      await api.cancelDonation(id, 'Cancelled by donor');
      await loadDonations();
    } catch (err) {
      alert(`Error cancelling donation: ${err.message}`);
    }
  };

  // Filter donations
  const filteredDonations = donations.filter(d => {
    const matchesSearch = !searchQuery || 
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      d.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-cream-200 shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sage-100 text-sage-800 text-xs font-bold mb-2">
            <Utensils className="w-3.5 h-3.5 text-sage-600" />
            Food Donor Operations Console
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-forest-900 tracking-tight">
            Surplus Food Batches & Redirection
          </h1>
          <p className="text-xs text-stone-500 mt-1 max-w-xl">
            List surplus prepared meals, track real-time split reservations by community kitchens, and complete physical pickup verifications with secure digital handshakes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadDonations}
            disabled={loading}
            className="p-3 rounded-2xl border border-cream-200 text-stone-600 hover:bg-cream-100 transition cursor-pointer"
            title="Refresh listings"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenCreateModal}
            className="px-5 py-3 rounded-2xl bg-terracotta-600 hover:bg-terracotta-700 text-white font-bold text-xs shadow-sm hover:shadow transition cursor-pointer flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            Post New Surplus Batch
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-cream-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search batches by dish, location..."
            className="w-full pl-9 pr-3 py-2 bg-cream-50/50 border border-cream-200 rounded-xl text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-sage-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {['ALL', 'AVAILABLE', 'PARTIALLY_ALLOCATED', 'FULLY_ALLOCATED', 'COMPLETED'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                statusFilter === status
                  ? 'bg-forest-900 text-cream-100'
                  : 'bg-cream-100/70 text-stone-600 hover:bg-cream-200'
              }`}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {error}
        </div>
      )}

      {/* Donations List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-16 text-stone-400 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-sage-600" />
            Loading donation records...
          </div>
        ) : filteredDonations.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-3xl border border-cream-200 text-stone-400 text-xs space-y-3">
            <Utensils className="w-10 h-10 text-stone-300 mx-auto" />
            <div className="font-bold text-stone-600 text-sm">No surplus food batches match your filter</div>
            <p className="max-w-md mx-auto text-stone-400">
              When prepared cafeteria or banquet surplus is listed, it will display here with real-time claims and pickup handshake triggers.
            </p>
          </div>
        ) : (
          filteredDonations.map(donation => {
            const allocations = donation.allocations || [];
            const canEdit = donation.allocatedPortions === 0 && donation.status !== 'CANCELLED';
            const canCancel = donation.status !== 'CANCELLED' && !allocations.some(a => a.status === 'COMPLETED');

            return (
              <div 
                key={donation.id}
                className="bg-white rounded-3xl border border-cream-200 shadow-soft overflow-hidden transition-all duration-200"
              >
                {/* Main Card Row */}
                <div className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  {/* Left: Food Info */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={donation.status} />
                      <PriorityBadge 
                        priorityScore={donation.priorityScore} 
                        safetyStatus={donation.safetyStatus}
                      />
                      {donation.isVeg && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          100% Vegetarian
                        </span>
                      )}
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cream-100 text-stone-600 uppercase tracking-wider">
                        {donation.category?.replace('_', ' ') || 'Meals'}
                      </span>
                    </div>

                    <h3 className="text-lg font-extrabold text-forest-900 tracking-tight">
                      {donation.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-stone-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-stone-400" />
                        {donation.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-stone-400" />
                        Window: {donation.pickupWindowStart} – {donation.pickupWindowEnd}
                      </span>
                      <span>
                        Dietary: <strong>{donation.dietaryInfo || 'Standard'}</strong>
                      </span>
                      {donation.allergens && donation.allergens !== 'None declared' && (
                        <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                          Allergens: {donation.allergens}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Middle: Portions Meter */}
                  <div className="flex items-center gap-6 bg-cream-50/70 p-4 rounded-2xl border border-cream-200">
                    <div className="text-center">
                      <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">Total</span>
                      <span className="text-lg font-black text-forest-900 font-mono">{donation.totalPortions}</span>
                    </div>
                    <div className="h-8 w-px bg-cream-300" />
                    <div className="text-center">
                      <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">Claimed</span>
                      <span className="text-lg font-black text-terracotta-700 font-mono">{donation.allocatedPortions}</span>
                    </div>
                    <div className="h-8 w-px bg-cream-300" />
                    <div className="text-center">
                      <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">Remaining</span>
                      <span className="text-lg font-black text-sage-700 font-mono">{donation.remainingPortions}</span>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 self-start lg:self-center">
                    {canEdit && (
                      <button
                        onClick={() => handleOpenEditModal(donation)}
                        className="p-2.5 rounded-xl border border-cream-200 text-stone-600 hover:bg-cream-100 transition cursor-pointer"
                        title="Edit donation details"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                    {canCancel && (
                      <button
                        onClick={() => handleCancelDonation(donation.id)}
                        className="p-2.5 rounded-xl border border-cream-200 text-stone-400 hover:text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                        title="Cancel listing"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Split Allocations Sub-Table */}
                {allocations.length > 0 && (
                  <div className="bg-cream-50/40 border-t border-cream-200 p-4 sm:px-6">
                    <div className="text-xs font-bold text-forest-900 mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-sage-600" />
                        Split-and-Match Claim Allocations ({allocations.length})
                      </span>
                      <span className="text-[11px] font-semibold text-stone-400">
                        Physical pickup code required upon courier arrival
                      </span>
                    </div>

                    <div className="space-y-2">
                      {allocations.map(alc => (
                        <div 
                          key={alc.allocationId || alc.id}
                          className="bg-white p-3 rounded-xl border border-cream-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-7 h-7 rounded-lg bg-sage-100 text-sage-800 flex items-center justify-center font-bold text-xs">
                              {alc.portions}
                            </span>
                            <div>
                              <div className="font-bold text-forest-900">{alc.recipientName}</div>
                              <div className="text-[11px] text-stone-400">{alc.notes || 'No courier notes'}</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 self-end sm:self-auto">
                            <StatusBadge status={alc.status} size="xs" />

                            {alc.status === 'RESERVED' && (
                              <button
                                onClick={() => {
                                  setActiveDonationForVerify(donation);
                                  setVerifyingClaim(alc);
                                }}
                                className="px-3.5 py-1.5 rounded-xl bg-sage-600 hover:bg-sage-700 text-white font-bold text-xs shadow-xs transition cursor-pointer flex items-center gap-1.5"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Verify Handshake Code
                              </button>
                            )}

                            {alc.status === 'COMPLETED' && (
                              <span className="text-[11px] font-bold text-sage-700 flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" />
                                Rescued ({alc.actualPortionsCollected || alc.portions} portions)
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {showPostModal && (
        <div className="fixed inset-0 z-50 bg-forest-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-cream-200 shadow-2xl p-6 sm:p-8 my-8 relative">
            <button
              onClick={() => setShowPostModal(false)}
              className="absolute top-6 right-6 p-2 rounded-full text-stone-400 hover:text-stone-700 hover:bg-cream-100 transition cursor-pointer"
            >
              <XCircle className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-extrabold text-forest-900 mb-1">
              {editingDonation ? 'Edit Surplus Food Batch' : 'Post New Surplus Food Batch'}
            </h2>
            <p className="text-xs text-stone-500 mb-6">
              Log fresh surplus with storage criteria. The Rescue Priority Score algorithm will calculate dispatch urgency.
            </p>

            {formError && (
              <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitDonation} className="space-y-4">
              {/* Title & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-forest-800 mb-1">
                    Food Title / Dish Description *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Hostel 3 Mess Dinner (Dal Makhani & Phulkas)"
                    className="w-full px-3.5 py-2 bg-cream-50/50 border border-cream-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-sage-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-forest-800 mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 bg-cream-50/50 border border-cream-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-sage-500"
                  >
                    <option value="PREPARED_MEALS">Prepared Meals</option>
                    <option value="BAKED_GOODS">Baked Goods</option>
                    <option value="FRESH_PRODUCE">Fresh Produce</option>
                    <option value="PANTRY">Pantry Staples</option>
                    <option value="BEVERAGES">Beverages</option>
                  </select>
                </div>
              </div>

              {/* Portions & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-forest-800 mb-1">
                    Total Portions Available *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.totalPortions}
                    onChange={(e) => setFormData({ ...formData, totalPortions: e.target.value })}
                    className="w-full px-3.5 py-2 bg-cream-50/50 border border-cream-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-sage-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-forest-800 mb-1">
                    Pickup Location / Campus Facility
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3.5 py-2 bg-cream-50/50 border border-cream-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-sage-500"
                  />
                </div>
              </div>

              {/* Food Type & Storage */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-forest-800 mb-1">
                    Perishability Category (RPS Engine)
                  </label>
                  <select
                    value={formData.foodType}
                    onChange={(e) => setFormData({ ...formData, foodType: e.target.value })}
                    className="w-full px-3 py-2 bg-cream-50/50 border border-cream-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-sage-500"
                  >
                    <option value="COOKED_HOT">Cooked Hot (Curries, Rice, Gravies)</option>
                    <option value="COOKED_CHILLED">Cooked Chilled (Blast Chilled)</option>
                    <option value="FRESH_PRODUCE">Fresh Produce (Cut Greens, Salads)</option>
                    <option value="BAKED_DRY">Baked Dry (Bread, Pastries, Rotis)</option>
                    <option value="PACKAGED_PANTRY">Packaged Pantry (Sealed Dry Items)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-forest-800 mb-1">
                    Active Storage Environment
                  </label>
                  <select
                    value={formData.storageCondition}
                    onChange={(e) => setFormData({ ...formData, storageCondition: e.target.value })}
                    className="w-full px-3 py-2 bg-cream-50/50 border border-cream-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-sage-500"
                  >
                    <option value="HOT_HOLDING">Hot Holding (Commercial warmers &gt;60°C)</option>
                    <option value="REFRIGERATED">Refrigerated (Commercial chillers &lt;5°C)</option>
                    <option value="AMBIENT">Ambient (Room Temperature)</option>
                    <option value="FROZEN">Frozen (Below -18°C)</option>
                  </select>
                </div>
              </div>

              {/* Pickup Window */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-forest-800 mb-1">
                    Pickup Window Start
                  </label>
                  <input
                    type="time"
                    value={formData.pickupWindowStart}
                    onChange={(e) => setFormData({ ...formData, pickupWindowStart: e.target.value })}
                    className="w-full px-3 py-2 bg-cream-50/50 border border-cream-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-sage-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-forest-800 mb-1">
                    Pickup Window End
                  </label>
                  <input
                    type="time"
                    value={formData.pickupWindowEnd}
                    onChange={(e) => setFormData({ ...formData, pickupWindowEnd: e.target.value })}
                    className="w-full px-3 py-2 bg-cream-50/50 border border-cream-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-sage-500"
                  />
                </div>
              </div>

              {/* Dietary & Allergens */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-forest-800 mb-1">
                    Dietary Specifications
                  </label>
                  <input
                    type="text"
                    value={formData.dietaryInfo}
                    onChange={(e) => setFormData({ ...formData, dietaryInfo: e.target.value })}
                    placeholder="e.g. Vegetarian, Nut-Free, Jain Friendly"
                    className="w-full px-3.5 py-2 bg-cream-50/50 border border-cream-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-sage-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-forest-800 mb-1">
                    Known Food Allergens
                  </label>
                  <input
                    type="text"
                    value={formData.allergens}
                    onChange={(e) => setFormData({ ...formData, allergens: e.target.value })}
                    placeholder="e.g. Gluten, Dairy, Soy, Peanuts"
                    className="w-full px-3.5 py-2 bg-cream-50/50 border border-cream-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-sage-500"
                  />
                </div>
              </div>

              {/* Mandatory Food Safety Checklist */}
              <div className="p-4 rounded-2xl bg-sage-50/70 border border-sage-200 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-sage-900">
                  <ShieldCheck className="w-4 h-4 text-sage-700" />
                  Mandatory Food-Safety Checklist (Non-Negotiable Gate)
                </div>

                <label className="flex items-start gap-2.5 text-xs text-stone-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isCertifiedSafe}
                    onChange={(e) => setFormData({ ...formData, isCertifiedSafe: e.target.checked })}
                    className="rounded text-sage-600 focus:ring-sage-500 mt-0.5"
                  />
                  <span>
                    <strong>Affirmative Safety Certification:</strong> Prepared under sanitary conditions and suitable for human consumption.
                  </span>
                </label>

                <label className="flex items-start gap-2.5 text-xs text-stone-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.sensoryInspectionPassed}
                    onChange={(e) => setFormData({ ...formData, sensoryInspectionPassed: e.target.checked })}
                    className="rounded text-sage-600 focus:ring-sage-500 mt-0.5"
                  />
                  <span>
                    <strong>Sensory Inspection Passed:</strong> Normal appearance, fresh aroma, and intact food texture.
                  </span>
                </label>

                <label className="flex items-start gap-2.5 text-xs text-stone-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!formData.hasTemperatureAbuse}
                    onChange={(e) => setFormData({ ...formData, hasTemperatureAbuse: !e.target.checked })}
                    className="rounded text-sage-600 focus:ring-sage-500 mt-0.5"
                  />
                  <span>
                    <strong>Zero Temperature Abuse:</strong> Food has not lingered in the temperature danger zone (5°C – 60°C).
                  </span>
                </label>
              </div>

              <div className="flex gap-3 pt-3 border-t border-cream-200">
                <button
                  type="button"
                  onClick={() => setShowPostModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-cream-200 text-stone-600 text-xs font-bold hover:bg-cream-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-terracotta-600 hover:bg-terracotta-700 text-white text-xs font-bold shadow-sm transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {submitting ? 'Processing...' : editingDonation ? 'Save Updates' : 'Publish Batch to Rescue Network'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VERIFY PICKUP HANDSHAKE MODAL */}
      {verifyingClaim && (
        <VerifyPickupModal
          claim={verifyingClaim}
          donation={activeDonationForVerify}
          onClose={() => {
            setVerifyingClaim(null);
            setActiveDonationForVerify(null);
          }}
          onVerified={async () => {
            await loadDonations();
          }}
        />
      )}
    </div>
  );
}
