/**
 * SafeParking API service
 */
import { BACKEND_BASE_URL } from '../config/keys';

const API_BASE = BACKEND_BASE_URL;

export async function getDirections(origin, destination, options = {}) {
  const params = new URLSearchParams({
    originLat: String(origin.lat),
    originLng: String(origin.lng),
    destinationLat: String(destination.lat),
    destinationLng: String(destination.lng),
    priority: options.priority || 'RECOMMEND',
  });

  const url = `${API_BASE}/api/directions?${params}`;
  const response = await fetch(url);
  if (!response.ok) {
    let body = null;
    let rawText = null;
    try {
      body = await response.json();
    } catch (jsonError) {
      try {
        rawText = await response.text();
      } catch (_) {
        rawText = null;
      }
    }

    const code =
      body?.errorCode ||
      body?.code ||
      body?.status ||
      body?.result_code ||
      `HTTP_${response.status}`;
    const message =
      body?.message ||
      body?.error ||
      body?.result_msg ||
      rawText ||
      `길찾기 실패 (HTTP ${response.status})`;

    const error = new Error(message);
    error.code = code;
    error.httpStatus = response.status;
    error.details = body;
    error.requestUrl = url;
    throw error;
  }
  return response.json();
}

export async function getParkingLots(region = null, subRegion = null) {
  const params = new URLSearchParams({
    page: '1',
    perPage: '1000',
  });

  if (region) params.append('region', region);
  if (subRegion) params.append('subRegion', subRegion);

  const response = await fetch(`${API_BASE}/api/parking-lots?${params}`);
  if (!response.ok) throw new Error('주차장 조회 실패');
  return response.json();
}

export async function findNearbyParkingLots(lat, lng, radiusKm = 1) {
  try {
    const params = new URLSearchParams({
      lat: String(lat),
      lng: String(lng),
      radiusKm: String(radiusKm),
      region: '서울특별시',
    });

    const response = await fetch(`${API_BASE}/api/parking-lots/nearby?${params}`);
    if (!response.ok) throw new Error('주변 주차장 검색 실패');
    return response.json();
  } catch (error) {
    console.error('주변 주차장 검색 오류:', error);
    return [];
  }
}

export async function searchPlaces(keyword, lat, lng) {
  try {
    const params = new URLSearchParams({
      keyword,
    });

    if (lat && lng) {
      params.append('lat', String(lat));
      params.append('lng', String(lng));
    }

    const response = await fetch(`${API_BASE}/api/places/search?${params}`);
    if (!response.ok) throw new Error('장소 검색 실패');
    return response.json();
  } catch (error) {
    console.error('장소 검색 오류:', error);
    return [];
  }
}

let parkingCache = null;
export async function searchParkingByName(keyword) {
  try {
    if (!parkingCache) {
      parkingCache = await getParkingLots('서울특별시');
    }
    const kw = keyword.toLowerCase();
    return parkingCache
      .filter(lot => lot.name.toLowerCase().includes(kw) || (lot.address && lot.address.toLowerCase().includes(kw)))
      .slice(0, 15)
      .map(lot => ({ ...lot, type: 'parking' }));
  } catch (error) {
    console.error('주차장 검색 오류:', error);
    return [];
  }
}

export function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

export function formatDuration(seconds) {
  const mins = Math.round(seconds / 60);
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return hours > 0 ? `${hours}시간 ${remainMins}분` : `${remainMins}분`;
}
