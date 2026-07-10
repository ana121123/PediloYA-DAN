'use client';

import { useState, useEffect, useRef} from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ChatbotFlotante from '../components/ChatbotFlotante';
import styles from './buscar.module.css';

export default function BuscarPage() {
  const searchParams = useSearchParams();
  const [clientProfile, setClientProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('locales');
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasInitialSearchRun, setHasInitialSearchRun] = useState(false);
  const busquedaInicialRealizada = useRef(false);

  useEffect(() => {
    fetchPerfil();
  }, [])


  useEffect(() => {
    const q = searchParams.get('q');

    if (q && clientProfile && !busquedaInicialRealizada.current) {
      setSearchQuery(q);
      ejecutarBusqueda(q, activeTab);
      busquedaInicialRealizada.current = true;
    }
  }, [clientProfile, searchParams]); 

  useEffect(() => {
    if (busquedaInicialRealizada.current && searchQuery) {
      ejecutarBusqueda(searchQuery, activeTab);
    }
  }, [activeTab]);



  useEffect(() => {
    const refrescarBusquedaAlCambiarDireccion = () => {
      if (searchQuery) {
        ejecutarBusqueda(searchQuery, activeTab);
      }
    };
    window.addEventListener('storage', refrescarBusquedaAlCambiarDireccion);
    
    return () => {
      window.removeEventListener('storage', refrescarBusquedaAlCambiarDireccion);
    };
  }, [searchQuery, activeTab, clientProfile]);

  const ejecutarBusqueda = async (query, tab) => {
    if (!query) return;
  
    setLoading(true);
    setResults([]);
    try {
      const selectedId = sessionStorage.getItem("selectedAddressId");

      if (!clientProfile) {
        console.log("Esperando perfil para obtener datos de la dirección...");
        return; 
      }

      const direccion = clientProfile?.direcciones?.find(d => String(d.id) === selectedId);
    
      const token = sessionStorage.getItem("token")

      const endpoint = tab === 'locales' 
        ? `/catalogoMs/api/vendedores/buscar/vendedores` 
        : `/catalogoMs/api/vendedores/buscar/productos`;

      const resp = await fetch(`${endpoint}?provincia=${direccion.provincia}&localidad=${direccion.localidad}&filtro=${query}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`, 
          'Content-Type': 'application/json'
        }
      });
      
      if (resp.ok) {
        const data = await resp.json();
        setResults(data);
      }
    } catch (error) {
      console.error("Error en la búsqueda:", error);
    } finally {
      setLoading(false);
    }
  };

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

  const handleRefreshProfile = () => {
    fetchPerfil();
  };

  return (
    <div className={styles.page}>
      <Navbar profile={clientProfile} onAddressUpdate={handleRefreshProfile}/>

      <main className={styles.main}>
        <div className={styles.header}>
          <Link href="/cliente" className={styles.backBtn}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
               <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
            </svg>
          </Link>
          <h1 className={styles.title}>BUSCAR</h1>
        </div>

        <div className={styles.searchWrapper}>
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Buscar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {if (e.key === 'Enter') ejecutarBusqueda(searchQuery, activeTab);}}
          />
          <button 
            className={styles.searchBtn} 
            aria-label="Buscar"
            onClick={() => ejecutarBusqueda(searchQuery, activeTab)}
            >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
            </svg>
          </button>
        </div>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'locales' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('locales')}
          >
            Locales
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'productos' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('productos')}
          >
            Productos
          </button>
        </div>

        <h2 className={styles.resultsTitle}>
          {loading ? "Buscando..." : `Resultados para "${searchQuery}"`}
        </h2>

        {loading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <p>Estamos encontrando las mejores opciones para vos...</p>
          </div>
        ) : (
          <>
            {results.length > 0 ? (
              <>
                {/* VISTA DE LOCALES */}
                {activeTab === 'locales' && (
                  <div className={styles.localesGrid}>
                    {results.map((local, index) => (
                      <Link 
                        key={local.id || local.idVendedor || local.vendedorId || index} 
                        href={`/cliente/local/${local.id || local.idVendedor || local.vendedorId}?original=${encodeURIComponent(searchQuery)}`} 
                        className={styles.localCard}
                      >
                        <div className={styles.logoInner}>
                          {local.logo ? (
                          <img 
                            src={local.logo} 
                            alt={local.nombreNegocio} 
                            className={styles.logoImg} 
                          />
                        ) : (
                          <span className={styles.initialLetter}>
                            {local.nombreNegocio?.charAt(0)}
                          </span>
                        )}
                        </div>
                        <div className={styles.localInfo}>
                          <h3 className={styles.localName}>{local.nombreNegocio}</h3>
                          <div className={styles.localMeta}>
                            <span className={styles.localDelivery}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#e84c6a" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                              </svg>
                              {`Recibes en ${local.tiempoEstimadoEspera}`}
                            </span>
                          </div>
                          <div className={styles.localMeta}>
                            <span className={styles.localTravel}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                              </svg>
                              {local.realizaEnvios ? '10-25 min de viaje' : 'Retiro en local'}
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                {/* VISTA DE PRODUCTOS */}
                {activeTab === 'productos' && (
                  <div className={styles.productosGrid}>
                    {results.map((prod, index) => (
                      <Link 
                        key={prod.id || `prod-idx-${index}`} 
                        href={`/cliente/local/${prod.idVendedor || prod.vendedorId}?q=${encodeURIComponent(prod.nombre)}&original=${encodeURIComponent(searchQuery)}`}
                        className={styles.productCard}
                      >
                        <div className={styles.logoInner}>
                          {prod.imagen ? (
                          <img 
                            src={prod.imagen} 
                            className={styles.logoImg} 
                            alt={prod.nombre}
                          />
                        ) : (
                          <div className={styles.initialLetter}>
                            {prod.nombre?.charAt(0)}
                          </div>
                        )}
                        </div>
                        <div className={styles.productInfo}>
                          <h3 className={styles.productName}>{prod.nombre}</h3>
                          <p className={styles.productPrice}>${prod.precio}</p>
                          <p className={styles.productStore}>Local: {prod.nombreVendedor}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className={styles.noResults}>
                <p>No encontramos {activeTab} que coincidan con tu búsqueda.</p>
              </div>
            )}
          </>
        )}
      </main>

      <ChatbotFlotante profile={clientProfile} />  
      <Footer />
    </div>
  );
}
