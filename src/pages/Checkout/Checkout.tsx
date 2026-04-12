import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/hooks/useCart";
import { useFetch } from "@/hooks/useFetch";
import { formatPrice } from "@/utils/formatPrice";
import Button from "@/components/ui/Button";
import addressService, { Address } from "@/services/addressService";
import MercadoPagoForm from "@/components/payments/MercadoPagoForm";
import styles from "./Checkout.module.css";

const formatPhone = (value: string) => {
  const numbers = value.replace(/\D/g, "").slice(0, 10);
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 6) return `${numbers.slice(0, 3)} ${numbers.slice(3)}`;
  return `${numbers.slice(0, 3)} ${numbers.slice(3, 6)} ${numbers.slice(6)}`;
};

const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidPhone = (phone: string) => phone.replace(/\D/g, "").length === 10;
const isValidZip = (zip: string) => /^\d{5}$/.test(zip);

type Step = "shipping" | "payment";

const Checkout: React.FC = () => {
  const navigate = useNavigate();
  const { availableItems, subtotal, shipping, total, clearCart } = useCart();

  const [step, setStep] = useState<Step>("shipping");
  const [error, setError] = useState("");
  const [selectedAddressId, setSelectedAddrId] = useState<string | undefined>();
  const [saveNewAddress, setSaveNewAddress] = useState(false);
  const [addressAlias, setAddressAlias] = useState("");

  const { data: addresses = [] } = useFetch<Address[]>(
    () => addressService.getUserAddresses(),
    [],
  );

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    street: "",
    colony: "",
    city: "",
    state: "",
    zipCode: "",
    country: "México",
  });

  const set =
    (key: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((f) => ({ ...f, [key]: e.target.value }));
      if (selectedAddressId) setSelectedAddrId(undefined);
    };

  const handleZipCode = (zip: string) => {
    if (zip.length !== 5) return;
    setTimeout(async () => {
      try {
        const res = await fetch(`https://api.zippopotam.us/MX/${zip}`);
        if (!res.ok) return;
        const data = await res.json();
        const place = data.places?.[0];
        if (place) {
          setForm((f) => ({
            ...f,
            city: place["place name"],
            state: place.state,
            country: "México",
          }));
        }
      } catch {
        /* silencioso */
      }
    }, 500);
  };

  const handleSelectAddress = (addr: Address) => {
    setSelectedAddrId(String(addr.id));
    setForm((f) => ({
      ...f,
      street: addr.street,
      colony: addr.interior ?? "",
      city: addr.city,
      state: addr.state,
      zipCode: addr.zipCode,
      country: addr.country,
      phone: addr.phone ?? f.phone,
    }));
  };

  const handleContinue = () => {
    if (!form.firstName.trim()) return setError("Ingresa tu nombre");
    if (!form.lastName.trim()) return setError("Ingresa tu apellido");
    if (!isValidEmail(form.email)) return setError("Ingresa un email válido");
    if (!isValidPhone(form.phone))
      return setError("Ingresa un teléfono válido de 10 dígitos");
    if (!form.street.trim()) return setError("Ingresa la calle y número");
    if (!form.city.trim()) return setError("Ingresa la ciudad");
    if (!form.state.trim()) return setError("Ingresa el estado");
    if (!isValidZip(form.zipCode))
      return setError("Código postal inválido, debe ser 5 dígitos");

    setError("");
    setStep("payment");
  };

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.left}>
          <h1 className={styles.title}>Checkout</h1>

          {/* Step nav */}
          <div className={styles.stepNav}>
            {(["shipping", "payment"] as Step[]).map((s, i) => (
              <React.Fragment key={s}>
                <div
                  className={`${styles.stepItem} ${step === s ? styles.stepActive : ""}`}
                >
                  <span className={styles.stepNum}>{i + 1}</span>
                  <span className={styles.stepLabel}>
                    {["Envío", "Pago"][i]}
                  </span>
                </div>
                {i < 1 && <div className={styles.stepLine} />}
              </React.Fragment>
            ))}
          </div>

          {/* ── SHIPPING ── */}
          {step === "shipping" && (
            <div className={styles.stepContent}>
              <h2 className={styles.stepTitle}>Dirección de envío</h2>

              {/* Direcciones guardadas */}
              {Array.isArray(addresses) && addresses.length > 0 && (
                <div className={styles.savedAddresses}>
                  <p className={styles.savedTitle}>Direcciones guardadas</p>
                  <div className={styles.addressGrid}>
                    {addresses.map((addr) => (
                      <div
                        key={addr.id}
                        className={`${styles.addressCard} ${
                          selectedAddressId === String(addr.id)
                            ? styles.addressCardSelected
                            : ""
                        }`}
                        onClick={() => handleSelectAddress(addr)}
                      >
                        {addr.isDefault && (
                          <span className={styles.defaultBadge}>
                            ✓ Predeterminada
                          </span>
                        )}
                        <strong>{addr.alias ?? addr.label}</strong>
                        <p>
                          {addr.street}
                          {addr.interior ? `, ${addr.interior}` : ""}
                        </p>
                        <p>
                          {addr.city}, {addr.state} {addr.zipCode}
                        </p>
                        {addr.phone && <p>{addr.phone}</p>}
                      </div>
                    ))}
                  </div>

                  <div className={styles.divider}>
                    <span>o ingresa una nueva dirección</span>
                  </div>
                </div>
              )}

              {/* Formulario */}
              <div className={styles.grid2}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Nombre</label>
                  <input
                    className={styles.formInput}
                    value={form.firstName}
                    onChange={set("firstName")}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Apellido</label>
                  <input
                    className={styles.formInput}
                    value={form.lastName}
                    onChange={set("lastName")}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Email</label>
                <input
                  className={styles.formInput}
                  value={form.email}
                  placeholder="correo@ejemplo.com"
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      email: e.target.value.toLowerCase(),
                    }))
                  }
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Teléfono</label>
                <input
                  className={styles.formInput}
                  value={form.phone}
                  placeholder="644 245 5275"
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      phone: formatPhone(e.target.value),
                    }))
                  }
                />
              </div>

              <div className={styles.grid2}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Calle y número</label>
                  <input
                    className={styles.formInput}
                    value={form.street}
                    onChange={set("street")}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Colonia / Interior</label>
                  <input
                    className={styles.formInput}
                    value={form.colony}
                    onChange={set("colony")}
                  />
                </div>
              </div>

              <div className={styles.grid2}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Ciudad</label>
                  <input
                    className={styles.formInput}
                    value={form.city}
                    onChange={set("city")}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Estado</label>
                  <input
                    className={styles.formInput}
                    value={form.state}
                    onChange={set("state")}
                  />
                </div>
              </div>

              <div className={styles.grid2}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Código Postal</label>
                  <input
                    className={styles.formInput}
                    value={form.zipCode}
                    onChange={(e) => {
                      set("zipCode")(e);
                      handleZipCode(e.target.value);
                    }}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>País</label>
                  <input
                    className={styles.formInput}
                    value={form.country}
                    onChange={set("country")}
                  />
                </div>
              </div>

              {/* Guardar dirección nueva */}
              {!selectedAddressId && (
                <>
                  <label className={styles.checkLabel}>
                    <input
                      type="checkbox"
                      checked={saveNewAddress}
                      onChange={(e) => setSaveNewAddress(e.target.checked)}
                      style={{ accentColor: "var(--negro)" }}
                    />
                    Guardar esta dirección para futuros pedidos
                  </label>

                  {saveNewAddress && (
                    <div className={styles.formGroup} style={{ marginTop: 8 }}>
                      <label className={styles.formLabel}>
                        Alias de la dirección
                      </label>
                      <input
                        className={styles.formInput}
                        placeholder="Casa, Oficina…"
                        value={addressAlias}
                        onChange={(e) => setAddressAlias(e.target.value)}
                      />
                    </div>
                  )}
                </>
              )}

              {error && <p className={styles.error}>{error}</p>}

              <div className={styles.btnRow}>
                <Button variant="ghost" onClick={() => navigate("/")}>
                  ← Volver
                </Button>
                <Button variant="fill" onClick={handleContinue}>
                  Continuar con el Pago →
                </Button>
              </div>
            </div>
          )}

          {/* ── PAYMENT ── */}
          {step === "payment" && (
            <div className={styles.stepContent}>
              <h2 className={styles.stepTitle}>Método de pago</h2>

              {/* Resumen dirección seleccionada */}
              <div className={styles.shippingResume}>
                <p className={styles.shippingResumeLabel}>Enviando a</p>
                <p className={styles.shippingResumeText}>
                  {form.street}
                  {form.colony ? `, ${form.colony}` : ""} · {form.city},{" "}
                  {form.state} {form.zipCode}
                </p>
                <button
                  className={styles.shippingResumeEdit}
                  onClick={() => setStep("shipping")}
                >
                  Cambiar
                </button>
              </div>

              {error && <p className={styles.error}>{error}</p>}

              <MercadoPagoForm
                addressId={selectedAddressId}
                street={!selectedAddressId ? form.street : undefined}
                interior={!selectedAddressId ? form.colony : undefined}
                city={!selectedAddressId ? form.city : undefined}
                state={!selectedAddressId ? form.state : undefined}
                zipCode={!selectedAddressId ? form.zipCode : undefined}
                country={!selectedAddressId ? form.country : undefined}
                phone={!selectedAddressId ? form.phone : undefined}
                saveAddress={!selectedAddressId ? saveNewAddress : undefined}
                addressAlias={
                  !selectedAddressId && saveNewAddress
                    ? addressAlias
                    : undefined
                }
                onSuccess={(orderId) => {
                  navigate(`/perfil?order=${orderId}`);
                  clearCart();
                }}
              />

              <div className={styles.btnRow}>
                <Button variant="ghost" onClick={() => setStep("shipping")}>
                  ← Volver
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* ── SUMMARY ── */}
        <aside className={styles.summary}>
          <h2 className={styles.sumTitle}>Tu pedido</h2>

          {availableItems.map((item) => (
            <div
              key={`${item.product.id}-${item.selectedSize}-${item.selectedColor.name}`}
              className={styles.sumItem}
            >
              <div
                className={styles.sumImg}
                style={{ background: item.selectedColor?.hex }}
              >
                {item.product.imageUrl && (
                  <img src={item.product.imageUrl} alt={item.product.name} />
                )}
                <span className={styles.sumQty}>{item.quantity}</span>
              </div>
              <div className={styles.sumItemInfo}>
                <p className={styles.sumName}>{item.product.name}</p>
                <p className={styles.sumMeta}>Talla: {item.selectedSize}</p>
                <p className={styles.sumMeta}>
                  Color: {item.selectedColor?.name}
                </p>
              </div>
              <span className={styles.sumPrice}>
                {formatPrice(item.product.price * item.quantity)}
              </span>
            </div>
          ))}

          <div className={styles.sumTotals}>
            <div className={styles.sumRow}>
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className={styles.sumRow}>
              <span>Envío</span>
              <span>{shipping === 0 ? "Gratis" : formatPrice(shipping)}</span>
            </div>
            <div className={`${styles.sumRow} ${styles.sumTotal}`}>
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Checkout;
