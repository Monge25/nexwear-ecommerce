import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import productService from "@/services/productService";
import ProductCard from "@/components/common/ProductCard";
import Loader from "@/components/ui/Loader";
import type { Product, ProductFilters } from "@/types";
import { CATEGORIES, SIZES, SORT_OPTIONS } from "@/utils/constants";
import styles from "./Products.module.css";

const MAX_PRICE = 10000;
const PAGE_LIMIT = 20;

const GRID_CONFIGS: { cols: number; dots: [number, number][] }[] = [
  {
    cols: 2,
    dots: [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ],
  },
  {
    cols: 3,
    dots: [
      [0, 0],
      [1, 0],
      [2, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
  },
  {
    cols: 4,
    dots: [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
      [0, 1],
      [1, 1],
      [2, 1],
      [3, 1],
    ],
  },
];

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

const Products: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [gridCols, setGridCols] = useState(3);
  const [priceInput, setPriceInput] = useState(MAX_PRICE.toString());

  const activeCategory = searchParams.get("category") ?? "";
  const activeSort = (searchParams.get("sort") ??
    "relevance") as ProductFilters["sortBy"];
  const activeSearch = searchParams.get("search") ?? "";
  const isOnSale = searchParams.get("isOnSale") === "true";
  const activeSizes = searchParams.getAll("size") as ProductFilters["sizes"];
  const maxPrice = Number(searchParams.get("maxPrice") ?? MAX_PRICE);
  const totalPages = Math.ceil(total / PAGE_LIMIT);
  const hasFilters = !!(
    activeCategory ||
    activeSearch ||
    isOnSale ||
    activeSizes?.length ||
    maxPrice < MAX_PRICE
  );

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const filters: ProductFilters = {
        ...(activeCategory && { category: activeCategory }),
        ...(activeSort !== "relevance" && { sortBy: activeSort }),
        ...(activeSearch && { search: activeSearch }),
        ...(isOnSale && { isOnSale: true }),
        ...(activeSizes?.length && { sizes: activeSizes }),
        ...(maxPrice < MAX_PRICE && { maxPrice }),
        page,
        limit: PAGE_LIMIT,
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
    activeCategory,
    activeSort,
    activeSearch,
    isOnSale,
    maxPrice,
    page,
    JSON.stringify(activeSizes),
  ]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);
  useEffect(() => {
    setPriceInput(String(maxPrice));
  }, [maxPrice]);

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
    const cur = next.getAll("size");
    next.delete("size");
    if (cur.includes(s))
      cur.filter((x) => x !== s).forEach((v) => next.append("size", v));
    else [...cur, s].forEach((v) => next.append("size", v));
    setSearchParams(next);
    setPage(1);
  };

  const clearAll = () => {
    setSearchParams(new URLSearchParams());
    setPage(1);
  };

  const goToPage = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className={styles.page}>
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
              <input
                type="radio"
                name="cat"
                value=""
                checked={!activeCategory}
                onChange={() => setParam("category", null)}
              />
              Todo
            </label>
            {CATEGORIES.map((c) => (
              <label key={c.value} className={styles.check}>
                <input
                  type="radio"
                  name="cat"
                  value={c.value}
                  checked={activeCategory === c.value}
                  onChange={() => setParam("category", c.value)}
                />
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
              <input
                className={styles.priceInput}
                value={priceInput}
                min={0}
                max={MAX_PRICE}
                onChange={(e) => {
                  const val = e.target.value;
                  setPriceInput(val);
                  const num = Number(val);
                  if (!isNaN(num))
                    setParam("maxPrice", num >= MAX_PRICE ? null : String(num));
                }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={MAX_PRICE}
              step={50}
              value={maxPrice}
              onChange={(e) => {
                const val = Number(e.target.value);
                setPriceInput(String(val));
                setParam("maxPrice", val >= MAX_PRICE ? null : String(val));
              }}
            />
          </div>
        </div>

        <div className={styles.group}>
          <p className={styles.groupTitle}>Talla</p>
          <div className={styles.sizeBtns}>
            {SIZES.map((s) => (
              <button
                key={s}
                className={`${styles.sizeBtn} ${activeSizes?.includes(s as never) ? styles.sizeBtnOn : ""}`}
                onClick={() => toggleSize(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.group}>
          <p className={styles.groupTitle}>Disponibilidad</p>
          <div className={styles.items}>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={isOnSale}
                onChange={() => setParam("isOnSale", isOnSale ? null : "true")}
              />
              Solo en rebaja
            </label>
          </div>
        </div>
      </aside>

      <main className={styles.main}>
        <div className={styles.topBar}>
          <div className={styles.tabs}>
            {[{ value: "", label: "Todo" }, ...CATEGORIES].map((c) => (
              <button
                key={c.value}
                className={`${styles.tab} ${activeCategory === c.value ? styles.tabOn : ""}`}
                onClick={() => setParam("category", c.value || null)}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className={styles.barRight}>
            {activeSearch && (
              <span className={styles.queryTag}>
                "{activeSearch}"
                <button onClick={() => setParam("search", null)}>✕</button>
              </span>
            )}
            {isOnSale && (
              <span className={styles.queryTag}>
                Rebaja
                <button onClick={() => setParam("isOnSale", null)}>✕</button>
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
            <select
              className={styles.sortSel}
              value={activeSort ?? "createdAt_asc"}
              onChange={(e) => setParam("sort", e.target.value)}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <GridToggle gridCols={gridCols} onChange={setGridCols} />
          </div>
        </div>

        {loading ? (
          <div className={styles.loaderWrap}>
            <Loader size="lg" />
          </div>
        ) : products.length === 0 ? (
          <div className={styles.empty}>
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              style={{ opacity: 0.15, marginBottom: 12 }}
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <p>Sin resultados</p>
            <span>Prueba con otros filtros</span>
            {hasFilters && (
              <button
                className={styles.clearBtn}
                onClick={clearAll}
                style={{ marginTop: 12 }}
              >
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <div
            className={styles.grid}
            style={{ "--cols": gridCols } as React.CSSProperties}
          >
            {products.map((p) => (
              // ✅ sin onAddToCart — ProductCard maneja todo internamente
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}

        {totalPages > 1 && !loading && (
          <div className={styles.pagination}>
            <button
              disabled={page === 1}
              onClick={() => goToPage(page - 1)}
              className={styles.pageBtn}
            >
              ← Anterior
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1,
              )
              .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1)
                  acc.push("...");
                acc.push(p);
                return acc;
              }, [])
              .map((item, idx) =>
                item === "..." ? (
                  <span key={`ellipsis-${idx}`} className={styles.pageEllipsis}>
                    …
                  </span>
                ) : (
                  <button
                    key={item}
                    onClick={() => goToPage(item as number)}
                    className={`${styles.pageBtn} ${page === item ? styles.pageBtnOn : ""}`}
                  >
                    {item}
                  </button>
                ),
              )}
            <button
              disabled={page >= totalPages}
              onClick={() => goToPage(page + 1)}
              className={styles.pageBtn}
            >
              Siguiente →
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Products;
