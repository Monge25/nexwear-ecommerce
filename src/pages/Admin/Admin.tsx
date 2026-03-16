import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useFetch } from "@/hooks/useFetch";
import adminService from "@/services/adminService";
import { formatPrice } from "@/utils/formatPrice";
import { ORDER_STATUS_LABELS, CATEGORIES, SIZES } from "@/utils/constants";
import type { Product, Order, User } from "@/types";
import Loader from "@/components/ui/Loader";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import styles from "./Admin.module.css";

type Tab = "dashboard" | "products" | "orders" | "users";

// ── Tiny sparkline (pure CSS/SVG) ────────────────────────────────────────────
const Sparkline: React.FC<{ values: number[]; color?: string }> = ({
  values,
  color = "var(--dorado)",
}) => {
  if (!values.length) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const h = 40;
  const w = 120;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / (max - min || 1)) * h;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        points={pts}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
};

// ── Product Form (create/edit) ────────────────────────────────────────────────
const blankProduct = (): Partial<Product> => ({
  name: "",
  slug: "",
  category: "mujer",
  price: 0,
  originalPrice: undefined,
  isNew: false,
  isSale: false,
  images: [],
  colors: [],
  sizes: [],
  material: "",
  description: "",
  rating: 0,
  reviewCount: 0,
  care: "",
  origin: "",
  stock: 0,
  tags: [],
});

const AdminProductForm: React.FC<{
  initial?: Partial<Product>;
  onSave: (data: Partial<Product>) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}> = ({ initial, onSave, onCancel, saving }) => {
  const [form, setForm] = useState<Partial<Product>>(initial ?? blankProduct());
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

  return (
    <form className={styles.productForm} onSubmit={handleSubmit}>
      <div className={styles.formGrid2}>
        <Input
          label="Nombre del producto"
          value={form.name ?? ""}
          onChange={set("name")}
          required
        />
        <Input
          label="Slug (URL)"
          value={form.slug ?? ""}
          onChange={set("slug")}
          required
        />
      </div>
      <div className={styles.formGrid2}>
        <div className={styles.fieldWrap}>
          <label className={styles.fieldLabel}>Categoría</label>
          <select
            className={styles.selectField}
            value={form.category}
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
        <Input
          label="Material"
          value={form.material ?? ""}
          onChange={set("material")}
        />
      </div>
      <div className={styles.formGrid3}>
        <Input
          label="Precio (USD)"
          type="number"
          value={form.price ?? ""}
          onChange={(e) =>
            setForm((f) => ({ ...f, price: Number(e.target.value) }))
          }
          required
        />
        <Input
          label="Precio original"
          type="number"
          value={form.originalPrice ?? ""}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              originalPrice: Number(e.target.value) || undefined,
            }))
          }
          hint="Dejar vacío si no hay oferta"
        />
        <Input
          label="Stock"
          type="number"
          value={form.stock ?? ""}
          onChange={(e) =>
            setForm((f) => ({ ...f, stock: Number(e.target.value) }))
          }
        />
      </div>
      <div className={styles.fieldWrap}>
        <label className={styles.fieldLabel}>Descripción</label>
        <textarea
          className={styles.textareaField}
          value={form.description ?? ""}
          onChange={set("description")}
          rows={3}
        />
      </div>
      <div className={styles.formGrid2}>
        <Input
          label="Cuidados"
          value={form.care ?? ""}
          onChange={set("care")}
        />
        <Input
          label="País de origen"
          value={form.origin ?? ""}
          onChange={set("origin")}
        />
      </div>
      <div className={styles.checkRow}>
        <label className={styles.checkLabel}>
          <input
            type="checkbox"
            checked={form.isNew ?? false}
            onChange={(e) =>
              setForm((f) => ({ ...f, isNew: e.target.checked }))
            }
          />
          Nuevo
        </label>
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
      <div className={styles.fieldWrap}>
        <label className={styles.fieldLabel}>Tallas disponibles</label>
        <div className={styles.sizePicker}>
          {SIZES.map((s) => (
            <button
              key={s}
              type="button"
              className={`${styles.sizeChip} ${(form.sizes ?? []).includes(s) ? styles.sizeChipOn : ""}`}
              onClick={() =>
                setForm((f) => {
                  const cur = f.sizes ?? [];
                  return {
                    ...f,
                    sizes: cur.includes(s)
                      ? cur.filter((x) => x !== s)
                      : [...cur, s],
                  };
                })
              }
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.formBtns}>
        <Button variant="ghost" type="button" onClick={onCancel}>
          Cancelar
        </Button>
        <Button variant="fill" type="submit" loading={saving}>
          {initial?.id ? "Guardar cambios" : "Crear producto"}
        </Button>
      </div>
    </form>
  );
};

