import { useState, useRef } from "react";
import adminStyles from "./Admin.module.css";
import s from "./VariantManager.module.css";
 
interface SizeStock { size: string; stock: number; selected: boolean }
interface ColorForm {
  color: string; colorHex: string; priceModifier: number;
  imageFile: File | null; sizes: SizeStock[];
}
interface Variant {
  id: string; color?: string; colorHex?: string; size?: string;
  stock: number; priceModifier: number; finalPrice: number;
  imageUrl?: string; isActive: boolean;
}
interface VariantManagerProps {
  productId: string; basePrice: number; token: string; apiUrl: string;
}
 
const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "36", "37", "38", "39", "40", "41", "42"];
 
const blankForm = (): ColorForm => ({
  color: "", colorHex: "#000000", priceModifier: 0, imageFile: null,
  sizes: SIZES.map((size) => ({ size, stock: 0, selected: false })),
});
 
export const VariantManager: React.FC<VariantManagerProps> = ({
  productId, basePrice, token, apiUrl,
}) => {
  const [variants, setVariants]       = useState<Variant[]>([]);
  const [loaded, setLoaded]           = useState(false);
  const [showForm, setShowForm]       = useState(false);
  const [form, setForm]               = useState<ColorForm>(blankForm());
  const [saving, setSaving]           = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
 
  const variantsUrl = `${apiUrl}/api/products/${productId}/variants`;
 
  const loadVariants = async () => {
    if (loaded) return;
    try {
      const res = await fetch(variantsUrl);
      const data = await res.json();
      setVariants(Array.isArray(data) ? data : []);
      setLoaded(true);
    } catch { setError("No se pudieron cargar las variantes."); }
  };
 
  const reloadVariants = async () => {
    const res = await fetch(variantsUrl);
    const data = await res.json();
    setVariants(Array.isArray(data) ? data : []);
  };
 
  const uploadImage = (variantId: string, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return fetch(`${variantsUrl}/${variantId}/image`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
  };
 
  const toggleSize = (size: string) =>
    setForm((f) => ({
      ...f,
      sizes: f.sizes.map((s) =>
        s.size === size ? { ...s, selected: !s.selected, stock: s.selected ? 0 : s.stock } : s
      ),
    }));
 
  const setStock = (size: string, stock: number) =>
    setForm((f) => ({
      ...f,
      sizes: f.sizes.map((s) => (s.size === size ? { ...s, stock } : s)),
    }));
 
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const selected = form.sizes.filter((s) => s.selected);
    if (selected.length === 0) { setError("Selecciona al menos una talla."); return; }
    setSaving(true);
    try {
      const created = await Promise.all(
        selected.map((s) =>
          fetch(variantsUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              color: form.color || null, colorHex: form.colorHex || null,
              size: s.size, stock: s.stock, priceModifier: form.priceModifier,
            }),
          }).then((r) => r.json())
        )
      );
      if (form.imageFile) {
        await Promise.all(created.map((v) => uploadImage(v.id, form.imageFile!)));
      }
      await reloadVariants();
      setForm(blankForm());
      setShowForm(false);
      if (fileRef.current) fileRef.current.value = "";
    } catch { setError("Ocurrió un error al guardar las variantes."); }
    finally { setSaving(false); }
  };
 
  const handleImageUpload = async (variantId: string, file: File) => {
    setUploadingId(variantId);
    try {
      const res = await uploadImage(variantId, file);
      if (!res.ok) throw new Error();
      const updated: Variant = await res.json();
      setVariants((v) => v.map((x) => (x.id === variantId ? updated : x)));
    } catch { setError("No se pudo subir la imagen."); }
    finally { setUploadingId(null); }
  };
 
  const handleDelete = async (variantId: string) => {
    if (!confirm("¿Eliminar esta variante?")) return;
    try {
      await fetch(`${variantsUrl}/${variantId}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` },
      });
      setVariants((v) => v.filter((x) => x.id !== variantId));
    } catch { setError("No se pudo eliminar la variante."); }
  };
 
  const groupedByColor = variants.reduce<Record<string, Variant[]>>((acc, v) => {
    const key = v.colorHex ?? v.color ?? "sin-color";
    return { ...acc, [key]: [...(acc[key] ?? []), v] };
  }, {});
 
  const selectedCount = form.sizes.filter((s) => s.selected).length;
 
  return (
    <div className={adminStyles.formCard}>
 
      <div className={s.header}>
        <div className={adminStyles.formTitle} style={{ marginBottom: 0 }}>Variantes del producto</div>
        <button
          className={adminStyles.btnFill}
          style={{ padding: "6px 14px", fontSize: 13 }}
          onClick={() => { loadVariants(); setShowForm((v) => !v); }}
        >
          {showForm ? "Cancelar" : "+ Agregar color"}
        </button>
      </div>
 
      {error && <div className={s.error}>{error}</div>}
 
      {showForm && (
        <form className={s.form} onSubmit={handleCreate}>
          <div className={s.formTitle}>Nuevo color</div>
 
          <div className={adminStyles.grid2} style={{ marginBottom: 14 }}>
            <div className={adminStyles.fieldWrap}>
              <label className={adminStyles.fieldLabel}>Nombre del color</label>
              <input className={adminStyles.fieldInput} value={form.color}
                onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                placeholder="Blanco, Negro, Azul marino..." />
            </div>
            <div className={adminStyles.fieldWrap}>
              <label className={adminStyles.fieldLabel}>Código HEX</label>
              <div className={s.colorPickerWrap}>
                <input type="color" className={s.colorSwatch} value={form.colorHex}
                  onChange={(e) => setForm((f) => ({ ...f, colorHex: e.target.value }))} />
                <input className={adminStyles.fieldInput} value={form.colorHex}
                  onChange={(e) => setForm((f) => ({ ...f, colorHex: e.target.value }))}
                  placeholder="#000000" style={{ flex: 1 }} />
              </div>
            </div>
          </div>
 
          <div className={adminStyles.grid2} style={{ marginBottom: 14 }}>
            <div className={adminStyles.fieldWrap}>
              <label className={adminStyles.fieldLabel}>Modificador de precio (MXN)</label>
              <input className={adminStyles.fieldInput} type="number" step={0.01}
                value={form.priceModifier}
                onChange={(e) => setForm((f) => ({ ...f, priceModifier: Number(e.target.value) }))} />
              <div className={adminStyles.hint}>
                Precio final: ${(basePrice + form.priceModifier).toFixed(2)} MXN
              </div>
            </div>
            <div className={adminStyles.fieldWrap}>
              <label className={adminStyles.fieldLabel}>Imagen de este color</label>
              <input ref={fileRef} className={adminStyles.fieldInput} type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setForm((f) => ({ ...f, imageFile: e.target.files?.[0] ?? null }))} />
              <div className={adminStyles.hint}>Se aplicará a todas las tallas de este color</div>
            </div>
          </div>
 
          <div className={adminStyles.fieldWrap} style={{ marginBottom: 14 }}>
            <label className={adminStyles.fieldLabel}>
              Tallas disponibles
              {selectedCount > 0 && (
                <span className={s.sizesCount}>
                  {selectedCount} seleccionada{selectedCount !== 1 ? "s" : ""}
                </span>
              )}
            </label>
            <div className={s.sizesList}>
              {form.sizes.map((sz) => (
                <div key={sz.size} className={`${s.sizeRow} ${sz.selected ? s.sizeRowActive : ""}`}>
                  <button type="button"
                    className={`${s.sizeBtn} ${sz.selected ? s.sizeBtnActive : ""}`}
                    onClick={() => toggleSize(sz.size)}>
                    {sz.size}
                  </button>
                  {sz.selected ? (
                    <div className={s.stockWrap}>
                      <span className={s.stockLabel}>Stock:</span>
                      <input type="number" min={0} value={sz.stock}
                        className={s.stockInput}
                        onChange={(e) => setStock(sz.size, Number(e.target.value))} />
                      <span className={s.stockHint}>unidades</span>
                    </div>
                  ) : (
                    <span className={s.sizeHint}>Clic para agregar esta talla</span>
                  )}
                </div>
              ))}
            </div>
          </div>
 
          <div className={s.formActions}>
            <button type="button" className={adminStyles.btnGhost} disabled={saving}
              onClick={() => { setShowForm(false); setForm(blankForm()); }}>
              Cancelar
            </button>
            <button type="submit" className={adminStyles.btnFill} disabled={saving}>
              {saving ? "Guardando…" : `Guardar ${selectedCount > 0 ? selectedCount : ""} variante${selectedCount !== 1 ? "s" : ""}`}
            </button>
          </div>
        </form>
      )}
 
      {loaded && Object.keys(groupedByColor).length === 0 && !showForm && (
        <div className={s.empty}>Sin variantes todavía. Agrega el primer color.</div>
      )}
 
      {Object.entries(groupedByColor).map(([colorKey, colorVariants]) => {
        const first = colorVariants[0];
        const totalStock = colorVariants.reduce((acc, v) => acc + v.stock, 0);
        return (
          <div key={colorKey} className={s.colorGroup}>
            <div className={s.colorGroupHeader}>
              {first.colorHex && <div className={s.colorDot} style={{ background: first.colorHex }} />}
              <span className={s.colorName}>{first.color ?? "Sin nombre"}</span>
              {first.imageUrl && <img src={first.imageUrl} alt={first.color ?? ""} className={s.colorThumb} />}
              <span className={s.colorMeta}>
                {colorVariants.length} talla{colorVariants.length !== 1 ? "s" : ""} · stock total: {totalStock}
              </span>
              <label className={s.imgLabel}>
                {uploadingId ? "Subiendo…" : first.imageUrl ? "Cambiar img" : "Subir img"}
                <input type="file" accept="image/jpeg,image/png,image/webp"
                  style={{ display: "none" }} disabled={uploadingId !== null}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) colorVariants.forEach((v) => handleImageUpload(v.id, file));
                  }} />
              </label>
            </div>
            {colorVariants.map((v) => (
              <div key={v.id} className={s.variantRow}>
                <span className={s.variantSize}>{v.size ?? "—"}</span>
                <span className={s.variantInfo}>
                  Stock: {v.stock} · ${v.finalPrice.toFixed(2)} MXN
                  {v.priceModifier !== 0 && (
                    <span className={v.priceModifier > 0 ? s.priceUp : s.priceDown}>
                      {" "}({v.priceModifier > 0 ? "+" : ""}{v.priceModifier})
                    </span>
                  )}
                </span>
                <button className={s.deleteBtn} onClick={() => handleDelete(v.id)}>
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
};