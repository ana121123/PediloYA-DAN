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
import styles from '../proceso-pedido.module.css';
import BtnMercadoPago from '../../components/BtnMercadoPago';

export default function Paso4Page() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [preferenceId, setPreferenceId] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const [paymentMethod, setPaymentMethod] = useState('mercadopago');
  const [clientProfile, setClientProfile] = useState(null);
  const [pedido, setPedido] = useState(null);
  const [vendedorId, setVendedorId] = useState(searchParams.get('vendedorId'));
  
  useEffect(() => {
    fetchPerfil();
    const pedidoId = sessionStorage.getItem("currentPedidoId");
    if (pedidoId) {
      fetchPedido(pedidoId);
      crearPreferenciaPago(pedidoId);
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
      }
    } catch (error) {
      console.error("Error cargando pedido:", error);
    }
  };

  const crearPreferenciaPago = async (pedidoId) => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem("token");
      const res = await fetch(`/pagoMs/api/pagos/create-preference/${pedidoId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPreferenceId(data.preferenceId); 
      }
    } catch (error) {
      console.error("Error creando preferencia:", error);
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

        <Stepper activeStep={4} />

        <div className={styles.contentRow}>
          <div className={styles.contentLeft}>
            <h2 className={styles.sectionTitle}>Medio de pago</h2>
            <p className={styles.sectionSubtitle}>Elija un medio de pago...</p>

            <div className={styles.paymentOption}>
              <input
                type="radio"
                name="payment"
                value="mercadopago"
                checked={paymentMethod === 'mercadopago'}
                onChange={() => setPaymentMethod('mercadopago')}
              />
              <div className={styles.paymentContent}>
                <div className={styles.paymentDetails}>
                  <span className={styles.paymentName}>Mercado Pago</span>
                  <p className={styles.paymentDesc}>
                    La plataforma de pago mas confiable de Latinoamerica.
                    Usa tus tarjetas de credito y debito.
                  </p>
                  <p className={styles.paymentDesc}>
                    Al presionar el boton de abajo, sera redirigido a la
                    aplicacion de <em>Mercado Pago</em> para completar tu pago de
                    forma segura. Una vez finalizado, volveras
                    automaticamente a nuestra aplicacion.
                  </p>
                  <div className={styles.btnContainer}>
                    {loading && !preferenceId && (
                      <p className={styles.paymentDesc}>Generando link de pago...</p>
                    )}
                    {preferenceId && <BtnMercadoPago preferenceId={preferenceId} />}
                  </div>
                </div>
                <Image
                  src="/cliente/mercado-pago.png"
                  alt="Mercado Pago"
                  width={60}
                  height={40}
                  className={styles.paymentLogo}
                />
              </div>
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
      </main>
      <ChatbotFlotante profile={clientProfile} />
      <Footer />
    </div>
  );
}
