const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/reports/profit-loss?from=&to=
router.get('/profit-loss', authenticateToken, async (req, res) => {
  try {
    const { from, to } = req.query;
    const company = await prisma.company.findFirst();
    if (!company) return res.status(400).json({ error: 'No company found' });

    const dateFilter = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to);

    const where = { companyId: company.id };
    if (from || to) where.date = dateFilter;

    // Get journal entries for P&L
    const journalEntries = await prisma.journalEntry.findMany({
      where,
      include: { lines: true }
    });

    // Calculate income and expenses from journal lines
    let totalIncome = 0;
    let totalExpenses = 0;
    let totalPurchases = 0;
    let totalSales = 0;

    const incomeEntries = [];
    const expenseEntries = [];

    journalEntries.forEach(entry => {
      if (entry.type === 'SALE') {
        const amount = entry.lines.reduce((s, l) => s + l.credit - l.debit, 0);
        totalSales += Math.abs(amount);
        totalIncome += Math.abs(amount);
        incomeEntries.push({
          date: entry.date,
          description: entry.description,
          entryNumber: entry.entryNumber,
          amount: Math.abs(amount),
          type: 'SALE'
        });
      } else if (entry.type === 'PURCHASE') {
        const amount = entry.lines.reduce((s, l) => s + l.debit - l.credit, 0);
        totalPurchases += Math.abs(amount);
        totalExpenses += Math.abs(amount);
        expenseEntries.push({
          date: entry.date,
          description: entry.description,
          entryNumber: entry.entryNumber,
          amount: Math.abs(amount),
          type: 'PURCHASE'
        });
      } else if (entry.type === 'EXPENSE') {
        const amount = entry.lines.reduce((s, l) => s + l.debit - l.credit, 0);
        totalExpenses += Math.abs(amount);
        expenseEntries.push({
          date: entry.date,
          description: entry.description,
          entryNumber: entry.entryNumber,
          amount: Math.abs(amount),
          type: 'EXPENSE'
        });
      }
    });

    // Commission data
    const commWhere = {};
    if (from || to) commWhere.date = dateFilter;
    const commissions = await prisma.commission.findMany({
      where: commWhere,
      include: { salesRep: { select: { name: true } } }
    });
    const totalCommissions = commissions.reduce((s, c) => s + c.commission, 0);
    totalIncome += totalCommissions;

    const netProfit = totalIncome - totalExpenses;

    res.json({
      from,
      to,
      totalIncome,
      totalExpenses,
      totalSales,
      totalPurchases,
      totalCommissions,
      netProfit,
      incomeEntries,
      expenseEntries
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/reports/general-ledger
router.get('/general-ledger', authenticateToken, async (req, res) => {
  try {
    const { from, to } = req.query;
    const company = await prisma.company.findFirst();
    if (!company) return res.status(400).json({ error: 'No company found' });

    const dateFilter = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to);

    const where = { companyId: company.id };
    if (from || to) where.date = dateFilter;

    // Get all journal entries with lines
    const journalEntries = await prisma.journalEntry.findMany({
      where,
      include: { lines: true },
      orderBy: { date: 'asc' }
    });

    // Group by account name
    const ledger = {};
    journalEntries.forEach(entry => {
      entry.lines.forEach(line => {
        if (!ledger[line.accountName]) {
          ledger[line.accountName] = {
            accountName: line.accountName,
            entries: [],
            totalDebit: 0,
            totalCredit: 0
          };
        }
        ledger[line.accountName].entries.push({
          date: entry.date,
          description: entry.description,
          entryNumber: entry.entryNumber,
          lineDescription: line.description,
          debit: line.debit,
          credit: line.credit
        });
        ledger[line.accountName].totalDebit += line.debit;
        ledger[line.accountName].totalCredit += line.credit;
      });
    });

    res.json({
      from,
      to,
      accounts: Object.values(ledger)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/reports/balance-sheet
router.get('/balance-sheet', authenticateToken, async (req, res) => {
  try {
    const company = await prisma.company.findFirst();
    if (!company) return res.status(400).json({ error: 'No company found' });

    // Cash balance
    const lastCash = await prisma.cashTransaction.findFirst({
      where: { companyId: company.id },
      orderBy: { date: 'desc' }
    });

    // Bank balance
    const lastBank = await prisma.bankTransaction.findFirst({
      where: { companyId: company.id },
      orderBy: { date: 'desc' }
    });

    // Customer receivables
    const customers = await prisma.contact.findMany({
      where: { companyId: company.id, type: 'CUSTOMER' },
      include: { transactions: { orderBy: { date: 'desc' }, take: 1 } }
    });

    let totalReceivables = 0;
    customers.forEach(c => {
      const lastTx = c.transactions[0];
      totalReceivables += lastTx ? lastTx.balance : c.openingBalance;
    });

    // Supplier payables
    const suppliers = await prisma.contact.findMany({
      where: { companyId: company.id, type: 'SUPPLIER' },
      include: { transactions: { orderBy: { date: 'desc' }, take: 1 } }
    });

    let totalPayables = 0;
    suppliers.forEach(s => {
      const lastTx = s.transactions[0];
      totalPayables += lastTx ? lastTx.balance : s.openingBalance;
    });

    res.json({
      assets: {
        cash: lastCash ? lastCash.balance : 0,
        bank: lastBank ? lastBank.balance : 0,
        receivables: totalReceivables,
        total: (lastCash ? lastCash.balance : 0) + (lastBank ? lastBank.balance : 0) + totalReceivables
      },
      liabilities: {
        payables: totalPayables,
        total: totalPayables
      },
      equity: {
        net: ((lastCash ? lastCash.balance : 0) + (lastBank ? lastBank.balance : 0) + totalReceivables) - totalPayables
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/reports/contacts-summary?type=CUSTOMER|SUPPLIER
router.get('/contacts-summary', authenticateToken, async (req, res) => {
  try {
    const { type } = req.query;
    const company = await prisma.company.findFirst();

    const contacts = await prisma.contact.findMany({
      where: { companyId: company.id, type: type || 'CUSTOMER' },
      include: {
        transactions: { orderBy: { date: 'desc' }, take: 1 }
      }
    });

    const summary = contacts.map(c => {
      const lastTx = c.transactions[0];
      const balance = lastTx ? lastTx.balance : c.openingBalance;
      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        openingBalance: c.openingBalance,
        currentBalance: balance
      };
    });

    res.json(summary);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
