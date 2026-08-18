/* eslint-disable react/prop-types */
import { useEffect, useState } from 'react'
import { assets } from '../../assets/uiAssets'
import {
  cancelReservation,
  formatReservationTime,
  listReservations,
} from '../../../../services/reservations'
import './ClientPanelModal.css'

const navItems = [
  { id: 'inicio', label: 'Inicio', icon: 'home' },
  { id: 'reservas', label: 'Mis reservas', icon: 'calendar' },
  { id: 'perfil', label: 'Mi perfil', icon: 'user' },
]

const reservationTabs = ['Activas', 'Historial', 'Canceladas']

const isActiveReservation = (reservation) => {
  if (reservation.status !== 'CONFIRMADA') return false
  const start = new Date(`${reservation.date}T${reservation.startTime}:00`)
  return !Number.isNaN(start.getTime()) && start.getTime() >= Date.now()
}

const reservationsForTab = (reservations, tab) => {
  if (tab === 'Activas') return reservations.filter(isActiveReservation)
  if (tab === 'Canceladas') {
    return reservations.filter((reservation) => reservation.status === 'CANCELADA')
  }
  return reservations.filter((reservation) => (
    reservation.status === 'NO_SHOW'
    || (reservation.status === 'CONFIRMADA' && !isActiveReservation(reservation))
  ))
}

const formatReservationDate = (value) => new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
}).format(new Date(`${value}T00:00:00`))

const reservationTimestamp = (reservation) => new Date(
  `${reservation.date}T${reservation.startTime}:00`,
).getTime()

const buildMonthlySeries = (reservations) => {
  const current = new Date()
  const months = Array.from({ length: 8 }, (_, index) => {
    const date = new Date(current.getFullYear(), current.getMonth() - 7 + index, 1)
    return {
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      label: new Intl.DateTimeFormat('es-CO', { month: 'short' })
        .format(date)
        .replace('.', ''),
      count: 0,
    }
  })
  const monthByKey = new Map(months.map((month) => [month.key, month]))

  reservations.forEach((reservation) => {
    const month = monthByKey.get(String(reservation.date).slice(0, 7))
    if (month) month.count += 1
  })

  const maximum = Math.max(1, ...months.map((month) => month.count))
  const points = months.map((month, index) => ({
    x: 10 + (680 * index) / (months.length - 1),
    y: 190 - (month.count / maximum) * 160,
  }))
  const linePath = points.map((point, index) => (
    `${index ? 'L' : 'M'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`
  )).join(' ')

  return {
    months,
    linePath,
    fillPath: `${linePath} L690 205 L10 205 Z`,
  }
}

const percentageOf = (count, total) => (total ? Math.round((count / total) * 100) : 0)

const PanelIcon = ({ name }) => {
  if (name === 'calendar') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 3v3m10-3v3M4.5 9.5h15M6 5h12a2 2 0 0 1 2 2v12H4V7a2 2 0 0 1 2-2Z" />
      </svg>
    )
  }

  if (name === 'user') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="8" r="4" />
        <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
      </svg>
    )
  }

  if (name === 'logout') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M10 5H5v14h5m4-4 4-3-4-3m4 3H9" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m3 11 9-8 9 8M5.5 9.5V21h13V9.5M9.5 21v-7h5v7" />
    </svg>
  )
}

