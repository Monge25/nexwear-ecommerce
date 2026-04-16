import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { LayoutDashboard, Package, ShoppingBag, Users, Star, FileText } from "lucide-react";
import { useFetch } from "@/hooks/useFetch";
import { formatPrice } from "@/utils/formatPrice";
import { CATEGORIES, SIZES } from "@/utils/constants";
import type { Product, Order, User } from "@/types";
import Loader from "@/components/ui/Loader";
import styles from "./Admin.module.css";
import { VariantManager } from "./VariantManager";
import env from "@/config/environment";
import { PagedResult } from "@/types/pagination";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";


// ─── Constants ────────────────────────────────────────────────────────────────
const BASE = env.API_BASE_URL;
const BASE_URL = env.AUTH_BASE_URL;

const STATUS_LABELS: Record<string, string> = {
  Pending: "Pendiente",
  Processing: "En proceso",
  Shipped: "Enviado",
  Delivered: "Entregado",
  Cancelled: "Cancelado",
  Paid: "Confirmado",
};

const CHART_COLORS = [
  "#0a0a0a",
  "#c9a84c",
  "#6e6e6e",
  "#d4b896",
  "#4a4a4a",
  "#9a9a9a",
];

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
  variants: [],
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
      </div>

      <div className={styles.grid2}>
        <div className={styles.fieldWrap}>
          <label className={styles.fieldLabel}>Categoría</label>
          <select
            required
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
            value={form.price ?? ""}
            onChange={(e) =>
              setForm((f) => ({ ...f, price: Number(e.target.value) }))
            }
            required
          />
        </div>
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
  const { data: ordersRes, loading: ol } = useFetch(
    useCallback(
      () =>
        apiCall<any>("/Admin/orders?page=1&pageSize=50", token).catch(() => ({
          orders: [],
          total: 0,
        })),
      [token],
    ),
    [token],
  );

  const { data: usersRes, loading: ul } = useFetch(
    useCallback(
      () =>
        apiCall<any>("/Admin/users?page=1&pageSize=100", token).catch(() => ({
          users: [],
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

  if (ol || ul || pl) return <Loader />;

  const orders: Order[] = (ordersRes as any)?.orders ?? [];
  const users: any[] = (usersRes as any)?.users ?? [];
  const totalProducts = productsRes?.totalCount ?? 0;

  const totalRevenue = orders.reduce((a, o) => a + (o.total ?? 0), 0);
  const totalOrders = (ordersRes as any)?.total ?? orders.length;
  const totalUsers = (usersRes as any)?.total ?? users.length;

  // Ingresos por mes
  const revenueByMonth = orders.reduce((acc: Record<string, number>, o) => {
    if (!o.createdAt) return acc;
    const month = new Date(o.createdAt).toLocaleDateString("es-MX", {
      month: "short",
      year: "2-digit",
    });
    acc[month] = (acc[month] ?? 0) + (o.total ?? 0);
    return acc;
  }, {});
  const revenueChartData = Object.entries(revenueByMonth).map(
    ([month, revenue]) => ({
      month,
      revenue: Math.round(revenue as number),
    }),
  );

  // Pedidos por estado para la dona
  const byStatus = orders.reduce((acc: Record<string, number>, o) => {
    const s = o.status ?? "unknown";
    acc[s] = (acc[s] ?? 0) + 1;
    return acc;
  }, {});
  const statusChartData = Object.entries(byStatus).map(([name, value]) => ({
    name: STATUS_LABELS[name] ?? name,
    value,
  }));

  // Pedidos recientes ordenados por fecha
  const recentOrders = [...orders]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 5);

  return (
    <>
      {/* KPIs */}
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

      {/* Gráfica de ingresos por mes */}
      {revenueChartData.length > 0 && (
        <div className={styles.card}>
          <p className={styles.cardTitle}>Ingresos por Mes</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart
              data={revenueChartData}
              margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9a9a9a" }} />
              <YAxis
                tick={{ fontSize: 11, fill: "#9a9a9a" }}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value) => [formatPrice(Number(value)), "Ingresos"]}
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid #e8e8e8",
                }}
              />

              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#c9a84c"
                strokeWidth={2}
                dot={{ fill: "#c9a84c", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className={styles.grid2}>
        {/* Pedidos recientes */}
        <div className={styles.card}>
          <p className={styles.cardTitle}>Pedidos Recientes</p>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Estado</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.length ? (
                  recentOrders.map((o) => (
                    <tr key={String(o.id)}>
                      <td style={{ fontSize: 12 }}>
                        {(o as any).customerName ?? "—"}
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

        {/* Dona de pedidos por estado */}
        <div className={styles.card}>
          <p className={styles.cardTitle}>Pedidos por Estado</p>
          {statusChartData.length === 0 ? (
            <p style={{ fontSize: 13, color: "#9a9a9a" }}>Sin datos</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={statusChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {statusChartData.map((_, index) => (
                    <Cell
                      key={index}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid #e8e8e8",
                  }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
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
      p.variants.forEach((v: any) => {
        if (v.stock < 0) v.stock = 0;
      });
    });
  }, [products]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, sortOrder]);

  const handleSave = async (body: ProductFormData) => {
    setSaving(true);
    try {
      if (body.id) {
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
        const dto = {
          name: body.name ?? "",
          description: body.description ?? "",
          price: Number(body.price ?? 0),
          category: body.category ?? "mujer",
          material: body.material ?? "",
          care: body.care ?? "",
          origin: body.origin ?? "",
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
              Listo, volver a la lista
            </button>
          </div>
        </>
      )}

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
      apiCall<any>(
        `/Admin/orders?page=${page}&pageSize=20${statusFilter ? `&status=${statusFilter}` : ""}`,
        token,
      ),
    [page, statusFilter, token],
  );

  const { data, loading, refetch } = useFetch(fetchOrders, [
    page,
    statusFilter,
    token,
  ]);

  const orders: Order[] =
    (data as any)?.orders ??
    (data as any)?.items ??
    (data as any)?.data ??
    (Array.isArray(data) ? data : []);

  const total: number =
    (data as any)?.totalCount ?? (data as any)?.total ?? orders.length;

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await apiCall(`/Admin/orders/${orderId}/status`, token, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      show("Estado actualizado");
      refetch();
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
                          #
                          {String((o as any).orderNumber ?? o.id)
                            .slice(-10)
                            .toUpperCase()}
                        </td>
                        <td className={styles.tdNum}>
                          {o.createdAt
                            ? new Date(o.createdAt).toLocaleDateString("es-MX")
                            : "—"}
                        </td>
                        <td style={{ fontSize: 12 }}>
                          {(o as any).customerName ?? "—"}
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
                            key={o.status}
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
    p.set("pageSize", "20");
    if (roleFilter !== "all") p.set("role", roleFilter);
    if (debouncedSearch) p.set("search", debouncedSearch);
    return p.toString();
  }, [page, roleFilter, debouncedSearch]);

  const fetchUsers = useCallback(
    () => apiCall<any>(`/Admin/users?${buildQuery()}`, token),
    [buildQuery, token],
  );

  const { data, loading, refetch } = useFetch(fetchUsers, [buildQuery, token]);

  const users: User[] =
    (data as any)?.users ??
    (data as any)?.items ??
    (data as any)?.data ??
    (Array.isArray(data) ? data : []);

  const total: number =
    (data as any)?.totalCount ?? (data as any)?.total ?? users.length;

  useEffect(() => {
    setPage(1);
  }, [roleFilter, debouncedSearch]);

  const handleRoleChange = async (id: string | number, role: string) => {
    setUpdating(id);
    try {
      await apiCall(`/Admin/users/${id}/role`, token, {
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
                    <th>Usuario</th>
                    <th>Email</th>
                    <th>Registro</th>
                    <th>Rol</th>
                    <th>Cambiar rol</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length ? (
                    users.map((u) => {
                      const isAdmin = u.role?.toLowerCase() === "admin";
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

// ─── Reviews Section ──────────────────────────────────────────────────────────
const ReviewsSection: React.FC<{
  token: string;
  show: (msg: string, type?: "success" | "error") => void;
}> = ({ token, show }) => {
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<"pending" | "all">("pending");

  const fetchReviews = useCallback(() => {
    if (tab === "pending") {
      return apiCall<any>(
        `/Reviews/pending?page=${page}&limit=20`,
        token,
      ).catch(() =>
        apiCall<any>(`/Reviews?page=${page}&limit=20&isApproved=false`, token),
      );
    }
    return apiCall<any>(`/Reviews?page=${page}&limit=20`, token);
  }, [page, tab, token]);

  const { data, loading, refetch } = useFetch(fetchReviews, [page, tab, token]);

  const reviews: any[] =
    (data as any)?.data ??
    (data as any)?.items ??
    (Array.isArray(data) ? data : []);
  const total: number =
    (data as any)?.total ?? (data as any)?.totalCount ?? reviews.length;

  const moderateReview = async (id: string, approve: boolean) => {
    try {
      await apiCall(`/Reviews/${id}/moderate`, token, {
        method: "PUT",
        body: JSON.stringify({ approved: approve }),
      });
      show(approve ? "Reseña aprobada" : "Reseña rechazada");
      refetch();
    } catch (e: any) {
      show("Error al moderar: " + e.message, "error");
    }
  };

  const deleteReview = async (id: string) => {
    if (!confirm("¿Eliminar esta reseña? No se puede deshacer.")) return;
    try {
      await apiCall(`/Reviews/${id}`, token, { method: "DELETE" });
      show("Reseña eliminada");
      refetch();
    } catch (e: any) {
      show("Error: " + e.message, "error");
    }
  };

  const TAB_STYLE = (active: boolean): React.CSSProperties => ({
    padding: "6px 16px",
    border: "none",
    borderRadius: 6,
    fontSize: 12,
    fontFamily: "inherit",
    cursor: "pointer",
    fontWeight: active ? 500 : 400,
    background: active ? "#fff" : "transparent",
    color: active ? "#0a0a0a" : "#6e6e6e",
    boxShadow: active ? "0 1px 3px rgba(0,0,0,.08)" : "none",
    transition: "all .15s",
  });

  return (
    <>
      <div className={styles.tabHeader}>
        <h1 className={styles.pageTitle}>Reseñas</h1>
        <span style={{ fontSize: 12, color: "#9a9a9a" }}>
          {total} registros
        </span>
      </div>

      <div
        style={{
          display: "flex",
          gap: 2,
          background: "#f0f0f0",
          borderRadius: 8,
          padding: 3,
          width: "fit-content",
          marginBottom: 16,
        }}
      >
        {(
          [
            ["pending", "Pendientes"],
            ["all", "Todas"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            style={TAB_STYLE(tab === key)}
            onClick={() => {
              setTab(key);
              setPage(1);
            }}
          >
            {label}
          </button>
        ))}
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
                    <th>Producto</th>
                    <th>Usuario</th>
                    <th>Rating</th>
                    <th>Título</th>
                    <th>Comentario</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {reviews.length ? (
                    reviews.map((r: any) => (
                      <tr key={r.id}>
                        <td>
                          <div className={styles.prodCell}>
                            {r.product?.imageUrl && (
                              <img
                                src={r.product.imageUrl}
                                className={styles.prodImg}
                                alt=""
                              />
                            )}
                            <span style={{ fontSize: 12 }}>
                              {r.product?.name ?? "—"}
                            </span>
                          </div>
                        </td>
                        <td style={{ fontSize: 12 }}>
                          {r.user?.firstName ?? r.userName ?? "—"}{" "}
                          {r.user?.lastName ?? ""}
                        </td>
                        <td>
                          <span
                            style={{
                              color: "var(--dorado, #c9a84c)",
                              fontWeight: 600,
                            }}
                          >
                            {"★".repeat(r.rating)}
                            {"☆".repeat(5 - r.rating)}
                          </span>
                        </td>
                        <td
                          style={{
                            fontSize: 12,
                            fontWeight: 500,
                            maxWidth: 160,
                          }}
                        >
                          {r.title ?? "—"}
                        </td>
                        <td
                          style={{ fontSize: 12, color: "#555", maxWidth: 260 }}
                        >
                          <span title={r.comment ?? r.body ?? ""}>
                            {(r.comment ?? r.body ?? "").slice(0, 100)}
                            {(r.comment ?? r.body ?? "").length > 100
                              ? "…"
                              : ""}
                          </span>
                        </td>
                        <td>
                          {r.isRejected ? (
                            <span
                              className={`${styles.badge} ${styles.badgeRed}`}
                            >
                              Rechazada
                            </span>
                          ) : r.isApproved ? (
                            <span
                              className={`${styles.badge} ${styles.badgeGreen}`}
                            >
                              Aprobada
                            </span>
                          ) : (
                            <span
                              className={`${styles.badge} ${styles.badgeGray}`}
                            >
                              Pendiente
                            </span>
                          )}
                        </td>
                        <td>
                          <div className={styles.actionBtns}>
                            {!r.isApproved && (
                              <button
                                className={styles.btnEdit}
                                onClick={() =>
                                  moderateReview(String(r.id), true)
                                }
                              >
                                Aprobar
                              </button>
                            )}
                            {r.isApproved && (
                              <button
                                className={styles.btnGhost}
                                onClick={() =>
                                  moderateReview(String(r.id), false)
                                }
                              >
                                Rechazar
                              </button>
                            )}
                            <button
                              className={styles.btnDanger}
                              onClick={() => deleteReview(String(r.id))}
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className={styles.empty}>
                        {tab === "pending"
                          ? "No hay reseñas pendientes"
                          : "Sin reseñas"}
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

// ─── Audit Log Types ──────────────────────────────────────────────────────────
interface AuditLog {
  id: string;
  userEmail: string | null;
  userId: string | null;
  action: string;
  category: string;
  result: string;
  details: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

interface AuditLogResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

type ExportRange = "today" | "week" | "month";

// ─── Audit Log Constants ──────────────────────────────────────────────────────
const ACTION_LABELS: Record<string, string> = {
  LOGIN_SUCCESS: "Login exitoso",
  LOGIN_FAILED: "Login fallido",
  REGISTER: "Registro",
  LOGOUT: "Logout",
  PASSWORD_RESET_REQUEST: "Solicitud reset",
  PASSWORD_RESET_SUCCESS: "Reset exitoso",
  ORDER_CREATED: "Pedido creado",
  ORDER_STATUS_CHANGED: "Estado pedido",
  ORDER_CANCELLED: "Pedido cancelado",
  CART_ITEM_ADDED: "Item agregado",
  CART_ITEM_REMOVED: "Item eliminado",
  CART_CLEARED: "Carrito limpiado",
  ADMIN_USER_ROLE_CHANGED: "Rol cambiado",
  ADMIN_REVIEW_MODERATED: "Reseña moderada",
  ADMIN_ORDER_STATUS_CHANGED: "Estado pedido (admin)",
  PRODUCT_CREATED: "Producto creado",
  PRODUCT_DELETED: "Producto eliminado",
  PRODUCT_UPDATED: "Producto actualizado",
  REVIEW_CREATED: "Reseña creada",
  REVIEW_DELETED: "Reseña eliminada",
};

const LOG_CATEGORIES = ["", "Auth", "Order", "Cart", "Admin", "Product", "Review"];

const LOG_CATEGORY_LABELS: Record<string, string> = {
  "": "Todas",
  Auth: "Auth",
  Order: "Pedidos",
  Cart: "Carrito",
  Admin: "Admin",
  Product: "Productos",
  Review: "Reseñas",
};

// ─── Logs Section ─────────────────────────────────────────────────────────────
const LogsSection: React.FC<{
  token: string;
  show: (msg: string, type?: "success" | "error") => void;
}> = ({ token, show }) => {
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState("");
  const [resultFilter, setResultFilter] = useState("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [exportRange, setExportRange] = useState<ExportRange>("month");
  const [exporting, setExporting] = useState<"pdf" | "xlsx" | null>(null);

  const debouncedSearch = useDebounce(search, 400);

  const buildQuery = useCallback(() => {
    const p = new URLSearchParams();
    p.set("page", String(page));
    p.set("pageSize", "20");
    if (category) p.set("category", category);
    if (resultFilter) p.set("result", resultFilter);
    if (debouncedSearch) p.set("search", debouncedSearch);
    if (dateFrom) p.set("from", new Date(dateFrom).toISOString());
    if (dateTo) p.set("to", new Date(dateTo + "T23:59:59").toISOString());
    return p.toString();
  }, [page, category, resultFilter, debouncedSearch, dateFrom, dateTo]);

  const { data, loading } = useFetch(
    useCallback(
      () =>
        apiCall<AuditLogResponse>(
          `/Admin/audit-logs?${buildQuery()}`,
          token,
        ).catch(() => ({
          logs: [],
          total: 0,
          page: 1,
          pageSize: 20,
          totalPages: 1,
        })),
      [buildQuery, token],
    ),
    [buildQuery, token],
  );

  const logs = data?.logs ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  useEffect(() => {
    setPage(1);
  }, [category, resultFilter, debouncedSearch, dateFrom, dateTo]);

  // ── Export helpers ─────────────────────────────────────────────────────────
  const getRangeDates = useCallback(() => {
    const now = new Date();
    const from = new Date();
    if (exportRange === "today") from.setHours(0, 0, 0, 0);
    else if (exportRange === "week") from.setDate(from.getDate() - 7);
    else from.setMonth(from.getMonth() - 1);
    return { from: from.toISOString(), to: now.toISOString() };
  }, [exportRange]);

  const fetchAllForExport = useCallback(async (): Promise<AuditLog[]> => {
    const { from, to } = getRangeDates();
    const p = new URLSearchParams();
    p.set("page", "1");
    p.set("pageSize", "1000");
    if (category) p.set("category", category);
    if (resultFilter) p.set("result", resultFilter);
    p.set("from", from);
    p.set("to", to);
    const res = await apiCall<AuditLogResponse>(
      `/Admin/audit-logs?${p.toString()}`,
      token,
    );
    return res.logs ?? [];
  }, [getRangeDates, category, resultFilter, token]);

  // const handleExportXLSX = async () => {
  //   setExporting("xlsx");
  //   try {
  //     const XLSX = await import("xlsx");
  //     const exportLogs = await fetchAllForExport();
  //     const rows = exportLogs.map((l) => ({
  //       Fecha: l.createdAt ? new Date(l.createdAt).toLocaleString("es-MX") : "",
  //       Acción: l.action,
  //       Categoría: l.category,
  //       Resultado: l.result,
  //       Email: l.userEmail ?? "",
  //       "User ID": l.userId ?? "",
  //       IP: l.ipAddress ?? "",
  //       Detalles: l.details ?? "",
  //       "User Agent": l.userAgent ?? "",
  //     }));
  //     const ws = XLSX.utils.json_to_sheet(rows);
  //     ws["!cols"] = [16, 24, 14, 12, 28, 16, 16, 40, 40].map((w) => ({ wch: w }));
  //     const wb = XLSX.utils.book_new();
  //     XLSX.utils.book_append_sheet(wb, ws, "Audit Logs");
  //     XLSX.writeFile(wb, `nexwear-logs-${new Date().toISOString().slice(0, 10)}.xlsx`);
  //   } catch (e: any) {
  //     show("Error al exportar Excel: " + e.message, "error");
  //   } finally {
  //     setExporting(null);
  //   }
  // };

  const handleExportPDF = async () => {
    setExporting("pdf");
    try {
      const { jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");
      const exportLogs = await fetchAllForExport();
      const rangeLabel = { today: "Hoy", week: "Esta semana", month: "Este mes" }[exportRange];

      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      doc.setFontSize(14);
      doc.text("Nexwear — Audit Logs", 40, 36);
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(
        `Exportado: ${new Date().toLocaleString("es-MX")}  ·  Período: ${rangeLabel}  ·  ${exportLogs.length} registros`,
        40,
        52,
      );

      autoTable(doc, {
        startY: 66,
        head: [["Fecha", "Acción", "Categoría", "Resultado", "Email / ID", "IP", "Detalles"]],
        body: exportLogs.map((l) => [
          l.createdAt
            ? new Date(l.createdAt).toLocaleString("es-MX", {
                dateStyle: "short",
                timeStyle: "short",
              })
            : "",
          l.action,
          l.category,
          l.result,
          l.userEmail ?? (l.userId ? "#" + String(l.userId).slice(-8).toUpperCase() : ""),
          l.ipAddress ?? "",
          (l.details ?? "").slice(0, 80),
        ]),
        styles: { fontSize: 7.5, cellPadding: 4 },
        headStyles: { fillColor: [10, 10, 10], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [248, 248, 248] },
        columnStyles: {
          0: { cellWidth: 70 },
          1: { cellWidth: 90 },
          2: { cellWidth: 54 },
          3: { cellWidth: 50 },
          4: { cellWidth: 110 },
          5: { cellWidth: 70 },
          6: { cellWidth: "auto" as any },
        },
        margin: { left: 40, right: 40 },
      });

      doc.save(`nexwear-logs-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e: any) {
      show("Error al exportar PDF: " + e.message, "error");
    } finally {
      setExporting(null);
    }
  };

  // ── Helpers de render ──────────────────────────────────────────────────────
  const getCategoryBadgeClass = (cat: string): string => {
    const map: Record<string, string> = {
      Auth: styles.badgeBlue,
      Order: styles.badgeBlue,
      Cart: styles.badgeGreen,
      Admin: styles.badgeGold,
      Product: styles.badgeGold,
      Review: styles.badgeGray,
    };
    return map[cat] ?? styles.badgeGray;
  };

  const formatDetails = (raw: string | null): string => {
    if (!raw) return "—";
    try {
      return JSON.stringify(JSON.parse(raw), null, 1).slice(0, 120);
    } catch {
      return raw.slice(0, 80);
    }
  };

  return (
    <>
      {/* Header */}
      <div className={styles.tabHeader}>
        <h1 className={styles.pageTitle}>Logs de auditoría</h1>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <select
            className={styles.filterSel}
            value={exportRange}
            onChange={(e) => setExportRange(e.target.value as ExportRange)}
          >
            <option value="today">Hoy</option>
            <option value="week">Esta semana</option>
            <option value="month">Este mes</option>
          </select>
          <button
            className={styles.btnEdit}
            disabled={exporting !== null}
            onClick={handleExportPDF}
            style={{
              background: "#fcebeb",
              color: "#a32d2d",
              border: "none",
              opacity: exporting === "pdf" ? 0.6 : 1,
            }}
          >
            {exporting === "pdf" ? "Exportando…" : "↓ PDF"}
          </button>
          {/* <button
            className={styles.btnEdit}
            disabled={exporting !== null}
            onClick={handleExportXLSX}
            style={{
              background: "#eaf3de",
              color: "#3b6d11",
              border: "none",
              opacity: exporting === "xlsx" ? 0.6 : 1,
            }}
          >
            {exporting === "xlsx" ? "Exportando…" : "↓ Excel"}
          </button> */}
        </div>
      </div>

      {/* Category pills */}
      <div
        style={{
          display: "flex",
          gap: 2,
          background: "#f0f0f0",
          borderRadius: 8,
          padding: 3,
          width: "fit-content",
          marginBottom: 14,
          flexWrap: "wrap",
        }}
      >
        {LOG_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            style={{
              padding: "5px 14px",
              border: "none",
              borderRadius: 6,
              fontSize: 12,
              fontFamily: "inherit",
              cursor: "pointer",
              fontWeight: category === cat ? 500 : 400,
              background: category === cat ? "#fff" : "transparent",
              color: category === cat ? "#0a0a0a" : "#6e6e6e",
              boxShadow: category === cat ? "0 1px 3px rgba(0,0,0,.08)" : "none",
              transition: "all .15s",
              whiteSpace: "nowrap",
            }}
          >
            {LOG_CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 14,
          alignItems: "center",
        }}
      >
        <div style={{ position: "relative", width: 240 }}>
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
            style={{ paddingLeft: 30, marginBottom: 0, fontSize: 12 }}
            placeholder="Email, acción, IP…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className={styles.filterSel}
          value={resultFilter}
          onChange={(e) => setResultFilter(e.target.value)}
        >
          <option value="">Todos los resultados</option>
          <option value="SUCCESS"> Éxito</option>
          <option value="ERROR"> Error</option>
        </select>

        <input
          type="date"
          className={styles.filterSel}
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          title="Desde"
          style={{ fontSize: 12 }}
        />

        <input
          type="date"
          className={styles.filterSel}
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          title="Hasta"
          style={{ fontSize: 12 }}
        />

        {!loading && total > 0 && (
          <span style={{ fontSize: 12, color: "#9a9a9a", whiteSpace: "nowrap" }}>
            {total} registro{total !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <Loader />
      ) : (
        <>
          <div className={styles.card}>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Acción</th>
                    <th>Categoría</th>
                    <th>Resultado</th>
                    <th>Usuario</th>
                    <th>IP</th>
                    <th>Detalles</th>
                    <th>User Agent</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length ? (
                    logs.map((log) => (
                      <tr key={log.id}>
                        <td
                          className={styles.tdNum}
                          style={{ fontSize: 11, whiteSpace: "nowrap" }}
                        >
                          {log.createdAt
                            ? new Date(log.createdAt).toLocaleString("es-MX", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </td>

                        <td>
                          <div style={{ fontSize: 12, fontWeight: 500 }}>
                            {ACTION_LABELS[log.action] ?? log.action}
                          </div>
                          <div
                            style={{
                              fontSize: 10,
                              color: "#9a9a9a",
                              marginTop: 1,
                              fontFamily: "monospace",
                            }}
                          >
                            {log.action}
                          </div>
                        </td>

                        <td>
                          <span
                            className={`${styles.badge} ${getCategoryBadgeClass(log.category)}`}
                          >
                            {log.category || "—"}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`${styles.badge} ${
                              log.result === "SUCCESS"
                                ? styles.badgeGreen
                                : styles.badgeGray
                            }`}
                          >
                            {log.result === "SUCCESS" ? "Éxito" : "Error"}
                          </span>
                        </td>

                        <td>
                          {log.userEmail ? (
                            <span style={{ fontSize: 11 }}>{log.userEmail}</span>
                          ) : log.userId ? (
                            <span
                              style={{
                                fontSize: 11,
                                fontFamily: "monospace",
                                color: "#9a9a9a",
                              }}
                            >
                              #{String(log.userId).slice(-8).toUpperCase()}
                            </span>
                          ) : (
                            <span style={{ color: "#bbb" }}>—</span>
                          )}
                        </td>

                        <td
                          className={styles.tdNum}
                          style={{ fontSize: 11, fontFamily: "monospace" }}
                        >
                          {log.ipAddress ?? "—"}
                        </td>

                        <td>
                          <pre
                            style={{
                              fontSize: 10,
                              fontFamily: "monospace",
                              color: "#6e6e6e",
                              maxWidth: 200,
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-all",
                              margin: 0,
                            }}
                          >
                            {formatDetails(log.details)}
                          </pre>
                        </td>

                        <td>
                          <div
                            title={log.userAgent ?? ""}
                            style={{
                              maxWidth: 160,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              fontSize: 10,
                              color: "#9a9a9a",
                            }}
                          >
                            {log.userAgent ?? "—"}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className={styles.empty}>
                        Sin logs para los filtros seleccionados
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
            pageSize={20}
            onPrev={() => setPage((p) => p - 1)}
            onNext={() => setPage((p) => p + 1)}
          />
        </>
      )}
    </>
  );
};

// ─── Main Admin Component ─────────────────────────────────────────────────────
type Tab = "dashboard" | "products" | "orders" | "users" | "reviews" | "logs";

const NAV_ITEMS: { tab: Tab; icon: React.ReactNode; label: string }[] = [
  { tab: "dashboard", icon: <LayoutDashboard size={15} />, label: "Dashboard" },
  { tab: "products", icon: <Package size={15} />, label: "Productos" },
  { tab: "orders", icon: <ShoppingBag size={15} />, label: "Pedidos" },
  { tab: "users", icon: <Users size={15} />, label: "Usuarios" },
  { tab: "reviews", icon: <Star size={15} />, label: "Reseñas" },
  { tab: "logs", icon: <FileText size={15} />, label: "Logs" },
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
        {tab === "reviews" && <ReviewsSection token={authToken} show={show} />}
        {tab === "logs" && <LogsSection token={authToken} show={show} />}
      </main>

      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </div>
  );
};

export default Admin;
