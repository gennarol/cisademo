import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useOrders } from '../context/OrdersContext';
import { MagnifyingGlass, Funnel } from '@phosphor-icons/react';
import ScoreBadge from '../components/ScoreBadge';
import StatusBadge from '../components/StatusBadge';
import { agents } from '../data/mockData';
import PageBanner from '../components/PageBanner';
import { computeFormalChecks } from '../utils/formalChecks';

export default function OrdersList() {
  const { orders } = useOrders();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Read filters from URL
  const filterAgent = searchParams.get('agent') || '';
  const filterStatus = searchParams.get('status') || '';
  const filterDateFrom = searchParams.get('dateFrom') || '';
  const filterDateTo = searchParams.get('dateTo') || '';
  const searchQuery = searchParams.get('q') || '';
  const filterScoreMax = searchParams.get('scoreMax') || '';
  const filterDelayed = searchParams.get('delayed') === '1';

  const updateFilter = (key, value) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
      return next;
    }, { replace: true });
  };

  const clearFilters = () => {
    setSearchParams({}, { replace: true });
  };

  const filteredOrders = useMemo(() => {
    const delayThresholdMs = 24 * 60 * 60 * 1000;
    const nowMs = Date.now();
    return orders.filter(order => {
      if (filterAgent && order.agent?.id !== parseInt(filterAgent)) return false;
      if (filterStatus && order.status !== filterStatus) return false;
      if (filterDateFrom && order.date < filterDateFrom) return false;
      if (filterDateTo && order.date > filterDateTo) return false;
      if (filterScoreMax && order.scoreAI >= parseInt(filterScoreMax)) return false;
      if (filterDelayed) {
        if (order.status !== 'da_controllare' && order.status !== 'richiesta_revisione') return false;
        if ((nowMs - new Date(order.receivedAt).getTime()) <= delayThresholdMs) return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const customerName = order.customer?.name || (typeof order.customer === 'string' ? order.customer : '');
        const agentName = order.agent?.name || '';
        return (
          (order.orderNumber || '').toLowerCase().includes(q) ||
          customerName.toLowerCase().includes(q) ||
          agentName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [orders, filterAgent, filterStatus, filterDateFrom, filterDateTo, searchQuery, filterScoreMax, filterDelayed]);

  return (
    <div className="orders-list-page">
      <PageBanner title="Ordini di Vendita" breadcrumb="Ordini di Vendita" />

      <div className="filters-bar">
        <div className="search-box">
          <MagnifyingGlass size={18} />
          <input
            type="text"
            placeholder="Cerca ordine, cliente, agente..."
            value={searchQuery}
            onChange={e => updateFilter('q', e.target.value)}
          />
        </div>

        <div className="filters-group">
          <Funnel size={18} />
          <select value={filterAgent} onChange={e => updateFilter('agent', e.target.value)}>
            <option value="">Tutti gli Agenti</option>
            {agents.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>

          <select value={filterStatus} onChange={e => updateFilter('status', e.target.value)}>
            <option value="">Tutti gli Stati</option>
            <option value="da_controllare">Da Controllare</option>
            <option value="richiesta_correzione">Richiesta Correzione</option>
            <option value="richiesta_revisione">Richiesta Revisione</option>
            <option value="approvato">Approvato</option>
            <option value="inviato_d365">Inviato D365</option>
          </select>

          <input
            type="date"
            value={filterDateFrom}
            onChange={e => updateFilter('dateFrom', e.target.value)}
            placeholder="Da data"
          />
          <input
            type="date"
            value={filterDateTo}
            onChange={e => updateFilter('dateTo', e.target.value)}
            placeholder="A data"
          />

          <button className="btn btn-secondary btn-sm" onClick={clearFilters}>
            Pulisci Filtri
          </button>
        </div>
      </div>

      <div className="results-info">
        <span>{filteredOrders.length} ordini trovati</span>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>N. Ordine</th>
              <th>Data</th>
              <th>Cliente</th>
              <th>Agente di Vendita</th>
              <th>Importo</th>
              <th>Score AI</th>
              <th>Controlli</th>
              <th>Stato</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map(order => {
              const checks = computeFormalChecks(order);
              return (
                <tr
                  key={order.id}
                  className="clickable-row"
                  onClick={() => navigate(`/orders/${order.id}`)}
                >
                  <td className="font-mono">{order.orderNumber}</td>
                  <td>{order.date ? new Date(order.date).toLocaleDateString('it-IT') : '-'}</td>
                  <td>{order.customer?.name || (typeof order.customer === 'string' ? order.customer : '-')}</td>
                  <td>{order.agent?.name || '-'}</td>
                  <td className="text-right">€ {(order.totalAmount || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}</td>
                  <td><ScoreBadge score={order.scoreAI} /></td>
                  <td>
                    <span className={`formal-checks-badge-sm ${checks.passed ? 'formal-checks-passed' : 'formal-checks-failed'}`} title={checks.passed ? 'Tutti i controlli superati' : checks.failedChecks.map(c => c.label).join(', ')}>
                      {checks.passed ? '✓' : `✗ ${checks.failedChecks.length}`}
                    </span>
                  </td>
                  <td><StatusBadge status={order.status} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
