import React from 'react';
import { BoatIconType, WaypointCategory } from '../types';

export const CATEGORY_INFO: Record<
  WaypointCategory,
  { label: string; color: string; bg: string; border: string; iconEmoji: string }
> = {
  rumpon: {
    label: 'Rumpon',
    color: 'text-amber-400',
    bg: 'bg-amber-500/20',
    border: 'border-amber-500/40',
    iconEmoji: '⚓',
  },
  lokasi_ikan: {
    label: 'Lokasi Ikan',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/20',
    border: 'border-cyan-500/40',
    iconEmoji: '🐟',
  },
  pelabuhan: {
    label: 'Pelabuhan',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/20',
    border: 'border-emerald-500/40',
    iconEmoji: '🚢',
  },
  lokasi_berbahaya: {
    label: 'Lokasi Berbahaya',
    color: 'text-rose-400',
    bg: 'bg-rose-500/20',
    border: 'border-rose-500/40',
    iconEmoji: '⚠️',
  },
  tempat_berlindung: {
    label: 'Tempat Berlindung',
    color: 'text-blue-400',
    bg: 'bg-blue-500/20',
    border: 'border-blue-500/40',
    iconEmoji: '🛡️',
  },
  lokasi_pribadi: {
    label: 'Lokasi Pribadi',
    color: 'text-purple-400',
    bg: 'bg-purple-500/20',
    border: 'border-purple-500/40',
    iconEmoji: '📍',
  },
};

export const BOAT_NAMES: Record<BoatIconType, { label: string; desc: string }> = {
  katir: {
    label: 'Perahu Katir / Sandeq',
    desc: 'Perahu cadik tradisional khas Sulawesi & Nusa Tenggara',
  },
  kapal_kayu: {
    label: 'Kapal Kayu Nelayan',
    desc: 'Kapal motor kayu jolloro / patorani',
  },
  speedboat: {
    label: 'Speedboat Cepat',
    desc: 'Speedboat navigasi modern',
  },
  pamboat: {
    label: 'Pamboat / Cadik Tempel',
    desc: 'Perahu panjang ramping mesin tempel',
  },
};

export const BoatSvg: React.FC<{ type: BoatIconType; size?: number; className?: string }> = ({
  type,
  size = 40,
  className = '',
}) => {
  switch (type) {
    case 'katir':
      // Sandeq / Outrigger boat top-down
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          {/* Main narrow hull */}
          <path
            d="M32 4 C35 18 36 38 35 56 C33 59 31 59 29 56 C28 38 29 18 32 4 Z"
            fill="#38BDF8"
            stroke="#0284C7"
            strokeWidth="2"
          />
          {/* Outrigger poles (katir) left & right */}
          <line x1="8" y1="26" x2="56" y2="26" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="12" y1="44" x2="52" y2="44" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />
          {/* Left pontoon */}
          <rect x="7" y="16" width="4" height="38" rx="2" fill="#F8FAFC" stroke="#0284C7" strokeWidth="1.5" />
          {/* Right pontoon */}
          <rect x="53" y="16" width="4" height="38" rx="2" fill="#F8FAFC" stroke="#0284C7" strokeWidth="1.5" />
          {/* Bow arrow direction indicator */}
          <polygon points="32,2 27,10 37,10" fill="#EF4444" />
        </svg>
      );
    case 'kapal_kayu':
      // Wooden fishing motor vessel
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          {/* Wide sturdy wooden hull */}
          <path
            d="M32 4 C42 16 44 42 41 57 C38 60 26 60 23 57 C20 42 22 16 32 4 Z"
            fill="#D97706"
            stroke="#78350F"
            strokeWidth="2"
          />
          {/* Deck cabin */}
          <rect x="26" y="24" width="12" height="20" rx="2" fill="#FDE68A" stroke="#B45309" strokeWidth="1.5" />
          {/* Mast / Radar */}
          <circle cx="32" cy="30" r="3" fill="#1E293B" />
          {/* Bow pointer */}
          <polygon points="32,2 26,10 38,10" fill="#EF4444" />
        </svg>
      );
    case 'speedboat':
      // Sleek speedboat
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          <path
            d="M32 3 C39 16 41 44 38 58 L26 58 C23 44 25 16 32 3 Z"
            fill="#10B981"
            stroke="#047857"
            strokeWidth="2"
          />
          {/* Cockpit windshield */}
          <path d="M26 22 Q32 20 38 22 L36 32 Q32 30 28 32 Z" fill="#0284C7" />
          {/* Dual outboards */}
          <rect x="25" y="58" width="4" height="4" rx="1" fill="#1E293B" />
          <rect x="35" y="58" width="4" height="4" rx="1" fill="#1E293B" />
          <polygon points="32,1 28,8 36,8" fill="#EF4444" />
        </svg>
      );
    case 'pamboat':
      // Narrow long boat
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          <path
            d="M32 2 C36 14 37 46 35 60 L29 60 C27 46 28 14 32 2 Z"
            fill="#F43F5E"
            stroke="#BE123C"
            strokeWidth="2"
          />
          <line x1="32" y1="14" x2="32" y2="52" stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="2 2" />
          <rect x="30" y="59" width="4" height="4" fill="#0F172A" />
          <polygon points="32,1 28,7 36,7" fill="#FACC15" />
        </svg>
      );
  }
};
