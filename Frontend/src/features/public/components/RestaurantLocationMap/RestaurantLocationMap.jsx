/* eslint-disable react/prop-types */
import { useEffect, useMemo } from 'react'
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import './RestaurantLocationMap.css'

const DEFAULT_CENTER = [2.4448, -76.6147]

const parseCoordinate = (value) => {
  if (value === null || value === undefined || value === '') return null
  const coordinate = Number(value)
  return Number.isFinite(coordinate) ? coordinate : null
}

export const getRestaurantCoordinates = (restaurant) => {
  const latitude = parseCoordinate(restaurant?.latitude)
  const longitude = parseCoordinate(restaurant?.longitude)

  if (
    latitude === null
    || longitude === null
    || latitude < -90
    || latitude > 90
    || longitude < -180
    || longitude > 180
  ) {
    return null
  }

  return [latitude, longitude]
}

export const distanceInKilometers = (origin, destination) => {
  if (!origin || !destination) return null

  const toRadians = (degrees) => degrees * (Math.PI / 180)
  const earthRadius = 6371
  const latitudeDelta = toRadians(destination[0] - origin[0])
  const longitudeDelta = toRadians(destination[1] - origin[1])
  const originLatitude = toRadians(origin[0])
  const destinationLatitude = toRadians(destination[0])
  const haversine = (
    Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(originLatitude)
      * Math.cos(destinationLatitude)
      * Math.sin(longitudeDelta / 2) ** 2
  )

  return earthRadius * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}

const MapViewport = ({ points, selectedPoint, userPosition }) => {
  const map = useMap()

  useEffect(() => {
    const resizeTimer = window.setTimeout(() => map.invalidateSize(), 80)

    if (selectedPoint) {
      map.flyTo(selectedPoint, 15, { duration: 0.7 })
    } else {
      const bounds = [...points, ...(userPosition ? [userPosition] : [])]

      if (bounds.length > 1) {
        map.fitBounds(bounds, { padding: [42, 42], maxZoom: 14 })
      } else if (bounds.length === 1) {
        map.setView(bounds[0], 14)
      }
    }

    return () => window.clearTimeout(resizeTimer)
  }, [map, points, selectedPoint, userPosition])

  return null
}

/**
 * @param {{
 *   restaurants?: Array<Record<string, any>>,
 *   selectedRestaurantId?: string | number | null,
 *   userPosition?: number[] | null,
 *   onSelect?: (restaurant: Record<string, any>) => void,
 *   onRestaurantAction?: (restaurant: Record<string, any>) => void,
 *   className?: string,
 * }} props
 */
const RestaurantLocationMap = ({
  restaurants = [],
  selectedRestaurantId = null,
  userPosition = null,
  onSelect,
  onRestaurantAction,
  className = '',
}) => {
  const mappedRestaurants = useMemo(() => restaurants
    .map((restaurant) => ({
      restaurant,
      coordinates: getRestaurantCoordinates(restaurant),
    }))
    .filter((item) => item.coordinates), [restaurants])
  const mappedPoints = useMemo(
    () => mappedRestaurants.map((item) => item.coordinates),
    [mappedRestaurants],
  )
  const selectedCoordinates = useMemo(() => mappedRestaurants.find((item) => (
    String(item.restaurant.id) === String(selectedRestaurantId)
  ))?.coordinates || null, [mappedRestaurants, selectedRestaurantId])

  return (
    <div className={`restaurant-location-map ${className}`.trim()}>
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={13}
        minZoom={3}
        scrollWheelZoom
        className="restaurant-location-map__canvas"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapViewport
          points={mappedPoints}
          selectedPoint={selectedCoordinates}
          userPosition={userPosition}
        />

        {userPosition && (
          <CircleMarker
            center={userPosition}
            radius={9}
            pathOptions={{
              color: '#ffffff',
              fillColor: '#2e90fa',
              fillOpacity: 1,
              weight: 3,
            }}
          >
            <Tooltip direction="top" offset={[0, -8]}>Tu ubicación</Tooltip>
          </CircleMarker>
        )}

        {mappedRestaurants.map(({ restaurant, coordinates }) => {
          const isSelected = String(restaurant.id) === String(selectedRestaurantId)

          return (
            <CircleMarker
              key={restaurant.id}
              center={coordinates}
              radius={isSelected ? 13 : 10}
              pathOptions={{
                color: '#ffffff',
                fillColor: isSelected ? '#ff6347' : '#101828',
                fillOpacity: 1,
                weight: 3,
              }}
              eventHandlers={{ click: () => onSelect?.(restaurant) }}
            >
              <Tooltip direction="top" offset={[0, -8]}>{restaurant.name}</Tooltip>
              <Popup>
                <div className="restaurant-map-popup">
                  <strong>{restaurant.name}</strong>
                  <span>{restaurant.location || 'Ubicación registrada'}</span>
                  {onRestaurantAction && (
                    <button
                      type="button"
                      onClick={() => onRestaurantAction(restaurant)}
                      disabled={restaurant.isReservable === false}
                      title={restaurant.isReservable === false
                        ? restaurant.unavailableReason
                        : undefined}
                    >
                      {restaurant.isReservable === false ? 'No disponible' : 'Ver y reservar'}
                    </button>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          )
        })}
      </MapContainer>
    </div>
  )
}

export default RestaurantLocationMap
