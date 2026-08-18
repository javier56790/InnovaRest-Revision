# Modelo entidad–relación de InnovaRest

```mermaid
erDiagram
    USUARIOS ||--o| RESTAURANTES : administra
    USUARIOS ||--o{ RESERVAS : realiza
    RESTAURANTES ||--o{ HORARIOS_RESTAURANTE : configura
    RESTAURANTES ||--o{ MESAS : posee
    RESTAURANTES ||--o{ RESERVAS : recibe
    RESTAURANTES ||--o{ RESTAURANTE_CATEGORIA : clasifica
    CATEGORIAS ||--o{ RESTAURANTE_CATEGORIA : agrupa
    RESERVAS ||--|{ RESERVA_MESA : asigna
    MESAS ||--o{ RESERVA_MESA : participa

    USUARIOS {
        bigint id PK
        varchar nombres
        varchar email UK
        varchar contrasena_hash
        varchar telefono
        varchar rol
        varchar estado
        datetime creado_en
        datetime actualizado_en
    }

    RESTAURANTES {
        bigint id PK
        bigint usuario_admin_id FK,UK
        varchar nombre
        text descripcion
        varchar direccion
        varchar ciudad
        varchar departamento
        varchar telefono
        varchar imagen_url
        decimal latitud
        decimal longitud
        decimal calificacion_promedio
        int total_calificaciones
        varchar estado
    }

    CATEGORIAS {
        smallint id PK
        varchar nombre UK
        varchar slug UK
        boolean activa
    }

    RESTAURANTE_CATEGORIA {
        bigint restaurante_id PK,FK
        smallint categoria_id PK,FK
        datetime creado_en
    }

    HORARIOS_RESTAURANTE {
        bigint id PK
        bigint restaurante_id FK
        tinyint dia_semana
        time hora_apertura
        time hora_cierre
        boolean activo
    }

    MESAS {
        bigint id PK
        bigint restaurante_id FK
        varchar nombre
        smallint capacidad_min
        smallint capacidad_max
        boolean activa
    }

    RESERVAS {
        bigint id PK
        bigint restaurante_id FK
        bigint usuario_id FK
        date fecha
        time hora_inicio
        time hora_fin
        smallint personas
        smallint capacidad_mesa_solicitada
        varchar estado
        datetime cancelada_en
    }

    RESERVA_MESA {
        bigint id PK
        bigint reserva_id FK
        bigint mesa_id FK
        datetime liberada_en
    }
```

## Decisiones del modelo

- Un usuario con rol `RESTAURANTE` administra como máximo un restaurante.
- Un restaurante puede aparecer en varias categorías.
- El horario se registra por día de la semana, del 1 (lunes) al 7 (domingo).
- El cliente selecciona una capacidad; la mesa específica se asigna en el backend.
- Una reserva confirmada debe tener entre una y tres mesas.
- `liberada_en` permite registrar que una mesa fue liberada antes del final previsto.
- Cancelar una reserva no elimina registros y deja de bloquear sus mesas.
- Las estadísticas se calculan desde las reservas; no necesitan una tabla propia.

