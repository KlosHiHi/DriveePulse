// Типы для unified приложения

export interface Location {
  address: string;
  coordinates?: { lat: number; lng: number };
}

export interface PriceRecommendation {
  safe_price: number;
  safe_acceptance_prob: number;
  optimal_price: number;
  optimal_acceptance_prob: number;
  risky_price: number;
  risky_acceptance_prob: number;
  expected_revenue: number;
  price_curve: Array<{ price: number; probability: number; revenue: number }>;
}

export interface Position {
  lat: number;
  lng: number;
}

export interface BidRequest {
  order_id: string;
  pickup_lat: number;
  pickup_lng: number;
  destination_lat: number;
  destination_lng: number;
  initial_price: number;
  driver_lat: number;
  driver_lng: number;
  driver_rating?: number;
  user_rating?: number;
  carname?: string;
  carmodel?: string;
  platform?: string;
}

export interface BidRecommendation {
  optimal_price: number;
  optimal_acceptance_prob: number;
  expected_revenue: number;
  safe_price: number;
  safe_acceptance_prob: number;
  risky_price: number;
  risky_acceptance_prob: number;
  price_curve: Array<{
    price: number;
    probability: number;
    revenue: number;
  }>;
  order_info?: {
    order_id: string;
    initial_price: number;
    distance_km: number;
    pickup_distance_km: number;
  };
}

export interface Order {
  id: string;
  pickup: Location;
  destination: Location;
  distance_in_meters: number;
  duration_in_seconds: number;
  status: 'pending' | 'accepted' | 'completed' | 'cancelled';
  created_at: string;
  accepted_at?: string;
  driver_id?: string;
  price_recommendation?: PriceRecommendation;
  accepted_price?: number;
  client_id: string;
}

export interface DashboardStats {
  total_orders: number;
  accepted_orders: number;
  rejected_orders: number;
  avg_revenue: number;
  avg_acceptance_rate: number;
  today_earnings: number;
}

export type UserRole = 'client' | 'driver';
