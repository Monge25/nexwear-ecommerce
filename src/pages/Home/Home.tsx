import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useFetch } from "@/hooks/useFetch";
import productService from "@/services/productService";
import ProductCard from "@/components/common/ProductCard";
import type { Product } from "@/types";
import styles from "./Home.module.css";

const SLIDES = [
  {
    eyebrow: "SS25 — Nueva Colección",
    title: "Definida",
    titleEm: "el Silencio",
    desc: "Ropa que habla a través de la contención. Piezas diseñadas para quienes dejan que su presencia hable por ellos.",
    image: "/images/banners/banner-5.jpg", 
  },
  {
    eyebrow: "Esenciales — Edición Limitada",
    title: "Viste el",
    titleEm: "Vacío",
    desc: "Maestría monocromática. Un guardarropa despojado a su forma más esencial.",
    image: "/images/banners/banner-3.jpg",
  },
  {
    eyebrow: "Drop Exclusivo",
    title: "Forma",
    titleEm: "Deseo",
    desc: "Piezas exclusivas en cantidades limitadas. Una vez agotadas, desaparecen.",
    image: "/images/banners/banner-4.jpg",
  },
];

// ── Carrusel reutilizable ─────────────────────────────────────────────────────
interface CarouselProps {
  title: string;
  titleEm: string;
  products: Product[];
  onAddToCart: (p: Product) => void;
}

const ProductCarousel: React.FC<CarouselProps> = ({
  title,
  titleEm,
  products,
  onAddToCart,
}) => {
  const trackRef = React.useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = React.useState(0);

  const CARD_WIDTH = 320 + 16; // minWidth + gap

  const scrollTo = React.useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(index, products.length - 1));
      setActiveIndex(clamped);
      trackRef.current?.scrollTo({
        left: clamped * CARD_WIDTH,
        behavior: "smooth",
      });
    },
    [products.length],
  );

  const handleScroll = () => {
    if (!trackRef.current) return;
    const index = Math.round(trackRef.current.scrollLeft / CARD_WIDTH);
    setActiveIndex(index);
  };

  if (!products.length) return null;

  return (
    <section className={styles.trending}>
      {/* Header */}
      <div className={styles.secHeader}>
        <div>
          <span className={styles.eyebrow2}>Colección</span>
          <h2 className={styles.secTitle}>
            {title} <em>{titleEm}</em>
          </h2>
        </div>

        <div className={styles.carouselControls}>
          <button
            className={styles.carouselArrow}
            onClick={() => scrollTo(activeIndex - 1)}
            disabled={activeIndex === 0}
            aria-label="Anterior"
          >
            ←
          </button>
          <button
            className={styles.carouselArrow}
            onClick={() => scrollTo(activeIndex + 1)}
            disabled={activeIndex >= products.length - 1}
            aria-label="Siguiente"
          >
            →
          </button>
        </div>
      </div>

      {/* Track */}
      <div
        className={styles.carouselTrack}
        ref={trackRef}
        onScroll={handleScroll}
      >
        {products.map((p) => (
          <div key={p.id} className={styles.carouselCard}>
            <ProductCard product={p}/>
          </div>
        ))}
      </div>

      {/* Dots */}
      <div className={styles.carouselDots}>
        {products.map((_, i) => (
          <button
            key={i}
            className={`${styles.carouselDot} ${
              i === activeIndex ? styles.carouselDotActive : ""
            }`}
            onClick={() => scrollTo(i)}
            aria-label={`Producto ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
};

// ── Home ──────────────────────────────────────────────────────────────────────
const Home: React.FC = () => {
  const navigate = useNavigate();
  const [slide, setSlide] = React.useState(0);

  const { data: featured } = useFetch(() => productService.getFeatured(), []);

  // Fetch separado por categoría — garantiza exactamente 10 de cada una
  const { data: mujerData } = useFetch(
    () => productService.getProducts({ category: "mujer", limit: 10, page: 1 }),
    [],
  );

  const { data: hombreData } = useFetch(
    () =>
      productService.getProducts({ category: "hombre", limit: 10, page: 1 }),
    [],
  );

  React.useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % SLIDES.length), 5000);
    return () => clearInterval(t);
  }, []);

  // onAddToCart es solo un callback informativo — el modal en ProductCard
  // ya se encarga de llamar addItem con los datos correctos
  const handleQuickAdd = (_p: Product) => {
    // intencionalmente vacío
  };

  const mujerProducts: Product[] = mujerData?.data ?? [];
  const hombreProducts: Product[] = hombreData?.data ?? [];

  return (
    <main>
      {/* ── Hero ── */}
      <section className={styles.hero}>
        {SLIDES.map((s, i) => (
          <div
            key={i}
            className={`${styles.slide} ${i === slide ? styles.active : ""}`}
          >
            <div
              className={styles.slideBg}
              style={{ backgroundImage: `url(${s.image})` }}
            />
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
        <div className={styles.dots}>
          {SLIDES.map((_, i) => (
            <button
              key={i}
              className={`${styles.dot} ${i === slide ? styles.dotActive : ""}`}
              onClick={() => setSlide(i)}
            />
          ))}
        </div>
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

      {/* ── Sale Banner ── */}
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
            {featured.slice(0, 8).map((p) => (
              <ProductCard
                key={p.id}
                product={p}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Categories ── */}
      <section className={styles.cats}>
        <div className={styles.secHeader}>
          <div>
            <p className={styles.eyebrow2} style={{ color: "var(--dorado)" }}>
              Compra por
            </p>
            <h2 className={styles.secTitle} style={{ color: "var(--negro)" }}>
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
              image: "/images/categories/mujeres2.png",
            },
            {
              key: "hombre",
              label: "Hombre",
              sub: "Explorar",
              span: false,
              image: "/images/categories/hombre2.webp",
            },
            {
              key: "exteriores",
              label: "Exteriores",
              sub: "Descubrir",
              span: false,
              image: "/images/categories/exteriores2.webp",
            },
            {
              key: "sale",
              label: "Rebajas",
              sub: "Limitado",
              span: false,
              image: "/images/categories/rebajas.webp",
            },
          ].map((cat) => (
            <div
              key={cat.key}
              className={`${styles.catCard} ${cat.span ? styles.catSpan : ""}`}
              style={{ backgroundImage: `url(${cat.image})` }}
              onClick={() => navigate(`/productos?category=${cat.key}`)}
            >
              <div className={styles.catOverlay} />
              <div className={styles.catInfo}>
                <small>{cat.sub}</small>
                <strong>{cat.label}</strong>
              </div>
              <span className={styles.catArrow}>→</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Trending Mujer — Carrusel ── */}
      <ProductCarousel
        title="Trending"
        titleEm="Mujer"
        products={mujerProducts}
        onAddToCart={handleQuickAdd}
      />

      {/* ── Banner Editorial ── */}
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

      {/* ── Trending Hombre — Carrusel ── */}
      <ProductCarousel
        title="Trending"
        titleEm="Hombre"
        products={hombreProducts}
        onAddToCart={handleQuickAdd}
      />

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
