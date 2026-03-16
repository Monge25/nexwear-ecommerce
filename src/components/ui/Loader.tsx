import React from 'react'
import styles from './Loader.module.css'

interface LoaderProps {
  fullPage?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const Loader: React.FC<LoaderProps> = ({ fullPage = false, size = 'md' }) => {
  const ring = <span className={`${styles.ring} ${styles[size]}`} />
  if (fullPage) return <div className={styles.page}>{ring}</div>
  return ring
}

export default Loader
