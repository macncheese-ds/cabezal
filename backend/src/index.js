const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const mantenimientos = require('./routes/mantenimientos');

dotenv.config();
const app = express();

app.use(cors());
app.use(bodyParser.json());

app.use('/api/mantenimientos', mantenimientos);

const PORT = process.env.PORT || 8005;
app.listen(PORT, '0.0.0.0', () => console.log(`Cabezal API on ${PORT}`));