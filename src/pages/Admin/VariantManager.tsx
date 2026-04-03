import { useState, useRef, useEffect } from "react";
import styles from "./Admin.module.css";
import env from "@/config/environment";

const BASE = env.API_BASE_URL;

// ── Tipos ────────────────────────────────────────────────────
interface VariantForm {
  color: string;
  colorHex: string;
  size: string;
  stock: number;
  priceModifier: number;
  imageFile: File | null;
}

interface Variant {
  id: string;
  color?: string;
  colorHex?: string;
  size?: string;
  stock: number;
  priceModifier: number;
  finalPrice: number;
  imageUrl?: string;
  isActive: boolean;
}

interface VariantManagerProps {
  productId: string;
  basePrice: number;
  token: string;
  apiUrl: string | undefined;
}

const SIZES = [
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "36",
  "37",
  "38",
  "39",
  "40",
  "41",
  "42",
];

const blankVariant = (): VariantForm => ({
  color: "",
  colorHex: "#000000",
  size: "",
  stock: 0,
  priceModifier: 0,
  imageFile: null,
});

const variantToForm = (v: Variant): VariantForm => ({
  color: v.color ?? "",
  colorHex: v.colorHex ?? "#000000",
  size: v.size ?? "",
  stock: v.stock,
  priceModifier: v.priceModifier,
  imageFile: null,
});

