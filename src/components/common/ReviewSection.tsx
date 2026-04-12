import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useFetch } from "@/hooks/useFetch";
import reviewService from "@/services/reviewService";
import apiClient from "@/services/apiClient";
import AuthModal from "./AuthModal";
import styles from "./ReviewSection.module.css";
import env from "@/config/environment";

interface Props {
  productId: string;
}

const BASE = env.API_BASE_URL;

const stars = (n: number) =>
  Array.from({ length: 5 }, (_, i) => (
    <span
      key={i}
      style={{
        opacity: i < n ? 1 : 0.18,
        color: "var(--dorado)",
        fontSize: "16px",
      }}
    >
      ★
    </span>
  ));

async function checkUserPurchased(
  productId: string,
  token: string,
): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/Orders`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return false;
    const data = await res.json();
    const orders: any[] =
      data?.data ?? data?.items ?? (Array.isArray(data) ? data : []);
    return orders.some(
      (order) =>
        ["delivered", "completed"].includes(order.status) &&
        (order.items ?? order.orderItems ?? []).some(
          (item: any) => String(item.productId) === String(productId),
        ),
    );
  } catch {
    return false;
  }
}

const ReviewSection: React.FC<Props> = ({ productId }) => {
  const { isAuthenticated } = useAuth();
  const [page, setPage] = useState(1);
  const [authOpen, setAuthOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHover] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSub] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [hasPurchased, setHasPurchased] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Limpia el object URL al desmontar o cambiar preview
  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  // Verifica si el usuario compró el producto
  useEffect(() => {
    if (!isAuthenticated) {
      setHasPurchased(false);
      return;
    }
    const token =
      localStorage.getItem("nw_token") ??
      localStorage.getItem("nexwear_token") ??
      localStorage.getItem("token") ??
      localStorage.getItem("accessToken") ??
      "";
    checkUserPurchased(productId, token).then(setHasPurchased);
  }, [isAuthenticated, productId]);

  const { data, refetch } = useFetch(
    () => reviewService.getByProduct(productId, page),
    [productId, page],
  );

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setPhoto(file);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
  };

  const handleOpenForm = () => {
    if (!isAuthenticated) {
      setAuthOpen(true);
      return;
    }
    if (!hasPurchased) return;
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !body) {
      setError("Por favor completa todos los campos");
      return;
    }
    setSub(true);
    setError("");
    try {
      const token =
        localStorage.getItem("nw_token") ??
        localStorage.getItem("nexwear_token") ??
        localStorage.getItem("token") ??
        localStorage.getItem("accessToken") ??
        "";

      // 1. Crear la reseña
      const res = await apiClient.post<{ id: string | number }>(
        `/products/${productId}/reviews`,
        { rating, title, comment: body },
      );
      const reviewId = res.data?.id;

      // 2. Subir foto si existe (opcional, fallo silencioso)
      if (photo && reviewId) {
        try {
          const fd = new FormData();
          fd.append("file", photo);
          await fetch(`${BASE}/Reviews/${reviewId}/photos`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: fd,
          });
        } catch {
          console.warn("La foto no se pudo subir");
        }
      }

      setSubmitted(true);
      setFormOpen(false);
      setTitle("");
      setBody("");
      setRating(5);
      setPhoto(null);
      setPhotoPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      refetch();
    } catch {
      setError("Error al enviar la reseña");
    } finally {
      setSub(false);
    }
  };

  const dist = data?.ratingDistribution ?? {};
  const total = Object.values(dist).reduce((s, n) => s + n, 0);

  const renderWriteButton = () => {
    // No autenticado → muestra botón que abre login
    if (!isAuthenticated) {
      return (
        <button className={styles.writeBtn} onClick={() => setAuthOpen(true)}>
          + Escribir reseña
        </button>
      );
    }
    // Verificando compra → no muestra nada todavía
    if (hasPurchased === null) return null;

    // No compró → no muestra el botón
    if (!hasPurchased) return null;

    // Compró → muestra el botón
    return (
      <button className={styles.writeBtn} onClick={handleOpenForm}>
        + Escribir reseña
      </button>
    );
  };

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>Reseñas de Clientes</h2>
        {renderWriteButton()}
      </div>

      {/* Mensaje si no ha comprado
      {isAuthenticated && hasPurchased === false && (
        <p style={{ fontSize: 12, color: "#9a9a9a", marginBottom: 12 }}>
          Solo los clientes que han comprado y recibido este producto pueden
          escribir una reseña.
        </p>
      )} */}

      {/* Summary */}
      {data && (
        <div className={styles.summary}>
          <div className={styles.avgBlock}>
            <p className={styles.avgNum}>{data.averageRating.toFixed(1)}</p>
            <div className={styles.avgStars}>
              {stars(Math.round(data.averageRating))}
            </div>
            <p className={styles.avgCount}>{data.total} reseñas</p>
          </div>
          <div className={styles.bars}>
            {[5, 4, 3, 2, 1].map((n) => {
              const cnt = dist[n] ?? 0;
              const pct = total > 0 ? (cnt / total) * 100 : 0;
              return (
                <div key={n} className={styles.barRow}>
                  <span className={styles.barLabel}>{n} ★</span>
                  <div className={styles.barTrack}>
                    <div
                      className={styles.barFill}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className={styles.barCount}>{cnt}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Formulario */}
      {formOpen && (
        <form className={styles.form} onSubmit={handleSubmit}>
          <h3 className={styles.formTitle}>Tu reseña</h3>

          {/* Selector de estrellas */}
          <div className={styles.ratingPicker}>
            <span className={styles.ratingLabel}>Calificación</span>
            <div className={styles.starPicker}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`${styles.starBtn} ${n <= (hoverRating || rating) ? styles.starOn : ""}`}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => setRating(n)}
                >
                  ★
                </button>
              ))}
              <span className={styles.ratingText}>
                {
                  ["", "Muy malo", "Malo", "Regular", "Bueno", "Excelente"][
                    hoverRating || rating
                  ]
                }
              </span>
            </div>
          </div>

          {/* Título */}
          <div className={styles.field}>
            <label>Título de la reseña</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Resumen breve de tu experiencia"
              required
            />
          </div>

          {/* Cuerpo */}
          <div className={styles.field}>
            <label>Tu reseña</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Cuéntanos más sobre el producto, talla, calidad..."
              rows={4}
              required
            />
          </div>

          {/* Foto — opcional */}
          <div className={styles.field}>
            <label>
              Foto del producto
              <span
                style={{
                  fontSize: 11,
                  color: "#9a9a9a",
                  marginLeft: 6,
                  fontWeight: 400,
                }}
              >
                (opcional)
              </span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoChange}
              style={{ marginTop: 4 }}
            />
            <div style={{ fontSize: 11, color: "#9a9a9a", marginTop: 4 }}>
              JPG, PNG o WebP. Máx. recomendado: 5 MB.
            </div>

            {/* Preview */}
            {photoPreview && (
              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <img
                  src={photoPreview}
                  alt="Vista previa"
                  style={{
                    width: 80,
                    height: 80,
                    objectFit: "cover",
                    borderRadius: 8,
                    border: "1px solid #e8e8e8",
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setPhoto(null);
                    setPhotoPreview(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  style={{
                    fontSize: 11,
                    color: "#e05",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  ✕ Quitar foto
                </button>
              </div>
            )}
          </div>

          {error && <p className={styles.err}>{error}</p>}

          <p style={{ fontSize: 11, color: "#9a9a9a", marginTop: -4 }}>
            Tu reseña será visible después de ser aprobada por nuestro equipo.
          </p>

          <div className={styles.formBtns}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={() => {
                setFormOpen(false);
                setPhoto(null);
                setPhotoPreview(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={submitting}
            >
              {submitting ? "Enviando…" : "Publicar reseña"}
            </button>
          </div>
        </form>
      )}

      {submitted && (
        <div className={styles.successMsg}>
          ✓ ¡Gracias! Tu reseña fue enviada y está pendiente de aprobación.
        </div>
      )}

      {/* Lista de reseñas */}
      <div className={styles.list}>
        {!data?.data.length ? (
          <p className={styles.empty}>Aún no hay reseñas. ¡Sé el primero!</p>
        ) : (
          data.data.map((r) => (
            <div key={r.id} className={styles.reviewCard}>
              <div className={styles.reviewTop}>
                <div className={styles.avatar}>
                  {r.userAvatar ? (
                    <img src={r.userAvatar} alt="" />
                  ) : (
                    r.userName.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <p className={styles.reviewUser}>{r.userName}</p>
                  <div className={styles.reviewStars}>{stars(r.rating)}</div>
                </div>
                <div className={styles.reviewMeta}>
                  {r.verified && (
                    <span className={styles.verified}>✓ Compra verificada</span>
                  )}
                  <span className={styles.reviewDate}>
                    {new Date(r.createdAt).toLocaleDateString("es-MX", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </div>
              <h4 className={styles.reviewTitle}>{r.title}</h4>
              <p className={styles.reviewBody}>{r.body}</p>

              {/* Fotos de la reseña si las hay */}
              {r.photos && r.photos.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    marginTop: 8,
                    flexWrap: "wrap",
                  }}
                >
                  {r.photos.map((url: string, i: number) => (
                    <img
                      key={i}
                      src={url}
                      alt={`Foto ${i + 1}`}
                      style={{
                        width: 72,
                        height: 72,
                        objectFit: "cover",
                        borderRadius: 6,
                        border: "1px solid #e8e8e8",
                        cursor: "pointer",
                      }}
                      onClick={() => window.open(url, "_blank")}
                    />
                  ))}
                </div>
              )}

              <button
                className={styles.helpfulBtn}
                onClick={() => reviewService.markHelpful(r.id)}
              >
                👍 Útil ({r.helpful})
              </button>
            </div>
          ))
        )}
      </div>

      {/* Paginación */}
      {data && data.total > 8 && (
        <div className={styles.pagination}>
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className={styles.pageBtn}
          >
            ← Anterior
          </button>
          <span>
            {page} / {Math.ceil(data.total / 8)}
          </span>
          <button
            disabled={page >= Math.ceil(data.total / 8)}
            onClick={() => setPage((p) => p + 1)}
            className={styles.pageBtn}
          >
            Siguiente →
          </button>
        </div>
      )}

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        reason="Inicia sesión para escribir una reseña"
        onSuccess={() => {
          /* hasPurchased se re-evalúa via useEffect */
        }}
      />
    </section>
  );
};

export default ReviewSection;
