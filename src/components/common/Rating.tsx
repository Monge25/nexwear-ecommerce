import React from 'react'
import styles from './Rating.module.css'

interface RatingProps {
  value: number
  count?: number
  size?: 'sm' | 'md'
}

const Rating: React.FC<RatingProps> = ({ value, count, size = 'sm' }) => (
  <div className={`${styles.wrap} ${styles[size]}`}>
    <div className={styles.stars}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={styles.star}
          style={{ opacity: n <= Math.round(value) ? 1 : 0.2 }}
        >
          ★
        </span>
      ))}
    </div>
    {count !== undefined && (
      <span className={styles.count}>
        {value.toFixed(1)} · {count} reseñas
      </span>
    )}
  </div>
)

export default Rating
