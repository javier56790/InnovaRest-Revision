/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from 'react'
import { assets } from '../../assets/uiAssets'
import RestaurantLocationMap, {
  distanceInKilometers,
  getRestaurantCoordinates,
} from '../RestaurantLocationMap/RestaurantLocationMap'
import './RestaurantMapModal.css'

const formatDistance = (distance) => {
  if (distance === null) return null
  if (distance < 1) return `${Math.max(1, Math.round(distance * 1000))} m`
  return `${distance.toFixed(1)} km`
}

const getCategoryLabel = (restaurant) => (
  restaurant.category
  || restaurant.categories?.[0]?.nombre
  || restaurant.categories?.[0]?.slug
  || 'Restaurante'
)

const RestaurantMapModal = ({
  restaurants,
  isLoading,
  error,
  onClose,
  onRestaurantAction,
}) => {
  const [selectedRestaurantId, setSelectedRestaurantId] = useState(null)
  const [userPosition, setUserPosition] = useState(null)
  const [locationStatus, setLocationStatus] = useState('requesting')

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [onClose])

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus('unsupported')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserPosition([position.coords.latitude, position.coords.longitude])
        setLocationStatus('granted')
      },
      () => setLocationStatus('denied'),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    )
  }, [])

  const orderedRestaurants = useMemo(() => (restaurants || [])
    .map((restaurant) => {
      const coordinates = getRestaurantCoordinates(restaurant)
      return {
        ...restaurant,
        coordinates,
        distance: distanceInKilometers(userPosition, coordinates),
      }
    })
    .sort((first, second) => {
      if (first.distance !== null && second.distance !== null) {
        return first.distance - second.distance
      }
      if (first.distance !== null) return -1
      if (second.distance !== null) return 1
      if (first.coordinates && !second.coordinates) return -1
      if (!first.coordinates && second.coordinates) return 1
      return String(first.name || '').localeCompare(String(second.name || ''), 'es')
    }), [restaurants, userPosition])
  const mappedRestaurants = orderedRestaurants.filter((restaurant) => restaurant.coordinates)
  const locationMessage = {
    requesting: 'Buscando tu ubicación para ordenar por cercanía…',
    granted: 'Ordenados desde tu ubicación aproximada.',
    denied: 'Permiso de ubicación no concedido. Mostrando todos.',
    unsupported: 'Tu navegador no permite calcular la cercanía.',
  }[locationStatus]

  const selectRestaurant = (restaurant) => {
    if (restaurant.coordinates || getRestaurantCoordinates(restaurant)) {
      setSelectedRestaurantId(restaurant.id)
    }
  }

  const openRestaurant = (restaurant) => {
    if (restaurant.isReservable === false) return
    onClose()
    onRestaurantAction(restaurant)
  }

  return (
    <div
      className="restaurant-map-overlay"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className="restaurant-map-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="restaurant-map-title"
      >
        <header className="restaurant-map-modal__header">
          <img src={assets.logo} alt="InnovaRest" />
          <div>
            <span>Explora cerca de ti</span>
            <h2 id="restaurant-map-title">Mapa de restaurantes</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar mapa">×</button>
        </header>

        <div className="restaurant-map-modal__body">
          <aside className="restaurant-map-results" aria-label="Restaurantes registrados">
            <div className="restaurant-map-results__heading">
              <div>
                <strong>{orderedRestaurants.length} restaurante(s)</strong>
                <span>{locationMessage}</span>
              </div>
              <span className="restaurant-map-results__badge">
                {mappedRestaurants.length} en mapa
              </span>
            </div>

            <div className="restaurant-map-results__list">
              {isLoading && (
                <div className="restaurant-map-state" role="status">
                  <strong>Cargando restaurantes…</strong>
                  <span>Consultando los establecimientos registrados.</span>
                </div>
              )}

              {!isLoading && error && (
                <div className="restaurant-map-state" role="alert">
                  <strong>No fue posible cargar los restaurantes</strong>
                  <span>{error}</span>
                </div>
              )}

              {!isLoading && !error && orderedRestaurants.length === 0 && (
                <div className="restaurant-map-state" role="status">
                  <strong>Aún no hay restaurantes registrados</strong>
                  <span>Los nuevos establecimientos aparecerán aquí automáticamente.</span>
                </div>
              )}

              {!isLoading && !error && orderedRestaurants.map((restaurant) => {
                const isSelected = String(restaurant.id) === String(selectedRestaurantId)
                const distanceLabel = formatDistance(restaurant.distance)

                return (
                  <article
                    key={restaurant.id}
                    className={`restaurant-map-card${isSelected ? ' selected' : ''}`}
                  >
                    <button
                      type="button"
                      className="restaurant-map-card__focus"
                      onClick={() => selectRestaurant(restaurant)}
                      disabled={!restaurant.coordinates}
                      aria-label={restaurant.coordinates
                        ? `Mostrar ${restaurant.name} en el mapa`
                        : `${restaurant.name} todavía no tiene coordenadas`}
                    >
                      <div className="restaurant-map-card__image">
                        {restaurant.image
                          ? <img src={restaurant.image} alt="" />
                          : <span aria-hidden="true">IR</span>}
                      </div>
                      <div className="restaurant-map-card__content">
                        <span className="restaurant-map-card__category">
                          {getCategoryLabel(restaurant)}
                        </span>
                        <h3>{restaurant.name}</h3>
                        <p>{restaurant.location || 'Ubicación pendiente'}</p>
                        <span className={restaurant.coordinates ? 'has-location' : 'missing-location'}>
                          {distanceLabel || (restaurant.coordinates
                            ? 'Ubicación disponible'
                            : 'Sin coordenadas registradas')}
                        </span>
                      </div>
                    </button>
                    <button
                      type="button"
                      className="restaurant-map-card__action"
                      onClick={() => openRestaurant(restaurant)}
                      disabled={restaurant.isReservable === false}
                      title={restaurant.isReservable === false
                        ? restaurant.unavailableReason
                        : undefined}
                    >
                      {restaurant.isReservable === false ? 'No disponible' : 'Ver y reservar'}
                    </button>
                  </article>
                )
              })}
            </div>
          </aside>

          <div className="restaurant-map-modal__map">
            <RestaurantLocationMap
              restaurants={mappedRestaurants}
              selectedRestaurantId={selectedRestaurantId}
              userPosition={userPosition}
              onSelect={selectRestaurant}
              onRestaurantAction={openRestaurant}
            />
            {!isLoading && !error && mappedRestaurants.length === 0 && (
              <div className="restaurant-map-modal__empty-map" role="status">
                <strong>No hay ubicaciones para marcar todavía</strong>
                <span>Los restaurantes aparecerán cuando tengan latitud y longitud.</span>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

export default RestaurantMapModal
