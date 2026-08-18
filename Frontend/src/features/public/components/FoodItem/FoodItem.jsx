import React from 'react'
import './FoodItem.css'

const FoodItem = ({
  id,
  name,
  category,
  categories = [],
  image,
  location = 'Popayán, Cauca',
  latitude,
  longitude,
  isReservable = true,
  unavailableReason,
  rating = 4.5,
  actionLabel = 'Ver y reservar',
  actionUrl,
  onAction,
  isPlaceholder = false,
}) => {
  const primaryCategory = category
    || categories[0]?.nombre
    || categories[0]?.slug
  const restaurantData = {
    id,
    name,
    category: primaryCategory,
    categories,
    image,
    location,
    latitude,
    longitude,
    isReservable,
    unavailableReason,
    rating,
  }

  if (isPlaceholder) {
    return (
      <div className="food-item food-item-placeholder">
        <div className="food-item-placeholder-image" />
        <div className="food-item-info">
          <div className="food-item-name-rating">
            <div className="placeholder-line placeholder-title" />
            <div className="placeholder-line placeholder-rating" />
          </div>
          <div className="restaurant-card-footer">
            <div className="placeholder-line placeholder-location" />
            <button
              type="button"
              className="restaurant-reserve-button"
              onClick={() => onAction?.(restaurantData)}
            >
              Ver y reservar
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='food-item' data-restaurante-id={id}>
      <div className="food-item-image-container">
        <img className='food-item-image' src={image} alt={name} />
      </div>

      <div className="food-item-info">
        <div className="food-item-name-rating">
          <p>{name}</p>
          <span className="restaurant-rating" aria-label={`Calificación ${rating} de 5`}>
            <span aria-hidden="true">★</span> {rating}
          </span>
        </div>

        <div className="restaurant-card-footer">
          <span className="restaurant-location">{location}</span>
          {actionUrl ? (
            isReservable ? (
              <a className="restaurant-reserve-button" href={actionUrl}>
                {actionLabel}
              </a>
            ) : (
              <button
                type="button"
                className="restaurant-reserve-button"
                disabled
                title={unavailableReason}
              >
                No disponible
              </button>
            )
          ) : (
            <button
              type="button"
              className="restaurant-reserve-button"
              onClick={() => onAction?.(restaurantData)}
              disabled={!isReservable}
              title={!isReservable ? unavailableReason : undefined}
              aria-label={isReservable
                ? `${actionLabel} en ${name}`
                : `${name} no acepta reservas porque no tiene mesas activas`}
            >
              {isReservable ? actionLabel : 'No disponible'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default FoodItem
