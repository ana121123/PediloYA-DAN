'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import ChatbotFlotante from '../../components/ChatbotFlotante';
import Stepper from '../../components/Stepper';
import ResumenCompra from '../../components/ResumenCompra';
import LoadingScreen from '../../../../components/loading-screen';
import { useAppDialog } from '../../../../components/ui/app-dialog';
import styles from '../proceso-pedido.module.css';

export default function Paso1Page() {
  const { showAlert } = useAppDialog();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [cart, setCart] = useState(null);
  const [clientProfile, setClientProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchPerfil();
    fetchCart();
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
            console.error("Error al obtener perfil del cliente:", perfilRes.status);
        }
    
        } catch (error) {
          console.error("Error de red:", error);
        } 
  }

  const fetchCart = async () => {
    try {
      const token = sessionStorage.getItem("token");
      const vendedorId = searchParams.get("vendedorId");

      if (!token || !vendedorId) {
        setLoading(false);
        return;
      }

      const res = await fetch(`/pedidoMs/carrito/vendedor/${vendedorId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setCart(data);
      }
    } catch (error) {
      console.error("Error fetching cart:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateQty = async (item, delta) => {
    if (!cart) return;

    const newQty = item.cantidad + delta;
    const token = sessionStorage.getItem("token");

    if (newQty <= 0) {
      await removeItem(item);
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
        await fetchCart();
      }
    } catch (error) {
      console.error("Error updating quantity:", error);
    }
  };

  const removeItem = async (item) => {
    if (!cart) return;

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
        await fetchCart();
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

  const handleContinue = async () => {
    setProcessing(true);
    try {
      const token = sessionStorage.getItem("token");

      const res = await fetch(`/pedidoMs/pedidos/iniciar-checkout/${cart.vendedorId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        const pedido = await res.json();
        console.log("Pedido iniciado con éxito:", pedido);
        
        const pedidoId = pedido.id;
        sessionStorage.setItem("currentPedidoId", pedidoId);
        
        router.push(`/cliente/proceso-pedido/paso2?vendedorId=${cart.vendedorId}`);
      } else {
        const errorData = await res.json().catch(() => ({}));
        await showAlert({
          title: "Error",
          description: `Error: ${errorData.message || 'No se pudo iniciar el checkout'}`,
        });
      }
    } catch (error) {
      console.error("Error de red:", error);
      await showAlert({
        title: "Error de conexión",
        description: "Error de conexión. Intenta de nuevo.",
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <LoadingScreen text="Cargando tu pedido..." />;
  }

  if (!cart) {
    return (
      <div className={styles.page}>
        <Navbar profile={clientProfile} onAddressUpdate={handleRefreshProfile}/>
        <main className={styles.main}>
          <div style={{textAlign: 'center', padding: '2rem'}}>El carrito no fue encontrado.</div>
        </main>
        <Footer />
      </div>
    );
  }

  const subtotal = cart.montoTotalProductos;
  const totalItems = cart.items.reduce((s, item) => s + item.cantidad, 0);

  return (
    <div className={styles.page}>
      <Navbar profile={clientProfile} onAddressUpdate={handleRefreshProfile}/>

      <main className={styles.main}>
        <div className={styles.header}>
          <Link href="/cliente/carrito" className={styles.backBtn}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
               <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
            </svg>
          </Link>
          <h1 className={styles.title}>PROGRESO DE PEDIDO</h1>
        </div>

        <Stepper activeStep={1} />

        <div className={styles.contentRow}>
          <div className={styles.contentLeft}>
            <h2 className={styles.vendorTitle}>Productos de {cart.nombreVendedor || 'Vendedor'}</h2>
            <div className={styles.itemList}>
              {cart.items.map((item) => (
                <div key={item.idItem} className={styles.productItem}>
                  <div className={styles.productItemImg}>
                    {item.urlImagen ? (
                      <Image src={item.urlImagen} alt={item.nombreProducto} width={60} height={60} className={styles.productItemImage} />
                    ) : (
                      <div style={{width:'100%', height:'100%', background:'#eee', display:'flex', justifyContent:'center', alignItems:'center'}}>
                        <span style={{fontSize:'10px', color:'#999'}}>Sin imagen</span>
                      </div>
                    )}
                  </div>
                  <div className={styles.productItemInfo}>
                    <div className={styles.productItemTop}>
                      <span className={styles.productItemName}>
                        {item.nombreProducto}
                        <button
                          className={styles.deleteItemBtn}
                          onClick={() => removeItem(item)}
                          aria-label="Eliminar"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e84c6a" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                          </svg>
                        </button>
                      </span>
                      <span className={styles.productItemPrice}>$ {item.montoUnitario.toLocaleString()}</span>
                    </div>
                    <p className={styles.productItemObs}>Observaciones: {item.observaciones || '-'}</p>
                    <div className={styles.qtyControl}>
                      <button 
                        className={styles.qtyBtn} 
                        onClick={() => updateQty(item, -1)}
                        disabled={item.cantidad === 1}
                        style={{opacity: item.cantidad === 1 ? 0.5 : 1, cursor: item.cantidad === 1 ? 'not-allowed' : 'pointer'}}
                      >
                        -
                      </button>
                      <span className={styles.qtyValue}>{item.cantidad}</span>
                      <button className={styles.qtyBtn} onClick={() => updateQty(item, 1)}>+</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <ResumenCompra items={totalItems} subtotal={subtotal} realizaEnvios={cart.realizaEnvios} comisionApp={cart.comisionApp} />
        </div>

        <div className={styles.continueBtnWrapper}>
          <button onClick={handleContinue} className={styles.continueBtn} disabled={processing}>
            {processing ? 'Procesando...' : 'Continuar'}
          </button>
        </div>
      </main>
      <ChatbotFlotante profile={clientProfile} />
      <Footer />
    </div>
  );
}
