const express = require('express');
const router = express.Router();
const db = require('../db');

// List all with categorization
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT *, 
        CASE 
          WHEN estado = 'Baja' THEN 'baja'
          WHEN estado = 'Por reparar' THEN 'reparacion'
          WHEN DATEDIFF(sm, NOW()) <= 14 AND DATEDIFF(sm, NOW()) > 0 THEN 'proximo_vencer'
          WHEN DATEDIFF(sm, NOW()) <= 0 THEN 'vencido'
          ELSE 'activo'
        END as categoria
      FROM m_cabezales 
      ORDER BY 
        CASE 
          WHEN estado = 'Baja' THEN 4
          WHEN estado = 'Por reparar' THEN 2
          WHEN DATEDIFF(sm, NOW()) <= 14 THEN 1
          ELSE 3
        END,
        sm ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// Create
router.post('/', async (req, res) => {
  const body = req.body;
  const {
    numero,
    tipo,
    linea,
    tipo_mantenimiento,
    ubicacion,
    estado,
    fm,
    sm,
    ops = {},
    observaciones = ''
  } = body;

  // Validar que observaciones sean obligatorias para estado "Por reparar" o "Baja"
  if ((estado === 'Por reparar' || estado === 'Baja') && !observaciones.trim()) {
    return res.status(400).json({ 
      error: 'OBSERVACIONES_REQUIRED',
      message: 'Las observaciones son obligatorias para estado "Por reparar" o "Baja"'
    });
  }

  // build op values, allow op..op11 but default null
  const opFields = [];
  for (let i = 0; i <= 11; i++) {
    const key = i === 0 ? 'op' : `op${i}`;
    opFields.push(ops[`op${i}`] ? 1 : 0);
  }

  try {
    // Insertar en m_cabezales
    const [result] = await db.query(
      `INSERT INTO m_cabezales (numero, tipo, linea, tipo_mantenimiento, ubicacion, estado, fm, sm, op, op1, op2, op3, op4, op5, op6, op7, op8, op9, op10, op11, observaciones)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [numero, tipo, linea, tipo_mantenimiento, ubicacion, estado, fm, sm, ...opFields, observaciones]
    );
    
    // Guardar en histórico
    await db.query(
      `INSERT INTO historico (numero, tipo, linea, tipo_mantenimiento, ubicacion, estado, fm, sm, op, op1, op2, op3, op4, op5, op6, op7, op8, op9, op10, op11, observaciones)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [numero, tipo, linea, tipo_mantenimiento, ubicacion, estado, fm, sm, ...opFields, observaciones]
    );
    
    const [rows] = await db.query('SELECT * FROM m_cabezales WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'db error', detail: err.message });
  }
});

// Update
router.put('/:id', async (req, res) => {
  const id = req.params.id;
  const body = req.body;
  const {
    numero,
    tipo,
    linea,
    tipo_mantenimiento,
    ubicacion,
    estado,
    fm,
    sm,
    ops = {},
    observaciones = ''
  } = body;

  // Validar que observaciones sean obligatorias para estado "Por reparar" o "Baja"
  if ((estado === 'Por reparar' || estado === 'Baja') && !observaciones.trim()) {
    return res.status(400).json({ 
      error: 'OBSERVACIONES_REQUIRED',
      message: 'Las observaciones son obligatorias para estado "Por reparar" o "Baja"'
    });
  }

  const opFields = [];
  for (let i = 0; i <= 11; i++) {
    opFields.push(ops[`op${i}`] ? 1 : 0);
  }

  try {
    // Actualizar en m_cabezales
    await db.query(
      `UPDATE m_cabezales SET numero=?, tipo=?, linea=?, tipo_mantenimiento=?, ubicacion=?, estado=?, fm=?, sm=?, op=?, op1=?, op2=?, op3=?, op4=?, op5=?, op6=?, op7=?, op8=?, op9=?, op10=?, op11=?, observaciones=? WHERE id=?`,
      [numero, tipo, linea, tipo_mantenimiento, ubicacion, estado, fm, sm, ...opFields, observaciones, id]
    );
    
    // Guardar en histórico
    await db.query(
      `INSERT INTO historico (numero, tipo, linea, tipo_mantenimiento, ubicacion, estado, fm, sm, op, op1, op2, op3, op4, op5, op6, op7, op8, op9, op10, op11, observaciones)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [numero, tipo, linea, tipo_mantenimiento, ubicacion, estado, fm, sm, ...opFields, observaciones]
    );
    
    const [rows] = await db.query('SELECT * FROM m_cabezales WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// Delete
router.delete('/:id', async (req, res) => {
  const id = req.params.id;
  try {
    await db.query('DELETE FROM m_cabezales WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// Dar de baja con motivo
router.post('/:id/baja', async (req, res) => {
  const id = req.params.id;
  const { motivo } = req.body;
  
  try {
    const observacionesBaja = `BAJA: ${motivo} - ${new Date().toLocaleDateString()}`;
    
    await db.query(
      `UPDATE m_cabezales SET estado='Baja', fm=NOW(), sm=NULL, observaciones=CONCAT(IFNULL(observaciones,''), '\n', ?) WHERE id=?`,
      [observacionesBaja, id]
    );
    
    const [rows] = await db.query('SELECT * FROM m_cabezales WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Reactivar de baja
router.post('/:id/reactivar', async (req, res) => {
  const id = req.params.id;
  const { 
    observaciones = '', 
    ops = {},
    fecha_reactivacion = null
  } = req.body;
  
  try {
    const opFields = [];
    for (let i = 0; i <= 11; i++) {
      opFields.push(ops[`op${i}`] ? 1 : 0);
    }

  const requiredChecks = ['op0','op1','op2','op3','op4','op5','op6'];
  const allOk = requiredChecks.every(k => !!ops[k]);
  // Map to DB enum values
  const estado = allOk ? 'Operando' : 'Por reparar';

  const fechaReactivacion = fecha_reactivacion || new Date().toISOString().split('T')[0];
  const observacionesReactivacion = `REACTIVADO ${fechaReactivacion}: ${observaciones}`;

  const fechaProxima = estado === 'Operando' ? new Date(Date.now() + 60*24*60*60*1000) : null;
    
    await db.query(
      `UPDATE m_cabezales SET 
        estado=?, 
        fm=?, 
        sm=?, 
        op=?, op1=?, op2=?, op3=?, op4=?, op5=?, op6=?, op7=?, op8=?, op9=?, op10=?, op11=?,
        observaciones=CONCAT(IFNULL(observaciones,''), '\n', ?) 
       WHERE id=?`,
      [estado, fechaReactivacion, fechaProxima, ...opFields, observacionesReactivacion, id]
    );
    
    const [rows] = await db.query('SELECT * FROM m_cabezales WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Registrar nuevo mantenimiento
router.post('/:id/mantenimiento', async (req, res) => {
  const id = req.params.id;
  const body = req.body;
  const {
    ops = {},
    observaciones = '',
    fecha_mantenimiento,
    fecha_proximo,
    tipo_mantenimiento: payloadTipoMant
  } = body;

  const opFields = [];
  for (let i = 0; i <= 11; i++) {
    opFields.push(ops[`op${i}`] ? 1 : 0);
  }

  const requiredChecks = ['op0','op1','op2','op3','op4','op5','op6'];
  const allOk = requiredChecks.every(k => !!ops[k]);
  // default mapping to DB enum
  const defaultEstado = allOk ? 'Operando' : 'Por reparar';

  try {
    // Obtener registro base para extraer el numero y datos por defecto
    const [baseRows] = await db.query('SELECT * FROM m_cabezales WHERE id = ?', [id]);
    if (baseRows.length === 0) {
      return res.status(404).json({ error: 'Cabezal no encontrado' });
    }
    const base = baseRows[0];

    const fechaMantenimiento = fecha_mantenimiento || new Date().toISOString().split('T')[0];
    const proximoMantenimiento = fecha_proximo || (() => {
      const fecha = new Date(fechaMantenimiento);
      fecha.setMonth(fecha.getMonth() + 2);
      return fecha.toISOString().split('T')[0];
    })();

  const tipoMant = payloadTipoMant || base.tipo_mantenimiento || null;
  const estadoFromPayload = body.estado || null;
  const ubicacionFromPayload = body.ubicacion || null;

  const tipo = base.tipo || null;
  const linea = base.linea || null;
  const ubicacion = ubicacionFromPayload || base.ubicacion || null;
  const estadoToUse = estadoFromPayload || defaultEstado;

    const [insertResult] = await db.query(
      `INSERT INTO m_cabezales (numero, tipo, linea, tipo_mantenimiento, ubicacion, estado, fm, sm, op, op1, op2, op3, op4, op5, op6, op7, op8, op9, op10, op11, observaciones)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [base.numero, tipo, linea, tipoMant, ubicacion, estadoToUse, fechaMantenimiento, proximoMantenimiento, ...opFields, `MANTENIMIENTO: ${observaciones} - ${new Date().toLocaleDateString()}`]
    );

    // Insertar en histórico también
    await db.query(
      `INSERT INTO historico (numero, tipo, linea, tipo_mantenimiento, ubicacion, estado, fm, sm, op, op1, op2, op3, op4, op5, op6, op7, op8, op9, op10, op11, observaciones)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [base.numero, tipo, linea, tipoMant, ubicacion, estadoToUse, fechaMantenimiento, proximoMantenimiento, ...opFields, `MANTENIMIENTO: ${observaciones} - ${new Date().toLocaleDateString()}`]
    );

    const [newRows] = await db.query('SELECT * FROM m_cabezales WHERE id = ?', [insertResult.insertId]);
    return res.status(201).json(newRows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
