const { app } = require('@azure/functions');
const { getTableClient, TABLES, orderToEntity, lineToEntity, correctionToEntity, ensureTables } = require('../services/tableService');

/**
 * Seed function: populates Azure Tables with sample data.
 * Call POST /api/seed to initialize the database with demo orders.
 * This is idempotent — it skips orders that already exist.
 */
app.http('seedData', {
  methods: ['POST','GET'],
  authLevel: 'anonymous',
  route: 'seed',
  handler: async (request, context) => {
    try {
      await ensureTables();

      const ordersClient = getTableClient(TABLES.ORDERS);
      const linesClient = getTableClient(TABLES.ORDER_LINES);
      const correctionsClient = getTableClient(TABLES.CORRECTION_REQUESTS);

      const sampleOrders = generateSampleOrders();
      let created = 0;
      let skipped = 0;

      for (const order of sampleOrders) {
        try {
          await ordersClient.createEntity(orderToEntity(order));

          // Store lines
          for (const line of order.lines) {
            await linesClient.createEntity(lineToEntity(order.id, line));
          }

          // Store correction requests
          for (const corr of order.correctionRequests || []) {
            await correctionsClient.createEntity(correctionToEntity(order.id, corr));
          }

          created++;
        } catch (err) {
          if (err.statusCode === 409) {
            skipped++;
          } else {
            throw err;
          }
        }
      }

      return {
        status: 200,
        jsonBody: {
          message: `Seed complete. Created: ${created}, Skipped (already exist): ${skipped}`,
          totalOrders: sampleOrders.length,
        },
      };
    } catch (error) {
      context.error('Error seeding data:', error);
      return { status: 500, jsonBody: { error: 'Failed to seed data', details: error.message } };
    }
  }
});

// --- Sample data generation (mirrors frontend mockData.js logic) ---

const products = [
  { id: 'CIL-EUR-001', name: 'Cilindro Europeo C3000 30/30', um: 'PZ', price: 45.50, hasConfig: false },
  { id: 'CIL-EUR-002', name: 'Cilindro Europeo C3000 35/35', um: 'PZ', price: 48.00, hasConfig: false },
  { id: 'CIL-EUR-003', name: 'Cilindro Europeo AP4 S 30/40', um: 'PZ', price: 72.00, hasConfig: 'standard' },
  { id: 'SER-MEC-001', name: 'Serratura Meccanica Multitop 3P', um: 'PZ', price: 89.00, hasConfig: false },
  { id: 'SER-ELE-001', name: 'Serratura Elettrica E80 12V', um: 'PZ', price: 134.00, hasConfig: 'standard' },
  { id: 'MAN-INT-001', name: 'Maniglione Antipanico FAST Push', um: 'PZ', price: 210.00, hasConfig: 'custom' },
  { id: 'MAN-INT-002', name: 'Maniglione Antipanico FAST Touch', um: 'PZ', price: 245.00, hasConfig: 'custom' },
  { id: 'LUC-CIL-001', name: 'Lucchetto Corazzato 280 RS 50mm', um: 'PZ', price: 32.00, hasConfig: false },
  { id: 'LUC-CIL-002', name: 'Lucchetto Corazzato 280 RS 70mm', um: 'PZ', price: 38.50, hasConfig: false },
  { id: 'ACC-PIA-001', name: 'Piastra di Rinforzo Defender 3D', um: 'PZ', price: 28.00, hasConfig: false },
  { id: 'ACC-ROS-001', name: 'Rosetta Copricilindro Universale', um: 'PZ', price: 12.50, hasConfig: false },
  { id: 'CHI-MAE-001', name: 'Chiave Maestra Sistema MK C3000', um: 'SET', price: 185.00, hasConfig: 'standard' },
  { id: 'SER-DIG-001', name: 'Serratura Digitale DGT 100', um: 'PZ', price: 320.00, hasConfig: 'custom' },
  { id: 'CIL-OVA-001', name: 'Cilindro Ovale 35/35 Ottone', um: 'PZ', price: 22.00, hasConfig: false },
  { id: 'CHI-PORT-02', name: 'Chiudiporta Aerodinamico C2000', um: 'PZ', price: 112.00, hasConfig: false },
];

