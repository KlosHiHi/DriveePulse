import axios from 'axios';
import type { Order, PriceRecommendation } from '@/types';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
});

export const apiService = {
  // ML Predictions
  async getPriceRecommendation(data: any): Promise<PriceRecommendation> {
    const response = await api.post<PriceRecommendation>('/predict', data);
    return response.data;
  },

  async getBidRecommendation(data: any): Promise<PriceRecommendation> {
    const response = await api.post<PriceRecommendation>('/bid/recommend', data);
    return response.data;
  },

  // Orders
  async getOrders(): Promise<Order[]> {
    const response = await api.get<Order[]>('/orders');
    return response.data;
  },

  async createOrder(order: Partial<Order>): Promise<Order> {
    const response = await api.post<Order>('/orders', order);
    return response.data;
  },

  async acceptOrder(orderId: string, price: number): Promise<Order> {
    const response = await api.put<Order>(`/orders/${orderId}/accept`, { accepted_price: price });
    return response.data;
  },

  // Health
  async healthCheck(): Promise<boolean> {
    try {
      await api.get('/health');
      return true;
    } catch {
      return false;
    }
  }
};
