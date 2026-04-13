import apiClient from './apiClient'
import type { ReviewsResponse, CreateReviewData } from '@/types'

const reviewService = {
  async getByProduct(productId: string, page = 1): Promise<ReviewsResponse> {
    const { data } = await apiClient.get<ReviewsResponse>(`/Reviews/product/${productId}`, {
      params: { page, limit: 8 },
    })
    return data
  },

  async getSummary(productId: string): Promise<any> {
    const { data } = await apiClient.get(`/Reviews/product/${productId}/summary`)
    return data
  },

  async create(reviewData: CreateReviewData): Promise<{ id: string | number }> {
    const { data } = await apiClient.post<{ id: string | number }>(`/Reviews`, reviewData)
    return data
  },

  async markHelpful(reviewId: number): Promise<void> {
    await apiClient.post(`/Reviews/${reviewId}/helpful`).catch(() => {
      // endpoint opcional, fallo silencioso
    })
  },
}

export default reviewService