import { NextRequest, NextResponse } from 'next/server';
import { fetchWeatherForCity } from '@/lib/weatherService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city');

    if (!city) {
      return NextResponse.json({ success: false, error: 'city query parameter is required' }, { status: 400 });
    }

    const data = await fetchWeatherForCity(city);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch weather' }, { status: 500 });
  }
}
