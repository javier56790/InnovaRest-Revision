import logo from "../assets/innovarest/logo.png";

function InnovaFooter() {
  return (
    <footer className="reservation-footer">
      <div className="reservation-footer__content">
        <img className="reservation-footer__logo" src={logo} alt="InnovaRest" />
        <p>
          Encuentra tu restaurante, elige tu mesa y prepara tu reserva desde un
          solo lugar.
        </p>
      </div>
      <p className="reservation-footer__copyright">
        © 2026 InnovaRest. Todos los derechos reservados.
      </p>
    </footer>
  );
}

export default InnovaFooter;
