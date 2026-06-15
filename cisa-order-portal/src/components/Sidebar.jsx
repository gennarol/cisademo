import { NavLink } from 'react-router-dom';
import {
  House,
  ListChecks,
  SignOut,
  User,
} from '@phosphor-icons/react';
import logo from '../logo.png';

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-logo">
          <img src={logo} alt="CISA" className="brand-logo-img" />
          <span className="brand-sub">Order Control Portal</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
          <House size={20} weight="bold" />
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/orders" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <ListChecks size={20} weight="bold" />
          <span>Ordini</span>
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <User size={20} weight="bold" />
          <span>Operatore</span>
        </div>
        <button className="nav-item logout-btn">
          <SignOut size={20} weight="bold" />
          <span>Esci</span>
        </button>
      </div>
    </aside>
  );
}
