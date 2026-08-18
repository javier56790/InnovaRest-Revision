import { useContext, useState } from 'react'
import { useNavigate } from 'react-router'
import Navbar from './components/Navbar/Navbar'
import Home from './pages/Home/Home'
import Footer from './components/Footer/Footer'
import LoginPopup from './components/LoginPopup/LoginPopup'
import ClientPanelModal from './components/ClientPanelModal/ClientPanelModal'
import RestaurantMapModal from './components/RestaurantMapModal/RestaurantMapModal'
import StoreContextProvider, { StoreContext } from './context/StoreContext'
import { useAuth } from '../../context/AuthContext'
import './public.css'

const PublicExperience = () => {

  const [showLogin, setShowLogin] = useState(false)
  const [showClientPanel, setShowClientPanel] = useState(false)
  const [showRestaurantMap, setShowRestaurantMap] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const navigate = useNavigate()
  const { restaurants, isLoading, error } = useContext(StoreContext)
  const {
    accessToken,
    changePassword,
    isAuthenticated,
    login,
    logout,
    register,
    updateProfile,
    user,
  } = useAuth()

  const handleLogin = async (credentials) => {
    const authenticatedUser = await login(credentials)
    setShowLogin(false)

    if (authenticatedUser.role === 'RESTAURANTE') {
      navigate('/panel-restaurante')
    } else if (authenticatedUser.role === 'SUPERADMIN') {
      navigate('/superadmin')
    }
  }

  const handleRegister = async (clientData) => {
    await register(clientData)
    setShowLogin(false)
  }

  const handleLogout = () => {
    logout()
    setShowClientPanel(false)
  }

  const handleOpenAccount = () => {
    if (user?.role === 'RESTAURANTE') {
      navigate('/panel-restaurante')
    } else if (user?.role === 'SUPERADMIN') {
      navigate('/superadmin')
    } else {
      setShowClientPanel(true)
    }
  }

  const handleRestaurantAction = (restaurant) => {
    const restaurantId = restaurant?.id ?? 'pendiente'

    navigate(`/restaurantes/${encodeURIComponent(restaurantId)}/reservar`, {
      state: {
        restaurant,
        returnTo: '/',
      },
    })
  }

  return (
    <div className="public-site">
      {showLogin
        ? <LoginPopup
            setShowLogin={setShowLogin}
            onLogin={handleLogin}
            onRegister={handleRegister}
          />
        : <></>}
      {isAuthenticated && showClientPanel
        ? <ClientPanelModal
            accessToken={accessToken}
            onClose={() => setShowClientPanel(false)}
            onLogout={handleLogout}
            onPasswordChange={changePassword}
            onProfileUpdate={updateProfile}
            user={user}
          />
        : <></>}
      {showRestaurantMap
        ? <RestaurantMapModal
            restaurants={restaurants}
            isLoading={isLoading}
            error={error}
            onClose={() => setShowRestaurantMap(false)}
            onRestaurantAction={handleRestaurantAction}
          />
        : <></>}
      <div className='app'>
        <Navbar
          setShowLogin={setShowLogin}
          isAuthenticated={isAuthenticated}
          onOpenAccount={handleOpenAccount}
          onLogout={handleLogout}
          user={user}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenMap={() => setShowRestaurantMap(true)}
        />
        <Home
          onRestaurantAction={handleRestaurantAction}
          searchQuery={searchQuery}
        />
      </div>
      <Footer />
    </div>
  )
}

const PublicApp = () => (
  <StoreContextProvider>
    <PublicExperience />
  </StoreContextProvider>
)

export default PublicApp
