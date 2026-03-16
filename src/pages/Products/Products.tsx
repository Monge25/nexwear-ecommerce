import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import productService from "@/services/productService";
import ProductCard from "@/components/common/ProductCard";
import Loader from "@/components/ui/Loader";
import { useCart } from "@/hooks/useCart";
import type { Product, ProductFilters } from "@/types";
import { CATEGORIES, SIZES, SORT_OPTIONS } from "@/utils/constants";
import styles from "./Products.module.css";

const Products: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { addItem } = useCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [colores, setColores] = useState<string[]>([]);

  // Read filters from URL
  const activeCategory = searchParams.get("category") ?? "";
  const activeSort = (searchParams.get("sort") ??
    "relevance") as ProductFilters["sortBy"];
  const activeSearch = searchParams.get("search") ?? "";
  const isSale = searchParams.get("sale") === "true";
  const isNew = searchParams.get("isNew") === "true";
  const activeSizes = searchParams.getAll("size") as ProductFilters["sizes"];
  const maxPrice = Number(searchParams.get("maxPrice") ?? 600);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const filters: ProductFilters = {
        category: activeCategory || undefined,
        sortBy: activeSort,
        search: activeSearch || undefined,
        isSale: isSale || undefined,
        isNew: isNew || undefined,
        sizes: activeSizes?.length ? activeSizes : undefined,
        maxPrice: maxPrice < 600 ? maxPrice : undefined,
        page,
        limit: 12,
      };
      const res = await productService.getProducts(filters);
      setProducts(res.data);
      setTotal(res.total);
    } catch {
      /* handled by Loader */
    } finally {
      setLoading(false);
    }
  }, [
    activeCategory,
    activeSort,
    activeSearch,
    isSale,
    isNew,
    maxPrice,
    page,
    JSON.stringify(activeSizes),
  ]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
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
  };

  const clearAll = () => {
    setSearchParams(new URLSearchParams());
    setColores([]);
  };

  return (
    <div className={styles.page}>
      {/* Filters sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sideHeader}>
          <h2 className={styles.sideTitle}>Filtros</h2>
          <button className={styles.clearBtn} onClick={clearAll}>
            Limpiar
          </button>
        </div>

        {/* Category */}
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

        {/* Price */}
        <div className={styles.group}>
          <p className={styles.groupTitle}>Precio máximo</p>
          <div className={styles.rangeWrap}>
            <div className={styles.rangeVals}>
              <span>$0</span>
              <span>${maxPrice >= 600 ? "600+" : maxPrice}</span>
            </div>
            <input
              type="range"
              min={0}
              max={600}
              step={10}
              value={maxPrice}
              onChange={(e) => setParam("maxPrice", e.target.value)}
            />
          </div>
        </div>

        {/* Size */}
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

        {/* Availability */}
        <div className={styles.group}>
          <p className={styles.groupTitle}>Disponibilidad</p>
          <div className={styles.items}>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={isNew}
                onChange={() => setParam("isNew", isNew ? null : "true")}
              />{" "}
              Solo nuevos
            </label>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={isSale}
                onChange={() => setParam("sale", isSale ? null : "true")}
              />{" "}
              Solo en rebaja
            </label>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className={styles.main}>
        {/* Top bar */}
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
            <span className={styles.count}>{total} productos</span>
            {activeSearch && (
              <span className={styles.queryTag}>
                "{activeSearch}"{" "}
                <button onClick={() => setParam("search", null)}>✕</button>
              </span>
            )}
            <select
              className={styles.sortSel}
              value={activeSort ?? "relevance"}
              onChange={(e) => setParam("sort", e.target.value)}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className={styles.loaderWrap}>
            <Loader size="lg" />
          </div>
        ) : products.length === 0 ? (
          <div className={styles.empty}>
            <p>Sin resultados</p>
            <span>Prueba con otros filtros</span>
            <button className={styles.clearBtn} onClick={clearAll}>
              Limpiar filtros
            </button>
          </div>
        ) : (
          <div className={styles.grid}>
            {products.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onAddToCart={(prod) =>
                  addItem(prod, 1, prod.sizes[0], prod.colors[0])
                }
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > 12 && !loading && (
          <div className={styles.pagination}>
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className={styles.pageBtn}
            >
              ← Anterior
            </button>
            <span className={styles.pageInfo}>
              {page} / {Math.ceil(total / 12)}
            </span>
            <button
              disabled={page >= Math.ceil(total / 12)}
              onClick={() => setPage((p) => p + 1)}
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
