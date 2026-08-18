import { type FormEvent, useEffect, useMemo, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import EmptyState from "../../components/restaurantAdmin/EmptyState";
import PageHeading from "../../components/restaurantAdmin/PageHeading";
import { useAuth } from "../../context/AuthContext";
import {
  createRestaurantTable,
  listRestaurantTables,
  updateRestaurantTable,
  type RestaurantAdminTable,
} from "../../services/restaurantAdmin";
import { PlusIcon, TableIcon } from "../../icons";

type TableForm = {
  label: string;
  minimumCapacity: string;
  maximumCapacity: string;
  active: boolean;
};

type RestaurantSession = {
  accessToken: string | null;
  user: {
    restaurantId?: number | null;
  } | null;
};

const initialForm: TableForm = {
  label: "",
  minimumCapacity: "1",
  maximumCapacity: "2",
  active: true,
};

const sortTables = (tables: RestaurantAdminTable[]) => [...tables].sort(
  (first, second) => (
    first.maxCapacity - second.maxCapacity
    || first.id - second.id
  ),
);

export default function TablesManagement() {
  const { accessToken, user } = useAuth() as RestaurantSession;
  const restaurantId = Number(user?.restaurantId);
  const [tables, setTables] = useState<RestaurantAdminTable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<TableForm>(initialForm);
  const [formError, setFormError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [pendingDeactivation, setPendingDeactivation] = useState<RestaurantAdminTable | null>(null);
  const activeTables = useMemo(
    () => tables.filter((table) => table.active),
    [tables],
  );

  useEffect(() => {
    const controller = new AbortController();

    if (!accessToken || !Number.isInteger(restaurantId) || restaurantId < 1) {
      setTables([]);
      setLoadError("La sesión no tiene un restaurante asociado.");
      setIsLoading(false);
      return () => controller.abort();
    }

    const loadTables = async () => {
      setIsLoading(true);
      setLoadError("");

      try {
        const data = await listRestaurantTables(
          accessToken,
          restaurantId,
          controller.signal,
        );
        setTables(sortTables(data));
      } catch (requestError) {
        if (requestError instanceof Error && requestError.name !== "AbortError") {
          setLoadError(requestError.message);
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    loadTables();
    return () => controller.abort();
  }, [accessToken, reloadKey, restaurantId]);

  useEffect(() => {
    if (!pendingDeactivation) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPendingDeactivation(null);
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [pendingDeactivation]);

  const openForm = () => {
    setForm(initialForm);
    setFormError("");
    setActionMessage("");
    setActionError(false);
    setIsFormOpen(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const minimumCapacity = Number(form.minimumCapacity);
    const maximumCapacity = Number(form.maximumCapacity);

    if (!form.label.trim()) {
      setFormError("Escribe un identificador para la mesa.");
      return;
    }

    if (
      !Number.isInteger(minimumCapacity)
      || !Number.isInteger(maximumCapacity)
      || minimumCapacity < 1
      || maximumCapacity < minimumCapacity
    ) {
      setFormError("La capacidad máxima debe ser igual o mayor que la mínima.");
      return;
    }

    if (!accessToken || !Number.isInteger(restaurantId) || restaurantId < 1) {
      setFormError("La sesión no tiene un restaurante asociado.");
      return;
    }

    setIsSaving(true);
    setFormError("");

    try {
      const createdTable = await createRestaurantTable(accessToken, restaurantId, {
        name: form.label.trim(),
        minCapacity: minimumCapacity,
        maxCapacity: maximumCapacity,
        active: form.active,
      });
      setTables((current) => sortTables([...current, createdTable]));
      setIsFormOpen(false);
      setActionError(false);
      setActionMessage(`La mesa ${createdTable.name} fue registrada correctamente.`);
    } catch (requestError) {
      setFormError(
        requestError instanceof Error
          ? requestError.message
          : "No fue posible registrar la mesa.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const toggleTable = async (table: RestaurantAdminTable) => {
    if (!accessToken || !Number.isInteger(restaurantId) || restaurantId < 1) return;

    setProcessingId(table.id);
    setActionMessage("");
    setActionError(false);

    try {
      const updatedTable = await updateRestaurantTable(
        accessToken,
        restaurantId,
        table.id,
        { active: !table.active },
      );
      setTables((current) => sortTables(current.map((currentTable) => (
        currentTable.id === updatedTable.id ? updatedTable : currentTable
      ))));
      setActionMessage(
        updatedTable.active
          ? `${updatedTable.name} quedó activa para nuevas reservas.`
          : `${updatedTable.name} fue desactivada.`,
      );
    } catch (requestError) {
      setActionError(true);
      setActionMessage(
        requestError instanceof Error
          ? requestError.message
          : "No fue posible actualizar la mesa.",
      );
    } finally {
      setProcessingId(null);
    }
  };

  const requestTableToggle = (table: RestaurantAdminTable) => {
    if (table.active && activeTables.length === 1) {
      setPendingDeactivation(table);
      return;
    }

    void toggleTable(table);
  };

  const confirmLastTableDeactivation = () => {
    if (!pendingDeactivation) return;

    const table = pendingDeactivation;
    setPendingDeactivation(null);
    void toggleTable(table);
  };

  return (
    <>
      <PageMeta
        title="Mesas | Panel InnovaRest"
        description="Gestión de mesas y capacidades del restaurante."
      />

      <div className="space-y-6">
        <PageHeading
          title="Mesas"
          description="Registra las mesas internas y define sus capacidades. El número exacto será visible solamente para el restaurante."
          action={
            <button
              type="button"
              onClick={openForm}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white shadow-theme-xs transition hover:bg-brand-600"
            >
              <PlusIcon className="size-5" />
              Nueva mesa
            </button>
          }
        />

        {!isLoading && !loadError && activeTables.length === 0 && (
          <p className="rounded-2xl border border-warning-200 bg-warning-50 px-5 py-4 text-sm font-medium text-warning-700 dark:border-warning-500/25 dark:bg-warning-500/10 dark:text-warning-400" role="status">
            Las nuevas reservas están bloqueadas porque el restaurante no tiene mesas activas.
          </p>
        )}

        {actionMessage && (
          <p className={`rounded-2xl px-5 py-4 text-sm font-medium ${actionError ? "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400" : "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400"}`} role="status">
            {actionMessage}
          </p>
        )}

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800 sm:px-6">
            <div>
              <h2 className="font-semibold text-gray-800 dark:text-white/90">Mesas registradas</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {tables.length} registradas · {activeTables.length} activas
              </p>
            </div>
          </div>

          {isLoading ? (
            <EmptyState
              icon={<TableIcon className="size-7" />}
              title="Cargando mesas..."
              description="Estamos consultando la configuración real del restaurante."
            />
          ) : loadError ? (
            <EmptyState
              icon={<TableIcon className="size-7" />}
              title="No fue posible cargar las mesas"
              description={loadError}
              action={
                <button
                  type="button"
                  onClick={() => setReloadKey((current) => current + 1)}
                  className="rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
                >
                  Intentar nuevamente
                </button>
              }
            />
          ) : tables.length ? (
            <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3 sm:p-6">
              {tables.map((table) => (
                <article
                  key={table.id}
                  className="rounded-2xl border border-gray-200 p-5 transition hover:border-brand-200 hover:shadow-theme-sm dark:border-gray-800"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/15">
                      <TableIcon className="size-6" />
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${table.active ? "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"}`}>
                      {table.active ? "Activa" : "Inactiva"}
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-gray-800 dark:text-white/90">
                    {table.name}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Capacidad: {table.minCapacity}–{table.maxCapacity} personas
                  </p>
                  <button
                    type="button"
                    onClick={() => requestTableToggle(table)}
                    disabled={processingId === table.id}
                    className="mt-5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-600 transition hover:border-brand-300 hover:text-brand-500 disabled:cursor-wait disabled:opacity-60 dark:border-gray-700 dark:text-gray-300"
                  >
                    {processingId === table.id
                      ? "Guardando..."
                      : table.active ? "Desactivar" : "Activar"}
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<TableIcon className="size-7" />}
              title="Aún no hay mesas registradas"
              description="Registra al menos una mesa activa para habilitar las reservas del restaurante."
              action={
                <button
                  type="button"
                  onClick={openForm}
                  className="rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
                >
                  Registrar primera mesa
                </button>
              }
            />
          )}
        </section>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-999999 flex items-center justify-center bg-gray-900/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-theme-xl dark:bg-gray-900 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-500">
                  Gestión de mesas
                </p>
                <h2 className="mt-2 text-xl font-bold text-gray-800 dark:text-white/90">
                  Registrar una mesa
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="flex size-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                aria-label="Cerrar formulario"
              >
                ×
              </button>
            </div>

            <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Identificador interno
                </span>
                <input
                  value={form.label}
                  onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
                  placeholder="Ej. Mesa 01"
                  className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none transition focus:border-brand-400 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </label>

              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Capacidad mínima
                  </span>
                  <input
                    type="number"
                    min="1"
                    value={form.minimumCapacity}
                    onChange={(event) => setForm((current) => ({ ...current, minimumCapacity: event.target.value }))}
                    className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none transition focus:border-brand-400 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Capacidad máxima
                  </span>
                  <input
                    type="number"
                    min="1"
                    value={form.maximumCapacity}
                    onChange={(event) => setForm((current) => ({ ...current, maximumCapacity: event.target.value }))}
                    className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none transition focus:border-brand-400 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </label>
              </div>

              <label className="flex items-center gap-3 rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))}
                  className="size-4 accent-[#ff6347]"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Mesa activa para asignaciones
                </span>
              </label>

              {formError && <p className="rounded-xl bg-error-50 px-4 py-3 text-sm text-error-700">{formError}</p>}

              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  disabled={isSaving}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 disabled:opacity-60 dark:border-gray-700 dark:text-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:cursor-wait disabled:opacity-60"
                >
                  {isSaving ? "Guardando..." : "Registrar mesa"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {pendingDeactivation && (
        <div
          className="fixed inset-0 z-999999 flex items-center justify-center bg-gray-900/55 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPendingDeactivation(null);
          }}
          role="presentation"
        >
          <section
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-theme-xl dark:bg-gray-900 sm:p-7"
            role="dialog"
            aria-modal="true"
            aria-labelledby="last-table-dialog-title"
            aria-describedby="last-table-dialog-description"
          >
            <div className="flex items-start justify-between gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-warning-50 text-xl font-bold text-warning-600 dark:bg-warning-500/15 dark:text-warning-400">
                !
              </span>
              <button
                type="button"
                onClick={() => setPendingDeactivation(null)}
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xl text-gray-500 transition hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                aria-label="Cerrar confirmación"
              >
                ×
              </button>
            </div>

            <h2
              id="last-table-dialog-title"
              className="mt-5 text-xl font-bold text-gray-800 dark:text-white/90"
            >
              ¿Desactivar la última mesa activa?
            </h2>
            <p
              id="last-table-dialog-description"
              className="mt-3 text-sm leading-6 text-gray-500 dark:text-gray-400"
            >
              Si desactivas <strong className="font-semibold text-gray-700 dark:text-gray-200">{pendingDeactivation.name}</strong>,
              el restaurante dejará de aceptar nuevas reservas hasta que vuelvas a activar una mesa.
            </p>

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setPendingDeactivation(null)}
                autoFocus
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Conservar mesa activa
              </button>
              <button
                type="button"
                onClick={confirmLastTableDeactivation}
                className="rounded-xl bg-error-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-error-600"
              >
                Desactivar de todos modos
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
