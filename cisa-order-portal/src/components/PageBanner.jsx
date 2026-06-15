import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, UserCircle, SignOut } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PageBanner({ title, breadcrumb, backTo, actions }) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef(null);

  const handleBack = () => {
    navigate(-1);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    if (showUserMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserMenu]);

  return (
    <div className="page-banner">
      <div className="page-banner-left">
        {backTo && (
          <button className="page-banner-back" onClick={handleBack}>
            <ArrowLeft size={18} weight="bold" />
          </button>
        )}
        <div className="page-banner-text">
          <h1 className="page-banner-title">{title}</h1>
          {breadcrumb && <span className="page-banner-breadcrumb">{breadcrumb}</span>}
        </div>
      </div>
      <div className="page-banner-right">
        {actions && <div className="page-banner-actions">{actions}</div>}
        <div className="user-menu-wrapper" ref={menuRef}>
          <button className="user-menu-btn" onClick={() => setShowUserMenu(!showUserMenu)}>
            <UserCircle size={28} weight="duotone" />
          </button>
          {showUserMenu && (
            <div className="user-menu-dropdown">
              <div className="user-menu-info">
                <span className="user-menu-name">Operatore CISA</span>
                <span className="user-menu-email">operatore@cisa.com</span>
              </div>
              <div className="user-menu-divider" />
              <button className="user-menu-item" onClick={handleLogout}>
                <SignOut size={16} /> Esci
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
