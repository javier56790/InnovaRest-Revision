export type ReservationStatus = "CONFIRMADA" | "CANCELADA" | "NO_SHOW";

export type ReservationRecord = {
  id: string;
  time: string;
  customerName: string;
  people: number;
  tableLabel: string;
  status: ReservationStatus;
};

export type RestaurantTableRecord = {
  id: string;
  label: string;
  minimumCapacity: number;
  maximumCapacity: number;
  active: boolean;
};

export const dashboardPreviewData = {
  summary: {
    todayReservations: 18,
    availableTables: 12,
    occupiedTables: 8,
    noShows: 2,
  },
  reservationsByDay: {
    labels: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"],
    confirmed: [12, 15, 13, 18, 22, 30, 25],
    cancelled: [2, 1, 3, 2, 4, 3, 2],
  },
  statusDistribution: {
    labels: ["Confirmadas", "Completadas", "Canceladas", "No show"],
    values: [58, 29, 9, 4],
  },
  occupancyByHour: {
    labels: ["12:00", "14:00", "16:00", "18:00", "20:00", "22:00"],
    values: [42, 68, 31, 57, 88, 72],
  },
};

// Se mantienen vacíos hasta que la API entregue registros reales.
export const initialReservations: ReservationRecord[] = [];
export const initialTables: RestaurantTableRecord[] = [];
