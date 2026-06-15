import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../logo.png';
import heroBg from '../login hero.png';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    login();
    navigate('/');
  };

  return (
    <div className="login-page">
      <div className="login-hero" style={{ backgroundImage: `url(${heroBg})` }}>
        <div className="login-hero-overlay" />
        <div className="login-hero-content">
          <img src={logo} alt="CISA" className="login-hero-logo" />
          <p className="login-hero-subtitle">ORDER CONTROL PORTAL</p>
          <h1 className="login-hero-title">
            Gestione intelligente<br />
            degli ordini di vendita.
          </h1>
          <p className="login-hero-desc">
            Il portale dove l'AI processa le email degli agenti
            e l'operatore controlla, corregge e approva gli ordini
            — tutto in un'unica piattaforma.
          </p>
        </div>
        <div className="login-hero-footer">
          CISA S.p.A. · Allegion Group
        </div>
      </div>

      <div className="login-form-side">
        <div className="login-form-container">
          <h2 className="login-form-title">Accedi al portale</h2>
          <p className="login-form-subtitle">
            Inserisci le tue credenziali per accedere all'area operativa.
          </p>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="login-field">
              <label className="login-label">EMAIL AZIENDALE</label>
              <input
                type="email"
                className="login-input"
                placeholder="nome.cognome@cisa.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <div className="login-field">
              <label className="login-label">PASSWORD</label>
              <input
                type="password"
                className="login-input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="login-btn">
              ENTRA NEL PORTALE
            </button>
          </form>

          <p className="login-demo-note">
            Demo · Non occorre inserire credenziali reali
          </p>
        </div>
      </div>
    </div>
  );
}
