import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { ScrollToTop } from "./components/common/ScrollToTop";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import PublicApp from "./features/public/PublicApp";
import ReservationPage from "./features/reservation/pages/ReservationPage";
import RestaurantAdminLayout from "./layout/restaurant/AppLayout";
import SuperAdminLayout from "./layout/superadmin/AppLayout";
import RestaurantHome from "./pages/Dashboard/RestaurantDashboard";
import Reservations from "./pages/RestaurantAdmin/Reservations";
import RestaurantProfile from "./pages/RestaurantAdmin/RestaurantProfile";
import Statistics from "./pages/RestaurantAdmin/RestaurantStatistics";
import TablesManagement from "./pages/RestaurantAdmin/TablesManagement";
import GlobalReservations from "./pages/SuperAdmin/GlobalReservations";
import SuperAdminHome from "./pages/SuperAdmin/Home";
import Restaurants from "./pages/SuperAdmin/Restaurants";
import SuperAdminProfile from "./pages/SuperAdmin/SuperAdminProfile";
import Users from "./pages/SuperAdmin/Users";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<PublicApp />} />
          <Route
            path="/restaurantes/:restaurantId/reservar"
            element={<ReservationPage />}
          />

          <Route element={<ProtectedRoute allowedRole="RESTAURANTE" />}>
            <Route path="/panel-restaurante" element={<RestaurantAdminLayout />}>
              <Route index element={<RestaurantHome />} />
              <Route path="reservas" element={<Reservations />} />
              <Route path="mesas" element={<TablesManagement />} />
              <Route path="perfil" element={<RestaurantProfile />} />
              <Route path="estadisticas" element={<Statistics />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRole="SUPERADMIN" />}>
            <Route path="/superadmin" element={<SuperAdminLayout />}>
              <Route index element={<SuperAdminHome />} />
              <Route path="restaurantes" element={<Restaurants />} />
              <Route path="usuarios" element={<Users />} />
              <Route path="reservas" element={<GlobalReservations />} />
              <Route path="perfil" element={<SuperAdminProfile />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
