CREATE DATABASE IF NOT EXISTS cabezal;
USE cabezal;

CREATE TABLE mantenimientos_cabezal (
  id INT AUTO_INCREMENT PRIMARY KEY,
  numero varchar(100) NOT NULL UNIQUE,
  linea TEXT NOT NULL,
  color TEXT NOT NULL,
  tipo_mantenimiento ENUM('Semanal','Mensual','Semestral','Año y Medio') NOT NULL,
  fm DATETIME NOT NULL,
  sm DATETIME,
  op BOOLEAN,
  op1 BOOLEAN,
  op2 BOOLEAN,
  op3 BOOLEAN,
  op4 BOOLEAN,
  op5 BOOLEAN,
  op6 BOOLEAN,
  op7 BOOLEAN,
  op8 BOOLEAN,
  op9 BOOLEAN,
  op10 BOOLEAN,
  op11 BOOLEAN,
  observaciones TEXT,
  estado ENUM('Activo','Por Reparar','Baja') DEFAULT 'Activo'
);