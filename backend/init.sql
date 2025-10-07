CREATE DATABASE IF NOT EXISTS cabezales;
USE cabezales;

CREATE TABLE m_cabezales (
  id INT AUTO_INCREMENT PRIMARY KEY,
  numero varchar(100) NOT NULL,
  tipo varchar(100)NOT NULL,
  linea varchar(100),
  tipo_mantenimiento ENUM('Semanal','Mensual','Semestral','Año y Medio') NOT NULL,
  ubicacion ENUM('Linea','Tool Room'),
  estado ENUM('Operando','Por reparar','Baja','Resguardo'),
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
  observaciones TEXT
);


CREATE TABLE historico(
  id INT AUTO_INCREMENT PRIMARY KEY,
  numero varchar(100) NOT NULL,
  tipo varchar(100)NOT NULL,
  linea varchar(100),
  tipo_mantenimiento ENUM('Semanal','Mensual','Semestral','Año y Medio') NOT NULL,
  ubicacion ENUM('Linea','Tool Room'),
  estado ENUM('Operando','Por reparar','Baja','Resguardo'),
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
  fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_numero (numero)
);