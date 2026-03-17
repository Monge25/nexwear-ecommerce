import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import styles from "./Navbar.module.css";
import { ROUTES } from "@/utils/constants"
import { FiUserPlus } from "react-icons/fi";

const Navbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearch] = useState(false);
  const [query, setQuery] = useState("");

  const { itemCount, openCart } = useCart();
  const { isAuthenticated, user } = useAuth();

  const navigate = useNavigate();
  const isAdmin = isAuthenticated && user?.role === "Admin";
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSearch(false);
      }
    };

    document.addEventListener("keydown", handler);

    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    const value = query.trim();

    if (value) {
      navigate(`/productos?search=${encodeURIComponent(value)}`);
      setSearch(false);
      setQuery("");
    }
  };

  return (
    <>
      {/* Top bar */}
      <div className={styles.topbar}>
        <div className={styles.topbarInner}>
          <span>
            Envío gratis en pedidos +<em>$150</em>
          </span>

          <span className={styles.sep}>·</span>

          <span>
            Código <em>NEXWEAR15</em> — 15% descuento
          </span>

          <span className={styles.sep}>·</span>

          <span>
            Devoluciones gratis <em>30 días</em>
          </span>
        </div>
      </div>

      {/* Navbar */}
      <nav className={`${styles.nav} ${scrolled ? styles.solid : ""}`}>
        <Link to="/" className={styles.logo}>
          Nexwear
        </Link>

        {/* Links */}
        <ul className={styles.links}>
          <li>
            <Link to="/productos?category=mujer">Mujer</Link>
          </li>

          <li>
            <Link to="/productos?category=hombre">Hombre</Link>
          </li>

          <li>
            <Link to="/productos">Colección</Link>
          </li>

          <li>
            <Link to="/productos?category=exteriores">Exteriores</Link>
          </li>

          <li>
            <Link to="/productos?sale=true" className={styles.saleLink}>
              Rebajas
            </Link>
          </li>
        </ul>

        {/* Actions */}
        <div className={styles.actions}>
          {/* Buscar */}
          <button
            className={styles.iconBtn}
            onClick={() => setSearch(true)}
            aria-label="Buscar"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </button>

          {/* Perfil */}
          <Link
            to={isAuthenticated ? ROUTES.PROFILE : ROUTES.LOGIN}
            className={styles.iconBtn}
            aria-label="Cuenta"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </Link>

          {/* Admin Dashboard */}
          {isAdmin && (
            <Link
              to="/Admin"
              className={styles.iconBtn}
              aria-label="Dashboard Admin"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
            </Link>
          )}

          {/* Carrito */}
          <button
            className={styles.cartBtn}
            onClick={openCart}
            aria-label="Bolsa"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>

            <span className={styles.cartLabel}>Bolsa</span>

            {itemCount > 0 && <span className={styles.badge}>{itemCount}</span>}
          </button>
        </div>
      </nav>

      {/* Search overlay */}
      {searchOpen && (
        <div className={styles.searchOverlay}>
          <form className={styles.searchForm} onSubmit={handleSearch}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--g400)"
              strokeWidth="1.5"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>

            <input
              autoFocus
              className={styles.searchInput}
              placeholder="Buscar prendas, materiales…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />

            <button
              type="button"
              className={styles.searchClose}
              onClick={() => setSearch(false)}
            >
              ✕
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default Navbar;