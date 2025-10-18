import React, { useState } from 'react';
import { MapPin, Navigation, Clock, Car, Target, Loader2, CheckCircle, AlertCircle, Phone, Edit3, Search, X } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { apiService } from '../services/api';
import { useGeolocation } from '../hooks/useGeolocation';
import { reverseGeocode, formatAddress, searchAddresses } from '../utils/geocoding';
import MapComponent from '../components/MapComponent';
import './ClientPage.css';

interface Position {
  lat: number;
  lng: number;
}

const ClientPage: React.FC = () => {
  const { 
    setCurrentOrder, 
    setPriceRecommendation, 
    setLoading, 
    setError,
    isLoading,
    error,
    priceRecommendation,
    currentOrder,
    addOrder
  } = useAppStore();

  const { position: currentPosition, isLoading: geoLoading, error: geoError } = useGeolocation();

  const [pickupLocation, setPickupLocation] = useState<Position | null>(null);
  const [destinationLocation, setDestinationLocation] = useState<Position | null>(null);
  const [pickupAddress, setPickupAddress] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [selectedLocationMode, setSelectedLocationMode] = useState<'pickup' | 'destination' | null>(null);
  const [orderStep, setOrderStep] = useState<'setup' | 'confirming' | 'confirmed'>('setup');
  const [addressLoading, setAddressLoading] = useState(false);
  
  // Address input modal states
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addressModalType, setAddressModalType] = useState<'pickup' | 'destination'>('pickup');
  const [addressInputValue, setAddressInputValue] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState<Array<{name: string, coordinates: Position}>>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  
  // Debounce ref for search
  const searchTimeoutRef = React.useRef<number | null>(null);
  
  // Route state
  const [routeCoordinates, setRouteCoordinates] = useState<Position[]>([]);
  const [routeLoading, setRouteLoading] = useState(false);
  const [mapViewBounds, setMapViewBounds] = useState<{northeast: Position, southwest: Position} | null>(null);
  




  // Set initial theme
  // Theme is managed globally via ThemeProvider / useTheme hook. Do not set it here.

  // Cleanup search timeout on unmount
  React.useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Auto-build route when both pickup and destination are set
  React.useEffect(() => {
    if (pickupLocation && destinationLocation) {
      buildRoute(pickupLocation, destinationLocation);
    } else {
      // Clear route if either point is missing
      setRouteCoordinates([]);
      setMapViewBounds(null);
    }
  }, [pickupLocation, destinationLocation]);

  // Mock address suggestions for Saint Petersburg
  const openAddressModal = (type: 'pickup' | 'destination') => {
    setAddressModalType(type);
    setAddressInputValue('');
    setAddressSuggestions([]);
    setShowAddressModal(true);
  };

  const handleAddressSearch = (query: string) => {
    setAddressInputValue(query);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Clear suggestions if query is too short
    if (query.length < 2) {
      setAddressSuggestions([]);
      setSearchLoading(false);
      return;
    }
    
    // Set loading state
    setSearchLoading(true);
    
    // Set debounced search with 1000ms delay for better API usage
    searchTimeoutRef.current = window.setTimeout(async () => {
      try {
        const results = await searchAddresses(query);
        setAddressSuggestions(results.map(result => ({
          name: result.name,
          coordinates: result.coordinates
        })));
      } catch (error) {
        console.error('Address search failed:', error);
        setAddressSuggestions([]);
      } finally {
        setSearchLoading(false);
      }
    }, 1000);
  };

  const selectAddress = async (address: {name: string, coordinates: Position}) => {
    if (addressModalType === 'pickup') {
      setPickupLocation(address.coordinates);
      setPickupAddress(address.name);
    } else {
      setDestinationLocation(address.coordinates);
      setDestinationAddress(address.name);
    }
    setShowAddressModal(false);
  };

  // Create straight line route as fallback
  const createStraightLineRoute = (from: Position, to: Position): Position[] => {
    const steps = 20; // Number of intermediate points
    const coordinates: Position[] = [];
    
    for (let i = 0; i <= steps; i++) {
      const ratio = i / steps;
      coordinates.push({
        lat: from.lat + (to.lat - from.lat) * ratio,
        lng: from.lng + (to.lng - from.lng) * ratio
      });
    }
    
    return coordinates;
  };

  // Упрощенное построение маршрута для оптимизации
  const buildRoute = async (from: Position, to: Position) => {
    setRouteLoading(true);
    try {
      // Используем только OSRM с упрощенными параметрами
      const osrmResponse = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?` +
        `overview=simplified&geometries=geojson`
      );
      
      if (!osrmResponse.ok) {
        throw new Error('Routing service unavailable');
      }
      
      const routeData = await osrmResponse.json();
      
      // Упрощенная обработка данных маршрута
      if (routeData?.routes?.length > 0) {
        const route = routeData.routes[0];
        
        const coordinates = route.geometry.coordinates.map((coord: [number, number]) => ({
          lat: coord[1],
          lng: coord[0]
        }));
        
        setRouteCoordinates(coordinates);
        
        // Упрощенный расчет границ
        const bounds = {
          northeast: {
            lat: Math.max(from.lat, to.lat) + Math.abs(to.lat - from.lat) * 0.2,
            lng: Math.max(from.lng, to.lng) + Math.abs(to.lng - from.lng) * 0.2
          },
          southwest: {
            lat: Math.min(from.lat, to.lat) - Math.abs(to.lat - from.lat) * 0.2,
            lng: Math.min(from.lng, to.lng) - Math.abs(to.lng - from.lng) * 0.2
          }
        };
        
        setMapViewBounds(bounds);
        
        return {
          coordinates,
          distance: route.distance,
          duration: route.duration
        };
      }
      
      // If no route found, create straight line as last resort
      if (!routeData?.routes?.length) {
        console.warn('No routing service available, using straight line');
        const straightLineCoords = createStraightLineRoute(from, to);
        setRouteCoordinates(straightLineCoords);
        
        // Calculate bounds for straight line
        const bounds = {
          northeast: {
            lat: Math.max(from.lat, to.lat) + Math.abs(to.lat - from.lat) * 0.1,
            lng: Math.max(from.lng, to.lng) + Math.abs(to.lng - from.lng) * 0.1
          },
          southwest: {
            lat: Math.min(from.lat, to.lat) - Math.abs(to.lat - from.lat) * 0.1,
            lng: Math.min(from.lng, to.lng) - Math.abs(to.lng - from.lng) * 0.1
          }
        };
        
        setMapViewBounds(bounds);
        
        return {
          coordinates: straightLineCoords,
          distance: calculateDistance(from, to),
          duration: calculateDistance(from, to) / 50 * 3.6 // Estimated at 50 km/h
        };
      }
      
      throw new Error('No route found');
    } catch (error) {
      console.error('Route building failed:', error);
      setRouteCoordinates([]);
      return null;
    } finally {
      setRouteLoading(false);
    }
  };

  // Default center (User's location or world center)
  const defaultCenter = currentPosition || { lat: 0, lng: 0 };
  const mapCenter = currentPosition || defaultCenter;

  const handleMapClick = async (position: Position) => {
    if (selectedLocationMode === 'pickup') {
      setPickupLocation(position);
      setAddressLoading(true);
      try {
        const geocodeResult = await reverseGeocode(position);
        setPickupAddress(formatAddress(geocodeResult));
      } catch (error) {
        console.error('Geocoding error:', error);
        setPickupAddress(`${position.lat.toFixed(4)}, ${position.lng.toFixed(4)}`);
      } finally {
        setAddressLoading(false);
      }
    } else if (selectedLocationMode === 'destination') {
      setDestinationLocation(position);
      setAddressLoading(true);
      try {
        const geocodeResult = await reverseGeocode(position);
        setDestinationAddress(formatAddress(geocodeResult));
      } catch (error) {
        console.error('Geocoding error:', error);
        setDestinationAddress(`${position.lat.toFixed(4)}, ${position.lng.toFixed(4)}`);
      } finally {
        setAddressLoading(false);
      }
    }
    setSelectedLocationMode(null);
  };

  const setCurrentLocationAsPickup = async () => {
    if (currentPosition) {
      setPickupLocation(currentPosition);
      setAddressLoading(true);
      try {
        const geocodeResult = await reverseGeocode(currentPosition);
        setPickupAddress(formatAddress(geocodeResult));
      } catch (error) {
        console.error('Geocoding error:', error);
        setPickupAddress('Ваше текущее местоположение');
      } finally {
        setAddressLoading(false);
      }
    }
  };

  const calculateDistance = (pos1: Position, pos2: Position): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = pos1.lat * Math.PI / 180;
    const φ2 = pos2.lat * Math.PI / 180;
    const Δφ = (pos2.lat - pos1.lat) * Math.PI / 180;
    const Δλ = (pos2.lng - pos1.lng) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  };

  const handleOrderTaxi = async () => {
    if (!pickupLocation || !destinationLocation) {
      setError('Выберите точки посадки и назначения на карте');
      return;
    }

    setOrderStep('confirming');
    setLoading(true);
    setError(null);

    try {
      const distance = calculateDistance(pickupLocation, destinationLocation);
      const duration = Math.round(distance / 8); // Approximate duration
      const base_price = Math.max(200, Math.round(distance / 1000 * 50 + 100));

      const request = {
        price_start_local: base_price,
        distance_in_meters: distance,
        duration_in_seconds: duration,
        driver_rating: 4.8 + Math.random() * 0.2,
        pickup_in_seconds: Math.round(Math.random() * 300 + 100),
        platform: 'android' as const,
        carname: 'Лада',
        carmodel: 'Гранта',
      };

      const recommendation = await apiService.getPriceRecommendation(request);
      setPriceRecommendation(recommendation);

      const newOrder = {
        id: `ORD-${Date.now()}`,
        pickup: { 
          address: pickupAddress, 
          coordinates: { lat: pickupLocation.lat, lng: pickupLocation.lng }
        },
        destination: { 
          address: destinationAddress, 
          coordinates: { lat: destinationLocation.lat, lng: destinationLocation.lng }
        },
        distance_in_meters: distance,
        duration_in_seconds: duration,
        status: 'pending' as const,
        created_at: new Date().toISOString(),
        client_id: 'client-1',
        price_recommendation: recommendation,
      };

      setCurrentOrder(newOrder);
      addOrder(newOrder as any);
      setOrderStep('confirmed');

    } catch (error) {
      console.error('❌ Ошибка:', error);
      setError('Ошибка подключения к серверу. Попробуйте еще раз.');
      setOrderStep('setup');
    } finally {
      setLoading(false);
    }
  };

  const resetOrder = () => {
    setOrderStep('setup');
    setPickupLocation(null);
    setDestinationLocation(null);
    setPickupAddress('');
    setDestinationAddress('');
    setCurrentOrder(null);
    setPriceRecommendation(null);
    setError(null);
  };

  const isReadyToOrder = pickupLocation && destinationLocation && !isLoading;

  return (
    <div className="client-page">
      <div className="client-header">
        <div className="header-content">
          <h1>Заказ такси</h1>
          <p>Выберите точки на карте и закажите поездку</p>
        </div>
      </div>

      <div className="client-layout">
        {/* Map Section */}
        <div className="map-section">
          <div className="map-card">
            <div className="map-header">
              <h3>Выберите маршрут</h3>
              <div className="location-status">
                {geoLoading && <Loader2 size={16} className="animate-spin" />}
                {currentPosition && <CheckCircle size={16} className="text-success" />}
                {geoError && <AlertCircle size={16} className="text-danger" />}
                <span className="location-text">
                  {geoLoading ? 'Определение...' : 
                   currentPosition ? 'GPS активен' : 
                   'GPS недоступен'}
                </span>
              </div>
            </div>
            
            <MapComponent
              center={mapCenter}
              pickupLocation={pickupLocation}
              destinationLocation={destinationLocation}
              routeCoordinates={routeCoordinates}
              routeLoading={routeLoading}
              viewBounds={mapViewBounds}
              onMapClick={handleMapClick}
              height="400px"
              className="taxi-map"
            />
            
            <div className="map-controls">
              <button 
                className={`btn btn-map-control ${selectedLocationMode === 'pickup' ? 'active' : ''}`}
                onClick={() => setSelectedLocationMode(selectedLocationMode === 'pickup' ? null : 'pickup')}
              >
                <MapPin size={16} />
                <span>Откуда</span>
              </button>
              
              <button 
                className={`btn btn-map-control ${selectedLocationMode === 'destination' ? 'active' : ''}`}
                onClick={() => setSelectedLocationMode(selectedLocationMode === 'destination' ? null : 'destination')}
              >
                <Target size={16} />
                <span>Куда</span>
              </button>
              
              {currentPosition && (
                <button 
                  className="btn btn-map-control"
                  onClick={setCurrentLocationAsPickup}
                >
                  <Navigation size={16} />
                  <span>Мое место</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Order Section */}
        <div className="order-section">
          {orderStep === 'setup' && (
            <div className="order-setup">
              <div className="order-card">
                <h3>Детали поездки</h3>
                
                <div className="route-info">
                  <div className="route-point" onClick={() => openAddressModal('pickup')}>
                    <div className="point-icon pickup">
                      <MapPin size={16} />
                    </div>
                    <div className="point-details">
                      <span className="point-label">Откуда</span>
                      <span className="point-address">
                        {addressLoading && selectedLocationMode === 'pickup' ? (
                          <span className="loading-address">
                            <Loader2 size={14} className="animate-spin" />
                            Определение адреса...
                          </span>
                        ) : (
                          pickupAddress || 'Нажмите, чтобы ввести адрес'
                        )}
                      </span>
                    </div>
                    <button className="edit-address-btn" onClick={(e) => {e.stopPropagation(); openAddressModal('pickup')}}>
                      <Edit3 size={16} />
                    </button>
                  </div>
                  
                  <div className="route-line"></div>
                  
                  <div className="route-point" onClick={() => openAddressModal('destination')}>
                    <div className="point-icon destination">
                      <Target size={16} />
                    </div>
                    <div className="point-details">
                      <span className="point-label">Куда</span>
                      <span className="point-address">
                        {addressLoading && selectedLocationMode === 'destination' ? (
                          <span className="loading-address">
                            <Loader2 size={14} className="animate-spin" />
                            Определение адреса...
                          </span>
                        ) : (
                          destinationAddress || 'Нажмите, чтобы ввести адрес'
                        )}
                      </span>
                    </div>
                    <button className="edit-address-btn" onClick={(e) => {e.stopPropagation(); openAddressModal('destination')}}>
                      <Edit3 size={16} />
                    </button>
                  </div>
                </div>

                {pickupLocation && destinationLocation && (
                  <div className="trip-preview">
                    {routeLoading && (
                      <div className="route-loading">
                        <Loader2 size={16} className="animate-spin" />
                        <span>Построение маршрута...</span>
                      </div>
                    )}
                    <div className="trip-stat">
                      <Car size={20} />
                      <div>
                        <div className="stat-value">
                          {(calculateDistance(pickupLocation, destinationLocation) / 1000).toFixed(1)} км
                        </div>
                        <div className="stat-label">Расстояние</div>
                      </div>
                    </div>
                    
                    <div className="trip-stat">
                      <Clock size={20} />
                      <div>
                        <div className="stat-value">
                          {Math.round(calculateDistance(pickupLocation, destinationLocation) / 8 / 60)} мин
                        </div>
                        <div className="stat-label">Время в пути</div>
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="error-message">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                  </div>
                )}

                <button 
                  className="btn btn-primary btn-lg order-button"
                  onClick={handleOrderTaxi}
                  disabled={!isReadyToOrder}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Поиск водителя...
                    </>
                  ) : (
                    <>
                      <Car size={16} />
                      Заказать такси
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {orderStep === 'confirming' && (
            <div className="order-confirming">
              <div className="order-card">
                <div className="loading-state">
                  <Loader2 size={32} className="animate-spin" />
                  <h3>Поиск водителя...</h3>
                  <p>Рассчитываем цену и ищем ближайшего водителя</p>
                </div>
              </div>
            </div>
          )}

          {orderStep === 'confirmed' && priceRecommendation && currentOrder && (
            <div className="order-confirmed">
              <div className="order-card">
                <div className="success-header">
                  <CheckCircle size={32} className="text-success" />
                  <h3>Водитель найден!</h3>
                  <p>Лада Гранта • Рейтинг 4.8 ⭐</p>
                </div>

                <div className="price-display">
                  <div className="price-main">
                    {Math.round(priceRecommendation.optimal_price)} ₽
                  </div>
                  <div className="price-label">Стоимость поездки</div>
                </div>

                <div className="order-summary">
                  <div className="summary-row">
                    <span>Маршрут:</span>
                    <span className="route-short">
                      {((currentOrder.distance_in_meters || 0) / 1000).toFixed(1)} км • {Math.round((currentOrder.duration_in_seconds || 0) / 60)} мин
                    </span>
                  </div>
                  <div className="summary-row">
                    <span>Подача:</span>
                    <span className="eta">3-5 минут</span>
                  </div>
                </div>

                <div className="driver-contact">
                  <div className="driver-info">
                    <div className="driver-avatar">
                      <Car size={24} />
                    </div>
                    <div className="driver-details">
                      <div className="driver-name">Водитель в пути</div>
                      <div className="driver-car">Лада Гранта</div>
                    </div>
                  </div>
                  <button className="btn btn-call">
                    <Phone size={18} />
                  </button>
                </div>

                <div className="action-buttons">
                  <button 
                    className="btn btn-secondary"
                    onClick={resetOrder}
                  >
                    Новый заказ
                  </button>
                  <button className="btn btn-danger">
                    Отменить поездку
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Address Input Modal */}
      {showAddressModal && (
        <div className="address-modal" onClick={() => setShowAddressModal(false)}>
          <div className="address-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {addressModalType === 'pickup' ? 'Откуда поедем?' : 'Куда поедем?'}
              </h3>
              <button 
                className="close-modal-btn"
                onClick={() => setShowAddressModal(false)}
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="address-input-group">
              <div className="search-input-wrapper">
                <Search size={20} className="search-icon" />
                <input
                  type="text"
                  placeholder="Введите адрес или название места..."
                  value={addressInputValue}
                  onChange={(e) => handleAddressSearch(e.target.value)}
                  className="address-input"
                  autoFocus
                />
                {searchLoading && (
                  <Loader2 size={20} className="search-loading-icon" />
                )}
              </div>
              
              {searchLoading && addressInputValue.length >= 2 && (
                <div className="search-loading">
                  <Loader2 size={16} className="loading-spinner" />
                  <span>Поиск адресов...</span>
                </div>
              )}
              
              {!searchLoading && addressSuggestions.length > 0 && (
                <div className="address-suggestions">
                  {addressSuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="suggestion-item"
                      onClick={() => selectAddress(suggestion)}
                    >
                      <MapPin size={16} className="suggestion-icon" />
                      <span>{suggestion.name}</span>
                    </div>
                  ))}
                </div>
              )}
              
              {!searchLoading && addressInputValue.length >= 2 && addressSuggestions.length === 0 && (
                <div className="no-results">
                  <AlertCircle size={16} />
                  <span>Адреса не найдены</span>
                </div>
              )}
            </div>
            
            <div className="modal-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowAddressModal(false)}
              >
                Отмена
              </button>
              
              <button 
                className="btn btn-primary"
                onClick={() => {
                  setSelectedLocationMode(addressModalType);
                  setShowAddressModal(false);
                }}
              >
                <MapPin size={16} />
                Выбрать на карте
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientPage;
