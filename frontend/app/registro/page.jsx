"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import styles from "./registro.module.css"
import Image from "next/image";
import { useAppDialog } from "../../components/ui/app-dialog";

export default function RegistroPage() {
  const { showAlert } = useAppDialog();
  const [activeTab, setActiveTab] = useState("cliente")
  const [showPassword, setShowPassword] = useState(false)
  const [showRepeatPassword, setShowRepeatPassword] = useState(false)
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // ========= STATES =========
  // State for cliente
  const [clienteData, setClienteData] = useState({
    email: "",
    password: "",
    repetirPassword: "",
    telefono: "",
    nombre: "",
    apellido: "",
    fechaNacimiento: ""
  })

  // State por vendedor
  const [vendedorData, setVendedorData] = useState({
    email: "",
    password: "",
    repetirPassword: "",
    telefono: "",
    nombreNegocio: "",
    nombreResponsable: "",
    apellidoResponsable: "",
    direccion: {
      provincia: "",
      localidad: "",
      calle: "",
      numero: "",
      codigoPostal: "",
      observaciones: ""
    }
  })

  // States for APIs locations
  const [provincias, setProvincias] = useState([])
  const [localidades, setLocalidades] = useState([])
  const [loadingLocalidades, setLoadingLocalidades] = useState(false)

  // ========= EFFECTS (CARGA DE DATOS) =========
  // Cargar Provincias
  useEffect(() => {
    const fetchProvincias = async () => {
        try {
            const res = await fetch('/usuariosMs/ubicacion/provincias');
            if (res.ok) {
                const data = await res.json();
                setProvincias(data);
            } else {
                console.error("Error al cargar provincias");
            }
        } catch (error) {
            console.error("Error de conexión:", error);
        }
    };
    fetchProvincias();
  }, []);

  // 2. Cargar Localidades cuando cambia la provincia seleccionada
  useEffect(() => {
    const idProvincia = vendedorData.direccion.provincia;
    
    // Si no hay provincia seleccionada, limpiamos las localidades
    if (!idProvincia) {
        setLocalidades([]);
        return;
    }

    const fetchLocalidades = async () => {
        setLoadingLocalidades(true);
        try {
            const res = await fetch(`/usuariosMs/ubicacion/localidades/${idProvincia}`);
            if (res.ok) {
                const data = await res.json();
                setLocalidades(data);
            } else {
                setLocalidades([]);
            }
        } catch (error) {
            console.error("Error cargando localidades:", error);
            setLocalidades([]);
        } finally {
            setLoadingLocalidades(false);
        }
    };

    fetchLocalidades();
  }, [vendedorData.direccion.provincia]);

  // 3. Scroll al primer error detectado
  useEffect(() => {
    const errorKeys = Object.keys(errors);
    
    if (errorKeys.length > 0) {
      const firstFieldWithError = errorKeys.find(key => key !== 'global');

      if (firstFieldWithError) {
        const element = document.querySelector(`[name="${firstFieldWithError}"]`);

        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.focus();
        }
      }
    }
  }, [errors]);

  // ========= VALIDATIONS =========
  const validate = () => {
    let tempErrors = {};
    
    const isCliente = activeTab === "cliente";
    const data = isCliente ? clienteData : vendedorData;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    // Regex: Min 8 chars, 1 Mayus, 1 Minus, 1 Num
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    const phoneRegex = /^\+54\s9\s\d{4}-\d{6}$/;

    // --- Validaciones Comunes ---
    if (!data.email) tempErrors.email = "El email es obligatorio";
    else if (!/\S+@\S+\.\S+/.test(data.email)) tempErrors.email = "El formato del email es inválido";

    if (!data.password) tempErrors.password = "La contraseña es obligatoria";
    else if (!passwordRegex.test(data.password)) {
        tempErrors.password = "Debe tener mín. 8 caracteres, 1 mayúscula, 1 minúscula y 1 número";
    }

    if (!data.repetirPassword) tempErrors.repetirPassword = "Repetir la contraseña es obligatorio";
    else if (data.repetirPassword !== data.password) tempErrors.repetirPassword = "Las contraseñas no coinciden";

  
    if (!data.telefono) {
        tempErrors.telefono = "El teléfono es obligatorio";
    } else if (!phoneRegex.test(data.telefono)) {
        tempErrors.telefono = "Formato requerido: +54 9 XXXX-XXXXXX";
    }

    // --- Validaciones Cliente ---
    if (isCliente) {
        if (!data.nombre) tempErrors.nombre = "El nombre es obligatorio";
        if (!data.apellido) tempErrors.apellido = "El apellido es obligatorio";
        if (!data.fechaNacimiento) tempErrors.fechaNacimiento = "La fecha de nacimiento es obligatoria";
    } 
    // --- Validaciones Vendedor ---
    else {
        if (!data.nombreNegocio) tempErrors.nombreNegocio = "El nombre del negocio es obligatorio";
        else if (data.nombreNegocio.length > 150) tempErrors.nombreNegocio = "Máximo 150 caracteres";
        
        if (!data.nombreResponsable) tempErrors.nombreResponsable = "El nombre del responsable es obligatorio";
        if (!data.apellidoResponsable) tempErrors.apellidoResponsable = "El apellido del responsable es obligatorio";
        
        // Validación de dirección
        if (!data.direccion.provincia) tempErrors.provincia = "La provincia es obligatoria";
        if (!data.direccion.localidad) tempErrors.localidad = "La localidad es obligatoria";
        if (!data.direccion.calle) tempErrors.calle = "La calle es obligatoria";
        if (!data.direccion.numero) tempErrors.numero = "El número es obligatorio";
        
        if (!data.direccion.codigoPostal) tempErrors.codigoPostal = "El CP es obligatorio";
        else if (data.direccion.codigoPostal.length > 5) tempErrors.codigoPostal = "Máximo 5 caracteres"; 

        if (data.direccion.observaciones && data.direccion.observaciones.length > 150) {
             tempErrors.observaciones = "Máximo 150 caracteres";
        }
      }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0; // Retorna true si no hay errores
  };
  
  // ========= HANDLERS =========
  const handleClienteChange = (e) => {
    const { name, value } = e.target
    setClienteData(prev => ({ ...prev, [name]: value }))
  }

  const handleVendedorChange = (e) => {
    const { name, value } = e.target
    const addressFields = ["provincia", "localidad", "calle", "numero", "codigoPostal", "observaciones"];

    if (addressFields.includes(name)) {
      setVendedorData(prev => ({
        ...prev,
        direccion: { 
            ...prev.direccion, 
            [name]: value,
            ...(name === 'provincia' ? { localidad: "" } : {})
        }
      }))
      if (errors[name]) setErrors({...errors, [name]: null});
    } else {
      setVendedorData(prev => ({ ...prev, [name]: value }))
      if (errors[name]) setErrors({...errors, [name]: null});
    }
  }

  const handleSumit = async (e) => {
    e.preventDefault()
    setServerError("")

    if (!validate()) {
        console.log("Formulario inválido", errors);
        return; 
    }
    else {
      try{
        setIsLoading(true)

        let response;
        let url;
        let payload;

        if (activeTab === "cliente"){
          console.log ("Enviando Cliente:", clienteData)
          url ='/usuariosMs/auth/register/cliente';
          payload = clienteData;

        } else {
          console.log ("Enviando Vendedor:", vendedorData)
          url = '/usuariosMs/auth/register/vendedor';
          payload = vendedorData;
        }

        response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })

        const responseText = await response.text();
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (error) {
            data = { message: responseText || "Error desconocido del servidor" };
        }

        if (response.ok) { 
          await showAlert({
            title: "Registro exitoso",
            description: data.message || "Registro exitoso",
          });
          window.location.href = "/login";
        } else {
            if (response.status === 400) {
                setErrors(data);
                if (data.message) setServerError("Por favor revise los datos ingresados.");
            } else {
                setServerError(data.message || "Error al registrar usuario");
            }
        }
      } catch(err){
        setServerError(err.message || "Ocurrió un error inesperado");
        console.error(err);

      } finally {
        setIsLoading(false)
      }
    }

  }

  return (
    <div className={styles.authPage}>
      {/* ========== HEADER ========== */}
      <header className={styles.header}>
        <div className={`${styles.container} ${styles.headerInner}`}>
          <Link href="/" className={styles.logo}>
            <Image src="/logo.png" alt="PediloYa Logo" width={50} height={60} className={styles.logo} priority />
            <span className={styles.logoText}>PediloYa</span>
          </Link>
        </div>
      </header>

      <div className={styles.authCard}>
        <h1 className={styles.authTitle}>Crear Cuenta</h1>
        <p className={styles.authSubtitle}>Únete a PediloYa y comenzá a disfrutar</p>

        {/* Tabs */}
        <div className={styles.authTabs}>
          <button
            type="button"
            className={`${styles.authTab} ${activeTab === "cliente" ? styles.authTabActive : ""}`}
            onClick={() => setActiveTab("cliente")}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
            Cliente
          </button>
          <button
            type="button"
            className={`${styles.authTab} ${activeTab === "vendedor" ? styles.authTabActive : ""}`}
            onClick={() => setActiveTab("vendedor")}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z" />
            </svg>
            Vendedor
          </button>
        </div>

        {/* Cliente Form */}
        {activeTab === "cliente" && (
          <form className={styles.authForm} onSubmit={handleSumit} noValidate>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                <svg className={styles.formLabelIcon} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                </svg>
                Email
              </label>
              <input 
                type="email" 
                name="email"
                value={clienteData.email}
                onChange={handleClienteChange}
                placeholder="tu@email.com" 
                className={styles.formInput}
                required
              />
              {errors.email && <p className={styles.errorMsg}>{errors.email}</p>}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                <svg className={styles.formLabelIcon} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                </svg>
                Contraseña
              </label>
              <div className={styles.formInputWrapper}>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={clienteData.password}
                  onChange={handleClienteChange}
                  placeholder="••••••••"
                  autoComplete="off"
                  className={styles.formInput}
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className={styles.formInputToggle}>
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && <p className={styles.errorMsg}>{errors.password}</p>}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                <svg className={styles.formLabelIcon} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                </svg>
                Repetir Contraseña
              </label>
              <div className={styles.formInputWrapper}>
                <input
                  type={showRepeatPassword ? "text" : "password"}
                  name="repetirPassword"
                  value={clienteData.repetirPassword}
                  onChange={handleClienteChange}
                  placeholder="••••••••"
                  autoComplete="off"
                  className={styles.formInput}
                  required
                />
                <button type="button" onClick={() => setShowRepeatPassword(!showRepeatPassword)} className={styles.formInputToggle}>
                  {showRepeatPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.repetirPassword && <p className={styles.errorMsg}>{errors.repetirPassword}</p>}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                <svg className={styles.formLabelIcon} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                </svg>
                Teléfono
              </label>
              <input 
                type="tel" 
                name="telefono"
                value={clienteData.telefono}
                onChange={handleClienteChange}
                placeholder="+54 9 XXXX-XXXXXX" 
                className={styles.formInput} 
                required
              />
              {errors.telefono && <p className={styles.errorMsg}>{errors.telefono}</p>}
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Nombre</label>
                <input 
                  type="text" 
                  name="nombre"
                  value={clienteData.nombre}
                  onChange={handleClienteChange}
                  placeholder="Juan" 
                  className={styles.formInput} 
                  required
                />
                {errors.nombre && <p className={styles.errorMsg}>{errors.nombre}</p>}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Apellido</label>
                <input 
                  type="text" 
                  name="apellido"
                  value={clienteData.apellido}
                  onChange={handleClienteChange}
                  placeholder="García" 
                  className={styles.formInput} 
                  required
                />
                {errors.apellido && <p className={styles.errorMsg}>{errors.apellido}</p>}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Fecha de Nacimiento</label>
              <input 
                type="date" 
                name="fechaNacimiento"
                value={clienteData.fechaNacimiento}
                onChange={handleClienteChange}
                placeholder="dd/mm/aaaa" 
                className={styles.formInput} 
                required
              />
              {errors.fechaNacimiento && <p className={styles.errorMsg}>{errors.fechaNacimiento}</p>}
            </div>

            {serverError && (
                <div className={styles.errorMessage}>
                  <span>{serverError}</span>
                </div>
            )}

            <button type="submit" className={styles.submitButton} disabled={isLoading}>
              {isLoading ? "Registrando..." : "Crear Cuenta"}
            </button>
          </form>
        )}

        {/* Vendedor Form */}
        {activeTab === "vendedor" && (
          <form className={styles.authForm} onSubmit={handleSumit} noValidate>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                <svg className={styles.formLabelIcon} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                </svg>
                Email
              </label>
              <input 
                type="email" 
                name="email"
                value={vendedorData.email}
                onChange={handleVendedorChange}
                placeholder="tu@email.com" 
                className={styles.formInput} 
                required
              />
              {errors.email && <p className={styles.errorMsg}>{errors.email}</p>}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                <svg className={styles.formLabelIcon} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                </svg>
                Contraseña
              </label>
              <div className={styles.formInputWrapper}>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={vendedorData.password}
                  onChange={handleVendedorChange}
                  placeholder="••••••••"
                  autoComplete="off"
                  className={styles.formInput}
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className={styles.formInputToggle}>
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && <p className={styles.errorMsg}>{errors.password}</p>}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                <svg className={styles.formLabelIcon} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                </svg>
                Repetir Contraseña
              </label>
              <div className={styles.formInputWrapper}>
                <input
                  type={showRepeatPassword ? "text" : "password"}
                  name="repetirPassword"
                  value={vendedorData.repetirPassword}
                  onChange={handleVendedorChange}
                  placeholder="••••••••"
                  autoComplete="off"
                  className={styles.formInput}
                  required
                />
                <button type="button" onClick={() => setShowRepeatPassword(!showRepeatPassword)} className={styles.formInputToggle}>
                  {showRepeatPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.repetirPassword && <p className={styles.errorMsg}>{errors.repetirPassword}</p>}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                <svg className={styles.formLabelIcon} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                </svg>
                Teléfono
              </label>
              <input 
                type="tel"
                name="telefono"
                value={vendedorData.telefono}
                onChange={handleVendedorChange} 
                placeholder="+54 9 XXXX-XXXXXX" 
                className={styles.formInput} 
                required
              />
              {errors.telefono && <p className={styles.errorMsg}>{errors.telefono}</p>}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                <svg className={styles.formLabelIcon} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z" />
                </svg>
                Nombre del Negocio
              </label>
              <input 
                type="text"
                name="nombreNegocio"
                value={vendedorData.nombreNegocio}
                onChange={handleVendedorChange} 
                placeholder="Mi Restaurante" 
                className={styles.formInput} 
                required
              />
              {errors.nombreNegocio && <p className={styles.errorMsg}>{errors.nombreNegocio}</p>}
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Nombre del Responsable</label>
                <input 
                  type="text" 
                  name="nombreResponsable"
                  value={vendedorData.nombreResponsable}
                  onChange={handleVendedorChange}
                  placeholder="Camila" 
                  className={styles.formInput} 
                  required
                />
                {errors.nombreResponsable && <p className={styles.errorMsg}>{errors.nombreResponsable}</p>}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Apellido del Responsable</label>
                <input 
                  type="text" 
                  name="apellidoResponsable"
                  value={vendedorData.apellidoResponsable}
                  onChange={handleVendedorChange}
                  placeholder="Rodriguez" 
                  className={styles.formInput} 
                  required
                />
                {errors.apellidoResponsable && <p className={styles.errorMsg}>{errors.apellidoResponsable}</p>}
              </div>
            </div>

            {/* Address Section */}
            <div className={styles.addressSection}>
              <h3 className={styles.addressTitle}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                </svg>
                Domicilio del Negocio
              </h3>

              <div className={styles.addressGrid}>
                <div className={`${styles.addressRow} ${styles.addressRow2}`}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Provincia</label>
                    <select
                      name="provincia"
                      value={vendedorData.direccion.provincia}
                      onChange={handleVendedorChange}
                      placeholder="Buenos Aires" 
                      className={styles.formInput} 
                      required
                    >
                    <option value="">Seleccione</option>
                    {provincias.map((prov) => (
                            <option key={prov.id} value={prov.id}>{prov.nombre}</option>
                      ))}
                    </select>
                    {errors.provincia && <p className={styles.errorMsg}>{errors.provincia}</p>}
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Localidad</label>
                    <select 
                      name="localidad"
                      value={vendedorData.direccion.localidad}
                      onChange={handleVendedorChange}
                      placeholder="Ciudad Autónoma" 
                      className={styles.formInput} 
                      disabled={!vendedorData.direccion.provincia}
                      required
                    >
                      <option value="">{loadingLocalidades ? "Cargando..." : "Seleccione"}</option>
                        {localidades.map((loc) => (
                            <option key={loc.id} value={loc.id}>{loc.nombre}</option>
                        ))}
                    </select>
                    {errors.localidad && <p className={styles.errorMsg}>{errors.localidad}</p>}
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Calle</label>
                  <input 
                    type="text" 
                    name="calle"
                    value={vendedorData.direccion.calle}
                    onChange={handleVendedorChange}
                    placeholder="Avenida Corrientes" 
                    className={styles.formInput} 
                    required
                  />
                  {errors.calle && <p className={styles.errorMsg}>{errors.calle}</p>}
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Numero</label>
                    <input 
                      type="text" 
                      name="numero"
                      value={vendedorData.direccion.numero}
                      onChange={handleVendedorChange}
                      placeholder="1234" 
                      className={styles.formInput} 
                      required
                    />
                    {errors.numero && <p className={styles.errorMsg}>{errors.numero}</p>}
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Código Postal</label>
                    <input 
                      type="text" 
                      name="codigoPostal"
                      value={vendedorData.direccion.codigoPostal}
                      onChange={handleVendedorChange}
                      placeholder="1425" 
                      className={styles.formInput} 
                      required
                    />
                    {errors.codigoPostal && <p className={styles.errorMsg}>{errors.codigoPostal}</p>}
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Notas Adicionales</label>
                  <textarea 
                    name="observaciones"
                    value={vendedorData.direccion.observaciones}
                    onChange={handleVendedorChange}
                    placeholder="Piso, departamento, código de acceso, etc." 
                    className={styles.formTextarea} 
                  />
                  {errors.observaciones && <p className={styles.errorMsg}>{errors.observaciones}</p>}
                </div>
              </div>
            </div>

            {serverError && (
                <div className={styles.errorMessage}>
                  <span>{serverError}</span>
                </div>
            )}

            <button type="submit" className={styles.submitButton} disabled={isLoading}>
              {isLoading ? "Registrando..." : "Crear Cuenta"}
            </button>
          </form>
        )}

        <div className={styles.divider}>
          <span>o</span>
        </div>

        <div className={styles.authFooter}>
          <p className={styles.authFooterText}>
            ¿Tenés una cuenta?{" "}
            <Link href="/login" className={styles.authLink}>
              Ingresá acá
            </Link>
          </p>
        </div>
      </div>
      {/* ========== FOOTER ========== */}
      <footer className={styles.footer}>
          <p className={styles.footerText}>PediloYa © 2026. Todos los derechos reservados.</p>
      </footer>
    </div>
  )
}
