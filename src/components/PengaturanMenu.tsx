import React, { useState } from 'react';
import { AppSettings, CoordinateFormat, SpeedUnit, DistanceUnit, BoatIconType } from '../types';
import { BOAT_NAMES, BoatSvg } from './MarineIcons';
import { voiceGuidance } from '../services/VoiceGuidance';
import {
  Settings,
  Volume2,
  Compass,
  Navigation,
  HardDrive,
  Github,
  Download,
  Check,
  AlertCircle,
  ExternalLink,
  Shield,
  Smartphone,
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface PengaturanMenuProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onExportAllData: () => void;
}

export const PengaturanMenu: React.FC<PengaturanMenuProps> = ({
  settings,
  onUpdateSettings,
  onExportAllData,
}) => {
  const [savedSuccess, setSavedSuccess] = useState(false);

  const update = (partial: Partial<AppSettings>) => {
    const next = { ...settings, ...partial };
    onUpdateSettings(next);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleTestVoice = () => {
    voiceGuidance.testVoice();
  };

  return (
    <div className="w-full min-h-[calc(100vh-4.5rem)] bg-slate-950 text-white p-3 sm:p-5 flex flex-col max-w-4xl mx-auto space-y-4 pb-28">
      {/* 1. Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h1 className="text-xl font-black text-cyan-300 flex items-center gap-2">
            <Settings className="w-6 h-6 text-slate-300" />
            Pengaturan Aplikasi
          </h1>
          <p className="text-xs text-slate-400">
            Sesuaikan satuan navigasi maritim, ikon kapal, panduan suara, dan unduh berkas APK Android.
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-950 border border-emerald-500 text-emerald-300 text-xs font-bold animate-in fade-in">
            <Check className="w-3.5 h-3.5" />
            <span>Tersimpan</span>
          </div>
        )}
      </div>

      {/* 2. ANDROID APK & GITHUB REPO DOWNLOAD CARD */}
      <div className="bg-gradient-to-r from-blue-950/80 to-cyan-950/80 border border-cyan-500/40 rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-300">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">Aplikasi Android & Berkas APK</h2>
              <span className="text-xs text-cyan-300 font-medium">
                Repo GitHub: iswandi-sys/GPS
              </span>
            </div>
          </div>

          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold uppercase">
            GitHub Actions Ready
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Aplikasi telah dikonfigurasikan dengan alur build otomatis GitHub Actions. Setiap kali kode diperbarui, GitHub Actions akan mengkompilasi berkas installer <strong>.apk</strong> Android release yang dapat diunduh langsung ke HP nelayan.
        </p>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <a
            href="https://github.com/iswandi-sys/GPS/releases"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-600/30 transition active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Unduh Berkas APK (GitHub Releases)</span>
            <ExternalLink className="w-3.5 h-3.5 ml-1 opacity-70" />
          </a>

          <a
            href="https://github.com/iswandi-sys/GPS/actions"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1.5 transition active:scale-95"
          >
            <Github className="w-4 h-4" />
            <span>Status Build APK</span>
            <ExternalLink className="w-3 h-3 ml-0.5 opacity-60" />
          </a>

          {/* In-App PWA Install */}
          <PWAInstallButton />
        </div>
      </div>

      {/* 3. UNITS & COORDINATES */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Compass className="w-4 h-4 text-cyan-400" />
          Format Navigasi & Satuan Ukur
        </h2>

        {/* Coordinate Format */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
          <div>
            <label className="text-xs font-bold text-white block">Format Koordinat</label>
            <span className="text-[11px] text-slate-400">Tampilan lintang dan bujur</span>
          </div>
          <div className="sm:col-span-2 grid grid-cols-2 gap-2">
            <button
              onClick={() => update({ coordinateFormat: 'DMS' })}
              className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                settings.coordinateFormat === 'DMS'
                  ? 'bg-cyan-600 border-cyan-400 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
              }`}
            >
              DMS (Derajat Menit Detik)
              <span className="block text-[10px] font-normal opacity-80">05° 08' 32" S</span>
            </button>
            <button
              onClick={() => update({ coordinateFormat: 'DD' })}
              className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                settings.coordinateFormat === 'DD'
                  ? 'bg-cyan-600 border-cyan-400 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
              }`}
            >
              DD (Desimal)
              <span className="block text-[10px] font-normal opacity-80">-5.14231°</span>
            </button>
          </div>
        </div>

        {/* Speed Unit */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center border-t border-slate-800/80 pt-3">
          <div>
            <label className="text-xs font-bold text-white block">Satuan Kecepatan (SOG)</label>
            <span className="text-[11px] text-slate-400">Standar nelayan maritim</span>
          </div>
          <div className="sm:col-span-2 grid grid-cols-2 gap-2">
            <button
              onClick={() => update({ speedUnit: 'knot' })}
              className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                settings.speedUnit === 'knot'
                  ? 'bg-cyan-600 border-cyan-400 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
              }`}
            >
              Knot (kn)
              <span className="block text-[10px] font-normal opacity-80">Mil Laut / Jam</span>
            </button>
            <button
              onClick={() => update({ speedUnit: 'kmh' })}
              className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                settings.speedUnit === 'kmh'
                  ? 'bg-cyan-600 border-cyan-400 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
              }`}
            >
              Kilometer / Jam (km/j)
            </button>
          </div>
        </div>

        {/* Distance Unit */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center border-t border-slate-800/80 pt-3">
          <div>
            <label className="text-xs font-bold text-white block">Satuan Jarak</label>
            <span className="text-[11px] text-slate-400">Jarak target ke rumpon</span>
          </div>
          <div className="sm:col-span-2 grid grid-cols-2 gap-2">
            <button
              onClick={() => update({ distanceUnit: 'nmi' })}
              className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                settings.distanceUnit === 'nmi'
                  ? 'bg-cyan-600 border-cyan-400 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
              }`}
            >
              Mil Laut (nmi)
              <span className="block text-[10px] font-normal opacity-80">1 nmi = 1.852 m</span>
            </button>
            <button
              onClick={() => update({ distanceUnit: 'km' })}
              className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                settings.distanceUnit === 'km'
                  ? 'bg-cyan-600 border-cyan-400 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
              }`}
            >
              Kilometer (km)
            </button>
          </div>
        </div>
      </div>

      {/* 4. BOAT ICON SELECTION */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Navigation className="w-4 h-4 text-cyan-400" />
            Ikon Kapal Navigasi
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Pilih model kapal tradisional sesuai armada nelayan Anda.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {(Object.keys(BOAT_NAMES) as BoatIconType[]).map((type) => {
            const isSelected = settings.boatIcon === type;
            const boat = BOAT_NAMES[type];

            return (
              <button
                key={type}
                onClick={() => update({ boatIcon: type })}
                className={`p-3 rounded-xl border text-left flex items-center gap-3 transition ${
                  isSelected
                    ? 'bg-cyan-950/60 border-cyan-400 ring-2 ring-cyan-400/40 text-white'
                    : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center shrink-0 border border-slate-800">
                  <BoatSvg type={type} size={40} />
                </div>
                <div className="truncate">
                  <div className="font-bold text-xs text-white truncate">{boat.label}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5 truncate">{boat.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. VOICE GUIDANCE (TTS) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-cyan-400" />
              Panduan Suara Kemudi (TTS Indonesia)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Instruksi suara otomatis untuk mengoreksi haluan ke kiri atau ke kanan saat berlayar.
            </p>
          </div>

          <button
            onClick={() => update({ voiceGuidanceEnabled: !settings.voiceGuidanceEnabled })}
            className={`w-12 h-7 rounded-full transition-colors relative p-1 ${
              settings.voiceGuidanceEnabled ? 'bg-cyan-600' : 'bg-slate-800'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                settings.voiceGuidanceEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {settings.voiceGuidanceEnabled && (
          <div className="space-y-3 pt-2 border-t border-slate-800/80 text-xs">
            {/* Interval */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-slate-300 font-semibold">Interval Pengulangan</label>
              <div className="sm:col-span-2 grid grid-cols-4 gap-1.5">
                {[30, 60, 120, 300].map((sec) => (
                  <button
                    key={sec}
                    onClick={() => update({ voiceIntervalSeconds: sec })}
                    className={`py-1.5 rounded-lg border text-xs font-bold transition ${
                      settings.voiceIntervalSeconds === sec
                        ? 'bg-cyan-600 border-cyan-400 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    {sec < 60 ? `${sec} dtk` : `${sec / 60} mnt`}
                  </button>
                ))}
              </div>
            </div>

            {/* Threshold */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-slate-300 font-semibold">Ambang Selisih Arah</label>
              <div className="sm:col-span-2 grid grid-cols-3 gap-1.5">
                {[10, 15, 20].map((deg) => (
                  <button
                    key={deg}
                    onClick={() => update({ voiceHeadingThreshold: deg })}
                    className={`py-1.5 rounded-lg border text-xs font-bold transition ${
                      settings.voiceHeadingThreshold === deg
                        ? 'bg-cyan-600 border-cyan-400 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    &gt; {deg}°
                  </button>
                ))}
              </div>
            </div>

            {/* Proximity warning */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-slate-300 font-semibold">Peringatan Dekat Target</label>
              <div className="sm:col-span-2 grid grid-cols-3 gap-1.5">
                {[0.2, 0.5, 1.0].map((dist) => (
                  <button
                    key={dist}
                    onClick={() => update({ voiceProximityWarningNmi: dist })}
                    className={`py-1.5 rounded-lg border text-xs font-bold transition ${
                      settings.voiceProximityWarningNmi === dist
                        ? 'bg-cyan-600 border-cyan-400 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    &lt; {dist} nmi
                  </button>
                ))}
              </div>
            </div>

            {/* Test Voice CTA */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleTestVoice}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-cyan-300 font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition"
              >
                <Volume2 className="w-4 h-4 text-cyan-400" />
                <span>Uji Suara Panduan Nelayan Sekarang</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 6. BACKUP & LOCAL DATA MANAGEMENT */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-cyan-400" />
          Pengelolaan Data & Cadangan Offline
        </h2>
        <p className="text-xs text-slate-400">
          Semua titik dan foto tersimpan langsung pada memori HP Anda (IndexedDB lokal) tanpa ketergantungan server luar.
        </p>

        <button
          onClick={onExportAllData}
          className="w-full py-3 rounded-xl bg-blue-600/80 hover:bg-blue-600 border border-blue-400 text-white font-bold text-xs flex items-center justify-center gap-2 shadow transition active:scale-95"
        >
          <Download className="w-4 h-4" />
          <span>Cadangkan Seluruh Data Titik ke Berkas HP</span>
        </button>
      </div>
    </div>
  );
};
