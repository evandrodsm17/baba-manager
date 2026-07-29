import {
  ArrowUpRight,
  Check,
  ChevronRight,
  Inbox,
  LoaderCircle,
  X,
  type LucideIcon,
} from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { FaShield } from 'react-icons/fa6';
import { PiSoccerBallFill } from 'react-icons/pi';
import { initials } from '../lib/utils';

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? 'brand--compact' : ''}`} role="img" aria-label="AdminFut">
      <span className="brand__mark" aria-hidden="true">
        <img src="/adminfut-logo.png" alt="" />
      </span>
      {!compact && (
        <span className="brand__wordmark" aria-hidden="true">
          <strong>ADMINFUT</strong>
          <small>FUTEBOL AMADOR</small>
        </span>
      )}
    </div>
  );
}

export function SoccerBallIcon({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span className={`soccer-ball-icon soccer-ball-icon--${size}`} aria-hidden="true">
      <PiSoccerBallFill />
    </span>
  );
}

export function Avatar({
  name,
  src,
  size = 'md',
  tone,
}: {
  name: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  tone?: string;
}) {
  return src ? (
    <img className={`avatar avatar--${size}`} src={src} alt={name} />
  ) : (
    <span className={`avatar avatar--${size}`} style={tone ? { background: tone } : undefined}>
      {initials(name)}
    </span>
  );
}

export function Badge({
  children,
  tone = 'neutral',
  dot = false,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'blue' | 'lime';
  dot?: boolean;
}) {
  return <span className={`badge badge--${tone}`}>{dot && <i />}{children}</span>;
}

export function Button({
  children,
  variant = 'primary',
  icon: Icon,
  loading = false,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: LucideIcon;
  loading?: boolean;
}) {
  return (
    <button className={`button button--${variant}`} {...props} disabled={loading || props.disabled}>
      {loading ? <LoaderCircle className="spin" size={17} /> : Icon && <Icon size={17} />}
      <span>{children}</span>
    </button>
  );
}

export function TeamMark({
  name,
  shortName,
  color,
  badgeUrl,
  size = 'md',
}: {
  name: string;
  shortName: string;
  color: string;
  badgeUrl?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  return badgeUrl ? (
    <img className={`team-logo team-logo--${size}`} src={badgeUrl} alt={`Escudo ${name}`} />
  ) : (
    <span
      className={`team-mark team-mark--${size}`}
      style={{ '--team-color': color } as React.CSSProperties}
      title={name}
      role="img"
      aria-label={`Escudo ${name}`}
    >
      <FaShield aria-hidden="true" />
      <b aria-hidden="true">{shortName.slice(0, 3)}</b>
    </span>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="page-header__action">{action}</div>}
    </header>
  );
}

export function SectionHeader({
  title,
  description,
  linkLabel,
  onLink,
}: {
  title: string;
  description?: string;
  linkLabel?: string;
  onLink?: () => void;
}) {
  return (
    <div className="section-header">
      <div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {linkLabel && (
        <button type="button" onClick={onLink} className="text-link">
          {linkLabel}<ChevronRight size={15} />
        </button>
      )}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  trend,
  tone = 'lime',
}: {
  label: string;
  value: string | number;
  hint: string;
  icon: LucideIcon;
  trend?: string;
  tone?: 'lime' | 'orange' | 'blue' | 'purple';
}) {
  return (
    <article className="stat-card">
      <div className={`stat-card__icon stat-card__icon--${tone}`}><Icon size={20} /></div>
      <div className="stat-card__label">{label}</div>
      <div className="stat-card__value">{value}</div>
      <div className="stat-card__footer">
        <span>{hint}</span>
        {trend && <strong><ArrowUpRight size={13} />{trend}</strong>}
      </div>
    </article>
  );
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={`modal modal--${size}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal__header">
          <div>
            <h2>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Fechar">
            <X size={19} />
          </button>
        </header>
        <div className="modal__body">{children}</div>
      </section>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span><Inbox size={24} /></span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function SuccessSeal() {
  return <span className="success-seal"><Check size={16} /></span>;
}
