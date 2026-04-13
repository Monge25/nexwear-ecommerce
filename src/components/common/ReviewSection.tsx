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

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

// Normaliza la respuesta sin importar si la API devuelve [] o { data, averageRating, ... }
function normalizeReviews(raw: any): {
  reviews: any[];
  averageRating: number;
  total: number;
  ratingDistribution: Record<number, number>;
} {
  const reviews: any[] = Array.isArray(raw)
    ? raw
    : raw?.data ?? raw?.items ?? raw?.reviews ?? [];

  const total: number = Array.isArray(raw)
    ? raw.length
    : raw?.total ?? raw?.totalCount ?? reviews.length;

  const averageRating: number = Array.isArray(raw)
    ? reviews.length > 0
      ? reviews.reduce((s: number, r: any) => s + (r.rating ?? 0), 0) /
        reviews.length
      : 0
    : raw?.averageRating ?? 0;

  const ratingDistribution: Record<number, number> = Array.isArray(raw)
    ? reviews.reduce((acc: Record<number, number>, r: any) => {
        acc[r.rating] = (acc[r.rating] ?? 0) + 1;
        return acc;
      }, {})
    : raw?.ratingDistribution ?? {};

  return { reviews, averageRating, total, ratingDistribution };
}

async function getPurchasedOrders(
  productId: string,
  token: string,
): Promise<{ orderId: string; orderNumber: string }[]> {
  try {
    const res = await fetch(`${BASE}/Orders`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const orders: any[] = Array.isArray(data)
      ? data
      : data?.items ?? data?.data ?? [];

    return orders
      .filter(
        (order) =>
          order.status?.toLowerCase() === "paid" &&
          (order.items ?? order.orderItems ?? []).some(
            (item: any) => String(item.productId) === String(productId),
          ),
      )
      .map((order) => ({
        orderId: order.id,
        orderNumber:
          order.orderNumber ??
          `ORD-${String(order.id).slice(0, 8).toUpperCase()}`,
      }));
  } catch {
    return [];
  }
}

function getToken(): string {
  return (
    localStorage.getItem("nw_token") ??
    localStorage.getItem("nexwear_token") ??
    localStorage.getItem("token") ??
    localStorage.getItem("accessToken") ??
    ""
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
const ReviewSection: React.FC<Props> = ({ productId }) => {
  const { isAuthenticated } = useAuth();
  const [page, setPage] = useState(1);
  const [authOpen, setAuthOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const [eligibleOrders, setEligibleOrders] = useState<
    { orderId: string; orderNumber: string }[]
  >([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [loadingOrders, setLoadingOrders] = useState(false);

  const [rating, setRating] = useState(5);
  const [hoverRating, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSub] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  useEffect(() => {
    if (!isAuthenticated) {
      setEligibleOrders([]);
      return;
    }
    setLoadingOrders(true);
    getPurchasedOrders(productId, getToken())
      .then((orders) => {
        setEligibleOrders(orders);
        if (orders.length > 0) setSelectedOrderId(orders[0].orderId);
      })
      .finally(() => setLoadingOrders(false));
  }, [isAuthenticated, productId]);

  const { data: rawData, refetch } = useFetch(
    () => reviewService.getByProduct(productId, page),
    [productId, page],
  );

  // Normalizar siempre, incluso si rawData es undefined o []
  const {
    reviews: allReviews,
    averageRating,
    total,
    ratingDistribution,
  } = normalizeReviews(rawData ?? []);

  const reviews = allReviews.filter((r: any) => r.isApproved && !r.isRejected);
  const distTotal = Object.values(ratingDistribution).reduce(
    (s, n) => s + n,
    0,
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
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      setError("Por favor escribe un comentario");
      return;
    }
    if (!selectedOrderId) {
      setError("Selecciona la orden con la que compraste este producto");
      return;
    }
    setSub(true);
    setError("");
    try {
      const res = await apiClient.post<{ id: string | number }>(`/Reviews`, {
        orderId: selectedOrderId,
        productId,
        rating,
        comment: comment.trim(),
      });
      const reviewId = res.data?.id;

      if (photo && reviewId) {
        try {
          const fd = new FormData();
          fd.append("file", photo);
          await fetch(`${BASE}/Reviews/${reviewId}/photos`, {
            method: "POST",
            headers: { Authorization: `Bearer ${getToken()}` },
            body: fd,
          });
        } catch {
          console.warn("La foto no se pudo subir");
        }
      }

      setSubmitted(true);
      setFormOpen(false);
      setComment("");
      setRating(5);
      setPhoto(null);
      setPhotoPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      refetch();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        err?.response?.data ??
        "Error al enviar la reseña";
      setError(typeof msg === "string" ? msg : "Error al enviar la reseña");
    } finally {
      setSub(false);
    }
  };

  const renderWriteButton = () => {
    if (!isAuthenticated) {
      return (
        <button className={styles.writeBtn} onClick={() => setAuthOpen(true)}>
          + Escribir reseña
        </button>
      );
    }
    if (loadingOrders) return null;
    if (eligibleOrders.length === 0) return null;
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

      {/* Resumen — solo si hay reseñas */}
      {reviews.length > 0 && (
        <div className={styles.summary}>
          <div className={styles.avgBlock}>
            <p className={styles.avgNum}>{averageRating.toFixed(1)}</p>
            <div className={styles.avgStars}>
              {stars(Math.round(averageRating))}
            </div>
            <p className={styles.avgCount}>
              {total} reseña{total !== 1 ? "s" : ""}
            </p>
          </div>
          <div className={styles.bars}>
            {[5, 4, 3, 2, 1].map((n) => {
              const cnt = ratingDistribution[n] ?? 0;
              const pct = distTotal > 0 ? (cnt / distTotal) * 100 : 0;
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

          {eligibleOrders.length > 1 && (
            <div className={styles.field}>
              <label>Orden de compra</label>
              <select
                value={selectedOrderId}
                onChange={(e) => setSelectedOrderId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #e8e8e8",
                  borderRadius: 8,
                  fontSize: 13,
                  fontFamily: "inherit",
                  background: "#fafafa",
                  cursor: "pointer",
                }}
              >
                {eligibleOrders.map((o) => (
                  <option key={o.orderId} value={o.orderId}>
                    {o.orderNumber}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className={styles.ratingPicker}>
            <span className={styles.ratingLabel}>Calificación</span>
            <div className={styles.starPicker}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`${styles.starBtn} ${
                    n <= (hoverRating || rating) ? styles.starOn : ""
                  }`}
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

          <div className={styles.field}>
            <label>Tu reseña</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Cuéntanos sobre el producto, talla, calidad, comodidad..."
              rows={4}
              required
            />
          </div>

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
        {reviews.length === 0 ? (
          <p className={styles.empty}>Aún no hay reseñas. ¡Sé el primero!</p>
        ) : (
          reviews.map((r: any) => (
            <div key={r.id} className={styles.reviewCard}>
              <div className={styles.reviewTop}>
                <div className={styles.avatar}>
                  {r.userAvatar ? (
                    <img src={r.userAvatar} alt="" />
                  ) : (
                    (r.userName ?? r.user?.firstName ?? "U")
                      .charAt(0)
                      .toUpperCase()
                  )}
                </div>
                <div>
                  <p className={styles.reviewUser}>
                    {r.userName ??
                      `${r.user?.firstName ?? ""} ${r.user?.lastName ?? ""}`.trim()}
                  </p>
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
              {r.title && <h4 className={styles.reviewTitle}>{r.title}</h4>}
              {/* La API guarda "comment" pero puede venir como "body" */}
              <p className={styles.reviewBody}>{r.body ?? r.comment ?? ""}</p>

              {(r.photos ?? r.photoUrls ?? []).length > 0 && (
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    marginTop: 8,
                    flexWrap: "wrap",
                  }}
                >
                  {(r.photos ?? r.photoUrls ?? []).map(
                    (url: string, i: number) => (
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
                    ),
                  )}
                </div>
              )}

              <button
                className={styles.helpfulBtn}
                onClick={() => reviewService.markHelpful(r.id)}
              >
                👍 Útil ({r.helpful ?? 0})
              </button>
            </div>
          ))
        )}
      </div>

      {/* Paginación */}
      {total > 8 && (
        <div className={styles.pagination}>
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className={styles.pageBtn}
          >
            ← Anterior
          </button>
          <span>
            {page} / {Math.ceil(total / 8)}
          </span>
          <button
            disabled={page >= Math.ceil(total / 8)}
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
        onSuccess={() => {}}
      />
    </section>
  );
};

export default ReviewSection;