import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import authService from '@/services/authService'
import styles from './AuthModal.module.css'

type View = 'login' | 'register' | 'forgot'

interface AuthModalProps {
  open: boolean
  onClose: () => void
  /** Message shown above the form, e.g. "Inicia sesión para añadir favoritos" */
  reason?: string
  onSuccess?: () => void
}

const AuthModal: React.FC<AuthModalProps> = ({ open, onClose, reason, onSuccess }) => {
  const { login, register } = useAuth()
  const navigate = useNavigate()

  const [view, setView]           = useState<View>('login')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState('')

  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [firstName, setFirst]     = useState('')
  const [lastName, setLast]       = useState('')
  const [confirm, setConfirm]     = useState('')

  const reset = () => { setError(''); setSuccess('') }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); reset(); setLoading(true)
    try {
      await login({ email, password })
      onSuccess?.()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Credenciales incorrectas')
    } finally { setLoading(false) }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault(); reset()
    if (password !== confirm) { setError('Las contraseñas no coinciden'); return }
    if (password.length < 8)  { setError('Mínimo 8 caracteres'); return }
    setLoading(true)
    try {
      await register({ firstName, lastName, email, password, confirmPassword: confirm })
      onSuccess?.()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrarse')
    } finally { setLoading(false) }
  }

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault(); reset(); setLoading(true)
    try {
      await authService.requestPasswordReset(email)
      setSuccess('Revisa tu correo, te enviamos el enlace.')
    } catch {
      setError('No encontramos ese correo.')
    } finally { setLoading(false) }
  }

  if (!open) return null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <button className={styles.close} onClick={onClose}>✕</button>

        {/* Brand */}
        <p className={styles.logo}>Nexwear</p>

        {/* Reason hint */}
        {reason && <p className={styles.reason}>{reason}</p>}

        {/* Tab switcher */}
        {view !== 'forgot' && (
          <div className={styles.tabs}>
            <button className={`${styles.tab} ${view === 'login' ? styles.tabOn : ''}`} onClick={() => { setView('login'); reset() }}>Iniciar Sesión</button>
            <button className={`${styles.tab} ${view === 'register' ? styles.tabOn : ''}`} onClick={() => { setView('register'); reset() }}>Crear Cuenta</button>
          </div>
        )}

        {/* ── LOGIN ── */}
        {view === 'login' && (
          <form className={styles.form} onSubmit={handleLogin}>
            <div className={styles.field}>
              <label>Correo electrónico</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ana@ejemplo.com" required />
            </div>
            <div className={styles.field}>
              <label>Contraseña</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            <button type="button" className={styles.forgotLink} onClick={() => { setView('forgot'); reset() }}>
              ¿Olvidaste tu contraseña?
            </button>
            {error && <p className={styles.err}>{error}</p>}
            <button type="submit" className={styles.submit} disabled={loading}>
              {loading ? <span className={styles.spinner} /> : null}
              Iniciar Sesión
            </button>
            <p className={styles.orLine}><span>o continúa con</span></p>
            <button type="button" className={styles.social} onClick={() => window.location.href = '/auth/google'}>
              <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20H24v8h11.3C33.7 33 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3L37 10.1C33.4 6.9 28.9 5 24 5 13.5 5 5 13.5 5 24s8.5 19 19 19c10.5 0 19-8.5 19-19 0-1.3-.1-2.7-.4-4z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 19 13 24 13c3.1 0 5.8 1.1 7.9 3L37 10.1C33.4 6.9 28.9 5 24 5c-7.7 0-14.3 4.4-17.7 9.7z"/><path fill="#4CAF50" d="M24 43c4.9 0 9.4-1.9 12.8-4.9l-5.9-5c-2 1.4-4.4 2.1-6.9 2.1-5.3 0-9.7-3-11.3-7.4l-6.6 5.1C9.6 38.5 16.3 43 24 43z"/><path fill="#1976D2" d="M43.6 20H24v8h11.3c-.7 2.1-2 3.9-3.7 5.1l5.9 5C40.4 34.8 44 29.8 44 24c0-1.3-.1-2.7-.4-4z"/></svg>
              Google
            </button>
          </form>
        )}

        {/* ── REGISTER ── */}
        {view === 'register' && (
          <form className={styles.form} onSubmit={handleRegister}>
            <div className={styles.row2}>
              <div className={styles.field}>
                <label>Nombre</label>
                <input value={firstName} onChange={(e) => setFirst(e.target.value)} placeholder="Ana" required />
              </div>
              <div className={styles.field}>
                <label>Apellido</label>
                <input value={lastName} onChange={(e) => setLast(e.target.value)} placeholder="García" required />
              </div>
            </div>
            <div className={styles.field}>
              <label>Correo electrónico</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ana@ejemplo.com" required />
            </div>
            <div className={styles.field}>
              <label>Contraseña <span>(mín. 8 caracteres)</span></label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            <div className={styles.field}>
              <label>Confirmar contraseña</label>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" required />
            </div>
            {error && <p className={styles.err}>{error}</p>}
            <button type="submit" className={styles.submit} disabled={loading}>
              {loading ? <span className={styles.spinner} /> : null}
              Crear Cuenta Gratis
            </button>
            <p className={styles.terms}>Al registrarte aceptas nuestros <a href="#">Términos</a> y <a href="#">Privacidad</a>.</p>
          </form>
        )}

        {/* ── FORGOT ── */}
        {view === 'forgot' && (
          <form className={styles.form} onSubmit={handleForgot}>
            <p className={styles.forgotTitle}>Recuperar contraseña</p>
            <p className={styles.forgotSub}>Introduce tu correo y te enviaremos un enlace para restablecer tu contraseña.</p>
            {success ? (
              <div className={styles.successBox}>{success}</div>
            ) : (
              <>
                <div className={styles.field}>
                  <label>Correo electrónico</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ana@ejemplo.com" required />
                </div>
                {error && <p className={styles.err}>{error}</p>}
                <button type="submit" className={styles.submit} disabled={loading}>
                  {loading ? <span className={styles.spinner} /> : null}
                  Enviar enlace
                </button>
              </>
            )}
            <button type="button" className={styles.backLink} onClick={() => { setView('login'); reset() }}>
              ← Volver al inicio de sesión
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default AuthModal
