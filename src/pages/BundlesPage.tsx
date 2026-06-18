// BundlesPage is deprecated — bundles are now shown directly on the HomePage.
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function BundlesPage() {
  const navigate = useNavigate();
  useEffect(() => { navigate('/', { replace: true }); }, [navigate]);
  return null;
}
