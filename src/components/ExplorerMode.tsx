import React from 'react';
import {
  NavPosition,
  NavTargetCalculation,
  AppSettings,
  Waypoint,
} from '../types';
import {
  X,
  Compass,
  Volume2,
  VolumeX,
  Anchor,
  Navigation,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
} from 'lucide-react';
import { formatSpeed, formatDistance } from '../services/NavigationEngine';
import { CATEGORY_INFO, BoatSvg } from './MarineIcons';

interface ExplorerModeProps {
  position: NavPosition | null;
  targetCalc: NavTargetCalculation;
  settings: AppSettings;
  onClose: () => void;
  onToggleVoice: () => void;
  onOpenTargetPicker: () => void;
}

export const ExplorerMode: React.FC<ExplorerModeProps> = ({
  position,
  targetCalc,
  settings,
  onClose,
  onToggleVoice,
  onOpenTargetPicker,
}) => {
  const currentHeading = position?.heading ?? 0;
  const targetBearing = targetCalc.bearingDeg;
  const relativeDelta = Math.round(targetCalc.relativeBearingDelta);
  const absDelta = Math.abs(relativeDelta);
  const isOnCourse = absDelta <= (settings.voiceHeadingThreshold || 15);

  return (
    <div className="fixed inset-0 z-[1000] bg-black text-white flex flex-col justify-between p-4 select-none overflow-hidden font-sans">
      {/* 1. TOP HEADER: TARGET INFO & CONTROLS */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3 overflow-hidden">
          <button
            onClick={onOpenTargetPicker}
            className="flex items-center gap-2 bg-slate-900 border border-slate-700 hover:border-amber-400 px-3 py-2 rounded-xl active:scale-95 transition"
          >
            <Anchor className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="text-left truncate">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                Target Navigasi
              </span>
              <span className="text-base font-black text-amber-300 truncate block max-w-[180px]">
                {targetCalc.target ? targetCalc.target.name : 'Belum Ada Target'}
              </span>
            </div>
          </button>

          {targetCalc.target && (
            <span className="text-xs px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 font-bold uppercase border border-amber-500/30">
              {CATEGORY_INFO[targetCalc.target.category].label}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleVoice}
            className={`p-3 rounded-xl border font-bold flex items-center justify-center active:scale-95 transition ${
              settings.voiceGuidanceEnabled
                ? 'bg-blue-600 border-blue-400 text-white'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
            title="Panduan Suara"
          >
            {settings.voiceGuidanceEnabled ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
          </button>

          <button
            onClick={onClose}
            className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 active:scale-95 transition"
            title="Kembali ke Peta"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* 2. CENTER TACTICAL HUD: COURSE CORRECTION STEERING INDICATOR */}
      <div className="my-auto flex flex-col items-center justify-center gap-4 py-2">
        {/* Dynamic Steering Deviation Bar */}
        {targetCalc.target ? (
          <div className="w-full max-w-md bg-slate-950 border-2 border-slate-800 rounded-2xl p-4 shadow-2xl flex flex-col items-center">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
              Koreksi Kemudi Kapal
            </span>

            {/* Visual deviation bar */}
            <div className="w-full flex items-center justify-between gap-2 px-2">
              <div className="flex items-center gap-1 text-rose-400 font-bold text-xs uppercase">
                <ArrowLeft className="w-4 h-4" /> KIRI (PORT)
              </div>
              <div className="text-xs font-mono font-bold text-slate-400">
                LURUS (0°)
              </div>
              <div className="flex items-center gap-1 text-emerald-400 font-bold text-xs uppercase">
                KANAN (STBD) <ArrowRight className="w-4 h-4" />
              </div>
            </div>

            {/* Gauge slider track */}
            <div className="relative w-full h-8 bg-slate-900 rounded-full my-3 border border-slate-700 overflow-hidden flex items-center justify-center">
              {/* Center zero line */}
              <div className="absolute top-0 bottom-0 w-1 bg-cyan-400 z-10" />

              {/* Indicator needle: scaled from -90° (left 0%) to +90° (right 100%) */}
              {(() => {
                const clamped = Math.max(-60, Math.min(60, relativeDelta));
                const pct = ((clamped + 60) / 120) * 100;
                return (
                  <div
                    className={`absolute top-0 bottom-0 w-5 rounded-full transition-all duration-300 flex items-center justify-center shadow-lg ${
                      isOnCourse ? 'bg-emerald-400 ring-4 ring-emerald-500/40' : relativeDelta < 0 ? 'bg-rose-500' : 'bg-emerald-500'
                    }`}
                    style={{ left: `calc(${pct}% - 10px)` }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-black" />
                  </div>
                );
              })()}
            </div>

            {/* Verbal steering advice banner */}
            <div
              className={`w-full py-2.5 px-4 rounded-xl text-center font-black text-lg uppercase tracking-wide border flex items-center justify-center gap-2 ${
                isOnCourse
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                  : relativeDelta < 0
                  ? 'bg-rose-950/80 border-rose-500 text-rose-300'
                  : 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
              }`}
            >
              {isOnCourse ? (
                <>
                  <CheckCircle className="w-6 h-6 text-emerald-400" />
                  <span>HALUAN MANTAP • PERTAHANKAN ARAH</span>
                </>
              ) : relativeDelta < 0 ? (
                <>
                  <ArrowLeft className="w-6 h-6 text-rose-400 animate-pulse" />
                  <span>BELOK KIRI {absDelta}°</span>
                </>
              ) : (
                <>
                  <span>BELOK KANAN {absDelta}°</span>
                  <ArrowRight className="w-6 h-6 text-emerald-400 animate-pulse" />
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-slate-900/80 border border-slate-700 rounded-2xl p-6 text-center max-w-sm">
            <Anchor className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-300 mb-1">Target Belum Dipilih</h3>
            <p className="text-xs text-slate-400 mb-4">
              Pilih titik rumpon atau lokasi tujuan untuk mengaktifkan panduan arah kemudi dan estimasi tiba.
            </p>
            <button
              onClick={onOpenTargetPicker}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 font-bold rounded-xl text-white text-sm"
            >
              Pilih Target Navigasi
            </button>
          </div>
        )}

        {/* Dynamic Boat Icon & Bearing Ring */}
        <div className="relative w-44 h-44 flex items-center justify-center">
          {/* Compass ring bezel */}
          <div className="absolute inset-0 rounded-full border-4 border-slate-800 flex items-center justify-center">
            <span className="absolute top-1 text-[11px] font-black text-rose-400">U</span>
            <span className="absolute right-1 text-[11px] font-black text-slate-400">T</span>
            <span className="absolute bottom-1 text-[11px] font-black text-slate-400">S</span>
            <span className="absolute left-1 text-[11px] font-black text-slate-400">B</span>
          </div>

          {/* Target bearing needle */}
          {targetCalc.target && (
            <div
              className="absolute inset-0 flex items-center justify-center transition-transform duration-300"
              style={{ transform: `rotate(${targetBearing}deg)` }}
            >
              <div className="w-1.5 h-18 bg-amber-400 rounded-t-full shadow-lg shadow-amber-400/50 -translate-y-9" />
            </div>
          )}

          {/* Boat center rotated to current heading */}
          <div
            className="transition-transform duration-300 flex items-center justify-center z-10"
            style={{ transform: `rotate(${currentHeading}deg)` }}
          >
            <BoatSvg type={settings.boatIcon} size={68} />
          </div>
        </div>
      </div>

      {/* 3. BOTTOM TILES: HUGE BOLD METRICS GRID (Sunlight readable) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800">
        {/* Metric 1: SOG (Speed) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col justify-between">
          <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
            Kecepatan (SOG)
          </span>
          <div className="my-1">
            <span className="text-3xl sm:text-4xl font-black text-amber-400 font-mono tracking-tight">
              {formatSpeed(position?.speedKnots ?? 0, settings.speedUnit)}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-medium">GPS Kapal</span>
        </div>

        {/* Metric 2: Distance to Target */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col justify-between">
          <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
            Jarak Target
          </span>
          <div className="my-1">
            <span className="text-3xl sm:text-4xl font-black text-cyan-300 font-mono tracking-tight">
              {targetCalc.target
                ? formatDistance(targetCalc.distanceNmi, settings.distanceUnit)
                : '--'}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-medium">Garis Lurus</span>
        </div>

        {/* Metric 3: Target Bearing & Heading */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col justify-between">
          <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
            Arah Target / Haluan
          </span>
          <div className="my-1">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
              {targetCalc.target ? `${Math.round(targetBearing)}°` : '--°'}
              <span className="text-slate-500 text-lg ml-1 font-normal">
                / {Math.round(currentHeading)}°
              </span>
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-medium">Derajat Kompas</span>
        </div>

        {/* Metric 4: ETA */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col justify-between">
          <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
            Estimasi Tiba (ETA)
          </span>
          <div className="my-1">
            <span className="text-2xl sm:text-3xl font-black text-amber-300 font-mono tracking-tight truncate block">
              {targetCalc.etaTimeFormatted || '--:--'}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-medium">Waktu Perjalanan</span>
        </div>
      </div>
    </div>
  );
};
