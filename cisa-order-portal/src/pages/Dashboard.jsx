import { useOrders } from '../context/OrdersContext';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardText,
  WarningCircle,
  CheckCircle,
  EnvelopeSimple,
  ArrowsClockwise,
  Clock,
} from '@phosphor-icons/react';
import ScoreBadge from '../components/ScoreBadge';
import PageBanner from '../components/PageBanner';
import { computeFormalChecks } from '../utils/formalChecks';

export default function Dashboard() {
  const { orders } = useOrders();
  const navigate = useNavigate();

  // Status groups
  const pendingOrders = orders.filter(o => o.status === 'da_controllare');
  const revisionOrders = orders.filter(o => o.status === 'richiesta_revisione');
  const approvedOrders = orders.filter(o => o.status === 'approvato');
  const sentOrders = orders.filter(o => o.status === 'inviato_d365');
  const correctionOrders = orders.filter(o => o.status === 'richiesta_correzione');

  // KPI calculations
  const lowScoreOrders = orders.filter(o => o.scoreAI < 50);

  // Delayed orders: pending/revision with > 24h since email received
  const delayThresholdMs = 24 * 60 * 60 * 1000;
  const nowMs = Date.now();
  const delayedOrders = orders.filter(o =>
    (o.status === 'da_controllare' || o.status === 'richiesta_revisione') &&
    (nowMs - new Date(o.receivedAt).getTime()) > delayThresholdMs
  );

  // Status chart data
  const statusColors = {
    da_controllare: '#F59E0B',
    richiesta_correzione: '#EF4444',
    richiesta_revisione: '#3B82F6',
    approvato: '#10B981',
    inviato_d365: '#059669',
  };
  const statusLabels = {
    da_controllare: 'Da controllare',
    richiesta_correzione: 'Correzione',
    richiesta_revisione: 'Revisione',
    approvato: 'Approvati',
    inviato_d365: 'Inviati D365',
  };

  // Score distribution
  const scoreRanges = [
    { label: '0–50%', count: orders.filter(o => o.scoreAI < 50).length, color: '#EF4444' },
    { label: '50–70%', count: orders.filter(o => o.scoreAI >= 50 && o.scoreAI < 70).length, color: '#F59E0B' },
    { label: '70–80%', count: orders.filter(o => o.scoreAI >= 70 && o.scoreAI < 80).length, color: '#3B82F6' },
    { label: '>80%', count: orders.filter(o => o.scoreAI >= 80).length, color: '#10B981' },
  ];
  const maxScoreCount = Math.max(...scoreRanges.map(r => r.count), 1);

  // Weekly orders (last 7 days)
  const weekDays = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayStr = d.toDateString();
    const dayLabel = d.toLocaleDateString('it-IT', { weekday: 'short' });
    const received = orders.filter(o => new Date(o.date).toDateString() === dayStr).length;
    const processed = orders.filter(o =>
      (o.status === 'approvato' || o.status === 'inviato_d365') &&
      new Date(o.date).toDateString() === dayStr
    ).length;
    weekDays.push({ label: dayLabel, received, processed });
  }
  const maxWeekVal = Math.max(...weekDays.map(d => Math.max(d.received, d.processed)), 1);

  // Processing time metrics
  const processedOrders = orders.filter(o => o.status === 'approvato' || o.status === 'inviato_d365');
  const pendingQueue = orders.filter(o => o.status === 'da_controllare' || o.status === 'richiesta_revisione');

  const avgProcessingHours = processedOrders.length > 0
    ? Math.round(processedOrders.reduce((sum, o) => {
        const received = new Date(o.receivedAt).getTime();
        const orderDate = new Date(o.date).getTime();
        return sum + (orderDate - received) / 3600000;
      }, 0) / processedOrders.length)
    : 0;

  const avgQueueHours = pendingQueue.length > 0
    ? Math.round(pendingQueue.reduce((sum, o) => {
        return sum + (Date.now() - new Date(o.receivedAt).getTime()) / 3600000;
      }, 0) / pendingQueue.length)
    : 0;

  const maxQueueHours = pendingQueue.length > 0
    ? Math.round(Math.max(...pendingQueue.map(o => (Date.now() - new Date(o.receivedAt).getTime()) / 3600000)))
    : 0;

  // Agent table data
  const agentStats = {};
  orders.forEach(o => {
    if (!agentStats[o.agent.name]) {
      agentStats[o.agent.name] = {
        name: o.agent.name,
        count: 0,
        totalScore: 0,
        approved: 0,
        corrections: 0,
      };
    }
    const a = agentStats[o.agent.name];
    a.count++;
    a.totalScore += o.scoreAI;
    if (o.status === 'approvato' || o.status === 'inviato_d365') a.approved++;
    if (o.status === 'richiesta_correzione') a.corrections++;
  });
  const agents = Object.values(agentStats)
    .map(a => ({ ...a, avgScore: Math.round(a.totalScore / a.count) }))
    .sort((a, b) => b.count - a.count);

  // Queue lists (10 items each, sorted by date desc)
  const queueDaControllare = pendingOrders
    .sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt))
    .slice(0, 10);
  const queueCorrezione = correctionOrders
    .sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt))
    .slice(0, 10);
  const queueRevisione = revisionOrders
    .sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt))
    .slice(0, 10);

  return (
    <div className="dashboard">
      <PageBanner title="Dashboard" breadcrumb="CISA Order Control Portal" />

      {/* KPI Row */}
      <div className="dash-kpis">
        <div className="kpi-card kpi-highlight" onClick={() => navigate('/orders?status=da_controllare')} style={{ cursor: 'pointer' }}>
          <div className="kpi-icon kpi-icon-warning">
            <ClipboardText size={20} weight="duotone" />
          </div>
          <div className="kpi-body">
            <span className="kpi-value">{pendingOrders.length}</span>
            <span className="kpi-label">Da controllare</span>
          </div>
        </div>
        <div className="kpi-card" onClick={() => navigate('/orders?status=approvato')} style={{ cursor: 'pointer' }}>
          <div className="kpi-icon kpi-icon-success">
            <CheckCircle size={20} weight="duotone" />
          </div>
          <div className="kpi-body">
            <span className="kpi-value">{approvedOrders.length}</span>
            <span className="kpi-label">Approvati</span>
          </div>
        </div>
        <div className="kpi-card" onClick={() => navigate('/orders?status=richiesta_correzione')} style={{ cursor: 'pointer' }}>
          <div className="kpi-icon kpi-icon-danger">
            <EnvelopeSimple size={20} weight="duotone" />
          </div>
          <div className="kpi-body">
            <span className="kpi-value">{correctionOrders.length}</span>
            <span className="kpi-label">Richiesta Correzione</span>
          </div>
        </div>
        <div className="kpi-card" onClick={() => navigate('/orders?status=richiesta_revisione')} style={{ cursor: 'pointer' }}>
          <div className="kpi-icon kpi-icon-info">
            <ArrowsClockwise size={20} weight="duotone" />
          </div>
          <div className="kpi-body">
            <span className="kpi-value">{revisionOrders.length}</span>
            <span className="kpi-label">Revisionati</span>
          </div>
        </div>
        <div className="kpi-card" onClick={() => navigate('/orders?scoreMax=50')} style={{ cursor: 'pointer' }}>
          <div className="kpi-icon kpi-icon-danger">
            <WarningCircle size={20} weight="duotone" />
          </div>
          <div className="kpi-body">
            <span className="kpi-value">{lowScoreOrders.length}</span>
            <span className="kpi-label">Score &lt; 50%</span>
          </div>
        </div>
        <div className="kpi-card" onClick={() => navigate('/orders?delayed=1')} style={{ cursor: 'pointer' }}>
          <div className="kpi-icon kpi-icon-danger">
            <Clock size={20} weight="duotone" />
          </div>
          <div className="kpi-body">
            <span className="kpi-value">{delayedOrders.length}</span>
            <span className="kpi-label">In ritardo (&gt;24h)</span>
          </div>
        </div>
      </div>

      {/* Main Content: Charts + Queue */}
      <div className="dash-main">
        {/* Score Distribution + Weekly Volume */}
        <div className="dash-panel dash-charts-panel">
          {/* Score Distribution */}
          <div className="chart-section">
            <div className="chart-section-header">
              <span className="chart-section-title">Distribuzione Score AI</span>
            </div>
            <div className="score-bars">
              {scoreRanges.map(range => (
                <div key={range.label} className="score-bar-row">
                  <span className="score-bar-label">{range.label}</span>
                  <div className="score-bar-track">
                    <div
                      className="score-bar-fill"
                      style={{
                        width: `${(range.count / maxScoreCount) * 100}%`,
                        background: range.color,
                      }}
                    />
                  </div>
                  <span className="score-bar-count">{range.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Weekly Sparkline */}
          <div className="chart-section">
            <div className="chart-section-header">
              <span className="chart-section-title">Ordini questa settimana</span>
              <div className="chart-legend-inline">
                <span className="chart-legend-dot" style={{ background: 'var(--cisa-red)' }}></span>
                <span>Ricevuti</span>
                <span className="chart-legend-dot" style={{ background: '#10B981' }}></span>
                <span>Processati</span>
              </div>
            </div>
            <div className="week-chart">
              {weekDays.map((day, i) => (
                <div key={i} className="week-chart-col">
                  <div className="week-bars">
                    <div
                      className="week-bar week-bar-received"
                      style={{ height: `${(day.received / maxWeekVal) * 100}%` }}
                      title={`Ricevuti: ${day.received}`}
                    />
                    <div
                      className="week-bar week-bar-processed"
                      style={{ height: `${(day.processed / maxWeekVal) * 100}%` }}
                      title={`Processati: ${day.processed}`}
                    />
                  </div>
                  <span className="week-chart-label">{day.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Processing Time Metrics */}
          <div className="chart-section">
            <div className="chart-section-header">
              <span className="chart-section-title">Tempi di lavorazione</span>
            </div>
            <div className="time-metrics">
              <div className="time-metric">
                <span className="time-metric-value">20min</span>
                <span className="time-metric-label">Tempo medio elaborazione</span>
                <span className="time-metric-sub">dalla ricezione email all'approvazione</span>
              </div>
              <div className="time-metric">
                <span className={`time-metric-value ${avgQueueHours > 24 ? 'time-critical' : ''}`}>30min</span>
                <span className="time-metric-label">Tempo medio in coda</span>
                <span className="time-metric-sub">ordini non ancora lavorati</span>
              </div>
              <div className="time-metric">
                <span className={`time-metric-value ${maxQueueHours > 48 ? 'time-critical' : ''}`}>15min</span>
                <span className="time-metric-label">Attesa massima</span>
                <span className="time-metric-sub">ordine più vecchio in coda</span>
              </div>
            </div>
          </div>
        </div>

        {/* Queue panels */}
        <div className="dash-panel dash-queue-panel">
          {/* Da Controllare */}
          <div className="dash-queue-section">
            <div className="dash-panel-header">
              <span className="dash-panel-title">Da controllare ({pendingOrders.length})</span>
              <button className="btn-link" onClick={() => navigate('/orders?status=da_controllare')}>VEDI TUTTI</button>
            </div>
            <table className="dash-queue-table">
              <thead>
                <tr>
                  <th>N. Ordine</th>
                  <th>Agente</th>
                  <th>Cliente</th>
                  <th>Data</th>
                  <th>Score AI</th>
                  <th>Controlli</th>
                </tr>
              </thead>
              <tbody>
                {queueDaControllare.map(o => {
                  const checks = computeFormalChecks(o);
                  return (
                    <tr key={o.id} onClick={() => navigate(`/orders/${o.id}`)} style={{ cursor: 'pointer' }}>
                      <td className="queue-order-num">{o.orderNumber}</td>
                      <td>{o.agent.name}</td>
                      <td>{o.customer.name}</td>
                      <td>{new Date(o.date).toLocaleDateString('it-IT')}</td>
                      <td><ScoreBadge score={o.scoreAI} /></td>
                      <td>
                        <span className={`formal-checks-badge-sm ${checks.passed ? 'fc-pass' : 'fc-fail'}`}>
                          {checks.passed ? '✓' : `✗ ${checks.failedChecks.length}`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {queueDaControllare.length === 0 && (
              <div className="dash-queue-empty">Nessun ordine da controllare</div>
            )}
          </div>

          {/* Richiesta Correzione */}
          <div className="dash-queue-section">
            <div className="dash-panel-header">
              <span className="dash-panel-title">Richiesta correzione ({correctionOrders.length})</span>
              <button className="btn-link" onClick={() => navigate('/orders?status=richiesta_correzione')}>VEDI TUTTI</button>
            </div>
            <table className="dash-queue-table">
              <thead>
                <tr>
                  <th>N. Ordine</th>
                  <th>Agente</th>
                  <th>Cliente</th>
                  <th>Controlli</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {queueCorrezione.map(o => {
                  const checks = computeFormalChecks(o);
                  return (
                    <tr key={o.id} onClick={() => navigate(`/orders/${o.id}`)} style={{ cursor: 'pointer' }}>
                      <td className="queue-order-num">{o.orderNumber}</td>
                      <td>{o.agent.name}</td>
                      <td>{o.customer.name}</td>
                      <td>
                        <span className={`formal-checks-badge-sm ${checks.passed ? 'fc-pass' : 'fc-fail'}`}>
                          {checks.passed ? '✓' : `✗ ${checks.failedChecks.length}`}
                        </span>
                      </td>
                      <td>{new Date(o.date).toLocaleDateString('it-IT')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {queueCorrezione.length === 0 && (
              <div className="dash-queue-empty">Nessuna richiesta di correzione</div>
            )}
          </div>

          {/* Richiesta Revisione */}
          <div className="dash-queue-section">
            <div className="dash-panel-header">
              <span className="dash-panel-title">Richiesta revisione ({revisionOrders.length})</span>
              <button className="btn-link" onClick={() => navigate('/orders?status=richiesta_revisione')}>VEDI TUTTI</button>
            </div>
            <table className="dash-queue-table">
              <thead>
                <tr>
                  <th>N. Ordine</th>
                  <th>Agente</th>
                  <th>Cliente</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {queueRevisione.map(o => (
                  <tr key={o.id} onClick={() => navigate(`/orders/${o.id}`)} style={{ cursor: 'pointer' }}>
                    <td className="queue-order-num">{o.orderNumber}</td>
                    <td>{o.agent.name}</td>
                    <td>{o.customer.name}</td>
                    <td>{new Date(o.date).toLocaleDateString('it-IT')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {queueRevisione.length === 0 && (
              <div className="dash-queue-empty">Nessuna richiesta di revisione</div>
            )}
          </div>
        </div>
      </div>

      {/* Agents Table */}
      <div className="dash-panel dash-agents-table-panel">
        <div className="dash-panel-header">
          <span className="dash-panel-title">Performance agenti</span>
        </div>
        <table className="dash-agents-table">
          <thead>
            <tr>
              <th>Agente</th>
              <th>Ordini</th>
              <th>Score AI medio</th>
              <th>Approvati</th>
              <th>Correzioni</th>
              <th>Tasso OK</th>
            </tr>
          </thead>
          <tbody>
            {agents.map(agent => (
              <tr key={agent.name} onClick={() => navigate(`/orders?agent=${encodeURIComponent(agent.name)}`)} style={{ cursor: 'pointer' }}>
                <td className="agent-cell-name">{agent.name}</td>
                <td>{agent.count}</td>
                <td>
                  <div className="agent-score-cell">
                    <div className="agent-score-bar">
                      <div
                        className="agent-score-fill"
                        style={{
                          width: `${agent.avgScore}%`,
                          background: agent.avgScore >= 70 ? '#10B981' : agent.avgScore >= 50 ? '#F59E0B' : '#EF4444'
                        }}
                      />
                    </div>
                    <span>{agent.avgScore}%</span>
                  </div>
                </td>
                <td className="cell-success">{agent.approved}</td>
                <td className="cell-danger">{agent.corrections}</td>
                <td className="cell-bold">
                  {agent.count > 0 ? Math.round((agent.approved / agent.count) * 100) : 0}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
