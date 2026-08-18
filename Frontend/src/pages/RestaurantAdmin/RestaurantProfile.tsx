import { type FormEvent, useEffect, useMemo, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageHeading from "../../components/restaurantAdmin/PageHeading";
import { useAuth } from "../../context/AuthContext";
import {
  getRestaurantAdminProfile,
  listRestaurantSchedules,
  saveRestaurantSchedule,
  updateRestaurantAdminProfile,
  type RestaurantAdminProfile,
  type RestaurantAdminSchedule,
} from "../../services/restaurantAdmin";
import {
  CalenderIcon,
  CheckCircleIcon,
  LockIcon,
  UserCircleIcon,
} from "../../icons";

type RestaurantSession = {
  accessToken: string | null;
  user: { restaurantId?: number | null } | null;
  changePassword: (data: PasswordForm) => Promise<void>;
};

type EditableProfile = {
  description: string;
  phone: string;
};

type PasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
};

type Feedback = {
  message: string;
  type: "success" | "error" | "";
};

const DAYS = [
  { day: 1, dayName: "Lunes" },
  { day: 2, dayName: "Martes" },
  { day: 3, dayName: "Miércoles" },
  { day: 4, dayName: "Jueves" },
  { day: 5, dayName: "Viernes" },
  { day: 6, dayName: "Sábado" },
  { day: 7, dayName: "Domingo" },
];

const EMPTY_PASSWORDS: PasswordForm = {
  currentPassword: "",
  newPassword: "",
  confirmNewPassword: "",
};

const EMPTY_FEEDBACK: Feedback = { message: "", type: "" };

const TIME_OPTIONS = Array.from({ length: 96 }, (_, index) => {
  const hours = Math.floor(index / 4);
  const minutes = (index % 4) * 15;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
});

