import apiClient from './apiClient'
import type { ReviewsResponse, CreateReviewData } from '@/types'

const reviewService = {
  async getByProduct(productId: string, page = 1): Promise<ReviewsResponse> {
    const { data } = await apiClient.get<ReviewsResponse>(`/products/${productId}/reviews`, {
      params: { page, limit: 8 },
    })
    return data
  },

  async create(productId: string, review: CreateReviewData): Promise<void> {
    await apiClient.post(`/products/${productId}/reviews`, review)
  },

  async markHelpful(reviewId: number): Promise<void> {
    await apiClient.post(`/reviews/${reviewId}/helpful`)
  },
}

export default reviewService