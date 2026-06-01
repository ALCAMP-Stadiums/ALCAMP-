const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Create admin user
  const adminHash = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      fullName: 'مدير النظام',
      passwordHash: adminHash,
      role: 'ADMIN'
    }
  });
  console.log('Admin user created:', admin.username);

  // Create accountant user
  const accHash = await bcrypt.hash('acc123', 10);
  await prisma.user.upsert({
    where: { username: 'accountant' },
    update: {},
    create: {
      username: 'accountant',
      fullName: 'المحاسب',
      passwordHash: accHash,
      role: 'ACCOUNTANT'
    }
  });

  // Create viewer user
  const viewHash = await bcrypt.hash('view123', 10);
  await prisma.user.upsert({
    where: { username: 'viewer' },
    update: {},
    create: {
      username: 'viewer',
      fullName: 'المشاهد',
      passwordHash: viewHash,
      role: 'VIEWER'
    }
  });

  // Create company
  const company = await prisma.company.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'كندة',
      address: 'ليبيا - طرابلس',
      phone: '0912345678'
    }
  });
  console.log('Company created:', company.name);

  // Create sample contacts - Customers
  const customers = [
    { name: 'أحمد محمد', phone: '0911111111', type: 'CUSTOMER', openingBalance: 5000 },
    { name: 'محمد علي', phone: '0922222222', type: 'CUSTOMER', openingBalance: 3000 },
    { name: 'خالد إبراهيم', phone: '0933333333', type: 'CUSTOMER', openingBalance: 0 }
  ];

  for (const c of customers) {
    await prisma.contact.upsert({
      where: { id: customers.indexOf(c) + 1 },
      update: {},
      create: { ...c, companyId: company.id }
    });
  }

  // Create sample contacts - Suppliers
  const suppliers = [
    { name: 'شركة الأمل للتوريدات', phone: '0944444444', type: 'SUPPLIER', openingBalance: 10000 },
    { name: 'مؤسسة النور', phone: '0955555555', type: 'SUPPLIER', openingBalance: 5000 }
  ];

  for (const s of suppliers) {
    await prisma.contact.upsert({
      where: { id: customers.length + suppliers.indexOf(s) + 1 },
      update: {},
      create: { ...s, companyId: company.id }
    });
  }

  // Create sales reps
  const salesReps = [
    { name: 'الحسين', phone: '0966666666', type: 'SALES_REP', openingBalance: 0 },
    { name: 'بشير', phone: '0977777777', type: 'SALES_REP', openingBalance: 0 }
  ];

  for (const sr of salesReps) {
    await prisma.contact.upsert({
      where: { id: customers.length + suppliers.length + salesReps.indexOf(sr) + 1 },
      update: {},
      create: { ...sr, companyId: company.id }
    });
  }

  // Create partners
  await prisma.contact.upsert({
    where: { id: customers.length + suppliers.length + salesReps.length + 1 },
    update: {},
    create: {
      name: 'الشريك الأول',
      phone: '0988888888',
      type: 'PARTNER',
      openingBalance: 50000,
      companyId: company.id
    }
  });

  // Create chart of accounts
  const accounts = [
    { code: '1000', name: 'الأصول', type: 'ASSET' },
    { code: '1100', name: 'النقدية', type: 'ASSET' },
    { code: '1200', name: 'البنك', type: 'ASSET' },
    { code: '1300', name: 'حسابات القبض', type: 'ASSET' },
    { code: '2000', name: 'الخصوم', type: 'LIABILITY' },
    { code: '2100', name: 'حسابات الدفع', type: 'LIABILITY' },
    { code: '3000', name: 'حقوق الملكية', type: 'EQUITY' },
    { code: '3100', name: 'رأس المال', type: 'EQUITY' },
    { code: '4000', name: 'الإيرادات', type: 'INCOME' },
    { code: '4100', name: 'إيرادات المبيعات', type: 'INCOME' },
    { code: '4200', name: 'إيرادات أخرى', type: 'INCOME' },
    { code: '5000', name: 'المصروفات', type: 'EXPENSE' },
    { code: '5100', name: 'تكلفة البضاعة المباعة', type: 'EXPENSE' },
    { code: '5200', name: 'مصروفات تشغيلية', type: 'EXPENSE' },
    { code: '5300', name: 'رواتب وأجور', type: 'EXPENSE' },
    { code: '5400', name: 'مصروفات إدارية', type: 'EXPENSE' }
  ];

  for (const acc of accounts) {
    await prisma.account.upsert({
      where: { code: acc.code },
      update: {},
      create: acc
    });
  }

  console.log('Accounts of chart created');

  // Create sample cash transactions
  const cashTxs = [
    { date: new Date('2024-01-01'), description: 'رصيد افتتاحي', amountIn: 100000, amountOut: 0 },
    { date: new Date('2024-01-05'), description: 'مبيعات نقدية', amountIn: 15000, amountOut: 0 },
    { date: new Date('2024-01-10'), description: 'دفع رواتب', amountIn: 0, amountOut: 8000 },
    { date: new Date('2024-01-15'), description: 'تحصيل من عميل', amountIn: 5000, amountOut: 0 },
    { date: new Date('2024-01-20'), description: 'مشتريات نقدية', amountIn: 0, amountOut: 12000 }
  ];

  let cashBalance = 0;
  for (const tx of cashTxs) {
    cashBalance = cashBalance + tx.amountIn - tx.amountOut;
    await prisma.cashTransaction.create({
      data: {
        ...tx,
        balance: cashBalance,
        companyId: company.id,
        createdBy: 'admin'
      }
    });
  }

  // Create sample bank transactions
  const bankTxs = [
    { date: new Date('2024-01-01'), description: 'إيداع رأس المال', amountIn: 200000, amountOut: 0 },
    { date: new Date('2024-01-08'), description: 'تحويل بنكي وارد', amountIn: 50000, amountOut: 0 },
    { date: new Date('2024-01-12'), description: 'دفع فاتورة موردين', amountIn: 0, amountOut: 30000 }
  ];

  let bankBalance = 0;
  for (const tx of bankTxs) {
    bankBalance = bankBalance + tx.amountIn - tx.amountOut;
    await prisma.bankTransaction.create({
      data: {
        ...tx,
        balance: bankBalance,
        companyId: company.id,
        createdBy: 'admin'
      }
    });
  }

  console.log('Sample transactions created');
  console.log('Seed completed successfully!');
  console.log('\nLogin credentials:');
  console.log('  Admin: admin / admin123');
  console.log('  Accountant: accountant / acc123');
  console.log('  Viewer: viewer / view123');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
