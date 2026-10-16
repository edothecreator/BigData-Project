import type { BusinessApiError } from "@/lib/businesses/types";

/** Aggregate-only contract: no review documents or personal identifiers. */
export interface ReviewAnalytics {
  available: boolean;
  totalReviews: number | null;
  averageReviewRating: number | null;
  usefulVotes: number;
  dateSpan: { earliest: string; latest: string } | null;
  ratingDistribution: { stars: number; count: number }[];
  reviewsOverTime: { year: string; count: number }[];
  topBusinesses: {
    businessId: string;
    name: string;
    city: string;
    state: string;
    reviewCount: number;
  }[];
  generatedAt: string;
}

export type ReviewApiError = BusinessApiError;
