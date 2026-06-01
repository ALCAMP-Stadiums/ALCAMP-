const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireAccountant } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/contacts?type=CUSTOMER|SUPPLIER|SALES_REP|PARTNER
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { type } = req.query;
    const where = {};
    if (type) where.type = type;

    const contacts = await prisma.contact.findMany({
      where,
      orderBy: { name: 'asc' }
    });
    res.json(contacts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/contacts
router.post('/', authenticateToken, requireAccountant, async (req, res) => {
  try {
    const { name, phone, type, openingBalance, notes } = req.body;

    // Get company (use first company)
    const company = await prisma.company.findFirst();
    if (!company) return res.status(400).json({ error: 'No company found' });

    const contact = await prisma.contact.create({
      data: {
        name,
        phone,
        type,
        openingBalance: parseFloat(openingBalance) || 0,
        notes,
        companyId: company.id
      }
    });
    res.json(contact);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/contacts/:id
router.put('/:id', authenticateToken, requireAccountant, async (req, res) => {
  try {
    const { name, phone, type, openingBalance, notes } = req.body;
    const contact = await prisma.contact.update({
      where: { id: parseInt(req.params.id) },
      data: { name, phone, type, openingBalance: parseFloat(openingBalance) || 0, notes }
    });
    res.json(contact);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/contacts/:id
router.delete('/:id', authenticateToken, requireAccountant, async (req, res) => {
  try {
    await prisma.contact.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/contacts/:id/transactions
router.get('/:id/transactions', authenticateToken, async (req, res) => {
  try {
    const contactId = parseInt(req.params.id);
    const contact = await prisma.contact.findUnique({ where: { id: contactId } });
    if (!contact) return res.status(404).json({ error: 'Contact not found' });

    const transactions = await prisma.contactTransaction.findMany({
      where: { contactId },
      orderBy: { date: 'asc' }
    });

    // Recalculate running balance
    let balance = contact.openingBalance;
    const txWithBalance = transactions.map(tx => {
      balance = balance + tx.debit - tx.credit;
      return { ...tx, balance };
    });

    res.json({
      contact,
      transactions: txWithBalance,
      currentBalance: balance
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/contacts/:id/transactions
router.post('/:id/transactions', authenticateToken, requireAccountant, async (req, res) => {
  try {
    const contactId = parseInt(req.params.id);
    const { date, description, invoiceNumber, debit, credit, notes } = req.body;

    // Get last balance
    const lastTx = await prisma.contactTransaction.findFirst({
      where: { contactId },
      orderBy: { date: 'desc' }
    });

    const contact = await prisma.contact.findUnique({ where: { id: contactId } });
    let prevBalance = lastTx ? lastTx.balance : contact.openingBalance;
    const newBalance = prevBalance + (parseFloat(debit) || 0) - (parseFloat(credit) || 0);

    const tx = await prisma.contactTransaction.create({
      data: {
        contactId,
        date: new Date(date),
        description,
        invoiceNumber,
        debit: parseFloat(debit) || 0,
        credit: parseFloat(credit) || 0,
        balance: newBalance,
        notes,
        createdBy: req.user.username
      }
    });

    res.json(tx);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/contacts/:id/transactions/:txId
router.delete('/:id/transactions/:txId', authenticateToken, requireAccountant, async (req, res) => {
  try {
    await prisma.contactTransaction.delete({ where: { id: parseInt(req.params.txId) } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
