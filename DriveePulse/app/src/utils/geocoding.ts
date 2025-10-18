// Universal geocoding utilities with OpenStreetMap
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

// Universal search using only Nominatim API
export async function searchAddresses(query: string): Promise<GeocodeResult[]> {
  if (query.length < 2) return [];
  
  try {
    // Use Nominatim API with proper encoding as shown in your working example
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?` +
      `q=${encodeURIComponent(query)}&format=jsonv2&limit=10&addressdetails=1`;
    
    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'DriveeApp/1.0 (taxi application)'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    const results: GeocodeResult[] = data
      .filter((item: any) => item.lat && item.lon && item.display_name)
      .map((item: any) => {
        // Extract meaningful name from display_name
        let name = item.name || item.display_name.split(',')[0];
        
        // If name is too generic, try to use house number + street
        if (!name || name.length < 3) {
          const parts = item.display_name.split(',');
          if (parts.length >= 2) {
            name = parts.slice(0, 2).join(', ').trim();
          } else {
            name = item.display_name;
          }
        }
        
        return {
          name: name,
          address: item.display_name,
          coordinates: {
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon)
          },
          type: item.importance > 0.5 ? 'exact' as const : 'approximate' as const
        };
      })
      .slice(0, 8); // Limit to 8 results
    
    return results;
    
  } catch (error) {
    console.error('Geocoding search failed:', error);
    return [];
  }
}

export async function reverseGeocode(position: Position): Promise<GeocodeResult> {
  try {
    // Use Nominatim reverse geocoding API
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?` +
      `format=jsonv2&lat=${position.lat}&lon=${position.lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'DriveeApp/1.0 (taxi application)'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data && data.display_name) {
      let name = data.name || data.display_name.split(',')[0];
      
      // If name is too generic, try to use house number + street
      if (!name || name.length < 3) {
        const parts = data.display_name.split(',');
        if (parts.length >= 2) {
          name = parts.slice(0, 2).join(', ').trim();
        } else {
          name = 'Выбранное место';
        }
      }
      
      return {
        name: name,
        address: data.display_name,
        coordinates: {
          lat: parseFloat(data.lat) || position.lat,
          lng: parseFloat(data.lon) || position.lng
        },
        type: 'approximate'
      };
    }
  } catch (error) {
    console.error('Reverse geocoding failed:', error);
  }
  
  // Fallback for any error
  return {
    name: 'Выбранное место',
    address: `${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}`,
    coordinates: position,
    type: 'fallback'
  };
}

export function formatAddress(result: GeocodeResult): string {
  return result.address;
}