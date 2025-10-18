import React, { useState, useEffect } from 'react';
import { MapPin, Clock, User, Car, RefreshCw } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { BidRecommendation } from './BidRecommendation';
import type { Order, BidRequest } from '../types';

export const AvailableOrders: React.FC = () => {
  const {
    availableOrders,
    bidRecommendations,
    driverInfo,
    setDriverInfo,
    getBidRecommendation,
    isLoading,
    error
  } = useAppStore();

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Инициализация информации о водителе (в реальном приложении это должно быть из профиля)
  useEffect(() => {
    if (!driverInfo) {
      setDriverInfo({
        lat: 59.9311,
        lng: 30.3609,
        rating: 4.8,
        carName: 'Kia Rio',
        carModel: '2019'
      });
    }
  }, [driverInfo, setDriverInfo]);

  const handleGetRecommendation = async (order: Order) => {
    if (!driverInfo) return;

    const bidRequest: BidRequest = {
      order_id: order.id,
      pickup_lat: order.pickup.coordinates?.lat || 0,
      pickup_lng: order.pickup.coordinates?.lng || 0,
      destination_lat: order.destination.coordinates?.lat || 0,
      destination_lng: order.destination.coordinates?.lng || 0,
      initial_price: order.accepted_price || 500, // Используем accepted_price или дефолтное значение
      driver_lat: driverInfo.lat,
      driver_lng: driverInfo.lng,
      driver_rating: driverInfo.rating,
      user_rating: 4.5, // В реальном приложении это рейтинг пассажира
      carname: driverInfo.carName,
      carmodel: driverInfo.carModel,
      platform: 'web'
    };

    try {
      await getBidRecommendation(bidRequest);
      setSelectedOrderId(order.id);
    } catch (error) {
      console.error('Failed to get bid recommendation:', error);
    }
  };

  const handleSelectPrice = (price: number, strategy: 'safe' | 'optimal' | 'risky') => {
    // В реальном приложении здесь была бы отправка ставки на сервер
    console.log(`Selected ${strategy} strategy with price: ${price}`);
  };

  const formatDistance = (distance: number) => {
    return distance < 1 ? `${Math.round(distance * 1000)} м` : `${distance.toFixed(1)} км`;
  };

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371; // Радиус Земли в км
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  if (!driverInfo) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Доступные заказы</h2>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Обновить
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {availableOrders.length === 0 ? (
          <div className="text-center py-8">
            <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Нет доступных заказов в вашем районе</p>
          </div>
        ) : (
          <div className="space-y-4">
            {availableOrders.map((order) => {
              const distanceToPickup = driverInfo && order.pickup.coordinates ? calculateDistance(
                driverInfo.lat,
                driverInfo.lng,
                order.pickup.coordinates.lat,
                order.pickup.coordinates.lng
              ) : 0;

              const recommendation = bidRecommendations.get(order.id);

              return (
                <div key={order.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="w-4 h-4 text-gray-500" />
                          <span className="font-medium">{order.client_id}</span>
                          <span className="text-sm text-gray-500">★ 4.5</span>
                        </div>                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-green-500 mt-0.5" />
                          <span>{order.pickup.address}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-red-500 mt-0.5" />
                          <span>{order.destination.address}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>До подачи: {formatDistance(distanceToPickup)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Car className="w-4 h-4" />
                            <span>Поездка: {formatDistance((order.distance_in_meters || 0) / 1000)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900 mb-2">
                        {Math.round(order.accepted_price || 500)} ₽
                      </div>
                      <button
                        onClick={() => handleGetRecommendation(order)}
                        disabled={isLoading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                      >
                        {isLoading ? 'Анализ...' : 'Анализировать'}
                      </button>
                    </div>
                  </div>

                  {selectedOrderId === order.id && recommendation && (
                    <div className="mt-4 pt-4 border-t">
                      <BidRecommendation
                        recommendation={recommendation}
                        onSelectPrice={handleSelectPrice}
                        isLoading={isLoading}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};