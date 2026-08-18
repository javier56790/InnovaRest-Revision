import type { Reservation } from "./reservations";

export type RestaurantAdminTable = {
  id: number;
  name: string;
  minCapacity: number;
  maxCapacity: number;
  active: boolean;
};

export type RestaurantAdminTableInput = {
  name: string;
  minCapacity: number;
  maxCapacity: number;
  active: boolean;
};

export type RestaurantAdminCategory = {
  id: number;
  nombre: string;
  slug: string;
  activa: boolean;
};

export type RestaurantAdminProfile = {
  id: number;
  name: string;
  categories: RestaurantAdminCategory[];
  description: string | null;
  address: string;
  city: string;
  department: string;
  phone: string | null;
  email: string;
};

export type RestaurantAdminProfileInput = {
  description: string;
  phone: string;
};

export type RestaurantAdminSchedule = {
  id?: number;
  day: number;
  dayName: string;
  openingTime: string;
  closingTime: string;
  active: boolean;
};

export type RestaurantAdminScheduleInput = {
  openingTime: string;
  closingTime: string;
  active: boolean;
};

export type RestaurantStatistics = {
  period: {
    startDate: string;
    endDate: string;
  };
  summary: {
    todayReservations: number;
    totalReservations: number;
    activeTables: number;
    availableTables: number;
    occupiedTables: number;
    noShows: number;
  };
  reservationsByDay: {
    labels: string[];
    confirmed: number[];
    cancelled: number[];
    noShows: number[];
  };
  statusDistribution: {
    labels: string[];
    values: number[];
  };
  occupancyByHour: {
    labels: string[];
    values: number[];
  };
  upcomingReservations: Reservation[];
};

export type RestaurantStatisticsFilters = {
  startDate?: string;
  endDate?: string;
  signal?: AbortSignal;
};

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

async function readBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function restaurantAdminRequest(
  token: string,
  path: string,
  init: RequestInit = {},
): Promise<unknown> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body) headers.set("Content-Type", "application/json");

  const response = await fetch(path, { ...init, headers });
  const body = await readBody(response);

  if (!response.ok) {
    throw new Error(
      findApiError(body) || `La API respondió con estado ${response.status}.`,
    );
  }

  return body;
}

export async function getRestaurantAdminProfile(
  token: string,
  restaurantId: number,
  signal?: AbortSignal,
): Promise<RestaurantAdminProfile> {
  return await restaurantAdminRequest(
    token,
    `/api/restaurantes/${restaurantId}/perfil/`,
    { signal },
  ) as RestaurantAdminProfile;
}

export async function updateRestaurantAdminProfile(
  token: string,
  restaurantId: number,
  profile: RestaurantAdminProfileInput,
): Promise<RestaurantAdminProfile> {
  return await restaurantAdminRequest(
    token,
    `/api/restaurantes/${restaurantId}/perfil/`,
    { method: "PATCH", body: JSON.stringify(profile) },
  ) as RestaurantAdminProfile;
}

export async function listRestaurantSchedules(
  token: string,
  restaurantId: number,
  signal?: AbortSignal,
): Promise<RestaurantAdminSchedule[]> {
  const body = await restaurantAdminRequest(
    token,
    `/api/restaurantes/${restaurantId}/horarios/`,
    { signal },
  );

  if (!Array.isArray(body)) {
    throw new Error("La API no devolvió una lista válida de horarios.");
  }

  return body as RestaurantAdminSchedule[];
}

export async function saveRestaurantSchedule(
  token: string,
  restaurantId: number,
  day: number,
  schedule: RestaurantAdminScheduleInput,
): Promise<RestaurantAdminSchedule> {
  return await restaurantAdminRequest(
    token,
    `/api/restaurantes/${restaurantId}/horarios/${day}/`,
    { method: "PUT", body: JSON.stringify(schedule) },
  ) as RestaurantAdminSchedule;
}

export async function getRestaurantStatistics(
  token: string,
  restaurantId: number,
  filters: RestaurantStatisticsFilters = {},
): Promise<RestaurantStatistics> {
  const params = new URLSearchParams();
  if (filters.startDate) params.set("startDate", filters.startDate);
  if (filters.endDate) params.set("endDate", filters.endDate);
  const query = params.size ? `?${params.toString()}` : "";

  return await restaurantAdminRequest(
    token,
    `/api/restaurantes/${restaurantId}/estadisticas/${query}`,
    { signal: filters.signal },
  ) as RestaurantStatistics;
}

export async function listRestaurantTables(
  token: string,
  restaurantId: number,
  signal?: AbortSignal,
): Promise<RestaurantAdminTable[]> {
  const body = await restaurantAdminRequest(
    token,
    `/api/restaurantes/${restaurantId}/mesas/`,
    { signal },
  );

  if (!Array.isArray(body)) {
    throw new Error("La API no devolvió una lista válida de mesas.");
  }

  return body as RestaurantAdminTable[];
}

export async function createRestaurantTable(
  token: string,
  restaurantId: number,
  table: RestaurantAdminTableInput,
): Promise<RestaurantAdminTable> {
  return await restaurantAdminRequest(
    token,
    `/api/restaurantes/${restaurantId}/mesas/`,
    { method: "POST", body: JSON.stringify(table) },
  ) as RestaurantAdminTable;
}

export async function updateRestaurantTable(
  token: string,
  restaurantId: number,
  tableId: number,
  changes: Partial<RestaurantAdminTableInput>,
): Promise<RestaurantAdminTable> {
  return await restaurantAdminRequest(
    token,
    `/api/restaurantes/${restaurantId}/mesas/${tableId}/`,
    { method: "PATCH", body: JSON.stringify(changes) },
  ) as RestaurantAdminTable;
}
