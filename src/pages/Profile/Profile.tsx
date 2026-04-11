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

type Tab = "orders" | "order-detail" | "addresses" | "settings" | "security";

const STATUS_STEPS: Order["status"][] = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
];

const STATUS_ICONS: Record<string, string> = {
  pending: "⏳",
  confirmed: "✅",
  processing: "🏭",
  shipped: "🚚",
  delivered: "📦",
  cancelled: "❌",
};

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, logout } = useAuth();

  // ───────── Address Form ─────────
  const [showAddressForm, setShowAddressForm] = useState(false);

  const [addressForm, setAddressForm] = useState({
    label: "",
    street: "",
    colony: "",
    city: "",
    state: "",
    zipCode: "",
    country: "México",
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
        country: "México",
      }));
    } catch {
      console.log("Zip no encontrado");
    }
  };

  const handleSaveAddress = async () => {
    try {
      await authService.addAddress(addressForm);

      setShowAddressForm(false);

      window.location.reload();
    } catch {
      alert("Error al guardar dirección");
    }
  };

  // ───────── State ─────────
  const [tab, setTab] = useState<Tab>("orders");
  const [selectedOrder, setOrder] = useState<Order | null>(null);
  const [savingProfile, setSaving] = useState(false);
  const [profileMsg, setMsg] = useState("");
  const [pwdForm, setPwd] = useState({
    current: "",
    next: "",
    confirm: "",
  });
  const [pwdMsg, setPwdMsg] = useState("");

  const [editForm, setEdit] = useState({
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    phone: user?.phone ?? "",
  });

  const { data: orders, loading } = useFetch<Order[]>(
    () => orderService.getOrders(),
    [],
  );

  const highlightOrderId = searchParams.get("order");

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const handleViewOrder = (order: Order) => {
    setOrder(order);
    setTab("order-detail");
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg("");

    try {
      await authService.updateProfile(editForm);
      setMsg("Perfil actualizado correctamente.");
    } catch {
      setMsg("Error al guardar. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg("");

    if (pwdForm.next !== pwdForm.confirm) {
      setPwdMsg("Las contraseñas no coinciden");
      return;
    }

    try {
      await authService.changePassword(pwdForm.current, pwdForm.next);

      setPwdMsg("✓ Contraseña actualizada.");

      setPwd({
        current: "",
        next: "",
        confirm: "",
      });
    } catch {
      setPwdMsg("Contraseña incorrecta");
    }
  };

  if (!user) return <Loader fullPage />;

  const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`;

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        {/* SIDEBAR */}
        <aside className={styles.sidebar}>
          <div className={styles.avatar}>
            <div className={styles.avatarCircle}>{initials}</div>

            <div>
              <p className={styles.userName}>
                {user.firstName} {user.lastName}
              </p>

              <p className={styles.userEmail}>{user.email}</p>
            </div>
          </div>

          <nav className={styles.sideNav}>
            <button onClick={() => setTab("orders")} className={styles.navItem}>
              Mis pedidos
            </button>

            <button
              onClick={() => setTab("addresses")}
              className={styles.navItem}
            >
              Direcciones
            </button>

            <button
              onClick={() => setTab("settings")}
              className={styles.navItem}
            >
              Mi información
            </button>

            <button
              onClick={() => setTab("security")}
              className={styles.navItem}
            >
              Seguridad
            </button>
          </nav>

          <Button variant="ghost" size="sm" fullWidth onClick={handleLogout}>
            Cerrar Sesión
          </Button>
        </aside>

        {/* CONTENT */}
        <main className={styles.content}>
          {/* ADDRESSES */}
          {tab === "addresses" && (
            <>
              <div className={styles.sectionHeader}>
                <h2 className={styles.contentTitle}>Mis Direcciones</h2>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAddressForm(true)}
                >
                  + Agregar Dirección
                </Button>
              </div>

              <div className={styles.addresses}>
                {user.addresses.map((a) => (
                  <div key={a.id} className={styles.addressCard}>
                    <p>{a.label}</p>
                    <p>{a.street}</p>
                    <p>
                      {a.city}, {a.state}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </main>
      </div>

      {/* MODAL */}
      {showAddressForm && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>Agregar Dirección</h3>

            <Input
              label="Nombre"
              value={addressForm.label}
              onChange={(e) =>
                setAddressForm({
                  ...addressForm,
                  label: e.target.value,
                })
              }
            />

            <Input
              label="Código Postal"
              value={addressForm.zipCode}
              onChange={(e) => {
                setAddressForm({
                  ...addressForm,
                  zipCode: e.target.value,
                });

                handleZipLookup(e.target.value);
              }}
            />

            <Input
              label="Calle y Número"
              value={addressForm.street}
              onChange={(e) =>
                setAddressForm({
                  ...addressForm,
                  street: e.target.value,
                })
              }
            />

            <Input
              label="Colonia"
              value={addressForm.city}
              onChange={(e) =>
                setAddressForm({
                  ...addressForm,
                  city: e.target.value,
                })
              }
            />

            <Input
              label="Ciudad"
              value={addressForm.colony}
              onChange={(e) =>
                setAddressForm({
                  ...addressForm,
                  colony: e.target.value,
                })
              }
            />

            <Input
              label="Estado"
              value={addressForm.state}
              onChange={(e) =>
                setAddressForm({
                  ...addressForm,
                  state: e.target.value,
                })
              }
            />

            <div className={styles.modalActions}>
              <Button variant="ghost" onClick={() => setShowAddressForm(false)}>
                Cancelar
              </Button>

              <Button variant="fill" onClick={handleSaveAddress}>
                Guardar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
