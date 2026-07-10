'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ChatbotFlotante from './components/ChatbotFlotante';
import LoadingScreen from '../../components/loading-screen';
import { useAppDialog } from '../../components/ui/app-dialog';
import styles from './cliente.module.css';

const categories = [
  { name: 'Hamburguesa', img: '/cliente/hamburguesa.png' },
  { name: 'Ensalada', img: '/cliente/ensalada.png' },
  { name: 'Gaseosa', img: '/cliente/gaseosa.png' },
  { name: 'Pizza', img: '/cliente/pizza.png' },
  { name: 'Helado', img: '/cliente/helado.png' },
  { name: 'Vino', img: '/cliente/vino.png' },
  { name: 'Cafe', img: '/cliente/cafe.png' },
  { name: 'Papas', img: '/cliente/papas.png' },
  { name: 'Pasta', img: '/cliente/pasta.png' },
  { name: 'Sushi', img: '/cliente/sushi.png' },
];

export default function ClienteHome() {
  const { showAlert } = useAppDialog();
  const [clientProfile, setClientProfile] = useState(null);
  const [stores, setStores] = useState([]);
  const localesRef = useRef(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [loadingStores, setLoadingStores] = useState(true);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  //const [ubicacionActiva, setUbicacionActiva] = useState("Santa Fe, Santa Fe");
  const [ubicacionData, setUbicacionData] = useState({
    localidad: "Santa Fe",
    provincia: "Santa Fe"
  });

  useEffect(() => {
    fetchPerfil();
  }, [])

  useEffect(() => {
    const actualizarUbicacion = () => {
      const selectedId = sessionStorage.getItem("selectedAddressId");
      
      if (selectedId && clientProfile?.direcciones) {
        const dir = clientProfile.direcciones.find(d => String(d.id) === String(selectedId));
        if (dir) {
          setUbicacionData({ localidad: dir.localidad, provincia: dir.provincia });
          return;
        }
      } 
    
      if (clientProfile?.direcciones?.length > 0) {
        const principal = clientProfile.direcciones[0]; 
        setUbicacionData({ localidad: principal.localidad, provincia: principal.provincia });
      } else {
        setUbicacionData({ localidad: "Santa Fe", provincia: "Santa Fe" });
      }
    };

    actualizarUbicacion();
    window.addEventListener('storage', actualizarUbicacion);
    return () => {
      window.removeEventListener('storage', actualizarUbicacion);
    };

  }, [clientProfile]);

  useEffect(() => {
    const fetchStores = async () => {
      setLoadingStores(true);
      try {
        const token = sessionStorage.getItem("token");
        const response = await fetch(`/catalogoMs/api/vendedores/buscar/10-vendedores?provincia=${ubicacionData.provincia}&localidad=${ubicacionData.localidad}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          console.log("Tiendas recibidas del backend:", data);
          setStores(data);
        } else {
          setStores([]);
        }
      } catch (error) {
        console.error("Error cargando locales:", error);
        setStores([]);
      } finally {
        setLoadingStores(false);
      }
    };

    fetchStores();
  }, [ubicacionData]);

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
        } finally {
          setIsProfileLoading(false);
        }
  }
  
  const handleLogout = () => {
    sessionStorage.clear()
    window.location.href = "/login"
  }
  
  const handleNavigate = (path) => {
    window.location.href = path
  }

  const handleRefreshProfile = () => {
    fetchPerfil();
  };

  // FUNCION PARA CARRUSSEL DE LOCALES
  const checkScroll = () => {
    const el = localesRef.current;
    if (!el) return;

    const hasOverflow = el.scrollWidth > el.clientWidth + 1; 

    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(hasOverflow && el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  };

  useEffect(() => {
    const el = localesRef.current;
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
    
    const timeoutId = setTimeout(handleCheck, 100);

    return () => {
      resizeObserver.disconnect();
      el.removeEventListener("scroll", handleCheck);
      window.removeEventListener("resize", handleCheck);
      clearTimeout(timeoutId);
    };
  }, [stores]); 

  const scrollLeft = () => {
    localesRef.current.scrollBy({ left: -300, behavior: "smooth" });
  };

  const scrollRight = () => {
    localesRef.current.scrollBy({ left: 300, behavior: "smooth" });
  };

  const handleCategoryClick = (categoryName) => {
    let selectedAddressId = sessionStorage.getItem("selectedAddressId");

    if (!selectedAddressId && clientProfile?.direcciones?.length > 0) {
      selectedAddressId = clientProfile.direcciones[0].id;
      sessionStorage.setItem("selectedAddressId", selectedAddressId);
      window.dispatchEvent(new Event('addressChanged'));
    }

    if (!selectedAddressId) {
      showAlert({
        title: "Dirección requerida",
        description: "Por favor, selecciona una dirección antes de buscar por categoría.",
      });
      return;
    }

    window.location.href = `/cliente/buscar?q=${encodeURIComponent(categoryName)}`;
  };

  useEffect(() => {

    if (clientProfile?.direcciones?.length > 0) {
      const currentId = sessionStorage.getItem("selectedAddressId");
      if (!currentId) {
        const idPrincipal = clientProfile.direcciones[0].id;
        sessionStorage.setItem("selectedAddressId", idPrincipal);
        
        setUbicacionData({
          localidad: clientProfile.direcciones[0].localidad,
          provincia: clientProfile.direcciones[0].provincia
        });
      }
    }
  }, [clientProfile]);

  if (isProfileLoading) {
    return <LoadingScreen text="Cargando..." />;
  }

  if (loadingStores && stores.length === 0) {
    return <LoadingScreen text="Cargando locales..." />;
  }


  return (
    <div className={styles.page}>
      <Navbar showSearchBar profile={clientProfile} onAddressUpdate={handleRefreshProfile}/>

      <main className={styles.main}>
        {/* Hero Section */}
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <div className={styles.heroCardComida}>
              <span className={styles.heroLabelComida}>COMIDA</span>
              <Image
                src="/cliente/comida.png"
                alt="Comida"
                width={160}
                height={120}
                className={styles.heroImgComida}
              />
            </div>
            <div className={styles.heroCardBebida}>
              <Image
                src="/cliente/bebida.png"
                alt="Bebida"
                width={140}
                height={120}
                className={styles.heroImgBebida}
              />
              <span className={styles.heroLabelBebida}>BEBIDA</span>
            </div>
          </div>
        </section>

        {/* Categories */}
        <section className={styles.categories}>
          {categories.map((cat) => (
            <div 
              key={cat.name} 
              className={styles.categoryItem}
              onClick={() => handleCategoryClick(cat.name)} 
              style={{ cursor: 'pointer' }}
              >
              <div className={styles.categoryCircle}>
                <Image src={cat.img || "/placeholder.svg"} alt={cat.name} width={80} height={80} className={styles.categoryImg} />
              </div>
              <span className={styles.categoryName}>{cat.name}</span>
            </div>
          ))}
        </section>

        {/* Discover Section */}
        <section className={styles.discover}>
          <div className={styles.discoverHeader}>
            <h2 className={styles.discoverTitle}>
              Descubri estas opciones en <span className={styles.locationHighlight}>{ubicacionData.localidad}, {ubicacionData.provincia}</span>
            </h2>
            {stores.length > 0 && (
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
            )}
          </div>

          <div className={styles.storeScroll} ref={localesRef} onScroll={checkScroll}>
            {loadingStores ? (
              <p className={styles.noStoresLabel}>Cargando locales...</p>
            ) : stores.length > 0 ? (
            stores.map((store, i) => (
              <Link key={i} href={`/cliente/local/${store.idVendedor}`} className={styles.storeCard}>
                <div className={styles.storeLogo}>
                {store.logo ? (
                      <Image src={store.logo} alt={store.nombreNegocio} width={64} height={64} />
                    ) : (
                  <div className={styles.storeLogoPlaceholder}>
                    {store.nombreNegocio?.charAt(0)}
                  </div>
                  )}
                </div>
                <div className={styles.storeInfo}>
                <h3 className={styles.storeName}>{store.nombreNegocio}</h3>
                <div className={styles.storeMeta}>
                  <span className={styles.storeTime}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    {store.tiempoEstimadoEspera}
                  </span>
                  <span className={styles.storeTravel}>
                    <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="#888">
                      <path d="M144-624v-192h240v192H144Zm72-72h96v-48h-96v48Zm-13 445q-35-35-35-85H96v-96q0-60 40-102t104-42h144v168h144l144-172v-68H552v-72h120q31 0 51.5 21.15T744-648v94L562-336H408q0 50-35 85t-85 35q-50 0-85-35Zm119-50.8q14-13.8 14-34.2h-96q0 20 14 34t34 14q20 0 34-13.8ZM659-251q-35-35-35-85t35-85q35-35 85-35t85 35q35 35 35 85t-35 85q-35 35-85 35t-85-35Zm119-51q14-14 14-34t-14-34q-14-14-34-14t-34 14q-14 14-14 34t14 34q14 14 34 14t34-14ZM168-408h144v-96h-72.21Q210-504 189-482.85T168-432v24Zm144-288v-48 48Zm0 288Z"/>
                    </svg>
                    {store.realizaEnvios ? '10-25 min' : 'Retiro en local'}
                  </span>
                </div>
              </div>
              </Link>
            ))
            ) : (
              <div className={styles.noStoresContainer}>
                <p className={styles.noStoresLabel}>
                  Lo sentimos, no hay locales registrados en la zona de <strong>{ubicacionData.localidad}</strong>.
                </p>
              </div>
            )}
            
          </div>
        </section>

        {/* Footer Banner */}
        <section className={styles.footerBanner}>
          <div className={styles.bannerLeft}>
            <Image
              src="/cliente/chica-pizza.png"
              alt="Girl eating pizza"
              width={200}
              height={250}
              className={styles.bannerImg}
            />
          </div>
          <div className={styles.bannerRight}>
            <div className={styles.bannerBlock}>
              <div className={styles.bannerIcon}>
                <svg width="45" height="45" viewBox="0 0 24 24" fill="none" stroke="#ff4b7e" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <div>
                <h3>Top Ciudades</h3>
                <p>Santa Fe, Buenos Aires, Cordoba, La Plata, San Miguel de Tucuman, Rosario, Mar del Plata.</p>
              </div>
            </div>
            <div className={styles.bannerBlock}>
              <div className={styles.bannerIcon}>
                <svg width="45" height="45" viewBox="0 0 24 24" fill="none" stroke="#ff4b7e" strokeWidth="2">
                  <path d="M18 8h1a4 4 0 010 8h-1" />
                  <path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" />
                  <line x1="6" y1="1" x2="6" y2="4" />
                  <line x1="10" y1="1" x2="10" y2="4" />
                  <line x1="14" y1="1" x2="14" y2="4" />
                </svg>
              </div>
              <div>
                <h3>Top Comidas</h3>
                <p>Helados, Pizzas, Hamburguesas, Empanadas, Postres, Sandwiches.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <ChatbotFlotante profile={clientProfile} />      
      <Footer />
    </div>
  );
}
