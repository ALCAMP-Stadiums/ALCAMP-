const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireAccountant } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/journal/entries?from=&to=&type=
router.get('/entries', authenticateToken, async (req, res) => {
  try {
    const { from, to, type } = req.query;
    const company = await prisma.company.findFirst();
    if (!company) return res.status(400).json({ error: 'No company found' });

    const where = { companyId: company.id };
    if (type) where.type = type;
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    const entries = await prisma.journalEntry.findMany({
      where,
      include: { lines: true },
      orderBy: { date: 'desc' }
    });

    res.json(entries);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/journal/entries
router.post('/entries', authenticateToken, requireAccountant, async (req, res) => {
  try {
    const { date, description, reference, type, lines } = req.body;
    const company = await prisma.company.findFirst();
    if (!company) return res.status(400).json({ error: 'No company found' });

    // Generate entry number
    const count = await prisma.journalEntry.count();
    const entryNumber = `JE-${String(count + 1).padStart(5, '0')}`;

    // Validate debits = credits
    const totalDebit = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
    const totalCredit = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return res.status(400).json({ error: 'Total debits must equal total credits' });
    }

    const entry = await prisma.journalEntry.create({
      data: {
        entryNumber,
        date: new Date(date),
        description,
        reference,
        type: type || 'OTHER',
        companyId: company.id,
        createdBy: req.user.username,
        lines: {
          create: lines.map(l => ({
            accountName: l.accountName,
            description: l.description,
            debit: parseFloat(l.debit) || 0,
            credit: parseFloat(l.credit) || 0
          }))
        }
      },
      include: { lines: true }
    });

    res.json(entry);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/journal/entries/:id
router.get('/entries/:id', authenticateToken, async (req, res) => {
  try {
    const entry = await prisma.journalEntry.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { lines: true }
    });
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    res.json(entry);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/journal/entries/:id
router.delete('/entries/:id', authenticateToken, requireAccountant, async (req, res) => {
  try {
    await prisma.journalEntry.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/journal/accounts
router.get('/accounts', authenticateToken, async (req, res) => {
  try {
    const accounts = await prisma.account.findMany({ orderBy: { code: 'asc' } });
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
