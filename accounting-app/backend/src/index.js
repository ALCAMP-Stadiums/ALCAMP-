require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const contactsRoutes = require('./routes/contacts');
const cashRoutes = require('./routes/cash');
const bankRoutes = require('./routes/bank');
const commissionsRoutes = require('./routes/commissions');
const journalRoutes = require('./routes/journal');
const reportsRoutes = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/cash', cashRoutes);
app.use('/api/bank', bankRoutes);
app.use('/api/commissions', commissionsRoutes);
app.use('/api/journal', journalRoutes);
app.use('/api/reports', reportsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Accounting API is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
