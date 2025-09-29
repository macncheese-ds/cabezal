const express = require('express');
const router = express.Router();
const db = require('../db');

// Helper function to calculate next maintenance date based on type
function calculateNextMaintenance(tipo, fechaBase) {
  const fecha = new Date(fechaBase);
  
  switch(tipo) {
    case 'Semanal':
      fecha.setDate(fecha.getDate() + 7);
      break;
    case 'Mensual':
      fecha.setMonth(fecha.getMonth() + 1);
      break;
    case 'Semestral':
      fecha.setMonth(fecha.getMonth() + 6);
      break;
    case 'Año y Medio':
      fecha.setMonth(fecha.getMonth() + 18);
      break;
    default:
      fecha.setMonth(fecha.getMonth() + 1);
  }
  
  return fecha;
}

// List all with categorization
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT *, 
        CASE 
          WHEN estado = 'Baja' THEN 'baja'
          WHEN estado = 'Por Reparar' THEN 'reparacion'
          WHEN DATEDIFF(sm, NOW()) <= 7 AND DATEDIFF(sm, NOW()) > 0 THEN 'proximo_vencer'
          WHEN DATEDIFF(sm, NOW()) <= 0 THEN 'vencido'
          ELSE 'activo'
        END as categoria
      FROM mantenimientos_cabezal 
      ORDER BY 
        CASE 
          WHEN estado = 'Baja' THEN 4
          WHEN estado = 'Por Reparar' THEN 2
          WHEN DATEDIFF(sm, NOW()) <= 7 THEN 1
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
    linea,
    color,
    tipo_mantenimiento,
    fm,
    sm,
    ops = {},
    observaciones = ''
  } = body;

  // build op values, allow op..op11 but default null
  const opFields = [];
  for (let i = 0; i <= 11; i++) {
    // Map op0 to op, op1 to op1, etc.
    const key = i === 0 ? 'op' : `op${i}`;
    opFields.push(ops[`op${i}`] ? 1 : 0);
  }

  // determine estado: Active only if ALL required checks pass, otherwise goes to repair
  const requiredChecks = ['op0','op1','op2','op3','op4','op5','op6']; // All checks from op0 to op6 are required
  const allOk = requiredChecks.every(k => !!ops[k]);
  const estado = allOk ? 'Activo' : 'Por Reparar';

  try {
    // Calculate next maintenance date if not provided and status is Active
    let fechaProxima = sm;
    if (!fechaProxima && estado === 'Activo') {
      fechaProxima = calculateNextMaintenance(tipo_mantenimiento, fm);
    } else if (estado === 'Por Reparar') {
      fechaProxima = null;
    }
    
    const [result] = await db.query(
      `INSERT INTO mantenimientos_cabezal (numero, linea, color, tipo_mantenimiento, fm, sm, op, op1, op2, op3, op4, op5, op6, op7, op8, op9, op10, op11, observaciones, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [numero, linea, color, tipo_mantenimiento, fm, fechaProxima, ...opFields, observaciones, estado]
    );
    
    const [rows] = await db.query('SELECT * FROM mantenimientos_cabezal WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    
    // Check for duplicate entry error (MySQL error code 1062)
    if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
      res.status(400).json({ 
        error: 'CABEZAL_EXISTS', 
        message: `El cabezal número ${numero} ya existe. Por favor verifique el número e intente con uno diferente.`
      });
    } else {
      res.status(500).json({ error: 'db error', detail: err.message });
    }
  }
});

// Update
router.put('/:id', async (req, res) => {
  const id = req.params.id;
  const body = req.body;
  const {
    numero,
    linea,
    color,
    tipo_mantenimiento,
    fm,
    sm,
    ops = {},
    observaciones = ''
  } = body;

  // build op values
  const opFields = [];
  for (let i = 0; i <= 11; i++) {
    const key = i === 0 ? 'op' : `op${i}`;
    opFields.push(ops[`op${i}`] ? 1 : 0);
  }

  // determine estado: Active only if ALL required checks pass
  const requiredChecks = ['op0','op1','op2','op3','op4','op5','op6'];
  const allOk = requiredChecks.every(k => !!ops[k]);
  const estado = allOk ? 'Activo' : 'Por Reparar';

  try {
    // Calculate next maintenance date if not provided and status is Active
    let fechaProxima = sm;
    if (!fechaProxima && estado === 'Activo') {
      fechaProxima = calculateNextMaintenance(tipo_mantenimiento, fm);
    } else if (estado === 'Por Reparar') {
      fechaProxima = null;
    }

    await db.query(
      `UPDATE mantenimientos_cabezal 
       SET numero = ?, linea = ?, color = ?, tipo_mantenimiento = ?, fm = ?, sm = ?, 
           op = ?, op1 = ?, op2 = ?, op3 = ?, op4 = ?, op5 = ?, op6 = ?, 
           op7 = ?, op8 = ?, op9 = ?, op10 = ?, op11 = ?, observaciones = ?, estado = ?
       WHERE id = ?`,
      [numero, linea, color, tipo_mantenimiento, fm, fechaProxima, ...opFields, observaciones, estado, id]
    );
    
    const [rows] = await db.query('SELECT * FROM mantenimientos_cabezal WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    
    if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
      res.status(400).json({ 
        error: 'CABEZAL_EXISTS', 
        message: `El cabezal número ${numero} ya existe. Por favor verifique el número e intente con uno diferente.`
      });
    } else {
      res.status(500).json({ error: 'db error', detail: err.message });
    }
  }
});

// Delete
router.delete('/:id', async (req, res) => {
  const id = req.params.id;
  
  try {
    await db.query('DELETE FROM mantenimientos_cabezal WHERE id = ?', [id]);
    res.json({ message: 'Cabezal eliminado exitosamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'db error', detail: err.message });
  }
});

// Get by ID
router.get('/:id', async (req, res) => {
  const id = req.params.id;
  
  try {
    const [rows] = await db.query('SELECT * FROM mantenimientos_cabezal WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Cabezal no encontrado' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'db error', detail: err.message });
  }
});

// Mark as repaired (set to Activo and calculate next maintenance)
router.post('/:id/reparar', async (req, res) => {
  const id = req.params.id;
  
  try {
    // Get current record
    const [rows] = await db.query('SELECT * FROM mantenimientos_cabezal WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Cabezal no encontrado' });
    }
    
    const cabezal = rows[0];
    const fechaProxima = calculateNextMaintenance(cabezal.tipo_mantenimiento, new Date());
    
    await db.query(
      'UPDATE mantenimientos_cabezal SET estado = ?, sm = ? WHERE id = ?',
      ['Activo', fechaProxima, id]
    );
    
    const [updatedRows] = await db.query('SELECT * FROM mantenimientos_cabezal WHERE id = ?', [id]);
    res.json(updatedRows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'db error', detail: err.message });
  }
});

module.exports = router;