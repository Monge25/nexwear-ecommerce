import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useFetch } from "@/hooks/useFetch";
import orderService from "@/services/orderService";
import authService from "@/services/authService";
import { formatPrice } from "@/utils/formatPrice";
import { ORDER_STATUS_LABELS } from "@/utils/constants";
import type { Order } from "@/types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Loader from "@/components/ui/Loader";
import styles from "./Profile.module.css";
import {
  ShoppingBag,
  MapPin,
  User,
  Shield,
  LogOut,
  ChevronRight,
  Package,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
} from "lucide-react";

type Tab = "orders" | "order-detail" | "addresses" | "settings" | "security";

const STATUS_STEPS = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
];

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock size={14} />,
  confirmed: <CheckCircle size={14} />,
  processing: <Package size={14} />,
  shipped: <Truck size={14} />,
  delivered: <CheckCircle size={14} />,
  cancelled: <XCircle size={14} />,
  paid: <CheckCircle size={14} />,
};

const NAV_ITEMS: { tab: Tab; label: string; icon: React.ReactNode }[] = [
  { tab: "orders", label: "Mis pedidos", icon: <ShoppingBag size={14} /> },
  { tab: "addresses", label: "Direcciones", icon: <MapPin size={14} /> },
  { tab: "settings", label: "Mi información", icon: <User size={14} /> },
  { tab: "security", label: "Seguridad", icon: <Shield size={14} /> },
];

