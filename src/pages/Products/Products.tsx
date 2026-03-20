import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import productService from "@/services/productService";
import ProductCard from "@/components/common/ProductCard";
import Loader from "@/components/ui/Loader";
import { useCart } from "@/hooks/useCart";
import type { Product, ProductFilters } from "@/types";
import { CATEGORIES, SIZES, SORT_OPTIONS } from "@/utils/constants";
import styles from "./Products.module.css";

// ─── Precio máximo en MXN ─────────────────────────────────────────────────────
const MAX_PRICE = 10000;

// ─── Grid toggle config ───────────────────────────────────────────────────────
const GRID_CONFIGS: { cols: number; dots: [number, number][] }[] = [
  { cols: 2, dots: [[0,0],[1,0],[0,1],[1,1]] },
  { cols: 3, dots: [[0,0],[1,0],[2,0],[0,1],[1,1],[2,1]] },
  { cols: 4, dots: [[0,0],[1,0],[2,0],[3,0],[0,1],[1,1],[2,1],[3,1]] },
];

// ─── GridToggle component ─────────────────────────────────────────────────────
const GridToggle: React.FC<{
  gridCols: number;
  onChange: (cols: number) => void;
}> = ({ gridCols, onChange }) => (
  <div
    style={{
      display: "flex",
      gap: 2,
      background: "#f5f5f5",
      border: "0.5px solid #e8e8e8",
      borderRadius: 7,
      padding: 3,
    }}
  >
    {GRID_CONFIGS.map(({ cols, dots }) => {
      const isOn = gridCols === cols;
      const W = cols * 4 + (cols - 1) * 2;
      return (
        <button
          key={cols}
          title={`${cols} columnas`}
          onClick={() => onChange(cols)}
          style={{
            width: 34,
            height: 34,
            border: "none",
            cursor: "pointer",
            borderRadius: 5,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background .15s, box-shadow .15s",
            background: isOn ? "#fff" : "transparent",
            boxShadow: isOn
              ? "0 1px 3px rgba(0,0,0,.08), 0 0 0 0.5px #e8e8e8"
              : "none",
          }}
        >
          <svg
            width={W}
            height={10}
            viewBox={`0 0 ${W} 10`}
            style={{ display: "block" }}
          >
            {dots.map(([col, row], i) => (
              <rect
                key={i}
                x={col * 6}
                y={row * 6}
                width={4}
                height={4}
                rx={1}
                fill={isOn ? "#0a0a0a" : "#b0b0b0"}
              />
            ))}
          </svg>
        </button>
      );
    })}
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────
const Products: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { addItem } = useCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [total,    setTotal]    = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [page,     setPage]     = useState(1);
  const [gridCols, setGridCols] = useState(3);

  // ── Leer filtros desde URL ─────────────────────────────────────────────────
  const activeCategory = searchParams.get("category") ?? "";
  const activeSort     = (searchParams.get("sort") ?? "relevance") as ProductFilters["sortBy"];
  const activeSearch   = searchParams.get("search") ?? "";
  const isSale         = searchParams.get("isSale") === "true";
  const isNew          = searchParams.get("isNew")  === "true";
  const activeSizes    = searchParams.getAll("size") as ProductFilters["sizes"];
  const maxPrice       = Number(searchParams.get("maxPrice") ?? MAX_PRICE);

  const hasFilters = !!(
    activeCategory || activeSearch || isSale || isNew ||
    activeSizes?.length || maxPrice < MAX_PRICE
  );

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const filters: ProductFilters = {
        ...(activeCategory             && { category: activeCategory }),
        ...(activeSort !== "relevance" && { sortBy: activeSort }),
        ...(activeSearch               && { search: activeSearch }),
        ...(isSale                     && { isSale: true }),
        ...(isNew                      && { isNew: true }),
        ...(activeSizes?.length        && { sizes: activeSizes }),
        ...(maxPrice < MAX_PRICE       && { maxPrice }),
        page,
        limit: 12,
      };
      const res = await productService.getProducts(filters);
      setProducts(res.data);
      setTotal(res.total);
    } catch {
      setProducts([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [
    activeCategory, activeSort, activeSearch,
    isSale, isNew, maxPrice, page,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(activeSizes),
  ]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // ── Helpers de URL ─────────────────────────────────────────────────────────
  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (value !== null && value !== "") next.set(key, value);
    else next.delete(key);
    next.delete("page");
    setSearchParams(next);
    setPage(1);
  };

  const toggleSize = (s: string) => {
    const next = new URLSearchParams(searchParams);
    const cur  = next.getAll("size");
    next.delete("size");
    if (cur.includes(s))
      cur.filter((x) => x !== s).forEach((v) => next.append("size", v));
    else
      [...cur, s].forEach((v) => next.append("size", v));
    setSearchParams(next);
    setPage(1);
  };

  const clearAll = () => {
    setSearchParams(new URLSearchParams());
    setPage(1);
  };

  const priceLabel = maxPrice >= MAX_PRICE
    ? `$${(MAX_PRICE / 1000).toFixed(0)}k+`
    : `$${maxPrice.toLocaleString("es-MX")}`;

  return (
    <div className={styles.page}>

      {/* ── Sidebar ── */}
      <aside className={styles.sidebar}>
        <div className={styles.sideHeader}>
          <h2 className={styles.sideTitle}>Filtros</h2>
          {hasFilters && (
            <button className={styles.clearBtn} onClick={clearAll}>
              Limpiar
            </button>
          )}
        </div>

        <div className={styles.group}>
          <p className={styles.groupTitle}>Categoría</p>
          <div className={styles.items}>
            <label className={styles.check}>
              <input type="radio" name="cat" value=""
                checked={!activeCategory}
                onChange={() => setParam("category", null)} />
              Todo
            </label>
            {CATEGORIES.map((c) => (
              <label key={c.value} className={styles.check}>
                <input type="radio" name="cat" value={c.value}
                  checked={activeCategory === c.value}
                  onChange={() => setParam("category", c.value)} />
                {c.label}
              </label>
            ))}
          </div>
        </div>

        <div className={styles.group}>
          <p className={styles.groupTitle}>Precio máximo</p>
          <div className={styles.rangeWrap}>
            <div className={styles.rangeVals}>
              <span>$0</span>
              <span>{priceLabel}</span>
            </div>
            <input
              type="range" min={0} max={MAX_PRICE} step={500}
              value={maxPrice}
              onChange={(e) => {
                const val = Number(e.target.value);
                setParam("maxPrice", val >= MAX_PRICE ? null : String(val));
              }}
            />
          </div>
        </div>

        <div className={styles.group}>
          <p className={styles.groupTitle}>Talla</p>
          <div className={styles.sizeBtns}>
            {SIZES.map((s) => (
              <button key={s}
                className={`${styles.sizeBtn} ${activeSizes?.includes(s as never) ? styles.sizeBtnOn : ""}`}
                onClick={() => toggleSize(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.group}>
          <p className={styles.groupTitle}>Disponibilidad</p>
          <div className={styles.items}>
            <label className={styles.check}>
              <input type="checkbox" checked={isNew}
                onChange={() => setParam("isNew", isNew ? null : "true")} />
              Solo nuevos
            </label>
            <label className={styles.check}>
              <input type="checkbox" checked={isSale}
                onChange={() => setParam("isSale", isSale ? null : "true")} />
              Solo en rebaja
            </label>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className={styles.main}>

        {/* Barra superior */}
        <div className={styles.topBar}>
          <div className={styles.tabs}>
            {[{ value: "", label: "Todo" }, ...CATEGORIES].map((c) => (
              <button key={c.value}
                className={`${styles.tab} ${activeCategory === c.value ? styles.tabOn : ""}`}
                onClick={() => setParam("category", c.value || null)}>
                {c.label}
              </button>
            ))}
          </div>

          <div className={styles.barRight}>
            {/* Tags activos */}
            {activeSearch && (
              <span className={styles.queryTag}>
                "{activeSearch}"
                <button onClick={() => setParam("search", null)}>✕</button>
              </span>
            )}
            {isSale && (
              <span className={styles.queryTag}>
                Rebaja
                <button onClick={() => setParam("isSale", null)}>✕</button>
              </span>
            )}
            {isNew && (
              <span className={styles.queryTag}>
                Nuevo
                <button onClick={() => setParam("isNew", null)}>✕</button>
              </span>
            )}
            {activeSizes?.map((s) => (
              <span key={s} className={styles.queryTag}>
                Talla {s}
                <button onClick={() => toggleSize(s)}>✕</button>
              </span>
            ))}

            <span className={styles.count}>
              {total} producto{total !== 1 ? "s" : ""}
            </span>

            <select className={styles.sortSel}
              value={activeSort ?? "relevance"}
              onChange={(e) => setParam("sort", e.target.value)}>
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            {/* ── Grid toggle mejorado ── */}
            <GridToggle gridCols={gridCols} onChange={setGridCols} />
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className={styles.loaderWrap}><Loader size="lg" /></div>
        ) : products.length === 0 ? (
          <div className={styles.empty}>
            <svg width="48" height="48" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="1"
              style={{ opacity: 0.15, marginBottom: 12 }}>
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            <p>Sin resultados</p>
            <span>Prueba con otros filtros</span>
            {hasFilters && (
              <button className={styles.clearBtn} onClick={clearAll}
                style={{ marginTop: 12 }}>
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <div className={styles.grid}
            style={{ "--cols": gridCols } as React.CSSProperties}>
            {products.map((p) => (
              <ProductCard key={p.id} product={p}
                onAddToCart={(prod) => addItem(prod, 1, prod.sizes[0], prod.colors[0])} />
            ))}
          </div>
        )}

        {/* Paginación */}
        {total > 12 && !loading && (
          <div className={styles.pagination}>
            <button disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className={styles.pageBtn}>
              ← Anterior
            </button>
            <span className={styles.pageInfo}>
              {page} / {Math.ceil(total / 12)}
            </span>
            <button disabled={page >= Math.ceil(total / 12)}
              onClick={() => setPage((p) => p + 1)}
              className={styles.pageBtn}>
              Siguiente →
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Products;