import React from 'react'
import './Footer.css'
import { assets } from '../../assets/uiAssets'

const Footer = () => {
  return (
    <div className='footer' id='footer'>
        <div className="footer-content">
            <div className="footer-content-center">
                <img src={assets.logo} className="footer-logo" alt="InnovaRest" />
            </div>
        </div>
        <hr/>
        <p className='footer-copyright'>Copyright 2024 © Tomato.com - All Rights Reserved.</p>
    </div>
  )
}

export default Footer