const agents = [
  { id: 'AG001', name: 'Marco Rossi', region: 'Nord Italia', email: 'marco.rossi@agenti.cisa.com' },
  { id: 'AG002', name: 'Laura Bianchi', region: 'Centro Italia', email: 'laura.bianchi@agenti.cisa.com' },
  { id: 'AG003', name: 'Giuseppe Verdi', region: 'Sud Italia', email: 'giuseppe.verdi@agenti.cisa.com' },
  { id: 'AG004', name: 'Anna Ferretti', region: 'Nord-Est', email: 'anna.ferretti@agenti.cisa.com' },
  { id: 'AG005', name: 'Paolo Conti', region: 'Lombardia', email: 'paolo.conti@agenti.cisa.com' },
];

const customers = [
  { id: 'CLI001', name: 'Ferramenta Rossi S.r.l.', city: 'Milano', province: 'MI', vatNumber: '01234567890', address: 'Via Torino 42' },
  { id: 'CLI002', name: 'Edilsicura S.r.l.', city: 'Roma', province: 'RM', vatNumber: '09876543210', address: 'Via Appia 156' },
  { id: 'CLI003', name: 'SafeHome Distribution', city: 'Torino', province: 'TO', vatNumber: '11223344556', address: 'Corso Francia 89' },
  { id: 'CLI004', name: 'Sicurezza Plus S.p.A.', city: 'Napoli', province: 'NA', vatNumber: '66554433221', address: 'Via Toledo 12' },
  { id: 'CLI005', name: 'Brico World', city: 'Padova', province: 'PD', vatNumber: '99887766554', address: 'Via Venezia 33' },
  { id: 'CLI006', name: 'F.lli Martini Serrature', city: 'Firenze', province: 'FI', vatNumber: '55443322110', address: 'Viale Europa 78' },
];

const unknownCustomers = [
  { name: 'Securitalia S.r.l.', city: 'Bologna', province: 'BO', vatNumber: null, address: null },
  { name: 'Ferr. Marchetti & Figli', city: 'Firenze', province: 'FI', vatNumber: '01234567890', address: null },
  { name: 'KeySolutions Ltd', city: 'Londra', province: 'UK', vatNumber: null, address: '15 Baker Street' },
  { name: 'Serramenti Pavan', city: null, province: null, vatNumber: null, address: null },
  { name: 'D&G Sicurezza', city: 'Bari', province: 'BA', vatNumber: '09876543210', address: 'Via Roma 42' },
];

const statuses = ['da_controllare', 'richiesta_revisione', 'approvato', 'inviato_d365', 'richiesta_correzione'];

