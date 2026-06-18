// CheckoutPage is deprecated — checkout now happens via CheckoutModal on the HomePage.
// Redirects any bookmarked /checkout links back to the homepage.
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function CheckoutPage() {
  const navigate = useNavigate();
  useEffect(() => { navigate('/', { replace: true }); }, [navigate]);
  return null;
}
