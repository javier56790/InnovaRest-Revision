import React, { useContext } from 'react'
import './FoodDisplay.css'
import {StoreContext} from '../../context/StoreContext'
import FoodItem from '../FoodItem/FoodItem'

const normalizeText = (value = '') => String(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim()

const FoodDisplay = ({category, onRestaurantAction, searchQuery = ''}) => {

    const {restaurants, isLoading, error} = useContext(StoreContext)
    const normalizedCategory = normalizeText(category)
    const normalizedQuery = normalizeText(searchQuery)
    const visibleRestaurants = restaurants.filter((item) => {
      const itemCategories = Array.isArray(item.categories) ? item.categories : []
      const belongsToCategory = itemCategories.some((itemCategory) => (
        normalizeText(itemCategory.slug) === normalizedCategory
      )) || normalizeText(item.category) === normalizedCategory

      if (!belongsToCategory) return false
      if (!normalizedQuery) return true

      const searchableCategories = itemCategories.flatMap((itemCategory) => [
        itemCategory.nombre,
        itemCategory.slug,
      ])

      return [item.name, item.category, item.location, ...searchableCategories]
        .some((value) => normalizeText(value).includes(normalizedQuery))
    })
    const showPlaceholders = !isLoading
      && !error
      && !normalizedQuery
      && visibleRestaurants.length === 0
      && (category === 'ensaladas' || category === 'rolls')
    const cards = visibleRestaurants.length > 0
      ? visibleRestaurants
      : showPlaceholders ? Array.from({ length: 3 }, (_, index) => ({
          id: `placeholder-${category}-${index}`,
          category,
          isPlaceholder: true,
        })) : []

  return (
    <div className='food-display' id='food-display'>
      <h2>Restaurantes cerca tuyo</h2>
      {isLoading && (
        <div className="food-display-empty" role="status">
          <h3>Cargando restaurantes...</h3>
        </div>
      )}
      {!isLoading && error && (
        <div className="food-display-empty" role="alert">
          <h3>{error}</h3>
          <p>Comprueba que el backend de Django esté activo.</p>
        </div>
      )}
      <div className="food-display-list">
        {cards.map((restaurant) => (
          <FoodItem
            key={restaurant._id ?? restaurant.id}
            {...restaurant}
            id={restaurant._id ?? restaurant.id}
            onAction={onRestaurantAction}
          />
        ))}
      </div>
      {!isLoading && !error && normalizedQuery && cards.length === 0 && (
        <div className="food-display-empty" role="status">
          <span aria-hidden="true">⌕</span>
          <h3>No se encontraron restaurantes</h3>
          <p>Prueba con otro nombre, categoría o ubicación.</p>
        </div>
      )}
    </div>
  )
}

export default FoodDisplay
