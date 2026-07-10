"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "../detalle-pedido.module.css";
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import ChatbotFlotante from '../../components/ChatbotFlotante';
import LoadingScreen from '../../../../components/loading-screen';


export default function DetallePedidoPage({ params }) {
  const resolvedParams = use(params);
  const id = resolvedParams.idPedido || resolvedParams.id;

  const [clientProfile, setClientProfile] = useState(null);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const extractEstadoFromMensaje = (mensaje = "") => {
    const match = mensaje.match(/\b(REALIZADO|ACEPTADO|RECHAZADO|EN_PREPARACION|EN_ESPERA|EN_ENVIO|ENTREGADO|CANCELADO|PENDIENTE)\b/i);
    return match ? match[1].toUpperCase() : null;
  };

  useEffect(() => {
    fetchPerfil();
    if (id) {
      fetchDetallePedido();
    }
  }, [id]);

  const fetchPerfil = async () => {
    const token = sessionStorage.getItem("token");
    const rol = sessionStorage.getItem("rol");

    if (!token || rol !== "CLIENTE") {
      window.location.href = "/login";
      return;
    }
    try {
      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      const res = await fetch("/pedidoMs/clientes/perfil", {
        method: "GET",
        headers,
      });

      if (res.status === 401 || res.status === 403) {
        sessionStorage.clear();
        window.location.href = "/login?expired=true";
        return;
      }

      if (res.ok) {
        const dataPerfil = await res.json();
        setClientProfile(dataPerfil);
      }
    } catch (error) {
      console.error("Error de red:", error);
    }
  };

  const fetchDetallePedido = async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }
    try {
      const token = sessionStorage.getItem("token");
      if (!token) return;

      const res = await fetch(`/pedidoMs/pedidos/detalle-pedido/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setOrder(data);
      }
    } catch (error) {
      console.error("Error fetching order:", error);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const handleRefreshProfile = () => {
    fetchPerfil();
  };

  const handleNotificationReceived = (notificacion) => {
    const pedidoId = notificacion?.pedidoId;
    const nuevoEstado = extractEstadoFromMensaje(notificacion?.mensaje || "");

    if (pedidoId && nuevoEstado && order?.id === pedidoId) {
      setOrder((prev) => (prev ? { ...prev, estado: nuevoEstado } : prev));
    }

    if (id) {
      setTimeout(() => {
        fetchDetallePedido(true);
      }, 450);
    }
  };

  if (loading) {
    return <LoadingScreen text="Cargando detalle del pedido..." />;
  }

  if (!order) {
    return (
      <div className={styles.page}>
        <Navbar
          profile={clientProfile}
          onAddressUpdate={handleRefreshProfile}
          onNotificationReceived={handleNotificationReceived}
        />
        <main className={styles.main}>
          <div style={{ textAlign: "center", color: "#666", marginTop: "40px" }}>
            Pedido no encontrado.
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const isDelivery = order.metodoEnvio === 'ENVIO_A_DOMICILIO';

  const timelineSteps = isDelivery
    ? [
        "Pedido realizado",
        "Pedido en preparación",
        "Pedido en espera de envío",
        "Pedido en envío",
        "Pedido entregado",
      ]
    : [
        "Pedido realizado",
        "Pedido en preparación",
        "Listo para retirar",
        "Pedido entregado",
      ];

  const getStatusStep = (status) => {
    if (!status) return 0;
    const s = status.toUpperCase();
    
    if (s === 'PENDIENTE' || s === 'REALIZADO' || s === 'ACEPTADO') return 0;
    if (s === 'EN_PREPARACION') return 1;
    
    if (isDelivery) {
      if (s === 'EN_ESPERA') return 2;
      if (s === 'EN_ENVIO') return 3;
      if (s === 'ENTREGADO') return 4;
    } else {
      if (s === 'EN_ESPERA') return 2;
      if (s === 'ENTREGADO') return 3;
    }
    return 0;
  };

  const currentStep = getStatusStep(order.estado);

  return (
    <div className={styles.page}>
      <Navbar
        profile={clientProfile}
        onAddressUpdate={handleRefreshProfile}
        onNotificationReceived={handleNotificationReceived}
      />
      
      <main className={styles.main}>
        <div className={styles.header}>
          <Link
            href="/cliente/pedidos"
            className={styles.backBtn}
            aria-label="Volver"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
            </svg>
          </Link>
          <h1 className={styles.title}>
            Detalle del Pedido <span className={styles.orderId}>#{order.id}</span>
          </h1>
        </div>

        <div className={styles.twoCol}>
          {/* Left Column */}
          <div className={styles.leftCol}>
            {/* Order Info */}
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Información del pedido</h2>
              <div className={styles.infoBox}>
                <p className={styles.infoLine}>
                  <span className={styles.infoLabel}>Número de pedido:</span>{" "}
                  {order.id}
                </p>
                <p className={styles.infoLine}>
                  <span className={styles.infoLabel}>Fecha de realización:</span>{" "}
                  {order.fechaCreacion ? new Date(order.fechaCreacion).toLocaleDateString() : '-'}
                </p>
                <p className={styles.infoLine}>
                  <span className={styles.infoLabel}>Nombre del cliente:</span>{" "}
                  {order.cliente ? `${order.cliente.nombre} ${order.cliente.apellido}` : '-'}
                </p>
                <p className={styles.infoLine}>
                  <span className={styles.infoLabel}>Teléfono:</span>{" "}
                  {order.cliente?.telefono || '-'}
                </p>
                <p className={styles.infoLine}>
                  <span className={styles.infoLabel}>Email:</span>{" "}
                  {order.cliente?.email || '-'}
                </p>
                <p className={styles.infoLine}>
                  <span className={styles.infoLabel}>Nombre del local:</span>{" "}
                  {order.nombreLocal || "Vendedor"}
                </p>
                <p className={styles.infoLine}>
                  <span className={styles.infoLabel}>Importe total:</span>{" "}
                  ${order.montoTotal?.toLocaleString("es-AR")}
                </p>
              </div>
            </div>

            {/* Shipping Info */}
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Información del envío</h2>
              <div className={styles.shippingGrid}>
                <div className={styles.shippingLabel}>Dirección de envío</div>
                <div className={styles.shippingValue}>
                  {isDelivery && order.cliente?.direcciones?.[0]?.calle ? (
                    <>
                      <p className={styles.shippingName}>
                        {`${order.cliente.nombre} ${order.cliente.apellido}`}
                      </p>
                      <p>
                        {order.cliente.direcciones[0].calle} {order.cliente.direcciones[0].numero}, {order.cliente.direcciones[0].localidad}, {order.cliente.direcciones[0].provincia}
                      </p>
                      <p>{order.cliente.telefono}</p>
                    </>
                  ) : (
                    <p style={{ margin: 0 }}>Retiro en local</p>
                  )}
                </div>
              </div>
            </div>

            {/* Products */}
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Productos</h2>
              {order.detalles && order.detalles.map((item, idx) => (
                <div key={idx} className={styles.productRow}>
                  {item.imagen ? (
                    <Image
                      src={item.imagen}
                      alt={item.nombreProducto || "Producto"}
                      width={56}
                      height={56}
                      className={styles.productImage}
                    />
                  ) : (
                    <div className={styles.productImagePlaceholder}>
                      <span>IMG</span>
                    </div>
                  )}
                  <div className={styles.productInfo}>
                    <p className={styles.productName}>
                      {item.cantidad} x {item.nombreProducto || item.productoId || "Producto"}
                    </p>
                    {item.observaciones ? (
                      <p className={styles.productObs}>
                        Observaciones: {item.observaciones}
                      </p>
                    ) : (
                      <p className={styles.productObs}>Sin observaciones</p>
                    )}
                  </div>
                  <span className={styles.productPrice}>
                    $ {item.subtotal?.toLocaleString("es-AR")}
                  </span>
                </div>
              ))}
            </div>

            {/* Status Timeline */}
            <div className={styles.timelineCard}>
              <h2 className={styles.timelineTitle}>Estado del pedido</h2>
              <div className={styles.timeline}>
                {timelineSteps.map((step, idx) => {
                  const isCompleted = idx < currentStep;
                  const isCurrent = idx === currentStep;
                  const isActive = isCompleted || isCurrent;

                  const segmentClass = isCompleted
                    ? styles.timelineSegmentCompleted
                    : isCurrent
                    ? styles.timelineSegmentCurrent
                    : "";

                  return (
                    <div key={idx} className={styles.timelineStep}>
                      <div className={`${styles.timelineSegment} ${segmentClass}`} />
                      <div className={styles.timelineStepInfo}>
                        <div
                          className={`${styles.timelineDot} ${
                            isCompleted ? styles.timelineDotCompleted : ""
                          } ${
                            isCurrent ? styles.timelineDotActive + " " + styles.timelineDotCurrent : ""
                          }`}
                        >
                          {isCompleted && (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                          )}
                        </div>
                        <span
                          className={`${styles.timelineStepLabel} ${isActive ? styles.timelineStepLabelActive : ""}`}
                        >
                          {step}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column - Summary */}
          <div className={styles.rightCol}>
            <div className={styles.summaryCard}>
              <h2 className={styles.summaryTitle}>Resumen de compra</h2>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>
                  Productos
                </span>
                <span className={styles.summaryValue}>
                  ${order.montoTotalProductos?.toLocaleString("es-AR")}
                </span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Costo de envío</span>
                <span className={styles.summaryValue}>
                  ${order.costoEnvio?.toLocaleString("es-AR")}
                </span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Tarifa de servicio</span>
                <span className={styles.summaryValue}>
                  ${order.comisionApp?.toLocaleString("es-AR")}
                </span>
              </div>
              <hr className={styles.summaryDivider} />
              <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
                <span className={styles.summaryLabel}>Total</span>
                <span className={styles.summaryValue}>
                  ${order.montoTotal?.toLocaleString("es-AR")}
                </span>
              </div>
              {/* Botón de cancelar solo si está en etapas tempranas, opcional */}
              {/* <button className={styles.cancelBtn}>Cancelar pedido</button> */}
            </div>
          </div>
        </div>
      </main>
      <ChatbotFlotante profile={clientProfile} />
      <Footer />
    </div>
  );
}
