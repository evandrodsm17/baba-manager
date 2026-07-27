import { Shell } from './components/Shell';
import { useApp } from './context/AppContext';
import { Activities } from './pages/Activities';
import { CheckinPage } from './pages/Checkin';
import { Dashboard } from './pages/Dashboard';
import { Leagues } from './pages/Leagues';
import { Login } from './pages/Login';
import { Managers } from './pages/Managers';
import { Matches } from './pages/Matches';
import { Players } from './pages/Players';
import { ProductHome } from './pages/ProductHome';
import { PublicLeagues } from './pages/PublicLeagues';
import { Teams } from './pages/Teams';
import { Venues } from './pages/Venues';
import { Logo } from './components/UI';
import { Navigate, useLocation } from './lib/router';

export default function App() {
  const { currentUser, authLoading } = useApp();
  const { pathname } = useLocation();
  const publicLeagueMatch = pathname.match(/^\/liga\/([^/]+)\/?$/);

  if (pathname === '/') return <ProductHome />;
  if (pathname === '/ligas-publicas') return <PublicLeagues />;
  if (publicLeagueMatch) return <PublicLeagues leagueId={decodeURIComponent(publicLeagueMatch[1])} />;

  if (authLoading) {
    return <div className="app-loading"><Logo /><span /><p>Preparando o campo...</p></div>;
  }
  if (pathname === '/login') return currentUser ? <Navigate to="/painel" replace /> : <Login />;
  if (!currentUser) return <Navigate to="/login" replace />;

  return (
    <Shell>
      <AppRoutes role={currentUser.role} />
    </Shell>
  );
}

function AppRoutes({ role }: { role: 'master' | 'manager' | 'player' }) {
  const { pathname } = useLocation();
  if (pathname === '/painel') return <Dashboard />;
  if (pathname === '/partidas' || pathname.startsWith('/partidas/')) return role === 'master' ? <Navigate to="/painel" replace /> : <Matches />;
  if (pathname === '/equipes') return role === 'manager' ? <Teams /> : <Navigate to="/painel" replace />;
  if (pathname === '/jogadores') return role !== 'master' ? <Players /> : <Navigate to="/painel" replace />;
  if (pathname === '/ligas') return role !== 'master' ? <Leagues /> : <Navigate to="/painel" replace />;
  if (pathname === '/locais') return role === 'manager' ? <Venues /> : <Navigate to="/painel" replace />;
  if (pathname === '/check-in') return role === 'player' ? <CheckinPage /> : <Navigate to="/painel" replace />;
  if (pathname === '/gerenciadores') return role === 'master' ? <Managers /> : <Navigate to="/painel" replace />;
  if (pathname === '/atividades') return role === 'master' ? <Activities /> : <Navigate to="/painel" replace />;
  return <Navigate to="/painel" replace />;
}
