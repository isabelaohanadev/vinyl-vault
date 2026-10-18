require('dotenv').config();
const express = require('express');
const cors = require('cors');
const routes = require('./routes');
require('./config/db');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/api', routes);

const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});