import { Building2, Mail, MoreHorizontal, Plus, Search, ShieldCheck, UserCog, UsersRound } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Avatar, Badge, Button, EmptyState, Modal, PageHeader } from '../components/UI';
import { createId, useApp } from '../context/AppContext';
import { timeAgo } from '../lib/utils';
import type { ManagerInvite, Organization } from '../types';
import { useSearchParams } from '../lib/router';

export function Managers() {
  const { data, saveEntity, notify } = useApp();
  const [searchParams] = useSearchParams();
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const managers = data.managerInvites.filter((manager) => `${manager.name} ${manager.email} ${manager.organizationName}`.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    if (searchParams.get('novo') === '1') setModalOpen(true);
  }, [searchParams]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email')).trim().toLowerCase();
    const organizationId = createId('org');
    const organizationName = String(form.get('organizationName')).trim();
    const invite: ManagerInvite = {
      id: createId('invite'),
      email,
      name: String(form.get('name')).trim(),
      organizationId,
      organizationName,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    const organization: Organization = {
      id: organizationId,
      name: organizationName,
      ownerId: '',
      plan: String(form.get('plan')) as Organization['plan'],
      active: true,
    };
    setSaving(true);
    try {
      await saveEntity('organizations', organization);
      await saveEntity('managerInvites', invite, 'convidou um novo gerenciador');
      notify('Gerenciador criado. O acesso será ativado no primeiro login com Google.');
      setModalOpen(false);
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Não foi possível criar o gerenciador.';
      notify(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleManager = async (manager: ManagerInvite) => {
    const disabled = manager.status === 'disabled';
    await saveEntity('managerInvites', { ...manager, status: disabled ? 'pending' : 'disabled' }, disabled ? 'reativou um gerenciador' : 'desativou um gerenciador');
    notify(disabled ? 'Acesso reativado.' : 'Acesso do gerenciador desativado.');
  };

  return (
    <>
      <PageHeader eyebrow="ADMINISTRAÇÃO MASTER" title="Gerenciadores" description="Crie acessos e monitore as organizações da plataforma." action={<Button icon={Plus} onClick={() => setModalOpen(true)}>Novo gerenciador</Button>} />
      <div className="toolbar">
        <label className="toolbar__search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar nome, e-mail ou organização..." /></label>
        <div className="toolbar__summary"><strong>{managers.length}</strong> gerenciadores</div>
      </div>
      {managers.length ? (
        <div className="panel table-panel">
          <div className="managers-table table-scroll">
            <div className="table-head"><span>Gerenciador</span><span>Organização</span><span>Plano</span><span>Conteúdo</span><span>Último acesso</span><span>Status</span><span /></div>
            {managers.map((manager) => {
              const org = data.organizations.find((item) => item.id === manager.organizationId);
              const teams = data.teams.filter((item) => item.organizationId === manager.organizationId).length;
              const players = data.players.filter((item) => item.organizationId === manager.organizationId).length;
              return (
                <div className="table-row" key={manager.id}>
                  <div className="player-cell"><Avatar name={manager.name} size="sm" /><span><strong>{manager.name}</strong><small>{manager.email}</small></span></div>
                  <div className="org-name"><span><Building2 size={17} /></span><strong>{manager.organizationName}</strong></div>
                  <span><Badge tone={org?.plan === 'pro' ? 'lime' : 'neutral'}>{(org?.plan || 'starter').toUpperCase()}</Badge></span>
                  <span className="content-count"><UsersRound size={14} />{players} <ShieldCheck size={14} />{teams}</span>
                  <span>{timeAgo(manager.lastAccess)}</span>
                  <span><Badge tone={manager.status === 'accepted' ? 'success' : manager.status === 'pending' ? 'warning' : 'danger'} dot>{manager.status === 'accepted' ? 'Ativo' : manager.status === 'pending' ? 'Pendente' : 'Desativado'}</Badge></span>
                  <button className="icon-button" type="button" onClick={() => toggleManager(manager)} title={manager.status === 'disabled' ? 'Reativar' : 'Desativar'}><MoreHorizontal size={18} /></button>
                </div>
              );
            })}
          </div>
        </div>
      ) : <EmptyState title="Nenhum gerenciador encontrado" description="Crie o primeiro acesso de gerenciador da plataforma." action={<Button icon={Plus} onClick={() => setModalOpen(true)}>Criar gerenciador</Button>} />}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Novo gerenciador" description="O usuário entrará com Google usando exatamente o e-mail informado." size="lg">
        <form className="form" onSubmit={submit}>
          <div className="form-row form-row--2">
            <label><span>Nome do gerenciador</span><input name="name" required placeholder="Nome completo" /></label>
            <label><span>E-mail Google</span><input name="email" type="email" required placeholder="gerenciador@gmail.com" /></label>
          </div>
          <div className="form-row form-row--2">
            <label><span>Nome da organização</span><input name="organizationName" required placeholder="Ex.: Arena do Baba" /></label>
            <label><span>Plano inicial</span><select name="plan" defaultValue="starter"><option value="starter">Starter</option><option value="pro">Pro</option></select></label>
          </div>
          <div className="invite-preview">
            <span><Mail size={21} /></span>
            <div><strong>Ativação no primeiro acesso</strong><p>O convite ficará pendente. Quando este e-mail entrar com o Google, o perfil receberá automaticamente o nível Gerenciador e a organização acima.</p></div>
          </div>
          <div className="form-actions"><Button type="button" variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>Cancelar</Button><Button type="submit" icon={UserCog} loading={saving}>Criar acesso</Button></div>
        </form>
      </Modal>
    </>
  );
}
