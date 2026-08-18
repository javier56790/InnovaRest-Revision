-- InnovaRest - Catálogos iniciales
-- No crea usuarios, restaurantes, mesas ni reservas de demostración.

USE innovarest;

START TRANSACTION;

INSERT IGNORE INTO categorias (id, nombre, slug, activa)
VALUES
  (1, 'Ensaladas', 'ensaladas', TRUE),
  (2, 'Rolls', 'rolls', TRUE),
  (3, 'Postres', 'postres', TRUE),
  (4, 'Sandwiches', 'sandwiches', TRUE),
  (5, 'Pasteles', 'pasteles', TRUE),
  (6, 'Vegetariano', 'vegetariano', TRUE),
  (7, 'Pastas', 'pastas', TRUE),
  (8, 'Asiático', 'asiatico', TRUE);

COMMIT;
