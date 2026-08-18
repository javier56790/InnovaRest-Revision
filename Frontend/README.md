# Frontend de InnovaRest

Aplicación visual consolidada con React, TypeScript y Vite.

## Ejecución

```bash
npm install
npm run dev
```

## Rutas

- `/`: búsqueda de restaurantes e ingreso visual del cliente.
- `/restaurantes/:restaurantId/reservar`: formulario de reserva.
- `/panel-restaurante`: panel administrativo del restaurante.
- `/superadmin`: panel de superadministración.

Las secciones internas de los paneles se encuentran bajo sus respectivos
prefijos.

## Datos pendientes del backend

El listado público inicia vacío en
`src/features/public/context/StoreContext.jsx`. Cada restaurante que entregue
la API debe respetar, como mínimo, esta estructura:

```ts
{
  id: string | number;
  name: string;
  category: string;
  image: string;
  location: string;
  rating: number;
  openingTime: string; // HH:mm
  closingTime: string; // HH:mm
}
```

Al actualizar el arreglo `restaurants`, React crea o elimina automáticamente
las tarjetas según los registros recibidos. Mientras no existan datos, solo
ensaladas y rolls muestran tres tarjetas visuales de espera.

La reserva genera intervalos de 15 minutos usando `openingTime` y
`closingTime`; la última hora seleccionable queda una hora antes del cierre.
La validación de cruces entre reservas y del tiempo de gracia se realizará con
la disponibilidad que entregue el backend.

Las gráficas conservan datos visuales temporales en `src/data`. Esos archivos
se reemplazarán por respuestas de la API cuando se conecte la base de datos.
