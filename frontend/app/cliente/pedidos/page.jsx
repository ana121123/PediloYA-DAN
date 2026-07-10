"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "./pedidos.module.css";
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import ChatbotFlotante from '../components/ChatbotFlotante';
import LoadingScreen from '../../../components/loading-screen';

const STATUS_FILTERS = ["Entregados", "Cancelados"];
const PERIOD_FILTERS = [
  "Ultima semana",
  "Ultimos 15 dias",
  "Ultimos 30 dias",
  "Ultimos 3 meses",
  "Ultimos 6 meses",
];

export default function MisPedidosPage() {
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [clientProfile, setClientProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const extractEstadoFromMensaje = (mensaje = "") => {
    const match = mensaje.match(/\b(REALIZADO|ACEPTADO|RECHAZADO|EN_PREPARACION|EN_ESPERA|EN_ENVIO|ENTREGADO|CANCELADO|PENDIENTE)\b/i);
    return match ? match[1].toUpperCase() : null;
  };

  useEffect(() => {
    fetchPerfil();
    fetchPedidos();
  }, [selectedStatus, selectedPeriod]);

  const fetchPerfil = async () => {
      const token = sessionStorage.getItem("token")
      const rol = sessionStorage.getItem("rol")
  
      if (!token || rol !== "CLIENTE") {
        window.location.href = "/login"
        return
      }
        try {
          const headers = {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
          };
  
          const [perfilRes] = await Promise.all([
              fetch('/pedidoMs/clientes/perfil', { method: 'GET', headers }),
          ]);
  
          if (perfilRes.status === 401 || perfilRes.status === 403) {
              sessionStorage.clear(); 
              window.location.href = "/login?expired=true"; 
              return;
          }
  
          if (perfilRes.ok) {
              const dataPerfil = await perfilRes.json();
              setClientProfile(dataPerfil);
          } else {
              console.error("Error al obtener perfil del cliente");
          }
  
        } catch (error) {
          console.error("Error de red:", error);
        } 
  }

  const fetchPedidos = async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }
    try {
      const token = sessionStorage.getItem("token");
      if (!token) return;

      const params = new URLSearchParams();
      
      
      if (selectedStatus) {
        const statusMap = { "Entregados": "ENTREGADO", "Cancelados": "CANCELADO" };
        if (statusMap[selectedStatus]) params.append("filtroEstado", statusMap[selectedStatus]);
      }
      
      if (selectedPeriod) {
        const periodMap = {
          "Ultima semana": "SEMANA",
          "Ultimos 15 dias": "15_DIAS",
          "Ultimos 30 dias": "1_MES",
          "Ultimos 3 meses": "3_MESES",
          "Ultimos 6 meses": "6_MESES"
        };
        if (periodMap[selectedPeriod]) params.append("filtroPeriodo", periodMap[selectedPeriod]);
      }

      const res = await fetch(`/pedidoMs/pedidos/listado-pedidos?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const activeFilterCount =
    (selectedStatus ? 1 : 0) + (selectedPeriod ? 1 : 0);

  function handleClear() {
    setSelectedStatus(null);
    setSelectedPeriod(null);
  }

  function handleApply() {
    setShowFilters(false);
  }

  const getStatusClass = (status) => {
    if (!status) return styles.statusEnEspera;
    const s = status.toUpperCase();
    
    switch(s) {
      case 'ENTREGADO': 
        return styles.statusEntregado;
      case 'REALIZADO':
      case 'ACEPTADO': 
        return styles.statusRealizado;
      case 'RECHAZADO':
      case 'CANCELADO': 
        return styles.statusCancelado;
      case 'EN_PREPARACION':
      case 'EN_ENVIO': 
        return styles.statusEnCurso;
      case 'EN_ESPERA':
      default: 
        return styles.statusEnEspera;
    }
  };

  const handleRefreshProfile = () => {
    fetchPerfil();
  };

  const handleNotificationReceived = (notificacion) => {
    const pedidoId = notificacion?.pedidoId;
    const nuevoEstado = extractEstadoFromMensaje(notificacion?.mensaje || "");

    if (pedidoId && nuevoEstado) {
      setOrders((prev) =>
        prev.map((order) =>
          order.id === pedidoId ? { ...order, estado: nuevoEstado } : order
        )
      );
    }

    setTimeout(() => {
      fetchPedidos(true);
    }, 450);
  };

  if (loading) {
    return <LoadingScreen text="Cargando pedidos..." />;
  }

  return (
    <div className={styles.page}>
      <Navbar
        profile={clientProfile}
        onAddressUpdate={handleRefreshProfile}
        onNotificationReceived={handleNotificationReceived}
      />
      
      <main className={styles.main}>
        <div className={styles.header}>
          <Link href="/cliente" className={styles.backBtn} aria-label="Volver">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
            </svg>
          </Link>
          <h1 className={styles.title}>Mis Pedidos</h1>
        </div>

        <div className={styles.filterBar}>
          <button
            className={styles.filterBtn}
            onClick={() => setShowFilters(true)}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"
              fill="#ff4b7e"
              />
            </svg>
            Filtrar por...
          </button>
        </div>

        {orders.length === 0 ? (
          <div style={{textAlign: 'center', padding: '2rem', color: '#666'}}>No se encontraron pedidos.</div>
        ) : (
          <div className={styles.orderList}>
            {orders.map((order) => (
              <div key={order.id} className={styles.orderCard} style={{ alignItems: 'stretch' }}>
                <div className={styles.vendorLogoWrapper}>
                  {order.logo ? (
                    <Image
                      src={order.logo}
                      alt={order.nombreLocal || "Vendedor"}
                      width={64}
                      height={64}
                      className={styles.vendorLogo}
                    />
                  ) : (
                    <div className={styles.vendorLogoPlaceholder}>
                      Sin imagen
                    </div>
                  )}
                </div>
                
                {/*<div className={styles.orderInfo}>
                  <span
                    className={`${styles.statusBadge} ${getStatusClass(order.estado)}`}
                  >
                    {order.estado ? order.estado.replace(/_/g, ' ') : 'DESCONOCIDO'}
                  </span>
                  <p className={styles.vendorName}>{order.nombreLocal}</p>
                  <p className={styles.orderMeta}>
                    {order.cantidadProductos || 0} producto{(order.cantidadProductos !== 1) ? "s" : ""}
                  </p>
                  <p className={styles.orderMeta}>
                    Fecha de realización: {order.fechaCreacion ? new Date(order.fechaCreacion).toLocaleDateString() : '-'}
                  </p>
                </div>*/}
                
                <div className={styles.orderInfo}>
                  {/* El badge ahora es lo primero que el ojo lee para saber el éxito de la operación */}
                  <div className={`${styles.statusBadge} ${getStatusClass(order.estado)}`}>
                    <span className={styles.statusDot}>●</span>
                    {order.estado ? order.estado.replace(/_/g, ' ') : 'PENDIENTE'}
                  </div>
                  
                  <p className={styles.vendorName}>{order.nombreLocal}</p>
                  <p className={styles.orderMeta}>
                    {order.cantidadProductos || 0} producto{(order.cantidadProductos !== 1) ? "s" : ""}
                  </p>
                  <p className={styles.orderMeta}>
                    Fecha de realización: {order.fechaCreacion ? new Date(order.fechaCreacion).toLocaleDateString() : '-'}
                  </p>
                </div>

                <div className={styles.orderRight} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div></div>
                  <p className={styles.orderTotal}>
                    ${order.montoTotal ? order.montoTotal.toLocaleString("es-AR") : "0"}
                  </p>
                  <Link
                    href={`/cliente/detalle-pedido/${order.id}`}
                    className={styles.detailLink}
                  >
                    ver detalle del pedido {order.id}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {showFilters && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowFilters(false)}
        >
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                Filtros ({activeFilterCount})
              </h2>
              <button
                className={styles.modalCloseBtn}
                onClick={() => setShowFilters(false)}
                aria-label="Cerrar filtros"
              >
                &times;
              </button>
            </div>

            <div className={styles.filterSection}>
              <div className={styles.filterSectionHeader}>
                <h3 className={styles.filterSectionTitle}>Estado</h3>
                <button className={styles.collapseBtn} aria-label="Colapsar">
                  &minus;
                </button>
              </div>
              <ul className={styles.radioList}>
                {STATUS_FILTERS.map((s) => (
                  <li
                    key={s}
                    className={styles.radioItem}
                    onClick={() =>
                      setSelectedStatus(selectedStatus === s ? null : s)
                    }
                  >
                    <span
                      className={`${styles.radioCircle} ${selectedStatus === s ? styles.selected : ""}`}
                    />
                    <span className={styles.radioLabel}>{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className={styles.filterSection}>
              <div className={styles.filterSectionHeader}>
                <h3 className={styles.filterSectionTitle}>Periodo</h3>
                <button className={styles.collapseBtn} aria-label="Colapsar">
                  &minus;
                </button>
              </div>
              <ul className={styles.radioList}>
                {PERIOD_FILTERS.map((p) => (
                  <li
                    key={p}
                    className={styles.radioItem}
                    onClick={() =>
                      setSelectedPeriod(selectedPeriod === p ? null : p)
                    }
                  >
                    <span
                      className={`${styles.radioCircle} ${selectedPeriod === p ? styles.selected : ""}`}
                    />
                    <span className={styles.radioLabel}>{p}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className={styles.modalActions}>
              <button className={styles.applyBtn} onClick={handleApply}>
                Aplicar
              </button>
              <button className={styles.clearBtn} onClick={handleClear}>
                Limpiar filtros
              </button>
            </div>
          </div>
        </div>
        )}
      </main>
      <ChatbotFlotante profile={clientProfile} />
      <Footer />
    </div>
  );
}
