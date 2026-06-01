const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireAccountant } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/commissions?salesRepId=&from=&to=
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { salesRepId, from, to } = req.query;
    const where = {};
    if (salesRepId) where.salesRepId = parseInt(salesRepId);
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    const commissions = await prisma.commission.findMany({
      where,
      include: { salesRep: { select: { id: true, name: true } } },
      orderBy: { date: 'desc' }
    });

    const totalCommission = commissions.reduce((sum, c) => sum + c.commission, 0);
    res.json({ commissions, totalCommission });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/commissions
router.post('/', authenticateToken, requireAccountant, async (req, res) => {
  try {
    const { salesRepId, invoiceNumber, date, description, salePrice, purchasePrice, notes } = req.body;

    const sale = parseFloat(salePrice) || 0;
    const purchase = parseFloat(purchasePrice) || 0;
    const commission = sale - purchase;

    const record = await prisma.commission.create({
      data: {
        salesRepId: parseInt(salesRepId),
        invoiceNumber,
        date: new Date(date),
        description,
        salePrice: sale,
        purchasePrice: purchase,
        commission,
        notes
      },
      include: { salesRep: { select: { id: true, name: true } } }
    });

    res.json(record);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/commissions/:id
router.put('/:id', authenticateToken, requireAccountant, async (req, res) => {
  try {
    const { salesRepId, invoiceNumber, date, description, salePrice, purchasePrice, notes } = req.body;
    const sale = parseFloat(salePrice) || 0;
    const purchase = parseFloat(purchasePrice) || 0;
    const commission = sale - purchase;

    const record = await prisma.commission.update({
      where: { id: parseInt(req.params.id) },
      data: {
        salesRepId: parseInt(salesRepId),
        invoiceNumber,
        date: new Date(date),
        description,
        salePrice: sale,
        purchasePrice: purchase,
        commission,
        notes
      },
      include: { salesRep: { select: { id: true, name: true } } }
    });

    res.json(record);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/commissions/:id
router.delete('/:id', authenticateToken, requireAccountant, async (req, res) => {
  try {
    await prisma.commission.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/commissions/summary - summary by sales rep
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const { from, to } = req.query;
    const where = {};
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    const commissions = await prisma.commission.findMany({
      where,
      include: { salesRep: { select: { id: true, name: true } } }
    });

    const summary = {};
    commissions.forEach(c => {
      if (!summary[c.salesRepId]) {
        summary[c.salesRepId] = {
          salesRepId: c.salesRepId,
          salesRepName: c.salesRep.name,
          totalSales: 0,
          totalPurchases: 0,
          totalCommission: 0,
          count: 0
        };
      }
      summary[c.salesRepId].totalSales += c.salePrice;
      summary[c.salesRepId].totalPurchases += c.purchasePrice;
      summary[c.salesRepId].totalCommission += c.commission;
      summary[c.salesRepId].count++;
    });

    res.json(Object.values(summary));
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
