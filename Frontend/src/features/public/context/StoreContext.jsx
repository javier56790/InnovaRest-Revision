import { createContext, useEffect, useState } from "react";

export const StoreContext = createContext(null)

const StoreContextProvider = (props) => {
    const [restaurants, setRestaurants] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const controller = new AbortController();

        const loadRestaurants = async () => {
            try {
                const response = await fetch('/api/restaurantes/', {
                    signal: controller.signal,
                });

                if (!response.ok) {
                    throw new Error(`La API respondió con estado ${response.status}.`);
                }

                const data = await response.json();

                if (!Array.isArray(data)) {
                    throw new Error('La API no devolvió una lista de restaurantes.');
                }

                setRestaurants(data);
                setError(null);
            } catch (requestError) {
                if (requestError.name !== 'AbortError') {
                    setRestaurants([]);
                    setError('No fue posible cargar los restaurantes.');
                }
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            }
        };

        loadRestaurants();

        return () => controller.abort();
    }, []);

    const contextValue = {
        restaurants,
        isLoading,
        error,
    }

    return(
        <StoreContext.Provider value={contextValue}>
            {props.children}
        </StoreContext.Provider>
    )
}

export default StoreContextProvider
