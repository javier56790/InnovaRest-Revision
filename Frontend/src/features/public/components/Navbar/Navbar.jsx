/* eslint-disable react/prop-types */
import { useEffect, useRef, useState } from 'react'
import './Navbar.css'
import { assets } from '../../assets/uiAssets'
import profileIcon from '../../assets/profile_icon.png'
import { Link } from 'react-router'

const Navbar = ({
  setShowLogin,
  isAuthenticated,
  onOpenAccount,
  onLogout,
  user,
  searchQuery,
  onSearchChange,
  onOpenMap,
}) => {
  const [menu,setMenu] = useState('inicio')
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const profileMenuRef = useRef(null)

  useEffect(() => {
    const closeMenu = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false)
      }
    }

    document.addEventListener('mousedown', closeMenu)
    return () => document.removeEventListener('mousedown', closeMenu)
  }, [])

  const openClientPanel = () => {
    setShowProfileMenu(false)
    onOpenAccount()
  }

  const logout = () => {
    setShowProfileMenu(false)
    onLogout()
  }

  const handleSearchSubmit = (event) => {
    event.preventDefault()
    document.getElementById('food-display')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  return (
    <div className='navbar'>
      <Link to='/'><img src={assets.logo} className='logo' alt='InnovaRest' /></Link>
      <ul className="navbar-menu">
        <Link to='/' onClick={() => setMenu('inicio')} className={menu==='inicio'?'active':''}>Inicio</Link>
        <button type="button" className="navbar-menu-button" onClick={onOpenMap}>Mapa</button>
      </ul>
      <div className="navbar-right">
        <form className="navbar-search" role="search" onSubmit={handleSearchSubmit}>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar restaurante"
            aria-label="Buscar por nombre, categoría o ubicación"
          />
          <button type="submit" aria-label="Mostrar resultados de búsqueda">
            <img src={assets.search_icon} alt="" aria-hidden="true" />
          </button>
        </form>

        {isAuthenticated ? (
          <div className="navbar-profile" ref={profileMenuRef}>
            <button
              type="button"
              className="navbar-profile-button"
              onClick={() => setShowProfileMenu((current) => !current)}
              aria-label="Abrir opciones de perfil"
              aria-expanded={showProfileMenu}
            >
              <img src={profileIcon} className="navbar-profile-avatar" alt="Perfil" />
              <span className="navbar-profile-status" />
            </button>

            {showProfileMenu && (
              <div className="navbar-profile-menu">
                <div className="navbar-profile-menu-header">
                  <strong>{user?.name || 'Cuenta InnovaRest'}</strong>
                  <span>{user?.email || 'Sesión activa'}</span>
                </div>
                <button type="button" onClick={openClientPanel}>
                  {user?.role === 'CLIENTE' ? 'Mi perfil' : 'Ir al panel'}
                </button>
                <button type="button" className="logout" onClick={logout}>Cerrar sesión</button>
              </div>
            )}
          </div>
        ) : (
          <button type="button" className="navbar-login-button" onClick={()=>setShowLogin(true)}>Ingresar</button>
        )}
      </div>
    </div>
  )
}

export default Navbar
