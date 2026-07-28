import {
  Activity,
  CalendarDays,
  ChevronDown,
  CircleUserRound,
  LayoutDashboard,
  LogOut,
  MapPinned,
  Menu,
  WalletCards,
  Search,
  Settings2,
  ShieldCheck,
  Trophy,
  UserCog,
  UserCheck,
  UsersRound,
  X,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useApp } from '../context/AppContext';
import { NavLink, useLocation, useNavigate } from '../lib/router';
import { Avatar, Logo } from './UI';

const navByRole = {
  master: [
    { to: '/painel', label: 'Visão geral', icon: LayoutDashboard },
    { to: '/gerenciadores', label: 'Gerenciadores', icon: UserCog },
    { to: '/atividades', label: 'Atividades', icon: Activity },
  ],
  manager: [
    { to: '/painel', label: 'Visão geral', icon: LayoutDashboard },
    { to: '/partidas', label: 'Partidas', icon: CalendarDays },
    { to: '/equipes', label: 'Equipes', icon: ShieldCheck },
    { to: '/jogadores', label: 'Jogadores', icon: UsersRound },
    { to: '/financeiro', label: 'Financeiro', icon: WalletCards },
    { to: '/ligas', label: 'Ligas', icon: Trophy },
    { to: '/locais', label: 'Locais', icon: MapPinned },
    { to: '/configuracoes', label: 'Configurações', icon: Settings2 },
  ],
  player: [
    { to: '/painel', label: 'Início', icon: LayoutDashboard },
    { to: '/check-in', label: 'Presença', icon: UserCheck },
    { to: '/partidas', label: 'Partidas', icon: CalendarDays },
    { to: '/ligas', label: 'Classificação', icon: Trophy },
    { to: '/jogadores', label: 'Atletas', icon: UsersRound },
  ],
};

export function Shell({ children }: { children: ReactNode }) {
  const { currentUser, data, logout, isDemo, switchAccess, toasts } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  if (!currentUser) return null;
  const navigation = navByRole[currentUser.role];
  const roleLabel = currentUser.role === 'master' ? 'Master' : currentUser.role === 'manager' ? 'Gerenciador' : 'Jogador';
  const organization = data.organizations.find((item) => item.id === currentUser.organizationId);
  const accesses = currentUser.accesses || [];

  const changeAccess = async (accessId: string) => {
    await switchAccess(accessId);
    navigate('/painel');
    setProfileOpen(false);
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar__top">
          <Logo />
          <button className="sidebar__close" type="button" onClick={() => setMobileOpen(false)}>
            <X size={20} />
          </button>
        </div>
        <div className="sidebar__org">
          <span className="sidebar__org-icon"><ShieldCheck size={18} /></span>
          <div>
            <small>{currentUser.role === 'master' ? 'Painel da plataforma' : 'Sua organização'}</small>
            <strong>{currentUser.role === 'master' ? 'BABA Manager' : organization?.name || 'Organização atual'}</strong>
          </div>
          <ChevronDown size={15} />
        </div>
        <nav className="sidebar__nav">
          <span className="sidebar__label">Menu principal</span>
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/painel'}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) => isActive ? 'sidebar__link sidebar__link--active' : 'sidebar__link'}
              >
                <Icon size={19} strokeWidth={1.8} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
        <div className="sidebar__footer">
          <div className="sidebar__help">
            <span>BM</span>
            <strong>Precisa de ajuda?</strong>
            <small>Consulte o guia de uso.</small>
            <button type="button">Abrir central</button>
          </div>
          <button className="sidebar__logout" type="button" onClick={logout}>
            <LogOut size={17} /> Sair da conta
          </button>
        </div>
      </aside>

      {mobileOpen && <button className="sidebar-overlay" type="button" aria-label="Fechar menu" onClick={() => setMobileOpen(false)} />}

      <div className="app-shell__body">
        <header className="topbar">
          <button className="topbar__menu" type="button" onClick={() => setMobileOpen(true)}>
            <Menu size={21} />
          </button>
          <div className="topbar__search">
            <Search size={18} />
            <input placeholder="Buscar equipes, jogadores, partidas..." aria-label="Buscar" />
            <span>⌘ K</span>
          </div>
          <div className="topbar__actions">
            {isDemo && <span className="demo-pill">Modo demonstração</span>}
            <div className="profile-menu">
              <button className="profile-menu__trigger" type="button" onClick={() => setProfileOpen(!profileOpen)}>
                <Avatar name={currentUser.name} src={currentUser.photoUrl} size="sm" />
                <span>
                  <strong>{currentUser.name}</strong>
                  <small>{roleLabel}</small>
                </span>
                <ChevronDown size={15} />
              </button>
              {profileOpen && (
                <div className="profile-menu__dropdown">
                  <div className="profile-menu__identity">
                    <Avatar name={currentUser.name} src={currentUser.photoUrl} />
                    <div><strong>{currentUser.name}</strong><small>{currentUser.email}</small></div>
                  </div>
                  {accesses.length > 1 && (
                    <div className="profile-menu__roles">
                      <small>Alternar acesso</small>
                      {accesses.map((access) => {
                        const isCurrent = access.role === currentUser.role
                          && access.organizationId === currentUser.organizationId
                          && access.playerId === currentUser.playerId
                          && access.managerInviteId === currentUser.managerInviteId;
                        const accessRole = access.role === 'master' ? 'Master' : access.role === 'manager' ? 'Gerenciador' : 'Jogador';
                        const accessContext = access.role === 'master'
                          ? 'Plataforma BABA MANAGER'
                          : access.role === 'manager'
                            ? access.organizationName || `Organização ${access.organizationId?.slice(-6)}`
                            : `${access.organizationName || access.organizationId?.slice(-6)} · ${access.teamName || access.playerName || 'Atleta'}`;
                        return (
                          <button key={access.id} type="button" onClick={() => changeAccess(access.id)} className={isCurrent ? 'active' : ''}>
                          <CircleUserRound size={16} />
                          <span><strong>{accessRole}</strong><small>{accessContext}</small></span>
                        </button>
                        );
                      })}
                    </div>
                  )}
                  <button type="button" className="profile-menu__exit" onClick={logout}><LogOut size={16} />Sair</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="main-content" key={location.pathname}>{children}</main>

        <nav className="bottom-nav">
          {navigation.slice(0, 5).map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/painel'}
                className={({ isActive }) => isActive ? 'active' : ''}
              >
                <Icon size={20} /><span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="toast-stack" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast--${toast.tone}`}>
            <span>{toast.tone === 'success' ? '✓' : toast.tone === 'error' ? '!' : 'i'}</span>
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}
