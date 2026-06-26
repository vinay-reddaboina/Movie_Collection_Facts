const LABEL_STYLES = {
  impossible: { background: '#fde2e2', color: '#9b1c1c' },
  aggressive: { background: '#fef3c7', color: '#92400e' },
  plausible: { background: '#dcfce7', color: '#166534' },
  conservative: { background: '#e0f2fe', color: '#075985' },
};

export default function PlausibilityBadge({ plausibility }) {
  if (!plausibility) {
    return <span className="badge badge-unknown">no ceiling to compare</span>;
  }
  const style = LABEL_STYLES[plausibility.label] || {};
  return (
    <span className="badge" style={style} title={`${(plausibility.score * 100).toFixed(0)}% of computed ceiling`}>
      {plausibility.label} ({(plausibility.score * 100).toFixed(0)}%)
    </span>
  );
}
