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

      {/* 7. ABOUT ME / TENTANG PEMBUAT */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/40 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">
              Tentang Pembuat (About Me)
            </h2>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold uppercase border border-cyan-500/30">
            Pelaut Indonesia
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
          {/* Profile Photo */}
          <div className="relative shrink-0">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 border-cyan-400/60 shadow-xl shadow-cyan-950 group">
              <img
                src="/assets/aistudio/IMG_20261026_003856_174_7262942a.png"
                alt="Iswandi"
                className="w-full h-full object-cover object-center group-hover:scale-105 transition duration-300"
              />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-amber-500 text-black p-1 rounded-lg shadow font-black text-[10px]">
              SR
            </div>
          </div>

          {/* Bio & Details */}
          <div className="flex-1 text-center sm:text-left space-y-2">
            <div>
              <h3 className="text-lg font-black text-white tracking-wide">Iswandi</h3>
              <p className="text-xs text-cyan-300 font-semibold mt-0.5">
                Pelaut & Pengembang NAVIGASI LAUT SR
              </p>
            </div>

            <p className="text-xs text-slate-300 italic bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 leading-relaxed">
              &ldquo;Saya adalah seorang pelaut yang iseng membuat aplikasi dengan bantuan AI.&rdquo;
            </p>

            {/* Social & Contact Buttons */}
            <div className="pt-1 flex flex-wrap items-center justify-center sm:justify-start gap-2">
              {/* WhatsApp */}
              <a
                href="https://wa.me/6285179709543"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center gap-2 active:scale-95 transition"
              >
                <svg className="w-4 h-4 fill-current text-emerald-400" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                </svg>
                <span>085179709543</span>
              </a>

              {/* TikTok */}
              <a
                href="https://www.tiktok.com/@1swandi"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2 active:scale-95 transition"
              >
                <svg className="w-4 h-4 fill-current text-rose-400" viewBox="0 0 24 24">
                  <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                </svg>
                <span>@1swandi</span>
              </a>

              {/* Email */}
              <a
                href="mailto:afiqahnaylaputrii@gmail.com"
                className="px-3 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 font-bold text-xs flex items-center gap-2 active:scale-95 transition"
              >
                <svg className="w-4 h-4 fill-none stroke-current stroke-2 text-cyan-400" viewBox="0 0 24 24">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                <span className="truncate max-w-[190px]">afiqahnaylaputrii@gmail.com</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
