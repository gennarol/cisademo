/**
 * Computes formal checks for an order.
 * Returns an object with overall status and per-line details.
 *
 * Checks:
 * 1. Articolo specificato ma non presente in anagrafica (articleStatus === 'not_found')
 * 2. Cliente presente in anagrafica (customerStatus === 'found')
 * 3. Articolo con configurazione personalizzata (configStatus === 'custom') — non passa, va corretto fuori sistema
 * 4. Quantità non specificata o uguale a zero
 * 5. Codice Articolo non specificato
 * 6. Prezzo non allineato al listino corrente
 * 7. Articolo non ordinato in precedenza da questo cliente
 * 8. Unità di misura mancante
 */

export function computeFormalChecks(order) {
  const lines = order.lines || [];
  const lineChecks = lines.map(line => {
    const checks = [];

    // Check 1: Article specified but not in registry
    if (line.articleStatus === 'not_found') {
      checks.push({ id: 1, label: 'Articolo non presente in anagrafica', fixable: true });
    }

    // Check 3: Custom configuration required
    if (line.configStatus === 'custom') {
      checks.push({ id: 3, label: 'Configurazione personalizzata richiesta', fixable: false });
    }

    // Check 4: Quantity not specified or zero
    if (!line.quantity || line.quantity <= 0) {
      checks.push({ id: 4, label: 'Quantità non specificata o uguale a zero', fixable: true });
    }

    // Check 5: Product code not specified
    if (!line.productId || line.productId.trim() === '') {
      checks.push({ id: 5, label: 'Codice articolo non specificato', fixable: true });
    }

    // Check 6: Price mismatch with catalogue
    if (line.priceMismatch) {
      checks.push({ id: 6, label: 'Prezzo non allineato al listino corrente', fixable: true });
    }

    // Check 7: Article never ordered by this customer
    if (line.neverOrdered) {
      checks.push({ id: 7, label: 'Articolo non ordinato in precedenza da questo cliente', fixable: true });
    }

    // Check 8: Unit of measure missing
    if (line.umMissing || !line.um || line.um.trim() === '') {
      checks.push({ id: 8, label: 'Unità di misura mancante', fixable: true });
    }

    return {
      lineId: line.id,
      lineNumber: line.lineNumber,
      passed: checks.length === 0,
      checks,
    };
  });

  // Check 2: Customer in registry (order-level)
  const customerCheck = order.customerStatus === 'not_found'
    ? { id: 2, label: 'Cliente non presente in anagrafica', fixable: true }
    : null;

  const allLinePassed = lineChecks.every(lc => lc.passed);
  const passed = allLinePassed && !customerCheck;

  return {
    passed,
    status: passed ? 'Passati' : 'Non passati',
    customerCheck,
    lineChecks,
    // Summary of all failed checks
    failedChecks: [
      ...(customerCheck ? [customerCheck] : []),
      ...lineChecks.flatMap(lc => lc.checks.map(c => ({ ...c, lineNumber: lc.lineNumber }))),
    ],
  };
}
