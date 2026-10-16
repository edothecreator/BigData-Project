import type { Insight } from "@/lib/dashboard/types";

export interface MarketMetrics {
  count: number;
  averageRating: number | null;
  /** Open / known status (0 or 1); null if all statuses are unknown. */
  openRatio: number | null;
  averageReviews: number | null;
}

export interface CategoryMarket extends MarketMetrics {
  category: string;
}

export interface GeographicMarket extends MarketMetrics {
  label: string;
  state: string;
  city: string | null;
}

export interface InsightsData {
  businessesAvailable: boolean;
  categories: CategoryMarket[];
  engagement: CategoryMarket[];
  categoryOptions: string[];
  states: GeographicMarket[];
  cities: GeographicMarket[];
  categoryMarkets: GeographicMarket[];
  selectedCategory: string | null;
  selectedState: string | null;
  insights: Insight[];
  generatedAt: string;
}
