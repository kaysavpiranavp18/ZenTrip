export interface WeatherForecastItem {
  date: string;
  condition: 'sunny' | 'cloudy' | 'rainy' | 'stormy' | 'snowy';
  tempHigh: number;
  tempLow: number;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  advisory: string;
}

export async function fetchWeatherForecast(city: string) {
  const response = await fetch(`/api/weather?city=${encodeURIComponent(city)}`, { cache: 'no-store' });
  const payload = await response.json();
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error || 'Failed to fetch weather');
  }

  return payload.data as {
    city: string;
    source: string;
    forecasts: WeatherForecastItem[];
  };
}
