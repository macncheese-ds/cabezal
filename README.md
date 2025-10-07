# Sistema de Registro de Mantenimiento de Cabezales

Sistema completo para el registro y seguimiento de mantenimientos de cabezales SMT (H2, H8, H24).

## Características

- Registro de cabezales por tipo (H2, H8, H24)
- Mantenimientos diferenciados por tipo de cabezal:
  - **H2**: Mensual y 18 meses
  - **H8**: Semanal, Quincenal, Mensual y 18 meses
  - **H24**: Semanal, Mensual, Semestral y 18 meses
- Verificaciones específicas según tipo y frecuencia de mantenimiento
- Estados: En Línea, Tool Room, Baja, En Reparación
- Sistema de alertas para vencimientos
- Historial completo de mantenimientos
- Dar de baja y reactivar cabezales

## Requisitos

- Node.js v18+
- MySQL 8.0+
- npm o yarn

## Instalación

### Backend

```bash
cd backend
npm install
```

Configurar variables de entorno en `.env`:

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=cabezales
PORT=8003
```

Crear la base de datos:

```bash
mysql -u root -p < init.sql
```

Iniciar servidor:

```bash
npm start
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

El frontend estará disponible en: http://localhost:4303

## Estructura de la Base de Datos

### Tabla: m_cabezales

- `id`: INT AUTO_INCREMENT PRIMARY KEY
- `numero`: VARCHAR(100) UNIQUE - Número del cabezal
- `tipo`: ENUM('H2','H8','H24') - Tipo de cabezal
- `linea`: VARCHAR(100) - Línea asignada
- `tipo_mantenimiento`: ENUM - Tipo de mantenimiento a realizar
- `estado`: ENUM - Estado actual del cabezal
- `fm`: DATETIME - Fecha de último mantenimiento
- `sm`: DATETIME - Fecha de próximo mantenimiento
- `op` a `op11`: BOOLEAN - Checkboxes de verificación
- `observaciones`: TEXT - Notas y observaciones

## Tipos de Mantenimiento

### H2 - Head 2
- **Mensual**: Verificaciones básicas
- **18 Meses**: Mantenimiento completo

### H8 - Head 8
- **Semanal**: Limpieza y verificación rápida
- **Quincenal**: Revisión intermedia
- **Mensual**: Verificación completa
- **18 Meses**: Overhaul completo

### H24 - Head 24
- **Semanal**: Limpieza y verificación básica
- **Mensual**: Verificación estándar
- **Semestral**: Revisión profunda
- **18 Meses**: Mantenimiento mayor

## Uso

1. **Registrar nuevo cabezal**: Clic en "Nuevo Cabezal"
2. **Seleccionar tipo**: Elegir entre H2, H8 o H24
3. **Completar verificaciones**: Según el tipo seleccionado
4. **Registrar mantenimiento**: Doble clic en tarjeta del cabezal
5. **Dar de baja**: Desde el detalle del cabezal
6. **Reactivar**: Desde la sección de cabezales dados de baja

## Secciones

- **Todos**: Vista general de cabezales activos
- **En Línea**: Cabezales funcionando correctamente
- **En Reparación**: Cabezales que requieren atención
- **Próximos a Vencer**: Mantenimientos próximos
- **Dados de Baja**: Cabezales fuera de servicio

## API Endpoints

- `GET /api/cabezales` - Listar todos los cabezales
- `POST /api/cabezales` - Crear nuevo cabezal
- `PUT /api/cabezales/:id` - Actualizar cabezal
- `DELETE /api/cabezales/:id` - Eliminar cabezal
- `POST /api/cabezales/:id/mantenimiento` - Registrar mantenimiento
- `POST /api/cabezales/:id/baja` - Dar de baja
- `POST /api/cabezales/:id/reactivar` - Reactivar cabezal
- `GET /api/cabezales/:id` - Obtener detalle de un cabezal

## Tecnologías

- **Backend**: Node.js, Express, MySQL2
- **Frontend**: React, Vite, Axios
- **Estilos**: CSS personalizado con tema oscuro

## Licencia

Uso interno de la empresa.
