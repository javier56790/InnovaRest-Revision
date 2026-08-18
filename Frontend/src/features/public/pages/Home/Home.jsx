import React, { useState } from 'react'
import './Home.css'
import Header from '../../components/Header/Header'
import ExploreMenu from '../../components/ExploreMenu/ExploreMenu'
import FoodDisplay from '../../components/FoodDisplay/FoodDisplay'
import AppDownload from '../../components/AppDownload/AppDownload'


const Home = ({ onRestaurantAction, searchQuery }) => {

    const [category,setCategory] = useState("ensaladas");

  return (
    <div>
      <Header/>
      <ExploreMenu category={category} setCategory={setCategory}/>
      <FoodDisplay
        category={category}
        onRestaurantAction={onRestaurantAction}
        searchQuery={searchQuery}
      />
      <AppDownload/>
    </div>
  )
}

export default Home
