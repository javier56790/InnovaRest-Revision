import { Navigate, Outlet } from "react-router";
import { useAuth } from "../../context/AuthContext";

type ProtectedRouteProps = {
  allowedRole: "CLIENTE" | "RESTAURANTE" | "SUPERADMIN";
};

export default function ProtectedRoute({ allowedRole }: ProtectedRouteProps) {
  const { isRestoring, user } = useAuth() as {
    isRestoring: boolean;
    user: { role: ProtectedRouteProps["allowedRole"] } | null;
  };

  if (isRestoring) {
    return (
      <div className="grid min-h-screen place-items-center bg-gray-50 text-sm font-medium text-gray-600">
        Validando sesión...
      </div>
    );
  }

  if (!user || user.role !== allowedRole) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
