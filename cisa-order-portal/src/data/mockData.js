// Mock data for the CISA Order Control Portal

export const agents = [
  { id: 1, name: 'Marco Bianchi', region: 'Nord Italia' },
  { id: 2, name: 'Laura Rossi', region: 'Centro Italia' },
  { id: 3, name: 'Giuseppe Verdi', region: 'Sud Italia' },
  { id: 4, name: 'Anna Colombo', region: 'Estero - Europa' },
  { id: 5, name: 'Paolo Ricci', region: 'Estero - Middle East' },
];

export const customers = [
  { id: 1, name: 'Ferramenta Rossi S.r.l.', city: 'Milano', province: 'MI' },
  { id: 2, name: 'Sicurezza Plus S.p.A.', city: 'Roma', province: 'RM' },
  { id: 3, name: 'Edilsicura S.r.l.', city: 'Napoli', province: 'NA' },
  { id: 4, name: 'LockMaster GmbH', city: 'Monaco', province: 'DE' },
  { id: 5, name: 'SafeHome Distribution', city: 'Parigi', province: 'FR' },
  { id: 6, name: 'Centro Serrature Torino', city: 'Torino', province: 'TO' },
];

export const products = [
  { id: 'CIL-RS5-01', name: 'Cilindro RS5 Tecnologia Radiale 30/30', um: 'PZ', price: 85.00, hasConfig: false },
  { id: 'CIL-RS5-02', name: 'Cilindro RS5 Tecnologia Radiale 35/35', um: 'PZ', price: 92.00, hasConfig: false },
  { id: 'SER-ESIG-01', name: 'Serratura eSIGNO 2.0 Hotel', um: 'PZ', price: 320.00, hasConfig: 'standard' },
  { id: 'MAN-ALPH-01', name: 'Maniglione Antipanico ALPHA', um: 'PZ', price: 245.00, hasConfig: 'standard' },
  { id: 'MAN-ALPH-02', name: 'Maniglione Antipanico ALPHA Doppia Anta', um: 'PZ', price: 410.00, hasConfig: 'standard' },
  { id: 'SER-DOM-01', name: 'DOMO Connexa Smart Door Lock', um: 'PZ', price: 580.00, hasConfig: 'custom' },
  { id: 'CHI-PORT-01', name: 'Chiudiporta Aerodinamico C1500', um: 'PZ', price: 78.00, hasConfig: false },
  { id: 'LUC-SEC-01', name: 'Lucchetto Alta Sicurezza 50mm', um: 'PZ', price: 42.00, hasConfig: false },
  { id: 'SER-ELE-01', name: 'Serratura Elettrica 12V Standard', um: 'PZ', price: 135.00, hasConfig: 'standard' },
  { id: 'CIL-TEK-01', name: 'Cilindro TEKNO iNOVATE 30/40', um: 'PZ', price: 125.00, hasConfig: false },
  { id: 'CIL-RS5-03', name: 'Cilindro RS5 Tecnologia Radiale 40/40', um: 'PZ', price: 98.00, hasConfig: false },
  { id: 'SER-ELE-02', name: 'Serratura Elettrica 24V Rinforzata', um: 'PZ', price: 185.00, hasConfig: 'standard' },
  { id: 'MAN-BETA-01', name: 'Maniglione Antipanico BETA', um: 'PZ', price: 195.00, hasConfig: 'standard' },
  { id: 'SER-DOM-02', name: 'DOMO Connexa Smart Lock PRO', um: 'PZ', price: 750.00, hasConfig: 'custom' },
  { id: 'CHI-PORT-02', name: 'Chiudiporta Aerodinamico C2000', um: 'PZ', price: 112.00, hasConfig: false },
];

const statuses = ['da_controllare', 'richiesta_revisione', 'approvato', 'inviato_d365', 'richiesta_correzione'];