const formatPhoneMX = (value: string) => {
  const numbers = value.replace(/\D/g, "").slice(0, 10);
  const parts = [];
  if (numbers.length > 0) parts.push(numbers.slice(0, 3));
  if (numbers.length > 3) parts.push(numbers.slice(3, 6));
  if (numbers.length > 6) parts.push(numbers.slice(6, 10));
  return parts.join(" ");
};

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, logout } = useAuth();

  const [tab, setTab] = useState<Tab>("orders");
  const [selectedOrder, setOrder] = useState<Order | null>(null);

  const { data: orders, loading: ordersLoading } = useFetch<Order[]>(
    () => orderService.getOrders(),
    [],
  );
  const highlightOrderId = searchParams.get("order");

  const {
    data: addressesData,
    loading: addressesLoading,
    refetch: refetchAddresses,
  } = useFetch(() => authService.getAddresses(), []);
  const addresses: any[] = addressesData ?? [];

  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressError, setAddressError] = useState("");
  const [addressForm, setAddressForm] = useState({
    alias: "",
    street: "",
    interior: "",
    city: "",
    state: "",
    zipCode: "",
    country: "México",
    phone: "",
    isDefault: false,
  });

  const handleZipLookup = async (zip: string) => {
    if (zip.length !== 5) return;
    try {
      const res = await fetch(`https://api.zippopotam.us/MX/${zip}`);
      const data = await res.json();
      setAddressForm((prev) => ({
        ...prev,
        city: data.places[0]["place name"],
        state: data.places[0]["state"],
      }));
    } catch {
      /* silencioso */
    }
  };

  const resetAddressForm = () => {
    setAddressForm({
      alias: "",
      street: "",
      interior: "",
      city: "",
      state: "",
      zipCode: "",
      country: "México",
      phone: "",
      isDefault: false,
    });
    setAddressError("");
  };

  const handleSaveAddress = async () => {
    if (!addressForm.alias || !addressForm.street || !addressForm.city) {
      setAddressError("Por favor completa los campos obligatorios.");
      return;
    }
    setAddressSaving(true);
    setAddressError("");
    try {
      await authService.addAddress(addressForm);
      setShowAddressForm(false);
      resetAddressForm();
      refetchAddresses();
    } catch {
      setAddressError("Error al guardar la dirección. Inténtalo de nuevo.");
    } finally {
      setAddressSaving(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await authService.setDefaultAddress(id);
      refetchAddresses();
    } catch {
      alert("Error al actualizar la dirección predeterminada.");
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!confirm("¿Eliminar esta dirección?")) return;
    try {
      await authService.deleteAddress(id);
      refetchAddresses();
    } catch {
      alert("Error al eliminar la dirección.");
    }
  };

  const [savingProfile, setSaving] = useState(false);
  const [profileMsg, setMsg] = useState("");
  const [editForm, setEdit] = useState({
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    phone: user?.phone ?? "",
  });

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      await authService.updateProfile(editForm);
      setMsg("✓ Perfil actualizado correctamente.");
    } catch {
      setMsg("Error al guardar. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const [pwdForm, setPwd] = useState({ current: "", next: "", confirm: "" });
  const [pwdMsg, setPwdMsg] = useState("");

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg("");
    if (pwdForm.next !== pwdForm.confirm) {
      setPwdMsg("Las contraseñas no coinciden.");
      return;
    }
    try {
      await authService.changePassword(pwdForm.current, pwdForm.next);
      setPwdMsg("✓ Contraseña actualizada.");
      setPwd({ current: "", next: "", confirm: "" });
    } catch {
      setPwdMsg("Contraseña actual incorrecta.");
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const handleViewOrder = (order: Order) => {
    setOrder(order);
    setTab("order-detail");
  };

  const getStepClass = (step: string, currentStatus: string) => {
    const si = STATUS_STEPS.indexOf(step);
    const ci = STATUS_STEPS.indexOf(currentStatus?.toLowerCase());
    if (si < ci) return styles.timeStepDone;
    if (si === ci) return styles.timeStepActive;
    return "";
  };

  if (!user) return <Loader fullPage />;
  const initials =
    `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        {/* ── SIDEBAR ── */}
        <aside className={styles.sidebar}>
          <div className={styles.avatar}>
            <div className={styles.avatarCircle}>{initials}</div>
            <div>
              <p className={styles.userName}>
                {user.firstName} {user.lastName}
              </p>
              <p className={styles.userEmail}>{user.email}</p>
              {user.role === "Admin" && (
                <button
                  className={styles.adminBadge}
                  onClick={() => navigate("/admin")}
                >
                  Admin Panel →
                </button>
              )}
            </div>
          </div>

          <nav className={styles.sideNav}>
            {NAV_ITEMS.map(({ tab: t, label, icon }) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`${styles.navItem} ${
                  tab === t || (tab === "order-detail" && t === "orders")
                    ? styles.navItemOn
                    : ""
                }`}
              >
                <span className={styles.navIcon}>{icon}</span>
                {label}
                {t === "orders" && orders && orders.length > 0 && (
                  <span className={styles.navCount}>{orders.length}</span>
                )}
                {t === "addresses" && addresses.length > 0 && (
                  <span className={styles.navCount}>{addresses.length}</span>
                )}
              </button>
            ))}
          </nav>

          <div className={styles.sidebarFoot}>
            <button className={styles.logoutBtn} onClick={handleLogout}>
              <LogOut size={13} />
              Cerrar sesión
            </button>
          </div>
        </aside>

        {/* ── CONTENT ── */}
        <main className={styles.content}>
          {/* ── ORDERS ── */}
          {tab === "orders" && (
            <>
              <div className={styles.tabHeader}>
                <h2 className={styles.contentTitle}>Mis Pedidos</h2>
                {orders && (
                  <span className={styles.countLabel}>
                    {orders.length} pedido{orders.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {ordersLoading ? (
                <Loader />
              ) : !orders?.length ? (
                <div className={styles.empty}>
                  <ShoppingBag size={48} strokeWidth={1} />
                  <p>Aún no tienes pedidos</p>
                  <button
                    className={styles.emptyBtn}
                    onClick={() => navigate("/productos")}
                  >
                    Explorar productos →
                  </button>
                </div>
              ) : (
                <div className={styles.orders}>
                  {orders.map((o) => (
                    <div
                      key={o.id}
                      className={`${styles.order} ${String(o.id) === highlightOrderId ? styles.orderHighlight : ""}`}
                      onClick={() => handleViewOrder(o)}
                    >
                      <div className={styles.orderTop}>
                        <div>
                          <p className={styles.orderId}>
                            {o.orderNumber ??
                              `Pedido #${String(o.id).slice(-8).toUpperCase()}`}
                          </p>
                          <p className={styles.orderDate}>
                            {new Date(o.createdAt).toLocaleDateString("es-MX", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                        <div className={styles.orderRight}>
                          <span className={styles.orderTotal}>
                            {formatPrice(o.total)}
                          </span>
                          <span
                            className={`${styles.statusBadge} ${styles[`st_${o.status?.toLowerCase()}`]}`}
                          >
                            {STATUS_ICONS[o.status?.toLowerCase()] ?? (
                              <Package size={14} />
                            )}
                            {o.status}
                          </span>
                        </div>
                      </div>

                      {o.items?.length > 0 && (
                        <div className={styles.orderThumbs}>
                          {o.items.slice(0, 4).map((item, i) => (
                            <div key={i} className={styles.orderThumb}>
                              {item.imageUrl ? (
                                <img
                                  src={item.imageUrl}
                                  alt={item.productName}
                                />
                              ) : (
                                <div
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    background: "var(--g100)",
                                  }}
                                />
                              )}
                            </div>
                          ))}
                          {o.items.length > 4 && (
                            <div className={styles.orderThumbMore}>
                              +{o.items.length - 4}
                            </div>
                          )}
                        </div>
                      )}

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <span className={styles.orderViewLink}>
                          Ver detalle
                        </span>
                        <ChevronRight size={12} color="var(--dorado)" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── ORDER DETAIL ── */}
          {tab === "order-detail" && selectedOrder && (
            <>
              <div className={styles.detailHeader}>
                <button
                  className={styles.backBtn}
                  onClick={() => setTab("orders")}
                >
                  ← Volver
                </button>
                <h2 className={styles.contentTitle} style={{ margin: 0 }}>
                  {selectedOrder.orderNumber ??
                    `Pedido #${String(selectedOrder.id).slice(-8).toUpperCase()}`}
                </h2>
                <span
                  className={`${styles.statusBadge} ${styles[`st_${selectedOrder.status?.toLowerCase()}`]}`}
                >
                  {STATUS_ICONS[selectedOrder.status?.toLowerCase()] ?? (
                    <Package size={14} />
                  )}
                  {selectedOrder.status}
                </span>
              </div>

              {selectedOrder.status?.toLowerCase() !== "cancelled" ? (
                <div className={styles.timeline}>
                  {STATUS_STEPS.map((step, i) => (
                    <React.Fragment key={step}>
                      <div
                        className={`${styles.timeStep} ${getStepClass(step, selectedOrder.status)}`}
                      >
                        <div className={styles.timeCircle}>
                          {STATUS_ICONS[step]}
                        </div>
                        <span className={styles.timeLabel}>
                          {ORDER_STATUS_LABELS[
                            step as keyof typeof ORDER_STATUS_LABELS
                          ] ?? step}
                        </span>
                      </div>
                      {i < STATUS_STEPS.length - 1 && (
                        <div
                          className={`${styles.timeLine} ${
                            STATUS_STEPS.indexOf(
                              selectedOrder.status?.toLowerCase(),
                            ) > i
                              ? styles.timeLineFill
                              : ""
                          }`}
                        />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              ) : (
                <div className={styles.cancelledBanner}>
                  ✕ Este pedido fue cancelado.
                </div>
              )}

              {selectedOrder.trackingNumber && (
                <div className={styles.trackingBox}>
                  📦 Número de rastreo:{" "}
                  <strong>{selectedOrder.trackingNumber}</strong>
                </div>
              )}

              {/* Productos */}
              <div className={styles.detailSection}>
                <p className={styles.secLabel}>Productos</p>
                {selectedOrder.items.map((item) => (
                  <div key={item.id} className={styles.detailItem}>
                    <div className={styles.detailImg}>
                      {item.imageUrl && (
                        <img src={item.imageUrl} alt={item.productName} />
                      )}
                    </div>
                    <div>
                      <p className={styles.detailItemName}>
                        {item.productName}
                      </p>
                      <p className={styles.detailItemMeta}>
                        Talla {item.variantSize} · {item.variantColor} · ×
                        {item.quantity}
                      </p>
                    </div>
                    <p className={styles.detailItemPrice}>
                      {formatPrice(item.unitPrice * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Resumen */}
              <div className={styles.detailSection}>
                <p className={styles.secLabel}>Resumen</p>
                {selectedOrder.subtotal != null && (
                  <div className={styles.sumRow}>
                    <span>Subtotal</span>
                    <span>{formatPrice(selectedOrder.subtotal)}</span>
                  </div>
                )}
                {selectedOrder.shipping != null && (
                  <div className={styles.sumRow}>
                    <span>Envío</span>
                    <span>
                      {selectedOrder.shipping === 0
                        ? "Gratis"
                        : formatPrice(selectedOrder.shipping)}
                    </span>
                  </div>
                )}
                <div className={`${styles.sumRow} ${styles.sumTotal}`}>
                  <span>Total</span>
                  <span>{formatPrice(selectedOrder.total)}</span>
                </div>
              </div>

              {/* Dirección */}
              {selectedOrder.shippingAddress && (
                <div className={styles.detailSection}>
                  <p className={styles.secLabel}>Dirección de envío</p>
                  <p
                    style={{
                      fontSize: 14,
                      color: "var(--g600)",
                      lineHeight: 1.6,
                    }}
                  >
                    {selectedOrder.shippingAddress}
                  </p>
                </div>
              )}

              {/* Info de pago */}
              <div className={styles.detailSection}>
                <p className={styles.secLabel}>Información del pago</p>
                <div className={styles.sumRow}>
                  <span>Método</span>
                  <span style={{ textTransform: "capitalize" }}>
                    {selectedOrder.paymentMethod}
                  </span>
                </div>
                <div className={styles.sumRow}>
                  <span>Fecha</span>
                  <span>
                    {new Date(selectedOrder.createdAt).toLocaleDateString(
                      "es-MX",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      },
                    )}
                  </span>
                </div>
                {selectedOrder.paidAt && (
                  <div className={styles.sumRow}>
                    <span>Pagado el</span>
                    <span>
                      {new Date(selectedOrder.paidAt).toLocaleDateString(
                        "es-MX",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        },
                      )}
                    </span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── ADDRESSES ── */}
          {tab === "addresses" && (
            <>
              <div className={styles.tabHeader}>
                <h2 className={styles.contentTitle}>Mis Direcciones</h2>
                <button
                  className={styles.addBtn}
                  onClick={() => setShowAddressForm(true)}
                >
                  + Agregar dirección
                </button>
              </div>

              {addressesLoading ? (
                <Loader />
              ) : !addresses.length ? (
                <div className={styles.empty}>
                  <MapPin size={48} strokeWidth={1} />
                  <p>No tienes direcciones guardadas</p>
                </div>
              ) : (
                <div className={styles.addresses}>
                  {addresses.map((a: any) => (
                    <div
                      key={a.id}
                      className={`${styles.addressCard} ${a.isDefault ? styles.defaultAddr : ""}`}
                    >
                      {a.isDefault && (
                        <span className={styles.defaultBadge}>
                          ✓ Predeterminada
                        </span>
                      )}
                      <p className={styles.addrLabel}>{a.alias ?? a.label}</p>
                      <p>
                        {a.street}
                        {a.interior ? `, ${a.interior}` : ""}
                      </p>
                      <p>
                        {a.city}, {a.state} {a.zipCode}
                      </p>
                      <p>{a.country}</p>
                      {a.phone && (
                        <p
                          style={{
                            fontSize: 11,
                            color: "var(--g400)",
                            marginTop: 4,
                          }}
                        >
                          {a.phone}
                        </p>
                      )}
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          marginTop: 14,
                          paddingTop: 12,
                          borderTop: "1px solid var(--g100)",
                        }}
                      >
                        {!a.isDefault && (
                          <button
                            onClick={() => handleSetDefault(String(a.id))}
                            style={{
                              fontSize: 10,
                              letterSpacing: ".1em",
                              textTransform: "uppercase",
                              background: "none",
                              border: "1px solid var(--g200)",
                              padding: "5px 12px",
                              cursor: "pointer",
                              color: "var(--g600)",
                              fontFamily: "var(--font-body)",
                              transition: "all .2s",
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.borderColor =
                                "var(--negro)")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.borderColor =
                                "var(--g200)")
                            }
                          >
                            Predeterminar
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteAddress(String(a.id))}
                          style={{
                            fontSize: 10,
                            letterSpacing: ".1em",
                            textTransform: "uppercase",
                            background: "none",
                            border: "none",
                            padding: "5px 4px",
                            cursor: "pointer",
                            color: "var(--rojo)",
                            fontFamily: "var(--font-body)",
                            marginLeft: "auto",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.opacity = ".7")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.opacity = "1")
                          }
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── SETTINGS ── */}
          {tab === "settings" && (
            <>
              <div className={styles.tabHeader}>
                <h2 className={styles.contentTitle}>Mi Información</h2>
              </div>
              <form
                className={styles.settingsForm}
                onSubmit={handleSaveProfile}
              >
                <div className={styles.formGrid}>
                  <Input
                    label="Nombre"
                    value={editForm.firstName}
                    onChange={(e) =>
                      setEdit({ ...editForm, firstName: e.target.value })
                    }
                  />
                  <Input
                    label="Apellido"
                    value={editForm.lastName}
                    onChange={(e) =>
                      setEdit({ ...editForm, lastName: e.target.value })
                    }
                  />
                </div>
                <Input
                  label="Teléfono"
                  value={editForm.phone}
                  onChange={(e) =>
                    setEdit({ ...editForm, phone: e.target.value })
                  }
                />
                <div className={styles.fieldInfo}>
                  <span>Correo electrónico</span>
                  <span>{user.email}</span>
                </div>
                {profileMsg && (
                  <p
                    className={
                      profileMsg.startsWith("✓") ? styles.okMsg : styles.errMsg
                    }
                  >
                    {profileMsg}
                  </p>
                )}
                <div>
                  <Button
                    type="submit"
                    variant="fill"
                    size="sm"
                    loading={savingProfile}
                  >
                    Guardar cambios
                  </Button>
                </div>
              </form>
            </>
          )}

          {/* ── SECURITY ── */}
          {tab === "security" && (
            <>
              <div className={styles.tabHeader}>
                <h2 className={styles.contentTitle}>Seguridad</h2>
              </div>
              <form
                className={styles.settingsForm}
                onSubmit={handleChangePassword}
              >
                <Input
                  label="Contraseña actual"
                  type="password"
                  value={pwdForm.current}
                  onChange={(e) =>
                    setPwd({ ...pwdForm, current: e.target.value })
                  }
                />
                <Input
                  label="Nueva contraseña"
                  type="password"
                  value={pwdForm.next}
                  onChange={(e) => setPwd({ ...pwdForm, next: e.target.value })}
                />
                <Input
                  label="Confirmar nueva contraseña"
                  type="password"
                  value={pwdForm.confirm}
                  onChange={(e) =>
                    setPwd({ ...pwdForm, confirm: e.target.value })
                  }
                />
                {pwdMsg && (
                  <p
                    className={
                      pwdMsg.startsWith("✓") ? styles.okMsg : styles.errMsg
                    }
                  >
                    {pwdMsg}
                  </p>
                )}
                <div>
                  <Button type="submit" variant="fill" size="sm">
                    Actualizar contraseña
                  </Button>
                </div>
              </form>

              <div className={styles.dangerZone}>
                <p className={styles.secLabel}>Zona de peligro</p>
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--g400)",
                    marginBottom: 14,
                  }}
                >
                  Una vez que elimines tu cuenta, no hay forma de recuperarla.
                </p>
                <Button variant="ghost" size="sm">
                  Eliminar cuenta
                </Button>
              </div>
            </>
          )}
        </main>
      </div>

      {/* ── MODAL DIRECCIÓN ── */}
      {showAddressForm && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <button
              className={styles.modalClose}
              onClick={() => {
                setShowAddressForm(false);
                resetAddressForm();
              }}
            >
              ✕
            </button>
            <h3 className={styles.modalTitle}>Nueva Dirección</h3>

            <div className={styles.grid2}>
              <Input
                label="Alias *"
                placeholder="Casa, Oficina…"
                value={addressForm.alias}
                onChange={(e) =>
                  setAddressForm({ ...addressForm, alias: e.target.value })
                }
              />
              <Input
                label="Teléfono de contacto"
                placeholder="+52 662 000 0000"
                value={addressForm.phone}
                onChange={(e) =>
                  setAddressForm({
                    ...addressForm,
                    phone: formatPhoneMX(e.target.value),
                  })
                }
              />
            </div>

            <Input
              label="Calle y Número exterior *"
              placeholder="Av. Reforma 123"
              value={addressForm.street}
              onChange={(e) =>
                setAddressForm({ ...addressForm, street: e.target.value })
              }
            />

            <div className={styles.grid2}>
              <Input
                label="Número interior (opcional)"
                placeholder="Depto. 4B"
                value={addressForm.interior}
                onChange={(e) =>
                  setAddressForm({ ...addressForm, interior: e.target.value })
                }
              />
              <Input
                label="Código Postal"
                placeholder="83000"
                value={addressForm.zipCode}
                onChange={(e) => {
                  setAddressForm({ ...addressForm, zipCode: e.target.value });
                  handleZipLookup(e.target.value);
                }}
              />
            </div>

            <div className={styles.grid2}>
              <Input
                label="Ciudad *"
                value={addressForm.city}
                onChange={(e) =>
                  setAddressForm({ ...addressForm, city: e.target.value })
                }
              />
              <Input
                label="Estado"
                value={addressForm.state}
                onChange={(e) =>
                  setAddressForm({ ...addressForm, state: e.target.value })
                }
              />
            </div>

            <Input
              label="País"
              value={addressForm.country}
              onChange={(e) =>
                setAddressForm({ ...addressForm, country: e.target.value })
              }
            />

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 13,
                color: "var(--g600)",
                cursor: "pointer",
                marginTop: 8,
              }}
            >
              <input
                type="checkbox"
                checked={addressForm.isDefault}
                onChange={(e) =>
                  setAddressForm({
                    ...addressForm,
                    isDefault: e.target.checked,
                  })
                }
                style={{ accentColor: "var(--negro)", width: 15, height: 15 }}
              />
              Establecer como dirección predeterminada
            </label>

            {addressError && (
              <p style={{ fontSize: 12, color: "var(--rojo)", marginTop: 10 }}>
                {addressError}
              </p>
            )}

            <div className={styles.modalActions}>
              <button
                onClick={() => {
                  setShowAddressForm(false);
                  resetAddressForm();
                }}
                disabled={addressSaving}
              >
                Cancelar
              </button>
              <button onClick={handleSaveAddress} disabled={addressSaving}>
                {addressSaving ? "Guardando…" : "Guardar dirección"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
