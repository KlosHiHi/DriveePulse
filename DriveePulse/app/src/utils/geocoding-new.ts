// Enhanced geocoding utilities with real API support
interface Position {
  lat: number;
  lng: number;
}

interface GeocodeResult {
  name: string;
  address: string;
  coordinates: Position;
  type: 'exact' | 'approximate' | 'fallback';
}

// Extended database of Saint Petersburg locations
const stPetersburgLocations = [
  // City center
  { name: 'Невский проспект', address: 'Невский пр., Санкт-Петербург', coordinates: { lat: 59.9311, lng: 30.3609 } },
  { name: 'Дворцовая площадь', address: 'Дворцовая пл., Санкт-Петербург', coordinates: { lat: 59.9397, lng: 30.3146 } },
  { name: 'Исаакиевская площадь', address: 'Исаакиевская пл., Санкт-Петербург', coordinates: { lat: 59.9342, lng: 30.3062 } },
  { name: 'Казанский собор', address: 'Казанская пл., 2, Санкт-Петербург', coordinates: { lat: 59.9342, lng: 30.3244 } },
  { name: 'Спас на Крови', address: 'наб. канала Грибоедова, 2Б, Санкт-Петербург', coordinates: { lat: 59.9404, lng: 30.3290 } },
  
  // Transport hubs
  { name: 'Московский вокзал', address: 'пл. Восстания, 2, Санкт-Петербург', coordinates: { lat: 59.9306, lng: 30.3606 } },
  { name: 'Финляндский вокзал', address: 'пл. Ленина, 6, Санкт-Петербург', coordinates: { lat: 60.0086, lng: 30.3444 } },
  { name: 'Балтийский вокзал', address: 'наб. Обводного канала, 120, Санкт-Петербург', coordinates: { lat: 59.9083, lng: 30.2833 } },
  { name: 'Аэропорт Пулково', address: 'Пулковское ш., 41, лит. А, Санкт-Петербург', coordinates: { lat: 59.8003, lng: 30.2625 } },
  
  // Metro stations
  { name: 'Площадь Восстания', address: 'пл. Восстания, Санкт-Петербург', coordinates: { lat: 59.9311, lng: 30.3609 } },
  { name: 'Невский проспект (метро)', address: 'Невский пр., 30, Санкт-Петербург', coordinates: { lat: 59.9346, lng: 30.3244 } },
  { name: 'Гостиный двор', address: 'Невский пр., 35, Санкт-Петербург', coordinates: { lat: 59.9342, lng: 30.3244 } },
  { name: 'Садовая', address: 'Садовая ул., Санкт-Петербург', coordinates: { lat: 59.9289, lng: 30.3167 } },
  { name: 'Сенная площадь', address: 'Сенная пл., Санкт-Петербург', coordinates: { lat: 59.9267, lng: 30.3167 } },
  
  // Cultural venues
  { name: 'Эрмитаж', address: 'Дворцовая наб., 34, Санкт-Петербург', coordinates: { lat: 59.9398, lng: 30.3146 } },
  { name: 'Мариинский театр', address: 'Театральная пл., 1, Санкт-Петербург', coordinates: { lat: 59.9263, lng: 30.2954 } },
  { name: 'Русский музей', address: 'Инженерная ул., 4, Санкт-Петербург', coordinates: { lat: 59.9422, lng: 30.3317 } },
  { name: 'Петропавловская крепость', address: 'Петропавловская крепость, Санкт-Петербург', coordinates: { lat: 59.9504, lng: 30.3175 } },
  
  // Shopping and business
  { name: 'Галерея', address: 'Лиговский пр., 30А, Санкт-Петербург', coordinates: { lat: 59.9306, lng: 30.3606 } },
  { name: 'Гранд Каньон', address: 'пр. Энгельса, 154, Санкт-Петербург', coordinates: { lat: 60.0686, lng: 30.4031 } },
  { name: 'Мега Дыбенко', address: 'Мурманское ш., 12А, Санкт-Петербург', coordinates: { lat: 59.9086, lng: 30.4831 } },
  
  // Universities
  { name: 'СПбГУ', address: 'Университетская наб., 7-9, Санкт-Петербург', coordinates: { lat: 59.9406, lng: 30.3097 } },
  { name: 'ИТМО', address: 'Кронверкский пр., 49, Санкт-Петербург', coordinates: { lat: 59.9570, lng: 30.3089 } },
  { name: 'Политех', address: 'ул. Политехническая, 29, Санкт-Петербург', coordinates: { lat: 60.0086, lng: 30.3731 } },
  
  // Districts and areas
  { name: 'Васильевский остров', address: 'Васильевский остров, Санкт-Петербург', coordinates: { lat: 59.9406, lng: 30.2897 } },
  { name: 'Петроградская сторона', address: 'Петроградская сторона, Санкт-Петербург', coordinates: { lat: 59.9664, lng: 30.3139 } },
  { name: 'Выборгская сторона', address: 'Выборгская сторона, Санкт-Петербург', coordinates: { lat: 60.0086, lng: 30.3444 } },
  
  // Streets
  { name: 'Литейный проспект', address: 'Литейный пр., Санкт-Петербург', coordinates: { lat: 59.9461, lng: 30.3506 } },
  { name: 'Каменноостровский проспект', address: 'Каменноостровский пр., Санкт-Петербург', coordinates: { lat: 59.9731, lng: 30.3122 } },
  { name: 'Большой проспект ВО', address: 'Большой пр. В.О., Санкт-Петербург', coordinates: { lat: 59.9433, lng: 30.2736 } },
];