function generateOrderLines(orderId, forceExceptions = null) {
  const numLines = Math.floor(Math.random() * 5) + 1;
  const lines = [];
  const usedProducts = new Set();

  for (let i = 0; i < numLines; i++) {
    let product;
    do {
      product = products[Math.floor(Math.random() * products.length)];
    } while (usedProducts.has(product.id));
    usedProducts.add(product.id);

    let qty = Math.floor(Math.random() * 50) + 1;
    const lineScore = Math.floor(Math.random() * 40) + 60;
    const warnings = [];

    // Determine article status for this line
    let articleStatus = 'found'; // found | not_found
    let configStatus = null; // null | 'none' | 'standard' | 'custom'
    let productId = product.id;
    let productName = product.name;

    if (forceExceptions === 'article_not_found' && i === 0) {
      articleStatus = 'not_found';
    } else if (forceExceptions === 'qty_zero' && i === 0) {
      qty = 0;
    } else if (forceExceptions === 'no_code' && i === 0) {
      productId = '';
      productName = product.name;
    } else if (product.hasConfig === 'custom' && Math.random() > 0.5) {
      articleStatus = 'found';
      configStatus = 'custom';
    } else if (product.hasConfig === 'standard') {
      configStatus = 'standard';
    } else if (product.hasConfig === false) {
      configStatus = 'none';
    }

    // Formal check flags (deterministic based on line index + order)
    const priceMismatch = articleStatus === 'found' && (i + parseInt(orderId.slice(-2))) % 7 === 0;
    const neverOrdered = articleStatus === 'found' && (i + parseInt(orderId.slice(-2))) % 9 === 0;
    const umMissing = (i + parseInt(orderId.slice(-2))) % 11 === 0;

    if (articleStatus === 'not_found') {
      warnings.push('Articolo non trovato in anagrafica');
    }
    if (configStatus === 'custom') {
      warnings.push('Articolo personalizzato - configurazione richiesta');
    }
    if (qty === 0) {
      warnings.push('Quantità non specificata');
    }
    if (!productId || productId.trim() === '') {
      warnings.push('Codice articolo non specificato');
    }
    if (priceMismatch) {
      warnings.push('Prezzo non allineato al listino corrente');
    }
    if (neverOrdered) {
      warnings.push('Articolo non ordinato in precedenza da questo cliente');
    }
    if (umMissing) {
      warnings.push('Unità di misura mancante');
    }

    lines.push({
      id: `${orderId}-L${i + 1}`,
      lineNumber: i + 1,
      productId: articleStatus === 'not_found' ? 'UNKNOWN-' + Math.random().toString(36).slice(2, 6).toUpperCase() : productId,
      productName: articleStatus === 'not_found' ? product.name.replace(/\d+\/\d+|\d+mm/, '???') : productName,
      um: umMissing ? '' : product.um,
      quantity: qty,
      unitPrice: product.price,
      totalPrice: +(qty * product.price).toFixed(2),
      scoreAI: articleStatus === 'not_found' ? Math.min(lineScore, 55) : lineScore,
      warnings,
      articleStatus,
      configStatus,
      priceMismatch,
      neverOrdered,
      umMissing,
      // For not_found, store the original text from email
      originalText: articleStatus === 'not_found' ? `${product.name.split(' ')[0]} ${product.name.split(' ')[1]} misura speciale` : null,
      // Suggested matches for not_found articles
      suggestedProducts: articleStatus === 'not_found' ? products
        .filter(p => p.name.toLowerCase().includes(product.name.split(' ')[0].toLowerCase()) || p.name.toLowerCase().includes(product.name.split(' ')[1].toLowerCase()))
        .slice(0, 5)
        .map(p => ({ id: p.id, name: p.name, price: p.price })) : null,
    });
  }
  return lines;
}

