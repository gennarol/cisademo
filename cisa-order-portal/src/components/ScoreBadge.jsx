export default function ScoreBadge({ score }) {
  let className = 'score-badge';
  if (score >= 85) className += ' score-high';
  else if (score >= 70) className += ' score-medium';
  else className += ' score-low';

  return <span className={className}>{score}%</span>;
}
