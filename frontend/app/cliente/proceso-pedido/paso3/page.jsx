'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import ChatbotFlotante from '../../components/ChatbotFlotante';
import Stepper from '../../components/Stepper';
import ResumenCompra from '../../components/ResumenCompra';
import styles from '../proceso-pedido.module.css';

export default function Paso3Page() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [clientProfile, setClientProfile] = useState(null);
  const [pedido, setPedido] = useState(null);
  const [vendedorId, setVendedorId] = useState(searchParams.get('vendedorId'));
    
  useEffect(() => {
    fetchPerfil();
    const pedidoId = sessionStorage.getItem("currentPedidoId");
  
    if (pedidoId) {
      fetchPedido(pedidoId);
    } else {
      router.push('/cliente/carrito');
    }
  }, []);

  const fetchPedido = async (id) => {
    try {
      const token = sessionStorage.getItem("token");
      const res = await fetch(`/pedidoMs/pedidos/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setPedido(data);
      } else {
        console.error("No se pudo recuperar el pedido");
      }
    } catch (error) {
      console.error("Error de red:", error);
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

  const handleBackButton = () => {
    router.back();
  };

  return (
    <div className={styles.page}>
      <Navbar profile={clientProfile} onAddressUpdate={handleRefreshProfile} disableAddressModal={true}/>

      <main className={styles.main}>
        <div className={styles.header}>
          <button onClick={handleBackButton} className={styles.backBtn}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
               <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
            </svg>
          </button>
          <h1 className={styles.title}>PROGRESO DE PEDIDO</h1>
        </div>

        <Stepper activeStep={3} />

        <div className={styles.contentRow}>
          <div className={styles.contentLeft}>
            <h2 className={styles.sectionTitle}>Datos personales</h2>

            <div className={styles.datosCard}>
              <p className={styles.datosRow}><strong>Nombre:</strong> {clientProfile?.nombre || '-'}</p>
              <p className={styles.datosRow}><strong>Apellido:</strong> {clientProfile?.apellido || '-'}</p>
              <p className={styles.datosRow}><strong>Telefono:</strong> {clientProfile?.telefono || '-'}</p>
              <p className={styles.datosRow}><strong>Email:</strong> {clientProfile?.email || '-'}</p>
            </div>
          </div>
          <ResumenCompra 
            realizaEnvios={pedido?.metodoEnvio === 'ENVIO_A_DOMICILIO'} 
            subtotal={pedido?.montoTotalProductos || 0}
            comisionApp={pedido?.comisionApp || 0}
            costoEnvio={pedido?.costoEnvio || 0}
            items={pedido?.detalles?.reduce((acc, item) => acc + item.cantidad, 0) || 0}
          />
        </div>

        <div className={styles.continueBtnWrapper}>
          <Link href="/cliente/proceso-pedido/paso4" className={styles.continueBtn}>
            Continuar
          </Link>
        </div>
      </main>
      <ChatbotFlotante profile={clientProfile} />
      <Footer />
    </div>
  );
}
