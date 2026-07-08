"use client";

import { useState } from "react";
import styles from "./CalificarVendedorModal.module.css";

export default function CalificarVendedorModal({ isOpen, pedidoId, onClose }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleEnviar = async () => {
    if (rating === 0) return;
    setSubmitting(true);
    try {
      const token = sessionStorage.getItem("token");
      const res = await fetch(`/pedidoMs/pedidos/${pedidoId}/calificacion`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ puntuacion: rating }),
      });
      if (res.ok) onClose();
    } catch (error) {
      console.error("Error al calificar vendedor:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h2 className={styles.title}>¿Cómo fue tu experiencia de compra?</h2>
        <p className={styles.subtitle}>Califica al vendedor:</p>

        <div className={styles.stars}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className={styles.starBtn}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              aria-label={`${star} estrellas`}
            >
              <svg width="34" height="34" viewBox="0 0 24 24"
                fill={(hoverRating || rating) >= star ? "#FFC107" : "none"}
                stroke="#FFC107" strokeWidth="1.5">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </button>
          ))}
        </div>

        <div className={styles.actions}>
          <button className={styles.omitirBtn} onClick={onClose} disabled={submitting}>
            Omitir
          </button>
          <button
            className={styles.enviarBtn}
            onClick={handleEnviar}
            disabled={rating === 0 || submitting}
          >
            {submitting ? "Enviando..." : "Enviar"}
          </button>
        </div>
      </div>
    </div>
  );
}