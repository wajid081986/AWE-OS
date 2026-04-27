import { Navigate } from 'react-router-dom';
import UserDashboard from '../components/dashboard/UserDashboard';

export default function Dashboard() {
  const token = localStorage.getItem('awe_token');
  if (!token) return <Navigate to="/" replace />;

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a' }}>
      <UserDashboard />
    </div>
  );
}
