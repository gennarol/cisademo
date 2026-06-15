import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOrders } from '../context/OrdersContext';
import { products } from '../data/mockData';
import {
  ArrowLeft,
  PaperPlaneTilt,
  WhatsappLogo,
  EnvelopeSimple,
  CheckCircle,
  Warning,
  PencilSimple,
  FloppyDisk,
  X,
  FilePdf,
  Image,
  Paperclip,
  MagnifyingGlass,
  UserCirclePlus,
  Package,
  Gear,
} from '@phosphor-icons/react';
import ScoreBadge from '../components/ScoreBadge';
import StatusBadge from '../components/StatusBadge';
import PageBanner from '../components/PageBanner';
import { computeFormalChecks } from '../utils/formalChecks';

export default function OrderDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { orders, updateOrder, updateOrderLine, approveOrder, sendToD365, requestCorrection } = useOrders();

  const order = orders.find(o => o.id === orderId);
  const [activeTab, setActiveTab] = useState('lines');
  const [editingLine, setEditingLine] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionMessage, setCorrectionMessage] = useState('');
  const [correctionChannel, setCorrectionChannel] = useState('email');
  const [showArticleSearchModal, setShowArticleSearchModal] = useState(false);
  const [articleSearchLine, setArticleSearchLine] = useState(null);
  const [articleSearchQuery, setArticleSearchQuery] = useState('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  if (!order) {
    return (
      <div className="not-found">
        <h2>Ordine non trovato</h2>
        <button className="btn btn-primary" onClick={() => navigate('/orders')}>
          Torna alla lista
        </button>
      </div>
    );
  }

  const formalChecks = computeFormalChecks(order);
  const canApprove = formalChecks.passed && (order.status === 'da_controllare' || order.status === 'richiesta_revisione');

  const handleEditLine = (line) => {
    setEditingLine(line.id);
    setEditValues({
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      um: line.um || '',
    });
  };

  const handleSaveLine = (line) => {
    const qty = parseInt(editValues.quantity) || 0;
    const price = parseFloat(editValues.unitPrice) || 0;
    const newTotal = +(qty * price).toFixed(2);
    const updates = {
      quantity: qty,
      unitPrice: price,
      totalPrice: newTotal,
      um: editValues.um,
    };
    // Clear formal check flags if fixed
    if (qty > 0 && line.quantity === 0) {
      updates.warnings = (line.warnings || []).filter(w => w !== 'Quantità non specificata');
    }
    if (editValues.um && editValues.um.trim() !== '' && line.umMissing) {
      updates.umMissing = false;
      updates.warnings = (updates.warnings || line.warnings || []).filter(w => w !== 'Unità di misura mancante');
    }
    if (price !== line.unitPrice && line.priceMismatch) {
      updates.priceMismatch = false;
      updates.warnings = (updates.warnings || line.warnings || []).filter(w => w !== 'Prezzo non allineato al listino corrente');
    }
    updateOrderLine(order.id, line.id, updates);
    setEditingLine(null);
  };

  const handleCancelEdit = () => {
    setEditingLine(null);
    setEditValues({});
  };

  const handleSendCorrection = () => {
    if (!correctionMessage.trim()) return;
    requestCorrection(order.id, correctionMessage, correctionChannel);
    setShowCorrectionModal(false);
    setCorrectionMessage('');
  };

  // Open correction modal with pre-filled message from all failed formal checks (except #3 custom config)
  const openCorrectionWithChecks = () => {
    const failedChecks = formalChecks.failedChecks.filter(c => c.id !== 3);
    if (failedChecks.length === 0) {
      setCorrectionMessage('');
      setCorrectionChannel('email');
      setShowCorrectionModal(true);
      return;
    }

    let message = `Gentile ${order.agent?.name || 'Agente'},\n\n`;
    message += `nell'ordine ${order.orderNumber} sono stati riscontrati i seguenti problemi:\n\n`;

    // Group by check type
    const customerIssue = failedChecks.find(c => c.id === 2);
    const lineIssues = failedChecks.filter(c => c.id !== 2);

    if (customerIssue) {
      message += `• Cliente "${order.customer?.name || (typeof order.customer === 'string' ? order.customer : 'N/A')}" non presente in anagrafica\n`;
    }

    if (lineIssues.length > 0) {
      // Group line issues by line number
      const byLine = {};
      lineIssues.forEach(c => {
        if (!byLine[c.lineNumber]) byLine[c.lineNumber] = [];
        byLine[c.lineNumber].push(c);
      });

      Object.entries(byLine).forEach(([lineNum, checks]) => {
        const line = order.lines.find(l => l.lineNumber === parseInt(lineNum));
        const productInfo = line ? `"${line.productName}"` : '';
        message += `\nRiga ${lineNum} ${productInfo}:\n`;
        checks.forEach(c => {
          message += `  - ${c.label}\n`;
        });
      });
    }

    message += `\nPuoi verificare e fornire le informazioni corrette?\n\nGrazie.`;

    setCorrectionMessage(message);
    setCorrectionChannel('email');
    setShowCorrectionModal(true);
  };

  // Assign a suggested customer to the order
  const assignCustomer = (selectedCustomer) => {
    updateOrder(order.id, {
      customer: selectedCustomer,
      customerStatus: 'found',
      customerSuggestions: null,
      warnings: order.warnings.filter(w => w !== 'Cliente non trovato in anagrafica'),
    });
    setShowCustomerModal(false);
  };

  // Pre-fill correction for customer not found
  const openCorrectionForCustomer = () => {
    const name = order.customer?.name || (typeof order.customer === 'string' ? order.customer : '');
    const vat = order.customer?.vatNumber || '';
    const address = order.customer?.address || '';
    const city = order.customer?.city || '';
    setCorrectionMessage(
      `Gentile ${order.agent?.name || 'Agente'},\n\n` +
      `il cliente indicato nell'ordine ${order.orderNumber} non è presente in anagrafica.\n` +
      `Per procedere alla creazione, necessito dei seguenti dati:\n\n` +
      `- RAGIONE SOCIALE: ${name}\n` +
      `- PARTITA IVA: ${vat || '___________'}\n` +
      `- INDIRIZZO: ${address ? `${address}, ${city}` : '___________'}\n\n` +
      `Puoi confermare o correggere i dati sopra?\n\nGrazie.`
    );
    setCorrectionChannel('email');
    setShowCorrectionModal(true);
  };

  // Pre-fill correction for article not found
  const openCorrectionForArticle = (line) => {
    setCorrectionMessage(
      `Gentile ${order.agent?.name || 'Agente'},\n\n` +
      `nell'ordine ${order.orderNumber}, riga ${line.lineNumber}, ` +
      `l'articolo "${line.originalText || line.productName}" (cod. ${line.productId}) ` +
      `non è presente in anagrafica.\n\n` +
      `Puoi indicare il codice corretto o fornire maggiori dettagli ` +
      `per identificare l'articolo?\n\nGrazie.`
    );
    setCorrectionChannel('email');
    setShowCorrectionModal(true);
  };

  // Dismiss "never ordered" check for a line
  const dismissNeverOrdered = (line) => {
    updateOrderLine(order.id, line.id, {
      neverOrdered: false,
      warnings: (line.warnings || []).filter(w => w !== 'Articolo non ordinato in precedenza da questo cliente'),
    });
  };

  // Open article search modal
  const openArticleSearch = (line) => {
    setArticleSearchLine(line);
    setArticleSearchQuery('');
    setShowArticleSearchModal(true);
  };

  // Assign a product from search to a line
  const assignProduct = (line, product) => {
    updateOrderLine(order.id, line.id, {
      productId: product.id,
      productName: product.name,
      unitPrice: product.price,
      totalPrice: +(line.quantity * product.price).toFixed(2),
      articleStatus: 'found',
      configStatus: product.hasConfig || 'none',
      suggestedProducts: null,
      originalText: null,
      warnings: (line.warnings || []).filter(w =>
        w !== 'Articolo non trovato in anagrafica' &&
        w !== 'Codice articolo non specificato'
      ),
    });
    setShowArticleSearchModal(false);
  };

  // Filter products for search — prioritize matches to the line's product name
  const getFilteredProducts = () => {
    if (!articleSearchQuery.trim()) {
      // Show suggested first (from suggestedProducts), then by name similarity, then all
      const suggested = articleSearchLine?.suggestedProducts?.map(s => s.id) || [];
      if (suggested.length > 0) {
        return [
          ...products.filter(p => suggested.includes(p.id)),
          ...products.filter(p => !suggested.includes(p.id)),
        ];
      }
      // No suggestedProducts — sort by name similarity to line's productName
      const lineName = (articleSearchLine?.productName || '').toLowerCase();
      const words = lineName.split(/\s+/).filter(w => w.length > 2);
      return [...products].sort((a, b) => {
        const scoreA = words.filter(w => a.name.toLowerCase().includes(w)).length;
        const scoreB = words.filter(w => b.name.toLowerCase().includes(w)).length;
        return scoreB - scoreA;
      });
    }
    const q = articleSearchQuery.toLowerCase();
    return products.filter(p =>
      p.id.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q)
    );
  };

  return (
    <div className="order-detail">
      <PageBanner
        title="Dettaglio Ordine"
        breadcrumb={`Ordini di Vendita / Ord. N. ${order.orderNumber}`}
        backTo="/orders"
        actions={
          order.status !== 'inviato_d365' && (
            <>
              {(order.status === 'da_controllare' || order.status === 'richiesta_revisione' || order.status === 'richiesta_correzione') && (
                <button
                  className="btn btn-secondary"
                  onClick={openCorrectionWithChecks}
                >
                  <EnvelopeSimple size={18} /> Richiedi Correzione
                </button>
              )}
              {(order.status === 'da_controllare' || order.status === 'richiesta_revisione') && (
                <button
                  className="btn btn-success"
                  onClick={() => approveOrder(order.id)}
                  disabled={!canApprove}
                  title={!formalChecks.passed ? 'Controlli formali non passati' : ''}
                >
                  <CheckCircle size={18} /> Approva
                </button>
              )}
              {order.status === 'approvato' && (
                <button
                  className="btn btn-primary"
                  onClick={() => sendToD365(order.id)}
                >
                  <PaperPlaneTilt size={18} /> Invia a D365
                </button>
              )}
            </>
          )
        }
      />

      {/* Order Header */}
      <div className="order-header-card">
        <div className="order-header-grid">
          <div className="order-info-block">
            <h2>{order.orderNumber}</h2>
            <StatusBadge status={order.status} />
          </div>
          <div className="order-meta-grid">
            <div className="meta-item">
              <span className="meta-label">Cliente</span>
              <span className="meta-value meta-value-with-action">
                {order.customer?.name || (typeof order.customer === 'string' ? order.customer : '-')}
                {order.customerStatus === 'not_found' && (
                  <button className="btn-inline-warning" onClick={() => setShowCustomerModal(true)} title="Cliente non trovato in anagrafica">
                    <Warning size={16} weight="fill" />
                  </button>
                )}
              </span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Data Ordine</span>
              <span className="meta-value">{new Date(order.date).toLocaleDateString('it-IT')}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Agente di Vendita</span>
              <span className="meta-value">{order.agent?.name || '-'}{order.agent?.region ? ` (${order.agent.region})` : ''}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Importo Totale</span>
              <span className="meta-value meta-value-large">€ {(order.totalAmount || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Score AI</span>
              <ScoreBadge score={order.scoreAI} />
            </div>
            <div className="meta-item">
              <span className="meta-label">Controlli Formali</span>
              <span className={`formal-checks-badge ${formalChecks.passed ? 'formal-checks-passed' : 'formal-checks-failed'}`}>
                {formalChecks.status}
                {!formalChecks.passed && ` (${formalChecks.failedChecks.length})`}
              </span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Email Origine</span>
              <span className="meta-value font-mono">{order.emailFrom}</span>
            </div>
          </div>
        </div>

        {/* Order-level formal check failures (header only) */}
        {!formalChecks.passed && (
          <div className="formal-checks-header-alert">
            <Warning size={18} weight="bold" />
            <div className="formal-checks-header-alert-content">
              <span className="formal-checks-header-alert-title">Controlli formali non superati — l'ordine non può essere approvato</span>
              {formalChecks.customerCheck && (
                <p className="formal-checks-header-msg">
                  {formalChecks.customerCheck.label}
                  <button className="btn-link-inline" onClick={() => setShowCustomerModal(true)}>Correggi</button>
                </p>
              )}
            </div>
          </div>
        )}

        {order.warnings.filter(w => w !== 'Cliente non trovato in anagrafica').length > 0 && (
          <div className="warnings-box">
            <Warning size={20} weight="bold" />
            <div>
              {order.warnings.filter(w => w !== 'Cliente non trovato in anagrafica').map((w, i) => (
                <p key={i}>{w}</p>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="tabs-bar">
        <button
          className={`tab-item ${activeTab === 'lines' ? 'active' : ''}`}
          onClick={() => setActiveTab('lines')}
        >
          Righe ordine
        </button>
        <button
          className={`tab-item ${activeTab === 'email' ? 'active' : ''}`}
          onClick={() => setActiveTab('email')}
        >
          Email originale
        </button>
        <button
          className={`tab-item ${activeTab === 'revisions' ? 'active' : ''}`}
          onClick={() => setActiveTab('revisions')}
        >
          Richieste revisione
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {/* TAB: Righe Ordine */}
        {activeTab === 'lines' && (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Codice</th>
                  <th>Articolo</th>
                  <th>U.M.</th>
                  <th>Quantità</th>
                  <th>Prezzo Unit.</th>
                  <th>Prezzo Totale</th>
                  <th>Score AI</th>
                  <th>Stato</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {order.lines.map(line => {
                  const lineCheck = formalChecks.lineChecks.find(lc => lc.lineId === line.id);
                  return (
                  <tr key={line.id} className={`${!lineCheck?.passed ? 'row-error' : ''} ${line.configStatus === 'custom' ? 'row-config' : ''}`}>
                    <td>{line.lineNumber}</td>
                    <td className="font-mono">
                      {line.articleStatus === 'not_found' ? (
                        <span className="code-not-found">{line.productId}</span>
                      ) : (!line.productId || line.productId.trim() === '') ? (
                        <span className="code-not-found">—</span>
                      ) : line.productId}
                    </td>
                    <td>
                      <div className="article-cell">
                        <span>{line.productName}</span>
                        {(line.articleStatus === 'not_found' || !line.productId || line.productId.trim() === '') && (
                          <button className="btn-article-search" onClick={() => openArticleSearch(line)} title="Cerca articolo in anagrafica">
                            <MagnifyingGlass size={14} /> Cerca
                          </button>
                        )}
                        {line.configStatus === 'custom' && (
                          <span className="badge-config-custom" title="Richiede configurazione personalizzata">
                            <Gear size={12} /> Config. richiesta
                          </span>
                        )}
                        {line.configStatus === 'standard' && (
                          <span className="badge-config-standard" title="Configurazione standard applicata">
                            <CheckCircle size={12} /> Config. standard
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      {editingLine === line.id ? (
                        <input
                          type="text"
                          className="inline-edit inline-edit-sm"
                          value={editValues.um}
                          onChange={e => setEditValues({ ...editValues, um: e.target.value })}
                          placeholder="PZ"
                        />
                      ) : (
                        <span className={!line.um || line.um.trim() === '' ? 'text-error' : ''}>
                          {line.um || '—'}
                        </span>
                      )}
                    </td>
                    <td>
                      {editingLine === line.id ? (
                        <input
                          type="number"
                          className="inline-edit"
                          value={editValues.quantity}
                          onChange={e => setEditValues({ ...editValues, quantity: e.target.value })}
                          min="0"
                        />
                      ) : (
                        <span className={!line.quantity || line.quantity <= 0 ? 'text-error' : ''}>
                          {line.quantity || '0'}
                        </span>
                      )}
                    </td>
                    <td>
                      {editingLine === line.id ? (
                        <input
                          type="number"
                          className="inline-edit"
                          value={editValues.unitPrice}
                          onChange={e => setEditValues({ ...editValues, unitPrice: e.target.value })}
                          step="0.01"
                          min="0"
                        />
                      ) : (
                        <span className={line.priceMismatch ? 'text-error' : ''}>
                          € {(line.unitPrice || 0).toFixed(2)}
                        </span>
                      )}
                    </td>
                    <td className="text-right">
                      € {editingLine === line.id
                        ? (editValues.quantity * editValues.unitPrice).toFixed(2)
                        : (line.totalPrice || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                    </td>
                    <td><ScoreBadge score={line.scoreAI} /></td>
                    <td>
                      {lineCheck && !lineCheck.passed ? (
                        <div className="line-checks-errors">
                          {lineCheck.checks.map((c, idx) => (
                            <span key={idx} className={`line-status-badge ${c.fixable ? 'line-status-error' : 'line-status-config'} ${c.id === 7 ? 'line-status-dismissable' : ''}`}>
                              {c.label}
                              {c.id === 7 && (
                                <button className="btn-dismiss-check" onClick={() => dismissNeverOrdered(line)} title="Approva: conferma articolo corretto">
                                  <CheckCircle size={14} weight="bold" />
                                </button>
                              )}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="line-status-badge line-status-ok">OK</span>
                      )}
                    </td>
                    <td>
                      <div className="action-buttons">
                        {editingLine === line.id ? (
                          <>
                            <button className="btn-icon btn-icon-success" onClick={() => handleSaveLine(line)} title="Salva">
                              <FloppyDisk size={16} />
                            </button>
                            <button className="btn-icon btn-icon-danger" onClick={handleCancelEdit} title="Annulla">
                              <X size={16} />
                            </button>
                          </>
                        ) : (
                          <>
                            {order.status !== 'inviato_d365' && (
                              <button className="btn-icon" onClick={() => handleEditLine(line)} title="Modifica quantità, prezzo, UdM">
                                <PencilSimple size={16} />
                              </button>
                            )}
                            {(line.articleStatus === 'not_found' || !line.productId || line.productId.trim() === '') && (
                              <>
                                <button className="btn-icon" onClick={() => openArticleSearch(line)} title="Cerca articolo">
                                  <MagnifyingGlass size={16} />
                                </button>
                                <button className="btn-icon btn-icon-warning" onClick={() => openCorrectionForArticle(line)} title="Chiedi chiarimenti">
                                  <EnvelopeSimple size={16} />
                                </button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB: Email Originale */}
        {activeTab === 'email' && (
          <div className="email-card">
            {order.email ? (
            <>
            <div className="email-header-info">
              <div className="email-meta-row">
                <span className="email-meta-label">Da:</span>
                <span className="email-meta-value">{order.email.from}</span>
              </div>
              <div className="email-meta-row">
                <span className="email-meta-label">A:</span>
                <span className="email-meta-value">{order.email.to}</span>
              </div>
              <div className="email-meta-row">
                <span className="email-meta-label">Oggetto:</span>
                <span className="email-meta-value email-subject">{order.email.subject}</span>
              </div>
              <div className="email-meta-row">
                <span className="email-meta-label">Data:</span>
                <span className="email-meta-value">{order.email?.date ? new Date(order.email.date).toLocaleString('it-IT') : '-'}</span>
              </div>
            </div>
            <div className="email-body">
              <pre>{order.email.body}</pre>
            </div>
            {(order.email?.attachments || []).length > 0 && (
              <div className="email-attachments">
                <div className="attachments-header">
                  <Paperclip size={16} />
                  <span>{order.email.attachments.length} allegat{order.email.attachments.length === 1 ? 'o' : 'i'}</span>
                </div>
                <div className="attachments-list">
                  {order.email.attachments.map(att => (
                    <div key={att.id} className="attachment-item">
                      <div className="attachment-icon">
                        {att.type === 'pdf' ? <FilePdf size={24} weight="fill" /> : <Image size={24} weight="fill" />}
                      </div>
                      <div className="attachment-info">
                        <span className="attachment-name">{att.name}</span>
                        <span className="attachment-size">{att.size}</span>
                      </div>
                      <button className="btn btn-sm btn-secondary">Apri</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            </>
            ) : (
              <p className="text-muted">Nessuna email disponibile per questo ordine.</p>
            )}
          </div>
        )}

        {/* TAB: Richieste Revisione */}
        {activeTab === 'revisions' && (
          <div className="revisions-tab">
            {order.status !== 'inviato_d365' && (
              <div className="revisions-action-bar">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowCorrectionModal(true)}
                >
                  <EnvelopeSimple size={18} /> Nuova richiesta di revisione
                </button>
              </div>
            )}

            {order.correctionRequests && order.correctionRequests.length > 0 ? (
              <div className="revisions-list">
                {[...order.correctionRequests].reverse().map((req, index) => (
                  <div key={req.id} className="revision-card">
                    <div className="revision-header">
                      <div className="revision-channel">
                        {req.channel === 'whatsapp'
                          ? <><WhatsappLogo size={18} weight="fill" /> WhatsApp</>
                          : <><EnvelopeSimple size={18} weight="fill" /> Email</>}
                      </div>
                      <span className="revision-date">
                        {new Date(req.date).toLocaleString('it-IT')}
                      </span>
                    </div>
                    <div className="revision-recipient">
                      <span className="revision-label">Inviata a:</span>
                      <span>{order.agent?.name || '-'} ({order.emailFrom || ''})</span>
                    </div>
                    <div className="revision-message">
                      <p>{req.message}</p>
                    </div>
                    <div className="revision-status">
                      <StatusBadge status="richiesta_correzione" />
                      <span>
                        {index === 0
                          ? 'In attesa di risposta dall\'agente'
                          : 'Richiesta precedente'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <EnvelopeSimple size={48} weight="light" />
                <p>Nessuna richiesta di revisione inviata per questo ordine.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Correction Modal */}
      {showCorrectionModal && (
        <div className="modal-overlay" onClick={() => setShowCorrectionModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Richiedi Correzione all'Agente</h3>
              <button className="btn-icon" onClick={() => setShowCorrectionModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Canale di comunicazione</label>
                <div className="channel-selector">
                  <button
                    className={`channel-btn ${correctionChannel === 'email' ? 'active' : ''}`}
                    onClick={() => setCorrectionChannel('email')}
                  >
                    <EnvelopeSimple size={20} /> Email
                  </button>
                  <button
                    className={`channel-btn ${correctionChannel === 'whatsapp' ? 'active' : ''}`}
                    onClick={() => setCorrectionChannel('whatsapp')}
                  >
                    <WhatsappLogo size={20} /> WhatsApp
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label>Messaggio per l'agente ({order.agent.name})</label>
                <textarea
                  rows={6}
                  value={correctionMessage}
                  onChange={e => setCorrectionMessage(e.target.value)}
                  placeholder="Descrivi le correzioni necessarie..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCorrectionModal(false)}>
                Annulla
              </button>
              <button className="btn btn-primary" onClick={handleSendCorrection} disabled={!correctionMessage.trim()}>
                <PaperPlaneTilt size={16} /> Invia Richiesta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Article Search Modal */}
      {showArticleSearchModal && articleSearchLine && (
        <div className="modal-overlay" onClick={() => setShowArticleSearchModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Cerca Articolo in Anagrafica</h3>
              <button className="btn-icon" onClick={() => setShowArticleSearchModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="article-search-info">
                <p>Riga {articleSearchLine.lineNumber}: <strong>"{articleSearchLine.originalText || articleSearchLine.productName}"</strong> (cod. {articleSearchLine.productId})</p>
              </div>
              <div className="search-box" style={{ marginBottom: 12 }}>
                <MagnifyingGlass size={18} />
                <input
                  type="text"
                  placeholder="Cerca per codice o descrizione..."
                  value={articleSearchQuery}
                  onChange={e => setArticleSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="article-search-results">
                {articleSearchLine.suggestedProducts && articleSearchLine.suggestedProducts.length > 0 && !articleSearchQuery && (
                  <div className="article-search-section-label">Corrispondenze suggerite</div>
                )}
                <table className="data-table data-table-compact">
                  <thead>
                    <tr>
                      <th>Codice</th>
                      <th>Descrizione</th>
                      <th>Prezzo</th>
                      <th>Config.</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredProducts().map((p, idx) => {
                      const isSuggested = !articleSearchQuery && articleSearchLine.suggestedProducts?.some(s => s.id === p.id);
                      return (
                        <tr key={p.id} className={isSuggested ? 'row-suggested' : ''}>
                          <td className="font-mono">{p.id}</td>
                          <td>{p.name}</td>
                          <td>€ {p.price.toFixed(2)}</td>
                          <td>
                            {p.hasConfig === 'custom' && <span className="badge-config-custom-sm">Personalizzato</span>}
                            {p.hasConfig === 'standard' && <span className="badge-config-standard-sm">Standard</span>}
                            {!p.hasConfig && <span className="badge-config-none-sm">Nessuna</span>}
                          </td>
                          <td>
                            <button className="btn btn-primary btn-sm" onClick={() => assignProduct(articleSearchLine, p)}>
                              Assegna
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setShowArticleSearchModal(false); openCorrectionForArticle(articleSearchLine); }}>
                <EnvelopeSimple size={16} /> Chiedi all'agente
              </button>
              <button className="btn btn-secondary" onClick={() => setShowArticleSearchModal(false)}>
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Not Found Modal */}
      {showCustomerModal && order.customerStatus === 'not_found' && (
        <div className="modal-overlay" onClick={() => setShowCustomerModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Cliente non trovato in anagrafica</h3>
              <button className="btn-icon" onClick={() => setShowCustomerModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="customer-missing-info">
                <p>Il cliente <strong>"{order.customer.name}"</strong> non corrisponde a nessun record in anagrafica.</p>
                <div className="customer-data-summary">
                  <div className="customer-data-row">
                    <span className="customer-data-label">Ragione Sociale:</span>
                    <span className="customer-data-value">{order.customer.name || <em>—</em>}</span>
                  </div>
                  <div className="customer-data-row">
                    <span className="customer-data-label">Partita IVA:</span>
                    <span className="customer-data-value">{order.customer.vatNumber || <em className="text-muted">mancante</em>}</span>
                  </div>
                  <div className="customer-data-row">
                    <span className="customer-data-label">Indirizzo:</span>
                    <span className="customer-data-value">{order.customer.address ? `${order.customer.address}, ${order.customer.city || ''}` : <em className="text-muted">mancante</em>}</span>
                  </div>
                </div>
              </div>

              {order.customerSuggestions && order.customerSuggestions.length > 0 && (
                <div className="customer-suggestions-section">
                  <h4>Clienti esistenti che potrebbero corrispondere</h4>
                  <div className="customer-suggestions-list">
                    {order.customerSuggestions.map(s => (
                      <div key={s.id} className="customer-suggestion-item">
                        <div className="customer-suggestion-info">
                          <span className="customer-suggestion-name">{s.name}</span>
                          <span className="customer-suggestion-location">{s.city} ({s.province})</span>
                        </div>
                        <button className="btn btn-primary btn-sm" onClick={() => assignCustomer(s)}>
                          Seleziona
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setShowCustomerModal(false); openCorrectionForCustomer(); }}>
                <EnvelopeSimple size={16} /> Chiedi chiarimenti all'agente
              </button>
              <button className="btn btn-secondary" onClick={() => setShowCustomerModal(false)}>
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
