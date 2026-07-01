import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const APP_PAGES: Record<string, string> = {
  whatsapp: '/whatsapp',
  telegram: '/telegram',
  instagram: '/instagram',
  sms: '/sms',
  facebook: '/facebook',
  tiktok: '/tiktok',
  google: '/google',
};

export default function IndexPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const plat = params.get('plat');

    if (plat) {
      const key = plat.toLowerCase();
      const path = APP_PAGES[key];
      if (path) {
        navigate(path + (params.get('app') ? `?app=${encodeURIComponent(params.get('app')!)}` : ''), { replace: true });
      } else {
        navigate(`/dashboard?app=${encodeURIComponent(plat)}`, { replace: true });
      }
    } else {
      navigate('/seleccion', { replace: true });
    }
  }, [navigate]);

  return (
    <div style={{ fontFamily: 'monospace', color: '#b300ff', background: '#0a0014', padding: 20, minHeight: '100vh' }}>
      Redirigiendo...
    </div>
  );
}
