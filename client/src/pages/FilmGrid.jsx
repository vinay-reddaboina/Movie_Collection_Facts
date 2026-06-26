import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getFilms } from '../api/client.js';

export default function FilmGrid() {
  const [films, setFilms] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFilms()
      .then(setFilms)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading films...</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <div className="film-grid">
      {films.length === 0 && <p className="muted">No films seeded yet.</p>}
      {films.map((film) => (
        <Link key={film._id} to={`/films/${film._id}`} className="film-card">
          <div className="film-poster">
            {film.posterUrl ? <img src={film.posterUrl} alt={film.title} /> : <div className="poster-placeholder" />}
          </div>
          <div className="film-title">{film.title}</div>
          <div className="muted small">
            {film.industry} · {new Date(film.releaseDate).getFullYear()}
          </div>
        </Link>
      ))}
    </div>
  );
}
