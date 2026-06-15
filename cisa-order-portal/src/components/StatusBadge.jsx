export default function StatusBadge({ status }) {
  const labels = {
    da_controllare: 'Da Controllare',
    richiesta_correzione: 'Richiesta Correzione',
    richiesta_revisione: 'Richiesta Revisione',
    approvato: 'Approvato',
    inviato_d365: 'Inviato D365',
  };

  return <span className={`status-badge status-${status}`}>{labels[status] || status}</span>;
}