const DashboardView = ({ onOpenReservations, onClose, reservations }) => {
  const activeReservations = reservations
    .filter(isActiveReservation)
    .sort((first, second) => reservationTimestamp(first) - reservationTimestamp(second))
  const nextReservation = activeReservations[0] || null
  const completedReservations = reservations.filter((reservation) => (
    reservation.status === 'CONFIRMADA' && !isActiveReservation(reservation)
  ))
  const visitedRestaurants = new Set(
    completedReservations.map((reservation) => reservation.restaurantId),
  ).size
  const monthlySeries = buildMonthlySeries(reservations)
  const statusCounts = {
    confirmed: reservations.filter((reservation) => reservation.status === 'CONFIRMADA').length,
    cancelled: reservations.filter((reservation) => reservation.status === 'CANCELADA').length,
    noShow: reservations.filter((reservation) => reservation.status === 'NO_SHOW').length,
  }
  const statusTotal = reservations.length
  const confirmedPercentage = percentageOf(statusCounts.confirmed, statusTotal)
  const cancelledPercentage = percentageOf(statusCounts.cancelled, statusTotal)
  const noShowPercentage = percentageOf(statusCounts.noShow, statusTotal)
  const confirmedEnd = confirmedPercentage
  const cancelledEnd = Math.min(100, confirmedEnd + cancelledPercentage)
  const donutBackground = statusTotal
    ? `conic-gradient(#12b76a 0 ${confirmedEnd}%, #fdb022 ${confirmedEnd}% ${cancelledEnd}%, #f04438 ${cancelledEnd}% 100%)`
    : '#f2f4f7'

  return (
  <div className="client-panel-view client-dashboard-view">
    <section className="client-welcome-card">
      <div>
        <span className="client-eyebrow client-eyebrow-light">Mi cuenta InnovaRest</span>
        <h2>Tus reservas, siempre a la mano</h2>
        <p>
          Consulta tus próximas visitas, revisa el historial y administra la
          información básica de tu cuenta desde un solo lugar.
        </p>
      </div>
      <div className="client-welcome-actions">
        <span>Datos de tu cuenta</span>
        <button type="button" onClick={() => onOpenReservations('Activas')}>Ver mis reservas</button>
      </div>
    </section>

    <section className="client-metrics" aria-label="Resumen de reservas">
      <button
        type="button"
        className="client-metric-card"
        onClick={() => onOpenReservations('Historial')}
        aria-label="Ver el historial de reservas realizadas"
      >
        <span className="client-metric-icon client-metric-brand"><PanelIcon name="calendar" /></span>
        <p>Reservas realizadas</p>
        <div><strong>{reservations.length}</strong><small>Total</small></div>
      </button>
      <button
        type="button"
        className="client-metric-card"
        onClick={() => onOpenReservations('Activas')}
        aria-label="Ver las reservas activas"
      >
        <span className="client-metric-icon client-metric-success">✓</span>
        <p>Reservas activas</p>
        <div><strong>{activeReservations.length}</strong><small>Próximas</small></div>
      </button>
      <button
        type="button"
        className="client-metric-card"
        onClick={() => onOpenReservations('Canceladas')}
        aria-label="Ver las reservas canceladas"
      >
        <span className="client-metric-icon client-metric-warning">×</span>
        <p>Reservas canceladas</p>
        <div><strong>{reservations.filter((reservation) => reservation.status === 'CANCELADA').length}</strong><small>Historial</small></div>
      </button>
      <button
        type="button"
        className="client-metric-card"
        onClick={() => onOpenReservations('Historial')}
        aria-label="Ver los restaurantes visitados en el historial"
      >
        <span className="client-metric-icon client-metric-brand"><PanelIcon name="user" /></span>
        <p>Restaurantes visitados</p>
        <div><strong>{visitedRestaurants}</strong><small>Distintos</small></div>
      </button>
    </section>

    <section className="client-charts-grid">
      <article className="client-panel-card client-history-chart">
        <div className="client-card-heading">
          <div>
            <h3>Mi historial de reservas</h3>
            <p>Cantidad de reservas realizadas por mes</p>
          </div>
          <span>Vista anual</span>
        </div>
        <div className="client-chart-area" aria-label="Cantidad real de reservas por mes">
          <div className="client-chart-grid-lines"><i /><i /><i /><i /></div>
          <svg viewBox="0 0 700 210" preserveAspectRatio="none" role="img" aria-label="Historial de reservas de los últimos ocho meses">
            <defs>
              <linearGradient id="clientAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ff6347" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#ff6347" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path className="client-chart-fill" d={monthlySeries.fillPath} />
            <path className="client-chart-line" d={monthlySeries.linePath} />
          </svg>
          <div className="client-chart-months">
            {monthlySeries.months.map((month) => (
              <span key={month.key} title={`${month.count} reserva(s)`}>{month.label}</span>
            ))}
          </div>
        </div>
      </article>

      <article className="client-panel-card client-status-chart">
        <div className="client-card-heading">
          <div>
            <h3>Estado de mis reservas</h3>
            <p>Distribución general del historial</p>
          </div>
        </div>
        <div className="client-donut-wrap">
          <div className="client-donut" style={{ background: donutBackground }}>
            <span><strong>{statusTotal}</strong>Reservas</span>
          </div>
          <div className="client-donut-legend">
            <span><i className="confirmed" />Confirmadas <strong>{confirmedPercentage}%</strong></span>
            <span><i className="cancelled" />Canceladas <strong>{cancelledPercentage}%</strong></span>
            <span><i className="no-show" />No show <strong>{noShowPercentage}%</strong></span>
          </div>
        </div>
      </article>
    </section>

    <section className="client-bottom-grid">
      <article className="client-panel-card client-next-reservation">
        <div className="client-card-heading">
          <div>
            <h3>Próxima reserva</h3>
            <p>Tu visita más cercana aparecerá aquí</p>
          </div>
          <span className="client-heading-icon"><PanelIcon name="calendar" /></span>
        </div>
        {nextReservation ? (
          <div className="client-next-reservation-data">
            <span className="client-empty-icon"><PanelIcon name="calendar" /></span>
            <div>
              <span className="client-next-label">Siguiente visita</span>
              <h4>{nextReservation.restaurantName}</h4>
              <p>
                {formatReservationDate(nextReservation.date)} · {formatReservationTime(nextReservation.startTime)}
              </p>
              <div className="client-next-details">
                <span>{nextReservation.people} persona(s)</span>
                <span>
                  {nextReservation.requiresArrangement
                    ? 'Acomodación interna'
                    : nextReservation.tables.map((table) => table.name).join(', ') || 'Mesa pendiente'}
                </span>
              </div>
              <button type="button" className="client-primary-button" onClick={() => onOpenReservations('Activas')}>
                Ver reserva
              </button>
            </div>
          </div>
        ) : (
          <div className="client-empty-state compact">
            <span className="client-empty-icon"><PanelIcon name="calendar" /></span>
            <h4>No tienes una próxima reserva</h4>
            <p>Cuando confirmes una reserva futura aparecerá aquí.</p>
          </div>
        )}
      </article>

      <article className="client-discover-card">
        <span className="client-eyebrow client-eyebrow-light">InnovaRest</span>
        <h3>¿Buscas un nuevo lugar?</h3>
        <p>Vuelve al catálogo, filtra por categoría y reserva donde prefieras.</p>
        <button type="button" onClick={onClose}>Explorar restaurantes</button>
      </article>
    </section>
  </div>
  )
}

