'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ChatbotFlotante from '../components/ChatbotFlotante';
import LoadingScreen from '../../../components/loading-screen';
import styles from './carrito.module.css';

export default function CarritoPage() {
  const router = useRouter();
  const [carts, setCarts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCartId, setSelectedCartId] = useState(null);
  const [clientProfile, setClientProfile] = useState(null);

  useEffect(() => {
    fetchPerfil();
    fetchCarts();
  }, []);

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

  const fetchCarts = async () => {
    try {
      const token = sessionStorage.getItem("token");
      if (!token) return;

      const res = await fetch('/pedidoMs/carrito/todos', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setCarts(data);
      }
    } catch (error) {
      console.error("Error fetching carts:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateQty = async (cart, item, delta) => {
    const newQty = item.cantidad + delta;
    const token = sessionStorage.getItem("token");

    if (newQty <= 0) {
      await removeItem(cart, item);
      return;
    }

    try {
      const response = await fetch('/pedidoMs/carrito/items/cantidad', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          vendedorId: cart.vendedorId,
          productoId: item.productoId,
          cantidad: newQty, 
          observaciones: item.observaciones
        })
      });

      if (response.ok) {
        await fetchCarts();
      } else {
        console.error("No se pudo actualizar la cantidad en el servidor");
      }
    } catch (error) {
      console.error("Error de red al actualizar cantidad:", error);
    }
  };

  const removeItem = async (cart, item) => {
    try {
      const token = sessionStorage.getItem("token");
      const res = await fetch('/pedidoMs/carrito/items', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          vendedorId: cart.vendedorId,
          itemsIds: [item.idItem]
        })
      });

      if (res.ok) {
        await fetchCarts();
      } else {
        console.error("Error al eliminar item, status:", res.status);
      }
    } catch (error) {
      console.error("Error removing item:", error);
    }
  };

  const handleRefreshProfile = () => {
    fetchPerfil();
  };

  if (loading) {
    return <LoadingScreen text="Cargando carritos..." />;
  }

  return (
    <div className={styles.page}>
      <Navbar profile={clientProfile} onAddressUpdate={handleRefreshProfile} />

      <main className={styles.main}>
        <div className={styles.header}>
          <button onClick={() => router.back()} className={styles.backBtn}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
               <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
            </svg>
          </button>
          <h1 className={styles.title}>MIS CARRITOS</h1>
        </div>

        {carts.length === 0 ? (
          <div style={{textAlign: 'center', padding: '2rem'}}>No tienes carritos activos.</div>
        ) : (
        <div className={styles.cartList}>
          {carts.map((cart) => {
            const subtotal = cart.montoTotalProductos || 0;
            const total = cart.montoTotal || 0;
            const totalItems = cart.items.reduce((s, item) => s + item.cantidad, 0);
            const isSelected = selectedCartId === cart.id;

            return (
              <div key={cart.id} className={styles.cartGroup}>
                <div className={styles.cartGroupInner}>
                  <div className={styles.cartLeft}>
                    <div className={styles.vendorHeader}>
                      <input 
                        type="radio" 
                        name="selectedCart"
                        checked={isSelected}
                        onClick={() => setSelectedCartId(isSelected ? null : cart.id)}
                        onChange={() => {}}
                        style={{ marginRight: '10px', accentColor: '#e84c6a', width: '20px', height: '20px', cursor: 'pointer' }}
                      />
                      <h2 className={styles.vendorName}>Productos de {cart.nombreVendedor}</h2>
                    </div>

                    <div className={styles.itemList}>
                      {cart.items.map((item) => (
                        <div key={item.idItem} className={styles.cartItem}>
                          <div className={styles.itemImg}>
                            {item.urlImagen ? (
                              <Image src={item.urlImagen} alt={item.nombreProducto} width={60} height={60} className={styles.itemImage} />
                            ) : (
                              <div style={{width:'100%', height:'100%', background:'#eee', display:'flex', justifyContent:'center', alignItems:'center'}}>
                                <span style={{fontSize:'10px', color:'#999'}}>Sin imagen</span>
                              </div>
                            )}
                          </div>
                          <div className={styles.itemInfo}>
                            <div className={styles.itemTop}>
                              <span className={styles.itemName}>
                                {item.nombreProducto}
                                <button
                                  className={styles.deleteItemBtn}
                                  onClick={() => removeItem(cart, item)}
                                  aria-label="Eliminar"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e84c6a" strokeWidth="2">
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                                  </svg>
                                </button>
                              </span>
                              <span className={styles.itemPrice}>$ {item.montoUnitario.toLocaleString()}</span>
                            </div>
                            <p className={styles.itemObs}>Observaciones: {item.observaciones || '-'}</p>
                            <div className={styles.qtyControl}>
                              <button 
                                className={styles.qtyBtn} 
                                onClick={() => updateQty(cart, item, -1)}
                                disabled={item.cantidad === 1}
                                style={{opacity: item.cantidad === 1 ? 0.5 : 1, cursor: item.cantidad === 1 ? 'not-allowed' : 'pointer'}}
                              >
                                -
                              </button>
                              <span className={styles.qtyValue}>{item.cantidad}</span>
                              <button className={styles.qtyBtn} onClick={() => updateQty(cart, item, 1)}>+</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className={styles.cartRight}>
                    <div className={styles.summaryCard}>
                      <h3 className={styles.summaryTitle}>Resumen de compra</h3>
                      <div className={styles.summaryRow}>
                        <span>Productos ({totalItems})</span>
                        <span>${subtotal.toLocaleString()}</span>
                      </div>
                      {cart.realizaEnvios && (
                        <div className={styles.summaryRow}>
                          <span style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
                            Costo de envio
                            <div className={styles.tooltipWrapper}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e84c6a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                              </svg>
                              <span className={styles.tooltip}>El costo de envío será calculado en la sección de dirección.</span>
                            </div>
                          </span>
                          <span>-</span>
                        </div>
                      )}
                      <div className={styles.summaryRow}>
                        <span>Tarifa de servicio</span>
                        <span>${(cart.comisionApp || 0).toLocaleString()}</span>
                      </div>
                      <div className={styles.summaryTotal}>
                        <span>Total</span>
                        <span>${total.toLocaleString()}</span>
                      </div>
                      {isSelected ? (
                        <Link 
                          href={`/cliente/proceso-pedido/paso1?vendedorId=${cart.vendedorId}`} 
                          className={styles.continueBtn}
                          onClick={() => sessionStorage.setItem("currentVendedorId", cart.vendedorId)}
                        >
                          Continuar
                        </Link>
                      ) : (
                        <button className={styles.continueBtn} disabled>
                          Continuar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </main>

      <ChatbotFlotante profile={clientProfile} />  
      <Footer />
    </div>
  );
}