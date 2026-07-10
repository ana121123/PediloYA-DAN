'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import styles from './ChatbotFlotante.module.css';

const STORAGE_KEY = 'chatbotMensajes';

const mensajeInicial = {
  rol: 'assistant',
  texto: '¡Hola! Decime qué se te antoja y te recomiendo algo del catálogo 😊',
  productos: [],
};

function cargarMensajesIniciales() {
  if (typeof window === 'undefined') return [mensajeInicial];
  try {
    const guardado = sessionStorage.getItem(STORAGE_KEY);
    if (guardado) {
      const parsed = JSON.parse(guardado);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Si está corrupto, seguimos con el mensaje inicial.
  }
  return [mensajeInicial];
}

export default function ChatbotFlotante({ profile }) {
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('chatbotAbierto') === 'true';
    });
  const [showTooltip, setShowTooltip] = useState(false);
  const [mensajes, setMensajes] = useState(cargarMensajesIniciales);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const mensajesEndRef = useRef(null);

  // Guardar historial en cada cambio
  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(mensajes));
  }, [mensajes]);

  useEffect(() => {
    const yaVisto = sessionStorage.getItem('chatbotTooltipVisto');
    if (!yaVisto) {
      const showTimer = setTimeout(() => setShowTooltip(true), 1200);
      const hideTimer = setTimeout(() => {
        setShowTooltip(false);
        sessionStorage.setItem('chatbotTooltipVisto', 'true');
      }, 8000);
      return () => {
        clearTimeout(showTimer);
        clearTimeout(hideTimer);
      };
    }
  }, []);

  useEffect(() => {
    mensajesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes, isOpen]);

  const getDireccionActual = () => {
    if (!profile || !profile.direcciones || profile.direcciones.length === 0) {
      return null;
    }
    const selectedAddressId = sessionStorage.getItem('selectedAddressId');
    const direccionSeleccionada = profile.direcciones.find((d) => d.id === selectedAddressId);
    return direccionSeleccionada || profile.direcciones[0];
  };

  const handleAbrir = () => {
    setIsOpen((prev) => {
        const nuevo = !prev;
        sessionStorage.setItem('chatbotAbierto', String(nuevo));
        return nuevo;
    });
    setShowTooltip(false);
    sessionStorage.setItem('chatbotTooltipVisto', 'true');
    };

  const handleCerrarTooltip = (e) => {
    e.stopPropagation();
    setShowTooltip(false);
    sessionStorage.setItem('chatbotTooltipVisto', 'true');
  };

  const handleEnviar = async (e) => {
    e.preventDefault();
    const mensajeTexto = input.trim();
    if (!mensajeTexto || isLoading) return;

    const direccion = getDireccionActual();
    if (!direccion || !direccion.localidad || !direccion.provincia) {
      setMensajes((prev) => [
        ...prev,
        { rol: 'user', texto: mensajeTexto, productos: [] },
        {
          rol: 'assistant',
          texto: 'Necesito que tengas una dirección cargada para poder recomendarte productos de tu zona.',
          productos: [],
        },
      ]);
      setInput('');
      return;
    }

    setMensajes((prev) => [...prev, { rol: 'user', texto: mensajeTexto, productos: [] }]);
    setInput('');
    setIsLoading(true);

    const token = sessionStorage.getItem('token');

    try {
      const response = await fetch('/iaMs/ia/chat/recomendar', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mensaje: mensajeTexto,
          provincia: direccion.provincia,
          localidad: direccion.localidad,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setMensajes((prev) => [
          ...prev,
          { rol: 'assistant', texto: data.mensaje, productos: data.productosRecomendados || [] },
        ]);
      } else {
        setMensajes((prev) => [
          ...prev,
          { rol: 'assistant', texto: 'No pude generar una recomendación en este momento. Probá de nuevo en un rato.', productos: [] },
        ]);
      }
    } catch (error) {
      console.error('Error en chat IA:', error);
      setMensajes((prev) => [
        ...prev,
        { rol: 'assistant', texto: 'No pude conectarme con el asistente. Revisá tu conexión.', productos: [] },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {showTooltip && !isOpen && (
        <div className={styles.tooltip}>
          <button className={styles.tooltipClose} onClick={handleCerrarTooltip} aria-label="Cerrar">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <p className={styles.tooltipText}>
            ¡Hola! Soy tu asistente 🤖 Contame qué se te antoja y te recomiendo productos de tu zona.
          </p>
          <div className={styles.tooltipArrow}></div>
        </div>
      )}

      <button
        className={styles.bubbleButton}
        onClick={handleAbrir}
        aria-label="Abrir asistente"
      >
        {isOpen ? (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
            <path d="M12 2C6.48 2 2 6.02 2 11c0 2.61 1.28 4.95 3.29 6.62-.11 1.1-.62 2.7-1.99 4.13a.5.5 0 00.44.85c2.24-.5 3.9-1.55 4.85-2.35A11.4 11.4 0 0012 20.5c5.52 0 10-4.02 10-9S17.52 2 12 2z" />
          </svg>
        )}
      </button>

      {isOpen && (
        <div className={styles.chatPanel}>
          <div className={styles.chatHeader}>
            <div className={styles.chatHeaderIcon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M12 2C6.48 2 2 6.02 2 11c0 2.61 1.28 4.95 3.29 6.62-.11 1.1-.62 2.7-1.99 4.13a.5.5 0 00.44.85c2.24-.5 3.9-1.55 4.85-2.35A11.4 11.4 0 0012 20.5c5.52 0 10-4.02 10-9S17.52 2 12 2z" />
              </svg>
              <span>Asistente PediloYa</span>
            </div>
          </div>

          <div className={styles.chatMessages}>
            {mensajes.map((m, i) => (
              <div key={i} className={m.rol === 'user' ? styles.msgUserWrapper : styles.msgAssistantWrapper}>
                <div className={m.rol === 'user' ? styles.msgUser : styles.msgAssistant}>
                  {m.texto}
                </div>

                {m.productos && m.productos.length > 0 && (
                  <div className={styles.productosGrid}>
                    {m.productos.map((p) => (
                      <Link
                        key={p.id}
                        href={`/cliente/local/${p.idVendedor}?q=${encodeURIComponent(p.nombre)}`}
                        className={styles.productoCard}
                        onClick={() => setIsOpen(false)}
                      >
                        <div className={styles.productoImagen}>
                          {p.imagen ? (
                            <img src={p.imagen} alt={p.nombre} />
                          ) : (
                            <div className={styles.productoImagenPlaceholder}>Sin imagen</div>
                          )}
                        </div>
                        <div className={styles.productoInfo}>
                          <p className={styles.productoNombre}>{p.nombre}</p>
                          <p className={styles.productoVendedor}>{p.nombreVendedor}</p>
                          <p className={styles.productoPrecio}>$ {p.precio}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className={styles.msgAssistantWrapper}>
                <div className={styles.msgAssistant}>
                  <span className={styles.typingDot}></span>
                  <span className={styles.typingDot}></span>
                  <span className={styles.typingDot}></span>
                </div>
              </div>
            )}

            <div ref={mensajesEndRef} />
          </div>

          <form className={styles.chatInputForm} onSubmit={handleEnviar}>
            <input
              type="text"
              className={styles.chatInput}
              placeholder="¿Qué se te antoja hoy?"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
            />
            <button type="submit" className={styles.chatSendBtn} disabled={isLoading || !input.trim()}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
}