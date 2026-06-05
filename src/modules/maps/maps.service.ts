import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type GeocodeResult = {
  latitude: number;
  longitude: number;
  formattedAddress?: string;
} | null;

@Injectable()
export class MapsService {
  constructor(private readonly configService: ConfigService) {}

  async geocodeAddress(address: string): Promise<GeocodeResult> {
    const key = this.googleMapsApiKey();
    if (!key || !address.trim()) return null;
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('address', address);
    url.searchParams.set('key', key);
    return this.fetchGoogleGeocode(url);
  }

  async reverseGeocode(
    latitude: number,
    longitude: number,
  ): Promise<GeocodeResult> {
    const key = this.googleMapsApiKey();
    if (!key || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('latlng', `${latitude},${longitude}`);
    url.searchParams.set('key', key);
    return this.fetchGoogleGeocode(url);
  }

  distanceKm(
    lat1Value: unknown,
    lon1Value: unknown,
    lat2Value: unknown,
    lon2Value: unknown,
  ) {
    const lat1 = Number(lat1Value);
    const lon1 = Number(lon1Value);
    const lat2 = Number(lat2Value);
    const lon2 = Number(lon2Value);
    if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) {
      return Number.POSITIVE_INFINITY;
    }
    const toRadians = (value: number) => (value * Math.PI) / 180;
    const earthRadiusKm = 6371;
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private googleMapsApiKey() {
    return this.configService.get<string>('GOOGLE_MAPS_API_KEY')?.trim();
  }

  private async fetchGoogleGeocode(url: URL): Promise<GeocodeResult> {
    const timeoutMs = this.configService.get<number>(
      'GOOGLE_MAPS_TIMEOUT_MS',
      2500,
    );
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) return null;
      const body = (await response.json()) as {
        status?: string;
        results?: Array<{
          formatted_address?: string;
          geometry?: { location?: { lat?: number; lng?: number } };
        }>;
      };
      const first = body.status === 'OK' ? body.results?.[0] : undefined;
      const location = first?.geometry?.location;
      if (
        !location ||
        !Number.isFinite(location.lat) ||
        !Number.isFinite(location.lng)
      ) {
        return null;
      }
      return {
        latitude: Number(location.lat),
        longitude: Number(location.lng),
        formattedAddress: first?.formatted_address,
      };
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }
}