const ReservationsView = ({
  onClose,
  activeTab,
  setActiveTab,
  reservations,
  isLoading,
  error,
  onRetry,
  onCancel,
  cancellingId,
  actionMessage,
  actionMessageType,
}) => {
  const visibleReservations = reservationsForTab(reservations, activeTab)

  return (
    <div className="client-panel-view">
      <div className="client-page-heading">
        <div>
          <span className="client-eyebrow">Mi cuenta InnovaRest</span>
          <h2>Mis reservas</h2>
          <p>Consulta tus próximas visitas, revisa el historial y administra tus reservas.</p>
        </div>
        <button type="button" className="client-primary-button" onClick={onClose}>Explorar restaurantes</button>
      </div>

      <section className="client-panel-card client-reservations-card">
        <div className="client-reservation-tabs" role="tablist" aria-label="Tipos de reservas">
          {reservationTabs.map((tab) => (
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              className={activeTab === tab ? 'active' : ''}
              onClick={() => setActiveTab(tab)}
              key={tab}
            >
              {tab} <span>{reservationsForTab(reservations, tab).length}</span>
            </button>
          ))}
        </div>

        {actionMessage && (
          <p className={`client-reservation-feedback ${actionMessageType}`} role="status">
            {actionMessage}
          </p>
        )}

        {isLoading ? (
          <div className="client-empty-state reservations-empty">
            <span className="client-empty-icon"><PanelIcon name="calendar" /></span>
            <h4>Cargando tus reservas...</h4>
            <p>Estamos consultando la información asociada a tu cuenta.</p>
          </div>
        ) : error ? (
          <div className="client-empty-state reservations-empty">
            <span className="client-empty-icon"><PanelIcon name="calendar" /></span>
            <h4>No fue posible cargar las reservas</h4>
            <p>{error}</p>
            <button type="button" onClick={onRetry}>Intentar nuevamente</button>
          </div>
        ) : visibleReservations.length ? (
          <div className="client-reservation-list">
            {visibleReservations.map((reservation) => (
              <article className="client-reservation-row" key={reservation.id}>
                <div className="client-reservation-row__main">
                  <div className="client-reservation-row__heading">
                    <span>Reserva confirmada</span>
                    <span className={`client-reservation-status ${reservation.status.toLowerCase()}`}>
                      {reservation.status.replace('_', ' ')}
                    </span>
                  </div>
                  <h4>{reservation.restaurantName}</h4>
                  <div className="client-reservation-details">
                    <span>{formatReservationDate(reservation.date)} · {formatReservationTime(reservation.startTime)}</span>
                    <span>{reservation.people} persona(s)</span>
                    <span>
                      {reservation.requiresArrangement
                        ? 'Acomodación interna'
                        : reservation.tables.map((table) => table.name).join(', ') || 'Mesa pendiente'}
                    </span>
                  </div>
                </div>
                {isActiveReservation(reservation) && (
                  <button
                    type="button"
                    className="client-cancel-reservation"
                    onClick={() => onCancel(reservation)}
                    disabled={cancellingId === reservation.id}
                  >
                    {cancellingId === reservation.id ? 'Cancelando...' : 'Cancelar reserva'}
                  </button>
                )}
              </article>
            ))}
          </div>
        ) : (
          <div className="client-empty-state reservations-empty">
            <span className="client-empty-icon"><PanelIcon name="calendar" /></span>
            <h4>
              {activeTab === 'Activas'
                ? 'No tienes reservas activas'
                : activeTab === 'Canceladas'
                  ? 'No tienes reservas canceladas'
                  : 'Tu historial está vacío'}
            </h4>
            <p>No se encontraron reservas de este tipo en tu cuenta.</p>
            {activeTab === 'Activas' && <button type="button" onClick={onClose}>Buscar un restaurante</button>}
          </div>
        )}
      </section>
    </div>
  )
}

