-- MySQL dump 10.13  Distrib 8.0.39, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: innovarest
-- ------------------------------------------------------
-- Server version	8.0.39

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `categorias`
--

DROP TABLE IF EXISTS `categorias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categorias` (
  `id` smallint unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `activa` tinyint(1) NOT NULL DEFAULT '1',
  `creado_en` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_categorias_nombre` (`nombre`),
  UNIQUE KEY `uk_categorias_slug` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categorias`
--

LOCK TABLES `categorias` WRITE;
/*!40000 ALTER TABLE `categorias` DISABLE KEYS */;
INSERT INTO `categorias` VALUES (1,'Ensaladas','ensaladas',1,'2026-07-26 00:49:04.435159'),(2,'Rolls','rolls',1,'2026-07-26 00:49:04.435159'),(3,'Postres','postres',1,'2026-07-26 00:49:04.435159'),(4,'Sandwiches','sandwiches',1,'2026-07-26 00:49:04.435159'),(5,'Pasteles','pasteles',1,'2026-07-26 00:49:04.435159'),(6,'Vegetariano','vegetariano',1,'2026-07-26 00:49:04.435159'),(7,'Pastas','pastas',1,'2026-07-26 00:49:04.435159'),(8,'Asiático','asiatico',1,'2026-07-26 00:49:04.435159');
/*!40000 ALTER TABLE `categorias` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `horarios_restaurante`
--

DROP TABLE IF EXISTS `horarios_restaurante`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `horarios_restaurante` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `restaurante_id` bigint unsigned NOT NULL,
  `dia_semana` tinyint unsigned NOT NULL,
  `hora_apertura` time NOT NULL,
  `hora_cierre` time NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `creado_en` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `actualizado_en` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_horarios_restaurante_dia` (`restaurante_id`,`dia_semana`),
  KEY `idx_horarios_consulta` (`restaurante_id`,`dia_semana`,`activo`),
  CONSTRAINT `fk_horarios_restaurante` FOREIGN KEY (`restaurante_id`) REFERENCES `restaurantes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_horarios_dia` CHECK ((`dia_semana` between 1 and 7)),
  CONSTRAINT `chk_horarios_intervalo` CHECK ((`hora_cierre` > `hora_apertura`))
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `horarios_restaurante`
--

LOCK TABLES `horarios_restaurante` WRITE;
/*!40000 ALTER TABLE `horarios_restaurante` DISABLE KEYS */;
INSERT INTO `horarios_restaurante` VALUES (1,1,1,'11:00:00','22:00:00',1,'2026-08-10 04:50:38.259735','2026-08-18 03:17:18.312044'),(2,1,2,'11:00:00','22:00:00',1,'2026-08-10 04:50:38.263736','2026-08-18 03:17:18.347139'),(3,1,3,'11:00:00','19:00:00',1,'2026-08-10 04:50:38.268173','2026-08-18 03:17:18.381416'),(4,1,4,'11:00:00','22:00:00',1,'2026-08-10 04:50:38.271544','2026-08-18 03:17:18.328824'),(5,1,5,'11:00:00','22:00:00',1,'2026-08-10 04:50:38.274664','2026-08-18 03:17:18.393861'),(6,1,6,'11:00:00','22:00:00',1,'2026-08-10 04:50:38.278566','2026-08-18 03:17:18.364095'),(7,1,7,'11:00:00','22:00:00',1,'2026-08-10 04:50:38.280755','2026-08-18 03:17:18.405351'),(10,3,1,'11:00:00','22:00:00',1,'2026-08-17 23:26:51.104219','2026-08-17 23:26:51.104219');
/*!40000 ALTER TABLE `horarios_restaurante` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mesas`
--

DROP TABLE IF EXISTS `mesas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mesas` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `restaurante_id` bigint unsigned NOT NULL,
  `nombre` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `capacidad_min` smallint unsigned NOT NULL DEFAULT '1',
  `capacidad_max` smallint unsigned NOT NULL,
  `activa` tinyint(1) NOT NULL DEFAULT '1',
  `creado_en` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `actualizado_en` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_mesas_restaurante_nombre` (`restaurante_id`,`nombre`),
  KEY `idx_mesas_disponibilidad` (`restaurante_id`,`activa`,`capacidad_max`),
  CONSTRAINT `fk_mesas_restaurante` FOREIGN KEY (`restaurante_id`) REFERENCES `restaurantes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_mesas_capacidad_min` CHECK ((`capacidad_min` >= 1)),
  CONSTRAINT `chk_mesas_capacidades` CHECK ((`capacidad_max` >= `capacidad_min`))
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mesas`
--

LOCK TABLES `mesas` WRITE;
/*!40000 ALTER TABLE `mesas` DISABLE KEYS */;
INSERT INTO `mesas` VALUES (1,1,'Mesa 01',1,2,0,'2026-08-10 05:18:04.877331','2026-08-18 02:53:09.607402'),(2,1,'Mesa 02',1,4,0,'2026-08-10 05:18:04.877331','2026-08-18 03:01:18.757143'),(3,1,'Mesa 03',1,6,0,'2026-08-10 05:18:04.884686','2026-08-18 02:53:12.545323'),(4,1,'Mesa 04',1,8,0,'2026-08-10 05:18:04.885517','2026-08-18 02:53:13.880008'),(5,1,'Mesa 05',1,12,0,'2026-08-10 05:18:04.885517','2026-08-18 02:53:25.208438'),(8,3,'Mesa 01',1,2,1,'2026-08-17 23:26:51.106926','2026-08-17 23:26:51.106926'),(9,3,'Mesa 02',1,4,1,'2026-08-17 23:26:51.108989','2026-08-17 23:26:51.108989'),(11,1,'mesa 8',1,2,1,'2026-08-18 03:01:38.161530','2026-08-18 03:01:38.161530'),(12,1,'mesa 10',1,6,1,'2026-08-18 03:20:00.146029','2026-08-18 03:20:00.146029');
/*!40000 ALTER TABLE `mesas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reserva_mesa`
--

DROP TABLE IF EXISTS `reserva_mesa`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reserva_mesa` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `reserva_id` bigint unsigned NOT NULL,
  `mesa_id` bigint unsigned NOT NULL,
  `liberada_en` datetime(6) DEFAULT NULL,
  `creada_en` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_reserva_mesa_asignacion` (`reserva_id`,`mesa_id`),
  KEY `idx_reserva_mesa_disponibilidad` (`mesa_id`,`reserva_id`,`liberada_en`),
  CONSTRAINT `fk_reserva_mesa_mesa` FOREIGN KEY (`mesa_id`) REFERENCES `mesas` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_reserva_mesa_reserva` FOREIGN KEY (`reserva_id`) REFERENCES `reservas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reserva_mesa`
--

LOCK TABLES `reserva_mesa` WRITE;
/*!40000 ALTER TABLE `reserva_mesa` DISABLE KEYS */;
INSERT INTO `reserva_mesa` VALUES (4,6,1,'2026-08-18 03:18:42.646373','2026-08-17 01:27:27.022539'),(9,11,2,NULL,'2026-08-18 01:16:49.717117'),(10,13,1,NULL,'2026-08-18 02:51:47.447858'),(11,14,11,NULL,'2026-08-18 03:02:15.462183');
/*!40000 ALTER TABLE `reserva_mesa` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reservas`
--

DROP TABLE IF EXISTS `reservas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reservas` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `restaurante_id` bigint unsigned NOT NULL,
  `usuario_id` bigint unsigned NOT NULL,
  `fecha` date NOT NULL,
  `hora_inicio` time NOT NULL,
  `hora_fin` time NOT NULL,
  `personas` smallint unsigned NOT NULL,
  `capacidad_mesa_solicitada` smallint unsigned NOT NULL,
  `estado` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'CONFIRMADA',
  `notas` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cancelada_en` datetime(6) DEFAULT NULL,
  `creada_en` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `actualizada_en` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_reservas_restaurante_agenda` (`restaurante_id`,`fecha`,`estado`,`hora_inicio`,`hora_fin`),
  KEY `idx_reservas_usuario_historial` (`usuario_id`,`fecha`,`estado`),
  KEY `idx_reservas_estado_fecha` (`estado`,`fecha`),
  CONSTRAINT `fk_reservas_restaurante` FOREIGN KEY (`restaurante_id`) REFERENCES `restaurantes` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_reservas_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_reservas_capacidad_solicitada` CHECK ((`capacidad_mesa_solicitada` >= `personas`)),
  CONSTRAINT `chk_reservas_estado` CHECK ((`estado` in (_utf8mb4'CONFIRMADA',_utf8mb4'CANCELADA',_utf8mb4'NO_SHOW'))),
  CONSTRAINT `chk_reservas_horas` CHECK ((`hora_fin` > `hora_inicio`)),
  CONSTRAINT `chk_reservas_intervalo_15` CHECK (((minute(`hora_inicio`) in (0,15,30,45)) and (second(`hora_inicio`) = 0))),
  CONSTRAINT `chk_reservas_personas` CHECK ((`personas` >= 1))
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reservas`
--

LOCK TABLES `reservas` WRITE;
/*!40000 ALTER TABLE `reservas` DISABLE KEYS */;
INSERT INTO `reservas` VALUES (6,1,6,'2026-08-23','15:00:00','17:00:00',2,2,'CANCELADA','Prueba manual','2026-08-18 03:18:42.646373','2026-08-17 01:27:27.018523','2026-08-18 03:18:42.646373'),(11,1,6,'2026-08-18','14:30:00','16:30:00',2,4,'CONFIRMADA',NULL,NULL,'2026-08-18 01:16:49.710425','2026-08-18 01:16:49.710425'),(12,3,6,'2026-08-17','14:30:00','16:30:00',15,15,'CONFIRMADA','Requiere acomodación interna del restaurante.',NULL,'2026-08-18 01:18:00.767139','2026-08-18 01:18:00.767139'),(13,1,6,'2026-08-19','12:30:00','14:30:00',2,2,'CONFIRMADA',NULL,NULL,'2026-08-18 02:51:47.438638','2026-08-18 02:51:47.438638'),(14,1,6,'2026-08-20','14:00:00','16:00:00',2,2,'CONFIRMADA',NULL,NULL,'2026-08-18 03:02:15.455557','2026-08-18 03:02:15.455557'),(15,1,6,'2026-08-20','15:00:00','17:00:00',4,4,'CONFIRMADA','Requiere acomodación interna del restaurante.',NULL,'2026-08-18 03:02:23.761852','2026-08-18 03:02:23.761852');
/*!40000 ALTER TABLE `reservas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `restaurante_categoria`
--

DROP TABLE IF EXISTS `restaurante_categoria`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `restaurante_categoria` (
  `restaurante_id` bigint unsigned NOT NULL,
  `categoria_id` smallint unsigned NOT NULL,
  `creado_en` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`restaurante_id`,`categoria_id`),
  KEY `idx_restaurante_categoria_categoria` (`categoria_id`,`restaurante_id`),
  CONSTRAINT `fk_restaurante_categoria_categoria` FOREIGN KEY (`categoria_id`) REFERENCES `categorias` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_restaurante_categoria_restaurante` FOREIGN KEY (`restaurante_id`) REFERENCES `restaurantes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `restaurante_categoria`
--

LOCK TABLES `restaurante_categoria` WRITE;
/*!40000 ALTER TABLE `restaurante_categoria` DISABLE KEYS */;
INSERT INTO `restaurante_categoria` VALUES (1,1,'2026-08-10 04:24:54.077964'),(3,1,'2026-08-17 23:26:51.101727');
/*!40000 ALTER TABLE `restaurante_categoria` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `restaurantes`
--

DROP TABLE IF EXISTS `restaurantes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `restaurantes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `usuario_admin_id` bigint unsigned NOT NULL,
  `nombre` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `direccion` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ciudad` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `departamento` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `telefono` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `imagen_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `latitud` decimal(10,7) DEFAULT NULL,
  `longitud` decimal(10,7) DEFAULT NULL,
  `calificacion_promedio` decimal(3,2) NOT NULL DEFAULT '0.00',
  `total_calificaciones` int unsigned NOT NULL DEFAULT '0',
  `estado` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVO',
  `creado_en` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `actualizado_en` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_restaurantes_usuario_admin` (`usuario_admin_id`),
  KEY `idx_restaurantes_nombre` (`nombre`),
  KEY `idx_restaurantes_ubicacion_estado` (`ciudad`,`departamento`,`estado`),
  KEY `idx_restaurantes_calificacion` (`calificacion_promedio`),
  CONSTRAINT `fk_restaurantes_usuario_admin` FOREIGN KEY (`usuario_admin_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_restaurantes_calificacion` CHECK ((`calificacion_promedio` between 0.00 and 5.00)),
  CONSTRAINT `chk_restaurantes_estado` CHECK ((`estado` in (_utf8mb4'ACTIVO',_utf8mb4'INACTIVO'))),
  CONSTRAINT `chk_restaurantes_latitud` CHECK (((`latitud` is null) or (`latitud` between -(90) and 90))),
  CONSTRAINT `chk_restaurantes_longitud` CHECK (((`longitud` is null) or (`longitud` between -(180) and 180)))
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `restaurantes`
--

LOCK TABLES `restaurantes` WRITE;
/*!40000 ALTER TABLE `restaurantes` DISABLE KEYS */;
INSERT INTO `restaurantes` VALUES (1,1,'Verde Innova','Ensaladas frescas y opciones saludables.','Carrera 7 # 4-21','Popayán','Cauca',NULL,'http://localhost:5173/images/restaurants/verde-innova.png',NULL,NULL,0.00,0,'ACTIVO','2026-08-10 04:24:54.070918','2026-08-10 04:25:40.714524'),(3,10,'Restaurante Prueba','Restaurante creado mediante la API','Calle 5 # 10-20','Popayán','Cauca','3001234567',NULL,NULL,NULL,0.00,0,'ACTIVO','2026-08-17 23:26:51.097264','2026-08-17 23:26:51.097264');
/*!40000 ALTER TABLE `restaurantes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `nombres` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(254) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contrasena_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `telefono` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rol` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `estado` varchar(12) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVO',
  `creado_en` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `actualizado_en` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_usuarios_email` (`email`),
  KEY `idx_usuarios_rol_estado` (`rol`,`estado`),
  CONSTRAINT `chk_usuarios_estado` CHECK ((`estado` in (_utf8mb4'ACTIVO',_utf8mb4'BLOQUEADO'))),
  CONSTRAINT `chk_usuarios_rol` CHECK ((`rol` in (_utf8mb4'CLIENTE',_utf8mb4'RESTAURANTE',_utf8mb4'SUPERADMIN')))
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuarios`
--

LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
INSERT INTO `usuarios` VALUES (1,'Administrador Verde Innova','restaurante.demo@innovarest.test','pbkdf2_sha256$1200000$O61R6U9F0dibD40FIJhWrK$5x1RQgXfkZ///ZHiYh16qMhb9cb1oNw+U37TW6tr3cY=',NULL,'RESTAURANTE','ACTIVO','2026-08-10 04:24:26.845410','2026-08-10 04:24:26.845410'),(6,'Cliente Demo','cliente.demo@innovarest.test','pbkdf2_sha256$1200000$d74rTatvsOFQLUFbtknaaZ$CCxj6PRU4b5h/HOOzMRunigTxSszkWPTIjxwuGq2vvA=',NULL,'CLIENTE','ACTIVO','2026-08-17 01:22:57.498260','2026-08-17 01:22:57.498260'),(9,'Superadmin Demo','superadmin.demo@innovarest.test','pbkdf2_sha256$1200000$M3D8obKxlEwOhDC7SvnUIk$U0tbvFHwmPsWdKVTXkRV0UhOQETEiOEWZJx1xP7yI78=',NULL,'SUPERADMIN','ACTIVO','2026-08-17 23:17:01.281748','2026-08-17 23:17:01.281748'),(10,'Administrador Prueba','admin.restaurante.prueba@innovarest.test','pbkdf2_sha256$1200000$xZlijAF6lKyTpQ7BxPAkmD$9u0tEJJhWa1P/WWz2kw0e/7ADn5W37KwbDutOjtEJKc=','3007654321','RESTAURANTE','ACTIVO','2026-08-17 23:26:51.081776','2026-08-17 23:26:51.081776');
/*!40000 ALTER TABLE `usuarios` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-18  1:37:55