const emailBodies = [
  (agent, customer, lines) => `Buongiorno,

Vi invio l'ordine per il cliente ${customer.name}.

Dettaglio articoli:
${lines.map(l => `- ${l.productName}: ${l.quantity} ${l.um}`).join('\n')}

Confermate la disponibilità e i tempi di consegna.

Cordiali saluti,
${agent.name}`,

  (agent, customer, lines) => `Salve,

Come da accordi telefonici con il cliente ${customer.name} di ${customer.city}, 
procedo con l'ordine seguente:

${lines.map(l => `${l.productName} - Qt. ${l.quantity} - € ${l.unitPrice.toFixed(2)}/cad`).join('\n')}

Il cliente richiede consegna entro 10 giorni lavorativi.
Fatturazione standard 30gg FM.

Grazie,
${agent.name}
${agent.region}`,

  (agent, customer, lines) => `Ciao,

Nuovo ordine da inserire per ${customer.name} (${customer.province}).

Articoli richiesti:
${lines.map((l, i) => `${i + 1}. Cod. ${l.productId} - ${l.productName} x${l.quantity}`).join('\n')}

Note: il cliente ha urgenza, possibilmente spedire entro fine settimana.

Saluti,
${agent.name}`,
];

const attachmentTypes = [
  { name: 'Ordine_firmato.pdf', type: 'pdf', size: '245 KB' },
  { name: 'Modulo_ordine_compilato.pdf', type: 'pdf', size: '189 KB' },
  { name: 'Foto_ordine_manoscritto.jpg', type: 'image', size: '1.2 MB' },
  { name: 'Scansione_fax_ordine.pdf', type: 'pdf', size: '320 KB' },
  { name: 'WhatsApp_Image_ordine.jpg', type: 'image', size: '890 KB' },
  { name: 'Conferma_ordine_cliente.pdf', type: 'pdf', size: '156 KB' },
  { name: 'Lista_articoli.png', type: 'image', size: '540 KB' },
];

