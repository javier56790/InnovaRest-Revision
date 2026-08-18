-- InnovaRest - Esquema inicial para MySQL 8.0.16 o superior
-- No contiene usuarios, contraseñas ni restaurantes de prueba.
--
-- Si Django administrará la estructura mediante migraciones, use este archivo
-- como referencia y cree únicamente la base vacía antes de ejecutar `migrate`.

SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS innovarest
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE innovarest;

CREATE TABLE IF NOT EXISTS usuarios (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombres VARCHAR(120) NOT NULL,
  email VARCHAR(254) NOT NULL,
  contrasena_hash VARCHAR(255) NOT NULL,
  telefono VARCHAR(30) NULL,
  rol VARCHAR(20) NOT NULL,
  estado VARCHAR(12) NOT NULL DEFAULT 'ACTIVO',
  creado_en DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  actualizado_en DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
    ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uk_usuarios_email (email),
  KEY idx_usuarios_rol_estado (rol, estado),
  CONSTRAINT chk_usuarios_rol
    CHECK (rol IN ('CLIENTE', 'RESTAURANTE', 'SUPERADMIN')),
  CONSTRAINT chk_usuarios_estado
    CHECK (estado IN ('ACTIVO', 'BLOQUEADO'))
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS restaurantes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_admin_id BIGINT UNSIGNED NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT NULL,
  direccion VARCHAR(200) NOT NULL,
  ciudad VARCHAR(100) NOT NULL,
  departamento VARCHAR(100) NOT NULL,
  telefono VARCHAR(30) NULL,
  imagen_url VARCHAR(500) NULL,
  latitud DECIMAL(10, 7) NULL,
  longitud DECIMAL(10, 7) NULL,
  calificacion_promedio DECIMAL(3, 2) NOT NULL DEFAULT 0.00,
  total_calificaciones INT UNSIGNED NOT NULL DEFAULT 0,
  estado VARCHAR(10) NOT NULL DEFAULT 'ACTIVO',
  creado_en DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  actualizado_en DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
    ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uk_restaurantes_usuario_admin (usuario_admin_id),
  KEY idx_restaurantes_nombre (nombre),
  KEY idx_restaurantes_ubicacion_estado (ciudad, departamento, estado),
  KEY idx_restaurantes_calificacion (calificacion_promedio),
  CONSTRAINT fk_restaurantes_usuario_admin
    FOREIGN KEY (usuario_admin_id) REFERENCES usuarios (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT chk_restaurantes_estado
    CHECK (estado IN ('ACTIVO', 'INACTIVO')),
  CONSTRAINT chk_restaurantes_calificacion
    CHECK (calificacion_promedio BETWEEN 0.00 AND 5.00),
  CONSTRAINT chk_restaurantes_latitud
    CHECK (latitud IS NULL OR latitud BETWEEN -90 AND 90),
  CONSTRAINT chk_restaurantes_longitud
    CHECK (longitud IS NULL OR longitud BETWEEN -180 AND 180)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS categorias (
  id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(80) NOT NULL,
  slug VARCHAR(80) NOT NULL,
  activa BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uk_categorias_nombre (nombre),
  UNIQUE KEY uk_categorias_slug (slug)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS restaurante_categoria (
  restaurante_id BIGINT UNSIGNED NOT NULL,
  categoria_id SMALLINT UNSIGNED NOT NULL,
  creado_en DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (restaurante_id, categoria_id),
  KEY idx_restaurante_categoria_categoria (categoria_id, restaurante_id),
  CONSTRAINT fk_restaurante_categoria_restaurante
    FOREIGN KEY (restaurante_id) REFERENCES restaurantes (id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_restaurante_categoria_categoria
    FOREIGN KEY (categoria_id) REFERENCES categorias (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS horarios_restaurante (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  restaurante_id BIGINT UNSIGNED NOT NULL,
  dia_semana TINYINT UNSIGNED NOT NULL,
  hora_apertura TIME NOT NULL,
  hora_cierre TIME NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  actualizado_en DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
    ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uk_horarios_restaurante_dia (restaurante_id, dia_semana),
  KEY idx_horarios_consulta (restaurante_id, dia_semana, activo),
  CONSTRAINT fk_horarios_restaurante
    FOREIGN KEY (restaurante_id) REFERENCES restaurantes (id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT chk_horarios_dia
    CHECK (dia_semana BETWEEN 1 AND 7),
  CONSTRAINT chk_horarios_intervalo
    CHECK (hora_cierre > hora_apertura)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS mesas (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  restaurante_id BIGINT UNSIGNED NOT NULL,
  nombre VARCHAR(50) NOT NULL,
  capacidad_min SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  capacidad_max SMALLINT UNSIGNED NOT NULL,
  activa BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  actualizado_en DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
    ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uk_mesas_restaurante_nombre (restaurante_id, nombre),
  KEY idx_mesas_disponibilidad (restaurante_id, activa, capacidad_max),
  CONSTRAINT fk_mesas_restaurante
    FOREIGN KEY (restaurante_id) REFERENCES restaurantes (id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT chk_mesas_capacidad_min
    CHECK (capacidad_min >= 1),
  CONSTRAINT chk_mesas_capacidades
    CHECK (capacidad_max >= capacidad_min)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS reservas (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  restaurante_id BIGINT UNSIGNED NOT NULL,
  usuario_id BIGINT UNSIGNED NOT NULL,
  fecha DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  personas SMALLINT UNSIGNED NOT NULL,
  capacidad_mesa_solicitada SMALLINT UNSIGNED NOT NULL,
  estado VARCHAR(15) NOT NULL DEFAULT 'CONFIRMADA',
  notas VARCHAR(500) NULL,
  cancelada_en DATETIME(6) NULL,
  creada_en DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  actualizada_en DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
    ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY idx_reservas_restaurante_agenda
    (restaurante_id, fecha, estado, hora_inicio, hora_fin),
  KEY idx_reservas_usuario_historial
    (usuario_id, fecha, estado),
  KEY idx_reservas_estado_fecha (estado, fecha),
  CONSTRAINT fk_reservas_restaurante
    FOREIGN KEY (restaurante_id) REFERENCES restaurantes (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_reservas_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT chk_reservas_personas
    CHECK (personas >= 1),
  CONSTRAINT chk_reservas_capacidad_solicitada
    CHECK (capacidad_mesa_solicitada >= personas),
  CONSTRAINT chk_reservas_horas
    CHECK (hora_fin > hora_inicio),
  CONSTRAINT chk_reservas_intervalo_15
    CHECK (
      MINUTE(hora_inicio) IN (0, 15, 30, 45)
      AND SECOND(hora_inicio) = 0
    ),
  CONSTRAINT chk_reservas_estado
    CHECK (estado IN ('CONFIRMADA', 'CANCELADA', 'NO_SHOW'))
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS reserva_mesa (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  reserva_id BIGINT UNSIGNED NOT NULL,
  mesa_id BIGINT UNSIGNED NOT NULL,
  liberada_en DATETIME(6) NULL,
  creada_en DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uk_reserva_mesa_asignacion (reserva_id, mesa_id),
  KEY idx_reserva_mesa_disponibilidad (mesa_id, reserva_id, liberada_en),
  CONSTRAINT fk_reserva_mesa_reserva
    FOREIGN KEY (reserva_id) REFERENCES reservas (id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_reserva_mesa_mesa
    FOREIGN KEY (mesa_id) REFERENCES mesas (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE = InnoDB;

-- Reglas que requieren transacción y se implementarán en Django:
-- 1. Solo usuarios CLIENTE pueden ser titulares de reservas.
-- 2. usuario_admin_id debe pertenecer a un usuario con rol RESTAURANTE.
-- 3. La duración estándar es de 2 horas.
-- 4. No puede existir solapamiento en una misma mesa.
-- 5. Una reserva CONFIRMADA debe tener entre 1 y 3 mesas asignadas.
-- 6. Todas las mesas asignadas deben pertenecer al mismo restaurante.
-- 7. La reserva debe respetar apertura, cierre, tiempo de gracia y disponibilidad.
-- 8. La última hora seleccionable será una hora antes del cierre.

