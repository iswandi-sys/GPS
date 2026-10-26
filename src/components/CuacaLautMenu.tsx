import React, { useState, useEffect } from 'react';
import { MarineWeatherForecast, NavPosition } from '../types';
import {
  PRESET_REGIONS,
  WeatherPresetRegion,
  fetchMarineWeather,
  degToCardinal,
} from '../services/WeatherProvider';
import {
  Waves,
  Wind,
  Thermometer,
  Compass,
  RefreshCw,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  CloudSun,
  Navigation,
} from 'lucide-react';

interface CuacaLautMenuProps {
  currentPosition: NavPosition | null;
}

export const CuacaLautMenu: React.FC<CuacaLautMenuProps> = ({ currentPosition }) => {
  const [selectedRegion, setSelectedRegion] = useState<WeatherPresetRegion>(PRESET_REGIONS[0]);
  const [isUsingGpsLocation, setIsUsingGpsLocation] = useState(false);
  const [weatherData, setWeatherData] = useState<MarineWeatherForecast | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadWeather = async (force = false) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const lat = isUsingGpsLocation && currentPosition ? currentPosition.lat : selectedRegion.lat;
      const lng = isUsingGpsLocation && currentPosition ? currentPosition.lng : selectedRegion.lng;
      const regionName = isUsingGpsLocation ? 'Posisi GPS Kapal Saat Ini' : selectedRegion.name;

      const data = await fetchMarineWeather(lat, lng, regionName, force);
      setWeatherData(data);
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Gagal memuat cuaca maritim. Pastikan koneksi internet tersedia untuk pembaruan awal.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWeather(false);
  }, [selectedRegion, isUsingGpsLocation]);

  const handleSelectPreset = (region: WeatherPresetRegion) => {
    setIsUsingGpsLocation(false);
    setSelectedRegion(region);
  };

  const handleSelectGps = () => {
    if (!currentPosition) {
      alert('Sinyal GPS kapal belum terdeteksi. Silakan pilih perairan Sulawesi / NTT dari daftar.');
      return;
    }
    setIsUsingGpsLocation(true);
  };

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'tenang':
        return {
          bg: 'bg-emerald-950/80 border-emerald-500 text-emerald-300',
          badge: 'bg-emerald-500 text-black',
          label: 'TENANG (AMAN)',
        };
      case 'rendah':
        return {
          bg: 'bg-cyan-950/80 border-cyan-500 text-cyan-300',
          badge: 'bg-cyan-500 text-black',
          label: 'GELOMBANG RENDAH (AMAN)',
        };
      case 'sedang':
        return {
          bg: 'bg-amber-950/80 border-amber-500 text-amber-300',
          badge: 'bg-amber-500 text-black',
          label: 'WASPADA SEDANG',
        };
      case 'tinggi':
        return {
          bg: 'bg-orange-950/80 border-orange-500 text-orange-300',
          badge: 'bg-orange-500 text-white',
          label: 'BAHAYA GELOMBANG TINGGI',
        };
      case 'sangat_berbahaya':
        return {
          bg: 'bg-rose-950/90 border-rose-500 text-rose-300',
          badge: 'bg-rose-500 text-white',
          label: 'DILARANG MELAUT (EKSTREM)',
        };
      default:
        return {
          bg: 'bg-slate-900 border-slate-700 text-slate-300',
          badge: 'bg-slate-700 text-white',
          label: 'NORMAL',
        };
    }
  };

  const isExpired = weatherData ? (Date.now() - weatherData.updatedAt) > 24 * 60 * 60 * 1000 : false;

  return (
    <div className="w-full min-h-[calc(100vh-4.5rem)] bg-slate-950 text-white p-3 sm:p-5 flex flex-col max-w-4xl mx-auto space-y-4 pb-24">
      {/* 1. Header & Refresh */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h1 className="text-xl font-black text-cyan-300 flex items-center gap-2">
            <Waves className="w-6 h-6 text-cyan-400" />
            Cuaca Laut & Gelombang
          </h1>
          <p className="text-xs text-slate-400">
            Prakiraan maritim resmi perairan Sulawesi, Nusa Tenggara, dan sekitarnya (Tersimpan otomatis untuk offline).
          </p>
        </div>

        <button
          onClick={() => loadWeather(true)}
          disabled={loading}
          className="p-2 sm:px-3 sm:py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-slate-300 hover:text-white flex items-center gap-1.5 text-xs font-bold transition active:scale-95"
          title="Segarkan Data Cuaca"
        >
          <RefreshCw className={`w-4 h-4 text-cyan-400 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Perbarui</span>
        </button>
      </div>

      {/* 2. Region Selector Pills */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
          Pilih Wilayah Perairan
        </label>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {/* Live Vessel GPS Button */}
          <button
            onClick={handleSelectGps}
            className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition ${
              isUsingGpsLocation
                ? 'bg-cyan-600 text-white shadow-lg ring-2 ring-cyan-400'
                : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Navigation className="w-4 h-4 text-amber-400 fill-current" />
            <span>Posisi Kapal ({currentPosition ? 'GPS Aktif' : 'Cari GPS'})</span>
          </button>

          {PRESET_REGIONS.map((reg) => {
            const isSelected = !isUsingGpsLocation && selectedRegion.id === reg.id;
            return (
              <button
                key={reg.id}
                onClick={() => handleSelectPreset(reg)}
                className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-400'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {reg.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Status banner (Cached / Expired / Online) */}
      {weatherData && (
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-slate-300">
              Pembaruan: <strong>{new Date(weatherData.updatedAt).toLocaleString('id-ID')}</strong>
            </span>
            {weatherData.isCached && (
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px] uppercase border border-amber-500/30">
                Mode Offline
              </span>
            )}
          </div>

          <span className="text-[10px] text-slate-500">
            Sumber: Open-Meteo Marine / Copernicus ECMWF
          </span>
        </div>
      )}

      {isExpired && (
        <div className="p-3 bg-amber-950/80 border border-amber-500 text-amber-300 text-xs rounded-xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Data cuaca telah berusia lebih dari 24 jam. Hubungkan perangkat ke internet saat di darat untuk memuat data terkini.</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-950/80 border border-rose-500 text-rose-300 text-xs rounded-2xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-sm mb-1">Gagal Memuat Cuaca</div>
            <div>{errorMessage}</div>
          </div>
        </div>
      )}

      {/* 3. Main Current Weather Card */}
      {weatherData && (
        <div className="space-y-4">
          {(() => {
            const risk = getRiskBadge(weatherData.current.safetyRisk);
            return (
              <div className={`border-2 rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-col gap-4 ${risk.bg}`}>
                {/* Header row: region name & risk badge */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-lg sm:text-xl font-black text-white">
                      {weatherData.regionName}
                    </h2>
                    <span className="text-xs text-slate-300 font-medium">
                      Kondisi Maritim Saat Ini • {weatherData.current.weatherCodeDescription}
                    </span>
                  </div>

                  <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${risk.badge}`}>
                    {risk.label}
                  </span>
                </div>

                {/* Safety advice message */}
                <div className="p-3 bg-black/40 rounded-xl border border-white/10 text-xs font-semibold text-white">
                  {weatherData.current.safetyMessage}
                </div>

                {/* Main 4 Marine Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-100">
                  {/* Metric 1: Wave Height */}
                  <div className="bg-black/30 border border-white/10 rounded-xl p-3 flex flex-col justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                      <Waves className="w-3.5 h-3.5 text-cyan-400" /> Tinggi Gelombang
                    </span>
                    <div className="my-1.5">
                      <span className="text-3xl font-black text-cyan-300 font-mono">
                        {weatherData.current.waveHeight.toFixed(1)}
                      </span>
                      <span className="text-sm text-cyan-400 font-bold ml-1">meter</span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      Arah: {Math.round(weatherData.current.waveDirection)}° ({degToCardinal(weatherData.current.waveDirection)})
                    </span>
                  </div>

                  {/* Metric 2: Wave Period */}
                  <div className="bg-black/30 border border-white/10 rounded-xl p-3 flex flex-col justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" /> Periode Ombak
                    </span>
                    <div className="my-1.5">
                      <span className="text-3xl font-black text-indigo-300 font-mono">
                        {weatherData.current.wavePeriod.toFixed(1)}
                      </span>
                      <span className="text-sm text-indigo-400 font-bold ml-1">detik</span>
                    </div>
                    <span className="text-[10px] text-slate-400">Jarak antar puncak</span>
                  </div>

                  {/* Metric 3: Wind Speed */}
                  <div className="bg-black/30 border border-white/10 rounded-xl p-3 flex flex-col justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                      <Wind className="w-3.5 h-3.5 text-amber-400" /> Angin Laut
                    </span>
                    <div className="my-1.5">
                      <span className="text-3xl font-black text-amber-400 font-mono">
                        {Math.round(weatherData.current.windSpeed)}
                      </span>
                      <span className="text-sm text-amber-300 font-bold ml-1">knot</span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      Dari {degToCardinal(weatherData.current.windDirection)} ({Math.round(weatherData.current.windDirection)}°)
                    </span>
                  </div>

                  {/* Metric 4: Surface Sea Temp */}
                  <div className="bg-black/30 border border-white/10 rounded-xl p-3 flex flex-col justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                      <Thermometer className="w-3.5 h-3.5 text-rose-400" /> Suhu Air Laut
                    </span>
                    <div className="my-1.5">
                      <span className="text-3xl font-black text-rose-300 font-mono">
                        {weatherData.current.surfaceTemp.toFixed(1)}
                      </span>
                      <span className="text-sm text-rose-400 font-bold ml-1">°C</span>
                    </div>
                    <span className="text-[10px] text-slate-400">Permukaan laut</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* 4. 3-Day Daily Forecast Overview */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyan-400" />
              Prakiraan 3 Hari ke Depan
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {weatherData.daily.map((day, idx) => {
                const dateObj = new Date(day.date);
                const dayName = dateObj.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' });
                const risk = getRiskBadge(day.safetyRisk);

                return (
                  <div key={day.date} className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white">
                        {idx === 0 ? 'Hari Ini' : dayName}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-black ${risk.badge}`}>
                        {day.safetyRisk.toUpperCase()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs py-1">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Maks Gelombang</span>
                        <span className="text-base font-bold text-cyan-300 font-mono">
                          {day.maxWaveHeight.toFixed(1)} m
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">Kecepatan Angin</span>
                        <span className="text-base font-bold text-amber-400 font-mono">
                          {Math.round(day.avgWindSpeed)} knot
                        </span>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-400 border-t border-slate-800/80 pt-1 flex items-center justify-between">
                      <span>Arah Ombak: {degToCardinal(day.dominantWaveDirection)}</span>
                      <span>Angin: {degToCardinal(day.dominantWindDirection)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
