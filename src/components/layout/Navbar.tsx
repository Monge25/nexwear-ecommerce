import React, { useEffect, useState, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { useWishlist } from "@/context/WishlistContext";
import styles from "./Navbar.module.css";
import { ROUTES } from "@/utils/constants";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Hit {
  id: number | string;
  name: string;
  slug: string;
  price: number;
  category: string;
  imageUrl?: string;
  colors?: { hex?: string; color?: string }[];
  isSale?: boolean;
  isNew?: boolean;
}

// ─── Constantes ───────────────────────────────────────────────────────────────
const BASE       = "https://nexwearapi-production.up.railway.app/api";
const HISTORY_KEY = "nx_search_history";
const MAX_HISTORY = 5;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency", currency: "MXN", maximumFractionDigits: 0,
  }).format(n);

function getHistory(): string[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]"); }
  catch { return []; }
}

function saveToHistory(term: string) {
  const prev = getHistory().filter((t) => t !== term);
  localStorage.setItem(HISTORY_KEY, JSON.stringify([term, ...prev].slice(0, MAX_HISTORY)));
}

function removeFromHistory(term: string) {
  const next = getHistory().filter((t) => t !== term);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
}

// Highlight matching substring
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: "transparent", fontWeight: 600, color: "inherit" }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

