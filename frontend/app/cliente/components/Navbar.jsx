'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from "next/navigation";
import Link from 'next/link';
import Image from "next/image"
import { usePathname } from 'next/navigation';
import styles from './Navbar.module.css';
import AddressModal from './AddressModal';
import NewAddressModal from './NewAddressModal';
import { useAppDialog } from '../../../components/ui/app-dialog';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import toast, { Toaster } from 'react-hot-toast';
import CalificarVendedorModal from './CalificarVendedorModal';

export default function Navbar({ showSearchBar = false, profile, onAddressUpdate, disableAddressModal = false, onNotificationReceived }) {
  const { showAlert } = useAppDialog();
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
  const [newAddressOpen, setNewAddressOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [showDisabledNotice, setShowDisabledNotice] = useState(false);
  const pathname = usePathname();

  const [notificaciones, setNotificaciones] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const notifRef = useRef(null);
  const userRef = useRef(null);
  const addressRef = useRef(null);
  const notifOpenRef = useRef(false);
  const onNotificationReceivedRef = useRef(onNotificationReceived);

  const [calificarOpen, setCalificarOpen] = useState(false);
  const [calificarPedidoId, setCalificarPedidoId] = useState(null);
  const [calificarNombreVendedor, setCalificarNombreVendedor] = useState(null);
  const [pendientesCalificar, setPendientesCalificar] = useState([]);

  const handleLogout = () => {
    sessionStorage.clear()
    window.location.href = "/login"
  }

  const handleSuccessSave = async () => {
    setNewAddressOpen(false);

    if (onAddressUpdate) {
        await onAddressUpdate(); 
    }

    setAddressOpen(true);    
  };

  useEffect(() => {
    const fetchPendientesCalificar = async () => {
      const token = sessionStorage.getItem("token");
      const res = await fetch('/pedidoMs/pedidos/pendientes-calificar', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) {
          setPendientesCalificar(data); // nuevo estado: cola de pedidos por calificar
          setCalificarPedidoId(data[0].id);
          setCalificarNombreVendedor(data[0].nombreVendedor);
          setCalificarOpen(true);
        }
      }
    };
    fetchPendientesCalificar();
  }, []);

  useEffect(() => {
    const fetchNotif = async () => {
      const token = sessionStorage.getItem("token");
      const res = await fetch('/pedidoMs/notificaciones', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const normalized = data.map((n) => ({
          ...n,
          leida: Boolean(n.leida),
          destacada: Boolean(n.destacada),
        }));
        setNotificaciones(normalized);
      }
    };
    fetchNotif();
  }, []);

  useEffect(() => {
    setUnreadCount(notificaciones.filter(n => !n.leida).length);
  }, [notificaciones]);

  useEffect(() => {
    notifOpenRef.current = notifOpen;
  }, [notifOpen]);

  useEffect(() => {
    onNotificationReceivedRef.current = onNotificationReceived;
  }, [onNotificationReceived]);

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:8082/pedidoMs/ws-notifications';
    const socket = new SockJS(wsUrl);
    const token = sessionStorage.getItem("token");
    const client = new Client({
      webSocketFactory: () => socket,
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      debug: (str) => console.log(str), 
      onConnect: () => {
        console.log("¡CONECTADO AL WS!");
        client.subscribe('/user/queue/updates', (msg) => {
          const nuevaNotif = JSON.parse(msg.body);
          const isOpen = notifOpenRef.current;
          const normalizada = {
            ...nuevaNotif,
            leida: isOpen ? true : Boolean(nuevaNotif.leida),
            destacada: isOpen ? true : Boolean(nuevaNotif.destacada),
          };

          // detectar entrega y disparar el modal de calificación 
          const estado = extractEstadoFromMensaje(nuevaNotif.mensaje);
          if (estado === 'ENTREGADO' && nuevaNotif.pedidoId) {
            setPendientesCalificar(prev => {
              if (prev.some(p => p.id === nuevaNotif.pedidoId)) return prev;
              const nuevos = [...prev, { id: nuevaNotif.pedidoId, vendedorId: null }];
              if (!calificarOpen) {
                setCalificarPedidoId(nuevos[0].id);
                setCalificarOpen(true);
              }
              return nuevos;
            });
          }

          if (onNotificationReceivedRef.current) {
            onNotificationReceivedRef.current(normalizada);
          }

          toast.custom((t) => (
            <div className={`${styles.toast} ${t.visible ? styles.toastEnter : styles.toastLeave}`}>
              <div className={styles.toastIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff4b7e" strokeWidth="2">
                  <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 01-3.46 0" />
                </svg>
              </div>
              <div className={styles.toastText}>{formatMessage(normalizada.mensaje)}</div>
            </div>
          ), {
            duration: 4000,
            position: 'bottom-right',
          });

          setNotificaciones(prev => {
            if (prev.some(n => n.id === normalizada.id)) return prev;
            return [normalizada, ...prev];
          });
        });
      },
    });

    client.activate();
    return () => client.deactivate();
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false);
      if (addressRef.current && !addressRef.current.contains(e.target)) setAddressOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const savedId = sessionStorage.getItem("selectedAddressId");
    if (savedId) {
      setSelectedAddressId(savedId);
    }
  }, [profile]);

  useEffect(() => {
    const handleStorageChange = () => {
      setSelectedAddressId(sessionStorage.getItem("selectedAddressId"));
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const getDireccionTexto = () => {
    if (!profile || !profile.direcciones || profile.direcciones.length === 0) {
      return "Mi dirección";
    }
    const direccionSeleccionada = profile.direcciones.find(d => d.id === selectedAddressId);
    const direccionAMostrar = direccionSeleccionada || profile.direcciones[0];
    const { calle, numero, localidad } = direccionAMostrar;

    return `${calle} ${numero}, ${localidad}`;
  };

  const handleSearchRedirection = (e) => {
    e.preventDefault();
    const selectedAddressId = sessionStorage.getItem("selectedAddressId");
    if (!selectedAddressId) {
      showAlert({
        title: "Dirección requerida",
        description: "Por favor, selecciona una dirección antes de buscar.",
      });
      return;
    }

    window.location.href = `/cliente/buscar?q=${encodeURIComponent(searchQuery)}`;
  };

  const handleMarcarLeidas = async () => {
    setNotificaciones(prev => prev.map(n => ({
      ...n,
      leida: true,
      destacada: false,
    })));

    const token = sessionStorage.getItem("token");
    try {
      await fetch('/pedidoMs/notificaciones/leer-todas', {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch {
      // Ignore network errors; UI will stay in sync locally.
    }
  };

  const formatMessage = (text) => {
    if (!text) return text;
    // Lista de estados para resaltar
    const baseStatuses = [
      "RECHAZADO",
      "ACEPTADO",
      "EN_PREPARACION",
      "EN_ENVIO",
      "ENTREGADO",
      "EN_ESPERA",
      "REALIZADO",
      "PENDIENTE",
      "PAGADO",
      "APROBADO",
      "EN_CAMINO",
      "CANCELADO",
    ];

    const statuses = baseStatuses.flatMap((s) => {
      if (!s.includes("_")) return [s];
      const spaced = s.replaceAll("_", " ");
      const dashed = s.replaceAll("_", "-");
      return [s, spaced, dashed];
    });

    const regex = new RegExp(`(${statuses.join('|')})`, 'gi');
    return text.split(regex).map((part, i) => 
      statuses.some(s => s.toLowerCase() === part.toLowerCase()) 
        ? <span key={i} className={styles.statusHighlight}>{part}</span> 
        : part
    );
  };

  const extractEstadoFromMensaje = (mensaje = "") => {
    const match = mensaje.match(/\b(REALIZADO|ACEPTADO|RECHAZADO|EN_PREPARACION|EN_ESPERA|EN_ENVIO|ENTREGADO|CANCELADO|PENDIENTE)\b/i);
    return match ? match[1].toUpperCase() : null;
  };

  const avanzarCola = () => {
    setPendientesCalificar(prev => {
      const restantes = prev.slice(1);
      if (restantes.length > 0) {
        setCalificarPedidoId(restantes[0].id);
        setCalificarNombreVendedor(restantes[0].nombreVendedor);
      } else {
        setCalificarOpen(false);
        setCalificarPedidoId(null);
        setCalificarNombreVendedor(null);
      }
      return restantes;
    });
  };

  return (
   <>
    {/* ========== NAVBAR ========== */}
    <nav className={styles.navbar}>
      <div className={styles.navbarInner}>
      <div className={styles.navLeft}>
        <Link href="/cliente" className={styles.logo}>
          <Image src="/logo.png" alt="PediloYa Logo" width={50} height={60} className={styles.logo} priority />
          <span className={styles.logoText}>PediloYa</span>
        </Link>

        <div className={styles.addressSelector} ref={addressRef}>
          <button
            className={styles.addressBtn}
            onClick={() => {
              if (disableAddressModal) {
                setShowDisabledNotice(true);
                setTimeout(() => setShowDisabledNotice(false), 3000);
              } else {
                setAddressOpen(!addressOpen);
              }
            }}
            style={{ cursor: 'pointer' }}
          >
            {/*<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e84c6a" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>*/}
            <Image src="/pin-de-ubicacion.png" alt="Pin de ubicación" width={30} height={40} />
            <span className={styles.addressLabel}>
              <small className={styles.addressSmall}>Enviar a</small>
              {getDireccionTexto()}
            </span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          {showDisabledNotice && (
            <div style={{
              position: 'absolute',
              top: '110%',
              left: '0',
              backgroundColor: '#ff628e',
              color: '#fff',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              zIndex: 1000,
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}>
              No puedes cambiar la dirección en esta página
            </div>
          )}

          <AddressModal 
            isOpen={addressOpen} 
            onClose={() => setAddressOpen(false)} 
            direcciones={profile?.direcciones} 
            onOpenNewAddress={() => {
              setAddressOpen(false); 
              setNewAddressOpen(true);
            }}
          />

          <NewAddressModal 
            isOpen={newAddressOpen}
            onClose={handleSuccessSave}
            onSuccess={handleSuccessSave}
          />
        </div>

        {showSearchBar && (
          <div className={styles.searchBarWrapper}>
            <input
              className={styles.searchInput}
              type="text"
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchRedirection(e)}
            />
            <button onClick={handleSearchRedirection} className={styles.searchBtn}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                  <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <div className={styles.navRight}>
        <div className={styles.iconWrapper} ref={notifRef}>
          <button className={styles.iconBtn} onClick={() => { setNotifOpen((prev) => !prev); setUserOpen(false); }}>
            <div className={styles.notifBadgeWrapper}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ff4b7e" strokeWidth="2">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 01-3.46 0" />
              </svg>
              {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
            </div>
          </button>
          {notifOpen && (
            <div className={styles.popover}>
              <div className={styles.popoverHeader}>
                <div className={styles.popoverHeaderIcon}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff4b7e" strokeWidth="2">
                    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 01-3.46 0" />
                  </svg>
                  <span>Notificaciones</span>
                </div>
                <button onClick={handleMarcarLeidas} className={styles.clearBtn}>Marcar como leidas</button>
              </div>
              <div className={styles.notifList}>
                {notificaciones.length > 0 ? (
                  notificaciones.map(n => (
                    <div key={n.id} className={`${styles.notifItem} ${(!n.leida || n.destacada) ? styles.unreadLine : ''}`}>
                      <p>{formatMessage(n.mensaje)}</p>
                      <small>{new Date(n.fechaHora).toLocaleString()}</small>
                    </div>
                  ))
                ) : (
                  <div className={styles.emptyNotif}>
                    <strong>No tenes notificaciones</strong>
                    <p>¡Aprovecha para descubrir productos increibles!</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <Link href="/cliente/carrito" className={styles.iconBtn}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ff4b7e" strokeWidth="2">
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
          </svg>
        </Link>

        <div className={styles.iconWrapper} ref={userRef}>
          <button className={styles.userBtn} onClick={() => { setUserOpen(!userOpen); setNotifOpen(false); }}>
            <div className={styles.avatar}>
              {profile?.foto ? (
                <img src={profile.foto} alt="Foto de perfil" className={styles.avatar} />
              ) : (
              <Image src="/perfil.png" alt="Foto de perfil" width={35} height={45} />
              )}
            </div>
            <span className={styles.userName}>{profile?.nombre}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          {userOpen && (
            <div className={styles.popover}>
              <div className={styles.userMenuHeader}>
                <div className={styles.avatar}>
                  {profile?.foto ? (
                    <img src={profile.foto} alt="Foto de perfil" className={styles.avatar} />
                  ) : (
                  <Image src="/perfil.png" alt="Foto de perfil" width={35} height={45} />
                  )}
                </div>
                <span>{profile ? `${profile.nombre} ${profile.apellido}` : "Cargando..."}</span>
              </div>
              <ul className={styles.userMenuList}>
                <li>
                  <Link href="/cliente" onClick={() => setUserOpen(false)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                    Inicio
                  </Link>
                </li>
                <li>
                  <Link href="/cliente/perfil" onClick={() => setUserOpen(false)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                    Mi perfil
                  </Link>
                </li>
                <li>
                  <Link href="/cliente/pedidos" onClick={() => setUserOpen(false)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>
                    Mis pedidos
                  </Link>
                </li>
                <li>
                  <Link href="/cliente/direcciones" onClick={() => setUserOpen(false)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
                    Mis direcciones
                  </Link>
                </li>
                <li>
                  <Link href="/" className={styles.logoutLink} onClick={handleLogout}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                    Salir
                  </Link>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
      </div>
    </nav>
    <Toaster 
      position="bottom-right"
      containerStyle={{ zIndex: 99999 }}
    />
    <CalificarVendedorModal
      isOpen={calificarOpen}
      pedidoId={calificarPedidoId}
      nombreVendedor={calificarNombreVendedor}
      onSuccess={avanzarCola}
      onSkip={avanzarCola}
    />
    </>
  );
}
