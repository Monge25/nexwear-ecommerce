import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useFetch } from '@/hooks/useFetch'
import orderService from '@/services/orderService'
import authService from '@/services/authService'
import { formatPrice } from '@/utils/formatPrice'
import { ORDER_STATUS_LABELS } from '@/utils/constants'
import type { Order } from '@/types'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Loader from '@/components/ui/Loader'
import styles from './Profile.module.css'

type Tab = 'orders' | 'order-detail' | 'addresses' | 'settings' | 'security'

const STATUS_STEPS: Order['status'][] = ['pending','confirmed','processing','shipped','delivered']
const STATUS_ICONS: Record<string, string> = {
  pending: '⏳', confirmed: '✅', processing: '🏭', shipped: '🚚', delivered: '📦', cancelled: '❌',
}

const Profile: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, logout } = useAuth()

  const [tab, setTab]               = useState<Tab>('orders')
  const [selectedOrder, setOrder]   = useState<Order | null>(null)
  const [savingProfile, setSaving]  = useState(false)
  const [profileMsg, setMsg]        = useState('')
  const [pwdForm, setPwd]           = useState({ current: '', next: '', confirm: '' })
  const [pwdMsg, setPwdMsg]         = useState('')

  // Profile edit form
  const [editForm, setEdit] = useState({
    firstName: user?.firstName ?? '',
    lastName:  user?.lastName  ?? '',
    phone:     user?.phone     ?? '',
  })

  const { data: orders, loading } = useFetch(() => orderService.getOrders(), [])

  // Highlight order from URL param (post-checkout redirect)
  const highlightOrderId = searchParams.get('order')

  const handleLogout = async () => { await logout(); navigate('/') }

  const handleViewOrder = (order: Order) => { setOrder(order); setTab('order-detail') }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setMsg('')
    try {
      await authService.updateProfile(editForm)
      setMsg('Perfil actualizado correctamente.')
    } catch { setMsg('Error al guardar. Inténtalo de nuevo.') }
    finally { setSaving(false) }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault(); setPwdMsg('')
    if (pwdForm.next !== pwdForm.confirm) { setPwdMsg('Las contraseñas no coinciden'); return }
    if (pwdForm.next.length < 8) { setPwdMsg('Mínimo 8 caracteres'); return }
    try {
      await authService.changePassword(pwdForm.current, pwdForm.next)
      setPwdMsg('✓ Contraseña actualizada.')
      setPwd({ current: '', next: '', confirm: '' })
    } catch { setPwdMsg('Contraseña actual incorrecta.') }
  }

  if (!user) return <Loader fullPage />

  const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        {/* ── Sidebar ── */}
        <aside className={styles.sidebar}>
          <div className={styles.avatar}>
            <div className={styles.avatarCircle}>{initials}</div>
            <div>
              <p className={styles.userName}>{user.firstName} {user.lastName}</p>
              <p className={styles.userEmail}>{user.email}</p>
              {user.role === 'Admin' && (
                <button className={styles.adminBadge} onClick={() => navigate('/Admin')}>Admin ↗</button>
              )}
            </div>
          </div>
          <nav className={styles.sideNav}>
            {([
              ['orders',    '📦', 'Mis Pedidos', orders?.length ?? 0],
              ['addresses', '📍', 'Direcciones', null],
              ['settings',  '✏️', 'Mi Información', null],
              ['security',  '🔒', 'Seguridad', null],
            ] as [Tab, string, string, number | null][]).map(([t, icon, label, count]) => (
              <button
                key={t}
                className={`${styles.navItem} ${tab === t || (tab === 'order-detail' && t === 'orders') ? styles.navItemOn : ''}`}
                onClick={() => { setTab(t); if (t === 'orders') setOrder(null) }}
              >
                <span>{icon}</span>
                <span>{label}</span>
                {count !== null && count > 0 && <span className={styles.navCount}>{count}</span>}
              </button>
            ))}
          </nav>
          <Button variant="ghost" size="sm" fullWidth onClick={handleLogout}>Cerrar Sesión</Button>
        </aside>

        {/* ── Content ── */}
        <main className={styles.content}>

          {/* ─── ORDERS LIST ─── */}
          {tab === 'orders' && (
            <>
              <h2 className={styles.contentTitle}>Mis Pedidos</h2>
              {loading ? <Loader /> : !orders?.length ? (
                <div className={styles.empty}>
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth=".9">
                    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
                  </svg>
                  <p>No tienes pedidos aún</p>
                  <Button onClick={() => navigate('/productos')}>Explorar Tienda</Button>
                </div>
              ) : (
                <div className={styles.orders}>
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className={`${styles.order} ${order.id === highlightOrderId ? styles.orderHighlight : ''}`}
                      onClick={() => handleViewOrder(order)}
                    >
                      <div className={styles.orderTop}>
                        <div>
                          <p className={styles.orderId}>Pedido #{order.id.slice(-8).toUpperCase()}</p>
                          <p className={styles.orderDate}>{new Date(order.createdAt).toLocaleDateString('es-MX',{year:'numeric',month:'long',day:'numeric'})}</p>
                        </div>
                        <div className={styles.orderRight}>
                          <span className={`${styles.statusBadge} ${styles[`st_${order.status}`]}`}>
                            {STATUS_ICONS[order.status]} {ORDER_STATUS_LABELS[order.status]}
                          </span>
                          <p className={styles.orderTotal}>{formatPrice(order.total)}</p>
                        </div>
                      </div>
                      <div className={styles.orderThumbs}>
                        {order.items.slice(0,4).map((item, i) => (
                          <div key={i} className={styles.orderThumb}>
                            {item.imageUrl && <img src={item.imageUrl} alt={item.productName} />}
                          </div>
                        ))}
                        {order.items.length > 4 && <div className={styles.orderThumbMore}>+{order.items.length - 4}</div>}
                      </div>
                      <p className={styles.orderViewLink}>Ver detalle →</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ─── ORDER DETAIL ─── */}
          {tab === 'order-detail' && selectedOrder && (
            <>
              <div className={styles.detailHeader}>
                <button className={styles.backBtn} onClick={() => { setTab('orders'); setOrder(null) }}>← Mis Pedidos</button>
                <h2 className={styles.contentTitle} style={{ margin: 0 }}>
                  Pedido #{selectedOrder.id.slice(-8).toUpperCase()}
                </h2>
              </div>

              {/* Status timeline */}
              {selectedOrder.status !== 'cancelled' && (
                <div className={styles.timeline}>
                  {STATUS_STEPS.map((s, i) => {
                    const idx = STATUS_STEPS.indexOf(selectedOrder.status as Order['status'])
                    const done = i <= idx
                    const active = i === idx
                    return (
                      <React.Fragment key={s}>
                        <div className={`${styles.timeStep} ${done ? styles.timeStepDone : ''} ${active ? styles.timeStepActive : ''}`}>
                          <div className={styles.timeCircle}>{done ? '✓' : i + 1}</div>
                          <span className={styles.timeLabel}>{ORDER_STATUS_LABELS[s]}</span>
                        </div>
                        {i < STATUS_STEPS.length - 1 && (
                          <div className={`${styles.timeLine} ${done && i < idx ? styles.timeLineFill : ''}`} />
                        )}
                      </React.Fragment>
                    )
                  })}
                </div>
              )}
              {selectedOrder.status === 'cancelled' && (
                <div className={styles.cancelledBanner}>❌ Pedido cancelado</div>
              )}

              {/* Tracking */}
              {selectedOrder.trackingNumber && (
                <div className={styles.trackingBox}>
                  🚚 Número de rastreo: <strong>{selectedOrder.trackingNumber}</strong>
                </div>
              )}

              {/* Items */}
              <div className={styles.detailSection}>
                <h3 className={styles.secLabel}>Artículos ({selectedOrder.items.length})</h3>
                {selectedOrder.items.map((item, i) => (
                  <div key={i} className={styles.detailItem}>
                    <div className={styles.detailImg}>
                      {item.imageUrl && <img src={item.imageUrl} alt={item.productName} />}
                    </div>
                    <div className={styles.detailItemInfo}>
                      <p className={styles.detailItemName}>{item.productName}</p>
                      <p className={styles.detailItemMeta}>Talla: {item.size} · Color: {item.color} · Cant: {item.quantity}</p>
                    </div>
                    <span className={styles.detailItemPrice}>{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              {/* Totals + Shipping */}
              <div className={styles.detailGrid}>
                <div className={styles.detailSection}>
                  <h3 className={styles.secLabel}>Dirección de envío</h3>
                  <p>{selectedOrder.shippingAddress.street}</p>
                  <p>{selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state} {selectedOrder.shippingAddress.zipCode}</p>
                  <p>{selectedOrder.shippingAddress.country}</p>
                </div>
                <div className={styles.detailSection}>
                  <h3 className={styles.secLabel}>Resumen</h3>
                  <div className={styles.sumRow}><span>Subtotal</span><span>{formatPrice(selectedOrder.subtotal)}</span></div>
                  <div className={styles.sumRow}><span>Envío</span><span>{selectedOrder.shipping === 0 ? '¡Gratis!' : formatPrice(selectedOrder.shipping)}</span></div>
                  <div className={`${styles.sumRow} ${styles.sumTotal}`}><span>Total</span><span>{formatPrice(selectedOrder.total)}</span></div>
                </div>
              </div>
            </>
          )}

          {/* ─── ADDRESSES ─── */}
          {tab === 'addresses' && (
            <>
              <h2 className={styles.contentTitle}>Mis Direcciones</h2>
              {!user.addresses.length ? (
                <div className={styles.empty}><p>No tienes direcciones guardadas</p></div>
              ) : (
                <div className={styles.addresses}>
                  {user.addresses.map((a) => (
                    <div key={a.id} className={`${styles.addressCard} ${a.isDefault ? styles.defaultAddr : ''}`}>
                      {a.isDefault && <span className={styles.defaultBadge}>Principal</span>}
                      <p className={styles.addrLabel}>{a.label}</p>
                      <p>{a.street}</p>
                      <p>{a.city}, {a.state} {a.zipCode}</p>
                      <p>{a.country}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ─── SETTINGS ─── */}
          {tab === 'settings' && (
            <>
              <h2 className={styles.contentTitle}>Mi Información</h2>
              <form className={styles.settingsForm} onSubmit={handleSaveProfile}>
                <div className={styles.formGrid}>
                  <Input label="Nombre" value={editForm.firstName} onChange={(e) => setEdit((f) => ({ ...f, firstName: e.target.value }))} />
                  <Input label="Apellido" value={editForm.lastName} onChange={(e) => setEdit((f) => ({ ...f, lastName: e.target.value }))} />
                </div>
                <Input label="Email" value={user.email} disabled hint="El email no puede cambiarse desde aquí" />
                <Input label="Teléfono" value={editForm.phone} onChange={(e) => setEdit((f) => ({ ...f, phone: e.target.value }))} placeholder="+52 55 1234 5678" />
                <div className={styles.fieldInfo}><span>Miembro desde</span><strong>{new Date(user.createdAt).toLocaleDateString('es-MX',{year:'numeric',month:'long'})}</strong></div>
                {profileMsg && <p className={profileMsg.startsWith('Error') ? styles.errMsg : styles.okMsg}>{profileMsg}</p>}
                <Button type="submit" variant="fill" loading={savingProfile}>Guardar cambios</Button>
              </form>
            </>
          )}

          {/* ─── SECURITY ─── */}
          {tab === 'security' && (
            <>
              <h2 className={styles.contentTitle}>Seguridad</h2>
              <form className={styles.settingsForm} onSubmit={handleChangePassword}>
                <Input label="Contraseña actual" type="password" value={pwdForm.current} onChange={(e) => setPwd((f) => ({ ...f, current: e.target.value }))} required />
                <Input label="Nueva contraseña" type="password" value={pwdForm.next} onChange={(e) => setPwd((f) => ({ ...f, next: e.target.value }))} required hint="Mínimo 8 caracteres" />
                <Input label="Confirmar nueva contraseña" type="password" value={pwdForm.confirm} onChange={(e) => setPwd((f) => ({ ...f, confirm: e.target.value }))} required />
                {pwdMsg && <p className={pwdMsg.startsWith('✓') ? styles.okMsg : styles.errMsg}>{pwdMsg}</p>}
                <Button type="submit" variant="fill">Actualizar contraseña</Button>
              </form>
              <div className={styles.dangerZone}>
                <h3 className={styles.secLabel}>Zona de peligro</h3>
                <Button variant="outline" size="sm" style={{ borderColor: 'var(--rojo)', color: 'var(--rojo)' } as React.CSSProperties}>
                  Eliminar cuenta
                </Button>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}

export default Profile
