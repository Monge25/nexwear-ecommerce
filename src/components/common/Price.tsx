import React from 'react'
import { formatPrice, discountPercent } from '@/utils/formatPrice'
import styles from './Price.module.css'

interface PriceProps {
  price: number
  originalPrice?: number
  size?: 'sm' | 'md' | 'lg'
}

const Price: React.FC<PriceProps> = ({ price, originalPrice, size = 'md' }) => (
  <div className={`${styles.wrap} ${styles[size]}`}>
    {originalPrice ? (
      <>
        <span className={styles.original}>{formatPrice(originalPrice)}</span>
        <span className={styles.sale}>{formatPrice(price)}</span>
        <span className={styles.badge}>
          -{discountPercent(originalPrice, price)}%
        </span>
      </>
    ) : (
      <span className={styles.current}>{formatPrice(price)}</span>
    )}
  </div>
)

export default Price
