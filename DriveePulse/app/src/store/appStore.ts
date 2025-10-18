import { create } from 'zustand';
import type { Order, PriceRecommendation, UserRole, DashboardStats, BidRequest, BidRecommendation } from '@/types';

interface AppState {
  // User
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;

  // Orders
  orders: Order[];
  setOrders: (orders: Order[]) => void;
  addOrder: (order: Order) => void;
  updateOrder: (orderId: string, updates: Partial<Order>) => void;

  // Current Order (for client)
  currentOrder: Partial<Order> | null;
  priceRecommendation: PriceRecommendation | null;
  setCurrentOrder: (order: Partial<Order> | null) => void;
  setPriceRecommendation: (recommendation: PriceRecommendation | null) => void;

  // Bidding system
  availableOrders: Order[];
  bidRecommendations: Map<string, BidRecommendation>;
  driverInfo: {
    lat: number;
    lng: number;
    rating: number;
    carName: string;
    carModel: string;
  } | null;
  setAvailableOrders: (orders: Order[]) => void;
  setBidRecommendation: (orderId: string, recommendation: BidRecommendation) => void;
  setDriverInfo: (info: { lat: number; lng: number; rating: number; carName: string; carModel: string }) => void;
  getBidRecommendation: (bidRequest: BidRequest) => Promise<BidRecommendation>;

  // UI State
  isLoading: boolean;
  error: string | null;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Stats (for driver)
  stats: DashboardStats;
  updateStats: () => void;

  // Demo data initialization
  addRandomOrder: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // User
  userRole: (localStorage.getItem('userRole') as UserRole) || 'client',
  setUserRole: (role) => {
    localStorage.setItem('userRole', role);
    set({ userRole: role });
  },

  // Orders
  orders: [],
  setOrders: (orders) => set({ orders }),
  addOrder: (order) => set((state) => ({ orders: [order, ...state.orders] })),
  updateOrder: (orderId, updates) =>
    set((state) => ({
      orders: state.orders.map((o) => (o.id === orderId ? { ...o, ...updates } : o))
    })),

  // Current Order
  currentOrder: null,
  priceRecommendation: null,
  setCurrentOrder: (order) => set({ currentOrder: order }),
  setPriceRecommendation: (recommendation) => set({ priceRecommendation: recommendation }),

  // Bidding system
  availableOrders: [],
  bidRecommendations: new Map(),
  driverInfo: null,
  setAvailableOrders: (orders) => set({ availableOrders: orders }),
  setBidRecommendation: (orderId, recommendation) => set((state) => {
    const newRecommendations = new Map(state.bidRecommendations);
    newRecommendations.set(orderId, recommendation);
    return { bidRecommendations: newRecommendations };
  }),
  setDriverInfo: (info) => set({ driverInfo: info }),
  
  getBidRecommendation: async (bidRequest: BidRequest): Promise<BidRecommendation> => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/bid/recommend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bidRequest),
      });
      
      if (!response.ok) {
        throw new Error('Failed to get bid recommendation');
      }
      
      const result = await response.json();
      
      // Сохраняем рекомендацию в store
      get().setBidRecommendation(bidRequest.order_id, result);
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  // UI State
  isLoading: false,
  error: null,
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  // Stats
  stats: {
    total_orders: 0,
    accepted_orders: 0,
    rejected_orders: 0,
    avg_revenue: 0,
    avg_acceptance_rate: 0,
    today_earnings: 0
  },
  updateStats: () => {
    const { orders } = get();
    const acceptedOrders = orders.filter((o) => o.status === 'accepted');
    const totalRevenue = acceptedOrders.reduce((sum, o) => sum + (o.accepted_price || 0), 0);

    set({
      stats: {
        total_orders: orders.length,
        accepted_orders: acceptedOrders.length,
        rejected_orders: orders.filter((o) => o.status === 'cancelled').length,
        avg_revenue: orders.length > 0 ? Math.round(totalRevenue / orders.length) : 0,
        avg_acceptance_rate: orders.length > 0 ? (acceptedOrders.length / orders.length) * 100 : 0,
        today_earnings: totalRevenue
      }
    });
  },

  // Add random order for testing
  addRandomOrder: () => {
    const locations = [
      { address: 'Исаакиевская площадь, 4', coordinates: { lat: 59.9342, lng: 30.3061 } },
      { address: 'Казанский собор', coordinates: { lat: 59.9346, lng: 30.3244 } },
      { address: 'Спас на Крови', coordinates: { lat: 59.9404, lng: 30.3289 } },
      { address: 'Мариинский театр', coordinates: { lat: 59.9244, lng: 30.2957 } },
      { address: 'Эрмитаж', coordinates: { lat: 59.9398, lng: 30.3146 } },
      { address: 'Петропавловская крепость', coordinates: { lat: 59.9504, lng: 30.3174 } },
      { address: 'Смольный собор', coordinates: { lat: 59.9481, lng: 30.3872 } },
      { address: 'Финляндский вокзал', coordinates: { lat: 59.9561, lng: 30.3535 } },
    ];

    const randomPickup = locations[Math.floor(Math.random() * locations.length)];
    const randomDestination = locations[Math.floor(Math.random() * locations.length)];
    
    // Простой расчет расстояния и времени
    const distance = Math.random() * 15000 + 1000; // 1-16 км
    const duration = (distance / 1000) * 120 + Math.random() * 300; // примерное время
    const basePrice = Math.round(distance / 1000 * 50 + Math.random() * 200 + 200);

    const newOrder = {
      id: `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      pickup: randomPickup,
      destination: randomDestination,
      distance_in_meters: Math.round(distance),
      duration_in_seconds: Math.round(duration),
      status: 'pending' as const,
      created_at: new Date().toISOString(),
      client_id: `client-${Math.random().toString(36).substr(2, 6)}`,
      accepted_price: basePrice
    };

    const { addOrder } = get();
    addOrder(newOrder);
  }
}));
