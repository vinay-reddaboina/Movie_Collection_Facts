const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function request(path, options) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'content-type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const getFilms = () => request('/api/films');
export const getFilm = (id) => request(`/api/films/${id}`);
export const getFilmSources = (id) => request(`/api/films/${id}/sources`);
