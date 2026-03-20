import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useFetch } from "@/hooks/useFetch";
import productService from "@/services/productService";
import ProductCard from "@/components/common/ProductCard";
import { useCart } from "@/hooks/useCart";
import type { Product } from "@/types";
import styles from "./Home.module.css";

// ── Hero slides ───────────────────────────────────────────────────────────────
const SLIDES = [
  {
    eyebrow: "SS25 — Nueva Colección",
    title: "Definida",
    titleEm: "el Silencio",
    desc: "Ropa que habla a través de la contención. Piezas diseñadas para quienes dejan que su presencia hable por ellos.",
  },
  {
    eyebrow: "Esenciales — Edición Limitada",
    title: "Viste el",
    titleEm: "Vacío",
    desc: "Maestría monocromática. Un guardarropa despojado a su forma más esencial.",
  },
  {
    eyebrow: "Drop Exclusivo",
    title: "Forma",
    titleEm: "Deseo",
    desc: "Piezas exclusivas en cantidades limitadas. Una vez agotadas, desaparecen.",
  },
];

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [slide, setSlide] = React.useState(0);
  const { addItem } = useCart();
  const { data: featured } = useFetch(() => productService.getFeatured(), []);

  const { data: products, loading: loadingProducts } = useFetch(
    () => productService.getProducts({ limit: 8 }),
    []
  );

  console.log("PRODUCTOS API:", products);

  // Auto-advance hero
  React.useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % SLIDES.length), 5000);
    return () => clearInterval(t);
  }, []);

  const handleQuickAdd = (p: Product) => {
    addItem(p, 1, p.sizes[0], p.colors[0]);
  };

  return (
    <main>
      {/* ── Hero ── */}
      <section className={styles.hero}>
        {SLIDES.map((s, i) => (
          <div
            key={i}
            className={`${styles.slide} ${i === slide ? styles.active : ""}`}
          >
            <div className={`${styles.slideBg} ${styles[`bg${i + 1}`]}`} />
            <div className={styles.slideContent}>
              <p className={styles.eyebrow}>{s.eyebrow}</p>
              <h1 className={styles.heroTitle}>
                {s.title}
                <br />
                <em>{s.titleEm}</em>
              </h1>
              <p className={styles.heroDesc}>{s.desc}</p>
              <div className={styles.heroBtns}>
                <button
                  className={styles.btnFill}
                  onClick={() => navigate("/productos")}
                >
                  <span>Comprar Ahora</span>
                </button>
                <button className={styles.btnOutline}>Ver Lookbook</button>
              </div>
            </div>
          </div>
        ))}
        {/* Progress dots */}
        <div className={styles.dots}>
          {SLIDES.map((_, i) => (
            <button
              key={i}
              className={`${styles.dot} ${i === slide ? styles.dotActive : ""}`}
              onClick={() => setSlide(i)}
            />
          ))}
        </div>
        {/* Arrows */}
        <div className={styles.arrows}>
          <button
            className={styles.arrow}
            onClick={() =>
              setSlide((s) => (s - 1 + SLIDES.length) % SLIDES.length)
            }
          >
            ←
          </button>
          <button
            className={styles.arrow}
            onClick={() => setSlide((s) => (s + 1) % SLIDES.length)}
          >
            →
          </button>
        </div>
      </section>

      {/* ── Marquee ── */}
      <div className={styles.marquee}>
        <div className={styles.marqueeTrack}>
          {[
            "Nuevas Llegadas",
            "SS25",
            "Edición Limitada",
            "Envío Gratis +$150",
            "Diseñado en NYC",
            "Telas Sostenibles",
            "Artesanía Premium",
            "Nuevas Llegadas",
            "SS25",
            "Edición Limitada",
            "Envío Gratis +$150",
            "Diseñado en NYC",
            "Telas Sostenibles",
            "Artesanía Premium",
          ].map((t, i) => (
            <React.Fragment key={i}>
              <span>{t}</span>
              <span className={styles.dot2}>·</span>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ── Featured ── */}
      {featured && featured.length > 0 && (
        <section className={styles.featured}>
          <div className={styles.secHeader}>
            <div>
              <p className={styles.eyebrow2}>Selección Curada</p>
              <h2 className={styles.secTitle}>
                Piezas <em>Destacadas</em>
              </h2>
            </div>
            <Link to="/productos" className={styles.secLink}>
              Ver Todas →
            </Link>
          </div>
          <div className={styles.featGrid}>
            {featured.slice(0, 4).map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onAddToCart={handleQuickAdd}
              />
            ))}
          </div>
        </section>
      )}

      {/* SALE BANNER */}
      <section className={styles.saleBanner}>
        <div className={styles.saleContent}>
          <div>
            <h2 className={styles.saleTitle}>
              Rebajas de <em>Temporada</em>
              <br />
              Hasta 40% de descuento
            </h2>

            <p className={styles.saleSub}>
              Selección limitada · Solo mientras haya existencias
            </p>
          </div>

          <button
            className={styles.saleBtn}
            onClick={() => navigate("/productos?sale=true")}
          >
            VER REBAJAS
          </button>
        </div>
      </section>

      {/* SHOP THE LOOK
      <section className={styles.looks}>
        <div className={styles.secHeader}>
          <h2 className={styles.secTitle}>
            Piezas <em>Destacadas</em>
            <p className={styles.eyebrow2}>Nueva Temporada</p>
          </h2>
        </div>

        <div className={styles.lookCarousel}>
          <div className={styles.lookCard}>
            <img
              src="src/public/images/banners/Prendas/prenda1.png"
              alt="Prenda 1"
            />
            <div className={styles.lookInfo}>
              <h4>Conjunto elegante en tonos oliva y beige</h4>
              <p>Explorar</p>
            </div>
          </div>

          <div className={styles.lookCard}>
            <img
              src="src/public/images/banners/Prendas/prenda2.png"
              alt="Prenda 2"
            />
            <div className={styles.lookInfo}>
              <h4>Vestido largo de lino</h4>
              <p>Explorar</p>
            </div>
          </div>

          <div className={styles.lookCard}>
            <img
              src="src/public/images/banners/Prendas/prenda3.png"
              alt="Prenda 3"
            />
            <div className={styles.lookInfo}>
              <h4>Pantalones de talle alto taupe</h4>
              <p>Explorar</p>
            </div>
          </div>

          <div className={styles.lookCard}>
            <img
              src="src/public/images/banners/Prendas/prenda4.png"
              alt="Prenda 4"
            />
            <div className={styles.lookInfo}>
              <h4>Conjunto Elegante en lino</h4>
              <p>Explorar</p>
            </div>
          </div>
        </div>
      </section> */}

      {/* ── Categories ── */}
      <section className={styles.cats}>
        <div className={styles.secHeader}>
          <div>
            <p className={styles.eyebrow2} style={{ color: "var(--dorado)" }}>
              Compra por
            </p>
            <h2 className={styles.secTitle} style={{ color: "var(--blanco)" }}>
              Categorías <em>Principales</em>
            </h2>
          </div>
        </div>

        <div className={styles.catsGrid}>
          {[
            {
              key: "mujer",
              label: "Mujer",
              sub: "Explorar",
              span: true,
              image: "",
            },
            {
              key: "hombre",
              label: "Hombre",
              sub: "Explorar",
              span: false,
              image: "",
            },
            {
              key: "exteriores",
              label: "Exteriores",
              sub: "Descubrir",
              span: false,
              image: "",
            },
            {
              key: "sale",
              label: "Rebajas",
              sub: "Limitado",
              span: false,
              image: "",
            },
          ].map((cat) => (
            <div
              key={cat.key}
              className={`${styles.catCard} ${cat.span ? styles.catSpan : ""}`}
              style={{ backgroundImage: `url(${cat.image})` }}
              onClick={() => navigate(`/productos?category=${cat.key}`)}
            >
              <div className={styles.overlay}></div>

              <div className={styles.catInfo}>
                <small>{cat.sub}</small>
                <strong>{cat.label}</strong>
              </div>

              <span className={styles.catArrow}>→</span>
            </div>
          ))}
        </div>
      </section>

      {/* TRENDING
      <section className={styles.trending1}>
        <div className={styles.secHeader}>
          <h2 className={styles.secTitle}>
            <em></em>
          </h2>
        </div>

        <div className={styles.featGrid}>
          {loadingProducts && <p>Cargando productos...</p>}

          {products?.data?.slice(0, 6).map((p) => (
            <ProductCard key={p.id} product={p} onAddToCart={handleQuickAdd} />
          ))}
        </div>
      </section> */}

      {/* TRENDING */}
      <section className={styles.trending}>
        <div className={styles.secHeader}>
          <h2 className={styles.secTitle}>
            Trending <em>Now</em>
          </h2>
        </div>

        <div className={styles.featGrid}>
          {featured?.slice(0, 6).map((p) => (
            <ProductCard key={p.id} product={p} onAddToCart={handleQuickAdd} />
          ))}
        </div>
      </section>

      {/* EDITORIAL BANNER */}
      <section className={styles.banner}>
        <div className={styles.bannerContent}>
          <p className={styles.eyebrow2}>Nueva Temporada</p>

          <h2 className={styles.bannerTitle}>
            Minimalismo <em>Atemporal</em>
          </h2>

          <button
            className={styles.btnFill}
            onClick={() => navigate("/productos")}
          >
            <span>Explorar colección</span>
          </button>
        </div>
      </section>

      {/* SHOP THE LOOK */}
      <section className={styles.looks}>
        <div className={styles.secHeader}>
          <h2 className={styles.secTitle}>
            Shop the <em>Look</em>
            {/* <p className={styles.eyebrow2}>Nueva Temporada</p> */}
          </h2>
        </div>

        <div className={styles.lookCarousel}>
          <div className={styles.lookCard}>
            <img src="src/public/images/banners/Looks/look1.png" alt="Look 1" />
            <div className={styles.lookInfo}>
              <h4>Minimal Suit</h4>
              <p>Explorar</p>
            </div>
          </div>

          <div className={styles.lookCard}>
            <img src="src/public/images/banners/Looks/look2.png" alt="Look 2" />
            <div className={styles.lookInfo}>
              <h4>Modern Elegance</h4>
              <p>Explorar</p>
            </div>
          </div>

          <div className={styles.lookCard}>
            <img src="src/public/images/banners/Looks/look3.png" alt="Look 3" />
            <div className={styles.lookInfo}>
              <h4>Urban Style</h4>
              <p>Explorar</p>
            </div>
          </div>

          <div className={styles.lookCard}>
            <img src="src/public/images/banners/Looks/look4.png" alt="Look 4" />
            <div className={styles.lookInfo}>
              <h4>Neutral Outfit</h4>
              <p>Explorar</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Editorial ── */}
      <section className={styles.editorial}>
        <div className={styles.edImg} />
        <div className={styles.edText}>
          <p className={styles.eyebrow2}>Nuestra Filosofía</p>
          <blockquote className={styles.quote}>
            La moda no es llenar el espacio,
            <br />
            sino <em>definirlo</em>.
          </blockquote>
          <p className={styles.quoteAuthor}>— Fundador, Nexwear</p>
          <p className={styles.edP}>
            Creemos que cada pieza de ropa debe ser una declaración de
            identidad. Diseñamos para la persona deliberada: aquella que viste
            con propósito, no por tendencia.
          </p>
          <button className={styles.btnFill2}>
            <span>Nuestra Historia</span>
          </button>
        </div>
      </section>

      {/* ── Newsletter ── */}
      <section className={styles.newsletter}>
        <div>
          <p className={styles.eyebrow2}>Únete a Nosotros</p>
          <h2 className={styles.nlTitle}>
            Sé el primero en
            <br />
            <em>descubrir</em> lo nuevo
          </h2>
        </div>
        <form className={styles.nlForm} onSubmit={(e) => e.preventDefault()}>
          <div className={styles.nlRow}>
            <input
              className={styles.nlInput}
              type="email"
              placeholder="Tu correo electrónico"
            />
            <button className={styles.nlBtn} type="submit">
              Suscribirse
            </button>
          </div>
          <p className={styles.nlNote}>
            Al suscribirte aceptas nuestra política de privacidad.
          </p>
        </form>
      </section>
    </main>
  );
};

export default Home;
