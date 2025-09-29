@echo off
echo Iniciando servicios de Mantenimiento de Cabezales...

echo.
echo Iniciando Backend en puerto 8005...
start "Cabezal Backend" cmd /k "cd backend && npm start"

timeout /t 3

echo.
echo Iniciando Frontend en puerto 3005...
start "Cabezal Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Servicios iniciados:
echo - Backend: http://localhost:8005
echo - Frontend: http://localhost:3005
echo.
pause