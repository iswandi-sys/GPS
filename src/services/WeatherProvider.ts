import { MarineWeatherForecast, MarineWeatherHourly } from '../types';
import { getWeatherCache, saveWeatherCache } from './db';

export interface WeatherPresetRegion {
  id: string;
  name: string;
  description: string;
  lat: number;
  lng: number;
}

export const PRESET_REGIONS: WeatherPresetRegion[] = [
  {
    id: 'selat_makassar',
    name: 'Selat Makassar',
    description: 'Perairan Spermonde, Parepare s/d Majene',
    lat: -4.50,
    lng: 118.90,
  },
  {
    id: 'teluk_bone',
    name: 'Teluk Bone',
    description: 'Perairan Sinjai, Bajoe s/d Kolaka',
    lat: -3.80,
    lng: 120.80,
  },
  {
    id: 'laut_flores',
    name: 'Laut Flores & Selayar',
    description: 'Kepulauan Selayar, Takabonerate s/d Flores',
    lat: -6.80,
    lng: 121.20,
  },
  {
    id: 'laut_banda',
    name: 'Laut Banda & Wakatobi',
    description: 'Taman Nasional Wakatobi, Baubau s/d Kendari',
    lat: -5.30,
    lng: 123.60,
  },
  {
    id: 'laut_sawu',
    name: 'Laut Sawu & NTT',
    description: 'Kupang, Rote, Sabu s/d Sumba & Ende',
    lat: -9.50,
    lng: 122.50,
  },
  {
    id: 'selat_lombok',
    name: 'Selat Lombok & Sumbawa',
    description: 'Penyeberangan Padangbai, Lembar s/d Alas',
    lat: -8.60,
    lng: 116.00,
  },
  {
    id: 'teluk_tomini',
    name: 'Teluk Tomini & Gorontalo',
    description: 'Kepulauan Togean, Luwuk s/d Gorontalo',
    lat: -0.40,
    lng: 122.20,
  },
];

function evaluateWaveSafety(waveHeight: number): {
  risk: 'tenang' | 'rendah' | 'sedang' | 'tinggi' | 'sangat_berbahaya';
  message: string;
} {
  if (waveHeight <= 0.5) {
    return {
      risk: 'tenang',
      message: 'Kondisi laut tenang. Sangat aman untuk perahu kecil, jolloro, dan katir.',
    };
  } else if (waveHeight <= 1.25) {
    return {
      risk: 'rendah',
      message: 'Gelombang rendah. Aman untuk pelayaran perahu nelayan tradisional.',
    };
  } else if (waveHeight <= 2.5) {
    return {
      risk: 'sedang',
      message: 'Waspada gelombang sedang. Berisiko untuk perahu katir cadik kecil.',
    };
  } else if (waveHeight <= 4.0) {
    return {
      risk: 'tinggi',
      message: 'Peringatan Bahaya! Gelombang tinggi, sangat berisiko bagi kapal nelayan.',
    };
  } else {
    return {
      risk: 'sangat_berbahaya',
      message: 'BAHAYA EKSTREM! Gelombang sangat tinggi. Dilarang keras melaut!',
    };
  }
}

