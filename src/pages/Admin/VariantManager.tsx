import { useState, useRef, useEffect } from "react";
import styles from "./VariantManager.module.css";
import env from "@/config/environment";

const BASE = env.API_BASE_URL;

// ── Tipos ────────────────────────────────────────────────────

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
  isOnSale: boolean;
  salePrice: number;
}

interface ColorGroup {
  color: string;
  colorHex: string;
  imageUrl?: string;
  items: Variant[];
}

interface SizeEntry {
  size: string;
  stock: number;
  priceModifier: number;
  isOnSale: boolean;
  salePrice: number;
}

interface VariantManagerProps {
  productId: string;
  basePrice: number;
  token: string;
  apiUrl?: string;
}

// ── Constantes ───────────────────────────────────────────────

const SIZES = [
  "Unitalla",
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

// ── Helpers ──────────────────────────────────────────────────

function groupByColor(variants: Variant[]): ColorGroup[] {
  const map = new Map<string, ColorGroup>();
  for (const v of variants) {
    const key = `${v.color ?? ""}|${v.colorHex ?? ""}`;
    if (!map.has(key)) {
      map.set(key, {
        color: v.color ?? "",
        colorHex: v.colorHex ?? "#000000",
        imageUrl: v.imageUrl,
        items: [],
      });
    }
    map.get(key)!.items.push(v);
  }
  return Array.from(map.values());
}

function totalStock(items: Variant[]) {
  return items.reduce((s, v) => s + v.stock, 0);
}

function priceRange(items: Variant[], base: number) {
  const prices = items.map((v) => base + v.priceModifier);
  const mn = Math.min(...prices);
  const mx = Math.max(...prices);
  if (mn === mx) return `$${mn.toFixed(2)}`;
  return `$${mn.toFixed(2)} – $${mx.toFixed(2)}`;
}

// ── Componente principal ─────────────────────────────────────

export const VariantManager: React.FC<VariantManagerProps> = ({
  productId,
  basePrice,
  token,
}) => {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Formulario nueva variante
  const [showNewForm, setShowNewForm] = useState(false);
  const [newColor, setNewColor] = useState("");
  const [newHex, setNewHex] = useState("#000000");
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [newSizes, setNewSizes] = useState<SizeEntry[]>([]);
  const [savingNew, setSavingNew] = useState(false);
  const newFileRef = useRef<HTMLInputElement>(null);

  // Edición inline por grupo
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [editColor, setEditColor] = useState("");
  const [editHex, setEditHex] = useState("#000000");
  const [editSizes, setEditSizes] = useState<SizeEntry[]>([]);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Filtros
  const [filterColor, setFilterColor] = useState("");
  const [filterSize, setFilterSize] = useState("");

  // ── Cargar variantes ─────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${BASE}/products/${productId}/variants`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setVariants(Array.isArray(data) ? data : []);
      } catch {
        setError("No se pudieron cargar las variantes.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [productId, token]);

  // ── Crear variante: N llamadas POST (una por talla) ───────
  const handleCreate = async () => {
    if (!newColor.trim()) {
      setError("Ingresa un nombre de color.");
      return;
    }
    if (newSizes.length === 0) {
      setError("Selecciona al menos una talla.");
      return;
    }

    setSavingNew(true);
    setError(null);
    const created: Variant[] = [];

    try {
      for (const entry of newSizes) {
        const res = await fetch(`${BASE}/products/${productId}/variants`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            color: newColor.trim(),
            colorHex: newHex,
            size: entry.size,
            stock: entry.stock,
            priceModifier: entry.priceModifier,
            isOnSale: entry.isOnSale,
            salePrice: entry.isOnSale ? entry.salePrice : 0,
          }),
        });
        if (!res.ok) throw new Error(`Error al crear talla ${entry.size}`);
        const variant: Variant = await res.json();

        // Subir imagen solo en la primera talla del color
        if (newImageFile && created.length === 0) {
          const fd = new FormData();
          fd.append("file", newImageFile);
          const imgRes = await fetch(
            `${BASE}/products/${productId}/variants/${variant.id}/image`,
            {
              method: "POST",
              headers: { Authorization: `Bearer ${token}` },
              body: fd,
            },
          );
          if (imgRes.ok) {
            const withImg: Variant = await imgRes.json();
            created.push(withImg);
            continue;
          }
        }
        created.push(variant);
      }

      setVariants((prev) => [...prev, ...created]);
      resetNewForm();
    } catch (err: any) {
      setError(err.message ?? "Error al guardar variantes.");
    } finally {
      setSavingNew(false);
    }
  };

  const resetNewForm = () => {
    setShowNewForm(false);
    setNewColor("");
    setNewHex("#000000");
    setNewSizes([]);
    setNewImageFile(null);
    if (newFileRef.current) newFileRef.current.value = "";
  };

  // ── Abrir edición de un grupo ────────────────────────────
  const openEdit = (group: ColorGroup) => {
    setEditingGroup(group.color);
    setEditColor(group.color);
    setEditHex(group.colorHex);
    setEditImageFile(null);
    setEditSizes(
      group.items.map((v) => ({
        size: v.size ?? "",
        stock: v.stock,
        priceModifier: v.priceModifier,
        isOnSale: v.isOnSale ?? false,
        salePrice: v.salePrice ?? 0,
      })),
    );
    setShowNewForm(false);
  };

  // ── Guardar edición: PUT por cada variante del grupo ─────
  const handleSaveEdit = async (group: ColorGroup) => {
    setSavingEdit(true);
    setError(null);
    try {
      const updated: Variant[] = [];

      for (const item of group.items) {
        const entry = editSizes.find((e) => e.size === item.size);
        if (!entry) continue;

        const res = await fetch(
          `${BASE}/products/${productId}/variants/${item.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              color: editColor || null,
              colorHex: editHex || null,
              size: item.size,
              stock: entry.stock,
              priceModifier: entry.priceModifier,
              isOnSale: entry.isOnSale,
              salePrice: entry.isOnSale ? entry.salePrice : 0,
            }),
          },
        );
        if (!res.ok) throw new Error(`Error al actualizar talla ${item.size}`);
        let v: Variant = await res.json();

        // Subir nueva imagen solo en la primera variante del grupo
        if (editImageFile && updated.length === 0) {
          const fd = new FormData();
          fd.append("file", editImageFile);
          const imgRes = await fetch(
            `${BASE}/products/${productId}/variants/${item.id}/image`,
            {
              method: "POST",
              headers: { Authorization: `Bearer ${token}` },
              body: fd,
            },
          );
          if (imgRes.ok) v = await imgRes.json();
        }

        updated.push(v);
      }

      setVariants((prev) => {
        const without = prev.filter((v) => v.color !== group.color);
        return [...without, ...updated];
      });
      setEditingGroup(null);
    } catch (err: any) {
      setError(err.message ?? "Error al actualizar variantes.");
    } finally {
      setSavingEdit(false);
    }
  };

  // ── Agregar talla nueva al grupo en edición ───────────────
  const handleAddSizeToEdit = async (group: ColorGroup, size: string) => {
    setSavingEdit(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}/products/${productId}/variants`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          color: editColor || group.color,
          colorHex: editHex || group.colorHex,
          size,
          stock: 0,
          priceModifier: editSizes[0]?.priceModifier ?? 0,
          isOnSale: false,
          salePrice: 0,
        }),
      });
      if (!res.ok) throw new Error("Error al agregar talla");
      const newVariant: Variant = await res.json();
      setVariants((prev) => [...prev, newVariant]);
      setEditSizes((prev) => [
        ...prev,
        {
          size,
          stock: 0,
          priceModifier: editSizes[0]?.priceModifier ?? 0,
          isOnSale: false,
          salePrice: 0,
        },
      ]);
    } catch (err: any) {
      setError(err.message ?? "Error al agregar talla.");
    } finally {
      setSavingEdit(false);
    }
  };

  // ── Eliminar talla individual ────────────────────────────
  const handleDeleteSize = async (variantId: string) => {
    if (!confirm("¿Eliminar esta talla?")) return;
    const deleted = variants.find((v) => v.id === variantId);
    try {
      await fetch(`${BASE}/products/${productId}/variants/${variantId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setVariants((prev) => prev.filter((v) => v.id !== variantId));
      if (deleted) {
        setEditSizes((prev) => prev.filter((e) => e.size !== deleted.size));
      }
    } catch {
      setError("No se pudo eliminar la talla.");
    }
  };

  // ── Eliminar grupo entero ────────────────────────────────
  const handleDeleteGroup = async (group: ColorGroup) => {
    if (!confirm(`¿Eliminar todas las variantes de "${group.color}"?`)) return;
    try {
      await Promise.all(
        group.items.map((v) =>
          fetch(`${BASE}/products/${productId}/variants/${v.id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          }),
        ),
      );
      setVariants((prev) => prev.filter((v) => v.color !== group.color));
      if (editingGroup === group.color) setEditingGroup(null);
    } catch {
      setError("No se pudo eliminar el grupo.");
    }
  };

  // ── Helpers formulario nueva variante ────────────────────
  const toggleNewSize = (size: string) => {
    setNewSizes((prev) =>
      prev.find((e) => e.size === size)
        ? prev.filter((e) => e.size !== size)
        : [
            ...prev,
            { size, stock: 0, priceModifier: 0, isOnSale: false, salePrice: 0 },
          ],
    );
  };

  const updateNewSizeEntry = (
    size: string,
    field: "stock" | "priceModifier" | "isOnSale" | "salePrice",
    value: number | boolean,
  ) => {
    setNewSizes((prev) =>
      prev.map((e) => (e.size === size ? { ...e, [field]: value } : e)),
    );
  };

  const updateEditSizeEntry = (
    size: string,
    field: "stock" | "priceModifier" | "isOnSale" | "salePrice",
    value: number | boolean,
  ) => {
    setEditSizes((prev) =>
      prev.map((e) => (e.size === size ? { ...e, [field]: value } : e)),
    );
  };

  // ── Filtrado + agrupación ────────────────────────────────
  const filtered = variants.filter((v) => {
    const mc = filterColor
      ? (v.color ?? "").toLowerCase().includes(filterColor.toLowerCase())
      : true;
    const ms = filterSize ? v.size === filterSize : true;
    return mc && ms;
  });

  const groups = groupByColor(filtered);

  // ── Render ───────────────────────────────────────────────
  return (
    <div className={styles.formCard}>
      {/* ── Header ── */}
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>Variantes del producto</span>
        <button
          className={styles.btnFill}
          style={{ padding: "6px 14px", fontSize: 13 }}
          onClick={() => {
            setShowNewForm((v) => !v);
            setEditingGroup(null);
          }}
        >
          {showNewForm ? "Cancelar" : "+ Agregar variante"}
        </button>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className={styles.errorBanner}>
          {error}
          <button
            onClick={() => setError(null)}
            style={{
              marginLeft: 8,
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "inherit",
              fontSize: 14,
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Loading ── */}
      {loading && <div className={styles.loadingText}>Cargando variantes…</div>}

      {/* ── Formulario nueva variante ── */}
      {showNewForm && (
        <div className={styles.inlineForm} style={{ marginBottom: 16 }}>
          <div className={styles.inlineFormTitle}>Nueva variante</div>

          <div className={styles.grid2} style={{ marginBottom: 12 }}>
            <div className={styles.fieldWrap}>
              <label className={styles.fieldLabel}>Color *</label>
              <input
                className={styles.fieldInput}
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                placeholder="Ej. Azul marino"
              />
            </div>
            <div className={styles.fieldWrap}>
              <label className={styles.fieldLabel}>Código HEX</label>
              <div className={styles.colorPickerWrap}>
                <input
                  type="color"
                  value={newHex}
                  onChange={(e) => setNewHex(e.target.value)}
                  className={styles.colorSwatch}
                />
                <input
                  className={styles.fieldInput}
                  value={newHex}
                  onChange={(e) => setNewHex(e.target.value)}
                  placeholder="#000000"
                  style={{ flex: 1 }}
                />
              </div>
            </div>
          </div>

          {/* Imagen */}
          <div className={styles.fieldWrap} style={{ marginBottom: 12 }}>
            <label className={styles.fieldLabel}>Imagen de la variante</label>
            <input
              ref={newFileRef}
              className={styles.fieldInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setNewImageFile(e.target.files?.[0] ?? null)}
            />
            <span className={styles.hint}>JPG, PNG o WebP · máx 5 MB</span>
          </div>

          {/* Selector de tallas */}
          <div className={styles.fieldWrap} style={{ marginBottom: 8 }}>
            <label className={styles.fieldLabel}>
              Tallas *
              {newSizes.length > 0 && (
                <span className={styles.sizesCount} style={{ marginLeft: 6 }}>
                  {newSizes.length} seleccionada
                  {newSizes.length !== 1 ? "s" : ""}
                </span>
              )}
            </label>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                marginTop: 4,
              }}
            >
              {SIZES.map((s) => {
                const active = !!newSizes.find((e) => e.size === s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleNewSize(s)}
                    className={`${styles.sizeBtn} ${active ? styles.sizeBtnActive : ""}`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tabla stock + modificador + rebajas por talla */}
          {newSizes.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div className={styles.sizeTableHeader}>
                <span style={{ width: 56 }}>Talla</span>
                <span style={{ flex: 1 }}>Stock</span>
                <span style={{ flex: 1 }}>Modificador (MXN)</span>
                <span style={{ flex: 1 }}>Precio final</span>
                <span style={{ width: 72 }}>En rebaja</span>
                <span style={{ flex: 1 }}>Precio rebaja</span>
              </div>
              <div className={styles.sizesList}>
                {newSizes.map((entry) => (
                  <div
                    key={entry.size}
                    className={`${styles.sizeRow} ${styles.sizeRowActive} ${entry.isOnSale ? styles.sizeRowSale : ""}`}
                  >
                    <span className={styles.sizeTableLabel}>{entry.size}</span>
                    <input
                      className={styles.stockInput}
                      type="number"
                      min={0}
                      value={entry.stock}
                      onChange={(e) =>
                        updateNewSizeEntry(
                          entry.size,
                          "stock",
                          Number(e.target.value),
                        )
                      }
                      style={{ flex: 1 }}
                    />
                    <input
                      className={styles.stockInput}
                      type="number"
                      step={0.01}
                      value={entry.priceModifier}
                      onChange={(e) =>
                        updateNewSizeEntry(
                          entry.size,
                          "priceModifier",
                          Number(e.target.value),
                        )
                      }
                      style={{ flex: 1 }}
                    />
                    <span className={styles.sizeTablePrice}>
                      ${(basePrice + entry.priceModifier).toFixed(2)}
                    </span>

                    {/* Toggle rebaja */}
                    <div
                      style={{
                        width: 72,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <label className={styles.saleToggle}>
                        <input
                          type="checkbox"
                          checked={entry.isOnSale}
                          onChange={(e) =>
                            updateNewSizeEntry(
                              entry.size,
                              "isOnSale",
                              e.target.checked,
                            )
                          }
                        />
                        <span className={styles.saleToggleTrack} />
                      </label>
                    </div>

                    {/* Campo precio rebaja — visible solo si isOnSale */}
                    {entry.isOnSale ? (
                      <input
                        className={styles.stockInput}
                        type="number"
                        step={0.01}
                        min={0}
                        placeholder="0.00"
                        value={entry.salePrice}
                        onChange={(e) =>
                          updateNewSizeEntry(
                            entry.size,
                            "salePrice",
                            Number(e.target.value),
                          )
                        }
                        style={{ flex: 1 }}
                      />
                    ) : (
                      <span style={{ flex: 1 }} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={styles.formActions}>
            <button
              type="button"
              className={styles.btnGhost}
              onClick={resetNewForm}
              disabled={savingNew}
            >
              Cancelar
            </button>
            <button
              type="button"
              className={styles.btnFill}
              onClick={handleCreate}
              disabled={savingNew}
            >
              {savingNew ? "Guardando…" : "Guardar variante"}
            </button>
          </div>
        </div>
      )}

      {/* ── Filtros ── */}
      {variants.length > 0 && (
        <div className={styles.filtersBar}>
          <input
            className={styles.fieldInput}
            placeholder="Buscar por color…"
            value={filterColor}
            onChange={(e) => setFilterColor(e.target.value)}
            style={{ minWidth: 160 }}
          />
          <select
            className={styles.fieldInput}
            value={filterSize}
            onChange={(e) => setFilterSize(e.target.value)}
            style={{ minWidth: 140 }}
          >
            <option value="">Todas las tallas</option>
            {SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {(filterColor || filterSize) && (
            <button
              className={styles.btnGhost}
              style={{ fontSize: 12 }}
              onClick={() => {
                setFilterColor("");
                setFilterSize("");
              }}
            >
              Limpiar
            </button>
          )}
        </div>
      )}

      {/* ── Estados vacíos ── */}
      {!loading && variants.length === 0 && !showNewForm && (
        <div className={styles.emptyState}>
          Sin variantes todavía. Agrega la primera.
        </div>
      )}
      {!loading && groups.length === 0 && variants.length > 0 && (
        <div className={styles.emptyState}>
          No se encontraron variantes con esos filtros.
        </div>
      )}

      {/* ── Lista de grupos de color ── */}
      {!loading && groups.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {groups.map((group) => {
            const isEditing = editingGroup === group.color;
            const usedSizes = isEditing
              ? editSizes.map((e) => e.size)
              : group.items.map((v) => v.size ?? "");
            const availableSizes = SIZES.filter((s) => !usedSizes.includes(s));
            const anyOnSale = group.items.some((v) => v.isOnSale);

            return (
              <div
                key={group.color}
                className={styles.colorGroup}
                style={{ borderColor: isEditing ? "#0a0a0a" : undefined }}
              >
                {/* ── Fila resumen ── */}
                <div
                  className={`${styles.groupRow} ${isEditing ? styles.groupRowOpen : ""}`}
                  onClick={() =>
                    isEditing ? setEditingGroup(null) : openEdit(group)
                  }
                >
                  <div
                    className={styles.groupSwatch}
                    style={{ background: group.colorHex }}
                  />

                  <div className={styles.groupInfo}>
                    <div className={styles.groupName}>
                      {group.color}
                      <span className={styles.stockBadge}>
                        {totalStock(group.items)} Unidades Disponibles
                      </span>
                      {anyOnSale && (
                        <span className={styles.saleBadge}>En rebaja</span>
                      )}
                    </div>
                    <div className={styles.groupPrice}>
                      {priceRange(group.items, basePrice)} MXN
                    </div>
                    <div className={styles.groupSizes}>
                      {group.items.map((v) => (
                        <span
                          key={v.id}
                          className={`${styles.sizeChip} ${v.stock === 0 ? styles.sizeChipZero : ""} ${v.isOnSale ? styles.sizeChipSale : ""}`}
                        >
                          <span className={styles.sizeChipLabel}>{v.size}</span>
                          <span className={styles.sizeChipStock}>
                            {v.stock}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {group.imageUrl ? (
                    <img
                      src={group.imageUrl}
                      alt={group.color}
                      className={styles.groupThumb}
                    />
                  ) : (
                    <div className={styles.groupThumbEmpty}>Sin img</div>
                  )}

                  <div
                    className={styles.groupActions}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      className={styles.btnFill}
                      style={{ fontSize: 12, padding: "5px 10px" }}
                      onClick={() =>
                        isEditing ? setEditingGroup(null) : openEdit(group)
                      }
                    >
                      {isEditing ? "Cerrar" : "Editar"}
                    </button>
                    <button
                      className={styles.deleteBtn}
                      onClick={() => handleDeleteGroup(group)}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>

                {/* ── Panel de edición inline ── */}
                {isEditing && (
                  <div className={styles.editPanel}>
                    <div className={styles.editPanelTitle}>
                      Editando — {group.color}
                    </div>

                    <div className={styles.grid2} style={{ marginBottom: 12 }}>
                      <div className={styles.fieldWrap}>
                        <label className={styles.fieldLabel}>Color</label>
                        <input
                          className={styles.fieldInput}
                          value={editColor}
                          onChange={(e) => setEditColor(e.target.value)}
                        />
                      </div>
                      <div className={styles.fieldWrap}>
                        <label className={styles.fieldLabel}>Código HEX</label>
                        <div className={styles.colorPickerWrap}>
                          <input
                            type="color"
                            value={editHex}
                            onChange={(e) => setEditHex(e.target.value)}
                            className={styles.colorSwatch}
                          />
                          <input
                            className={styles.fieldInput}
                            value={editHex}
                            onChange={(e) => setEditHex(e.target.value)}
                            style={{ flex: 1 }}
                          />
                        </div>
                      </div>
                    </div>

                    <div
                      className={styles.fieldWrap}
                      style={{ marginBottom: 12 }}
                    >
                      <label className={styles.fieldLabel}>
                        Nueva imagen (opcional)
                      </label>
                      <input
                        className={styles.fieldInput}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) =>
                          setEditImageFile(e.target.files?.[0] ?? null)
                        }
                      />
                      {group.imageUrl && !editImageFile && (
                        <img
                          src={group.imageUrl}
                          alt=""
                          className={styles.colorThumb}
                          style={{ marginTop: 6, width: 48, height: 48 }}
                        />
                      )}
                      {editImageFile && (
                        <span
                          style={{
                            fontSize: 11,
                            color: "#15803d",
                            marginTop: 4,
                          }}
                        >
                          ✓ {editImageFile.name}
                        </span>
                      )}
                    </div>

                    {/* Tabla tallas */}
                    <div style={{ marginBottom: 12 }}>
                      <div className={styles.sizeTableHeader}>
                        <span style={{ width: 56 }}>Talla</span>
                        <span style={{ flex: 1 }}>Stock</span>
                        <span style={{ flex: 1 }}>Modificador (MXN)</span>
                        <span style={{ flex: 1 }}>Precio final</span>
                        <span style={{ width: 72 }}>En rebaja</span>
                        <span style={{ flex: 1 }}>Precio rebaja</span>
                        <span style={{ width: 36 }} />
                      </div>
                      <div className={styles.sizesList}>
                        {editSizes.map((entry) => {
                          const variant = group.items.find(
                            (v) => v.size === entry.size,
                          );
                          return (
                            <div
                              key={entry.size}
                              className={`${styles.sizeRow} ${styles.sizeRowActive} ${entry.isOnSale ? styles.sizeRowSale : ""}`}
                            >
                              <span className={styles.sizeTableLabel}>
                                {entry.size}
                              </span>
                              <input
                                className={styles.stockInput}
                                type="number"
                                min={0}
                                value={entry.stock}
                                onChange={(e) =>
                                  updateEditSizeEntry(
                                    entry.size,
                                    "stock",
                                    Number(e.target.value),
                                  )
                                }
                                style={{ flex: 1 }}
                              />
                              <input
                                className={styles.stockInput}
                                type="number"
                                step={0.01}
                                value={entry.priceModifier}
                                onChange={(e) =>
                                  updateEditSizeEntry(
                                    entry.size,
                                    "priceModifier",
                                    Number(e.target.value),
                                  )
                                }
                                style={{ flex: 1 }}
                              />
                              <span className={styles.sizeTablePrice}>
                                ${(basePrice + entry.priceModifier).toFixed(2)}
                              </span>

                              {/* Toggle rebaja */}
                              <div
                                style={{
                                  width: 72,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                }}
                              >
                                <label className={styles.saleToggle}>
                                  <input
                                    type="checkbox"
                                    checked={entry.isOnSale}
                                    onChange={(e) =>
                                      updateEditSizeEntry(
                                        entry.size,
                                        "isOnSale",
                                        e.target.checked,
                                      )
                                    }
                                  />
                                  <span className={styles.saleToggleTrack} />
                                </label>
                              </div>

                              {/* Campo precio rebaja — visible solo si isOnSale */}
                              {entry.isOnSale ? (
                                <input
                                  className={styles.stockInput}
                                  type="number"
                                  step={0.01}
                                  min={0}
                                  placeholder="0.00"
                                  value={entry.salePrice}
                                  onChange={(e) =>
                                    updateEditSizeEntry(
                                      entry.size,
                                      "salePrice",
                                      Number(e.target.value),
                                    )
                                  }
                                  style={{ flex: 1 }}
                                />
                              ) : (
                                <span style={{ flex: 1 }} />
                              )}

                              {variant && (
                                <button
                                  className={styles.deleteBtn}
                                  style={{
                                    width: 36,
                                    padding: "3px 6px",
                                    fontSize: 11,
                                  }}
                                  onClick={() => handleDeleteSize(variant.id)}
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Agregar tallas disponibles */}
                    {availableSizes.length > 0 && (
                      <div style={{ marginBottom: 14 }}>
                        <label
                          className={styles.fieldLabel}
                          style={{ display: "block", marginBottom: 6 }}
                        >
                          Agregar talla
                        </label>
                        <div
                          style={{ display: "flex", flexWrap: "wrap", gap: 6 }}
                        >
                          {availableSizes.map((s) => (
                            <button
                              key={s}
                              type="button"
                              className={styles.sizeBtn}
                              onClick={() => handleAddSizeToEdit(group, s)}
                              disabled={savingEdit}
                            >
                              + {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className={styles.formActions}>
                      <button
                        type="button"
                        className={styles.btnGhost}
                        onClick={() => setEditingGroup(null)}
                        disabled={savingEdit}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        className={styles.btnFill}
                        onClick={() => handleSaveEdit(group)}
                        disabled={savingEdit}
                      >
                        {savingEdit ? "Guardando…" : "Guardar cambios"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
