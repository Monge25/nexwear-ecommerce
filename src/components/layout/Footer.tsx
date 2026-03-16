import React from "react";
import { Link } from "react-router-dom";
import styles from "./Footer.module.css";

const Footer: React.FC = () => (
  <footer className={styles.footer}>
    <div className={styles.grid}>
      <div className={styles.brand}>
        <p className={styles.logo}>Nexwear</p>
        <p className={styles.desc}>
          Esenciales modernos para el vestidor deliberado. Diseñado en Nueva
          York, hecho para el mundo.
        </p>
        <div className={styles.social}>
          {["Ig", "Tw", "Tk", "Pt"].map((s) => (
            <a key={s} href="#" className={styles.socialLink}>
              {s}
            </a>
          ))}
        </div>
      </div>

      <div className={styles.col}>
        <h4 className={styles.colTitle}>Tienda</h4>
        <ul>
          <li>
            <Link to="/productos?category=mujer">Mujer</Link>
          </li>
          <li>
            <Link to="/productos?category=hombre">Hombre</Link>
          </li>
          <li>
            <Link to="/productos?isNew=true">Novedades</Link>
          </li>
          <li>
            <Link to="/productos?sale=true">Rebajas</Link>
          </li>
        </ul>
      </div>

      <div className={styles.col}>
        <h4 className={styles.colTitle}>Ayuda</h4>
        <ul>
          <li>
            <a href="#">Envíos</a>
          </li>
          <li>
            <a href="#">Devoluciones</a>
          </li>
          <li>
            <a href="#">Guía de Tallas</a>
          </li>
          <li>
            <a href="#">Contacto</a>
          </li>
        </ul>
      </div>

      <div className={styles.col}>
        <h4 className={styles.colTitle}>Empresa</h4>
        <ul>
          <li>
            <a href="#">Sobre Nosotros</a>
          </li>
          <li>
            <a href="#">Sostenibilidad</a>
          </li>
          <li>
            <a href="#">Prensa</a>
          </li>
          <li>
            <a href="#">Tiendas</a>
          </li>
        </ul>
      </div>
    </div>

    <div className={styles.bottom}>
      <span>
        © 2025 Nexwear · <a href="#">Privacidad</a> · <a href="#">Términos</a>
      </span>
      <div className={styles.payments}>
        {["Visa", "MC", "Amex", "PayPal"].map((p) => (
          <span key={p} className={styles.payChip}>
            {p}
          </span>
        ))}
      </div>
    </div>
  </footer>
);

export default Footer;
