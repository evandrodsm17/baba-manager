/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type AnchorHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from 'react';

interface LocationState {
  pathname: string;
  search: string;
}

interface RouterValue {
  location: LocationState;
  navigate: (to: string, options?: { replace?: boolean }) => void;
}

const RouterContext = createContext<RouterValue | null>(null);

function currentLocation(): LocationState {
  return { pathname: window.location.pathname, search: window.location.search };
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState(currentLocation);

  useEffect(() => {
    const update = () => setLocation(currentLocation());
    window.addEventListener('popstate', update);
    return () => window.removeEventListener('popstate', update);
  }, []);

  const navigate = useCallback((to: string, options?: { replace?: boolean }) => {
    if (options?.replace) window.history.replaceState({}, '', to);
    else window.history.pushState({}, '', to);
    setLocation(currentLocation());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const value = useMemo(() => ({ location, navigate }), [location, navigate]);
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useNavigate() {
  const router = useContext(RouterContext);
  if (!router) throw new Error('useNavigate deve ser usado dentro de RouterProvider.');
  return router.navigate;
}

export function useLocation() {
  const router = useContext(RouterContext);
  if (!router) throw new Error('useLocation deve ser usado dentro de RouterProvider.');
  return router.location;
}

export function useSearchParams() {
  const location = useLocation();
  return [useMemo(() => new URLSearchParams(location.search), [location.search])] as const;
}

export function useParams() {
  const { pathname } = useLocation();
  const match = pathname.match(/^\/partidas\/([^/]+)\/?$/);
  return { matchId: match ? decodeURIComponent(match[1]) : undefined };
}

export function Navigate({ to, replace = false }: { to: string; replace?: boolean }) {
  const navigate = useNavigate();
  useEffect(() => navigate(to, { replace }), [navigate, replace, to]);
  return null;
}

export function NavLink({
  to,
  end = false,
  className,
  children,
  ...props
}: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'className'> & {
  to: string;
  end?: boolean;
  className?: string | ((state: { isActive: boolean }) => string);
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = end
    ? location.pathname === to
    : location.pathname === to || location.pathname.startsWith(`${to}/`);
  const resolvedClass = typeof className === 'function' ? className({ isActive }) : className;

  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    props.onClick?.(event);
    if (
      event.defaultPrevented
      || event.button !== 0
      || event.metaKey
      || event.ctrlKey
      || event.shiftKey
      || event.altKey
    ) return;
    event.preventDefault();
    navigate(to);
  };

  return (
    <a
      {...props}
      href={to}
      className={resolvedClass}
      aria-current={isActive ? 'page' : undefined}
      onClick={onClick}
    >
      {children}
    </a>
  );
}