const ProfileView = ({ user, onProfileUpdate, onPasswordChange }) => {
  const [profile, setProfile] = useState({ name: '', email: '', phone: '' })
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  })
  const [profileFeedback, setProfileFeedback] = useState({ message: '', type: '' })
  const [passwordFeedback, setPasswordFeedback] = useState({ message: '', type: '' })
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  useEffect(() => {
    setProfile({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
    })
  }, [user])

  const updateProfileField = (field, value) => {
    setProfile((current) => ({ ...current, [field]: value }))
    setProfileFeedback({ message: '', type: '' })
  }

  const updatePasswordField = (field, value) => {
    setPasswords((current) => ({ ...current, [field]: value }))
    setPasswordFeedback({ message: '', type: '' })
  }

  const resetProfile = () => {
    setProfile({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
    })
    setProfileFeedback({ message: '', type: '' })
  }

  const saveProfile = async (event) => {
    event.preventDefault()
    setProfileFeedback({ message: '', type: '' })
    setIsSavingProfile(true)

    try {
      await onProfileUpdate(profile)
      setProfileFeedback({ message: 'Datos actualizados correctamente.', type: 'success' })
    } catch (requestError) {
      setProfileFeedback({
        message: requestError.message || 'No fue posible actualizar el perfil.',
        type: 'error',
      })
    } finally {
      setIsSavingProfile(false)
    }
  }

  const savePassword = async (event) => {
    event.preventDefault()
    setPasswordFeedback({ message: '', type: '' })
    setIsChangingPassword(true)

    try {
      await onPasswordChange(passwords)
      setPasswords({ currentPassword: '', newPassword: '', confirmNewPassword: '' })
      setPasswordFeedback({ message: 'Contraseña actualizada correctamente.', type: 'success' })
    } catch (requestError) {
      setPasswordFeedback({
        message: requestError.message || 'No fue posible actualizar la contraseña.',
        type: 'error',
      })
    } finally {
      setIsChangingPassword(false)
    }
  }

  return (
    <div className="client-panel-view">
      <div className="client-page-heading">
        <div>
          <span className="client-eyebrow">Mi cuenta InnovaRest</span>
          <h2>Mi perfil</h2>
          <p>Mantén actualizados tus datos de contacto y la seguridad de tu cuenta.</p>
        </div>
      </div>

      <section className="client-profile-grid">
        <aside className="client-panel-card client-profile-summary">
          <span className="client-profile-avatar"><PanelIcon name="user" /></span>
          <h3>{user?.name || 'Cuenta de cliente'}</h3>
          <p>{user?.email || 'Correo no registrado'}</p>
          <p>{user?.phone || 'Teléfono no registrado'}</p>
          <p>Estos son los datos de la cuenta con la que iniciaste sesión en InnovaRest.</p>
          <span className="client-active-badge">Perfil activo</span>
        </aside>

        <div className="client-profile-forms">
          <form className="client-panel-card client-form-card" onSubmit={saveProfile}>
            <div className="client-card-heading">
              <div>
                <h3>Información personal</h3>
                <p>Información necesaria para identificar y contactar al cliente.</p>
              </div>
            </div>
            <div className="client-form-grid">
              <label className="full-width">
                Nombre completo
                <input
                  type="text"
                  value={profile.name}
                  onChange={(event) => updateProfileField('name', event.target.value)}
                  required
                />
              </label>
              <label>
                Correo electrónico
                <input
                  type="email"
                  value={profile.email}
                  onChange={(event) => updateProfileField('email', event.target.value)}
                  required
                />
              </label>
              <label>
                Teléfono
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={(event) => updateProfileField('phone', event.target.value)}
                  placeholder="Número de contacto (opcional)"
                />
              </label>
            </div>
            <div className="client-form-actions">
              {profileFeedback.message && (
                <span className={profileFeedback.type} role="status">{profileFeedback.message}</span>
              )}
              <button type="button" className="secondary" onClick={resetProfile} disabled={isSavingProfile}>
                Descartar
              </button>
              <button type="submit" disabled={isSavingProfile}>
                {isSavingProfile ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </form>

          <form className="client-panel-card client-form-card" onSubmit={savePassword}>
            <div className="client-card-heading">
              <div>
                <h3>Seguridad</h3>
                <p>Cambia la contraseña asociada a tu cuenta.</p>
              </div>
            </div>
            <div className="client-form-grid">
              <label className="full-width">
                Contraseña actual
                <input
                  type="password"
                  value={passwords.currentPassword}
                  onChange={(event) => updatePasswordField('currentPassword', event.target.value)}
                  autoComplete="current-password"
                  required
                />
              </label>
              <label>
                Nueva contraseña
                <input
                  type="password"
                  value={passwords.newPassword}
                  onChange={(event) => updatePasswordField('newPassword', event.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </label>
              <label>
                Confirmar contraseña
                <input
                  type="password"
                  value={passwords.confirmNewPassword}
                  onChange={(event) => updatePasswordField('confirmNewPassword', event.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </label>
            </div>
            <div className="client-form-actions">
              {passwordFeedback.message && (
                <span className={passwordFeedback.type} role="status">{passwordFeedback.message}</span>
              )}
              <button type="submit" className="secondary" disabled={isChangingPassword}>
                {isChangingPassword ? 'Actualizando...' : 'Actualizar contraseña'}
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  )
}

const ClientPanelModal = ({
  accessToken,
  onClose,
  onLogout,
  onPasswordChange,
  onProfileUpdate,
  user,
}) => {
  const [activeSection, setActiveSection] = useState('inicio')
  const [reservationTab, setReservationTab] = useState('Activas')
  const [reservations, setReservations] = useState([])
  const [isLoadingReservations, setIsLoadingReservations] = useState(true)
  const [reservationsError, setReservationsError] = useState('')
  const [reloadReservations, setReloadReservations] = useState(0)
  const [cancellingId, setCancellingId] = useState(null)
  const [actionMessage, setActionMessage] = useState('')
  const [actionMessageType, setActionMessageType] = useState('')

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
    const controller = new AbortController()

    if (!accessToken) {
      setReservations([])
      setReservationsError('La sesión no tiene un token válido.')
      setIsLoadingReservations(false)
      return () => controller.abort()
    }

    const loadClientReservations = async () => {
      setIsLoadingReservations(true)
      setReservationsError('')

      try {
        const data = await listReservations(accessToken, { signal: controller.signal })
        setReservations(data)
      } catch (requestError) {
        if (requestError.name !== 'AbortError') {
          setReservationsError(requestError.message || 'No fue posible cargar las reservas.')
        }
      } finally {
        if (!controller.signal.aborted) setIsLoadingReservations(false)
      }
    }

    loadClientReservations()
    return () => controller.abort()
  }, [accessToken, reloadReservations])

  const handleCancelReservation = async (reservation) => {
    if (!accessToken) return
    const confirmed = window.confirm(
      `¿Deseas cancelar tu reserva en ${reservation.restaurantName}?`,
    )
    if (!confirmed) return

    setCancellingId(reservation.id)
    setActionMessage('')
    setActionMessageType('')

    try {
      const updatedReservation = await cancelReservation(accessToken, reservation.id)
      setReservations((current) => current.map((item) => (
        item.id === updatedReservation.id ? updatedReservation : item
      )))
      setActionMessage(`Tu reserva en ${reservation.restaurantName} fue cancelada correctamente.`)
      setActionMessageType('success')
    } catch (requestError) {
      setActionMessage(requestError.message || 'No fue posible cancelar la reserva.')
      setActionMessageType('error')
    } finally {
      setCancellingId(null)
    }
  }

  const renderView = () => {
    if (activeSection === 'reservas') {
      return (
        <ReservationsView
          onClose={onClose}
          activeTab={reservationTab}
          setActiveTab={setReservationTab}
          reservations={reservations}
          isLoading={isLoadingReservations}
          error={reservationsError}
          onRetry={() => setReloadReservations((current) => current + 1)}
          onCancel={handleCancelReservation}
          cancellingId={cancellingId}
          actionMessage={actionMessage}
          actionMessageType={actionMessageType}
        />
      )
    }
    if (activeSection === 'perfil') {
      return (
        <ProfileView
          user={user}
          onProfileUpdate={onProfileUpdate}
          onPasswordChange={onPasswordChange}
        />
      )
    }
    return (
      <DashboardView
        onOpenReservations={(tab) => {
          setReservationTab(tab)
          setActiveSection('reservas')
        }}
        onClose={onClose}
        reservations={reservations}
      />
    )
  }

  const userInitials = (user?.name || 'Cliente')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

  return (
    <div
      className="client-panel-overlay"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section className="client-panel-modal" role="dialog" aria-modal="true" aria-label="Panel del cliente">
        <aside className="client-panel-sidebar">
          <img src={assets.logo} className="client-panel-logo" alt="InnovaRest" />
          <p className="client-sidebar-label">Mi cuenta</p>
          <nav aria-label="Navegación del panel del cliente">
            {navItems.map((item) => (
              <button
                type="button"
                key={item.id}
                className={activeSection === item.id ? 'active' : ''}
                onClick={() => setActiveSection(item.id)}
              >
                <span><PanelIcon name={item.icon} /></span>{item.label}
              </button>
            ))}
          </nav>
          <div className="client-sidebar-bottom">
            <div>
              <span>InnovaRest</span>
              <strong>Panel del cliente</strong>
              <p>Reservas, historial y datos personales.</p>
            </div>
            <button type="button" className="client-logout-button" onClick={onLogout}>
              <span><PanelIcon name="logout" /></span>Cerrar sesión
            </button>
          </div>
        </aside>

        <div className="client-panel-main">
          <header className="client-panel-header">
            <div>
              <strong>{navItems.find((item) => item.id === activeSection)?.label}</strong>
              <span>Panel del cliente</span>
            </div>
            <div className="client-panel-user">
              <span className="client-user-avatar">{userInitials}</span>
              <span><strong>{user?.name || 'Cliente'}</strong><small>{user?.email || 'Mi cuenta'}</small></span>
            </div>
            <button type="button" className="client-panel-close" onClick={onClose} aria-label="Cerrar panel">×</button>
          </header>
          <main className="client-panel-content">{renderView()}</main>
        </div>
      </section>
    </div>
  )
}

export default ClientPanelModal
