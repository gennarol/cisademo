import { ArrowLeft } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';

export default function PageBanner({ title, breadcrumb, backTo, actions }) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backTo === -1 || backTo === 'back') {
      navigate(-1);
    } else {
      navigate(-1);
    }
  };

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
      {actions && <div className="page-banner-actions">{actions}</div>}
    </div>
  );
}
