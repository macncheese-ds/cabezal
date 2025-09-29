# Mantenimiento de Cabezales

Sistema de gestión de mantenimiento preventivo para cabezales por líneas de producción.

## Características

- **Gestión por líneas**: Manejo específico por línea de producción
- **Tipos de mantenimiento**: Semanal, Mensual, Semestral y Año y Medio
- **Estados de seguimiento**: Activo, Vencido, Próximo a Vencer, En Reparación, Dado de Baja
- **Lista de verificación**: 12 puntos de control específicos para cabezales
- **Cálculo automático**: Fechas de próximo mantenimiento según tipo
- **Indicadores visuales**: Códigos de colores y barras de progreso

## Instalación

### Backend
```bash
cd backend
npm install
```

### Frontend
```bash
cd frontend
npm install
```

## Configuración de Base de Datos

1. Crear la base de datos ejecutando `init.sql`
2. Configurar las variables de entorno en el backend:
   - `DB_HOST`: Host de la base de datos (default: localhost)
   - `DB_USER`: Usuario de la base de datos (default: root)
   - `DB_PASSWORD`: Contraseña de la base de datos
   - `DB_NAME`: Nombre de la base de datos (default: cabezal)
   - `PORT`: Puerto del servidor (default: 8005)

## Ejecución

### Opción 1: Script automático
```bash
start.bat
```

### Opción 2: Manual
```bash
# Backend
cd backend
npm start

# Frontend (en otra terminal)
cd frontend
npm run dev
```

## Acceso

- **Frontend**: http://localhost:3005
- **Backend**: http://localhost:8005

## Tipos de Mantenimiento

- **Semanal**: Cada 7 días
- **Mensual**: Cada mes
- **Semestral**: Cada 6 meses  
- **Año y Medio**: Cada 18 meses

## Lista de Verificación

1. Limpieza general
2. Revisión tornillería
3. Estado de código/etiquetas
4. Esponjas y elementos flexibles
5. Integridad de láminas
6. Vías plásticas
7. Estado de protecciones
8. Lubricación
9. Sensores
10. Actuadores
11. Conectores eléctricos
12. Verificación funcional

## Estados del Sistema

- **Activo**: Todas las verificaciones obligatorias aprobadas
- **En Reparación**: Una o más verificaciones obligatorias fallaron
- **Vencido**: Fecha de mantenimiento pasada
- **Próximo a Vencer**: Faltan 7 días o menos para el mantenimiento
- **Dado de Baja**: Cabezal fuera de servicio

## API Endpoints

- `GET /api/mantenimientos` - Listar todos los cabezales
- `POST /api/mantenimientos` - Crear nuevo cabezal
- `PUT /api/mantenimientos/:id` - Actualizar cabezal
- `DELETE /api/mantenimientos/:id` - Eliminar cabezal
- `GET /api/mantenimientos/:id` - Obtener cabezal específico
- `POST /api/mantenimientos/:id/reparar` - Marcar como reparado