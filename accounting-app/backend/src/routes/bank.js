const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireAccountant } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/bank/transactions?from=&to=
router.get('/transactions', authenticateToken, async (req, res) => {
  try {
    const { from, to } = req.query;
    const company = await prisma.company.findFirst();
    if (!company) return res.status(400).json({ error: 'No company found' });

    const where = { companyId: company.id };
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    const transactions = await prisma.bankTransaction.findMany({
      where,
      orderBy: { date: 'asc' }
    });

    // Recalculate running balance
    let balance = 0;
    const txWithBalance = transactions.map(tx => {
      balance = balance + tx.amountIn - tx.amountOut;
      return { ...tx, balance };
    });

    res.json({
      transactions: txWithBalance,
      currentBalance: balance
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/bank/transactions
router.post('/transactions', authenticateToken, requireAccountant, async (req, res) => {
  try {
    const { date, description, amountIn, amountOut, reference, notes } = req.body;
    const company = await prisma.company.findFirst();
    if (!company) return res.status(400).json({ error: 'No company found' });

    const lastTx = await prisma.bankTransaction.findFirst({
      where: { companyId: company.id },
      orderBy: { date: 'desc' }
    });
    const prevBalance = lastTx ? lastTx.balance : 0;
    const newBalance = prevBalance + (parseFloat(amountIn) || 0) - (parseFloat(amountOut) || 0);

    const tx = await prisma.bankTransaction.create({
      data: {
        date: new Date(date),
        description,
        amountIn: parseFloat(amountIn) || 0,
        amountOut: parseFloat(amountOut) || 0,
        balance: newBalance,
        reference,
        notes,
        companyId: company.id,
        createdBy: req.user.username
      }
    });

    res.json(tx);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/bank/transactions/:id
router.delete('/transactions/:id', authenticateToken, requireAccountant, async (req, res) => {
  try {
    await prisma.bankTransaction.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/bank/transactions/:id
router.put('/transactions/:id', authenticateToken, requireAccountant, async (req, res) => {
  try {
    const { date, description, amountIn, amountOut, reference, notes } = req.body;
    const tx = await prisma.bankTransaction.update({
      where: { id: parseInt(req.params.id) },
      data: {
        date: new Date(date),
        description,
        amountIn: parseFloat(amountIn) || 0,
        amountOut: parseFloat(amountOut) || 0,
        reference,
        notes
      }
    });
    res.json(tx);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