export const VariantManager: React.FC<VariantManagerProps> = ({
  productId,
  basePrice,
  token,
  apiUrl,
}) => {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<VariantForm>(blankVariant());
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null); // ← id de variante en edición
  const [editForm, setEditForm] = useState<VariantForm>(blankVariant());
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Cargar variantes al montar ───────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(
          `${BASE}/products/${productId}/variants`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        const data = await res.json();
        setVariants(Array.isArray(data) ? data : []);
      } catch {
        setError("No se pudieron cargar las variantes.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [productId, apiUrl, token]);

  // ── Crear variante ───────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}/products/${productId}/variants`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          color: form.color || null,
          colorHex: form.colorHex || null,
          size: form.size || null,
          stock: form.stock,
          priceModifier: form.priceModifier,
        }),
      });
      if (!res.ok) throw new Error("Error al crear la variante");
      const variant: Variant = await res.json();

      if (form.imageFile) {
        const imgData = new FormData();
        imgData.append("file", form.imageFile);
        const imgRes = await fetch(
          `${BASE}/products/${productId}/variants/${variant.id}/image`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: imgData,
          },
        );
        if (imgRes.ok) {
          const withImg: Variant = await imgRes.json();
          setVariants((v) => [...v, withImg]);
        } else {
          setVariants((v) => [...v, variant]);
        }
      } else {
        setVariants((v) => [...v, variant]);
      }

      setForm(blankVariant());
      setShowForm(false);
      if (fileRef.current) fileRef.current.value = "";
    } catch {
      setError("Ocurrió un error al guardar la variante.");
    } finally {
      setSaving(false);
    }
  };

  // ── Guardar edición ──────────────────────────────────────────
  const handleSaveEdit = async (variantId: string) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `${BASE}/products/${productId}/variants/${variantId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            color: editForm.color || null,
            colorHex: editForm.colorHex || null,
            size: editForm.size || null,
            stock: editForm.stock,
            priceModifier: editForm.priceModifier,
          }),
        },
      );
      if (!res.ok) throw new Error("Error al actualizar la variante");
      const updated: Variant = await res.json();

      // Subir imagen si se seleccionó una nueva
      if (editForm.imageFile) {
        const imgData = new FormData();
        imgData.append("file", editForm.imageFile);
        const imgRes = await fetch(
          `${BASE}/products/${productId}/variants/${variantId}/image`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: imgData,
          },
        );
        if (imgRes.ok) {
          const withImg: Variant = await imgRes.json();
          setVariants((v) => v.map((x) => (x.id === variantId ? withImg : x)));
        } else {
          setVariants((v) => v.map((x) => (x.id === variantId ? updated : x)));
        }
      } else {
        setVariants((v) => v.map((x) => (x.id === variantId ? updated : x)));
      }

      setEditingId(null);
    } catch {
      setError("No se pudo actualizar la variante.");
    } finally {
      setSaving(false);
    }
  };

  // ── Subir/reemplazar imagen ──────────────────────────────────
  const handleImageUpload = async (variantId: string, file: File) => {
    setUploadingId(variantId);
    setError(null);
    try {
      const imgData = new FormData();
      imgData.append("file", file);
      const res = await fetch(
        `${BASE}/products/${productId}/variants/${variantId}/image`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: imgData,
        },
      );
      if (!res.ok) throw new Error("Error al subir imagen");
      const updated: Variant = await res.json();
      setVariants((v) => v.map((x) => (x.id === variantId ? updated : x)));
    } catch {
      setError("No se pudo subir la imagen.");
    } finally {
      setUploadingId(null);
    }
  };

  // ── Eliminar variante ────────────────────────────────────────
  const handleDelete = async (variantId: string) => {
    if (!confirm("¿Eliminar esta variante?")) return;
    try {
      await fetch(`${BASE}/products/${productId}/variants/${variantId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setVariants((v) => v.filter((x) => x.id !== variantId));
    } catch {
      setError("No se pudo eliminar la variante.");
    }
  };

  // ── Formulario de edición inline ─────────────────────────────
  const renderEditForm = (v: Variant) => (
    <div
      style={{
        background: "#fafafa",
        border: "0.5px solid #e8e8e8",
        borderRadius: 8,
        padding: 16,
        marginTop: 10,
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 500,
          marginBottom: 12,
          color: "#111",
        }}
      >
        Editando variante
      </div>

      <div className={styles.grid2} style={{ marginBottom: 12 }}>
        <div className={styles.fieldWrap}>
          <label className={styles.fieldLabel}>Color</label>
          <input
            className={styles.fieldInput}
            value={editForm.color}
            onChange={(e) =>
              setEditForm((f) => ({ ...f, color: e.target.value }))
            }
            placeholder="Negro"
          />
        </div>
        <div className={styles.fieldWrap}>
          <label className={styles.fieldLabel}>Código HEX</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="color"
              value={editForm.colorHex}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, colorHex: e.target.value }))
              }
              style={{
                width: 38,
                height: 38,
                padding: 2,
                border: "0.5px solid #e8e8e8",
                borderRadius: 6,
                cursor: "pointer",
              }}
            />
            <input
              className={styles.fieldInput}
              value={editForm.colorHex}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, colorHex: e.target.value }))
              }
              placeholder="#000000"
              style={{ flex: 1 }}
            />
          </div>
        </div>
      </div>

      <div className={styles.grid2} style={{ marginBottom: 12 }}>
        <div className={styles.fieldWrap}>
          <label className={styles.fieldLabel}>Talla</label>
          <div
            style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}
          >
            {SIZES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() =>
                  setEditForm((f) => ({ ...f, size: f.size === s ? "" : s }))
                }
                style={{
                  padding: "4px 10px",
                  fontSize: 12,
                  border: "0.5px solid",
                  borderRadius: 6,
                  cursor: "pointer",
                  borderColor: editForm.size === s ? "#111" : "#d4d4d4",
                  background: editForm.size === s ? "#111" : "#fff",
                  color: editForm.size === s ? "#fff" : "#555",
                  fontWeight: editForm.size === s ? 500 : 400,
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.fieldWrap}>
          <label className={styles.fieldLabel}>Stock</label>
          <input
            className={styles.fieldInput}
            type="number"
            min={0}
            value={editForm.stock}
            onChange={(e) =>
              setEditForm((f) => ({ ...f, stock: Number(e.target.value) }))
            }
          />
        </div>
      </div>

      <div className={styles.grid2} style={{ marginBottom: 12 }}>
        <div className={styles.fieldWrap}>
          <label className={styles.fieldLabel}>
            Modificador de precio (MXN)
          </label>
          <input
            className={styles.fieldInput}
            type="number"
            step={0.01}
            value={editForm.priceModifier}
            onChange={(e) =>
              setEditForm((f) => ({
                ...f,
                priceModifier: Number(e.target.value),
              }))
            }
          />
          <div className={styles.hint}>
            Precio final: ${(basePrice + editForm.priceModifier).toFixed(2)} MXN
          </div>
        </div>
        <div className={styles.fieldWrap}>
          <label className={styles.fieldLabel}>Nueva imagen (opcional)</label>
          <input
            className={styles.fieldInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) =>
              setEditForm((f) => ({
                ...f,
                imageFile: e.target.files?.[0] ?? null,
              }))
            }
          />
          {v.imageUrl && !editForm.imageFile && (
            <div style={{ marginTop: 6 }}>
              <img
                src={v.imageUrl}
                alt=""
                style={{
                  width: 48,
                  height: 48,
                  objectFit: "cover",
                  borderRadius: 6,
                  border: "0.5px solid #e8e8e8",
                }}
              />
            </div>
          )}
          {editForm.imageFile && (
            <div style={{ fontSize: 11, color: "#15803d", marginTop: 4 }}>
              ✓ {editForm.imageFile.name}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <button
          type="button"
          className={styles.btnGhost}
          onClick={() => setEditingId(null)}
          disabled={saving}
        >
          Cancelar
        </button>
        <button
          type="button"
          className={styles.btnFill}
          onClick={() => handleSaveEdit(v.id)}
          disabled={saving}
        >
          {saving ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </div>
  );

  return (
    <div className={styles.formCard}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <div className={styles.formTitle} style={{ marginBottom: 0 }}>
          Variantes del producto
        </div>
        <button
          className={styles.btnFill}
          style={{ padding: "6px 14px", fontSize: 13 }}
          onClick={() => {
            setShowForm((v) => !v);
            setEditingId(null);
          }}
        >
          {showForm ? "Cancelar" : "+ Agregar variante"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            background: "#fff0f0",
            border: "0.5px solid #fca5a5",
            borderRadius: 8,
            padding: "10px 14px",
            color: "#b91c1c",
            fontSize: 13,
            marginBottom: 14,
          }}
        >
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div
          style={{
            color: "#9a9a9a",
            fontSize: 13,
            textAlign: "center",
            padding: "20px 0",
          }}
        >
          Cargando variantes…
        </div>
      )}

      {/* Formulario nueva variante */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          style={{
            background: "#fafafa",
            border: "0.5px solid #e8e8e8",
            borderRadius: 8,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 500,
              marginBottom: 12,
              color: "#111",
            }}
          >
            Nueva variante
          </div>

          <div className={styles.grid2} style={{ marginBottom: 12 }}>
            <div className={styles.fieldWrap}>
              <label className={styles.fieldLabel}>Color</label>
              <input
                className={styles.fieldInput}
                value={form.color}
                onChange={(e) =>
                  setForm((f) => ({ ...f, color: e.target.value }))
                }
                placeholder="Negro"
              />
            </div>
            <div className={styles.fieldWrap}>
              <label className={styles.fieldLabel}>Código HEX</label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="color"
                  value={form.colorHex}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, colorHex: e.target.value }))
                  }
                  style={{
                    width: 38,
                    height: 38,
                    padding: 2,
                    border: "0.5px solid #e8e8e8",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                />
                <input
                  className={styles.fieldInput}
                  value={form.colorHex}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, colorHex: e.target.value }))
                  }
                  placeholder="#000000"
                  style={{ flex: 1 }}
                />
              </div>
            </div>
          </div>

          <div className={styles.grid2} style={{ marginBottom: 12 }}>
            <div className={styles.fieldWrap}>
              <label className={styles.fieldLabel}>Talla</label>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                  marginTop: 4,
                }}
              >
                {SIZES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({ ...f, size: f.size === s ? "" : s }))
                    }
                    style={{
                      padding: "4px 10px",
                      fontSize: 12,
                      border: "0.5px solid",
                      borderRadius: 6,
                      cursor: "pointer",
                      borderColor: form.size === s ? "#111" : "#d4d4d4",
                      background: form.size === s ? "#111" : "#fff",
                      color: form.size === s ? "#fff" : "#555",
                      fontWeight: form.size === s ? 500 : 400,
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.fieldWrap}>
              <label className={styles.fieldLabel}>Stock *</label>
              <input
                className={styles.fieldInput}
                type="number"
                min={0}
                value={form.stock}
                onChange={(e) =>
                  setForm((f) => ({ ...f, stock: Number(e.target.value) }))
                }
                required
              />
            </div>
          </div>

          <div className={styles.grid2} style={{ marginBottom: 12 }}>
            <div className={styles.fieldWrap}>
              <label className={styles.fieldLabel}>
                Modificador de precio (MXN)
              </label>
              <input
                className={styles.fieldInput}
                type="number"
                step={0.01}
                value={form.priceModifier}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    priceModifier: Number(e.target.value),
                  }))
                }
              />
              <div className={styles.hint}>
                Precio final: ${(basePrice + form.priceModifier).toFixed(2)} MXN
              </div>
            </div>
            <div className={styles.fieldWrap}>
              <label className={styles.fieldLabel}>
                Imagen de esta variante
              </label>
              <input
                ref={fileRef}
                className={styles.fieldInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    imageFile: e.target.files?.[0] ?? null,
                  }))
                }
              />
              <div className={styles.hint}>JPG, PNG o WebP · máx 5MB</div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button
              type="button"
              className={styles.btnGhost}
              onClick={() => {
                setShowForm(false);
                setForm(blankVariant());
              }}
              disabled={saving}
            >
              Cancelar
            </button>
            <button type="submit" className={styles.btnFill} disabled={saving}>
              {saving ? "Guardando…" : "Guardar variante"}
            </button>
          </div>
        </form>
      )}

      {/* Lista vacía */}
      {!loading && variants.length === 0 && !showForm && (
        <div
          style={{
            color: "#999",
            fontSize: 13,
            textAlign: "center",
            padding: "20px 0",
          }}
        >
          Sin variantes todavía. Agrega la primera.
        </div>
      )}

      {/* Lista de variantes */}
      {!loading && variants.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {variants.map((v) => (
            <div key={v.id}>
              {/* Fila de variante */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 14px",
                  border: `0.5px solid ${editingId === v.id ? "#0a0a0a" : "#e8e8e8"}`,
                  borderRadius: editingId === v.id ? "8px 8px 0 0" : 8,
                  background: v.isActive ? "#fff" : "#fafafa",
                  opacity: v.isActive ? 1 : 0.55,
                }}
              >
                {/* Color swatch */}
                {v.colorHex && (
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: v.colorHex,
                      border: "0.5px solid #e8e8e8",
                      flexShrink: 0,
                    }}
                  />
                )}

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "#111" }}>
                    {[v.color, v.size].filter(Boolean).join(" · ") ||
                      "Sin nombre"}
                  </div>
                  <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                    Stock: {v.stock} · Precio: ${v.finalPrice.toFixed(2)} MXN
                    {v.priceModifier !== 0 && (
                      <span
                        style={{
                          color: v.priceModifier > 0 ? "#b45309" : "#15803d",
                        }}
                      >
                        {" "}
                        ({v.priceModifier > 0 ? "+" : ""}
                        {v.priceModifier})
                      </span>
                    )}
                    {!v.isActive && (
                      <span style={{ color: "#ef4444", marginLeft: 8 }}>
                        · Inactiva
                      </span>
                    )}
                  </div>
                </div>

                {/* Imagen preview */}
                <div style={{ flexShrink: 0 }}>
                  {v.imageUrl ? (
                    <img
                      src={v.imageUrl}
                      alt={v.color ?? "variante"}
                      style={{
                        width: 44,
                        height: 44,
                        objectFit: "cover",
                        borderRadius: 6,
                        border: "0.5px solid #e8e8e8",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 6,
                        border: "0.5px dashed #d4d4d4",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 10,
                        color: "#bbb",
                      }}
                    >
                      Sin img
                    </div>
                  )}
                </div>

                {/* Acciones */}
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  {/* Editar */}
                  <button
                    onClick={() => {
                      if (editingId === v.id) {
                        setEditingId(null);
                      } else {
                        setEditingId(v.id);
                        setEditForm(variantToForm(v));
                        setShowForm(false);
                      }
                    }}
                    style={{
                      fontSize: 12,
                      padding: "5px 10px",
                      border: `0.5px solid ${editingId === v.id ? "#0a0a0a" : "#d4d4d4"}`,
                      borderRadius: 6,
                      cursor: "pointer",
                      color: editingId === v.id ? "#fff" : "#555",
                      background: editingId === v.id ? "#0a0a0a" : "#fff",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {editingId === v.id ? "Cerrar" : "Editar"}
                  </button>

                  {/* Subir imagen rápida (solo si no está en edición) */}
                  {editingId !== v.id && (
                    <label
                      style={{
                        fontSize: 12,
                        padding: "5px 10px",
                        border: "0.5px solid #d4d4d4",
                        borderRadius: 6,
                        cursor: "pointer",
                        color: "#555",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {uploadingId === v.id
                        ? "Subiendo…"
                        : v.imageUrl
                          ? "Cambiar img"
                          : "Subir img"}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        style={{ display: "none" }}
                        disabled={uploadingId === v.id}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(v.id, file);
                        }}
                      />
                    </label>
                  )}

                  {/* Eliminar */}
                  <button
                    onClick={() => handleDelete(v.id)}
                    style={{
                      fontSize: 12,
                      padding: "5px 10px",
                      border: "0.5px solid #fca5a5",
                      borderRadius: 6,
                      cursor: "pointer",
                      color: "#b91c1c",
                      background: "#fff",
                    }}
                  >
                    Eliminar
                  </button>
                </div>
              </div>

              {/* Formulario de edición inline */}
              {editingId === v.id && renderEditForm(v)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};