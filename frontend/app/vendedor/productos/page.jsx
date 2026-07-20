"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import styles from "./productos.module.css"
import Link from "next/link"
import Image from "next/image"
import VendedorNavbar from "../components/vendedor-navbar"
import LoadingScreen from "../../../components/loading-screen"
import { useAppDialog } from "../../../components/ui/app-dialog"

export default function VendedorProductosPage() {
  const { showAlert, showConfirm } = useAppDialog()
  const router = useRouter()
  const nombreRef = useRef(null)

  const [categoriasMap, setCategoriasMap] = useState({})
  const [vendedorProfile, setVendedorProfile] = useState(null)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isNewProduct, setIsNewProduct] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const [fieldErrors, setFieldErrors] = useState({}) 
  const [globalError, setGlobalError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false) 

  const [previews, setPreviews] = useState({
    imagen: null 
  })

  const [products, setProducts] = useState([])
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false)
  
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    precio: "",
    categoria: "",
    subcategoria: "",
    disponible: "",
    observaciones: "",
    imagen: "",
  })

  const [filters, setFilters] = useState({
    categoria: "",
    subcategoria: "",
    disponibilidad: "",
  })

  const filterCount = (filters.categoria ? 1 : 0) + (filters.subcategoria ? 1 : 0) + (filters.disponibilidad ? 1 : 0)

  useEffect(() => {
    const token = sessionStorage.getItem("token")
    const rol = sessionStorage.getItem("rol")

    if (!token || rol !== "VENDEDOR") {
      router.push("/login")
    }

    const fetchDatos = async () => {
          try {
              const headers = {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
              };

              const [perfilRes, productosRes, categoriasRes] = await Promise.all([
                  fetch('/catalogoMs/api/vendedores/perfil', { method: 'GET', headers }),
                  fetch('/catalogoMs/api/vendedores/productos', { method: 'GET', headers }),
                  fetch('/catalogoMs/api/categorias', { method: 'GET', headers })
              ]);

              if (perfilRes.status === 401 || perfilRes.status === 403) {
                  sessionStorage.clear(); 
                  window.location.href = "/login?expired=true"; 
                  return;
              }


              if (perfilRes.ok) {
                  const dataPerfil = await perfilRes.json();
                  setVendedorProfile(dataPerfil); 
              }

              if (productosRes.ok) {
                  const dataProductos = await productosRes.json();
                  setProducts(dataProductos);
              } else {
                  console.error("Error al cargar productos");
              }

              if (categoriasRes.ok) {
                  const mapa = await categoriasRes.json();
                  setCategoriasMap(mapa); 
              }

            } catch (error) {
              console.error("Error de red:", error);
            } finally {
              setIsLoadingData(false)
            }
      }

      fetchDatos();
    }, [router])

    useEffect(() => {
      if (isNewProduct && isEditing && nombreRef.current) {
          nombreRef.current.focus();
      }
    }, [isNewProduct, isEditing]);

  if (isLoadingData) {
    return <LoadingScreen text="Cargando tus productos..." />
  }

  // --- LÓGICA DE FILTRADO Y BÚSQUEDA ---
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          product.descripcion?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = !filters.categoria || product.categoria === filters.categoria;

    const matchesSubcategory = !filters.subcategoria || product.subcategoria === filters.subcategoria;

    const disponibilidadStr = (product.disponible === true || product.disponible === "ACTIVO" || product.disponible === "Disponible") ? "Disponible" : "No disponible";
    const matchesAvailability = !filters.disponibilidad || disponibilidadStr === filters.disponibilidad;

    return matchesSearch && matchesCategory && matchesSubcategory && matchesAvailability;
  });

  const handleBackgroundClick = async () => {
    if (isEditing || isNewProduct) {
        const shouldClose = await showConfirm({
          title: "Descartar cambios",
          description: "Tienes cambios sin guardar. ¿Quieres cerrar y perder los cambios?",
          confirmText: "Sí, cerrar",
          cancelText: "Cancelar",
        })
        if (!shouldClose) return
    }

    if (selectedProduct || isNewProduct || isEditing) {
        setSelectedProduct(null)
        setIsEditing(false)
        setIsNewProduct(false)
        setPreviews({ imagen: null })
        setFormData({
            nombre: "",
            descripcion: "",
            precio: "",
            categoria: "",
            subcategoria: "",
            disponible: "",
            observaciones: "",
            imagen: "",
        })
    }
  }

  // --- HANDLERS ---
  const handleProductClick = (product) => {
    setSelectedProduct(product)
    setFormData({
      nombre: product.nombre,
      descripcion: product.descripcion,
      precio: product.precio.toString(),
      categoria: product.categoria,
      subcategoria: product.subcategoria,
      disponible: product.disponible ? "Disponible" : "No disponible",
      observaciones: product.observaciones || "",
      imagen: product.imagen,
    })
    setPreviews({ imagen: null })
    setIsEditing(false)
    setIsNewProduct(false)
  }

  const handleNuevoClick = () => {
    setSelectedProduct(null)
    setFormData({
      nombre: "",
      descripcion: "",
      precio: "",
      categoria: "",
      subcategoria: "",
      disponible: "",
      observaciones: "",
      imagen: "",
    })
    setPreviews({ imagen: null })
    setIsEditing(true)
    setIsNewProduct(true)
  }

  const handleEditarClick = () => {
    if (selectedProduct) {
      setIsEditing(true)
      setIsNewProduct(false)
    }
  }

  const handleEliminarClick = async () => {
    if (!selectedProduct) return;

    const shouldDelete = await showConfirm({
      title: "Eliminar producto",
      description: `¿Estás seguro de eliminar "${selectedProduct.nombre}"?`,
      confirmText: "Eliminar",
      cancelText: "Cancelar",
    })
    if(!shouldDelete) return;

    const token = sessionStorage.getItem("token")

    try {
        const response = await fetch(`/catalogoMs/api/vendedores/productos/${selectedProduct.id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            setProducts((prev) => prev.filter((p) => p.id !== selectedProduct.id))
            
            setSelectedProduct(null)
            setIsEditing(false)
            setPreviews({ imagen: null })
            setFormData({
                nombre: "",
                descripcion: "",
                precio: "",
                categoria: "",
                subcategoria: "",
                disponible: "",
                observaciones: "",
                imagen: "",
            })
            
            await showAlert({
              title: "Operación exitosa",
              description: "Producto eliminado correctamente",
            })

        } else {
            let mensajeError = "No se pudo eliminar el producto.";
            try {
                const errorData = await response.json();
                if (errorData.error) mensajeError = errorData.error;
            } catch (e) {
            }
            setGlobalError(mensajeError);
        }
    } catch (error) {
        console.error("Error al eliminar:", error);
        setGlobalError("Error de conexión al intentar eliminar.");
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    
    setFormData((prev) => {
        if (name === "categoria") {
            return { ...prev, [name]: value, subcategoria: "" }
        }

        return { ...prev, [name]: value }
    })
  }

  const handleGenerarDescripcion = async () => {
    if (!formData.nombre || !formData.nombre.trim()) {
      await showAlert({
        title: "Falta el nombre",
        description: "Ingresá el nombre del producto antes de generar la descripción.",
      })
      return
    }

    setIsGeneratingDesc(true)
    const token = sessionStorage.getItem("token")

    try {
      const response = await fetch('/iaMs/ia/productos/descripcion', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nombreProducto: formData.nombre,
          descripcionActual: formData.descripcion
        })
      })

      if (response.ok) {
        const data = await response.json()
        setFormData((prev) => ({ ...prev, descripcion: data.descripcion }))
      } else {
        await showAlert({
          title: "No se pudo generar la descripción",
          description: "Intentá de nuevo en unos segundos.",
        })
      }
    } catch (error) {
      console.error("Error generando descripción con IA:", error)
      await showAlert({
        title: "Error de conexión",
        description: "No se pudo conectar con el servicio de IA.",
      })
    } finally {
      setIsGeneratingDesc(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    setFieldErrors({})
    setGlobalError("")
    setIsSubmitting(true)

    const payload = {
        nombre: formData.nombre,
        descripcion: formData.descripcion,
        precio: formData.precio ? parseFloat(formData.precio) : null,
        categoria: formData.categoria,
        subcategoria: formData.subcategoria,
        disponible: formData.disponible === "" ? null : (formData.disponible === "Disponible"),
        observaciones: formData.observaciones,
        imagen: formData.imagen 
    }

    const token = sessionStorage.getItem("token")
    
    try {
        let url = '/catalogoMs/api/vendedores/productos'
        let method = 'POST'

        if (!isNewProduct && selectedProduct) {
            url = `/catalogoMs/api/vendedores/productos/${selectedProduct.id}` 
            method = 'PUT' 
        }

        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })

        if (response.ok) {
           const productoGuardado = await response.json() 

            if (method === 'POST') {
                setProducts((prev) => [...prev, productoGuardado])
                await showAlert({
                  title: "Operación exitosa",
                  description: "Producto creado con éxito",
                })
            } else {
                setProducts((prev) => prev.map(p => p.id === productoGuardado.id ? productoGuardado : p))
                await showAlert({
                  title: "Operación exitosa",
                  description: "Producto actualizado con éxito",
                })
            }
            
            setIsEditing(false)
            setIsNewProduct(false)
            
            setSelectedProduct(productoGuardado)

            //setFormData({ ...formData, imagen: "" }) 
            
        } else {
            const errorData = await response.json()
            
            if (response.status === 400) {
                if (errorData.error) {
                     setGlobalError(errorData.error)
                } else {
                     setFieldErrors(errorData)
                }
            } else {
                setGlobalError("Ocurrió un error inesperado en el servidor. Intente nuevamente.")
            }
        }
    } catch (error) {
        console.error("Error de red:", error)
        setGlobalError("No se pudo conectar con el servidor. Verifique su conexión.")
    } finally {
        setIsSubmitting(false)
    }
  }

  const handleFilterChange = (type, value) => {
    setFilters((prev) => ({ ...prev, [type]: value }))
  }

  const handleDragOver = (e) => {
  e.preventDefault()
  e.stopPropagation()
  if (isEditing) setIsDragging(true)
}

const handleDragLeave = (e) => {
  e.preventDefault()
  e.stopPropagation()
  setIsDragging(false)
}

const handleDrop = (e) => {
  e.preventDefault()
  e.stopPropagation()
  setIsDragging(false)

  if (!isEditing) return // respeta el mismo disabled que ya tenías

  const file = e.dataTransfer.files?.[0]
  processImageFile(file)
}


  const clearFilters = () => {
    setFilters({
      categoria: "",
      subcategoria: "",
      disponibilidad: "",
    })
  }

  const handleLogout = () => {
    sessionStorage.clear()
    window.location.href = "/login"
  }

  const handleNavigate = (path) => {
    window.location.href = path
  }

/*
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    
    if (file) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = () => {
        const base64String = reader.result; 
        setFormData(prev => ({ ...prev, imagen: base64String }));
        setPreviews(prev => ({ ...prev, imagen: base64String }));
      };
    }
  }
*/
// Reemplazá tu handleImageChange actual por esto:
const processImageFile = (file) => {
  if (!file || !file.type.startsWith("image/")) return

  const reader = new FileReader()
  reader.readAsDataURL(file)
  reader.onloadend = () => {
    const base64String = reader.result
    setFormData(prev => ({ ...prev, imagen: base64String }))
    setPreviews(prev => ({ ...prev, imagen: base64String }))
  }
}

const handleImageChange = (e) => {
  const file = e.target.files[0]
  processImageFile(file)
}
  const handleRemoveImage = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setPreviews((prev) => ({ ...prev, imagen: null }))
    setFormData((prev) => ({ ...prev, imagen: "" }))
  }

  const todasLasSubcategorias = Object.values(categoriasMap).flat();
  const todasLasCategorias = Object.keys(categoriasMap);

  return (
    <div className={styles.pageWrapper}>
      <VendedorNavbar profile={vendedorProfile} />

      {/* MAIN CONTENT */}
      <main className={styles.mainContent} onClick={handleBackgroundClick}>
        {/* LEFT SIDE - Products */}
        <div className={styles.leftPanel}>
          {/* Header */}
          <div className={styles.header}>
            <button className={styles.carouselButton} onClick={() => router.back()}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
              </svg>
            </button>
            <h1 className={styles.pageTitle}>MIS PRODUCTOS</h1>
          </div>

          {/* Search and Filter Bar */}
          <div className={styles.searchBar}>
            <div className={styles.searchInputWrapper}>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Buscar producto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button className={styles.searchIconBtn}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                  <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                </svg>
              </button>
            </div>
            <button className={styles.filterBtn} onClick={() => setShowFilters(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#ff4b7e">
                <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z" />
              </svg>
            </button>
          </div>

          {/* Products Grid */}
          <div className={styles.productsGrid}>
            {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className={`${styles.productCard} ${selectedProduct?.id === product.id ? styles.productCardSelected : ""}`}
                  //onClick={() => handleProductClick(product)}
                  onClick={(e) => {
                        e.stopPropagation(); 
                        handleProductClick(product);
                    }}
                >
                  <div className={styles.productCardContent}>
                    <div className={styles.productInfo}>
                      <h3 className={styles.productName}>{product.nombre}</h3>
                      <p className={styles.productDescription}>{product.descripcion}</p>
                      <p className={styles.productPrice}>$ {product.precio}</p>
                    </div>
                    <div className={styles.productImage}>
                      {product.imagen ? (
                        <img 
                          src={product.imagen} 
                          alt={product.nombre} 
                          style={{width:'100%', height:'100%', objectFit:'cover'}} 
                        />
                      ) : (
                          <div style={{width:'100%', height:'100%', background:'#eee', display:'flex', justifyContent:'center', alignItems:'center'}}>
                            <span style={{fontSize:'10px', color:'#999'}}>Sin imagen</span>
                          </div>
                      )}
                    </div>
                  </div>
                </div>
                ))
            ) : (
                // MENSAJE CUANDO NO HAY PRODUCTOS
                <div className={styles.emptyState}>
                    <p>No se encontraron productos.</p>
                    {products.length === 0 && (
                        <span style={{fontSize: '0.9rem', color: '#666', marginTop: '10px'}}>
                            ¡Comienza agregando uno nuevo desde el panel derecho!
                        </span>
                    )}
                </div>
            )}
          </div>
        </div>

        {/* RIGHT SIDE - Form Panel */}
        <div className={styles.rightPanel} onClick={(e) => e.stopPropagation()}>
          {/* Action Buttons */}
          <div className={styles.actionButtons}>
            <button className={styles.actionBtn} onClick={handleNuevoClick} >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" />
              </svg>
              Nuevo
            </button>
            <button className={styles.actionBtn} onClick={handleEditarClick} disabled={!selectedProduct}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
              </svg>
              Editar
            </button>
            <button className={styles.actionBtn} onClick={handleEliminarClick} disabled={!selectedProduct}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
              </svg>
              Eliminar
            </button>
          </div>

          {/* Form */}
          <div className={styles.formPanel}>
            <div className={styles.formImageUpload}>
              <label
                className={`${styles.imageUploadArea} ${!isEditing ? styles.imageUploadAreaDisabled : ""} ${isDragging ? styles.imageUploadAreaDragging : ""}`}
                htmlFor="producto-upload"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input 
                  type="file" 
                  id="producto-upload" 
                  hidden
                  accept="image/*"
                  onChange={handleImageChange}
                  disabled={!isEditing}
                />
                {(previews.imagen || formData.imagen) ? (
                  <div className={styles.previewWrapper}>
                    <img 
                      src={previews.imagen || formData.imagen} 
                      alt="Producto" 
                      className={styles.imagePreview} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }}
                    />
                    {isEditing && (
                      <button
                        className={styles.removeButton}
                        onClick={handleRemoveImage}
                        type="button"
                        aria-label="Eliminar imagen"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                        </svg>
                      </button>
                    )}
                  </div>
                ) : (
                  <div style={{display:'flex', alignItems:'center', justifyContent:'center', width:'100%', height:'100%'}}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="#9da0a4">
                      <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                    </svg>
                  </div>
                )}
              </label>
              <p className={styles.imageLabel}>Imagen del producto</p>
            </div>

            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Nombre del producto</label>
                <textarea
                  name="nombre"
                  className={styles.formTextarea}
                  value={formData.nombre}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  rows={2}
                />
                {fieldErrors.nombre && <p className={styles.errorMsg}>{fieldErrors.nombre}</p>}
              </div>

              <div className={styles.formGroup}>
                <div className={styles.formLabelRow}>
                  <label className={styles.formLabel}>Descripción</label>
                  {isEditing && (
                    <button
                      type="button"
                      className={styles.aiButton}
                      onClick={handleGenerarDescripcion}
                      disabled={isGeneratingDesc || !formData.nombre}
                    >
                      {isGeneratingDesc ? "Generando..." : "✨ Mejorar con IA"}
                    </button>
                  )}
                </div>
                <textarea
                  name="descripcion"
                  className={styles.formTextarea}
                  value={formData.descripcion}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  rows={5}
                />
                {fieldErrors.descripcion && <p className={styles.errorMsg}>{fieldErrors.descripcion}</p>}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Precio</label>
                <input
                  type="number"
                  name="precio"
                  className={styles.formInput}
                  value={formData.precio}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
                {fieldErrors.precio && <p className={styles.errorMsg}>{fieldErrors.precio}</p>}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Categoría</label>
                <select
                  name="categoria"
                  className={styles.formSelect}
                  value={formData.categoria}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                >
                  <option value="">Seleccione</option>
                  {Object.keys(categoriasMap).map((cat) => (
                      <option key={cat} value={cat}>
                          {cat}
                      </option>
                  ))}
                </select>
                {fieldErrors.categoria && <p className={styles.errorMsg}>{fieldErrors.categoria}</p>}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Subcategoría</label>
                <select
                  name="subcategoria"
                  className={styles.formSelect}
                  value={formData.subcategoria}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                >
                  <option value="">Seleccione</option>
                  {(categoriasMap[formData.categoria] || []).map((sub) => (
                      <option key={sub} value={sub}>
                          {sub}
                      </option>
                  ))}
                </select>
                {fieldErrors.subcategoria && <p className={styles.errorMsg}>{fieldErrors.subcategoria}</p>}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Disponible</label>
                <select
                  name="disponible"
                  className={styles.formSelect}
                  value={formData.disponible}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                >
                  <option value="">Seleccione</option>
                  <option value="Disponible">Disponible</option>
                  <option value="No disponible">No disponible</option>
                </select>
                {fieldErrors.disponible && <p className={styles.errorMsg}>{fieldErrors.disponible}</p>}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Observaciones</label>
                <textarea
                  name="observaciones"
                  className={styles.formTextarea}
                  value={formData.observaciones}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  rows={3}
                />
                {fieldErrors.observaciones && <p className={styles.errorMsg}>{fieldErrors.observaciones}</p>}
              </div>

              {globalError && (
                <div className={styles.errorMessage}>
                  <span>{globalError}</span>
                </div>
              )}

              {isEditing && (
                <button type="submit" className={styles.submitBtn}>
                  Guardar
                </button>
              )}
            </form>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className={styles.footer}>
        <div className={`${styles.container} ${styles.footerInner}`}>
          <p className={styles.footerText}>PediloYa © 2026. Todos los derechos reservados.</p>
        </div>
      </footer>

      {/* FILTERS MODAL */}
      {showFilters && (
        <div className={styles.modalOverlay} onClick={() => setShowFilters(false)}>
          <div className={styles.filtersModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.filtersHeader}>
              <h2>Filtros ({filterCount})</h2>
              <button className={styles.modalClose} onClick={() => setShowFilters(false)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className={styles.filterSection}>
              <div className={styles.filterSectionHeader}>
                <h3>Categorias</h3>
              </div>
              <div className={styles.filterCheckboxes}>
                {todasLasCategorias.map((cat) => (
                  <label key={cat} className={styles.checkboxLabel}>
                    <input
                      type="radio"
                      name="categoria"
                      checked={filters.categoria === cat}
                      onChange={() => handleFilterChange("categoria", cat)}
                      className={styles.checkbox}
                    />
                    {cat}
                  </label>
                ))}
                {todasLasCategorias.length === 0 && <span style={{fontSize:'0.8rem', color:'#999'}}>Cargando...</span>}
              </div>
            </div>

            <div className={styles.filterSection}>
              <div className={styles.filterSectionHeader}>
                <h3>Subcategorias</h3>
              </div>
              <div className={styles.filterSubGrid}>
                {todasLasSubcategorias.map((sub) => (
                  <label key={sub} className={styles.checkboxLabel}>
                    <input
                      type="radio"
                      name="subcategoria"
                      checked={filters.subcategoria === sub}
                      onChange={() => handleFilterChange("subcategoria", sub)}
                      className={styles.checkbox}
                    />
                    {sub}
                  </label>
                ))}
              </div>
            </div>

            <div className={styles.filterSection}>
              <div className={styles.filterSectionHeader}>
                <h3>Disponibilidad</h3>
              </div>
              <div className={styles.filterCheckboxes}>
                <label className={styles.checkboxLabel}>
                    <input
                      type="radio"
                      name="disponibilidad"
                      checked={filters.disponibilidad === "Disponible"}
                      onChange={() => handleFilterChange("disponibilidad", "Disponible")}
                      className={styles.checkbox}
                    />
                    Disponible
                </label>
                <label className={styles.checkboxLabel}>
                    <input
                      type="radio"
                      name="disponibilidad"
                      checked={filters.disponibilidad === "No disponible"}
                      onChange={() => handleFilterChange("disponibilidad", "No disponible")}
                      className={styles.checkbox}
                    />
                    No disponible
                </label>
              </div>
            </div>

            <div className={styles.filterActions}>
              <button className={styles.filterApplyBtn} onClick={() => setShowFilters(false)}>
                Aplicar
              </button>
              <button className={styles.filterClearBtn} onClick={clearFilters}>
                Limpiar filtros
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
