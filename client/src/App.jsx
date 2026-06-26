import { Routes, Route, Link } from 'react-router-dom';
import FilmGrid from './pages/FilmGrid.jsx';
import FilmDetail from './pages/FilmDetail.jsx';
import './App.css';

function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="brand">
          Movie Collection Facts
        </Link>
        <span className="muted small">Reported claims vs. computed ceilings, side by side.</span>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<FilmGrid />} />
          <Route path="/films/:id" element={<FilmDetail />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
