import { type FormEvent, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageHeading from "../../components/superAdmin/PageHeading";
import { LockIcon, UserCircleIcon } from "../../icons";

export default function SuperAdminProfile() {
  const [profile, setProfile] = useState({ name: "", email: "", phone: "" });
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [profileMessage, setProfileMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");

  const saveProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileMessage("Cambios guardados en esta demostración visual.");
  };

  const updatePassword = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (passwords.next !== passwords.confirm) {
      setPasswordMessage("Las contraseñas nuevas no coinciden.");
      return;
    }
    setPasswordMessage("Contraseña actualizada en esta demostración visual.");
    setPasswords({ current: "", next: "", confirm: "" });
  };

  return (
    <>
      <PageMeta title="Mi perfil | Superadmin InnovaRest" description="Perfil del superadministrador." />
      <div className="space-y-6">
        <PageHeading
          title="Mi perfil"
          description="Administra los datos básicos y la seguridad de la cuenta con acceso global."
        />

        <section className="grid gap-6 xl:grid-cols-3">
          <aside className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="flex size-20 items-center justify-center rounded-2xl bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
              <UserCircleIcon className="size-11" />
            </div>
            <h2 className="mt-5 text-xl font-semibold text-gray-800 dark:text-white/90">Superadministrador</h2>
            <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
              Esta cuenta tendrá acceso a la supervisión global de InnovaRest cuando se implemente el rol SUPERADMIN.
            </p>
            <span className="mt-5 inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-400">
              Acceso global
            </span>
          </aside>

          <div className="space-y-6 xl:col-span-2">
            <form onSubmit={saveProfile} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
              <div className="border-b border-gray-100 pb-5 dark:border-gray-800">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Información personal</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Datos del responsable de administrar la plataforma.</p>
              </div>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <label className="sm:col-span-2">
                  <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre completo</span>
                  <input type="text" value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} placeholder="Nombre del superadministrador" className="admin-input" />
                </label>
                <label>
                  <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Correo electrónico</span>
                  <input type="email" value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} placeholder="correo@innovarest.com" className="admin-input" />
                </label>
                <label>
                  <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Teléfono</span>
                  <input type="tel" value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} placeholder="Número de contacto" className="admin-input" />
                </label>
                <label>
                  <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Rol</span>
                  <input type="text" value="SUPERADMIN" readOnly className="admin-input bg-gray-50 dark:bg-gray-800" />
                </label>
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
                {profileMessage && <p className="mr-auto text-sm text-success-600 dark:text-success-400">{profileMessage}</p>}
                <button type="submit" className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600">Guardar cambios</button>
              </div>
            </form>

            <form onSubmit={updatePassword} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
              <div className="flex items-start gap-3 border-b border-gray-100 pb-5 dark:border-gray-800">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400"><LockIcon className="size-5" /></div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Seguridad</h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Cambia la contraseña de la cuenta global.</p>
                </div>
              </div>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <label className="sm:col-span-2">
                  <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Contraseña actual</span>
                  <input type="password" value={passwords.current} onChange={(event) => setPasswords({ ...passwords, current: event.target.value })} className="admin-input" />
                </label>
                <label>
                  <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Nueva contraseña</span>
                  <input type="password" value={passwords.next} onChange={(event) => setPasswords({ ...passwords, next: event.target.value })} className="admin-input" />
                </label>
                <label>
                  <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Confirmar contraseña</span>
                  <input type="password" value={passwords.confirm} onChange={(event) => setPasswords({ ...passwords, confirm: event.target.value })} className="admin-input" />
                </label>
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
                {passwordMessage && <p className="mr-auto text-sm text-gray-600 dark:text-gray-300">{passwordMessage}</p>}
                <button type="submit" className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">Actualizar contraseña</button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </>
  );
}
