import React from 'react';
import { AlertTriangle, TrendingUp, Shield, Target } from 'lucide-react';
import type { BidRecommendation as BidRecommendationType } from '../types';
import './BidRecommendation.css';

interface BidRecommendationProps {
  recommendation: BidRecommendationType;
  onSelectPrice: (price: number, strategy: 'safe' | 'optimal' | 'risky') => void;
  isLoading?: boolean;
}

export const BidRecommendation: React.FC<BidRecommendationProps> = ({
  recommendation,
  onSelectPrice,
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <div className="bid-recommendation-container loading">
        <div className="loading-skeleton">
          <div className="skeleton-header"></div>
          <div className="skeleton-content">
            <div className="skeleton-item"></div>
            <div className="skeleton-item"></div>
            <div className="skeleton-item"></div>
          </div>
        </div>
      </div>
    );
  }

  const strategies = [
    {
      key: 'safe' as const,
      title: 'Безопасная ставка',
      price: recommendation.risky_price, // Используем risky_price, так как это самая низкая цена
      probability: recommendation.risky_acceptance_prob * 100,
      icon: Shield,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      description: 'Низкая цена, высокая вероятность принятия'
    },
    {
      key: 'optimal' as const,
      title: 'Оптимальная ставка',
      price: recommendation.optimal_price,
      probability: recommendation.optimal_acceptance_prob * 100, // Конвертируем в проценты
      icon: Target,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      description: 'Лучший баланс цены и вероятности'
    },
    {
      key: 'risky' as const,
      title: 'Рискованная ставка',
      price: recommendation.safe_price, // Используем safe_price, так как это самая высокая цена
      probability: recommendation.safe_acceptance_prob * 100,
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      description: 'Высокая цена, низкая вероятность принятия'
    }
  ];

  return (
    <div className="bid-recommendation-container">
      <div className="bid-header">
        <Target className="bid-icon" />
        <div className="bid-header-content">
          <h3 className="bid-title">
            Рекомендации по ставке
          </h3>
          <div className="expected-revenue">
            Ожидаемый доход: <strong>{Math.round(recommendation.expected_revenue)} ₽</strong>
          </div>
        </div>
      </div>

      {recommendation.order_info && (
        <div className="order-info-card">
          <div className="order-details-grid">
            <div className="detail-item">
              <span className="detail-label">Заказ:</span>
              <span className="detail-value">#{recommendation.order_info.order_id}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Начальная цена:</span>
              <span className="detail-value">{Math.round(recommendation.order_info.initial_price)} ₽</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Расстояние:</span>
              <span className="detail-value">{recommendation.order_info.distance_km.toFixed(1)} км</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">До подачи:</span>
              <span className="detail-value">{recommendation.order_info.pickup_distance_km.toFixed(1)} км</span>
            </div>
          </div>
        </div>
      )}

      <div className="strategies-container">
        {strategies.map((strategy, index) => {
          const Icon = strategy.icon;
          
          return (
            <button
              key={strategy.key}
              onClick={() => onSelectPrice(strategy.price, strategy.key)}
              className={`strategy-card ${strategy.key}`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="strategy-header">
                <div className={`strategy-icon ${strategy.key}`}>
                  <Icon size={20} />
                </div>
                <div className="strategy-info">
                  <h4 className="strategy-title">{strategy.title}</h4>
                  <p className="strategy-description">{strategy.description}</p>
                </div>
                <div className="strategy-price">
                  {Math.round(strategy.price)} ₽
                </div>
              </div>
              
              <div className="strategy-stats">
                <div className="stat-item">
                  <span className="stat-label">Вероятность принятия:</span>
                  <span className="stat-value">{Math.round(strategy.probability)}%</span>
                </div>
              </div>
              
              <div className="probability-bar">
                <div 
                  className={`probability-fill ${strategy.key}`}
                  style={{ width: `${strategy.probability}%` }}
                ></div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="bid-advice">
        <div className="advice-icon">
          <AlertTriangle size={16} />
        </div>
        <div className="advice-content">
          <strong>Совет:</strong> Оптимальная ставка обеспечивает лучший баланс между доходом и вероятностью принятия заказа.
        </div>
      </div>
    </div>
  );
};