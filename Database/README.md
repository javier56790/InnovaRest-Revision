# Base de datos de InnovaRest

Esquema mínimo de InnovaRest para MySQL 8.0.16 o superior.

## Cómo se conecta el sistema

```text
Frontend React → API HTTP de Django → ORM de Django → MySQL
```

El navegador no se conecta directamente a MySQL. Las credenciales de la base
se guardan exclusivamente en el backend y nunca deben incluirse en React ni
subirse al repositorio.

## ¿La conexión crea las tablas?

No. Abrir una conexión solo permite comunicarse con MySQL.

Las tablas pueden crearse de dos formas:

1. Ejecutando `schema.sql` directamente.
2. Definiendo modelos de Django y ejecutando `python manage.py migrate`.

Para este proyecto, `schema.sql` deja una versión reproducible y verificable de
la DB. Cuando se construya el backend, sus modelos deben reflejar este esquema.
Si las tablas ya fueron creadas manualmente, la migración inicial de Django se
podrá reconocer con:

```bash
python manage.py migrate --fake-initial
```

No se debe ejecutar una migración inicial normal sobre tablas ya existentes.

## Crear la base con MySQL

1. Verifique que el servicio de MySQL esté iniciado.
2. Abra MySQL desde una terminal:

```bash
mysql -u root -p
```

3. Desde la consola de MySQL, ejecute:

```sql
SOURCE C:/Users/javie/OneDrive/Escritorio/InnovaRest/Database/schema.sql;
SOURCE C:/Users/javie/OneDrive/Escritorio/InnovaRest/Database/seed.sql;
```

Las rutas dentro de `SOURCE` deben escribirse con `/`.

## Usuario de aplicación

Para no conectar Django con `root`, cree un usuario dedicado. Reemplace la
contraseña de ejemplo antes de ejecutar:

```sql
CREATE USER IF NOT EXISTS 'innovarest_app'@'localhost'
  IDENTIFIED BY 'CAMBIAR_POR_UNA_CLAVE_SEGURA';

GRANT ALL PRIVILEGES ON innovarest.* TO 'innovarest_app'@'localhost';
FLUSH PRIVILEGES;
```

En desarrollo, este usuario necesita permisos de estructura si Django
ejecutará migraciones. En producción se pueden reducir los permisos después.

## Variables del backend

El futuro archivo privado `Backend/.env` tendrá:

```env
DB_NAME=innovarest
DB_USER=innovarest_app
DB_PASSWORD=tu_clave_segura
DB_HOST=127.0.0.1
DB_PORT=3306
```

Ejemplo de configuración en Django:

```python
import os

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.mysql",
        "NAME": os.getenv("DB_NAME"),
        "USER": os.getenv("DB_USER"),
        "PASSWORD": os.getenv("DB_PASSWORD"),
        "HOST": os.getenv("DB_HOST", "127.0.0.1"),
        "PORT": os.getenv("DB_PORT", "3306"),
        "OPTIONS": {"charset": "utf8mb4"},
    }
}
```

El conector recomendado para el backend es `mysqlclient`.

## Comprobar la instalación

Dentro de MySQL:

```sql
USE innovarest;
SHOW TABLES;
SELECT id, nombre, slug, activa FROM categorias ORDER BY id;
```

Debe mostrar ocho tablas y las ocho categorías visuales del frontend.

## Reglas que validará el backend

- Horas seleccionables en intervalos de 15 minutos.
- Duración estándar de dos horas.
- Validación final dentro de una transacción.
- No solapamiento de reservas confirmadas para la misma mesa.
- Asignación de una a tres mesas del restaurante correspondiente.
- Mejor ajuste por capacidad.
- Horarios de apertura y cierre.
- Última reserva una hora antes del cierre.
- Cancelación sin borrar el historial.
- Liberación manual de una mesa.
- Tiempo de gracia antes de marcar `NO_SHOW`, cuando se defina su duración.

El tiempo de gracia no tiene todavía un valor fijado en los documentos, por lo
que no se inventó una constante en la base de datos.

## Contenido

- `schema.sql`: base, tablas, restricciones, relaciones e índices.
- `seed.sql`: únicamente las categorías; no contiene datos falsos.
- `modelo-er.md`: diagrama entidad–relación.
- `README.md`: creación, conexión y comprobaciones.

