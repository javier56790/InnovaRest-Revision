import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import { useAuth } from "../../../context/AuthContext";
import { formatReservationTime } from "../../../services/reservations";
import LoginPopup from "../../public/components/LoginPopup/LoginPopup";
import RestaurantLocationMap from "../../public/components/RestaurantLocationMap/RestaurantLocationMap";
import InnovaFooter from "../components/InnovaFooter";
import InnovaNavbar from "../components/InnovaNavbar";
import "./ReservationPage.css";

type RestaurantCategory = {
  id: number;
  nombre: string;
  slug: string;
  activa: boolean;
};

type RestaurantSchedule = {
  day: number;
  dayName: string;
  openingTime: string;
  closingTime: string;
};

type AvailabilitySlot = {
  time: string;
  available: boolean;
};

type AvailabilityResponse = {
  restaurantId: number;
  date: string;
  people: number;
  capacity: number | null;
  allowedCapacities: number[];
  requiresArrangement: boolean;
  isReservable: boolean;
  unavailableReason: string | null;
  hasSchedule: boolean;
  hasCapacity: boolean;
  slots: AvailabilitySlot[];
};

export type RestaurantSummary = {
  id?: string | number;
  name?: string;
  category?: string;
  categories?: RestaurantCategory[];
  image?: string;
  location?: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  isReservable?: boolean;
  unavailableReason?: string | null;
  rating?: number;
  tableCapacities?: number[];
  schedules?: RestaurantSchedule[];
};

type ReservationLocationState = {
  restaurant?: RestaurantSummary;
  returnTo?: string;
};

type ReservationForm = {
  date: string;
  time: string;
  people: string;
  tableCapacity: string;
};

type AuthenticatedUser = {
  id: number;
  name: string;
  email: string;
  role: "CLIENTE" | "RESTAURANTE" | "SUPERADMIN";
};

type AuthContextValue = {
  accessToken: string | null;
  isAuthenticated: boolean;
  isRestoring: boolean;
  login: (credentials: { email: string; password: string }) => Promise<AuthenticatedUser>;
  register: (clientData: {
    name: string;
    phone: string;
    email: string;
    password: string;
    confirmPassword: string;
  }) => Promise<AuthenticatedUser>;
  user: AuthenticatedUser | null;
};

type ReservationCreateResponse = {
  id: number;
  startTime: string;
  status: string;
  table: { name: string } | null;
};

const initialForm: ReservationForm = {
  date: "",
  time: "",
  people: "2",
  tableCapacity: "",
};

function timeToMinutes(value?: string) {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) {
    return null;
  }

  const [hours, minutes] = value.split(":").map(Number);
  if (hours > 23 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
}

function createTimeSlot(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const value = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  const displayHours = hours % 12 || 12;
  const period = hours < 12 ? "a. m." : "p. m.";

  return {
    value,
    label: `${displayHours}:${String(minutes).padStart(2, "0")} ${period}`,
  };
}

function getLocalToday() {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - timezoneOffset).toISOString().split("T")[0];
}

function getRestaurantCoordinates(restaurant?: RestaurantSummary) {
  if (
    restaurant?.latitude === null
    || restaurant?.latitude === undefined
    || restaurant?.latitude === ''
    || restaurant?.longitude === null
    || restaurant?.longitude === undefined
    || restaurant?.longitude === ''
  ) {
    return null;
  }

  const latitude = Number(restaurant.latitude);
  const longitude = Number(restaurant.longitude);

  if (
    !Number.isFinite(latitude)
    || !Number.isFinite(longitude)
    || latitude < -90
    || latitude > 90
    || longitude < -180
    || longitude > 180
  ) {
    return null;
  }

  return [latitude, longitude] as const;
}

function findApiError(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const message = findApiError(item);
      if (message) return message;
    }
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) {
      const message = findApiError(item);
      if (message) return message;
    }
  }
  return null;
}

