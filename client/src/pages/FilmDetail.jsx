import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { getFilm, getFilmSources } from '../api/client.js';
import PlausibilityBadge from '../components/PlausibilityBadge.jsx';
import SourcesPanel from '../components/SourcesPanel.jsx';

function dateKey(d) {
  return new Date(d).toISOString().slice(0, 10);
}

function buildClaimedVsCeilingData(claims) {
  const byDate = new Map();
  for (const claim of claims) {
    const key = dateKey(claim.date);
    if (!byDate.has(key)) byDate.set(key, { date: key });
    const row = byDate.get(key);
    row[claim.claimant] = claim.amount;
    if (claim.plausibility?.score) {
      const ceiling = claim.amount / claim.plausibility.score;
      row.ceiling = Math.max(row.ceiling || 0, ceiling);
    }
  }
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function buildDayWiseCurve(claims) {
  const byDate = new Map();
  for (const claim of claims.filter((c) => !c.isCumulative)) {
    const key = dateKey(claim.date);
    if (!byDate.has(key)) byDate.set(key, { date: key });
    byDate.get(key)[claim.claimant] = claim.amount;
  }
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export default function FilmDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [sources, setSources] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([getFilm(id), getFilmSources(id)])
      .then(([filmData, sourcesData]) => {
        setData(filmData);
        setSources(sourcesData);
      })
      .catch((err) => setError(err.message));
  }, [id]);

  if (error) return <p className="error">{error}</p>;
  if (!data) return <p>Loading...</p>;

  const { film, claims, estimates } = data;
  const claimants = Array.from(new Set(claims.map((c) => c.claimant)));
  const barData = buildClaimedVsCeilingData(claims);
  const curveData = buildDayWiseCurve(claims);
  const barColors = ['#2563eb', '#dc2626', '#16a34a', '#9333ea', '#ea580c'];

  return (
    <div className="film-detail">
      <Link to="/">&larr; All films</Link>
      <h1>{film.title}</h1>
      <p className="muted">
        {film.industry} · released {new Date(film.releaseDate).toLocaleDateString()}
      </p>

      <section>
        <h2>Claimed vs. computed ceiling</h2>
        {barData.length === 0 ? (
          <p className="muted">No claims yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              {claimants.map((claimant, i) => (
                <Bar key={claimant} dataKey={claimant} fill={barColors[i % barColors.length]} />
              ))}
              <Bar dataKey="ceiling" fill="#111827" fillOpacity={0.25} name="computed ceiling" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </section>

      <section>
        <h2>Day-wise collection curve</h2>
        {curveData.length === 0 ? (
          <p className="muted">No day-wise claims yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={curveData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              {claimants.map((claimant, i) => (
                <Line key={claimant} type="monotone" dataKey={claimant} stroke={barColors[i % barColors.length]} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </section>

      <section>
        <h2>Claims</h2>
        <table className="claims-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Claimant</th>
              <th>Scope</th>
              <th>Metric</th>
              <th>Amount</th>
              <th>Plausibility</th>
            </tr>
          </thead>
          <tbody>
            {claims.map((claim) => (
              <tr key={claim._id}>
                <td>{new Date(claim.date).toLocaleDateString()}</td>
                <td>{claim.claimant}</td>
                <td>{claim.scope}</td>
                <td>{claim.metricType}</td>
                <td>
                  {claim.amount.toLocaleString()} {claim.currency}
                </td>
                <td>
                  <PlausibilityBadge plausibility={claim.plausibility} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <SourcesPanel sources={sources} estimates={estimates} />
    </div>
  );
}
