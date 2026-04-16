import React, { useEffect, useState, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthModal from "../common/AuthModal";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import styles from "./Navbar.module.css";
import { ROUTES } from "@/utils/constants";
import { useWishlist } from "@/context/WishlistContext";
import {
  Search, X, User, Heart, ShoppingBag, ShieldCheck, Clock, ArrowRight,
} from "lucide-react";

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

const BASE        = "https://nexwearapi-production.up.railway.app/api";
const HISTORY_KEY = "nx_search_history";
const MAX_HISTORY = 5;

const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);

function getHistory(): string[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]"); }
  catch { return []; }
}

function saveToHistory(term: string) {
  const prev = getHistory().filter((t) => t !== term);
  localStorage.setItem(HISTORY_KEY, JSON.stringify([term, ...prev].slice(0, MAX_HISTORY)));
}

function removeFromHistory(term: string) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(getHistory().filter((t) => t !== term)));
}

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

function useDebounce<T>(value: T, ms: number): T {
  const [dv, setDv] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setDv(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return dv;
}

interface SearchOverlayProps {
  onClose: () => void;
}

const SearchOverlay: React.FC<SearchOverlayProps> = ({ onClose }) => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActive] = useState(-1);
  const [history, setHistory] = useState<string[]>(getHistory);

  const dq = useDebounce(query, 300);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (!dq.trim()) { setHits([]); setLoading(false); setActive(-1); return; }

    setLoading(true);

    fetch(`${BASE}/Products`)
      .then((r) => r.json())
      .then((data) => {
        const list: Hit[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.data) ? data.data
          : Array.isArray(data?.items) ? data.items
          : [];

        const q = dq.toLowerCase();

        const filtered = list
          .filter((p) => {
            // busca por nombre, categoría o id
            return (
              p.name?.toLowerCase().includes(q) ||
              p.category?.toLowerCase().includes(q) ||
              String(p.id).toLowerCase().includes(q)
            );
          })
          .sort((a, b) => {
            const aStarts = a.name.toLowerCase().startsWith(q);
            const bStarts = b.name.toLowerCase().startsWith(q);
            return aStarts === bStarts ? 0 : aStarts ? -1 : 1;
          })
          .slice(0, 7);

        setHits(filtered);
        setActive(-1);
      })
      .catch(() => setHits([]))
      .finally(() => setLoading(false));
  }, [dq]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const goToProduct = (hit: Hit, term: string) => {
    console.log("Producto seleccionado:", hit);

    if (term.trim()) {
      saveToHistory(term.trim());
      setHistory(getHistory());
    }

    if (!hit?.slug && !hit?.id) return;

    navigate(`/productos/${hit.slug ?? hit.id}`);
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
    if (activeIdx >= 0 && hits[activeIdx]) goToProduct(hits[activeIdx], query);
    else goToResults();
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const total = hits.length + (query.trim() ? 1 : 0);
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(i + 1, total - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setActive((i) => Math.max(i - 1, -1)); }
  };

  const removeHistory = (term: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeFromHistory(term);
    setHistory(getHistory());
  };

  const showHistory = !query.trim() && history.length > 0;
  const showPopular = !query.trim() && history.length === 0;
  const showResults = query.trim().length > 0;
  const popular = ["Blazer", "Lino", "Vestidos", "Abrigos", "Cachemir", "Hombre"];

  return (
    <>
      <div className={styles.searchBackdrop} onClick={onClose} />
      <div className={styles.searchPanel}>
        <form className={styles.searchRow} onSubmit={handleSubmit}>
          <Search className={styles.searchIcon} size={18} strokeWidth={1.4} />
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
            <button type="button" className={styles.searchClear} onClick={() => { setQuery(""); setHits([]); inputRef.current?.focus(); }}>
              <X size={13} strokeWidth={1.8} />
            </button>
          )}
          <button type="button" className={styles.searchClose} onClick={onClose}>Cerrar</button>
        </form>

        <div className={styles.searchBody}>
          {showHistory && (
            <div className={styles.searchSection}>
              <p className={styles.searchSectionTitle}>Búsquedas recientes</p>
              {history.map((term) => (
                <div key={term} className={styles.historyRow} onClick={() => goToResults(term)}>
                  <Clock className={styles.historyIcon} size={13} strokeWidth={1.4} />
                  <span>{term}</span>
                  <button className={styles.historyRemove} onClick={(e) => removeHistory(term, e)} title="Eliminar">
                    <X size={10} strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {showPopular && (
            <div className={styles.searchSection}>
              <p className={styles.searchSectionTitle}>Tendencias</p>
              <div className={styles.popularChips}>
                {popular.map((t) => (
                  <button key={t} className={styles.popularChip} onClick={() => { setQuery(t); inputRef.current?.focus(); }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {showResults && (
            <div className={styles.searchSection}>
              {loading ? (
                <div className={styles.searchLoading}>
                  <span className={styles.searchSpinner} />
                  Buscando…
                </div>
              ) : hits.length === 0 ? (
                <div className={styles.searchEmpty}>
                  <Search size={36} strokeWidth={1} style={{ opacity: 0.15 }} />
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
                      <div
                        key={String(hit.id)}
                        className={`${styles.searchHit} ${isActive ? styles.searchHitActive : ""}`}
                        onClick={() => goToProduct(hit, query)}
                        onMouseEnter={() => setActive(i)}
                        style={{ cursor: "pointer" }}
                      >
                        <div className={styles.searchThumb} style={{ background: thumb ? undefined : color }}>
                          {thumb && <img src={thumb} alt={hit.name} />}
                        </div>
                        <div className={styles.searchHitInfo}>
                          <p className={styles.searchHitName}>
                            <Highlight text={hit.name} query={query} />
                          </p>
                          <p className={styles.searchHitCat}>{hit.category}</p>
                        </div>
                        <div className={styles.searchHitRight}>
                          {hit.isSale && <span className={styles.tagSale}>Rebaja</span>}
                          {hit.isNew && <span className={styles.tagNew}>Nuevo</span>}
                          <span className={styles.searchHitPrice}>{fmt(hit.price)}</span>
                        </div>
                        <ArrowRight className={styles.searchHitArrow} size={12} strokeWidth={1.5} />
                      </div>
                    );
                  })}
                  <button
                    className={`${styles.searchViewAll} ${activeIdx === hits.length ? styles.searchHitActive : ""}`}
                    onClick={() => goToResults()}
                    onMouseEnter={() => setActive(hits.length)}
                  >
                    Ver todos los resultados para "{query}"
                    <ArrowRight size={12} strokeWidth={1.5} />
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

const Navbar: React.FC = () => {
  const [scrolled, setScrolled]     = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [authOpen, setAuthOpen]     = useState(false);
  const navigate = useNavigate();

  const { itemCount, openCart } = useCart();
  const { count, openWishlist } = useWishlist();
  const { isAuthenticated, user } = useAuth();

  const isAdmin = isAuthenticated && user?.role === "Admin";

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const closeSearch = useCallback(() => setSearchOpen(false), []);

  return (
    <>
      <div className={styles.topbar}>
        <div className={styles.topbarInner}>
          <span>Envío gratis en pedidos +<em>$150</em></span>
          <span className={styles.sep}>·</span>
          <span>Código <em>NEXWEAR15</em> — 15% descuento</span>
          <span className={styles.sep}>·</span>
          <span>Devoluciones gratis <em>30 días</em></span>
        </div>
      </div>

      <nav className={`${styles.nav} ${scrolled ? styles.solid : ""}`}>
        <Link to="/" className={styles.logo}>Nexwear</Link>

        <ul className={styles.links}>
          <li><Link to="/productos?category=mujer">Mujer</Link></li>
          <li><Link to="/productos?category=hombre">Hombre</Link></li>
          <li><Link to="/productos?category=accesorios">Accesorios</Link></li>
          <li><Link to="/productos?category=exteriores">Exteriores</Link></li>
          <li><Link to="/productos?isOnSale=true" className={styles.saleLink}>Rebajas</Link></li>
        </ul>

        <div className={styles.actions}>
          <button className={styles.iconBtn} onClick={() => setSearchOpen(true)} aria-label="Buscar">
            <Search size={16} strokeWidth={1.5} />
          </button>

          <button
            className={styles.iconBtn}
            aria-label="Cuenta"
            onClick={() => { if (isAuthenticated) navigate(ROUTES.PROFILE); else setAuthOpen(true); }}
          >
            <User size={16} strokeWidth={1.5} />
          </button>

          <button className={styles.iconBtn} onClick={openWishlist} aria-label="Favoritos">
            <Heart size={17} strokeWidth={1.5} />
            {count > 0 && <span className={styles.badge}>{count}</span>}
          </button>

          {isAdmin && (
            <Link to="/Admin" className={styles.iconBtn} aria-label="Dashboard Admin">
              <ShieldCheck size={16} strokeWidth={1.5} />
            </Link>
          )}

          <button className={styles.cartBtn} onClick={openCart} aria-label="Bolsa">
            <ShoppingBag size={16} strokeWidth={1.5} />
            <span className={styles.cartLabel}>Bolsa</span>
            {itemCount > 0 && <span className={styles.badge}>{itemCount}</span>}
          </button>
        </div>
      </nav>

      {searchOpen && <SearchOverlay onClose={closeSearch} />}

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        reason="Inicia sesión para acceder a tu cuenta"
      />
    </>
  );
};

export default Navbar;