export async function fetchMarineWeather(
  lat: number,
  lng: number,
  regionName: string,
  forceRefresh = false
): Promise<MarineWeatherForecast> {
  const regionKey = `marine_${lat.toFixed(2)}_${lng.toFixed(2)}`;

  // 1. Check local cache first unless force refresh
  if (!forceRefresh) {
    const cached = await getWeatherCache(regionKey);
    if (cached) {
      // If cached data is less than 3 hours old, return it
      const ageHours = (Date.now() - cached.updatedAt) / (1000 * 60 * 60);
      if (ageHours < 3) {
        return {
          ...cached,
          isCached: true,
        };
      }
    }
  }

  // 2. Fetch fresh data from Open-Meteo Marine & Weather API
  try {
    const marineUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}&hourly=wave_height,wave_direction,wave_period&daily=wave_height_max,wave_direction_dominant&timezone=Asia%2FMakassar&forecast_days=4`;
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m,weather_code&daily=wind_speed_10m_max,wind_direction_10m_dominant&wind_speed_unit=kn&timezone=Asia%2FMakassar&forecast_days=4`;

    const [marineRes, weatherRes] = await Promise.all([
      fetch(marineUrl),
      fetch(weatherUrl),
    ]);

    if (!marineRes.ok || !weatherRes.ok) {
      throw new Error('Gagal menghubungi satelit cuaca Open-Meteo.');
    }

    const marineData = await marineRes.json();
    const weatherData = await weatherRes.json();

    const hourlyList: MarineWeatherHourly[] = [];
    const marineHours = marineData.hourly?.time || [];
    const marineWaveHeight = marineData.hourly?.wave_height || [];
    const marineWaveDir = marineData.hourly?.wave_direction || [];
    const marineWavePeriod = marineData.hourly?.wave_period || [];
    const windSpeed = weatherData.hourly?.wind_speed_10m || [];
    const windDir = weatherData.hourly?.wind_direction_10m || [];
    const windGusts = weatherData.hourly?.wind_gusts_10m || [];

    const totalHours = Math.min(marineHours.length, 72); // 3 days (72 hours)
    for (let i = 0; i < totalHours; i++) {
      hourlyList.push({
        time: marineHours[i],
        waveHeight: marineWaveHeight[i] ?? 0.8,
        waveDirection: marineWaveDir[i] ?? 180,
        wavePeriod: marineWavePeriod[i] ?? 6,
        windSpeed: windSpeed[i] ?? 10,
        windDirection: windDir[i] ?? 120,
        windGusts: windGusts[i] ?? 14,
        surfaceTemp: 29.5, // Tropical waters of Indonesia
      });
    }

    // Determine current conditions (first hour or nearest hour)
    const currentHour = hourlyList[0] || {
      waveHeight: 0.8,
      waveDirection: 180,
      wavePeriod: 6,
      windSpeed: 10,
      windDirection: 120,
      surfaceTemp: 29.5,
    };

    const safety = evaluateWaveSafety(currentHour.waveHeight);

    const dailySummary = (marineData.daily?.time || []).slice(0, 4).map((d: string, idx: number) => {
      const maxWave = marineData.daily?.wave_height_max?.[idx] ?? 1.0;
      const avgWind = weatherData.daily?.wind_speed_10m_max?.[idx] ?? 12;
      const waveDir = marineData.daily?.wave_direction_dominant?.[idx] ?? 180;
      const windD = weatherData.daily?.wind_direction_10m_dominant?.[idx] ?? 120;
      const daySafety = evaluateWaveSafety(maxWave);
      return {
        date: d,
        maxWaveHeight: maxWave,
        avgWindSpeed: avgWind,
        dominantWaveDirection: waveDir,
        dominantWindDirection: windD,
        safetyRisk: daySafety.risk,
      };
    });

    const forecastResult: MarineWeatherForecast = {
      regionName,
      lat,
      lng,
      current: {
        waveHeight: currentHour.waveHeight,
        waveDirection: currentHour.waveDirection,
        wavePeriod: currentHour.wavePeriod,
        windSpeed: currentHour.windSpeed,
        windDirection: currentHour.windDirection,
        surfaceTemp: currentHour.surfaceTemp,
        safetyRisk: safety.risk,
        safetyMessage: safety.message,
        weatherCodeDescription: getWeatherDescription(weatherData.hourly?.weather_code?.[0] ?? 0),
      },
      daily: dailySummary,
      hourly: hourlyList,
      updatedAt: Date.now(),
      isCached: false,
    };

    // Save to IndexedDB cache
    await saveWeatherCache(regionKey, forecastResult);
    return forecastResult;
  } catch (err) {
    // If network fails (e.g. at sea with no signal), try to get from offline cache even if older
    const cached = await getWeatherCache(regionKey);
    if (cached) {
      return {
        ...cached,
        isCached: true,
      };
    }
    throw new Error('Koneksi internet tidak tersedia dan belum ada data prakiraan cuaca yang tersimpan offline untuk koordinat ini.');
  }
}

function getWeatherDescription(code: number): string {
  switch (code) {
    case 0: return 'Cerah Berawan';
    case 1:
    case 2: return 'Sebagian Berawan';
    case 3: return 'Berawan Tebal';
    case 45:
    case 48: return 'Berkabut';
    case 51:
    case 53:
    case 55: return 'Gerimis Ringan';
    case 61:
    case 63:
    case 65: return 'Hujan Maritim';
    case 80:
    case 81:
    case 82: return 'Hujan Deras Lokal';
    case 95:
    case 96: return 'Badai Petir Laut';
    default: return 'Cerah Berawan';
  }
}

export function degToCardinal(deg: number): string {
  const normalized = ((deg % 360) + 360) % 360;
  const directions = ['U', 'TL', 'T', 'TG', 'S', 'BD', 'B', 'BL'];
  const index = Math.round(normalized / 45) % 8;
  return directions[index];
}
