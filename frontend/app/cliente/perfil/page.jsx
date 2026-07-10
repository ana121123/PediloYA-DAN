"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import styles from "./perfil.module.css"
import Link from "next/link"
import Image from "next/image"
import ClienteNavbar from "../components/Navbar"
import Footer from '../components/Footer';
import ChatbotFlotante from '../components/ChatbotFlotante';
import LoadingScreen from "../../../components/loading-screen"
import { useAppDialog } from "../../../components/ui/app-dialog"

export default function ClientePerfilPage() {
  const { showAlert } = useAppDialog()
  const router = useRouter()
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errors, setErrors] = useState({})

  // Estado para previsualizar imágenes cargadas
  const [previews, setPreviews] = useState({
    foto: null
  })

  const [formData, setFormData] = useState({
    email: "",
    nombre: "",
    apellido: "",
    telefono: "",
    foto:null
  })

  const [perfilGuardado, setPerfilGuardado] = useState({
    nombre: "",
    apellido: "",
    foto: null
  })

  const [clientProfile, setClientProfile] = useState(null)

  // ========= EFFECTS (CARGA DE DATOS) =========
  useEffect(() => {
    const token = sessionStorage.getItem("token")
    const rol = sessionStorage.getItem("rol")

    if (!token || rol !== "CLIENTE") {
      window.location.href = "/login"
      return
    }

    const cargarDatos = async () => {
      try {
        const resPerfil = await fetch('/pedidoMs/clientes/perfil', {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }
        })

        if (resPerfil.status === 401 || resPerfil.status === 403) {
            sessionStorage.clear(); 
            window.location.href = "/login?expired=true"; 
            return;
        }

        if (resPerfil.ok) {
            const data = await resPerfil.json()

            // --- LLENADO DEL FORMULARIO ---
            setFormData({
                email: data.email || "", 
                telefono: data.telefono || "",
                nombre: data.nombre || "",
                apellido: data.apellido|| "",
                foto: data.foto
            })

            setPerfilGuardado({
                nombre: data.nombre || "",
                apellido: data.apellido || "",
                foto: data.foto || null
            })

            setPreviews(prev => ({
                ...prev, 
                foto: data.foto || null  
            }))

            setClientProfile(data)
        }
      } catch (error) {
        console.error("Error cargando datos:", error)
      } finally {
        setLoadingData(false)
        setIsInitialLoading(false)
      }
    }

    cargarDatos()
  }, [])

  
  useEffect(() => {
    const token = sessionStorage.getItem("token")
    const rol = sessionStorage.getItem("rol")

    if (!token || rol !== "CLIENTE") {
      router.push("/login")
    }
  }, [router])

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
      } else if (errors.global) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, [errors]);

  // MANEJADOR PARA CAMPOS SIMPLES (Nivel superior)
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  // MANEJADOR DE IMÁGENES
  const handleImageChange = (e, type) => {
    const file = e.target.files[0]
    if (file) {
      setFormData(prev => ({ ...prev, [type]: file }))
      const objectUrl = URL.createObjectURL(file)
      setPreviews(prev => ({ ...prev, [type]: objectUrl }))
    }
  }

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result)
      reader.onerror = (error) => reject(error)
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSaving(true)
    setLoadingData(true)
    setErrors({})

    try {
      const token = sessionStorage.getItem("token")
      
      // CONVERTIR IMÁGENES (Solo si son archivos nuevos)
      // Inicializamos con lo que tenga formData (null, URL vieja o Base64 viejo)
      let fotoToSend = formData.foto;

      // Solo si el usuario subió un archivo NUEVO (es tipo File), generamos el nuevo Base64
      if (formData.foto instanceof File) {
        fotoToSend = await fileToBase64(formData.foto);
      }

      // ARMAR EL JSON (DTO)
      const vendedorUpdateDTO = {
        nombre: formData.nombre,
        apellido: formData.apellido,
        telefono: formData.telefono,
        // Enviamos las imágenes como STRING Base64
        foto: fotoToSend
      }

      // ENVIAR COMO JSON 
      const response = await fetch('/pedidoMs/clientes/actualizar', {
        method: 'PUT', 
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(vendedorUpdateDTO)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

          if (errorData) {
            setErrors(errorData);
          } else {
             setErrors({ global: "Error desconocido en el servidor" });
          }
          return; 
      }

      await showAlert({
        title: "Operación exitosa",
        description: "¡Perfil actualizado correctamente!",
      })

      setPerfilGuardado({
        nombre: formData.nombre,
        apellido: formData.apellido,
        foto: fotoToSend
      })

      setClientProfile(prev => ({
        ...prev,
        nombre: formData.nombre,
        apellido: formData.apellido,
        telefono: formData.telefono,
        foto: fotoToSend
      }))

    } catch (error) {
      console.error(error)
      await showAlert({
        title: "Error",
        description: "Hubo un error al guardar los cambios: " + error.message,
      })
    } finally {
      setLoadingData(false)
      setIsSaving(false)
    }
  }

  const handleNavigate = (path) => window.location.href = path
  const handleLogout = () => { sessionStorage.clear(); window.location.href = "/login" }

  const handleRemoveImage = (e, field) => {
    e.preventDefault() 
    e.stopPropagation()

    setPreviews((prev) => ({ ...prev, [field]: null }))
    setFormData((prev) => ({ ...prev, [field]: null }))
  }

  if (isInitialLoading) {
    return <LoadingScreen text="Cargando perfil..." />
  }

  return (
    <div className={styles.pageWrapper}>
      <ClienteNavbar profile={clientProfile} />

      {/* CONTENT */}
      <div className={styles.content}>
        <div className={styles.header}>
          <button className={styles.carouselButton} onClick={() => router.back()}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
            </svg>
          </button>
          <h1 className={styles.pageTitle}>MI PERFIL</h1>
        </div>

        <h2 className={styles.formTitle}>Información de tu perfil</h2>
        <div className={styles.formContainer}>
          <form onSubmit={handleSubmit}>
            {/* Uploaders */}
              <div className={styles.uploadersRow}>
                {/* FOTO UPLOAD */}
                <div className={styles.formGroup}>
                  <label className={styles.uploadBox} htmlFor="foto-upload">
                    <input 
                      type="file" 
                      id="foto-upload" 
                      hidden
                      accept="image/*"
                      onChange={(e) => handleImageChange(e, 'foto')}
                    />
                    {previews.foto ? (
                      <div className={styles.previewWrapper}> 
                        <img src={previews.foto} alt="Foto preview" className={styles.imagePreview} />
                        
                        <button 
                          className={styles.removeButton} 
                          onClick={(e) => handleRemoveImage(e, 'foto')}
                          type="button"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                          </svg>
                        </button>
                      </div> 

                    ) : (
                      <div className={styles.placeholderContent}>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="#d1d5db">
                          <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                        </svg>
                        <span style={{fontSize: '12px', color: '#6b7280', marginTop: '5px'}}>Subir Foto</span>
                      </div>
                    )}
                  </label>
                  <p className={styles.uploadLabel}>Foto de perfil</p>
                </div>
              </div>

            {/* email*/}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Email (No editable)</label>
              <input 
                type="email" 
                name="email" 
                value={formData.email} 
                readOnly 
                className={`${styles.formInput} bg-gray-100 text-gray-500 cursor-not-allowed`} 
              />
              {errors.email && <p className={styles.errorMsg}>{errors.email}</p>}
            </div>

            {/* Nombre */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Nombre</label>
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleInputChange}
                className={styles.formInput}
              />
              {errors.nombre && <p className={styles.errorMsg}>{errors.nombre}</p>}
            </div>

            {/* Apellido */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Apellido</label>
              <input
                type="text"
                name="apellido"
                value={formData.apellido}
                onChange={handleInputChange}
                className={styles.formInput}
              />
              {errors.apellido && <p className={styles.errorMsg}>{errors.apellido}</p>}
            </div>

            {/* Teléfono */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Teléfono</label>
              <input
                type="tel"
                name="telefono"
                value={formData.telefono}
                onChange={handleInputChange}
                className={styles.formInput}
              />
              {errors.telefono && <p className={styles.errorMsg}>{errors.telefono}</p>}
            </div>

            {errors.global && (
                <div className={styles.errorMessage}>
                  <span>{errors.global}</span>
                </div>
            )}

            {/* Submit Button */}
            <button type="submit" className={styles.submitButton} disabled={isSaving}>
              {isSaving ? "Cargando..." : "Guardar Cambios"}
            </button>
          </form>
        </div>
      </div>

      <ChatbotFlotante profile={clientProfile} />
      <Footer />
    </div>
  )
}
