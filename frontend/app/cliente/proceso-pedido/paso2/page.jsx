'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import ChatbotFlotante from '../../components/ChatbotFlotante';
import Stepper from '../../components/Stepper';
import ResumenCompra from '../../components/ResumenCompra';
import { useAppDialog } from '../../../../components/ui/app-dialog';
import styles from '../proceso-pedido.module.css';

export default function Paso2Page() {
  const { showAlert } = useAppDialog();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [vendedorId, setVendedorId] = useState(searchParams.get('vendedorId'));
  const [deliveryType, setDeliveryType] = useState('address');
  const [clientProfile, setClientProfile] = useState(null);
  const [direcciones, setDirecciones] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [costoEnvio, setCostoEnvio] = useState(0);
  const [saving, setSaving] = useState(false);
  const [pedido, setPedido] = useState(null);

  useEffect(() => {
    fetchPerfil();
    const pedidoId = sessionStorage.getItem("currentPedidoId");
    if (pedidoId) {
      fetchPedido(pedidoId);
    } else {
      router.push('/cliente/carrito');
    }
  }, []);

  useEffect(() => {
    if (pedido) {
      if (pedido.realizaEnvios) {
        fetchDireccionesValidas();
      } else {
        setDeliveryType('pickup');
        setCostoEnvio(0);
      }
    }
  }, [pedido]);

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
      console.error("Error fetching pedido:", error);
    }
  };

  const fetchDireccionesValidas = async () => {
    try {
      const nombreLocalidad = pedido?.localidadVendedor;

      if (!nombreLocalidad || !nombreLocalidad.trim()) {
        console.warn("El vendedor no tiene localidad definida o válida.");
        return;
      }
      
      const token = sessionStorage.getItem("token");

      const resDir = await fetch(`/pedidoMs/direcciones/filtrar?localidad=${encodeURIComponent(nombreLocalidad.trim())}`, {
          headers: { 'Authorization': `Bearer ${token}` }
      });

      if (resDir.ok) {
          const dataDir = await resDir.json();
          const direccionesList = Array.isArray(dataDir) ? dataDir : [];
          setDirecciones(direccionesList);

          const currentId = sessionStorage.getItem("selectedAddressId");
          const isValid = direccionesList.find(d => d.id === currentId);

          if (!isValid && direccionesList.length > 0) {
              const newDefault = direccionesList[0];
              handleSelectAddress(newDefault.id);
          } else if (isValid) {
              setSelectedAddressId(currentId);
              fetchCostoEnvio(currentId);
          }
      }
    } catch (error) {
      console.error("Error cargando direcciones:", error);
    }
  };

  const fetchCostoEnvio = async (addressId) => {
    if (!vendedorId || !addressId) return;
    try {
      const token = sessionStorage.getItem("token");
      const res = await fetch(`/pedidoMs/pedidos/costo-envio/${vendedorId}/${addressId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setCostoEnvio(data);
      } else {
        console.error("Error al obtener costo de envío");
      }
    } catch (error) {
      console.error("Error de red al obtener costo de envío:", error);
    }
  };

  const handleRefreshProfile = () => {
    fetchPerfil();
  };
  
  const handleSelectAddress = (id) => {
    setDeliveryType('address');
    setSelectedAddressId(id);
    sessionStorage.setItem("selectedAddressId", id);
    window.dispatchEvent(new Event("storage"));
    fetchCostoEnvio(id);
  };

  const handleContinue = async () => {
    if (deliveryType === 'address' && !selectedAddressId) {
      await showAlert({
        title: "Dirección requerida",
        description: "Por favor selecciona una dirección",
      });
      return;
    }

    setSaving(true);
    try {
      const token = sessionStorage.getItem("token");
      const pedidoId = sessionStorage.getItem("currentPedidoId");

      if (!pedidoId) {
        await showAlert({
          title: "Error",
          description: "Error: No hay pedido en sesión. Vuelve al paso anterior.",
        });
        setSaving(false);
        return;
      }

      const res = await fetch('/pedidoMs/pedidos/confirmar-envio', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          vendedorId: vendedorId,
          idDireccion: deliveryType === 'address' ? selectedAddressId : null,
          metodoEnvio: deliveryType === 'address' ? 'ENVIO_A_DOMICILIO' : 'RETIRO_EN_LOCAL'
        })
      });

      if (res.ok) {
        const pedidoActualizado = await res.json();
        sessionStorage.setItem("currentPedidoId", pedidoActualizado.id);
        router.push(`/cliente/proceso-pedido/paso3?vendedorId=${vendedorId}`);
      } else {
        const errorData = await res.json().catch(() => ({}));
        await showAlert({
          title: "Error",
          description: `Error: ${errorData.message || 'No se pudo confirmar el envío'}`,
        });
      }
    } catch (error) {
      console.error("Error al confirmar envío:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.page}>
      <Navbar profile={clientProfile} onAddressUpdate={handleRefreshProfile} disableAddressModal={true}/>

      <main className={styles.main}>
        <div className={styles.header}>
          <button 
            onClick={() => router.back()} 
            className={styles.backBtn}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
               <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
            </svg>
          </button>
          <h1 className={styles.title}>PROGRESO DE PEDIDO</h1>
        </div>

        <Stepper activeStep={2} />

        <div className={styles.contentRow}>
          <div className={styles.contentLeft}>
            <h2 className={styles.sectionTitle}>Direccion de entrega</h2>
            
            {pedido?.realizaEnvios && (
              <>
                <p className={styles.sectionSubtitle}>Elija una direccion...</p>

                <div className={styles.addressList}>
                  {direcciones.length > 0 ? (
                    direcciones.map((dir, index) => (
                      <div key={dir.id}>
                        <label 
                          className={`${styles.addressOption} ${styles.addressOptionItem}`} 
                          onClick={() => handleSelectAddress(dir.id)} 
                        >
                          <input
                            type="radio"
                            name="deliveryAddress"
                            checked={deliveryType === 'address' && selectedAddressId === dir.id}
                            onChange={() => handleSelectAddress(dir.id)}
                            className={styles.addressRadio}
                          />
                          <div className={styles.addressInfo}>
                            <strong>{dir.calle} {dir.numero}</strong>
                            <span>CP: {dir.codigoPostal} - {dir.localidad}, {dir.provincia}</span>
                          </div>
                        </label>
                        {index < direcciones.length - 1 && <div className={styles.divider}></div>}
                      </div>
                    ))
                  ) : (
                    <div className={styles.emptyAddressMsg}>
                      No tienes direcciones registradas en la localidad del vendedor.
                    </div>
                  )}
                  <div className={styles.divider}></div>
                  <Link href="/cliente/direcciones" className={`${styles.addressOption} ${styles.addAddressLink}`}>
                    <div className={styles.addressInfo}>
                      <p>+ Añadir dirección</p>
                    </div>
                  </Link>
                </div>
              </>
            )}

            {!pedido?.realizaEnvios && (
              <div className={styles.warningAlert}>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className={styles.warningIcon}>
                  <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
                </svg>
                <span>Este vendedor solo admite retiro en el local.</span>
              </div>
            )}

            <label className={styles.retiroOption} onClick={() => {
              setDeliveryType('pickup');
              setCostoEnvio(0);
            }}>
              <input
                type="radio"
                name="delivery"
                value="pickup"
                checked={deliveryType === 'pickup'}
                onChange={() => setDeliveryType('pickup')}
                className={styles.addressRadio}
              />
              <span className={styles.pickupLabelText}>Retiro en local</span>
            </label>
          </div>
          <ResumenCompra 
            realizaEnvios={deliveryType === 'address'} 
            costoEnvio={costoEnvio} 
            subtotal={pedido?.montoTotalProductos || 0}
            comisionApp={pedido?.comisionApp || 0}
            items={pedido?.detalles?.reduce((acc, item) => acc + item.cantidad, 0) || 0}
          />
        </div>

        <div className={styles.continueBtnWrapper}>
          <button onClick={handleContinue} className={styles.continueBtn} disabled={saving}>
            {saving ? 'Guardando...' : 'Continuar'}
          </button>
        </div>
      </main>
      <ChatbotFlotante profile={clientProfile} />
      <Footer />
    </div>
  );
}
