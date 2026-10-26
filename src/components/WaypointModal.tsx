import React, { useState, useEffect, useRef } from 'react';
import { Waypoint, WaypointCategory, CoordinateFormat, NavPosition } from '../types';
import { CATEGORY_INFO } from './MarineIcons';
import {
  X,
  Camera,
  Trash2,
  MapPin,
  Compass,
  AlertCircle,
  Upload,
  Check,
} from 'lucide-react';
import {
  decimalToDMS,
  dmsToDecimal,
  formatDMS,
  formatCoordinates,
  parseCoordinateInput,
} from '../services/CoordinateConverter';

interface WaypointModalProps {
  isOpen: boolean;
  waypointToEdit: Waypoint | null;
  currentGpsPosition: NavPosition | null;
  coordinateFormat: CoordinateFormat;
  onSave: (waypoint: Waypoint) => void;
  onClose: () => void;
  onDelete?: (id: string) => void;
}

export const WaypointModal: React.FC<WaypointModalProps> = ({
  isOpen,
  waypointToEdit,
  currentGpsPosition,
  coordinateFormat,
  onSave,
  onClose,
  onDelete,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<WaypointCategory>('rumpon');
  const [notes, setNotes] = useState('');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | undefined>(undefined);

  // Coordinates state
  const [inputMode, setInputMode] = useState<'GPS' | 'DD' | 'DMS'>('GPS');
  const [lat, setLat] = useState<number>(-5.12);
  const [lng, setLng] = useState<number>(119.42);

  // DMS input fields
  const [latDeg, setLatDeg] = useState(5);
  const [latMin, setLatMin] = useState(7);
  const [latSec, setLatSec] = useState(12.0);
  const [latDir, setLatDir] = useState<'N' | 'S'>('S');

  const [lngDeg, setLngDeg] = useState(119);
  const [lngMin, setLngMin] = useState(25);
  const [lngSec, setLngSec] = useState(30.0);
  const [lngDir, setLngDir] = useState<'E' | 'W'>('E');

  const [coordError, setCoordError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (waypointToEdit) {
      setName(waypointToEdit.name);
      setCategory(waypointToEdit.category);
      setNotes(waypointToEdit.notes || '');
      setPhotoDataUrl(waypointToEdit.photoDataUrl);
      setLat(waypointToEdit.lat);
      setLng(waypointToEdit.lng);
      setInputMode('DD');

      const dmsLat = decimalToDMS(waypointToEdit.lat, true);
      const dmsLng = decimalToDMS(waypointToEdit.lng, false);

      setLatDeg(dmsLat.degrees);
      setLatMin(dmsLat.minutes);
      setLatSec(dmsLat.seconds);
      setLatDir(dmsLat.direction as 'N' | 'S');

      setLngDeg(dmsLng.degrees);
      setLngMin(dmsLng.minutes);
      setLngSec(dmsLng.seconds);
      setLngDir(dmsLng.direction as 'E' | 'W');
    } else {
      // Default: Use current vessel GPS if available
      if (currentGpsPosition) {
        setLat(currentGpsPosition.lat);
        setLng(currentGpsPosition.lng);
        setInputMode('GPS');

        const dmsLat = decimalToDMS(currentGpsPosition.lat, true);
        const dmsLng = decimalToDMS(currentGpsPosition.lng, false);
        setLatDeg(dmsLat.degrees);
        setLatMin(dmsLat.minutes);
        setLatSec(dmsLat.seconds);
        setLatDir(dmsLat.direction as 'N' | 'S');

        setLngDeg(dmsLng.degrees);
        setLngMin(dmsLng.minutes);
        setLngSec(dmsLng.seconds);
        setLngDir(dmsLng.direction as 'E' | 'W');
      } else {
        setLat(-5.12);
        setLng(119.42);
        setInputMode('DD');
      }
      setName('');
      setCategory('rumpon');
      setNotes('');
      setPhotoDataUrl(undefined);
    }
    setCoordError('');
  }, [waypointToEdit, currentGpsPosition, isOpen]);

  if (!isOpen) return null;

  // Handle Photo capture / file select
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoDataUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleApplyGps = () => {
    if (currentGpsPosition) {
      setLat(currentGpsPosition.lat);
      setLng(currentGpsPosition.lng);
      setInputMode('GPS');

      const dmsLat = decimalToDMS(currentGpsPosition.lat, true);
      const dmsLng = decimalToDMS(currentGpsPosition.lng, false);
      setLatDeg(dmsLat.degrees);
      setLatMin(dmsLat.minutes);
      setLatSec(dmsLat.seconds);
      setLatDir(dmsLat.direction as 'N' | 'S');

      setLngDeg(dmsLng.degrees);
      setLngMin(dmsLng.minutes);
      setLngSec(dmsLng.seconds);
      setLngDir(dmsLng.direction as 'E' | 'W');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setCoordError('Silakan masukkan nama titik navigasi.');
      return;
    }

    let finalLat = lat;
    let finalLng = lng;

    if (inputMode === 'DMS') {
      finalLat = dmsToDecimal({ degrees: latDeg, minutes: latMin, seconds: latSec, direction: latDir });
      finalLng = dmsToDecimal({ degrees: lngDeg, minutes: lngMin, seconds: lngSec, direction: lngDir });
    }

    if (isNaN(finalLat) || isNaN(finalLng) || finalLat < -90 || finalLat > 90 || finalLng < -180 || finalLng > 180) {
      setCoordError('Koordinat tidak valid. Periksa kembali nilai Lintang dan Bujur.');
      return;
    }

    const saved: Waypoint = {
      id: waypointToEdit ? waypointToEdit.id : `wp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      category,
      lat: finalLat,
      lng: finalLng,
      notes: notes.trim(),
      photoDataUrl,
      createdAt: waypointToEdit ? waypointToEdit.createdAt : Date.now(),
      updatedAt: Date.now(),
    };

    onSave(saved);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[1200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 bg-slate-850 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-amber-400" />
            <h2 className="text-base sm:text-lg font-bold text-white">
              {waypointToEdit ? 'Ubah Titik Navigasi' : 'Tambah Titik Navigasi Baru'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-4 text-sm text-slate-200">
          {/* Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Nama Titik / Rumpon <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Rumpon Tuna Paotere 01"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-medium focus:outline-none focus:border-cyan-400 text-sm"
            />
          </div>

          {/* Category Picker */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Kategori Titik Laut
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(Object.keys(CATEGORY_INFO) as WaypointCategory[]).map((cat) => {
                const info = CATEGORY_INFO[cat];
                const isSelected = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-semibold text-left transition ${
                      isSelected
                        ? `${info.bg} ${info.border} ${info.color} ring-2 ring-cyan-400/50`
                        : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-base">{info.iconEmoji}</span>
                    <span className="truncate">{info.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Coordinate Entry Method Selector */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Posisi Koordinat
              </span>

              <div className="flex rounded-lg bg-slate-800 p-0.5 border border-slate-700">
                <button
                  type="button"
                  onClick={handleApplyGps}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold transition ${
                    inputMode === 'GPS' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  GPS Kapal
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('DD')}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold transition ${
                    inputMode === 'DD' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  DD (Desimal)
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('DMS')}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold transition ${
                    inputMode === 'DMS' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  DMS (Derajat Menit)
                </button>
              </div>
            </div>

            {/* Mode 1: GPS Live Position */}
            {inputMode === 'GPS' && (
              <div className="p-3 bg-cyan-950/30 border border-cyan-500/30 rounded-lg text-cyan-200 text-xs">
                <div className="flex items-center justify-between font-mono font-bold text-sm">
                  <span>{formatCoordinates(lat, lng, 'DMS')}</span>
                </div>
                <div className="text-[11px] text-cyan-400 mt-1">
                  {currentGpsPosition ? 'Menggunakan koordinat satelit GPS kapal saat ini.' : 'Koordinat default perairan.'}
                </div>
              </div>
            )}

            {/* Mode 2: Decimal Degrees (DD) */}
            {inputMode === 'DD' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase block mb-1">
                    Lintang (Latitude: -90 s/d 90)
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={lat}
                    onChange={(e) => setLat(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 font-mono text-white text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase block mb-1">
                    Bujur (Longitude: -180 s/d 180)
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={lng}
                    onChange={(e) => setLng(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 font-mono text-white text-xs"
                  />
                </div>
              </div>
            )}

            {/* Mode 3: DMS Form */}
            {inputMode === 'DMS' && (
              <div className="space-y-2">
                {/* Lat DMS */}
                <div>
                  <label className="text-[10px] text-slate-400 uppercase block mb-1">
                    Lintang (DMS)
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    <input
                      type="number"
                      placeholder="Deg"
                      value={latDeg}
                      onChange={(e) => setLatDeg(parseInt(e.target.value, 10) || 0)}
                      className="bg-slate-800 border border-slate-700 rounded px-2 py-1 font-mono text-xs text-white"
                    />
                    <input
                      type="number"
                      placeholder="Min"
                      value={latMin}
                      onChange={(e) => setLatMin(parseInt(e.target.value, 10) || 0)}
                      className="bg-slate-800 border border-slate-700 rounded px-2 py-1 font-mono text-xs text-white"
                    />
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Sec"
                      value={latSec}
                      onChange={(e) => setLatSec(parseFloat(e.target.value) || 0)}
                      className="bg-slate-800 border border-slate-700 rounded px-2 py-1 font-mono text-xs text-white"
                    />
                    <select
                      value={latDir}
                      onChange={(e) => setLatDir(e.target.value as 'N' | 'S')}
                      className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white font-bold"
                    >
                      <option value="S">S (Selatan)</option>
                      <option value="N">N (Utara)</option>
                    </select>
                  </div>
                </div>

                {/* Lng DMS */}
                <div>
                  <label className="text-[10px] text-slate-400 uppercase block mb-1">
                    Bujur (DMS)
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    <input
                      type="number"
                      placeholder="Deg"
                      value={lngDeg}
                      onChange={(e) => setLngDeg(parseInt(e.target.value, 10) || 0)}
                      className="bg-slate-800 border border-slate-700 rounded px-2 py-1 font-mono text-xs text-white"
                    />
                    <input
                      type="number"
                      placeholder="Min"
                      value={lngMin}
                      onChange={(e) => setLngMin(parseInt(e.target.value, 10) || 0)}
                      className="bg-slate-800 border border-slate-700 rounded px-2 py-1 font-mono text-xs text-white"
                    />
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Sec"
                      value={lngSec}
                      onChange={(e) => setLngSec(parseFloat(e.target.value) || 0)}
                      className="bg-slate-800 border border-slate-700 rounded px-2 py-1 font-mono text-xs text-white"
                    />
                    <select
                      value={lngDir}
                      onChange={(e) => setLngDir(e.target.value as 'E' | 'W')}
                      className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white font-bold"
                    >
                      <option value="E">E (Timur)</option>
                      <option value="W">W (Barat)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Photo Attachment (Stored in IndexedDB) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Foto Rumpon / Penanda Lokasi (Disimpan Offline)
            </label>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              capture="environment"
              onChange={handlePhotoUpload}
              className="hidden"
            />

            {photoDataUrl ? (
              <div className="relative w-full h-36 rounded-xl overflow-hidden border border-slate-700 group">
                <img src={photoDataUrl} alt="Foto Titik" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotoDataUrl(undefined)}
                  className="absolute top-2 right-2 bg-rose-600/90 text-white p-1.5 rounded-lg text-xs font-bold hover:bg-rose-500 transition shadow"
                >
                  Hapus Foto
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-4 px-3 border-2 border-dashed border-slate-700 rounded-xl hover:border-cyan-400 bg-slate-800/40 flex flex-col items-center justify-center gap-1.5 text-slate-400 hover:text-cyan-300 transition"
              >
                <Camera className="w-6 h-6" />
                <span className="text-xs font-medium">Ambil Foto Kamera atau Pilih Berkas</span>
              </button>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Keterangan / Catatan Tambahan
            </label>
            <textarea
              rows={2}
              placeholder="Contoh: Rumpon bambu jangkar 80 meter, ikan cakalang & tongkol sering muncul pagi hari."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-400"
            />
          </div>

          {coordError && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-950/80 border border-rose-500 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{coordError}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            {waypointToEdit && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Yakin ingin menghapus titik "${waypointToEdit.name}"?`)) {
                    onDelete(waypointToEdit.id);
                    onClose();
                  }
                }}
                className="px-3 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-700 text-rose-300 font-bold text-xs flex items-center gap-1.5 transition active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span>Hapus Titik</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition active:scale-95"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-600/30 transition active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>Simpan Titik</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