export function generateOrders() {
  const orders = [];
  const now = new Date();

  for (let i = 1; i <= 35; i++) {
    const daysAgo = Math.floor(Math.random() * 30);
    const orderDate = new Date(now);
    orderDate.setDate(orderDate.getDate() - daysAgo);

    const agent = agents[Math.floor(Math.random() * agents.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const orderId = `ORD-2026-${String(i).padStart(4, '0')}`;

    // Determine exception type
    let customerStatus = 'found'; // found | not_found
    let customer;
    let customerSuggestions = null;
    let forceExceptions = null;

    // Some orders have customer not found (orders 3, 8, 14, 22, 30)
    if ([3, 8, 14, 22, 30].includes(i)) {
      customerStatus = 'not_found';
      const unknownCustomers = [
        { name: 'Securitalia S.r.l.', city: 'Bologna', province: 'BO', vatNumber: null, address: null },
        { name: 'Ferr. Marchetti & Figli', city: 'Firenze', province: 'FI', vatNumber: '01234567890', address: null },
        { name: 'KeySolutions Ltd', city: 'Londra', province: 'UK', vatNumber: null, address: '15 Baker Street' },
        { name: 'Serramenti Pavan', city: null, province: null, vatNumber: null, address: null },
        { name: 'D&G Sicurezza', city: 'Bari', province: 'BA', vatNumber: '09876543210', address: 'Via Roma 42' },
      ];
      customer = unknownCustomers[(i % unknownCustomers.length)];
      customer = { id: null, ...customer };
      // Suggest similar existing customers
      customerSuggestions = customers
        .map(c => ({
          ...c,
          similarity: customer.name.split(' ').some(w => w.length > 3 && c.name.toLowerCase().includes(w.toLowerCase())) ? 0.7 : 0.3
        }))
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 3);
    } else {
      customer = customers[Math.floor(Math.random() * customers.length)];
    }

    // Some orders have article not found (orders 5, 12, 19, 27)
    if ([5, 12, 19, 27].includes(i)) {
      forceExceptions = 'article_not_found';
    }
    // Some orders have qty zero (orders 7, 16, 25)
    if ([7, 16, 25].includes(i)) {
      forceExceptions = 'qty_zero';
    }
    // Some orders have missing code (orders 10, 21)
    if ([10, 21].includes(i)) {
      forceExceptions = 'no_code';
    }

    const lines = generateOrderLines(orderId, forceExceptions);
    const totalAmount = lines.reduce((sum, l) => sum + l.totalPrice, 0);
    const avgScore = Math.round(lines.reduce((sum, l) => sum + l.scoreAI, 0) / lines.length);

    const headerWarnings = [];
    if (customerStatus === 'not_found') {
      headerWarnings.push('Cliente non trovato in anagrafica');
    }
    if (avgScore < 75) {
      headerWarnings.push('Score AI basso - richiede verifica manuale');
    }
    if (lines.some(l => l.articleStatus === 'not_found')) {
      headerWarnings.push('Uno o più articoli non trovati in anagrafica');
    }
    if (lines.some(l => l.configStatus === 'custom')) {
      headerWarnings.push('Articolo personalizzato - configurazione richiesta');
    }
    if (lines.some(l => !l.quantity || l.quantity <= 0)) {
      headerWarnings.push('Quantità mancante su una o più righe');
    }
    if (lines.some(l => !l.productId || l.productId.trim() === '')) {
      headerWarnings.push('Codice articolo mancante su una o più righe');
    }
    if (lines.some(l => l.priceMismatch)) {
      headerWarnings.push('Prezzo non allineato al listino su una o più righe');
    }
    if (lines.some(l => l.neverOrdered)) {
      headerWarnings.push('Articoli mai ordinati da questo cliente');
    }
    if (lines.some(l => l.umMissing)) {
      headerWarnings.push('Unità di misura mancante su una o più righe');
    }

    const emailBody = emailBodies[i % emailBodies.length](agent, customer, lines);
    const numAttachments = Math.floor(Math.random() * 3);
    const orderAttachments = [];
    const usedAttachments = new Set();
    for (let a = 0; a < numAttachments; a++) {
      let att;
      do {
        att = attachmentTypes[Math.floor(Math.random() * attachmentTypes.length)];
      } while (usedAttachments.has(att.name));
      usedAttachments.add(att.name);
      orderAttachments.push({ ...att, id: `${orderId}-att-${a}` });
    }

    const correctionMessages = [
      'Verificare quantità articolo - sembra eccessiva rispetto allo storico cliente.',
      'Prezzo unitario non corretto, allineare al listino vigente.',
      'Codice articolo non trovato in anagrafica, confermare il codice corretto.',
      'Indirizzo di spedizione diverso dal solito, confermare con il cliente.',
      'Manca il riferimento ordine del cliente, richiedere numero PO.',
    ];

    let correctionRequests = [];
    if (status === 'richiesta_correzione') {
      const numRequests = Math.floor(Math.random() * 2) + 1;
      for (let r = 0; r < numRequests; r++) {
        const reqDate = new Date(orderDate);
        reqDate.setDate(reqDate.getDate() + r + 1);
        correctionRequests.push({
          id: Date.now() + r + i * 100,
          message: correctionMessages[Math.floor(Math.random() * correctionMessages.length)],
          channel: Math.random() > 0.5 ? 'whatsapp' : 'email',
          date: reqDate.toISOString(),
        });
      }
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
      warnings: headerWarnings,
      lines,
      correctionRequests,
      email: {
        subject: `Ordine ${customer.name} - ${orderDate.toLocaleDateString('it-IT')}`,
        from: `${agent.name.toLowerCase().replace(' ', '.')}@agenti.cisa.com`,
        to: 'ordini@cisa.com',
        date: orderDate.toISOString(),
        body: emailBody,
        attachments: orderAttachments,
      },
      emailSubject: `Ordine ${customer.name} - ${orderDate.toLocaleDateString('it-IT')}`,
      emailFrom: `${agent.name.toLowerCase().replace(' ', '.')}@agenti.cisa.com`,
      receivedAt: new Date(orderDate.getTime() - (Math.floor(Math.random() * 48) + 1) * 3600000).toISOString(),
    });
  }

  return orders.sort((a, b) => new Date(b.date) - new Date(a.date));
}

export const orders = generateOrders();