// Fuzzy search function
function fuzzySearch(query: string, text: string): number {
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  
  // Exact match
  if (textLower.includes(queryLower)) {
    return textLower.indexOf(queryLower) === 0 ? 1.0 : 0.8;
  }
  
  // Character matching
  let score = 0;
  let queryIndex = 0;
  
  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      score++;
      queryIndex++;
    }
  }
  
  return score / Math.max(queryLower.length, textLower.length);
}

// Enhanced search with multiple strategies
export async function searchAddresses(query: string): Promise<GeocodeResult[]> {
  if (query.length < 2) return [];
  
  const results: GeocodeResult[] = [];
  
  // 1. Search in local database
  const localResults = stPetersburgLocations
    .map(location => {
      const nameScore = fuzzySearch(query, location.name);
      const addressScore = fuzzySearch(query, location.address);
      const maxScore = Math.max(nameScore, addressScore);
      
      return {
        ...location,
        score: maxScore,
        type: 'exact' as const
      };
    })
    .filter(result => result.score > 0.3)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(result => ({
      name: result.name,
      address: result.address,
      coordinates: result.coordinates,
      type: result.type
    }));
  
  results.push(...localResults);
  
  // 2. Try Nominatim API for broader search
  try {
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?` +
      `format=json&limit=3&countrycodes=ru&` +
      `city=Saint Petersburg&q=${encodeURIComponent(query + ', Санкт-Петербург')}`;
    
    const response = await fetch(nominatimUrl);
    const data = await response.json();
    
    const nominatimResults = data
      .filter((item: any) => item.lat && item.lon)
      .map((item: any) => ({
        name: item.display_name.split(',')[0],
        address: item.display_name,
        coordinates: {
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon)
        },
        type: 'approximate' as const
      }));
    
    results.push(...nominatimResults);
  } catch (error) {
    console.warn('Nominatim API failed:', error);
  }
  
  // 3. Fallback: Generate approximate coordinates for street names
  if (results.length === 0) {
    const fallbackResult = generateFallbackResult(query);
    if (fallbackResult) {
      results.push(fallbackResult);
    }
  }
  
  // Remove duplicates and limit results
  const uniqueResults = results.filter((result, index, arr) => 
    arr.findIndex(r => 
      Math.abs(r.coordinates.lat - result.coordinates.lat) < 0.001 &&
      Math.abs(r.coordinates.lng - result.coordinates.lng) < 0.001
    ) === index
  );
  
  return uniqueResults.slice(0, 8);
}

function generateFallbackResult(query: string): GeocodeResult | null {
  // Common street/location patterns
  const streetPatterns = [
    /проспект|пр\.|проспект/i,
    /улица|ул\.|улица/i,
    /набережная|наб\.|набережная/i,
    /площадь|пл\.|площадь/i,
    /переулок|пер\.|переулок/i
  ];
  
  const isStreet = streetPatterns.some(pattern => pattern.test(query));
  
  if (isStreet) {
    // Generate coordinates within St. Petersburg bounds
    const baseLat = 59.9311 + (Math.random() - 0.5) * 0.1; // ±0.05 degrees
    const baseLng = 30.3609 + (Math.random() - 0.5) * 0.15; // ±0.075 degrees
    
    return {
      name: query,
      address: `${query}, Санкт-Петербург`,
      coordinates: { lat: baseLat, lng: baseLng },
      type: 'fallback'
    };
  }
  
  return null;
}

export async function reverseGeocode(position: Position): Promise<GeocodeResult> {
  // First check local database for nearby locations
  const nearby = stPetersburgLocations.find(location => {
    const distance = haversineDistance(
      position.lat, position.lng,
      location.coordinates.lat, location.coordinates.lng
    );
    return distance < 500; // Within 500 meters
  });
  
  if (nearby) {
    return {
      name: nearby.name,
      address: nearby.address,
      coordinates: nearby.coordinates,
      type: 'exact'
    };
  }
  
  // Try reverse geocoding API
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?` +
      `format=json&lat=${position.lat}&lon=${position.lng}&zoom=18&addressdetails=1`
    );
    const data = await response.json();
    
    if (data && data.display_name) {
      return {
        name: data.name || 'Выбранное место',
        address: data.display_name,
        coordinates: position,
        type: 'approximate'
      };
    }
  } catch (error) {
    console.warn('Reverse geocoding failed:', error);
  }
  
  // Fallback
  return {
    name: 'Выбранное место',
    address: `${position.lat.toFixed(4)}, ${position.lng.toFixed(4)}`,
    coordinates: position,
    type: 'fallback'
  };
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

export function formatAddress(result: GeocodeResult): string {
  return result.address;
}