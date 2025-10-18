import React, { useState, useEffect } from 'react';
import { Car, DollarSign, TrendingUp, Clock, MapPin, Target, Check, Phone, Navigation2, Star, Settings } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { BidRecommendation } from '../components/BidRecommendation';
import type { Order, BidRequest } from '../types';
import './DriverPage.css';

const DriverPage: React.FC = () => {
  const { 
    orders, 
    stats, 
    updateStats, 
    updateOrder,
    bidRecommendations,
    driverInfo,
    setDriverInfo,
    getBidRecommendation,
    isLoading,
    error,
    addRandomOrder
  } = useAppStore();
  
  const [activeTab, setActiveTab] = useState<'orders' | 'active' | 'history'>('orders');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Инициализация информации о водителе
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

    updateStats();
    const interval = setInterval(() => {
      updateStats();
    }, 5000);
    return () => clearInterval(interval);
  }, [updateStats, driverInfo, setDriverInfo]);

  const handleGetRecommendation = async (order: Order) => {
    if (!driverInfo) return;

    const bidRequest: BidRequest = {
      order_id: order.id,
      pickup_lat: order.pickup.coordinates?.lat || 0,
      pickup_lng: order.pickup.coordinates?.lng || 0,
      destination_lat: order.destination.coordinates?.lat || 0,
      destination_lng: order.destination.coordinates?.lng || 0,
      initial_price: order.price_recommendation?.optimal_price || order.accepted_price || 500,
      driver_lat: driverInfo.lat,
      driver_lng: driverInfo.lng,
      driver_rating: driverInfo.rating,
      user_rating: 4.5,
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

  const handleAcceptOrder = (orderId: string, price: number) => {
    updateOrder(orderId, {
      status: 'accepted',
      accepted_price: price,
      accepted_at: new Date().toISOString(),
      driver_id: 'driver-1',
    });
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

  // Фильтруем заказы
  const pendingOrders = orders.filter(o => o.status === 'pending');
  const activeOrders = orders.filter(o => o.status === 'accepted' && o.driver_id === 'driver-1');
  const completedOrders = orders.filter(o => ['completed', 'cancelled'].includes(o.status));

  return (
    <div className="driver-page">
      <div className="driver-header">
        <div className="driver-profile">
          <div className="profile-avatar">
            <Car size={24} />
          </div>
          <div className="profile-info">
            <h2>Иван Водителев</h2>
            <div className="driver-rating">
              <Star size={16} fill="currentColor" />
              <span>4.8</span>
              <span className="rating-count">(156 поездок)</span>
            </div>
          </div>
        </div>
        <div className="header-controls">
          <div className="online-status">
            <div className="status-indicator online"></div>
            <span>В сети</span>
          </div>
          <button className="settings-btn">
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon orders">
            <Car size={20} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.total_orders}</div>
            <div className="stat-label">Заказов</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon completed">
            <Check size={20} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.accepted_orders}</div>
            <div className="stat-label">Выполнено</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon earnings">
            <DollarSign size={20} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{Math.round(stats.today_earnings)} ₽</div>
            <div className="stat-label">Заработано</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon rate">
            <TrendingUp size={20} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.avg_acceptance_rate.toFixed(1)}%</div>
            <div className="stat-label">Принятие</div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="tabs-navigation">
        <button
          className={`tab-button ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          Доступные заказы
          {pendingOrders.length > 0 && (
            <span className="tab-badge">{pendingOrders.length}</span>
          )}
        </button>
        <button
          className={`tab-button ${activeTab === 'active' ? 'active' : ''}`}
          onClick={() => setActiveTab('active')}
        >
          Активные
          {activeOrders.length > 0 && (
            <span className="tab-badge">{activeOrders.length}</span>
          )}
        </button>
        <button
          className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          История
        </button>
        <button
          className="tab-button add-order-btn"
          onClick={addRandomOrder}
          title="Добавить тестовый заказ"
        >
          + Тест
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'orders' && (
          <div className="orders-section">
            {error && (
              <div className="error-message">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {pendingOrders.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <MapPin size={48} />
                </div>
                <h4>Нет доступных заказов</h4>
                <p>Новые заказы появятся здесь автоматически</p>
              </div>
            ) : (
              <div className="orders-list">
                {pendingOrders.map((order) => {
                  const distanceToPickup = driverInfo && order.pickup.coordinates ? calculateDistance(
                    driverInfo.lat,
                    driverInfo.lng,
                    order.pickup.coordinates.lat,
                    order.pickup.coordinates.lng
                  ) : 0;

                  const recommendation = bidRecommendations.get(order.id);
                  const isSelectedOrder = selectedOrderId === order.id;

                  return (
                    <div key={order.id} className="order-card pending">
                      <div className="order-header">
                        <div className="order-info">
                          <div className="order-id">#{order.id.slice(-6)}</div>
                          <div className="order-time">
                            {new Date(order.created_at).toLocaleTimeString('ru-RU', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </div>
                        </div>
                        <div className="status-badge pending">Новый</div>
                      </div>

                      <div className="route-section">
                        <div className="route-point pickup">
                          <div className="route-icon">
                            <MapPin size={14} />
                          </div>
                          <div className="route-address">{order.pickup.address}</div>
                        </div>
                        
                        <div className="route-divider">
                          <div className="route-line"></div>
                          <div className="route-dots">
                            <div className="dot"></div>
                            <div className="dot"></div>
                            <div className="dot"></div>
                          </div>
                        </div>
                        
                        <div className="route-point destination">
                          <div className="route-icon">
                            <Target size={14} />
                          </div>
                          <div className="route-address">{order.destination.address}</div>
                        </div>
                      </div>

                      <div className="trip-details">
                        <div className="detail-item">
                          <span className="detail-value">{formatDistance((order.distance_in_meters || 0) / 1000)}</span>
                          <span className="detail-label">Расстояние</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-value">{Math.round((order.duration_in_seconds || 0) / 60)} мин</span>
                          <span className="detail-label">Время</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-value">{formatDistance(distanceToPickup)}</span>
                          <span className="detail-label">До подачи</span>
                        </div>
                      </div>

                      <div className="order-pricing">
                        <div className="initial-price">
                          Начальная цена: <strong>{Math.round(order.price_recommendation?.optimal_price || order.accepted_price || 0)} ₽</strong>
                        </div>
                        <button
                          onClick={() => handleGetRecommendation(order)}
                          disabled={isLoading}
                          className="btn-analyze"
                        >
                          {isLoading ? 'Анализ...' : 'Получить рекомендацию'}
                        </button>
                      </div>

                      {isSelectedOrder && recommendation && (
                        <div className="recommendation-section">
                          <BidRecommendation
                            recommendation={recommendation}
                            onSelectPrice={(price, strategy) => {
                              handleSelectPrice(price, strategy);
                              handleAcceptOrder(order.id, price);
                            }}
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
        )}

        {activeTab === 'active' && (
          <div className="orders-section">
            {activeOrders.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <Navigation2 size={48} />
                </div>
                <h4>Нет активных заказов</h4>
                <p>Принятые заказы будут отображаться здесь</p>
              </div>
            ) : (
              <div className="orders-list">
                {activeOrders.map((order) => (
                  <div key={order.id} className="order-card active">
                    <div className="order-header">
                      <div className="order-info">
                        <div className="order-id">#{order.id.slice(-6)}</div>
                        <div className="order-time">
                          {new Date(order.created_at).toLocaleTimeString('ru-RU', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      </div>
                      <div className="status-badge accepted">Принят</div>
                    </div>

                    <div className="route-section">
                      <div className="route-point pickup">
                        <div className="route-icon">
                          <MapPin size={14} />
                        </div>
                        <div className="route-address">{order.pickup.address}</div>
                      </div>
                      
                      <div className="route-divider">
                        <div className="route-line"></div>
                        <div className="route-dots">
                          <div className="dot"></div>
                          <div className="dot"></div>
                          <div className="dot"></div>
                        </div>
                      </div>
                      
                      <div className="route-point destination">
                        <div className="route-icon">
                          <Target size={14} />
                        </div>
                        <div className="route-address">{order.destination.address}</div>
                      </div>
                    </div>

                    <div className="accepted-status">
                      <div className="accepted-info">
                        <Check size={20} className="check-icon" />
                        <div>
                          <div className="accepted-text">Заказ принят</div>
                          <div className="accepted-price">{Math.round(order.accepted_price || 0)} ₽</div>
                        </div>
                      </div>
                      <button className="btn btn-contact">
                        <Phone size={16} />
                        Связаться
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="orders-section">
            {completedOrders.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <Clock size={48} />
                </div>
                <h4>История пуста</h4>
                <p>Завершенные заказы будут отображаться здесь</p>
              </div>
            ) : (
              <div className="orders-list">
                {completedOrders.map((order) => (
                  <div key={order.id} className={`order-card ${order.status}`}>
                    <div className="order-header">
                      <div className="order-info">
                        <div className="order-id">#{order.id.slice(-6)}</div>
                        <div className="order-time">
                          {new Date(order.created_at).toLocaleTimeString('ru-RU', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      </div>
                      <div className={`status-badge ${order.status}`}>
                        {order.status === 'completed' ? 'Завершен' : 'Отменен'}
                      </div>
                    </div>

                    <div className="route-section">
                      <div className="route-point pickup">
                        <div className="route-icon">
                          <MapPin size={14} />
                        </div>
                        <div className="route-address">{order.pickup.address}</div>
                      </div>
                      
                      <div className="route-divider">
                        <div className="route-line"></div>
                      </div>
                      
                      <div className="route-point destination">
                        <div className="route-icon">
                          <Target size={14} />
                        </div>
                        <div className="route-address">{order.destination.address}</div>
                      </div>
                    </div>

                    {order.accepted_price && (
                      <div className="historical-price">
                        Заработано: {Math.round(order.accepted_price)} ₽
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DriverPage;
