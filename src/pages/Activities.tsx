import { Activity, CalendarDays, Download, Filter, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge, Button, EmptyState, PageHeader } from '../components/UI';
import { useApp } from '../context/AppContext';
import { timeAgo } from '../lib/utils';

export function Activities() {
  const { data } = useApp();
  const [org, setOrg] = useState('all');
  const logs = useMemo(() => data.auditLogs
    .filter((log) => org === 'all' || log.organizationId === org)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)), [data.auditLogs, org]);

  return (
    <>
      <PageHeader eyebrow="AUDITORIA" title="Atividades" description="Acompanhe as ações realizadas pelos gerenciadores." action={<Button variant="secondary" icon={Download}>Exportar relatório</Button>} />
      <div className="toolbar">
        <label className="toolbar__select"><Filter size={16} /><select value={org} onChange={(event) => setOrg(event.target.value)}><option value="all">Todas as organizações</option>{data.organizations.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
        <div className="toolbar__summary"><strong>{logs.length}</strong> eventos registrados</div>
      </div>
      {logs.length ? (
        <section className="panel audit-timeline">
          {logs.map((log, index) => {
            const organization = data.organizations.find((item) => item.id === log.organizationId);
            return (
              <div className="audit-event" key={log.id}>
                <div className="audit-event__line">{index < logs.length - 1 && <i />}</div>
                <span className="audit-event__icon"><Activity size={17} /></span>
                <div className="audit-event__body">
                  <p><strong>{log.actorName}</strong> {log.action}</p>
                  <div><Badge tone="neutral"><ShieldCheck size={12} />{organization?.name || 'Plataforma'}</Badge><span><CalendarDays size={13} />{timeAgo(log.createdAt)}</span></div>
                </div>
                <span className="audit-event__entity">{log.entity}</span>
              </div>
            );
          })}
        </section>
      ) : <EmptyState title="Nenhuma atividade" description="Não existem ações para os filtros selecionados." />}
    </>
  );
}
