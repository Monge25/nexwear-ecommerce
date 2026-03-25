import React, { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useFetch } from '@/hooks/useFetch'
import reviewService from '@/services/reviewService'
import AuthModal from './AuthModal'
import styles from './ReviewSection.module.css'

interface Props { productId: string }

const stars = (n: number) => Array.from({ length: 5 }, (_, i) => (
  <span key={i} style={{ opacity: i < n ? 1 : 0.18, color: 'var(--dorado)', fontSize: '16px' }}>★</span>
))

const ReviewSection: React.FC<Props> = ({ productId }) => {
  const { isAuthenticated } = useAuth()
  const [page, setPage]           = useState(1)
  const [authOpen, setAuthOpen]   = useState(false)
  const [formOpen, setFormOpen]   = useState(false)
  const [rating, setRating]       = useState(5)
  const [hoverRating, setHover]   = useState(0)
  const [title, setTitle]         = useState('')
  const [body, setBody]           = useState('')
  const [submitting, setSub]      = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError]         = useState('')

  const { data, refetch } = useFetch(
    () => reviewService.getByProduct(productId, page),
    [productId, page],
  )

  const handleOpenForm = () => {
    if (!isAuthenticated) { setAuthOpen(true); return }
    setFormOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !body) { setError('Por favor completa todos los campos'); return }
    setSub(true); setError('')
    try {
      await reviewService.create(productId, { rating, title, body })
      setSubmitted(true); setFormOpen(false)
      setTitle(''); setBody(''); setRating(5)
      refetch()
    } catch { setError('Error al enviar la reseña') }
    finally { setSub(false) }
  }

  const dist = data?.ratingDistribution ?? {}
  const total = Object.values(dist).reduce((s, n) => s + n, 0)

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>Reseñas de Clientes</h2>
        <button className={styles.writeBtn} onClick={handleOpenForm}>
          + Escribir reseña
        </button>
      </div>

      {/* Summary */}
      {data && (
        <div className={styles.summary}>
          <div className={styles.avgBlock}>
            <p className={styles.avgNum}>{data.averageRating.toFixed(1)}</p>
            <div className={styles.avgStars}>{stars(Math.round(data.averageRating))}</div>
            <p className={styles.avgCount}>{data.total} reseñas</p>
          </div>
          <div className={styles.bars}>
            {[5,4,3,2,1].map((n) => {
              const cnt = dist[n] ?? 0
              const pct = total > 0 ? (cnt / total) * 100 : 0
              return (
                <div key={n} className={styles.barRow}>
                  <span className={styles.barLabel}>{n} ★</span>
                  <div className={styles.barTrack}><div className={styles.barFill} style={{ width: `${pct}%` }} /></div>
                  <span className={styles.barCount}>{cnt}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Write form */}
      {formOpen && (
        <form className={styles.form} onSubmit={handleSubmit}>
          <h3 className={styles.formTitle}>Tu reseña</h3>
          <div className={styles.ratingPicker}>
            <span className={styles.ratingLabel}>Calificación</span>
            <div className={styles.starPicker}>
              {[1,2,3,4,5].map((n) => (
                <button
                  key={n} type="button"
                  className={`${styles.starBtn} ${n <= (hoverRating || rating) ? styles.starOn : ''}`}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => setRating(n)}
                >★</button>
              ))}
              <span className={styles.ratingText}>
                {['','Muy malo','Malo','Regular','Bueno','Excelente'][hoverRating || rating]}
              </span>
            </div>
          </div>
          <div className={styles.field}>
            <label>Título de la reseña</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Resumen breve de tu experiencia" required />
          </div>
          <div className={styles.field}>
            <label>Tu reseña</label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Cuéntanos más sobre el producto, talla, calidad..." rows={4} required />
          </div>
          {error && <p className={styles.err}>{error}</p>}
          <div className={styles.formBtns}>
            <button type="button" className={styles.cancelBtn} onClick={() => setFormOpen(false)}>Cancelar</button>
            <button type="submit" className={styles.submitBtn} disabled={submitting}>
              {submitting ? 'Enviando…' : 'Publicar reseña'}
            </button>
          </div>
        </form>
      )}

      {submitted && (
        <div className={styles.successMsg}>✓ ¡Gracias! Tu reseña fue enviada y está en revisión.</div>
      )}

      {/* Reviews list */}
      <div className={styles.list}>
        {!data?.data.length ? (
          <p className={styles.empty}>Aún no hay reseñas. ¡Sé el primero!</p>
        ) : (
          data.data.map((r) => (
            <div key={r.id} className={styles.reviewCard}>
              <div className={styles.reviewTop}>
                <div className={styles.avatar}>
                  {r.userAvatar ? <img src={r.userAvatar} alt="" /> : r.userName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className={styles.reviewUser}>{r.userName}</p>
                  <div className={styles.reviewStars}>{stars(r.rating)}</div>
                </div>
                <div className={styles.reviewMeta}>
                  {r.verified && <span className={styles.verified}>✓ Compra verificada</span>}
                  <span className={styles.reviewDate}>{new Date(r.createdAt).toLocaleDateString('es-MX',{year:'numeric',month:'short',day:'numeric'})}</span>
                </div>
              </div>
              <h4 className={styles.reviewTitle}>{r.title}</h4>
              <p className={styles.reviewBody}>{r.body}</p>
              <button
                className={styles.helpfulBtn}
                onClick={() => reviewService.markHelpful(r.id)}
              >
                👍 Útil ({r.helpful})
              </button>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {data && data.total > 8 && (
        <div className={styles.pagination}>
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className={styles.pageBtn}>← Anterior</button>
          <span>{page} / {Math.ceil(data.total / 8)}</span>
          <button disabled={page >= Math.ceil(data.total / 8)} onClick={() => setPage((p) => p + 1)} className={styles.pageBtn}>Siguiente →</button>
        </div>
      )}

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        reason="Inicia sesión para escribir una reseña"
        onSuccess={() => setFormOpen(true)}
      />
    </section>
  )
}

export default ReviewSection
