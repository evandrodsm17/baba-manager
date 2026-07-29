import {
  CalendarDays,
  Database,
  MapPinned,
  ReceiptText,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Trophy,
  UsersRound,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { DangerConfirmModal } from '../components/DangerConfirmModal';
import { Badge, Button, PageHeader } from '../components/UI';
import { useApp } from '../context/AppContext';

export function Settings() {
  const { data, currentUser, clearOrganizationData } = useApp();
  const [cleanupOpen, setCleanupOpen] = useState(false);
  const orgId = currentUser?.organizationId;
  const organization = data.organizations.find((item) => item.id === orgId);

  const counts = useMemo(() => ({
    teams: data.teams.filter((item) => item.organizationId === orgId).length,
    players: data.players.filter((item) => item.organizationId === orgId).length,
    venues: data.venues.filter((item) => item.organizationId === orgId).length,
    leagues: data.leagues.filter((item) => item.organizationId === orgId).length,
    matches: data.matches.filter((item) => item.organizationId === orgId).length,
    checkins: data.checkins.filter((item) => item.organizationId === orgId).length,
    confirmations: data.matchConfirmations.filter((item) => item.organizationId === orgId).length,
    submissions: data.statSubmissions.filter((item) => item.organizationId === orgId).length,
    settings: data.financialSettings.filter((item) => item.organizationId === orgId).length,
    charges: data.financialCharges.filter((item) => item.organizationId === orgId).length,
    statuses: data.financialStatuses.filter((item) => item.organizationId === orgId).length,
    waivers: data.financialWaivers.filter((item) => item.organizationId === orgId).length,
    expenses: data.financialExpenses.filter((item) => item.organizationId === orgId).length,
  }), [data, orgId]);

  const totalRecords = Object.values(counts).reduce((total, count) => total + count, 0);
  const financialRecords = counts.settings + counts.charges + counts.statuses + counts.waivers + counts.expenses;

  return (
    <>
      <PageHeader
        eyebrow="ADMINISTRAÇÃO"
        title="Configurações e dados"
        description="Consulte o volume cadastrado e remova dados de teste com segurança."
      />

      <section className="settings-data-overview">
        <div className="section-header">
          <div><h2>Dados da organização</h2><p>{organization?.name || 'Organização atual'}</p></div>
          <Badge tone="lime">{totalRecords} registro{totalRecords === 1 ? '' : 's'}</Badge>
        </div>
        <div className="settings-data-grid">
          <article><span><ShieldCheck size={20} /></span><div><strong>{counts.teams}</strong><small>Equipes</small></div></article>
          <article><span><UsersRound size={20} /></span><div><strong>{counts.players}</strong><small>Jogadores</small></div></article>
          <article><span><CalendarDays size={20} /></span><div><strong>{counts.matches}</strong><small>Partidas</small></div></article>
          <article><span><Trophy size={20} /></span><div><strong>{counts.leagues}</strong><small>Ligas</small></div></article>
          <article><span><MapPinned size={20} /></span><div><strong>{counts.venues}</strong><small>Locais</small></div></article>
          <article><span><ReceiptText size={20} /></span><div><strong>{financialRecords}</strong><small>Financeiro</small></div></article>
        </div>
      </section>

      <section className="settings-danger-zone">
        <div className="settings-danger-zone__icon"><ShieldAlert size={24} /></div>
        <div>
          <span className="eyebrow">ZONA DE PERIGO</span>
          <h2>Limpar dados da organização</h2>
          <p>Remove equipes, jogadores, partidas, ligas, locais, confirmações, check-ins, estatísticas enviadas e todo o módulo financeiro.</p>
          <div className="settings-danger-zone__kept">
            <Database size={17} />
            <span><strong>Serão preservados:</strong> a organização, seu acesso de gerenciador, outros gerenciadores e o histórico de auditoria.</span>
          </div>
        </div>
        <Button variant="danger" icon={Trash2} onClick={() => setCleanupOpen(true)}>
          {totalRecords === 0 ? 'Verificar resíduos públicos' : 'Limpar todos os dados'}
        </Button>
      </section>

      <DangerConfirmModal
        open={cleanupOpen}
        onClose={() => setCleanupOpen(false)}
        title="Limpar todos os dados?"
        description={totalRecords === 0
          ? `Nenhum registro interno foi encontrado em ${organization?.name || 'sua organização'}, mas a operação verificará e removerá páginas públicas residuais.`
          : `Esta operação removerá ${totalRecords} registros de ${organization?.name || 'sua organização'} e verificará se restou alguma página pública órfã.`}
        confirmationText="LIMPAR TUDO"
        confirmLabel="Limpar organização"
        consequences={[
          `${counts.matches} partida${counts.matches === 1 ? '' : 's'}, ${counts.confirmations} ${counts.confirmations === 1 ? 'confirmação' : 'confirmações'}, ${counts.checkins} check-in${counts.checkins === 1 ? '' : 's'} e ${counts.submissions} envio${counts.submissions === 1 ? '' : 's'} de estatísticas`,
          `${counts.players} jogador${counts.players === 1 ? '' : 'es'} e ${counts.teams} equipe${counts.teams === 1 ? '' : 's'}`,
          `${counts.leagues} liga${counts.leagues === 1 ? '' : 's'} e qualquer página pública residual da organização`,
          `${counts.venues} loca${counts.venues === 1 ? 'l' : 'is'} e ${financialRecords} registro${financialRecords === 1 ? '' : 's'} financeiro${financialRecords === 1 ? '' : 's'}`,
        ]}
        onConfirm={clearOrganizationData}
      />
    </>
  );
}