function generateSampleOrders() {
  const orders = [];
  const now = new Date();

  for (let i = 1; i <= 35; i++) {
    const daysAgo = Math.floor(((i * 7 + 3) % 30));
    const orderDate = new Date(now);
    orderDate.setDate(orderDate.getDate() - daysAgo);

    const agent = agents[(i - 1) % agents.length];
    const status = statuses[(i - 1) % statuses.length];
    const orderId = `ORD-2026-${String(i).padStart(4, '0')}`;

    let customerStatus = 'found';
    let customer;
    let customerSuggestions = null;

    if ([3, 8, 14, 22, 30].includes(i)) {
      customerStatus = 'not_found';
      customer = { id: null, ...unknownCustomers[i % unknownCustomers.length] };
      customerSuggestions = customers.slice(0, 3).map(c => ({ ...c, similarity: 0.5 }));
    } else {
      customer = customers[(i - 1) % customers.length];
    }

    let forceExceptions = null;
    if ([5, 12, 19, 27].includes(i)) forceExceptions = 'article_not_found';
    if ([7, 16, 25].includes(i)) forceExceptions = 'qty_zero';
    if ([10, 21].includes(i)) forceExceptions = 'no_code';

    const lines = generateLines(orderId, i, forceExceptions);
    const totalAmount = lines.reduce((sum, l) => sum + l.totalPrice, 0);
    const avgScore = Math.round(lines.reduce((sum, l) => sum + l.scoreAI, 0) / lines.length);

    const warnings = [];
    if (customerStatus === 'not_found') warnings.push('Cliente non trovato in anagrafica');
    if (lines.some(l => l.articleStatus === 'not_found')) warnings.push('Uno o più articoli non trovati in anagrafica');
    if (lines.some(l => l.configStatus === 'custom')) warnings.push('Articolo personalizzato - configurazione richiesta');
    if (lines.some(l => !l.quantity || l.quantity <= 0)) warnings.push('Quantità mancante su una o più righe');

    let correctionRequests = [];
    if (status === 'richiesta_correzione') {
      correctionRequests.push({
        id: Date.now() + i,
        message: 'Verificare quantità articolo - sembra eccessiva rispetto allo storico cliente.',
        channel: i % 2 === 0 ? 'email' : 'whatsapp',
        date: new Date(orderDate.getTime() + 86400000).toISOString(),
      });
    }

    orders.push({
      id: orderId,
      orderNumber: orderId,
      date: orderDate.toISOString().split('T')[0],
      customer,
      customerStatus,
      customerSuggestions,
      agent,
      status,
      totalAmount: +totalAmount.toFixed(2),
      scoreAI: avgScore,
      warnings,
      lines,
      correctionRequests,
      email: {
        subject: `Ordine ${customer.name} - ${orderDate.toLocaleDateString('it-IT')}`,
        from: agent.email,
        to: 'ordini@cisa.com',
        date: orderDate.toISOString(),
        body: `Ordine per ${customer.name}.\nArticoli: ${lines.length} righe.\nImporto: €${totalAmount.toFixed(2)}`,
        attachments: [],
      },
      emailSubject: `Ordine ${customer.name}`,
      emailFrom: agent.email,
      receivedAt: new Date(orderDate.getTime() - (i * 3600000)).toISOString(),
    });
  }

  return orders;
}

function generateLines(orderId, orderIndex, forceExceptions) {
  const numLines = ((orderIndex * 3 + 1) % 4) + 1;
  const lines = [];

  for (let i = 0; i < numLines; i++) {
    const product = products[(orderIndex + i) % products.length];
    const lineId = `${orderId}-L${i + 1}`;
    const qty = forceExceptions === 'qty_zero' && i === 0 ? 0 : ((orderIndex + i) % 10) + 1;
    const lineScore = Math.min(99, 60 + ((orderIndex * 7 + i * 13) % 35));

    let articleStatus = 'found';
    let productId = product.id;
    let productName = product.name;

    if (forceExceptions === 'article_not_found' && i === 0) {
      articleStatus = 'not_found';
      productId = 'UNKNOWN-' + String(orderIndex).padStart(4, '0');
      productName = product.name.replace(/\d+\/\d+|\d+mm/, '???');
    }
    if (forceExceptions === 'no_code' && i === 0) {
      productId = '';
    }

    const priceMismatch = (orderIndex + i) % 7 === 0;
    const neverOrdered = (orderIndex + i) % 9 === 0;
    const umMissing = (orderIndex + i) % 11 === 0;

    lines.push({
      id: lineId,
      lineNumber: i + 1,
      productId,
      productName,
      um: umMissing ? '' : product.um,
      quantity: qty,
      unitPrice: product.price,
      totalPrice: +(qty * product.price).toFixed(2),
      scoreAI: articleStatus === 'not_found' ? Math.min(lineScore, 55) : lineScore,
      articleStatus,
      configStatus: product.hasConfig || 'none',
      priceMismatch,
      neverOrdered,
      umMissing,
      originalText: articleStatus === 'not_found' ? `${product.name.split(' ')[0]} misura speciale` : null,
      warnings: [],
      suggestedProducts: articleStatus === 'not_found'
        ? products.slice(0, 3).map(p => ({ id: p.id, name: p.name, price: p.price }))
        : null,
    });
  }

  return lines;
}
