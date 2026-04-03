import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useFetch } from "@/hooks/useFetch";
import { formatPrice } from "@/utils/formatPrice";
import { CATEGORIES, SIZES } from "@/utils/constants";
import type { Product, Order, User } from "@/types";
import Loader from "@/components/ui/Loader";
import styles from "./Admin.module.css";
import { VariantManager } from "./VariantManager";
import env from "@/config/environment";
import { PagedResult } from "@/types/pagination";

// ─── Constants ────────────────────────────────────────────────────────────────
const BASE = env.API_BASE_URL;
const BASE_URL = env.AUTH_BASE_URL;

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  processing: "En proceso",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

// ─── Types ────────────────────────────────────────────────────────────────────
type ProductFormData = Partial<Product> & { imageFile?: File | null };
type SortOrder = "newest" | "oldest";

interface Paginated<T> {
  data: T[];
  total: number;
}

interface StatsData {
  totalRevenue: number;
  totalOrders: number;
  totalUsers: number;
  totalProducts: number;
  revenueByMonth: { month: string; revenue: number }[];
  topProducts: {
    productId: number | string;
    productName: string;
    sold: number;
    revenue: number;
  }[];
  recentOrders: Order[];
  ordersByStatus: Record<string, number>;
  newUsers: { date: string; count: number }[];
}

// ─── API helper ───────────────────────────────────────────────────────────────
async function apiCall<T = unknown>(
  path: string,
  token: string,
  opts: RequestInit = {},
): Promise<T> {
  const isFormData = opts.body instanceof FormData;
  const res = await fetch(BASE + path, {
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers ?? {}),
    },
    ...opts,
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => `HTTP ${res.status}`);
    throw new Error(msg || `HTTP ${res.status}`);
  }

  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) return res.json() as Promise<T>;
  return {} as T;
}

// ─── Toast ────────────────────────────────────────────────────────────────────
const Toast: React.FC<{ msg: string; type: "success" | "error" }> = ({
  msg,
  type,
}) => (
  <div
    className={`${styles.toast} ${type === "error" ? styles.toastError : styles.toastSuccess}`}
  >
    {msg}
  </div>
);

function useToast() {
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);
  const show = useCallback(
    (msg: string, type: "success" | "error" = "success") => {
      setToast({ msg, type });
      setTimeout(() => setToast(null), 2800);
    },
    [],
  );
  return { toast, show };
}

// ─── Debounce hook ─────────────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay = 400): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debouncedValue;
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────
const BarChart: React.FC<{ data: { month: string; revenue: number }[] }> = ({
  data,
}) => {
  const max = Math.max(...data.map((d) => d.revenue), 1);
  return (
    <div className={styles.barChartWrap}>
      {data.map((d) => (
        <div key={d.month} className={styles.barGroup}>
          <div
            className={styles.barFill}
            style={{ height: `${Math.round((d.revenue / max) * 120)}px` }}
            title={formatPrice(d.revenue)}
          />
          <div className={styles.barLbl}>{d.month}</div>
        </div>
      ))}
    </div>
  );
};

// ─── Pagination ───────────────────────────────────────────────────────────────
const Pagination: React.FC<{
  page: number;
  total: number;
  pageSize?: number;
  onPrev: () => void;
  onNext: () => void;
}> = ({ page, total, pageSize = 20, onPrev, onNext }) => (
  <div className={styles.pagination}>
    <button className={styles.pgBtn} disabled={page <= 1} onClick={onPrev}>
      ← Anterior
    </button>
    <span className={styles.pgInfo}>
      Pág. {page} · {total} registros
    </span>
    <button
      className={styles.pgBtn}
      disabled={total < pageSize}
      onClick={onNext}
    >
      Siguiente →
    </button>
  </div>
);

// ─── Status Badge ─────────────────────────────────────────────────────────────
const StatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <span
    className={`${styles.badge} ${(styles as any)[`st_${status}`] ?? styles.badgeGray}`}
  >
    {STATUS_LABELS[status] ?? status}
  </span>
);

// ─── Image preview ────────────────────────────────────────────────────────────
const ImagePreview: React.FC<{
  file: File | null | undefined;
  url: string | undefined;
}> = ({ file, url }) => {
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const obj = URL.createObjectURL(file);
    setPreview(obj);
    return () => URL.revokeObjectURL(obj);
  }, [file]);

  const src = preview ?? url;
  if (!src) return null;

  return (
    <div style={{ marginTop: 8 }}>
      <img
        src={src}
        alt="Vista previa"
        style={{
          width: 80,
          height: 100,
          objectFit: "cover",
          borderRadius: 6,
          border: "0.5px solid #e8e8e8",
          display: "block",
        }}
      />
    </div>
  );
};

