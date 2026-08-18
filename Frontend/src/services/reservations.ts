export type ReservationStatus = "CONFIRMADA" | "CANCELADA" | "NO_SHOW";

export type ReservationTable = {
  id: number;
  name: string;
  capacity: number;
  releasedAt: string | null;
};

export type Reservation = {
  id: number;
  restaurantId: number;
  restaurantName: string;
  userId: number;
  userName: string;
  date: string;
  startTime: string;
  endTime: string;
  people: number;
  requestedCapacity: number | null;
  status: ReservationStatus;
  notes: string | null;
  cancelledAt: string | null;
  requiresArrangement: boolean;
  tables: ReservationTable[];
};

type ReservationFilters = {
  date?: string;
  restaurantId?: number;
  signal?: AbortSignal;
};

export function formatReservationTime(value: string): string {
  const match = /^(\d{2}):(\d{2})/.exec(value);
  if (!match) return value;

  const hours = Number(match[1]);
  const minutes = match[2];
  if (hours > 23) return value;

  const displayHours = hours % 12 || 12;
  const period = hours < 12 ? "a. m." : "p. m.";
  return `${displayHours}:${minutes} ${period}`;
}

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

async function authenticatedRequest(
  token: string,
  path: string,
  init: RequestInit = {},
): Promise<unknown> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(path, { ...init, headers });
  const body = await readBody(response);

  if (!response.ok) {
    throw new Error(
      findApiError(body) || `La API respondió con estado ${response.status}.`,
    );
  }

  return body;
}

export async function listReservations(
  token: string,
  filters: ReservationFilters = {},
): Promise<Reservation[]> {
  const params = new URLSearchParams();
  if (filters.date) params.set("date", filters.date);
  if (filters.restaurantId) {
    params.set("restaurantId", String(filters.restaurantId));
  }

  const query = params.size ? `?${params.toString()}` : "";
  const body = await authenticatedRequest(token, `/api/reservas/${query}`, {
    signal: filters.signal,
  });

  if (!Array.isArray(body)) {
    throw new Error("La API no devolvió una lista válida de reservas.");
  }

  return body as Reservation[];
}

export async function cancelReservation(
  token: string,
  reservationId: number,
): Promise<Reservation> {
  return await authenticatedRequest(
    token,
    `/api/reservas/${reservationId}/cancelar/`,
    { method: "PATCH" },
  ) as Reservation;
}

export async function markReservationNoShow(
  token: string,
  reservationId: number,
): Promise<Reservation> {
  return await authenticatedRequest(
    token,
    `/api/reservas/${reservationId}/no-show/`,
    { method: "PATCH" },
  ) as Reservation;
}
