'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import ChatbotFlotante from '../../components/ChatbotFlotante';
import LoadingScreen from '../../../../components/loading-screen';
import styles from '../local.module.css';

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

export default function LocalPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const filterQuery = searchParams.get('q');
  const originalQuery = searchParams.get('original');
  const hasOriginal = searchParams.has('original');
  const { idVendedor } = params;
  const [vendorProfile, setVendorProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clientProfile, setClientProfile] = useState(null);
  const [searchQuery, setSearchQuery] = useState(filterQuery || '');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [observations, setObservations] = useState('');
  const [cart, setCart] = useState([]);
  const [filterCat, setFilterCat] = useState('');
  const [filterSub, setFilterSub] = useState('');
  const [isEditingCart, setIsEditingCart] = useState(false);
  const [selectedCartItems, setSelectedCartItems] = useState([]);
  const [categoriasMap, setCategoriasMap] = useState({});

  const clearFilters = () => {
    setFilterCat('');
    setFilterSub('');
  };

  const activeFilterCount = (filterCat ? 1 : 0) + (filterSub ? 1 : 0);

  const isOpen = (() => {
    if (!vendorProfile?.horarioApertura || !vendorProfile?.horarioCierre) return true;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    try {
      const [openH, openM] = vendorProfile.horarioApertura.split(':').map(Number);
      const [closeH, closeM] = vendorProfile.horarioCierre.split(':').map(Number);
      const start = openH * 60 + openM;
      const end = closeH * 60 + closeM;
      
      if (end < start) return currentMinutes >= start || currentMinutes < end;
      return currentMinutes >= start && currentMinutes < end;
    } catch (e) { return true; }
  })();

  const products = vendorProfile?.productos || [];
  const uniqueCategories = Object.keys(categoriasMap);
  const uniqueSubcategories = filterCat 
    ? (categoriasMap[filterCat] || [])
    : [...new Set(Object.values(categoriasMap).flat())];

  const filteredProducts = products.filter((p) => {
    if (filterCat && p.categoria !== filterCat) return false;
    if (filterSub && p.subcategoria !== filterSub) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchName = p.nombre?.toLowerCase().includes(query);
      const matchDesc = p.descripcion?.toLowerCase().includes(query);
      const matchCat = p.categoria?.toLowerCase().includes(query);
      const matchSub = p.subcategoria?.toLowerCase().includes(query);
      if (!matchName && !matchDesc && !matchCat && !matchSub) return false;
    }
    return true;
  });

  const addToCart = async () => {
    if (!selectedProduct) return;
    
    try {
      const token = sessionStorage.getItem("token");
      const res = await fetch('/pedidoMs/carrito/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          vendedorId: idVendedor,
          productoId: selectedProduct.id,
          cantidad: quantity,
          observaciones: observations
        })
      });

      if (res.ok) {
        const data = await res.json();
        setCart(data.items || []);
        setSelectedProduct(null);
        setQuantity(1);
        setObservations('');
      }
    } catch (error) {
      console.error("Error al agregar al carrito:", error);
    }
  };

  const cartSubtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);

  const toggleCartEdit = () => {
    setIsEditingCart(!isEditingCart);
    setSelectedCartItems([]);
  };

  const toggleCartItemSelection = (id) => {
    setSelectedCartItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const removeSelectedItems = async () => {
    if (selectedCartItems.length === 0) return;

    try {
      const token = sessionStorage.getItem("token");
      const res = await fetch('/pedidoMs/carrito/items', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          vendedorId: idVendedor,
          itemsIds: selectedCartItems
        })
      });

      if (res.ok) {
        const data = await res.json();
        setCart(data.items || []);
        setIsEditingCart(false);
        setSelectedCartItems([]);
      }
    } catch (error) {
      console.error("Error al eliminar items del carrito:", error);
    }
  };

  useEffect(() => {
      const fetchCategorias = async () => {
        try {
          const token = sessionStorage.getItem("token");
          const res = await fetch('/catalogoMs/api/categorias', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            setCategoriasMap(await res.json());
          }
        } catch (error) {
          console.error("Error al cargar categorias:", error);
        }
      };
      fetchCategorias();
      fetchPerfil();
    }, [])

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const currentQ = params.get('q') || '';

    if (searchQuery !== currentQ) {
      if (searchQuery) {
        params.set('q', searchQuery);
      } else {
        params.delete('q');
      }
      const queryString = params.toString();
      router.replace(queryString ? `/cliente/local/${idVendedor}?${queryString}` : `/cliente/local/${idVendedor}`, { scroll: false });
    }
  }, [searchQuery, searchParams, idVendedor, router]);

  useEffect(() => {
    if (idVendedor) {
      fetchVendorProfile();
      fetchCart();
    }
  }, [idVendedor]);

  const fetchCart = async () => {
    try {
      const token = sessionStorage.getItem("token");
      if (!token) return;
      
      const res = await fetch(`/pedidoMs/carrito/vendedor/${idVendedor}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setCart(data.items || []);
      }
    } catch (error) {
      console.error("Error al cargar carrito:", error);
    }
  };

  const fetchVendorProfile = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem("token");
      const res = await fetch(`/catalogoMs/api/vendedores/perfil-publico/${idVendedor}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`, 
        'Content-Type': 'application/json'
      }
    });

      if (res.ok) {
        const data = await res.json();
        setVendorProfile(data);
      }
    } catch (error) {
      console.error("Error al cargar perfil del vendedor:", error);
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

  if (loading && !vendorProfile) {
    return <LoadingScreen text="Cargando local..." />;
  }



  return (
    <div className={styles.page}>
      <Navbar profile={clientProfile} onAddressUpdate={handleRefreshProfile} disableAddressModal={true} />

      <main className={styles.main}>
        {/* Store Header */}
        <div className={styles.storeHeader}>
          <Link 
            href={hasOriginal 
              ? `/cliente/buscar${originalQuery ? `?q=${encodeURIComponent(originalQuery)}` : ''}` 
              : (filterQuery ? `/cliente/buscar?q=${encodeURIComponent(filterQuery)}` : "/cliente")
            } 
            className={styles.backBtn}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
               <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
            </svg>
          </Link>
          <div className={styles.storeLogo}>
            {loading ? (
               <div className={styles.storeLogoImg} style={{backgroundColor: '#eee'}} />
            ) : vendorProfile?.logo ? (
              <img src={vendorProfile.logo} alt={vendorProfile.nombreNegocio} className={styles.storeLogoImg} />
            ) : (
              <div className={styles.storeLogoImg} style={{backgroundColor: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                 <span style={{fontSize: '2rem', color: '#888'}}>{vendorProfile?.nombreNegocio?.charAt(0)}</span>
              </div>
            )}
          </div>
          <div className={styles.storeInfo}>
            <div className={styles.nameRow}>
              <h1 className={styles.storeName}>{vendorProfile?.nombreNegocio || 'Local no disponible'}</h1>
              {!loading && vendorProfile && (
                <div className={`${styles.statusBanner} ${isOpen ? styles.statusOpen : styles.statusClosed}`}>
                  <span className={styles.statusDot}></span>
                  {isOpen ? `¡Abierto ahora! • Cierra a las ${vendorProfile.horarioCierre} hs` : `Cerrado ahora • Abre a las ${vendorProfile.horarioApertura} hs`}
                </div>
              )}
            </div>
            <div className={styles.storeDetails}>
              <p><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e84c6a" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg> 
                {vendorProfile?.direccion ? `${vendorProfile.direccion.calle} ${vendorProfile.direccion.numero}, ${vendorProfile.direccion.localidad}` : 'Dirección no disponible'}
              </p>
              <p><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e84c6a" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg> 
                Abre: {vendorProfile?.horarioApertura || '--:--'} hs
              </p>
              <p><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e84c6a" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg> 
                Cierra: {vendorProfile?.horarioCierre || '--:--'} hs
              </p>
              <p>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e84c6a" strokeWidth="2">
                  <path d="M5 22h14" />
                  <path d="M5 2h14" />
                  <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22" />
                  <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />
                </svg> 
                Tiempo estimado de espera: {vendorProfile?.tiempoEstimadoEspera || '--'}
              </p>
              <p>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e84c6a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg> 
                Teléfono: {vendorProfile?.telefono || '--'}
              </p>
              <p><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e84c6a" strokeWidth="2"><rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg> 
                {vendorProfile?.realizaEnvios ? 'Realiza envíos a domicilio' : 'Solo retiro en local'}
              </p>
              <p>
                <span style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                  {renderStars(vendorProfile?.calificacionPromedio || 0).map((fill, i) => (
                    <Star key={i} index={i} fill={fill} />
                  ))}
                </span>
                <span style={{ fontWeight: 700, color: "#222" }}>
                  {(vendorProfile?.calificacionPromedio || 0).toFixed(1)}
                </span>
                <span style={{ color: "#9ca3af" }}>
                  ({vendorProfile?.cantidadCalificaciones || 0} calificaciones)
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Search + Filter */}
        <div className={styles.searchRow}>
          <div className={styles.searchWrapper}>
            <input
              className={styles.searchInput}
              type="text"
              placeholder="Buscar producto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button className={styles.searchBtn}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
              </svg>
            </button>
          </div>
          <button className={styles.filterBtn} onClick={() => setShowFilters(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#ff4b7e">
              <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          <div className={styles.productGrid}>
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                className={styles.productCard}
                onClick={() => { setSelectedProduct(product); setQuantity(1); setObservations(''); }}
              >
                <div className={styles.productInfo}>
                  <h3 className={styles.productName}>{product.nombre}</h3>
                  <p className={styles.productDesc}>{product.descripcion}</p>
                  <p className={styles.productPrice}>$ {product.precio?.toLocaleString()}</p>
                </div>
                <div className={styles.productImgWrapper}>
                  {product.imagen ? (
                    <img 
                      src={product.imagen} 
                      alt={product.nombre} 
                      className={styles.productImg}
                      style={{width:'100%', height:'100%', objectFit:'cover'}} 
                    />
                  ) : (
                      <div style={{width:'100%', height:'100%', background:'#eee', display:'flex', justifyContent:'center', alignItems:'center'}}>
                        <span style={{fontSize:'10px', color:'#999'}}>Sin imagen</span>
                      </div>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Cart Sidebar */}
          {cart.length > 0 && (
            <aside className={styles.cartSidebar}>
              <div className={styles.cartHeader}>
                <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                 <h3>Resumen de carrito</h3>
                  <div className={styles.tooltipWrapper}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e84c6a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span className={styles.tooltip}>Por políticas de la aplicación, los productos se guardan por 2 horas. Luego se eliminan automáticamente.</span>
                  </div>
                </div>
                <button 
                  className={styles.cartEditLink} 
                  onClick={toggleCartEdit}
                  style={{background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit'}}
                >
                  {isEditingCart ? 'Cancelar' : 'Editar'}
                </button>
              </div>
              <div className={styles.cartItems}>
                {cart.map((item) => (
                  <div key={item.idItem} className={styles.cartItem}>
                    {isEditingCart && (
                      <input 
                        type="checkbox" 
                        checked={selectedCartItems.includes(item.idItem)}
                        onChange={() => toggleCartItemSelection(item.idItem)}
                        className={styles.cartItemCheckbox}
                      />
                    )}
                    <span className={styles.cartItemQty}>{item.cantidad} x</span>
                    <span className={styles.cartItemName}>{item.nombreProducto}</span>
                    <span className={styles.cartItemPrice}>$ {item.subtotal?.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className={styles.cartTotal}>
                <span>Subtotal</span>
                <span>${cartSubtotal.toLocaleString()}</span>
              </div>
              {isEditingCart ? (
                <button 
                  className={styles.cartGoBtn} 
                  onClick={removeSelectedItems}
                  style={{width: '100%'}}
                >
                  Eliminar seleccionados
                </button>
              ) : (
                <Link href="/cliente/carrito" className={styles.cartGoBtn}>
                  Ir al carrito
                </Link>
              )}
            </aside>
          )}
        </div>
      </main>
      
      <ChatbotFlotante profile={clientProfile} />
      <Footer />

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className={styles.modalOverlay} onClick={() => setSelectedProduct(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={() => setSelectedProduct(null)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <div className={styles.modalImgWrapper}>
              {selectedProduct.imagen ? (
                <img 
                  src={selectedProduct.imagen} 
                  alt={selectedProduct.nombre} 
                  className={styles.modalImg}
                  style={{width:'100%', height:'100%', objectFit:'cover'}} 
                />
              ) : (
                  <div style={{width:'100%', height:'100%', background:'#eee', display:'flex', justifyContent:'center', alignItems:'center'}}>
                    <span style={{fontSize:'10px', color:'#999'}}>Sin imagen</span>
                  </div>
              )}
            </div>

            <div className={styles.modalBody}>
              <div className={styles.modalTitleRow}>
                <h2 className={styles.modalTitle}>{selectedProduct.nombre}</h2>
                <span className={styles.modalPrice}>$ {selectedProduct.precio?.toLocaleString()}</span>
              </div>
              <p className={styles.modalDesc}>{selectedProduct.descripcion}</p>

              <div className={styles.modalField}>
                <div className={styles.qtyWrapper}>
                  <span className={styles.modalLabel} style={{marginBottom: 0}}>Unidades</span>
                  <div className={styles.qtyControl}>
                    <button
                      className={styles.qtyBtn}
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    >-</button>
                    <span className={styles.qtyValue}>{quantity}</span>
                    <button
                      className={styles.qtyBtn}
                      onClick={() => setQuantity(quantity + 1)}
                    >+</button>
                  </div>
                </div>
              </div>

              <div className={styles.modalField}>
                <label className={styles.modalLabel}>Observaciones</label>
                <textarea
                  className={styles.modalTextarea}
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  rows={3}
                />
              </div>

              <button 
                className={styles.addToCartBtn} 
                onClick={addToCart} 
                disabled={!isOpen}
                style={!isOpen ? { opacity: 0.5, cursor: 'not-allowed', backgroundColor: '#9ca3af' } : {}}
              >
                {isOpen ? 'Agregar al carrito' : 'Local Cerrado'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters Modal */}
      {showFilters && (
        <div className={styles.modalOverlay} onClick={() => setShowFilters(false)}>
          <div className={styles.filtersModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.filtersHeader}>
              <h2>Filtros ({activeFilterCount})</h2>
              <button className={styles.modalClose} onClick={() => setShowFilters(false)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className={styles.filterSection}>
              <div className={styles.filterSectionHeader}>
                <h3>Categorias</h3>
              </div>
              <div className={styles.filterCheckboxes}>
                {uniqueCategories.map((cat) => (
                  <label key={cat} className={styles.checkboxLabel}>
                    <input
                      type="radio"
                      name="categoria"
                      checked={filterCat === cat}
                      onChange={() => { setFilterCat(cat); setFilterSub(''); }}
                      className={styles.checkbox}
                    />
                    {cat}
                  </label>
                ))}
              </div>
            </div>

            <div className={styles.filterSection}>
              <div className={styles.filterSectionHeader}>
                <h3>Subcategorias</h3>
              </div>
              <div className={styles.filterSubGrid}>
                {uniqueSubcategories.map((sub) => (
                  <label key={sub} className={styles.checkboxLabel}>
                    <input
                      type="radio"
                      name="subcategoria"
                      checked={filterSub === sub}
                      onChange={() => setFilterSub(sub)}
                      className={styles.checkbox}
                    />
                    {sub}
                  </label>
                ))}
              </div>
            </div>

            <div className={styles.filterActions}>
              <button className={styles.filterApplyBtn} onClick={() => setShowFilters(false)}>Aplicar</button>
              <button className={styles.filterClearBtn} onClick={clearFilters}>Limpiar filtros</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