// ─── Product Form ─────────────────────────────────────────────────────────────
const blankProduct = (): ProductFormData => ({
  name: "",
  slug: "",
  category: "mujer",
  price: 0,
  originalPrice: undefined,
  isNew: false,
  isSale: false,
  imageUrl: "",
  imageFile: null,
  material: "",
  description: "",
  rating: 0,
  reviewCount: 0,
  care: "",
  origin: "",
  tags: [],
  variants: [], // ← reemplaza colors, sizes, stock
});

const AdminProductForm: React.FC<{
  initial: ProductFormData;
  onSave: (data: ProductFormData) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}> = ({ initial, onSave, onCancel, saving }) => {
  const [form, setForm] = useState<ProductFormData>(initial);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const set =
    (key: keyof Product) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  const isEdit = !!form.id;

  return (
    <form className={styles.formCard} onSubmit={handleSubmit}>
      <div className={styles.formTitle}>
        {isEdit ? "Editar Producto" : "Nuevo Producto"}
      </div>

      <div className={styles.grid2}>
        <div className={styles.fieldWrap}>
          <label className={styles.fieldLabel}>Nombre del producto *</label>
          <input
            className={styles.fieldInput}
            value={form.name ?? ""}
            onChange={set("name")}
            required
            placeholder="Blazer de lino oversize"
          />
        </div>
        {/* <div className={styles.fieldWrap}>
          <label className={styles.fieldLabel}>Slug (URL)</label>
          <input
            className={styles.fieldInput}
            value={form.slug ?? ""}
            onChange={set("slug")}
            placeholder="blazer-lino-oversize"
          />
        </div> */}
      </div>

      <div className={styles.grid2}>
        <div className={styles.fieldWrap}>
          <label className={styles.fieldLabel}>Categoría</label>
          <select
            className={styles.fieldInput}
            value={String(form.category ?? "mujer")}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                category: e.target.value as Product["category"],
              }))
            }
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.fieldWrap}>
          <label className={styles.fieldLabel}>Material</label>
          <input
            className={styles.fieldInput}
            value={form.material ?? ""}
            onChange={set("material")}
            placeholder="Lino 100%"
          />
        </div>
      </div>

      <div className={styles.grid3}>
        <div className={styles.fieldWrap}>
          <label className={styles.fieldLabel}>Precio (MXN) *</label>
          <input
            className={styles.fieldInput}
            type="number"
            min={0}
            step={0.01}
            value={form.price ?? ""}
            onChange={(e) =>
              setForm((f) => ({ ...f, price: Number(e.target.value) }))
            }
            required
          />
        </div>
        {/* <div className={styles.fieldWrap}>
          <label className={styles.fieldLabel}>Precio original</label>
          <input
            className={styles.fieldInput}
            type="number"
            min={0}
            step={0.01}
            value={form.originalPrice ?? ""}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                originalPrice: Number(e.target.value) || undefined,
              }))
            }
          />
          <div className={styles.hint}>Vacío si no hay oferta</div>
        </div> */}
      </div>

      {/* Image upload */}
      <div className={styles.fieldWrap}>
        <label className={styles.fieldLabel}>
          Imagen del producto {isEdit ? "(reemplazar)" : ""}
        </label>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <input
              ref={fileInputRef}
              className={styles.fieldInput}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  imageFile: e.target.files?.[0] ?? null,
                }))
              }
            />
            <div className={styles.hint}>
              JPG, PNG o WebP. Se subirá automáticamente al guardar.
            </div>
          </div>
          <ImagePreview file={form.imageFile} url={form.imageUrl} />
        </div>
      </div>

      <div className={styles.fieldWrap}>
        <label className={styles.fieldLabel}>Descripción</label>
        <textarea
          className={`${styles.fieldInput} ${styles.textarea}`}
          value={form.description ?? ""}
          onChange={set("description")}
          rows={3}
          placeholder="Describe el producto, materiales, corte, ocasión de uso..."
        />
      </div>

      <div className={styles.grid2}>
        <div className={styles.fieldWrap}>
          <label className={styles.fieldLabel}>Cuidados</label>
          <input
            className={styles.fieldInput}
            value={form.care ?? ""}
            onChange={set("care")}
            placeholder="Lavar a mano · No centrifugar"
          />
        </div>
        <div className={styles.fieldWrap}>
          <label className={styles.fieldLabel}>País de origen</label>
          <input
            className={styles.fieldInput}
            value={form.origin ?? ""}
            onChange={set("origin")}
            placeholder="Italia"
          />
        </div>
      </div>

      <div className={styles.checkRow}>
        {/* <label className={styles.checkLabel}>
          <input
            type="checkbox"
            checked={form.isNew ?? false}
            onChange={(e) =>
              setForm((f) => ({ ...f, isNew: e.target.checked }))
            }
          />
          Nuevo
        </label> */}
        <label className={styles.checkLabel}>
          <input
            type="checkbox"
            checked={form.isSale ?? false}
            onChange={(e) =>
              setForm((f) => ({ ...f, isSale: e.target.checked }))
            }
          />
          En rebaja
        </label>
      </div>

      <div className={styles.formBtns}>
        <button
          type="button"
          className={styles.btnGhost}
          onClick={onCancel}
          disabled={saving}
        >
          Cancelar
        </button>
        <button type="submit" className={styles.btnFill} disabled={saving}>
          {saving ? (
            <>
              <span
                style={{
                  display: "inline-block",
                  width: 12,
                  height: 12,
                  border: "1.5px solid rgba(255,255,255,.3)",
                  borderTopColor: "#fff",
                  borderRadius: "50%",
                  animation: "spin .6s linear infinite",
                  marginRight: 7,
                }}
              />
              Guardando…
            </>
          ) : isEdit ? (
            "Guardar cambios"
          ) : (
            "Crear producto"
          )}
        </button>
      </div>
    </form>
  );
};

