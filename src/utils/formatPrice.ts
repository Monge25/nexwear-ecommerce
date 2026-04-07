export const formatPrice = (amount: number, currency = 'USD'): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)

export const discountPercent = (original: number, sale: number): number =>
  Math.round((1 - sale / original) * 100)
