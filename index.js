require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.use('/api/onboarding', require('./src/routes/onboarding'));
app.use('/api/deposit', require('./src/routes/deposit'));
app.use('/api/webhook', require('./src/routes/webhook'));
app.use('/api/rooms', require('./src/routes/rooms'));
app.use('/api/users', require('./src/routes/users'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Zento server running on port ${PORT}`);
});