// ─── Dashboard Section ────────────────────────────────────────────────────────
const DashboardSection: React.FC<{ token: string }> = ({ token }) => {
  const { data: stats, loading: sl } = useFetch(
    useCallback(
      () => apiCall<StatsData>("/admin/stats", token).catch(() => null),
      [token],
    ),
    [token],
  );
  const { data: ordersRes, loading: ol } = useFetch(
    useCallback(
      () =>
        apiCall<Paginated<Order>>("/admin/orders?limit=50", token).catch(
          () => ({ data: [], total: 0 }),
        ),
      [token],
    ),
    [token],
  );
  const { data: usersRes, loading: ul } = useFetch(
    useCallback(
      () =>
        apiCall<Paginated<User>>("/admin/users?limit=50", token).catch(() => ({
          data: [],
          total: 0,
        })),
      [token],
    ),
    [token],
  );
  const { data: productsRes, loading: pl } = useFetch(
    useCallback(
      () =>
        apiCall<PagedResult<Product>>(
          "/Products?page=1&pageSize=10",
          token,
        ).catch(() => ({
          items: [],
          page: 1,
          pageSize: 10,
          totalCount: 0,
          totalPages: 0,
        })),
      [token],
    ),
    [token],
  );

  if (sl || ol || ul || pl) return <Loader />;

  const orders =
    (ordersRes as any)?.data ?? (Array.isArray(ordersRes) ? ordersRes : []);
  const users =
    (usersRes as any)?.data ?? (Array.isArray(usersRes) ? usersRes : []);
  const products = productsRes?.items ?? [];

  const totalRevenue =
    stats?.totalRevenue ??
    (orders as Order[]).reduce((a: number, o: Order) => a + (o.total ?? 0), 0);
  const totalOrders = stats?.totalOrders ?? (orders as Order[]).length;
  const totalUsers = stats?.totalUsers ?? (users as User[]).length;
  const totalProducts = stats?.totalProducts ?? productsRes?.totalCount ?? 0;

  const recentOrders: Order[] =
    stats?.recentOrders ?? (orders as Order[]).slice(0, 8);
  const byStatus: Record<string, number> = {};
  (orders as Order[]).forEach((o: Order) => {
    byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;
  });
  const statusMap = stats?.ordersByStatus ?? byStatus;

  return (
    <>
      <div className={styles.kpiGrid}>
        {[
          {
            label: "Ingresos Totales",
            value: formatPrice(totalRevenue),
            accent: "",
          },
          {
            label: "Pedidos Totales",
            value: String(totalOrders),
            accent: styles.accentGreen,
          },
          {
            label: "Usuarios",
            value: String(totalUsers),
            accent: styles.accentBlue,
          },
          {
            label: "Productos",
            value: String(totalProducts),
            accent: styles.accentRed,
          },
        ].map((k) => (
          <div key={k.label} className={`${styles.kpiCard} ${k.accent}`}>
            <p className={styles.kpiLabel}>{k.label}</p>
            <p className={styles.kpiValue}>{k.value}</p>
          </div>
        ))}
      </div>

      {(stats?.revenueByMonth?.length ?? 0) > 0 && (
        <div className={styles.card}>
          <p className={styles.cardTitle}>Ingresos por Mes</p>
          <BarChart data={stats!.revenueByMonth} />
        </div>
      )}

      <div className={styles.grid2}>
        <div className={styles.card}>
          <p className={styles.cardTitle}>Pedidos Recientes</p>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Estado</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.length ? (
                  recentOrders.map((o) => (
                    <tr key={String(o.id)}>
                      <td className={styles.tdNum}>
                        #{String(o.id).slice(-6).toUpperCase()}
                      </td>
                      <td>
                        <StatusBadge status={o.status} />
                      </td>
                      <td className={styles.tdGold}>
                        {formatPrice(o.total ?? 0)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className={styles.empty}>
                      Sin pedidos
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className={styles.card}>
          <p className={styles.cardTitle}>Pedidos por Estado</p>
          {Object.entries(statusMap).map(([s, cnt]) => {
            const pct = totalOrders
              ? Math.round(((cnt as number) / totalOrders) * 100)
              : 0;
            return (
              <div key={s} className={styles.statusRow}>
                <div className={styles.statusRowHeader}>
                  <StatusBadge status={s} />
                  <span className={styles.statusCnt}>
                    {cnt as number} ({pct}%)
                  </span>
                </div>
                <div className={styles.statusBarBg}>
                  <div
                    className={styles.statusBarFill}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {(stats?.topProducts?.length ?? 0) > 0 && (
          <div className={`${styles.card} ${styles.colSpan2}`}>
            <p className={styles.cardTitle}>Productos Más Vendidos</p>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Vendidos</th>
                    <th>Ingresos</th>
                  </tr>
                </thead>
                <tbody>
                  {stats!.topProducts.map((p) => (
                    <tr key={String(p.productId)}>
                      <td>{p.productName}</td>
                      <td className={styles.tdNum}>{p.sold}</td>
                      <td className={styles.tdGold}>
                        {formatPrice(p.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

// ─── Products Section ─────────────────────────────────────────────────────────
const ProductsSection: React.FC<{
  token: string;
  show: (msg: string, type?: "success" | "error") => void;
}> = ({ token, show }) => {
  const [page, setPage] = useState(1);
  const [formData, setFormData] = useState<ProductFormData | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [createdProduct, setCreatedProduct] = useState<{
    // ← NUEVO
    id: string;
    price: number;
  } | null>(null);

  const debouncedSearch = useDebounce(search, 400);

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", "10");
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (sortOrder === "newest") params.set("sortBy", "createdAt_desc");
    if (sortOrder === "oldest") params.set("sortBy", "createdAt_asc");
    return params.toString();
  }, [page, debouncedSearch, sortOrder]);

  const fetchProducts = useCallback(
    () => apiCall<PagedResult<Product>>(`/Products?${buildQuery()}`, token),
    [buildQuery, token],
  );

  const { data, loading, refetch } = useFetch(
    () =>
      fetchProducts().catch(() => ({
        items: [],
        page: 1,
        pageSize: 10,
        totalCount: 0,
        totalPages: 0,
      })),
    [buildQuery, token],
  );
  const products = data?.items ?? [];
  const total = data?.totalCount ?? 0;

  useEffect(() => {
    products.forEach((p) => {
      if (!Array.isArray(p.variants)) return;

      p.variants.forEach((v) => {
        if (v.stock < 0) v.stock = 0;
      });
    });
  }, [products]);

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, sortOrder]);

  // ── handleSave ──────────────────────────────────────────────────────────────
  const handleSave = async (body: ProductFormData) => {
    setSaving(true);
    try {
      if (body.id) {
        // ── Edit flow ────────────────────────────────────────
        await apiCall(`/Products/${body.id}`, token, {
          method: "PUT",
          body: JSON.stringify({
            name: body.name ?? "",
            description: body.description ?? "",
            price: Number(body.price ?? 0),
            category: body.category ?? "mujer",
            material: body.material ?? "",
            care: body.care ?? "",
            origin: body.origin ?? "",
            // isNew:       body.isNew ?? false,
            // isSale:      body.isSale ?? false,
          }),
        });

        if (body.imageFile) {
          const fd = new FormData();
          fd.append("file", body.imageFile);
          try {
            await apiCall(`/Products/${body.id}/image`, token, {
              method: "POST",
              body: fd,
            });
          } catch (imgErr: any) {
            show(
              `Producto actualizado, pero la imagen falló: ${imgErr.message}`,
              "error",
            );
          }
        }

        show("Producto actualizado correctamente");
        setCreatedProduct(null);
        setFormData(null);
        refetch();
      } else {
        // ── Create flow ──────────────────────────────────────
        const dto = {
          name: body.name ?? "",
          description: body.description ?? "",
          price: Number(body.price ?? 0),
          category: body.category ?? "mujer",
          material: body.material ?? "",
          care: body.care ?? "",
          origin: body.origin ?? "",
          // isNew:       body.isNew ?? false,
          // isSale:      body.isSale ?? false,
          // slug:
          //   body.slug ??
          //   (body.name ?? "")
          //     .toLowerCase()
          //     .normalize("NFD")
          //     .replace(/[\u0300-\u036f]/g, "")
          //     .replace(/[^a-z0-9]+/g, "-")
          //     .replace(/^-+|-+$/g, ""),
        };

        const created = await apiCall<any>("/Products", token, {
          method: "POST",
          body: JSON.stringify(dto),
        });

        const productId = String(
          created?.id ?? created?.data?.id ?? created?.product?.id ?? "",
        );
        if (!productId)
          throw new Error("No se recibió el id del producto creado");

        if (body.imageFile) {
          const fd = new FormData();
          fd.append("file", body.imageFile);
          try {
            await apiCall(`/Products/${productId}/image`, token, {
              method: "POST",
              body: fd,
            });
          } catch (imgErr: any) {
            show(
              `Producto creado, pero la imagen falló: ${imgErr.message}`,
              "error",
            );
          }
        }

        // Mostrar VariantManager debajo
        setFormData(null);
        setCreatedProduct({ id: productId, price: Number(body.price ?? 0) });
        show("Producto creado. Ahora agrega las variantes.");
      }
    } catch (e: any) {
      show("Error al guardar: " + (e.message ?? "Error desconocido"), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string | number) => {
    if (!confirm("¿Eliminar este producto? Esta acción no se puede deshacer."))
      return;
    try {
      await apiCall(`/Products/${id}`, token, { method: "DELETE" });
      show("Producto eliminado");
      refetch();
    } catch (e: any) {
      show("Error: " + e.message, "error");
    }
  };

  return (
    <>
      <div className={styles.tabHeader}>
        <h1 className={styles.pageTitle}>Productos</h1>
        <button
          className={styles.btnSm}
          onClick={() => {
            setCreatedProduct(null);
            setFormData(blankProduct());
          }}
        >
          + Nuevo Producto
        </button>
      </div>

      {/* ── Search + Sort bar ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 16,
        }}
      >
        <div style={{ position: "relative", flex: 1, maxWidth: 360 }}>
          <svg
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "none",
              color: "#9a9a9a",
            }}
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="search"
            className={styles.fieldInput}
            style={{ paddingLeft: 32, paddingRight: 8, marginBottom: 0 }}
            placeholder="Buscar por nombre, categoría…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className={styles.filterSel}
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as SortOrder)}
        >
          <option value="newest">Más recientes primero</option>
          <option value="oldest">Más antiguos primero</option>
        </select>
        {!loading && (
          <span
            style={{ fontSize: 12, color: "#9a9a9a", whiteSpace: "nowrap" }}
          >
            {total} producto{total !== 1 ? "s" : ""}
            {debouncedSearch ? ` para "${debouncedSearch}"` : ""}
          </span>
        )}
      </div>

      {/* ── Formulario nuevo / editar producto ── */}
      {formData !== null && (
        <AdminProductForm
          initial={formData}
          onSave={handleSave}
          onCancel={() => {
            setFormData(null);
            setCreatedProduct(null);
          }}
          saving={saving}
        />
      )}

      {/* ── VariantManager — aparece después de crear un producto ── */}
      {createdProduct && (
        <>
          <VariantManager
            productId={createdProduct.id}
            basePrice={createdProduct.price}
            token={token}
            apiUrl={BASE_URL}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginBottom: 24,
            }}
          >
            <button
              className={styles.btnFill}
              onClick={() => {
                setCreatedProduct(null);
                refetch();
              }}
            >
              Listo, volver a la lista ✓
            </button>
          </div>
        </>
      )}

      {/* ── Tabla de productos ── */}
      {loading ? (
        <Loader />
      ) : (
        <>
          <div className={styles.card}>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Categoría</th>
                    <th>Precio</th>
                    <th>Stock</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {products.length ? (
                    products.map((p) => (
                      <tr key={String(p.id)}>
                        <td>
                          <div className={styles.prodCell}>
                            {p.imageUrl ? (
                              <img
                                className={styles.prodImg}
                                src={p.imageUrl}
                                alt={p.name}
                              />
                            ) : (
                              <div
                                className={styles.prodDot}
                                style={{ background: "#f5f5f5" }}
                              />
                            )}
                            <div>
                              <span>{p.name}</span>

                              {Array.isArray(p.variants) &&
                                p.variants.length > 0 && (
                                  <div
                                    style={{
                                      fontSize: 11,
                                      color: "#9a9a9a",
                                      marginTop: 2,
                                    }}
                                  >
                                    {p.variants.slice(0, 3).map((v) => (
                                      <span
                                        key={v.id}
                                        style={{ marginRight: 6 }}
                                      >
                                        {v.color} {v.size} ({v.stock})
                                      </span>
                                    ))}
                                  </div>
                                )}
                            </div>
                          </div>
                        </td>
                        <td
                          className={styles.tdNum}
                          style={{ textTransform: "capitalize" }}
                        >
                          {String(p.category ?? "")}
                        </td>
                        <td className={styles.tdGold}>
                          {formatPrice(p.price)}
                        </td>
                        <td className={styles.tdNum}>
                          {Array.isArray(p.variants)
                            ? p.variants.reduce(
                                (acc, v) => acc + (v.stock ?? 0),
                                0,
                              )
                            : 0}
                        </td>
                        <td
                          style={{
                            display: "flex",
                            gap: 4,
                            flexWrap: "wrap",
                            alignItems: "center",
                          }}
                        >
                          {p.isNew && (
                            <span
                              className={`${styles.badge} ${styles.badgeBlue}`}
                            >
                              Nuevo
                            </span>
                          )}
                          {p.isSale && (
                            <span
                              className={`${styles.badge} ${styles.badgeGreen}`}
                            >
                              Rebaja
                            </span>
                          )}
                          {!p.isNew && !p.isSale && (
                            <span
                              className={`${styles.badge} ${styles.badgeGray}`}
                            >
                              Estándar
                            </span>
                          )}
                        </td>
                        <td>
                          <div className={styles.actionBtns}>
                            <button
                              className={styles.btnEdit}
                              onClick={() => {
                                setCreatedProduct({
                                  id: String(p.id),
                                  price: p.price,
                                });
                              }}
                            >
                              Variantes
                            </button>

                            <button
                              className={styles.btnEdit}
                              onClick={() => {
                                setCreatedProduct(null);
                                setFormData({ ...p, imageFile: null });
                              }}
                            >
                              Editar
                            </button>

                            <button
                              className={styles.btnDanger}
                              onClick={() => handleDelete(p.id)}
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className={styles.empty}>
                        {debouncedSearch
                          ? `Sin resultados para "${debouncedSearch}"`
                          : "Sin productos"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <Pagination
            page={page}
            total={total}
            onPrev={() => setPage((p) => p - 1)}
            onNext={() => setPage((p) => p + 1)}
          />
        </>
      )}
    </>
  );
};

// ─── Orders Section ───────────────────────────────────────────────────────────
const OrdersSection: React.FC<{
  token: string;
  show: (msg: string, type?: "success" | "error") => void;
}> = ({ token, show }) => {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");

  const fetchOrders = useCallback(
    () =>
      apiCall<Paginated<Order>>(
        `/admin/orders?page=${page}&limit=20${statusFilter ? `&status=${statusFilter}` : ""}`,
        token,
      ),
    [page, statusFilter, token],
  );

  const { data, loading } = useFetch(fetchOrders, [page, statusFilter, token]);
  const orders: Order[] =
    (data as any)?.data ?? (Array.isArray(data) ? data : []);
  const total: number = (data as any)?.total ?? orders.length;

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await apiCall(`/admin/orders/${orderId}`, token, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      show("Estado actualizado");
    } catch (e: any) {
      show("Error: " + e.message, "error");
    }
  };

  return (
    <>
      <div className={styles.tabHeader}>
        <h1 className={styles.pageTitle}>Pedidos</h1>
        <select
          className={styles.filterSel}
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <Loader />
      ) : (
        <>
          <div className={styles.card}>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Fecha</th>
                    <th>Cliente</th>
                    <th>Total</th>
                    <th>Estado</th>
                    <th>Cambiar estado</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length ? (
                    orders.map((o) => (
                      <tr key={String(o.id)}>
                        <td className={styles.tdNum} style={{ fontSize: 12 }}>
                          #{String(o.id).slice(-8).toUpperCase()}
                        </td>
                        <td className={styles.tdNum}>
                          {o.createdAt
                            ? new Date(o.createdAt).toLocaleDateString("es-MX")
                            : "—"}
                        </td>
                        <td>
                          {(o as any).user?.firstName ??
                            (o.shippingAddress as any)?.firstName ??
                            "—"}{" "}
                          {(o as any).user?.lastName ??
                            (o.shippingAddress as any)?.lastName ??
                            ""}
                        </td>
                        <td className={styles.tdGold}>
                          {formatPrice(o.total ?? 0)}
                        </td>
                        <td>
                          <StatusBadge status={o.status} />
                        </td>
                        <td>
                          <select
                            className={styles.statusSel}
                            defaultValue={o.status}
                            onChange={(e) =>
                              handleStatusChange(String(o.id), e.target.value)
                            }
                          >
                            {Object.entries(STATUS_LABELS).map(([k, v]) => (
                              <option key={k} value={k}>
                                {v}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className={styles.empty}>
                        Sin pedidos
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <Pagination
            page={page}
            total={total}
            onPrev={() => setPage((p) => p - 1)}
            onNext={() => setPage((p) => p + 1)}
          />
        </>
      )}
    </>
  );
};

// ─── Users Section ────────────────────────────────────────────────────────────
const UsersSection: React.FC<{
  token: string;
  show: (msg: string, type?: "success" | "error") => void;
}> = ({ token, show }) => {
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState<"all" | "Admin" | "Customer">(
    "all",
  );
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState<string | number | null>(null);

  const debouncedSearch = useDebounce(search, 350);

  const buildQuery = useCallback(() => {
    const p = new URLSearchParams();
    p.set("page", String(page));
    p.set("limit", "20");
    if (roleFilter !== "all") p.set("role", roleFilter);
    if (debouncedSearch) p.set("search", debouncedSearch);
    return p.toString();
  }, [page, roleFilter, debouncedSearch]);

  const fetchUsers = useCallback(
    () => apiCall<Paginated<User>>(`/Users?${buildQuery()}`, token),
    [buildQuery, token],
  );

  const { data, loading, refetch } = useFetch(fetchUsers, [buildQuery, token]);
  const users: User[] =
    (data as any)?.data ?? (Array.isArray(data) ? data : []);
  const total: number = (data as any)?.total ?? users.length;

  useEffect(() => {
    setPage(1);
  }, [roleFilter, debouncedSearch]);

  const handleRoleChange = async (id: string | number, role: string) => {
    setUpdating(id);
    try {
      await apiCall(`/admin/users/${id}/role`, token, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });
      show("Rol actualizado");
      refetch();
    } catch (e: any) {
      show("Error: " + e.message, "error");
    } finally {
      setUpdating(null);
    }
  };

  const ROLE_TABS: { key: "all" | "Admin" | "Customer"; label: string }[] = [
    { key: "all", label: `Todos (${total})` },
    { key: "Admin", label: "Administradores" },
    { key: "Customer", label: "Clientes" },
  ];

  return (
    <>
      <div className={styles.tabHeader}>
        <h1 className={styles.pageTitle}>Usuarios</h1>
        <span style={{ fontSize: 12, color: "#9a9a9a" }}>
          {total} registros
        </span>
      </div>

      {/* Tabs de rol + búsqueda */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 2,
            background: "#f0f0f0",
            borderRadius: 8,
            padding: 3,
          }}
        >
          {ROLE_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setRoleFilter(t.key)}
              style={{
                padding: "6px 14px",
                border: "none",
                borderRadius: 6,
                fontSize: 12,
                fontFamily: "inherit",
                cursor: "pointer",
                fontWeight: roleFilter === t.key ? 500 : 400,
                background: roleFilter === t.key ? "#fff" : "transparent",
                color: roleFilter === t.key ? "#0a0a0a" : "#6e6e6e",
                boxShadow:
                  roleFilter === t.key ? "0 1px 3px rgba(0,0,0,.08)" : "none",
                transition: "all .15s",
                whiteSpace: "nowrap",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ position: "relative", width: 280 }}>
          <svg
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "none",
              color: "#9a9a9a",
            }}
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="search"
            className={styles.fieldInput}
            style={{ paddingLeft: 30, marginBottom: 0 }}
            placeholder="Buscar por nombre o email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <Loader />
      ) : (
        <>
          <div
            className={styles.card}
            style={{ padding: 0, overflow: "hidden" }}
          >
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ paddingLeft: 20 }}>Usuario</th>
                    <th>Email</th>
                    <th>Registro</th>
                    <th>Rol</th>
                    <th>Cambiar rol</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length ? (
                    users.map((u) => {
                      const isAdmin = u.role === "Admin";
                      const initials =
                        `${u.firstName?.charAt(0) ?? ""}${u.lastName?.charAt(0) ?? ""}`.toUpperCase();
                      const isUpdating = updating === u.id;
                      return (
                        <tr key={String(u.id)}>
                          <td style={{ paddingLeft: 20 }}>
                            <div className={styles.userCell}>
                              <div
                                className={styles.avatar}
                                style={{
                                  background: isAdmin ? "#0a0a0a" : "#e8e8e8",
                                  color: isAdmin ? "#fff" : "#4a4a4a",
                                }}
                              >
                                {initials || "?"}
                              </div>
                              <div>
                                <div
                                  style={{
                                    fontSize: 13,
                                    fontWeight: 500,
                                    color: "#0a0a0a",
                                  }}
                                >
                                  {u.firstName} {u.lastName}
                                </div>
                                <div
                                  style={{
                                    fontSize: 10,
                                    color: "#bbb",
                                    marginTop: 1,
                                  }}
                                >
                                  #{String(u.id).slice(-8).toUpperCase()}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className={styles.tdNum}>{u.email}</td>
                          <td className={styles.tdNum}>
                            {u.createdAt
                              ? new Date(u.createdAt).toLocaleDateString(
                                  "es-MX",
                                  {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  },
                                )
                              : "—"}
                          </td>
                          <td>
                            <span
                              className={`${styles.badge} ${isAdmin ? styles.badgeGold : styles.badgeGray}`}
                            >
                              {isAdmin ? "Admin" : "Cliente"}
                            </span>
                          </td>
                          <td>
                            {isUpdating ? (
                              <span style={{ fontSize: 11, color: "#9a9a9a" }}>
                                Guardando…
                              </span>
                            ) : (
                              <select
                                className={styles.statusSel}
                                value={isAdmin ? "Admin" : "Customer"}
                                onChange={(e) =>
                                  handleRoleChange(u.id, e.target.value)
                                }
                              >
                                <option value="Customer">Cliente</option>
                                <option value="Admin">Admin</option>
                              </select>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className={styles.empty}>
                        {debouncedSearch
                          ? `Sin resultados para "${debouncedSearch}"`
                          : roleFilter !== "all"
                            ? `No hay usuarios con rol ${roleFilter}`
                            : "Sin usuarios"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <Pagination
            page={page}
            total={total}
            onPrev={() => setPage((p) => p - 1)}
            onNext={() => setPage((p) => p + 1)}
          />
        </>
      )}
    </>
  );
};

// ─── Main Admin Component ─────────────────────────────────────────────────────
type Tab = "dashboard" | "products" | "orders" | "users";

const NAV_ITEMS: { tab: Tab; icon: string; label: string }[] = [
  { tab: "dashboard", icon: "◈", label: "Dashboard" },
  { tab: "products", icon: "◫", label: "Productos" },
  { tab: "orders", icon: "◻", label: "Pedidos" },
  { tab: "users", icon: "◉", label: "Usuarios" },
];

const Admin: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("dashboard");
  const { toast, show } = useToast();

  if (!user || user.role !== "Admin") {
    navigate("/");
    return null;
  }

  const authToken =
    localStorage.getItem("nw_token") ??
    localStorage.getItem("nexwear_token") ??
    localStorage.getItem("token") ??
    localStorage.getItem("accessToken") ??
    "";

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarBrand}>
          <div className={styles.brandName}>Nexwear</div>
          <div className={styles.brandSub}>Admin Panel</div>
        </div>

        <nav className={styles.sidebarNav}>
          {NAV_ITEMS.map(({ tab: t, icon, label }) => (
            <button
              key={t}
              className={`${styles.navBtn} ${tab === t ? styles.navBtnActive : ""}`}
              onClick={() => setTab(t)}
            >
              <span className={styles.navIcon}>{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className={styles.sidebarFoot}>
          <button className={styles.backBtn} onClick={() => navigate("/")}>
            ← Ir a la tienda
          </button>
        </div>
      </aside>

      <main className={styles.main}>
        {tab === "dashboard" && <DashboardSection token={authToken} />}
        {tab === "products" && (
          <ProductsSection token={authToken} show={show} />
        )}
        {tab === "orders" && <OrdersSection token={authToken} show={show} />}
        {tab === "users" && <UsersSection token={authToken} show={show} />}
      </main>

      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </div>
  );
};

export default Admin;
