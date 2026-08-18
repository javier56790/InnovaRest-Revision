import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  getRestaurantStatistics,
  type RestaurantStatistics,
} from "../services/restaurantAdmin";

type RestaurantSession = {
  accessToken: string | null;
  user: { restaurantId?: number | null } | null;
};

type StatisticsPeriod = {
  startDate?: string;
  endDate?: string;
};

export function useRestaurantStatistics(period: StatisticsPeriod = {}) {
  const { accessToken, user } = useAuth() as RestaurantSession;
  const restaurantId = Number(user?.restaurantId);
  const [data, setData] = useState<RestaurantStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    if (!accessToken || !Number.isInteger(restaurantId) || restaurantId < 1) {
      setData(null);
      setError("La sesión no tiene un restaurante asociado.");
      setIsLoading(false);
      return () => controller.abort();
    }

    const loadStatistics = async () => {
      setIsLoading(true);
      setError("");

      try {
        const statistics = await getRestaurantStatistics(
          accessToken,
          restaurantId,
          {
            startDate: period.startDate,
            endDate: period.endDate,
            signal: controller.signal,
          },
        );
        if (!controller.signal.aborted) setData(statistics);
      } catch (requestError) {
        if (requestError instanceof Error && requestError.name !== "AbortError") {
          setError(requestError.message);
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    void loadStatistics();
    return () => controller.abort();
  }, [accessToken, period.endDate, period.startDate, reloadKey, restaurantId]);

  return {
    data,
    error,
    isLoading,
    reload: () => setReloadKey((current) => current + 1),
  };
}
