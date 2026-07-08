"use client"

import { useEffect, useRef, useState, useCallback } from "react";
import styles from "./vendedor.module.css"
import VendedorNavbar from "./components/vendedor-navbar"
import LoadingScreen from "../../components/loading-screen"

const renderStars = (rating = 0) => {
  const stars = [];
  const rounded = Math.round(rating * 2) / 2;
  for (let i = 1; i <= 5; i++) {
    if (rounded >= i) stars.push("full");
    else if (rounded >= i - 0.5) stars.push("half");
    else stars.push("empty");
  }
  return stars;
};

const Star = ({ fill, index, size = 14 }) => {
  const gradId = `star-grad-${index}`;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      {fill === "half" && (
        <defs>
          <linearGradient id={gradId} x1="0" x2="100%" y1="0" y2="0">
            <stop offset="50%" stopColor="#FFB800" />
            <stop offset="50%" stopColor="#e5e7eb" />
          </linearGradient>
        </defs>
      )}
      <polygon
        points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
        fill={fill === "full" ? "#FFB800" : fill === "half" ? `url(#${gradId})` : "#e5e7eb"}
      />
    </svg>
  );
};

export default function VendedorPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isProfileComplete, setIsProfileComplete] = useState(false)
  const [vendedorProfile, setVendedorProfile] = useState(null);
  const [contadores, setContadores] = useState({ pendientes: 0, preparacion: 0, entregados: 0 });

  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const productsRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem("token")
    const rol = sessionStorage.getItem("rol")

    if (!token || rol !== "VENDEDOR") {
      window.location.href = "/login"
      return
    }

   const fetchPerfil = async () => {
      try {
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        const [perfilRes, productosRes] = await Promise.all([
            fetch('/catalogoMs/api/vendedores/perfil', { method: 'GET', headers }),
            fetch('/catalogoMs/api/vendedores/productos', { method: 'GET', headers })
        ]);

        if (perfilRes.status === 401 || perfilRes.status === 403) {
            sessionStorage.clear(); 
            window.location.href = "/login?expired=true"; 
            return;
        }

        if (perfilRes.ok) {
            const dataPerfil = await perfilRes.json();
    
            if (productosRes.ok) {
                const dataProductos = await productosRes.json();
                setVendedorProfile({ ...dataPerfil, productos: dataProductos });
            } else {
                setVendedorProfile(dataPerfil);
            }
            setIsProfileComplete(dataPerfil.estado === "ACTIVO");
          
        } else {
            console.error("Error al obtener perfil del vendedor");
            setIsProfileComplete(false);
        }

      } catch (error) {
        console.error("Error de red:", error);
      } finally {
        setIsLoading(false)
      }
    }

    fetchPerfil();

  }, [])

  const fetchContadores = useCallback(async () => {
      if (!isProfileComplete) return;
      
      try {
        const token = sessionStorage.getItem("token");
        if (!token) return;

        const res = await fetch("/pedidoMs/pedidos/vendedor/contadores", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (res.ok) {
          const data = await res.json();
          setContadores({
            pendientes: data.pendientes || 0,
            preparacion: data.preparacion || 0,
            entregados: data.entregados || 0,
          });
        }
      } catch (error) {
        console.error("Error fetching counters:", error);
      }
    }, [isProfileComplete]);

  useEffect(() => {
    fetchContadores();
    // Actualizar cada 30 segundos
    const interval = setInterval(fetchContadores, 30000);

    return () => clearInterval(interval);
  }, [fetchContadores])

  const handleLogout = () => {
    sessionStorage.clear()
    window.location.href = "/login"
  }

  const handleNavigate = (path) => {
    window.location.href = path
  }

  // FUNCION PARA CARRUSSEL DE PRODUCTOS
  const checkScroll = () => {
    const el = productsRef.current;
    if (!el) return;

    const hasOverflow = el.scrollWidth > el.clientWidth;

    setCanScrollLeft(hasOverflow && el.scrollLeft > 0);
    setCanScrollRight(hasOverflow && el.scrollLeft + el.clientWidth < el.scrollWidth);
  };

  useEffect(() => {
    const el = productsRef.current;
    if (!el) return;

    const handleCheck = () => {
      checkScroll();
    };

    const resizeObserver = new ResizeObserver(() => {
      handleCheck();
    });

    resizeObserver.observe(el);

    el.addEventListener("scroll", handleCheck);
    window.addEventListener("resize", handleCheck);
    requestAnimationFrame(handleCheck);

    return () => {
      resizeObserver.disconnect();
      el.removeEventListener("scroll", handleCheck);
      window.removeEventListener("resize", handleCheck);
    };
  }, [vendedorProfile]);

  const scrollLeft = () => {
    productsRef.current.scrollBy({ left: -300, behavior: "smooth" });
  };

  const scrollRight = () => {
    productsRef.current.scrollBy({ left: 300, behavior: "smooth" });
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(`.${styles.navbarIconWrapper}`)) {
        setShowNotifications(false)
        setShowUserMenu(false)
      }
    }
    document.addEventListener("click", handleClickOutside)
    return () => document.removeEventListener("click", handleClickOutside)
  }, [])

  if (isLoading) {
    return <LoadingScreen text="Cargando tu negocio..." />
  }

  return (
    <div className={styles.pageWrapper}>
      <VendedorNavbar profile={vendedorProfile} onNotificationReceived={fetchContadores} />

      {/* ========== HERO SECTION ========== */}
      <section className={`${styles.hero} ${!isProfileComplete ? styles.heroIncomplete : ""}`}
        style={{
            backgroundImage: vendedorProfile?.banner ? `url(${vendedorProfile.banner})` : undefined,
            backgroundSize: vendedorProfile?.banner ? 'cover' : undefined,
            backgroundPosition: vendedorProfile?.banner ? 'center' : undefined,
          }}
        >
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>{vendedorProfile?.nombreNegocio || "Mi Negocio"}</h1>
          {!isProfileComplete && (
            <>
              <h2 className={styles.heroSubtitle}>¡Estás a un paso de empezar a vender!</h2>
              <p className={styles.heroDescription}>
                Para que tu local sea visible en la app y puedas recibir pedidos, necesitamos que termines de configurar
                tu cuenta. Completa tu perfil ahora para activar tu tienda.
              </p>
              <button className={styles.heroButton} onClick={() => handleNavigate("/vendedor/perfil")}>
                <span className={styles.heroButtonText}>
                  Completar el perfil
                </span>
              </button>
            </>
          )}
        </div>
      </section>

      <main className={styles.mainContent}>
        {/* ========== CALIFICACIÓN ========== */}
        <section className={styles.calificacionWrapper}>
          <div className={styles.calificacionCard}>
            <p className={styles.calificacionLabel}>Calificación</p>
            <p className={styles.calificacionValue}>
              {(vendedorProfile?.calificacionPromedio || 0).toFixed(1)}
            </p>
            <div className={styles.calificacionStars}>
              {renderStars(vendedorProfile?.calificacionPromedio || 0).map((fill, i) => (
                <Star key={i} index={i} fill={fill} size={20} />
              ))}
            </div>
            <p className={styles.calificacionCount}>
              {vendedorProfile?.cantidadCalificaciones || 0} calificaciones
            </p>
          </div>
        </section>
        {/* ========== MIS PRODUCTOS ========== */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>MIS PRODUCTOS</h2>
            <div className={styles.carouselNav}>
              <button className={styles.carouselButton} onClick={scrollLeft} disabled={!canScrollLeft}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                </svg>
              </button>
              <button
                className={styles.carouselButton} onClick={scrollRight} disabled={!canScrollRight}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                </svg>
              </button>
            </div>
          </div>

          <div className={styles.productsGrid} ref={productsRef}>
            {vendedorProfile?.productos && vendedorProfile.productos.length > 0 ? (
              vendedorProfile.productos.map((prod) => (
                <div className={styles.productCard} key={prod.id}>
                  <div className={styles.productInfo}>
                    <h3 className={styles.productTitle}>{prod.nombre}</h3>
                    <p className={styles.productDescription}>
                      {prod.descripcion}
                    </p>
                  </div>
                  <div className={styles.productRight}>
                    <div className={styles.productImageWrapper}>
                      {prod.imagen ? (
                        <img 
                          src={prod.imagen} 
                          alt={prod.nombre} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        />
                      ) : (
                        // Fallback si el producto no tiene imagen
                        <div style={{width: '100%', height: '100%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="#ccc"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
                        </div>
                      )}
                    </div>
                    <p className={styles.productPrice}>$ {prod.precio}</p>
                  </div>
                </div>
              ))
              ) : (
                // PLACEHOLDER (Se muestra si no hay productos)
                <div className={styles.productCardPlaceholder}>
                    <div className={styles.productInfo}>
                        <h3 className={styles.placeholderTitle}>Añadí un producto a tu catálogo</h3>
                        <p className={styles.placeholderSubtitle}>
                            descripción del producto
                        </p>
                    </div>
                    <div className={styles.productRight}>
                        <div className={styles.placeholderIcon}>
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="#d1d5db">
                                <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                            </svg>
                        </div>
                        <p className={styles.placeholderPrice}>$ precio</p>
                    </div>
                </div>
            )}
          </div>
            
          <button
            className={`${styles.addButton} ${!isProfileComplete ? styles.addButtonDisabled : ""}`}
            onClick={() => isProfileComplete && handleNavigate("/vendedor/productos")}
            disabled={!isProfileComplete}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
            </svg>
            Añadir producto
          </button>
        </section>

        {/* ========== PEDIDOS ========== */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>PEDIDOS</h2>
            <p className={styles.sectionSubtitle}>{new Date().toLocaleDateString("es-AR")}</p>
          </div>

          <div className={styles.ordersGrid}>
            <div
              className={`${styles.orderCard} ${styles.orderCardPending} ${!isProfileComplete ? styles.orderCardDisabled : ""}`}
            >
              <span className={styles.orderLabel}>PENDIENTES</span>
              <span className={styles.orderCount}>{contadores.pendientes}</span>
            </div>
            <div
              className={`${styles.orderCard} ${styles.orderCardPrep} ${!isProfileComplete ? styles.orderCardDisabled : ""}`}
            >
              <span className={styles.orderLabel}>EN PREPARACIÓN</span>
              <span className={styles.orderCount}>{contadores.preparacion}</span>
            </div>
            <div
              className={`${styles.orderCard} ${styles.orderCardDelivered} ${!isProfileComplete ? styles.orderCardDisabled : ""}`}
            >
              <span className={styles.orderLabel}>ENTREGADOS</span>
              <span className={styles.orderCount}>{contadores.entregados}</span>
            </div>
          </div>

          <button
            className={`${styles.addButton} ${!isProfileComplete ? styles.addButtonDisabled : ""}`}
            onClick={() => isProfileComplete && handleNavigate("/vendedor/pedidos")}
            disabled={!isProfileComplete}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
            </svg>
            Ver pedidos
          </button>
        </section>

        {/* ========== CUPONES ========== */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              CUPONES DE DESCUENTO
              <span className={styles.comingSoon}>Próximamente</span>
              </h2>
            <div className={styles.carouselNav}>
              <button className={styles.carouselButton} disabled>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                </svg>
              </button>
              <button className={styles.carouselButton} disabled>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                </svg>
              </button>
            </div>
          </div>

          <div className={styles.couponsContainer}>
            {/*{isProfileComplete ? (
              <div className={styles.couponCard}>
                <div className={styles.couponIcon}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="#ff4b7e">
                    <path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z" />
                  </svg>
                </div>
                <div className={styles.couponInfo}>
                  <h3 className={styles.couponTitle}>10% OFF en McFlurry</h3>
                  <p className={styles.couponExpiry}>
                    Vence el 31 de enero
                  </p>
                </div>
                <button className={styles.couponBadge}>Desactivar</button>
              </div>
              ) : (*/}
              <div className={styles.couponCardPlaceholder}>
                <div className={styles.couponIcon}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="#d1d5db">
                    <path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z" />
                  </svg>
                </div>
                <div className={styles.couponInfo}>
                  <h3 className={styles.couponTitle}>Añadi un cupón de descuento</h3>
                  <p className={styles.couponExpiry}>
                    Fecha de vencimiento
                  </p>
                </div>
                <button className={styles.couponBadgeDisabled}>Activar</button>
              </div>
           {/*} )}*/}
          </div>

          <button className={`${styles.addButton} ${styles.addButtonDisabled}`} disabled>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
            </svg>
            Añadir cupón
          </button>
        </section>
      </main>

      {/* ========== FOOTER ========== */}
      <footer className={styles.footer}>
        <div className={`${styles.container} ${styles.footerInner}`}>
          <p className={styles.footerText}>PediloYa © 2026. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  )
}
