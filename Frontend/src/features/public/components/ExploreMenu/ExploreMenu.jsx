import React from 'react'
import './ExploreMenu.css'
import { menu_list } from '../../assets/uiAssets'

const ExploreMenu = ({category,setCategory}) => {
  return (
    <div className='explore-menu' id='explore-menu'>
      <h1>Explora categorías de restaurantes</h1>

      <p className="explore-menu-text">
        Encuentra restaurantes según el tipo de comida que prefieras.
      </p>

      <div className="explore-menu-list">
        {menu_list.map((item) => {
          return (
            <button
              type="button"
              key={item.category}
              className="explore-menu-list-item"
              onClick={() => setCategory(item.category)}
              aria-pressed={category === item.category}
            >
              <img
                className={category === item.category ? 'active' : ''}
                src={item.menu_image}
                alt=""
              />
              <span>{item.menu_name}</span>
            </button>
          )
        })}
      </div>

      <hr />
    </div>
  )
}


export default ExploreMenu
