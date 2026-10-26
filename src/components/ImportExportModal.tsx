import React, { useState, useRef } from 'react';
import { Waypoint } from '../types';
import {
  X,
  Download,
  Upload,
  FileText,
  AlertCircle,
  CheckCircle2,
  Share2,
} from 'lucide-react';
import {
  exportWaypointsToJSON,
  exportWaypointsToGPX,
  exportWaypointsToGeoJSON,
  downloadFile,
  parseImportFile,
  DuplicateStrategy,
} from '../services/ImportExportManager';

interface ImportExportModalProps {
  isOpen: boolean;
  waypoints: Waypoint[];
  onImportComplete: (importedWaypoints: Waypoint[]) => void;
  onClose: () => void;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  waypoints,
  onImportComplete,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [exportFormat, setExportFormat] = useState<'gpx' | 'geojson' | 'json'>('gpx');

  // Import state
  const [duplicateStrategy, setDuplicateStrategy] = useState<DuplicateStrategy>('skip');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedWaypoints, setParsedWaypoints] = useState<Waypoint[] | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleExport = () => {
    const timestamp = new Date().toISOString().slice(0, 10);
    if (exportFormat === 'gpx') {
      const content = exportWaypointsToGPX(waypoints);
      downloadFile(content, `NavigasiLautSR_Titik_${timestamp}.gpx`, 'application/gpx+xml');
    } else if (exportFormat === 'geojson') {
      const content = exportWaypointsToGeoJSON(waypoints);
      downloadFile(content, `NavigasiLautSR_Titik_${timestamp}.geojson`, 'application/geo+json');
    } else {
      const content = exportWaypointsToJSON(waypoints);
      downloadFile(content, `NavigasiLautSR_Titik_${timestamp}.json`, 'application/json');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setImportError(null);
    setImportStatus(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const wps = parseImportFile(text, file.name);
        if (wps.length === 0) {
          setImportError('Tidak ditemukan titik koordinat yang valid di dalam file ini.');
          setParsedWaypoints(null);
        } else {
          setParsedWaypoints(wps);
        }
      } catch (err: any) {
        setImportError(err.message || 'Gagal membaca format file.');
        setParsedWaypoints(null);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = () => {
    if (!parsedWaypoints || parsedWaypoints.length === 0) return;

    const existingMap = new Map(waypoints.map((w) => [w.name.toLowerCase().trim(), w]));
    const resultMap = new Map(waypoints.map((w) => [w.id, w]));

    let addedCount = 0;
    let overwrittenCount = 0;
    let skippedCount = 0;

    for (const incoming of parsedWaypoints) {
      const key = incoming.name.toLowerCase().trim();
      const existing = existingMap.get(key);

      if (existing) {
        if (duplicateStrategy === 'skip') {
          skippedCount++;
          continue;
        } else if (duplicateStrategy === 'overwrite') {
          resultMap.set(existing.id, {
            ...incoming,
            id: existing.id,
            updatedAt: Date.now(),
          });
          overwrittenCount++;
        } else {
          // create_new
          const newId = `wp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          resultMap.set(newId, {
            ...incoming,
            id: newId,
            name: `${incoming.name} (Salinan)`,
            updatedAt: Date.now(),
          });
          addedCount++;
        }
      } else {
        resultMap.set(incoming.id, incoming);
        addedCount++;
      }
    }

    const finalWaypoints = Array.from(resultMap.values());
    onImportComplete(finalWaypoints);

    setImportStatus(
      `Berhasil mengimpor! ${addedCount} titik baru ditambahkan, ${overwrittenCount} ditimpa, ${skippedCount} dilewati.`
    );
    setTimeout(() => {
      onClose();
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-[1200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 bg-slate-850 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white">Ekspor & Impor Titik Navigasi</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-950 border-b border-slate-800">
          <button
            onClick={() => setActiveTab('export')}
            className={`py-2 text-xs font-bold rounded-xl transition ${
              activeTab === 'export' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Ekspor Titik ({waypoints.length})
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`py-2 text-xs font-bold rounded-xl transition ${
              activeTab === 'import' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Impor File Titik
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 space-y-4 text-xs text-slate-300">
          {activeTab === 'export' ? (
            <div className="space-y-4">
              <p className="text-slate-400 text-xs leading-relaxed">
                Simpan seluruh titik koordinat rumpon dan lokasi memancing Anda ke dalam file agar dapat dipindahkan ke HP nelayan lain tanpa perlu koneksi internet.
              </p>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Pilih Format File
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setExportFormat('gpx')}
                    className={`p-3 rounded-xl border text-center font-bold text-xs transition ${
                      exportFormat === 'gpx'
                        ? 'bg-cyan-600/30 border-cyan-400 text-cyan-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'
                    }`}
                  >
                    GPX 1.1
                    <span className="block text-[10px] font-normal text-slate-400 mt-0.5">
                      Standar GPS Maritim
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExportFormat('geojson')}
                    className={`p-3 rounded-xl border text-center font-bold text-xs transition ${
                      exportFormat === 'geojson'
                        ? 'bg-cyan-600/30 border-cyan-400 text-cyan-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'
                    }`}
                  >
                    GeoJSON
                    <span className="block text-[10px] font-normal text-slate-400 mt-0.5">
                      Peta Digital GIS
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExportFormat('json')}
                    className={`p-3 rounded-xl border text-center font-bold text-xs transition ${
                      exportFormat === 'json'
                        ? 'bg-cyan-600/30 border-cyan-400 text-cyan-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'
                    }`}
                  >
                    JSON
                    <span className="block text-[10px] font-normal text-slate-400 mt-0.5">
                      Cadangan Lengkap SR
                    </span>
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={handleExport}
                disabled={waypoints.length === 0}
                className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/20 active:scale-95 transition"
              >
                <Download className="w-5 h-5" />
                <span>Unduh File Titik ({waypoints.length} Titik)</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-slate-400 text-xs leading-relaxed">
                Pilih file berformat <strong>.gpx</strong>, <strong>.geojson</strong>, atau <strong>.json</strong> dari penyimpanan perangkat HP Anda.
              </p>

              <input
                type="file"
                ref={fileInputRef}
                accept=".gpx,.geojson,.json"
                onChange={handleFileChange}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-5 border-2 border-dashed border-slate-700 rounded-xl hover:border-cyan-400 bg-slate-800/40 flex flex-col items-center justify-center gap-2 text-slate-300 hover:text-cyan-300 transition"
              >
                <Upload className="w-6 h-6 text-cyan-400" />
                <span className="font-bold text-xs">
                  {selectedFile ? selectedFile.name : 'Pilih Berkas dari HP'}
                </span>
                <span className="text-[10px] text-slate-500">Mendukung file GPX, GeoJSON, atau JSON</span>
              </button>

              {parsedWaypoints && (
                <div className="p-3 bg-cyan-950/40 border border-cyan-500/40 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-cyan-400" />
                    <div>
                      <div className="font-bold text-white text-xs">
                        Ditemukan {parsedWaypoints.length} Titik Valid
                      </div>
                      <div className="text-[10px] text-cyan-300">Siap dimasukkan ke Titik Saya</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Duplicate Strategy Option */}
              {parsedWaypoints && (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Jika Ada Titik yang Namanya Sama:
                  </label>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/60 border border-slate-700 cursor-pointer text-xs">
                      <input
                        type="radio"
                        name="dupStrategy"
                        value="skip"
                        checked={duplicateStrategy === 'skip'}
                        onChange={() => setDuplicateStrategy('skip')}
                        className="text-cyan-500"
                      />
                      <span><strong>Lewati (Aman):</strong> Jangan ganti titik yang sudah ada</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/60 border border-slate-700 cursor-pointer text-xs">
                      <input
                        type="radio"
                        name="dupStrategy"
                        value="overwrite"
                        checked={duplicateStrategy === 'overwrite'}
                        onChange={() => setDuplicateStrategy('overwrite')}
                        className="text-cyan-500"
                      />
                      <span><strong>Timpa:</strong> Perbarui data titik lama dengan data baru</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/60 border border-slate-700 cursor-pointer text-xs">
                      <input
                        type="radio"
                        name="dupStrategy"
                        value="create_new"
                        checked={duplicateStrategy === 'create_new'}
                        onChange={() => setDuplicateStrategy('create_new')}
                        className="text-cyan-500"
                      />
                      <span><strong>Simpan Semua:</strong> Buat sebagai titik salinan baru</span>
                    </label>
                  </div>
                </div>
              )}

              {importError && (
                <div className="p-3 bg-rose-950/80 border border-rose-500 rounded-xl flex items-center gap-2 text-rose-300 text-xs">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {importStatus && (
                <div className="p-3 bg-emerald-950/80 border border-emerald-500 rounded-xl flex items-center gap-2 text-emerald-300 text-xs">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span>{importStatus}</span>
                </div>
              )}

              {parsedWaypoints && (
                <button
                  type="button"
                  onClick={handleExecuteImport}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95 transition"
                >
                  <Upload className="w-4 h-4" />
                  <span>Mulai Impor Sekarang</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
