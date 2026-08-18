import logo from "../assets/innovarest/logo.png";

type InnovaNavbarProps = {
  onBack: () => void;
};

function InnovaNavbar({ onBack }: InnovaNavbarProps) {
  return (
    <header className="reservation-navbar">
      <img className="reservation-navbar__logo" src={logo} alt="InnovaRest" />

      <nav className="reservation-navbar__actions" aria-label="Navegación de reserva">
        <button className="reservation-navbar__back" type="button" onClick={onBack}>
          <span aria-hidden="true">←</span>
          Volver a restaurantes
        </button>
        <a className="reservation-navbar__link" href="#reserva">
          Mi reserva
        </a>
      </nav>
    </header>
  );
}

export default InnovaNavbar;
