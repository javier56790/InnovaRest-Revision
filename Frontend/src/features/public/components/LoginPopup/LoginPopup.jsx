/* eslint-disable react/prop-types */
import { useState } from 'react'
import './LoginPopup.css'
import { assets } from '../../assets/uiAssets'

const LoginPopup = ({ setShowLogin, onLogin, onRegister }) => {
  const [currState, setCurrState] = useState('Iniciar sesión')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isRegistering = currState === 'Crear cuenta'

  const changeState = (nextState) => {
    setCurrState(nextState)
    setError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    const formData = new FormData(event.currentTarget)
    const credentials = {
      email: String(formData.get('email') || '').trim(),
      password: String(formData.get('password') || ''),
    }

    setIsSubmitting(true)
    try {
      if (isRegistering) {
        if (!onRegister) throw new Error('El registro no está disponible en esta pantalla.')
        await onRegister({
          name: String(formData.get('name') || '').trim(),
          phone: String(formData.get('phone') || '').trim(),
          ...credentials,
          confirmPassword: String(formData.get('confirmPassword') || ''),
        })
      } else {
        await onLogin(credentials)
      }
    } catch (submitError) {
      setError(submitError.message || (isRegistering
        ? 'No fue posible crear la cuenta.'
        : 'No fue posible iniciar sesión.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className='login-popup'>
      <form className="login-popup-container" onSubmit={handleSubmit}>
        <div className="login-popup-title">
          <h2>{currState}</h2>
          <img onClick={() => setShowLogin(false)} src={assets.cross_icon} alt="Cerrar" />
        </div>
        <div className="login-popup-inputs">
          {isRegistering && (
            <>
              <input name="name" type="text" placeholder="Nombre completo" required />
              <input name="phone" type="tel" placeholder="Teléfono (opcional)" />
            </>
          )}
          <input name="email" type="email" placeholder="Correo electrónico" required />
          <input name="password" type="password" placeholder="Contraseña" minLength={8} required />
          {isRegistering && (
            <input
              name="confirmPassword"
              type="password"
              placeholder="Confirmar contraseña"
              minLength={8}
              required
            />
          )}
        </div>
        {error && <p className="login-popup-error" role="alert">{error}</p>}
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? (isRegistering ? 'Creando cuenta...' : 'Ingresando...')
            : (isRegistering ? 'Crear cuenta' : 'Ingresar')}
        </button>
        <div className="login-popup-condition">
          <input type="checkbox" required/>
          <p>Al continuar, acepto los términos de uso y la política de privacidad.</p>
        </div>
        {isRegistering
          ? <p>¿Ya tienes una cuenta? <span onClick={() => changeState('Iniciar sesión')}>Iniciar sesión</span></p>
          : <p>¿No tienes cuenta? <span onClick={() => changeState('Crear cuenta')}>Crear cuenta</span></p>}
      </form>
    </div>
  )
}

export default LoginPopup