function ReservationPage() {
  const { restaurantId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const navigationState = location.state as ReservationLocationState | null;
  const {
    accessToken,
    isAuthenticated,
    isRestoring,
    login,
    register,
    user,
  } = useAuth() as AuthContextValue;
  const [restaurant, setRestaurant] = useState<RestaurantSummary | undefined>(
    navigationState?.restaurant,
  );
  const [isLoadingRestaurant, setIsLoadingRestaurant] = useState(
    Boolean(restaurantId),
  );
  const [restaurantError, setRestaurantError] = useState("");
  const [form, setForm] = useState<ReservationForm>(initialForm);
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([]);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "info" | "">("");
  const [showLogin, setShowLogin] = useState(false);
  const [isSubmittingReservation, setIsSubmittingReservation] = useState(false);
  const today = useMemo(getLocalToday, []);

  useEffect(() => {
    if (!restaurantId) {
      setIsLoadingRestaurant(false);
      return undefined;
    }

    const controller = new AbortController();

    const loadRestaurant = async () => {
      setIsLoadingRestaurant(true);
      setRestaurantError("");

      try {
        const response = await fetch(
          `/api/restaurantes/${encodeURIComponent(restaurantId)}/`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          throw new Error(`La API respondió con estado ${response.status}.`);
        }

        const data = await response.json() as RestaurantSummary;
        setRestaurant((current) => ({
          ...current,
          ...data,
          category: data.category || data.categories?.[0]?.nombre || current?.category,
        }));
      } catch (requestError) {
        if (requestError instanceof Error && requestError.name !== "AbortError") {
          setRestaurantError("No fue posible cargar el detalle del restaurante.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingRestaurant(false);
        }
      }
    };

    loadRestaurant();

    return () => controller.abort();
  }, [restaurantId]);

  const selectedRestaurantId = restaurant?.id ?? restaurantId;
  const isRestaurantReservable = restaurant?.isReservable !== false;
  const tableCapacities = useMemo(
    () => [...(restaurant?.tableCapacities || [])].sort((first, second) => (
      first - second
    )),
    [restaurant?.tableCapacities],
  );
  const peopleCount = Number(form.people);
  const maximumTableCapacity = tableCapacities[tableCapacities.length - 1] || 0;
  const requiresArrangement = Number.isInteger(peopleCount)
    && peopleCount > maximumTableCapacity
    && maximumTableCapacity > 0;
  const enabledTableCapacities = useMemo(
    () => {
      if (!Number.isInteger(peopleCount) || peopleCount < 1 || requiresArrangement) {
        return [];
      }

      return tableCapacities
        .filter((capacity) => capacity >= peopleCount)
        .slice(0, 2);
    },
    [peopleCount, requiresArrangement, tableCapacities],
  );
  const timeSlots = useMemo(() => (
    availabilitySlots.flatMap((slot) => {
      const minutes = timeToMinutes(slot.time);

      if (minutes === null) {
        return [];
      }

      return [{
        ...createTimeSlot(minutes),
        available: slot.available,
      }];
    })
  ), [availabilitySlots]);

  useEffect(() => {
    if (!tableCapacities.length) {
      return;
    }

    const currentCapacity = Number(form.tableCapacity);

    if (!enabledTableCapacities.includes(currentCapacity)) {
      const nextCapacity = enabledTableCapacities[0]
        ? String(enabledTableCapacities[0])
        : "";

      setForm((current) => ({
        ...current,
        tableCapacity: nextCapacity,
        time: "",
      }));
    }
  }, [enabledTableCapacities, form.tableCapacity, tableCapacities.length]);

  useEffect(() => {
    const people = Number(form.people);
    const capacity = Number(form.tableCapacity);

    if (!isRestaurantReservable) {
      setAvailabilitySlots([]);
      setAvailabilityError(
        restaurant?.unavailableReason
        || "El restaurante no acepta reservas hasta configurar al menos una mesa activa.",
      );
      setIsLoadingAvailability(false);
      return undefined;
    }

    if (form.people === "") {
      setAvailabilitySlots([]);
      setAvailabilityError("");
      setIsLoadingAvailability(false);
      return undefined;
    }

    if (people === 0) {
      setAvailabilitySlots([]);
      setAvailabilityError("El número de personas no puede ser 0.");
      setIsLoadingAvailability(false);
      return undefined;
    }

    if (!Number.isInteger(people) || people < 0) {
      setAvailabilitySlots([]);
      setAvailabilityError("Ingresa un número válido de personas.");
      setIsLoadingAvailability(false);
      return undefined;
    }

    if (!selectedRestaurantId || !form.date) {
      setAvailabilitySlots([]);
      setAvailabilityError("");
      setIsLoadingAvailability(false);
      return undefined;
    }

    if (
      !requiresArrangement
      && (
        !Number.isInteger(capacity)
        || !enabledTableCapacities.includes(capacity)
      )
    ) {
      setAvailabilitySlots([]);
      setAvailabilityError("");
      setIsLoadingAvailability(false);
      return undefined;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({
      fecha: form.date,
      personas: String(people),
    });

    if (!requiresArrangement) {
      params.set("capacidad", String(capacity));
    }

    const loadAvailability = async () => {
      setIsLoadingAvailability(true);
      setAvailabilityError("");

      try {
        const response = await fetch(
          `/api/restaurantes/${encodeURIComponent(selectedRestaurantId)}/disponibilidad/?${params}`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          throw new Error(`La API respondió con estado ${response.status}.`);
        }

        const data = await response.json() as AvailabilityResponse;
        setAvailabilitySlots(Array.isArray(data.slots) ? data.slots : []);

        if (!data.isReservable) {
          setAvailabilityError(
            data.unavailableReason
            || "El restaurante no acepta reservas hasta configurar al menos una mesa activa.",
          );
        } else if (!data.hasSchedule) {
          setAvailabilityError("El restaurante no atiende en la fecha seleccionada.");
        } else if (!data.requiresArrangement && !data.hasCapacity) {
          setAvailabilityError(
            "No hay mesas activas para la capacidad seleccionada.",
          );
        }
      } catch (requestError) {
        if (requestError instanceof Error && requestError.name !== "AbortError") {
          setAvailabilitySlots([]);
          setAvailabilityError("No fue posible consultar la disponibilidad.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingAvailability(false);
        }
      }
    };

    loadAvailability();

    return () => controller.abort();
  }, [
    enabledTableCapacities,
    form.date,
    form.people,
    form.tableCapacity,
    isRestaurantReservable,
    requiresArrangement,
    restaurant?.unavailableReason,
    selectedRestaurantId,
  ]);

  const hasRestaurantData = Boolean(
    restaurant?.name || restaurant?.image || restaurant?.location,
  );
  const restaurantCoordinates = getRestaurantCoordinates(restaurant);
  const googleMapsUrl = restaurantCoordinates
    ? `https://www.google.com/maps/search/?api=1&query=${restaurantCoordinates[0]},${restaurantCoordinates[1]}`
    : null;

  const updateField = (field: keyof ReservationForm, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(
        field === "people" || field === "tableCapacity"
          ? { time: "" }
          : {}
      ),
    }));
    setMessage("");
    setMessageType("");
  };

  const updateDate = (value: string) => {
    setForm((current) => ({ ...current, date: value, time: "" }));
    setMessage("");
    setMessageType("");
  };

  const handleBack = () => {
    if (navigationState?.returnTo) {
      navigate(navigationState.returnTo);
      return;
    }

    navigate(-1);
  };

  const handleReservationLogin = async (credentials: { email: string; password: string }) => {
    const authenticatedUser = await login(credentials);
    setShowLogin(false);

    if (authenticatedUser.role === "RESTAURANTE") {
      navigate("/panel-restaurante");
      return;
    }

    if (authenticatedUser.role === "SUPERADMIN") {
      navigate("/superadmin");
      return;
    }

    setMessage("Sesión iniciada. Revisa los datos y presiona Confirmar reserva nuevamente.");
    setMessageType("info");
  };

  const handleReservationRegister = async (clientData: {
    name: string;
    phone: string;
    email: string;
    password: string;
    confirmPassword: string;
  }) => {
    await register(clientData);
    setShowLogin(false);
    setMessage("Cuenta creada. Revisa los datos y presiona Confirmar reserva nuevamente.");
    setMessageType("info");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isRestaurantReservable) {
      setMessage(
        restaurant?.unavailableReason
        || "El restaurante no acepta reservas hasta configurar al menos una mesa activa.",
      );
      setMessageType("error");
      return;
    }

    if (peopleCount === 0) {
      setMessage("El número de personas no puede ser 0.");
      setMessageType("error");
      return;
    }

    if (
      !form.date
      || !form.time
      || (!requiresArrangement && !form.tableCapacity)
    ) {
      setMessage("Completa los datos de la reserva antes de continuar.");
      setMessageType("error");
      return;
    }

    if (isLoadingAvailability) {
      setMessage("Espera mientras se consulta la disponibilidad.");
      setMessageType("error");
      return;
    }

    if (!timeSlots.some((slot) => slot.available)) {
      setMessage("El restaurante no tiene un horario disponible para reservar.");
      setMessageType("error");
      return;
    }

    if (!timeSlots.some((slot) => slot.value === form.time && slot.available)) {
      setMessage("Selecciona una hora disponible dentro del horario del restaurante.");
      setMessageType("error");
      return;
    }

    const numericRestaurantId = Number(selectedRestaurantId);
    if (!Number.isInteger(numericRestaurantId) || numericRestaurantId < 1) {
      setMessage("No fue posible identificar el restaurante seleccionado.");
      setMessageType("error");
      return;
    }

    if (isRestoring) {
      setMessage("Espera mientras se valida tu sesión.");
      setMessageType("info");
      return;
    }

    if (!isAuthenticated || !accessToken || !user) {
      setMessage("Inicia sesión como cliente para confirmar la reserva.");
      setMessageType("info");
      setShowLogin(true);
      return;
    }

    if (user.role !== "CLIENTE") {
      setMessage("Solo una cuenta de cliente puede registrar reservas.");
      setMessageType("error");
      return;
    }

    const selectedTime = form.time;
    setIsSubmittingReservation(true);
    setMessage("");
    setMessageType("");

    try {
      const response = await fetch("/api/reservas/", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          restaurantId: numericRestaurantId,
          date: form.date,
          time: selectedTime,
          people: peopleCount,
          tableCapacity: requiresArrangement ? null : Number(form.tableCapacity),
        }),
      });
      const responseBody = await response.json().catch(() => ({})) as unknown;

      if (!response.ok) {
        throw new Error(
          findApiError(responseBody)
          || "No fue posible registrar la reserva.",
        );
      }

      const reservation = responseBody as ReservationCreateResponse;
      const tableMessage = reservation.table
        ? ` Mesa asignada: ${reservation.table.name}.`
        : " El restaurante gestionará internamente la acomodación.";

      setAvailabilitySlots((current) => current.map((slot) => (
        slot.time === selectedTime ? { ...slot, available: false } : slot
      )));
      setForm((current) => ({ ...current, time: "" }));
      setMessage(
        `Reserva confirmada para ${form.date} a las ${formatReservationTime(reservation.startTime)}.${tableMessage}`,
      );
      setMessageType("success");
    } catch (requestError) {
      setMessage(
        requestError instanceof Error
          ? requestError.message
          : "No fue posible registrar la reserva.",
      );
      setMessageType("error");
    } finally {
      setIsSubmittingReservation(false);
    }
  };

  return (
    <div className="reservation-page">
      {showLogin && (
        <LoginPopup
          setShowLogin={setShowLogin}
          onLogin={handleReservationLogin}
          onRegister={handleReservationRegister}
        />
      )}
      <div className="reservation-shell">
        <InnovaNavbar onBack={handleBack} />

        <main>
          <section className="reservation-intro">
            <span className="reservation-intro__eyebrow">Reserva de mesa</span>
            <h1>Completa los datos de tu reserva</h1>
            <p>
              Confirma el restaurante seleccionado y elige la fecha, la hora y
              la capacidad de mesa que necesitas.
            </p>
          </section>

          <section className="reservation-layout" id="reserva">
            <article
              className={`restaurant-summary${hasRestaurantData ? "" : " restaurant-summary--empty"}`}
              aria-label="Restaurante seleccionado"
            >
              <div className="restaurant-summary__image">
                {restaurant?.image ? (
                  <img src={restaurant.image} alt={restaurant.name || "Restaurante seleccionado"} />
                ) : (
                  <div className="restaurant-summary__image-placeholder" aria-hidden="true">
                    <span>Imagen del restaurante</span>
                  </div>
                )}
              </div>

              <div className="restaurant-summary__content">
                <span className="restaurant-summary__label">Restaurante seleccionado</span>

                {restaurant?.name ? (
                  <h2>{restaurant.name}</h2>
                ) : (
                  <div className="placeholder-line placeholder-line--title" aria-label="Nombre pendiente" />
                )}

                <div className="restaurant-summary__metadata">
                  {typeof restaurant?.rating === "number" ? (
                    <span className="restaurant-summary__rating" aria-label={`Calificación ${restaurant.rating} de 5`}>
                      <span aria-hidden="true">★</span> {restaurant.rating.toFixed(1)}
                    </span>
                  ) : (
                    <div className="placeholder-line placeholder-line--rating" aria-label="Calificación pendiente" />
                  )}

                  {restaurant?.location ? (
                    <span className="restaurant-summary__location">{restaurant.location}</span>
                  ) : (
                    <div className="placeholder-line placeholder-line--location" aria-label="Ubicación pendiente" />
                  )}
                </div>

                {restaurant?.category && (
                  <span className="restaurant-summary__category">{restaurant.category}</span>
                )}

                {!isRestaurantReservable && (
                  <p className="restaurant-summary__availability-warning" role="status">
                    Reservas no disponibles: el restaurante no tiene mesas activas configuradas.
                  </p>
                )}

                {isLoadingRestaurant && (
                  <p className="restaurant-summary__waiting">Cargando horario...</p>
                )}

                {restaurantError && (
                  <p className="restaurant-summary__waiting" role="alert">
                    {restaurantError}
                  </p>
                )}

                {!hasRestaurantData && (
                  <p className="restaurant-summary__waiting">
                    Esta tarjeta se completará automáticamente con los datos del
                    restaurante elegido.
                  </p>
                )}

                {selectedRestaurantId && (
                  <span className="restaurant-summary__reference">
                    Referencia: {selectedRestaurantId}
                  </span>
                )}
              </div>

              <section className="restaurant-summary__map-card" aria-label="Ubicación del restaurante">
                <div className="restaurant-summary__map-heading">
                  <div>
                    <span>Ubicación</span>
                    <h3>Encuentra el restaurante</h3>
                  </div>
                  {googleMapsUrl && (
                    <a href={googleMapsUrl} target="_blank" rel="noreferrer">
                      Abrir en Google Maps
                    </a>
                  )}
                </div>

                {restaurantCoordinates && restaurant ? (
                  <div className="restaurant-summary__map-frame">
                    <RestaurantLocationMap
                      restaurants={[restaurant]}
                      selectedRestaurantId={restaurant.id ?? restaurantId}
                    />
                  </div>
                ) : (
                  <div className="restaurant-summary__map-empty" role="status">
                    <span aria-hidden="true">⌖</span>
                    <div>
                      <strong>Ubicación pendiente</strong>
                      <p>El mapa aparecerá cuando el restaurante registre sus coordenadas.</p>
                    </div>
                  </div>
                )}
              </section>
            </article>

            <form className="reservation-form" onSubmit={handleSubmit} noValidate>
              <div className="reservation-form__heading">
                <span>Paso final</span>
                <h2>Datos de la reserva</h2>
              </div>

              <div className="reservation-form__grid">
                <label className="reservation-field">
                  <span>Fecha</span>
                  <input
                    type="date"
                    min={today}
                    value={form.date}
                    onChange={(event) => updateDate(event.target.value)}
                    onClick={(event) => event.currentTarget.showPicker?.()}
                    disabled={!isRestaurantReservable}
                    required
                  />
                </label>

                <label className="reservation-field">
                  <span>Hora</span>
                  <select
                    value={form.time}
                    onChange={(event) => updateField("time", event.target.value)}
                    disabled={
                      isLoadingRestaurant
                      || isLoadingAvailability
                      || !isRestaurantReservable
                      || !form.date
                      || !timeSlots.some((slot) => slot.available)
                    }
                    required
                  >
                    <option value="">
                      {isLoadingRestaurant || isLoadingAvailability
                        ? "Consultando disponibilidad"
                        : !form.date
                          ? "Selecciona primero una fecha"
                          : timeSlots.some((slot) => slot.available)
                            ? "Selecciona una hora"
                          : "Horario no disponible"}
                    </option>
                    {timeSlots.map((slot) => (
                      <option
                        key={slot.value}
                        value={slot.value}
                        disabled={!slot.available}
                      >
                        {slot.label}{slot.available ? "" : " — No disponible"}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="reservation-field">
                  <span>Número de personas</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={form.people}
                    onChange={(event) => updateField("people", event.target.value)}
                    disabled={!isRestaurantReservable}
                    required
                  />
                </label>

                <label className="reservation-field">
                  <span>Capacidad de la mesa</span>
                  <select
                    value={form.tableCapacity}
                    onChange={(event) => updateField("tableCapacity", event.target.value)}
                    disabled={
                      isLoadingRestaurant
                      || !isRestaurantReservable
                      || !tableCapacities.length
                    }
                    required={!requiresArrangement}
                  >
                    {!tableCapacities.length && (
                      <option value="">Cargando capacidades</option>
                    )}
                    {requiresArrangement && (
                      <option value="">Acomodación por el restaurante</option>
                    )}
                    {tableCapacities.map((capacity) => {
                      const isEnabled = enabledTableCapacities.includes(capacity);

                      return (
                        <option
                          key={capacity}
                          value={capacity}
                          disabled={!isEnabled}
                        >
                          Mesa para {capacity}
                          {isEnabled ? "" : " — No disponible para este grupo"}
                        </option>
                      );
                    })}
                  </select>
                </label>

              </div>

              {availabilityError && (
                <p
                  className="reservation-form__message reservation-form__message--error"
                  role="status"
                >
                  {availabilityError}
                </p>
              )}

              {isRestaurantReservable && requiresArrangement && (
                <p
                  className="reservation-form__message reservation-form__message--info"
                  role="status"
                >
                  El restaurante se encargará internamente de la acomodación
                  para este grupo.
                </p>
              )}

              <button
                className="reservation-form__submit"
                type="submit"
                disabled={
                  isSubmittingReservation
                  || isRestoring
                  || !isRestaurantReservable
                }
              >
                {!isRestaurantReservable
                  ? "Reservas no disponibles"
                  : isSubmittingReservation
                  ? "Registrando reserva..."
                  : isRestoring
                    ? "Validando sesión..."
                    : "Confirmar reserva"}
              </button>

              {message && (
                <p
                  className={`reservation-form__message reservation-form__message--${messageType}`}
                  role="status"
                >
                  {message}
                </p>
              )}
            </form>
          </section>
        </main>
      </div>

      <InnovaFooter />
    </div>
  );
}

export default ReservationPage;
