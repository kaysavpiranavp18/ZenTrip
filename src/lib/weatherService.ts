import { WeatherForecast } from '@/types';

const OPENWEATHER_BASE = 'https://api.openweathermap.org/data/2.5/forecast';

function normalizeCondition(main: string): 'sunny' | 'cloudy' | 'rainy' | 'stormy' | 'snowy' {
  const lower = main.toLowerCase();
  if (lower.includes('rain')) return 'rainy';
  if (lower.includes('storm') || lower.includes('thunder')) return 'stormy';
  if (lower.includes('snow')) return 'snowy';
  if (lower.includes('cloud')) return 'cloudy';
  return 'sunny';
}

function toAdvisory(condition: WeatherForecast['condition'], precipitation: number): string {
  if (condition === 'stormy') return 'High storm risk. Shift outdoor plans to indoor backups.';
  if (condition === 'rainy' || precipitation > 60) return 'Rain likely. Keep indoor alternatives ready.';
  if (condition === 'snowy') return 'Cold and snow conditions expected. Plan warm layers and transport buffers.';
  return 'Weather is favorable for outdoor activities.';
}

function buildFallback(city: string): WeatherForecast[] {
  const now = new Date();
  return Array.from({ length: 5 }).map((_, index) => {
    const date = new Date(now);
    date.setDate(date.getDate() + index);
    return {
      date: date.toISOString().split('T')[0],
      condition: 'cloudy',
      tempHigh: 28,
      tempLow: 22,
      humidity: 70,
      windSpeed: 12,
      precipitation: 30,
      advisory: `Live weather unavailable for ${city}. Showing estimated outlook.`,
    };
  });
}

export async function fetchWeatherForCity(city: string): Promise<{ city: string; source: string; forecasts: WeatherForecast[] }> {
  try {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      return { city, source: 'fallback', forecasts: buildFallback(city) };
    }

    const response = await fetch(
      `${OPENWEATHER_BASE}?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`,
      // Bound the weather call — an unbounded fetch here stalls the whole
      // orchestration graph until the global timeout fires.
      { cache: 'no-store', signal: AbortSignal.timeout(8000) }
    );

    if (!response.ok) {
      return { city, source: 'fallback', forecasts: buildFallback(city) };
    }

    const payload = (await response.json()) as {
      list?: Array<{
        dt_txt: string;
        main: { temp_max: number; temp_min: number; humidity: number };
        weather: Array<{ main: string }>;
        wind: { speed: number };
        pop?: number;
      }>;
    };

    const grouped = new Map<string, WeatherForecast[]>();

    for (const item of payload.list || []) {
      const date = item.dt_txt.split(' ')[0];
      const condition = normalizeCondition(item.weather?.[0]?.main || 'clear');
      const precipitation = Math.round((item.pop || 0) * 100);
      const point: WeatherForecast = {
        date,
        condition,
        tempHigh: Math.round(item.main.temp_max),
        tempLow: Math.round(item.main.temp_min),
        humidity: Math.round(item.main.humidity),
        windSpeed: Math.round(item.wind.speed * 3.6),
        precipitation,
        advisory: toAdvisory(condition, precipitation),
      };

      if (!grouped.has(date)) grouped.set(date, []);
      grouped.get(date)?.push(point);
    }

    const forecasts = [...grouped.values()]
      .slice(0, 5)
      .map((points) => {
        // Guard against malformed payloads with empty per-day groups
        if (points.length === 0) return buildFallback(city)[0];
        const base = points[0];
        const maxTemp = Math.max(...points.map((p) => p.tempHigh));
        const minTemp = Math.min(...points.map((p) => p.tempLow));
        const maxPrecip = Math.max(...points.map((p) => p.precipitation));
        const wind = Math.max(...points.map((p) => p.windSpeed));
        const humidity = Math.round(points.reduce((sum, p) => sum + p.humidity, 0) / points.length);

        return {
          ...base,
          tempHigh: maxTemp,
          tempLow: minTemp,
          precipitation: maxPrecip,
          windSpeed: wind,
          humidity,
          advisory: toAdvisory(base.condition, maxPrecip),
        };
      });

    return { city, source: 'openweather', forecasts };
  } catch (error) {
    return { city, source: 'fallback', forecasts: buildFallback(city) };
  }
}