// Debounce hook
function useDebounce<T>(value: T, ms: number): T {
  const [dv, setDv] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setDv(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return dv;
}

// ─── Search overlay ────────────────────────────────────────────────────────────
interface SearchOverlayProps {
  onClose: () => void;
}

const SearchOverlay: React.FC<SearchOverlayProps> = ({ onClose }) => {
  const navigate      = useNavigate();
  const inputRef      = useRef<HTMLInputElement>(null);
  const [query, setQuery]       = useState("");
  const [hits,  setHits]        = useState<Hit[]>([]);
  const [loading, setLoading]   = useState(false);
  const [activeIdx, setActive]  = useState(-1);
  const [history, setHistory]   = useState<string[]>(getHistory);

  const dq = useDebounce(query, 300);

  // Auto-focus
  useEffect(() => { inputRef.current?.focus(); }, []);

  // Fetch on debounced query change
  useEffect(() => {
    if (!dq.trim()) { setHits([]); setLoading(false); setActive(-1); return; }
    setLoading(true);
    fetch(`${BASE}/Products?search=${encodeURIComponent(dq)}&limit=7&page=1`)
      .then((r) => r.json())
      .then((data) => {
        const list: unknown[] = Array.isArray(data) ? data
          : Array.isArray(data?.data) ? data.data : [];
        setHits(list as Hit[]);
        setActive(-1);
      })
      .catch(() => setHits([]))
      .finally(() => setLoading(false));
  }, [dq]);

  // Close on Escape
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const goToProduct = (slug: string, term: string) => {
    if (term.trim()) saveToHistory(term.trim());
    setHistory(getHistory());
    navigate(`/productos/${slug}`);
    onClose();
  };

  const goToResults = (term = query) => {
    const t = term.trim();
    if (!t) return;
    saveToHistory(t);
    setHistory(getHistory());
    navigate(`/productos?search=${encodeURIComponent(t)}`);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeIdx >= 0 && hits[activeIdx]) {
      goToProduct(hits[activeIdx].slug, query);
    } else {
      goToResults();
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const total = hits.length + (query.trim() ? 1 : 0); // +1 for "ver todos"
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(i + 1, total - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setActive((i) => Math.max(i - 1, -1)); }
  };

  const removeHistory = (term: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeFromHistory(term);
    setHistory(getHistory());
  };

  const showHistory  = !query.trim() && history.length > 0;
  const showPopular  = !query.trim() && history.length === 0;
  const showResults  = query.trim().length > 0;
  const popular      = ["Blazer", "Lino", "Vestidos", "Abrigos", "Cachemir", "Hombre"];

  return (
    <>
      {/* Backdrop */}
      <div className={styles.searchBackdrop} onClick={onClose} />

      {/* Panel */}
      <div className={styles.searchPanel}>
        {/* Input row */}
        <form className={styles.searchRow} onSubmit={handleSubmit}>
          <svg className={styles.searchIcon} width="18" height="18"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            ref={inputRef}
            className={styles.searchInput}
            placeholder="Buscar prendas, materiales, colecciones…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button type="button" className={styles.searchClear}
              onClick={() => { setQuery(""); setHits([]); inputRef.current?.focus(); }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
            </button>
          )}
          <button type="button" className={styles.searchClose} onClick={onClose}>
            Cerrar
          </button>
        </form>

        <div className={styles.searchBody}>
          {/* ── Historial ── */}
          {showHistory && (
            <div className={styles.searchSection}>
              <p className={styles.searchSectionTitle}>Búsquedas recientes</p>
              {history.map((term) => (
                <div key={term} className={styles.historyRow}
                  onClick={() => goToResults(term)}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="1.4" className={styles.historyIcon}>
                    <polyline points="12 8 12 12 14 14"/>
                    <path d="M3.05 11a9 9 0 1 0 .5-4.5"/>
                    <polyline points="3 3 3 7 7 7"/>
                  </svg>
                  <span>{term}</span>
                  <button className={styles.historyRemove}
                    onClick={(e) => removeHistory(term, e)} title="Eliminar">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2">
                      <path d="M18 6 6 18M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ── Popular ── */}
          {showPopular && (
            <div className={styles.searchSection}>
              <p className={styles.searchSectionTitle}>Tendencias</p>
              <div className={styles.popularChips}>
                {popular.map((t) => (
                  <button key={t} className={styles.popularChip}
                    onClick={() => { setQuery(t); inputRef.current?.focus(); }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Resultados ── */}
          {showResults && (
            <div className={styles.searchSection}>
              {loading ? (
                <div className={styles.searchLoading}>
                  <span className={styles.searchSpinner}/>
                  Buscando…
                </div>
              ) : hits.length === 0 ? (
                <div className={styles.searchEmpty}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="1" style={{ opacity: .15 }}>
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                  </svg>
                  <p>Sin resultados para <strong>"{query}"</strong></p>
                  <span>Prueba con otra palabra clave</span>
                </div>
              ) : (
                <>
                  <p className={styles.searchSectionTitle}>
                    {hits.length} resultado{hits.length !== 1 ? "s" : ""} para "{query}"
                  </p>

                  {hits.map((hit, i) => {
                    const thumb = hit.imageUrl ?? "";
                    const color = hit.colors?.[0]?.hex ?? hit.colors?.[0]?.color ?? "#f0f0f0";
                    const isActive = i === activeIdx;
                    return (
                      <div key={String(hit.id)}
                        className={`${styles.searchHit} ${isActive ? styles.searchHitActive : ""}`}
                        onClick={() => goToProduct(hit.slug, query)}
                        onMouseEnter={() => setActive(i)}>
                        {/* Thumbnail */}
                        <div className={styles.searchThumb}
                          style={{ background: thumb ? undefined : color }}>
                          {thumb && <img src={thumb} alt={hit.name}/>}
                        </div>
                        {/* Info */}
                        <div className={styles.searchHitInfo}>
                          <p className={styles.searchHitName}>
                            <Highlight text={hit.name} query={query}/>
                          </p>
                          <p className={styles.searchHitCat}>{hit.category}</p>
                        </div>
                        {/* Badges + price */}
                        <div className={styles.searchHitRight}>
                          {hit.isSale && <span className={styles.tagSale}>Rebaja</span>}
                          {hit.isNew  && <span className={styles.tagNew}>Nuevo</span>}
                          <span className={styles.searchHitPrice}>{fmt(hit.price)}</span>
                        </div>
                        <svg className={styles.searchHitArrow} width="12" height="12"
                          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                      </div>
                    );
                  })}

                  {/* Ver todos */}
                  <button
                    className={`${styles.searchViewAll} ${activeIdx === hits.length ? styles.searchHitActive : ""}`}
                    onClick={() => goToResults()}
                    onMouseEnter={() => setActive(hits.length)}>
                    Ver todos los resultados para "{query}"
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="1.5">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// ─── Navbar ───────────────────────────────────────────────────────────────────
const Navbar: React.FC = () => {
  const [scrolled,   setScrolled]   = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const { itemCount, openCart }   = useCart();
  const { isAuthenticated, user } = useAuth();
  const { count: wishCount }      = useWishlist();

  const isAdmin = isAuthenticated && user?.role === "Admin";

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const closeSearch = useCallback(() => setSearchOpen(false), []);

  return (
    <>
      {/* Top bar */}
      <div className={styles.topbar}>
        <div className={styles.topbarInner}>
          <span>Envío gratis en pedidos +<em>$150</em></span>
          <span className={styles.sep}>·</span>
          <span>Código <em>NEXWEAR15</em> — 15% descuento</span>
          <span className={styles.sep}>·</span>
          <span>Devoluciones gratis <em>30 días</em></span>
        </div>
      </div>

      {/* Nav */}
      <nav className={`${styles.nav} ${scrolled ? styles.solid : ""}`}>
        <Link to="/" className={styles.logo}>Nexwear</Link>

        <ul className={styles.links}>
          <li><Link to="/productos?category=mujer">Mujer</Link></li>
          <li><Link to="/productos?category=hombre">Hombre</Link></li>
          <li><Link to="/productos">Colección</Link></li>
          <li><Link to="/productos?category=exteriores">Exteriores</Link></li>
          <li><Link to="/productos?isSale=true" className={styles.saleLink}>Rebajas</Link></li>
        </ul>

        <div className={styles.actions}>
          {/* Buscar */}
          <button className={styles.iconBtn} onClick={() => setSearchOpen(true)} aria-label="Buscar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </button>

          {/* Perfil */}
          <Link to={isAuthenticated ? ROUTES.PROFILE : ROUTES.LOGIN}
            className={styles.iconBtn} aria-label="Cuenta">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </Link>

          {/* Wishlist */}
          {isAuthenticated && (
            <Link to="/favoritos" className={styles.iconBtn}
              aria-label="Favoritos" style={{ position: "relative" }}>
              <svg width="16" height="16" viewBox="0 0 24 24"
                fill={wishCount > 0 ? "currentColor" : "none"}
                stroke="currentColor" strokeWidth="1.5">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              {wishCount > 0 && <span className={styles.badge}>{wishCount}</span>}
            </Link>
          )}

          {/* Admin */}
          {isAdmin && (
            <Link to="/Admin" className={styles.iconBtn} aria-label="Dashboard Admin">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="7" height="7"/>
                <rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/>
              </svg>
            </Link>
          )}

          {/* Carrito */}
          <button className={styles.cartBtn} onClick={openCart} aria-label="Bolsa">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
            <span className={styles.cartLabel}>Bolsa</span>
            {itemCount > 0 && <span className={styles.badge}>{itemCount}</span>}
          </button>
        </div>
      </nav>

      {/* Search overlay — montado/desmontado limpiamente */}
      {searchOpen && <SearchOverlay onClose={closeSearch}/>}
    </>
  );
};

export default Navbar;