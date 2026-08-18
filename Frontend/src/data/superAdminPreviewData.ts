export type RestaurantPlatformStatus = "ACTIVO" | "INACTIVO";
export type PlatformUserRole = "CLIENTE" | "RESTAURANTE";
export type PlatformUserStatus = "ACTIVO" | "BLOQUEADO";
export type GlobalReservationStatus = "CONFIRMADA" | "CANCELADA" | "NO_SHOW";

export type PlatformRestaurant = {
  id: string;
  name: string;
  administratorName: string;
  category: string;
  location: string;
  status: RestaurantPlatformStatus;
};

export type PlatformUser = {
  id: string;
  name: string;
  email: string;
  role: PlatformUserRole;
  registeredAt: string;
  status: PlatformUserStatus;
};

export type GlobalReservation = {
  id: string;
  restaurantName: string;
  customerName: string;
  date: string;
  time: string;
  people: number;
  status: GlobalReservationStatus;
};

// Estas cifras se usan únicamente en las tarjetas y gráficas del prototipo visual.
export const superAdminDashboardPreviewData = {
  summary: {
    restaurants: 42,
    activeRestaurants: 38,
    users: 1260,
    reservationsThisMonth: 386,
    cancelledThisMonth: 31,
  },
  reservationTrend: {
    labels: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago"],
    confirmed: [172, 205, 228, 256, 294, 318, 351, 386],
    cancelled: [18, 21, 19, 25, 27, 24, 29, 31],
  },
  restaurantGrowth: {
    labels: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago"],
    values: [21, 24, 27, 29, 32, 35, 39, 42],
  },
  statusDistribution: {
    labels: ["Confirmadas", "Canceladas", "No show"],
    values: [84, 9, 7],
  },
};

// Los listados se mantienen vacíos hasta conectarlos con los endpoints reales.
export const initialPlatformRestaurants: PlatformRestaurant[] = [];
export const initialPlatformUsers: PlatformUser[] = [];
export const initialGlobalReservations: GlobalReservation[] = [];
