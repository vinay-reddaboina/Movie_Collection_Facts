// The always-visible transparency guarantee: every figure on the page
// traces back to here - who said it, where it came from, and (for the
// computed ceiling) exactly what assumptions produced it.
export default function SourcesPanel({ sources, estimates }) {
  return (
    <div className="sources-panel">
      <h3>Sources &amp; method</h3>

      <section>
        <h4>Reported claims</h4>
        {sources.length === 0 && <p className="muted">No claims sourced yet.</p>}
        <ul className="source-list">
          {sources.map(({ source, claims }) => (
            <li key={source._id}>
              <div className="source-name">
                {source.url ? (
                  <a href={source.url} target="_blank" rel="noreferrer">
                    {source.name}
                  </a>
                ) : (
                  source.name
                )}
                <span className="muted"> · {source.type.replaceAll('_', ' ')}</span>
              </div>
              <div className="muted small">
                pulled {new Date(source.datePulled).toLocaleDateString()} · {claims.length} claim(s)
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h4>Computed ceiling method</h4>
        {estimates.length === 0 && <p className="muted">No theatre capacity data on file yet.</p>}
        <ul className="estimate-list">
          {estimates.map((e) => (
            <li key={e._id}>
              <span className="muted small">{new Date(e.date).toLocaleDateString()}</span>{' '}
              {e.location?.name || 'rollup'}: {e.method.seatsCounted} seats × {e.method.showsCounted} shows ×
              ₹{e.method.ticketPriceAvg} × {(e.method.occupancyAssumed * 100).toFixed(0)}% occupancy ={' '}
              <strong>{e.ceilingAmount.toLocaleString()}</strong> {e.currency}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
