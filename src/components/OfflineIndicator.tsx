import React, { useEffect, useState } from 'react';
import { WifiOff, Radio } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[1100] flex items-center gap-2 rounded-xl bg-amber-600/95 border border-amber-400 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xl backdrop-blur-md">
      <WifiOff className="h-4 w-4 shrink-0 animate-pulse" />
      <span>Mode Offline (Tanpa Internet) — Navigasi GPS & Peta Lokal Aktif</span>
    </div>
  );
};
