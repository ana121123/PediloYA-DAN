'use client';

import { useState, useEffect } from 'react';
import { useRouter } from "next/navigation"
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import styles from './direcciones.module.css';
import ChatbotFlotante from '../components/ChatbotFlotante';
import NewAddressModal from '../components/NewAddressModal';
import { useAppDialog } from '../../../components/ui/app-dialog';

export default function MisDireccionesPage() {
  const { showAlert, showConfirm } = useAppDialog();
  const router = useRouter()
  const [showModal, setShowModal] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [clientProfile, setClientProfile] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    fetchPerfil();
    const savedId = sessionStorage.getItem("selectedAddressId"); 
    if (savedId) {
      setSelectedId(savedId);
    }
  }, [])

  useEffect(() => {
        const savedId = sessionStorage.getItem("selectedAddressId");
        if (!savedId && clientProfile?.direcciones?.length > 0) {
          const firstId = clientProfile.direcciones[0].id;
          setSelectedId(firstId);
          sessionStorage.setItem("selectedAddressId", firstId);
        }
  }, [clientProfile]);

  const handleSelectChange = (id) => {
    setSelectedId(id);
    sessionStorage.setItem("selectedAddressId", id);

    window.dispatchEvent(new Event("storage"));
  };

  const handleRefreshProfile = () => {
      fetchPerfil();
  };

  const handleDelete = async (id) => {
    if (!id) {
        await showAlert({
          title: "Dirección requerida",
          description: "Por favor, selecciona una dirección para eliminar.",
        });
        return;
    }

    const shouldDelete = await showConfirm({
      title: "Eliminar dirección",
      description: "¿Estás seguro de que querés eliminar esta dirección?",
      confirmText: "Eliminar",
      cancelText: "Cancelar",
    });

    if (!shouldDelete) return;

    const token = sessionStorage.getItem("token");
    
    try {
        const res = await fetch(`/pedidoMs/direcciones/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (res.ok) {
            await showAlert({
              title: "Operación exitosa",
              description: "Dirección eliminada con éxito",
            });
            setSelectedId(null);
            fetchPerfil(); 
            if (id === selectedId) {
              sessionStorage.removeItem("selectedAddressId"); // Borramos la persistencia
            }
        } else {
            const errorData = await res.json().catch(() => ({}));
            await showAlert({
              title: "Error",
              description: errorData.mensaje || "No se pudo eliminar la dirección",
            });
        }
    } catch (error) {
        console.error("Error de red al eliminar:", error);
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
              setAddresses(dataPerfil.direcciones || []);
          } else {
              console.error("Error al obtener perfil del cliente");
          }
  
        } catch (error) {
          console.error("Error de red:", error);
        } 
      }

  const handleNewAddressSuccess = () => {
    setShowModal(false);
    fetchPerfil(); 
  };


  useEffect(() => {
      const token = sessionStorage.getItem("token")
      const rol = sessionStorage.getItem("rol")
  
      if (!token || rol !== "CLIENTE") {
        router.push("/login")
      }
    }, [router])

useEffect(() => {
  const handleExternalStorageChange = () => {
    const savedId = sessionStorage.getItem("selectedAddressId");
    if (savedId) {
      setSelectedId(savedId);
    }
};

  // Escuchamos el evento personalizado que dispara el AddressModal
  window.addEventListener("storage", handleExternalStorageChange);
  
  return () => window.removeEventListener("storage", handleExternalStorageChange);
}, []);

  return (
    <div className={styles.page}>
      <Navbar profile={clientProfile} onAddressUpdate={handleRefreshProfile}/>

      <main className={styles.main}>
        <div className={styles.header}>
          <button className={styles.backBtn} onClick={() => router.back()}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
               <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
            </svg>
          </button>
          <h1 className={styles.title}>MIS DIRECCIONES</h1>
        </div>

        <div className={styles.actions}>
          <button className={styles.addBtn} onClick={() => setShowModal(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Agregar direccion
          </button>

          <button
            className={styles.deleteBtn}
            onClick={() => handleDelete(selectedId)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
            Eliminar direccion
          </button>
        </div>

        <div className={styles.addressList}>
          {clientProfile && addresses.length === 0 ? (
            <p style={{ textAlign: "center", width: "100%", marginTop: "20px", color: "#555" }}>
              No tienes direcciones registradas.
            </p>
          ) : (
            addresses.map((addr) => (
              <div key={addr.id} className={`${styles.addressCard} ${selectedId === addr.id ? styles.addressCardSelected : ''}`}>
                <div className={styles.addressRadioWrapper}>
                  
                    <input
                      type="radio"
                      name="selectedAddress"
                      className={styles.addressRadio}
                      checked={selectedId === addr.id}
                      onChange={() => handleSelectChange(addr.id)}
                    />
                </div>

                <div className={styles.addressDetails}>
                  <strong>{addr.calle} {addr.numero}</strong>
                  <span>CP: {addr.codigoPostal} - {addr.localidad}, {addr.provincia}</span>
                  <span>
                    Observaciones: {addr.observaciones && addr.observaciones.trim() !== "" 
                    ? addr.observaciones 
                    : "—"}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      <ChatbotFlotante profile={clientProfile} /> 
      <Footer />

      {/* New Address Modal */}
      <NewAddressModal 
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={handleNewAddressSuccess}
      />


      
    </div>
  );
}