const formatTime = (value: string) => {
  const [hoursText, minutes] = value.split(":");
  const hours = Number(hoursText);
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes} ${hours < 12 ? "a. m." : "p. m."}`;
};

const buildWeeklySchedules = (
  schedules: RestaurantAdminSchedule[],
): RestaurantAdminSchedule[] => {
  const schedulesByDay = new Map(schedules.map((schedule) => [schedule.day, schedule]));

  return DAYS.map(({ day, dayName }) => schedulesByDay.get(day) ?? {
    day,
    dayName,
    openingTime: "09:00",
    closingTime: "22:00",
    active: false,
  });
};

const FeedbackMessage = ({ feedback }: { feedback: Feedback }) => {
  if (!feedback.message) return null;

  return (
    <p
      className={`rounded-xl px-4 py-3 text-sm font-medium ${
        feedback.type === "error"
          ? "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400"
          : "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400"
      }`}
      role="status"
    >
      {feedback.message}
    </p>
  );
};

export default function RestaurantProfile() {
  const { accessToken, user, changePassword } = useAuth() as RestaurantSession;
  const restaurantId = Number(user?.restaurantId);
  const [profile, setProfile] = useState<RestaurantAdminProfile | null>(null);
  const [editableProfile, setEditableProfile] = useState<EditableProfile>({
    description: "",
    phone: "",
  });
  const [schedules, setSchedules] = useState<RestaurantAdminSchedule[]>([]);
  const [passwords, setPasswords] = useState<PasswordForm>(EMPTY_PASSWORDS);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingSchedules, setIsSavingSchedules] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<Feedback>(EMPTY_FEEDBACK);
  const [scheduleFeedback, setScheduleFeedback] = useState<Feedback>(EMPTY_FEEDBACK);
  const [passwordFeedback, setPasswordFeedback] = useState<Feedback>(EMPTY_FEEDBACK);

  const categoryNames = useMemo(
    () => profile?.categories.map((category) => category.nombre).join(", ") || "Sin categorías asignadas",
    [profile],
  );

  useEffect(() => {
    const controller = new AbortController();

    if (!accessToken || !Number.isInteger(restaurantId) || restaurantId < 1) {
      setLoadError("La sesión no tiene un restaurante asociado.");
      setIsLoading(false);
      return () => controller.abort();
    }

    const loadProfile = async () => {
      setIsLoading(true);
      setLoadError("");

      try {
        const [profileData, scheduleData] = await Promise.all([
          getRestaurantAdminProfile(accessToken, restaurantId, controller.signal),
          listRestaurantSchedules(accessToken, restaurantId, controller.signal),
        ]);

        if (controller.signal.aborted) return;
        setProfile(profileData);
        setEditableProfile({
          description: profileData.description ?? "",
          phone: profileData.phone ?? "",
        });
        setSchedules(buildWeeklySchedules(scheduleData));
      } catch (requestError) {
        if (requestError instanceof Error && requestError.name !== "AbortError") {
          setLoadError(requestError.message);
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    void loadProfile();
    return () => controller.abort();
  }, [accessToken, reloadKey, restaurantId]);

  const updateSchedule = (
    day: number,
    changes: Partial<RestaurantAdminSchedule>,
  ) => {
    setSchedules((current) => current.map((schedule) => (
      schedule.day === day ? { ...schedule, ...changes } : schedule
    )));
    setScheduleFeedback(EMPTY_FEEDBACK);
  };

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken || !profile) return;

    setIsSavingProfile(true);
    setProfileFeedback(EMPTY_FEEDBACK);

    try {
      const updatedProfile = await updateRestaurantAdminProfile(
        accessToken,
        restaurantId,
        {
          description: editableProfile.description.trim(),
          phone: editableProfile.phone.trim(),
        },
      );
      setProfile(updatedProfile);
      setEditableProfile({
        description: updatedProfile.description ?? "",
        phone: updatedProfile.phone ?? "",
      });
      setProfileFeedback({
        message: "Descripción y teléfono actualizados correctamente.",
        type: "success",
      });
    } catch (requestError) {
      setProfileFeedback({
        message: requestError instanceof Error
          ? requestError.message
          : "No fue posible actualizar el perfil.",
        type: "error",
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const saveSchedules = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken) return;

    const invalidSchedule = schedules.find(
      (schedule) => schedule.active && schedule.closingTime <= schedule.openingTime,
    );
    if (invalidSchedule) {
      setScheduleFeedback({
        message: `En ${invalidSchedule.dayName}, el cierre debe ser posterior a la apertura.`,
        type: "error",
      });
      return;
    }

    setIsSavingSchedules(true);
    setScheduleFeedback(EMPTY_FEEDBACK);

    try {
      const savedSchedules = await Promise.all(schedules.map((schedule) => (
        saveRestaurantSchedule(accessToken, restaurantId, schedule.day, {
          openingTime: schedule.openingTime,
          closingTime: schedule.closingTime,
          active: schedule.active,
        })
      )));
      setSchedules(buildWeeklySchedules(savedSchedules));
      setScheduleFeedback({
        message: "Horarios actualizados. Ya se aplican a las nuevas reservas.",
        type: "success",
      });
    } catch (requestError) {
      setScheduleFeedback({
        message: requestError instanceof Error
          ? requestError.message
          : "No fue posible actualizar los horarios.",
        type: "error",
      });
    } finally {
      setIsSavingSchedules(false);
    }
  };

  const savePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordFeedback(EMPTY_FEEDBACK);

    if (passwords.newPassword.length < 8) {
      setPasswordFeedback({
        message: "La nueva contraseña debe tener al menos 8 caracteres.",
        type: "error",
      });
      return;
    }
    if (passwords.newPassword !== passwords.confirmNewPassword) {
      setPasswordFeedback({
        message: "La confirmación no coincide con la nueva contraseña.",
        type: "error",
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      await changePassword(passwords);
      setPasswords(EMPTY_PASSWORDS);
      setPasswordFeedback({
        message: "Contraseña actualizada correctamente.",
        type: "success",
      });
    } catch (requestError) {
      setPasswordFeedback({
        message: requestError instanceof Error
          ? requestError.message
          : "No fue posible actualizar la contraseña.",
        type: "error",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const lockedInputClass = "admin-input cursor-not-allowed bg-gray-100 text-gray-500 disabled:opacity-100 dark:bg-gray-800/70 dark:text-gray-400";

  return (
    <>
      <PageMeta
        title="Perfil del restaurante | InnovaRest"
        description="Configuración real del perfil y horarios del restaurante."
      />

      <div className="space-y-6">
        <PageHeading
          title="Perfil del restaurante"
          description="Consulta los datos administrativos y gestiona la información operativa que sí corresponde al restaurante."
        />

        {isLoading && (
          <p className="rounded-2xl border border-gray-200 bg-white px-5 py-4 text-sm text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
            Cargando perfil y horarios reales...
          </p>
        )}

        {loadError && (
          <div className="flex flex-col gap-3 rounded-2xl bg-error-50 px-5 py-4 text-sm text-error-700 dark:bg-error-500/15 dark:text-error-400 sm:flex-row sm:items-center sm:justify-between">
            <span>{loadError}</span>
            <button
              type="button"
              onClick={() => setReloadKey((current) => current + 1)}
              className="rounded-xl bg-error-500 px-4 py-2 font-semibold text-white"
            >
              Intentar nuevamente
            </button>
          </div>
        )}

        {!isLoading && !loadError && profile && (
          <>
            <form
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] sm:p-6"
              onSubmit={saveProfile}
            >
              <div className="flex items-center gap-3 border-b border-gray-100 pb-5 dark:border-gray-800">
                <div className="flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/15">
                  <UserCircleIcon className="size-6" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-800 dark:text-white/90">Información del restaurante</h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Los campos con candado solamente puede modificarlos el superadministrador.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nombre <LockIcon className="size-4 text-gray-400" />
                  </span>
                  <input value={profile.name} className={lockedInputClass} disabled />
                </label>

                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Categorías <LockIcon className="size-4 text-gray-400" />
                  </span>
                  <input value={categoryNames} className={lockedInputClass} disabled />
                </label>

                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Ciudad <LockIcon className="size-4 text-gray-400" />
                  </span>
                  <input
                    value={`${profile.city}, ${profile.department}`}
                    className={lockedInputClass}
                    disabled
                  />
                </label>

                <label className="block sm:col-span-2">
                  <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Descripción
                  </span>
                  <textarea
                    value={editableProfile.description}
                    onChange={(event) => {
                      setEditableProfile((current) => ({
                        ...current,
                        description: event.target.value,
                      }));
                      setProfileFeedback(EMPTY_FEEDBACK);
                    }}
                    placeholder="Descripción pública del restaurante"
                    rows={4}
                    className="admin-input min-h-28 py-3"
                  />
                </label>

                <label className="block sm:col-span-2">
                  <span className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Dirección <LockIcon className="size-4 text-gray-400" />
                  </span>
                  <input value={profile.address} className={lockedInputClass} disabled />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Teléfono
                  </span>
                  <input
                    type="tel"
                    value={editableProfile.phone}
                    onChange={(event) => {
                      setEditableProfile((current) => ({
                        ...current,
                        phone: event.target.value,
                      }));
                      setProfileFeedback(EMPTY_FEEDBACK);
                    }}
                    placeholder="Teléfono de contacto"
                    className="admin-input"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Correo de acceso <LockIcon className="size-4 text-gray-400" />
                  </span>
                  <input type="email" value={profile.email} className={lockedInputClass} disabled />
                </label>
              </div>

              <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <FeedbackMessage feedback={profileFeedback} />
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="ml-auto rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white shadow-theme-xs transition hover:bg-brand-600 disabled:cursor-wait disabled:opacity-60"
                >
                  {isSavingProfile ? "Guardando..." : "Guardar descripción y teléfono"}
                </button>
              </div>
            </form>

            <form
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] sm:p-6"
              onSubmit={saveSchedules}
            >
              <div className="flex items-center gap-3 border-b border-gray-100 pb-5 dark:border-gray-800">
                <div className="flex size-11 items-center justify-center rounded-xl bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-400">
                  <CalenderIcon className="size-6" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-800 dark:text-white/90">Horario semanal de reservas</h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Intervalos de 15 minutos. La última reserva se ofrecerá una hora antes del cierre.
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {schedules.map((schedule) => (
                  <div
                    key={schedule.day}
                    className={`grid gap-4 rounded-2xl border p-4 transition md:grid-cols-[minmax(130px,1fr)_minmax(150px,1fr)_minmax(150px,1fr)] md:items-end ${
                      schedule.active
                        ? "border-brand-200 bg-brand-50/40 dark:border-brand-500/25 dark:bg-brand-500/5"
                        : "border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/40"
                    }`}
                  >
                    <label className="flex min-h-11 items-center gap-3">
                      <input
                        type="checkbox"
                        checked={schedule.active}
                        onChange={(event) => updateSchedule(schedule.day, {
                          active: event.target.checked,
                        })}
                        className="size-4 accent-[#ff6347]"
                      />
                      <span>
                        <span className="block text-sm font-semibold text-gray-800 dark:text-white/90">
                          {schedule.dayName}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {schedule.active ? "Recibe reservas" : "Cerrado"}
                        </span>
                      </span>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-xs font-medium text-gray-600 dark:text-gray-400">Apertura</span>
                      <select
                        value={schedule.openingTime}
                        onChange={(event) => updateSchedule(schedule.day, {
                          openingTime: event.target.value,
                        })}
                        disabled={!schedule.active || isSavingSchedules}
                        className="admin-input disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 dark:disabled:bg-gray-800"
                      >
                        {TIME_OPTIONS.map((time) => (
                          <option key={time} value={time}>{formatTime(time)}</option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-xs font-medium text-gray-600 dark:text-gray-400">Cierre</span>
                      <select
                        value={schedule.closingTime}
                        onChange={(event) => updateSchedule(schedule.day, {
                          closingTime: event.target.value,
                        })}
                        disabled={!schedule.active || isSavingSchedules}
                        className="admin-input disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 dark:disabled:bg-gray-800"
                      >
                        {TIME_OPTIONS.map((time) => (
                          <option key={time} value={time}>{formatTime(time)}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <FeedbackMessage feedback={scheduleFeedback} />
                <button
                  type="submit"
                  disabled={isSavingSchedules}
                  className="ml-auto rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white shadow-theme-xs transition hover:bg-brand-600 disabled:cursor-wait disabled:opacity-60"
                >
                  {isSavingSchedules ? "Guardando horarios..." : "Guardar horarios"}
                </button>
              </div>
            </form>

            <form
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] sm:p-6"
              onSubmit={savePassword}
            >
              <div className="flex items-center gap-3 border-b border-gray-100 pb-5 dark:border-gray-800">
                <div className="flex size-11 items-center justify-center rounded-xl bg-error-50 text-error-500 dark:bg-error-500/15">
                  <LockIcon className="size-6" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-800 dark:text-white/90">Seguridad de la cuenta</h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Cambia la contraseña del administrador sin modificar el correo de acceso.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-5 md:grid-cols-3">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Contraseña actual</span>
                  <input
                    type="password"
                    value={passwords.currentPassword}
                    onChange={(event) => setPasswords((current) => ({
                      ...current,
                      currentPassword: event.target.value,
                    }))}
                    autoComplete="current-password"
                    className="admin-input"
                    required
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Nueva contraseña</span>
                  <input
                    type="password"
                    value={passwords.newPassword}
                    onChange={(event) => setPasswords((current) => ({
                      ...current,
                      newPassword: event.target.value,
                    }))}
                    autoComplete="new-password"
                    minLength={8}
                    className="admin-input"
                    required
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Confirmar contraseña</span>
                  <input
                    type="password"
                    value={passwords.confirmNewPassword}
                    onChange={(event) => setPasswords((current) => ({
                      ...current,
                      confirmNewPassword: event.target.value,
                    }))}
                    autoComplete="new-password"
                    minLength={8}
                    className="admin-input"
                    required
                  />
                </label>
              </div>

              <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <FeedbackMessage feedback={passwordFeedback} />
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="ml-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-wait disabled:opacity-60 dark:bg-white dark:text-gray-900"
                >
                  <CheckCircleIcon className="size-5" />
                  {isChangingPassword ? "Actualizando..." : "Cambiar contraseña"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </>
  );
}