// ── Main Admin Component ──────────────────────────────────────────────────────
const Admin: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [tab, setTab] = useState<Tab>("dashboard");
  const [productForm, setForm] = useState<Partial<Product> | null>(null);
  const [saving, setSaving] = useState(false);
  const [orderPage, setOPage] = useState(1);
  const [userPage, setUPage] = useState(1);
  const [productPage, setPPage] = useState(1);
  const [statusFilter, setStatus] = useState("");

  const { data: stats, loading: statsLoading } = useFetch(
    () => adminService.getStats(),
    [],
  );
  const {
    data: products,
    loading: prodLoading,
    refetch: refetchProds,
  } = useFetch(() => adminService.getProducts(productPage), [productPage]);
  const { data: orders, loading: ordLoading } = useFetch(
    () => adminService.getOrders(orderPage, statusFilter || undefined),
    [orderPage, statusFilter],
  );
  const { data: users, loading: usrLoading } = useFetch(
    () => adminService.getUsers(userPage),
    [userPage],
  );

  // Redirect non-admins
  if (user && user.role !== "Admin") {
    navigate("/");
    return null;
  }

  const handleSaveProduct = async (data: Partial<Product>) => {
    setSaving(true);
    try {
      if (data.id) await adminService.updateProduct(data.id, data);
      else await adminService.createProduct(data as Omit<Product, "id">);
      setForm(null);
      refetchProds();
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!confirm("¿Eliminar este producto?")) return;
    await adminService.deleteProduct(id);
    refetchProds();
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    await adminService.updateOrderStatus(orderId, newStatus);
  };

  const revenueValues = stats?.revenueByMonth.map((m) => m.revenue) ?? [];

  return (
    <div className={styles.page}>
      {/* ── Sidebar ── */}
      <aside className={styles.sidebar}>
        <div className={styles.sideTop}>
          <p className={styles.sideLogo}>Nexwear</p>
          <p className={styles.sideRole}>Panel Admin</p>
        </div>
        <nav className={styles.sideNav}>
          {(
            [
              ["dashboard", "⬛", "Dashboard"],
              ["products", "👕", "Productos"],
              ["orders", "📦", "Pedidos"],
              ["users", "👤", "Usuarios"],
            ] as [Tab, string, string][]
          ).map(([t, icon, label]) => (
            <button
              key={t}
              className={`${styles.navItem} ${tab === t ? styles.navOn : ""}`}
              onClick={() => setTab(t)}
            >
              <span>{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className={styles.sideBottom}>
          <button className={styles.backBtn} onClick={() => navigate("/")}>
            ← Ir a la tienda
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className={styles.main}>
        {/* ─── DASHBOARD ─── */}
        {tab === "dashboard" && (
          <div>
            <h1 className={styles.pageTitle}>Dashboard</h1>
            {statsLoading ? (
              <Loader />
            ) : !stats ? (
              <p>Sin datos</p>
            ) : (
              <>
                {/* KPIs */}
                <div className={styles.kpiGrid}>
                  {[
                    {
                      label: "Ingresos Totales",
                      value: formatPrice(stats.totalRevenue),
                      sparkData: revenueValues,
                      color: "var(--dorado)",
                    },
                    {
                      label: "Pedidos Totales",
                      value: stats.totalOrders,
                      sparkData: [],
                      color: "var(--verde)",
                    },
                    {
                      label: "Usuarios",
                      value: stats.totalUsers,
                      sparkData: stats.newUsers.map((u) => u.count),
                      color: "#4a6fa5",
                    },
                    {
                      label: "Productos",
                      value: stats.totalProducts,
                      sparkData: [],
                      color: "var(--g600)",
                    },
                  ].map((kpi) => (
                    <div key={kpi.label} className={styles.kpiCard}>
                      <p className={styles.kpiLabel}>{kpi.label}</p>
                      <p className={styles.kpiValue}>{kpi.value}</p>
                      {kpi.sparkData.length > 1 && (
                        <Sparkline values={kpi.sparkData} color={kpi.color} />
                      )}
                    </div>
                  ))}
                </div>

                {/* Revenue chart */}
                <div className={styles.chartCard}>
                  <h3 className={styles.chartTitle}>Ingresos por Mes</h3>
                  <div className={styles.barChart}>
                    {stats.revenueByMonth.map((m) => {
                      const pct =
                        (m.revenue / Math.max(...revenueValues, 1)) * 100;
                      return (
                        <div key={m.month} className={styles.barGroup}>
                          <div
                            className={styles.chartBar}
                            style={{ height: `${pct}%` }}
                            title={formatPrice(m.revenue)}
                          />
                          <span className={styles.barLabel}>{m.month}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom grid */}
                <div className={styles.bottomGrid}>
                  {/* Top products */}
                  <div className={styles.tableCard}>
                    <h3 className={styles.chartTitle}>
                      Productos Más Vendidos
                    </h3>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Producto</th>
                          <th>Vendidos</th>
                          <th>Ingresos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.topProducts.map((p) => (
                          <tr key={p.productId}>
                            <td>{p.productName}</td>
                            <td className={styles.tdNum}>{p.sold}</td>
                            <td className={styles.tdNum}>
                              {formatPrice(p.revenue)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Recent orders */}
                  <div className={styles.tableCard}>
                    <h3 className={styles.chartTitle}>Pedidos Recientes</h3>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Estado</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.recentOrders.map((o) => (
                          <tr key={o.id}>
                            <td>#{o.id.slice(-6).toUpperCase()}</td>
                            <td>
                              <span
                                className={`${styles.badge} ${styles[`st_${o.status}`]}`}
                              >
                                {ORDER_STATUS_LABELS[o.status]}
                              </span>
                            </td>
                            <td className={styles.tdNum}>
                              {formatPrice(o.total)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Orders by status */}
                  <div className={styles.tableCard}>
                    <h3 className={styles.chartTitle}>Pedidos por Estado</h3>
                    {Object.entries(stats.ordersByStatus).map(([s, cnt]) => (
                      <div key={s} className={styles.statusRow}>
                        <span
                          className={`${styles.badge} ${styles[`st_${s}`]}`}
                        >
                          {ORDER_STATUS_LABELS[s]}
                        </span>
                        <div className={styles.statusBarWrap}>
                          <div
                            className={styles.statusBarFill}
                            style={{
                              width: `${(cnt / stats.totalOrders) * 100}%`,
                            }}
                          />
                        </div>
                        <span className={styles.statusCnt}>{cnt}</span>
                      </div>
                    ))}
                  </div>

                  {/* New users */}
                  <div className={styles.tableCard}>
                    <h3 className={styles.chartTitle}>
                      Nuevos Usuarios (30 días)
                    </h3>
                    <div className={styles.usersChart}>
                      {stats.newUsers.slice(-14).map((u) => {
                        const maxU = Math.max(
                          ...stats.newUsers.map((x) => x.count),
                          1,
                        );
                        return (
                          <div key={u.date} className={styles.usrBar}>
                            <div
                              className={styles.usrFill}
                              style={{ height: `${(u.count / maxU) * 60}px` }}
                            />
                            <span className={styles.usrLabel}>
                              {new Date(u.date).getDate()}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ─── PRODUCTS ─── */}
        {tab === "products" && (
          <div>
            <div className={styles.tabHeader}>
              <h1 className={styles.pageTitle}>Productos</h1>
              <Button
                variant="fill"
                size="sm"
                onClick={() => setForm(blankProduct())}
              >
                + Nuevo Producto
              </Button>
            </div>

            {productForm && (
              <div className={styles.formCard}>
                <h3 className={styles.formCardTitle}>
                  {productForm.id ? "Editar Producto" : "Nuevo Producto"}
                </h3>
                <AdminProductForm
                  initial={productForm}
                  onSave={handleSaveProduct}
                  onCancel={() => setForm(null)}
                  saving={saving}
                />
              </div>
            )}

            {prodLoading ? (
              <Loader />
            ) : (
              <>
                <div className={styles.tableCard}>
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
                      {products?.data.map((p) => (
                        <tr key={p.id}>
                          <td>
                            <div className={styles.prodCell}>
                              <div
                                className={styles.prodImg}
                                style={{
                                  background: p.colors[0]?.hex ?? "var(--g100)",
                                }}
                              />
                              <span>{p.name}</span>
                            </div>
                          </td>
                          <td>{p.category}</td>
                          <td className={styles.tdNum}>
                            {formatPrice(p.price)}
                          </td>
                          <td className={styles.tdNum}>{p.stock}</td>
                          <td>
                            {p.isNew && (
                              <span
                                className={`${styles.badge} ${styles.badgeNew}`}
                              >
                                Nuevo
                              </span>
                            )}
                            {p.isSale && (
                              <span
                                className={`${styles.badge} ${styles.badgeSale}`}
                              >
                                Rebaja
                              </span>
                            )}
                          </td>
                          <td>
                            <div className={styles.actionBtns}>
                              <button
                                className={styles.editBtn}
                                onClick={() => setForm(p)}
                              >
                                Editar
                              </button>
                              <button
                                className={styles.delBtn}
                                onClick={() => handleDeleteProduct(p.id)}
                              >
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className={styles.pagination}>
                  <button
                    disabled={productPage === 1}
                    onClick={() => setPPage((p) => p - 1)}
                    className={styles.pageBtn}
                  >
                    ← Anterior
                  </button>
                  <span>Página {productPage}</span>
                  <button
                    disabled={(products?.data.length ?? 0) < 20}
                    onClick={() => setPPage((p) => p + 1)}
                    className={styles.pageBtn}
                  >
                    Siguiente →
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ─── ORDERS ─── */}
        {tab === "orders" && (
          <div>
            <div className={styles.tabHeader}>
              <h1 className={styles.pageTitle}>Pedidos</h1>
              <select
                className={styles.filterSel}
                value={statusFilter}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setOPage(1);
                }}
              >
                <option value="">Todos los estados</option>
                {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            {ordLoading ? (
              <Loader />
            ) : (
              <div className={styles.tableCard}>
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
                    {orders?.data.map((o: Order) => (
                      <tr key={o.id}>
                        <td>#{o.id.slice(-8).toUpperCase()}</td>
                        <td>
                          {new Date(o.createdAt).toLocaleDateString("es-MX")}
                        </td>
                        <td>{o.shippingAddress.street.split(",")[0]}</td>
                        <td className={styles.tdNum}>{formatPrice(o.total)}</td>
                        <td>
                          <span
                            className={`${styles.badge} ${styles[`st_${o.status}`]}`}
                          >
                            {ORDER_STATUS_LABELS[o.status]}
                          </span>
                        </td>
                        <td>
                          <select
                            className={styles.statusSel}
                            defaultValue={o.status}
                            onChange={(e) =>
                              handleStatusChange(o.id, e.target.value)
                            }
                          >
                            {Object.entries(ORDER_STATUS_LABELS).map(
                              ([k, v]) => (
                                <option key={k} value={k}>
                                  {v}
                                </option>
                              ),
                            )}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className={styles.pagination}>
                  <button
                    disabled={orderPage === 1}
                    onClick={() => setOPage((p) => p - 1)}
                    className={styles.pageBtn}
                  >
                    ← Anterior
                  </button>
                  <span>
                    Página {orderPage} · Total: {orders?.total ?? 0}
                  </span>
                  <button
                    disabled={(orders?.data.length ?? 0) < 20}
                    onClick={() => setOPage((p) => p + 1)}
                    className={styles.pageBtn}
                  >
                    Siguiente →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── USERS ─── */}
        {tab === "users" && (
          <div>
            <h1 className={styles.pageTitle}>Usuarios</h1>
            {usrLoading ? (
              <Loader />
            ) : (
              <div className={styles.tableCard}>
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
                    {users?.data.map((u: User) => (
                      <tr key={u.id}>
                        <td>
                          <div className={styles.userCell}>
                            <div className={styles.userAvatar}>
                              {u.firstName.charAt(0)}
                              {u.lastName.charAt(0)}
                            </div>
                            <span>
                              {u.firstName} {u.lastName}
                            </span>
                          </div>
                        </td>
                        <td>{u.email}</td>
                        <td>
                          {new Date(u.createdAt).toLocaleDateString("es-MX")}
                        </td>
                        <td>
                          <span
                            className={`${styles.badge} ${u.role === "Admin" ? styles.badgeAdmin : styles.badgeUser}`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td>
                          <select
                            className={styles.statusSel}
                            defaultValue={u.role}
                            onChange={(e) =>
                              adminService.updateUserRole(
                                u.id,
                                e.target.value as "user" | "admin",
                              )
                            }
                          >
                            <option value="user">Usuario</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className={styles.pagination}>
                  <button
                    disabled={userPage === 1}
                    onClick={() => setUPage((p) => p - 1)}
                    className={styles.pageBtn}
                  >
                    ← Anterior
                  </button>
                  <span>
                    Página {userPage} · Total: {users?.total ?? 0}
                  </span>
                  <button
                    disabled={(users?.data.length ?? 0) < 20}
                    onClick={() => setUPage((p) => p + 1)}
                    className={styles.pageBtn}
                  >
                    Siguiente →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Admin;
