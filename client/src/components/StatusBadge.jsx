import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, XCircle, RefreshCw, Layers } from 'lucide-react';

export default function StatusBadge({ status, size = 'sm' }) {
  const sizeClasses = size === 'xs' 
    ? 'text-[11px] px-2 py-0.5' 
    : 'text-xs px-2.5 py-1';

  switch (status) {
    case 'AVAILABLE':
      return (
        <span className={`inline-flex items-center gap-1 font-semibold rounded-full bg-leaf-50 text-leaf-700 border border-leaf-200 ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-leaf-500"></span>
          Available
        </span>
      );
    case 'PARTIALLY_ALLOCATED':
      return (
        <span className={`inline-flex items-center gap-1 font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200 ${sizeClasses}`}>
          <Layers className="w-3 h-3 text-blue-500" />
          Split In Progress
        </span>
      );
    case 'FULLY_ALLOCATED':
      return (
        <span className={`inline-flex items-center gap-1 font-semibold rounded-full bg-stone-100 text-stone-700 border border-stone-200 ${sizeClasses}`}>
          <CheckCircle2 className="w-3 h-3 text-stone-500" />
          Fully Claimed
        </span>
      );
    case 'RESERVED':
      return (
        <span className={`inline-flex items-center gap-1 font-semibold rounded-full bg-amber-50 text-amber-800 border border-amber-200 ${sizeClasses}`}>
          <Clock className="w-3 h-3 text-amber-500" />
          Reserved (Pending Pickup)
        </span>
      );
    case 'COMPLETED':
      return (
        <span className={`inline-flex items-center gap-1 font-semibold rounded-full bg-leaf-100 text-leaf-800 border border-leaf-300 ${sizeClasses}`}>
          <CheckCircle2 className="w-3 h-3 text-leaf-600" />
          Pickup Verified
        </span>
      );
    case 'FAILED_RECOVERED':
      return (
        <span className={`inline-flex items-center gap-1 font-semibold rounded-full bg-coral-50 text-coral-700 border border-coral-200 ${sizeClasses}`}>
          <RefreshCw className="w-3 h-3 text-coral-500" />
          Re-opened via Recovery
        </span>
      );
    case 'FAILED_DISCARDED':
      return (
        <span className={`inline-flex items-center gap-1 font-semibold rounded-full bg-red-50 text-red-700 border border-red-200 ${sizeClasses}`}>
          <XCircle className="w-3 h-3 text-red-500" />
          Compost / Discarded
        </span>
      );
    case 'CANCELLED':
      return (
        <span className={`inline-flex items-center gap-1 font-semibold rounded-full bg-stone-100 text-stone-500 border border-stone-200 ${sizeClasses}`}>
          Cancelled
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center font-medium rounded-full bg-cream-100 text-stone-700 border border-cream-200 ${sizeClasses}`}>
          {status}
        </span>
      );
  }
}
