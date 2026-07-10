'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import confetti from 'canvas-confetti';
import ChatbotFlotante from '../../components/ChatbotFlotante';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import Stepper from '../../components/Stepper';
import LoadingScreen from '../../../../components/loading-screen';
import styles from '../proceso-pedido.module.css';

function Paso5Content() {
    const searchParams = useSearchParams();
    const [estadoPago, setEstadoPago] = useState(null);
    const [loading, setLoading] = useState(true);
    
    const externalReference = searchParams.get('external_reference');

    useEffect(() => {
        if (externalReference) {
            consultarEstadoPago(externalReference);
        }
    }, [externalReference]);

    const consultarEstadoPago = async (pedidoId) => {
        setLoading(true);
        try {
            const res = await fetch(`/pagoMs/api/pagos/estado/${pedidoId}`);
            if (res.ok) {
                const data = await res.json();
                setEstadoPago(data);
                if (data.estado === 'APROBADO') {
                    dispararConfeti();

                } else if (data.estado === 'PENDIENTE') {
   
                }
            } else {
                setEstadoPago({ estado: 'ERROR', mensaje: 'No se pudo obtener el estado del pago' });
            }
        } catch (error) {
            console.error("Error consultando estado:", error);
            setEstadoPago({ estado: 'ERROR', mensaje: 'Error de conexión' });
        } finally {
            setLoading(false);
        }
    };

    const dispararConfeti = () => {
        confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#e84c6a', '#22c55e', '#ffffff']
        });
    };

    const renderStatusContent = () => {

        if (!estadoPago) {
            return (
                <>
                    <div className={styles.errorIcon}>❌</div>
                    <h2 className={styles.errorTitle}>Error al cargar información</h2>
                    <p className={styles.successSubtitle}>No se pudo obtener el estado del pago.</p>
                </>
            );
        }

        switch (estadoPago.estado) {
            case 'APROBADO':
                return (
                    <>
                        <Image src="/cliente/chica-ok.png" alt="Éxito" width={240} height={240} className={styles.successImg} />
                        <h2 className={styles.successTitle}>¡Pago aprobado!</h2>
                        <p className={styles.successSubtitle}>Tu pedido <b>#{externalReference}</b> ya se está preparando.</p>
                        <p className={styles.infoText}>Transacción: {estadoPago.idMP}</p>
                    </>
                );
            case 'PENDIENTE':
                return (
                    <>
                        <div className={styles.pendingIcon}>⏳</div>
                        <h2 className={styles.successTitle}>Pago pendiente</h2>
                        <p className={styles.successSubtitle}>Estamos esperando la confirmación de tu pago.</p>
                        <p className={styles.infoText}>El restaurante iniciará el pedido cuando el pago se acredite. Si realizaste el pago, puede tomar algunos minutos en procesarse.</p>
                    </>
                );
            case 'SIN_PAGO':
            case 'RECHAZADO':
            default:
                return (
                    <>
                        <div className={styles.errorIcon}>❌</div>
                        <h2 className={styles.errorTitle}>No pudimos procesar el pago</h2>
                        <p className={styles.successSubtitle}>{estadoPago.mensaje || 'Hubo un error con tu tarjeta o la operación fue cancelada.'}</p>
                    </>
                );
        }
    };

    if (loading) {
        return <LoadingScreen text="Verificando pago..." />;
    }

    return (
        <div className={styles.successPage}>
            {renderStatusContent()}
            
            <div className={styles.successActions}>
                {estadoPago?.estado === 'APROBADO' || estadoPago?.estado === 'PENDIENTE' ? (
                    <Link href="http://localhost:3000/cliente/pedidos" className={styles.successPrimaryBtn}>Ir a mis pedidos</Link>
                ) : (
                    <Link href="http://localhost:3000/cliente/proceso-pedido/paso4" className={styles.successPrimaryBtn}>Intentar nuevamente</Link>
                )}
                <Link href="http://localhost:3000/cliente" className={styles.successSecondaryBtn}>Volver al inicio</Link>
            </div>
        </div>
    );
}

export default function Paso5Page() {

    return (
        <div className={styles.page}>
            <header className={styles.topNavbar}>
                <div className={`${styles.container} ${styles.headerInner}`}>
                <Link href="http://localhost:3000/cliente" className={styles.logo}>
                    <Image src="/logo.png" alt="PediloYa Logo" width={50} height={60} className={styles.logo} priority />
                    <span className={styles.logoText}>PediloYa</span>
                </Link>
                </div>
            </header>
            <main className={styles.main}>
                <div className={styles.header}>
                    <h1 className={styles.title}>ESTADO DEL PEDIDO</h1>
                </div>
                <Stepper activeStep={5} />
                <Suspense fallback={<LoadingScreen text="Cargando estado del pago..." />}>
                    <Paso5Content />
                </Suspense>
            </main>
            <Footer />
        </div>
    );
}