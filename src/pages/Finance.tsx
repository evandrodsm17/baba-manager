import {
  AlertTriangle,
  Banknote,
  CalendarClock,
  Check,
  CircleDollarSign,
  CreditCard,
  FilePlus2,
  Landmark,
  Plus,
  ReceiptText,
  RotateCcw,
  Settings2,
  Trash2,
  TrendingDown,
  TrendingUp,
  UserRoundCheck,
  WalletCards,
  X,
} from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { DangerConfirmModal } from '../components/DangerConfirmModal';
import { Avatar, Badge, Button, EmptyState, Modal, PageHeader } from '../components/UI';
import { createId, useApp } from '../context/AppContext';
import type { FinancialCharge, FinancialExpense, FinancialSettings } from '../types';

type FinanceTab = 'charges' | 'expenses';
type PaymentTarget =
  | { kind: 'charge'; entry: FinancialCharge }
  | { kind: 'expense'; entry: FinancialExpense };

const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function currentReferenceMonth() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(referenceMonth: string) {
  const [year, month] = referenceMonth.split('-').map(Number);
  return `${monthNames[month - 1]} de ${year}`;
}

function currency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function dueDateFor(referenceMonth: string, preferredDay: number) {
  const [year, month] = referenceMonth.split('-').map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return `${referenceMonth}-${String(Math.min(Math.max(preferredDay, 1), lastDay)).padStart(2, '0')}`;
}

function isOverdue(entry: FinancialCharge | FinancialExpense) {
  return entry.status === 'pending' && entry.dueDate < new Date().toISOString().slice(0, 10);
}

function statusBadge(entry: FinancialCharge | FinancialExpense) {
  if (entry.status === 'paid') return <Badge tone="success" dot>Pago</Badge>;
  if (entry.status === 'cancelled') return <Badge tone="neutral">Cancelado</Badge>;
  if (isOverdue(entry)) return <Badge tone="danger" dot>Em atraso</Badge>;
  return <Badge tone="warning" dot>Pendente</Badge>;
}

function methodLabel(method?: FinancialCharge['paymentMethod']) {
  return method === 'pix' ? 'Pix'
    : method === 'cash' ? 'Dinheiro'
      : method === 'transfer' ? 'Transferência'
        : method === 'card' ? 'Cartão'
          : method === 'other' ? 'Outro' : 'Não informado';
}

export function Finance() {
  const { data, currentUser, saveEntity, deleteEntityWithDependencies, notify } = useApp();
  const orgId = currentUser?.organizationId || '';
  const [referenceMonth, setReferenceMonth] = useState(currentReferenceMonth());
  const [tab, setTab] = useState<FinanceTab>('charges');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chargeOpen, setChargeOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<PaymentTarget | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<PaymentTarget | null>(null);
  const [deleteSettingsOpen, setDeleteSettingsOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const settings = data.financialSettings.find((item) => item.organizationId === orgId);
  const players = data.players
    .filter((player) => player.organizationId === orgId)
    .sort((a, b) => a.name.localeCompare(b.name));
  const subscribers = players.filter((player) => player.membershipType === 'subscriber' && player.status === 'active');
  const charges = data.financialCharges
    .filter((entry) => entry.organizationId === orgId && entry.referenceMonth === referenceMonth)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.description.localeCompare(b.description));
  const expenses = data.financialExpenses
    .filter((entry) => entry.organizationId === orgId && entry.referenceMonth === referenceMonth)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.description.localeCompare(b.description));

  const summary = useMemo(() => {
    const activeCharges = charges.filter((entry) => entry.status !== 'cancelled');
    const activeExpenses = expenses.filter((entry) => entry.status !== 'cancelled');
    const expected = activeCharges.reduce((total, entry) => total + entry.amount, 0);
    const received = activeCharges.filter((entry) => entry.status === 'paid').reduce((total, entry) => total + entry.amount, 0);
    const overdue = activeCharges.filter(isOverdue).reduce((total, entry) => total + entry.amount, 0);
    const paidExpenses = activeExpenses.filter((entry) => entry.status === 'paid').reduce((total, entry) => total + entry.amount, 0);
    const expectedExpenses = activeExpenses.reduce((total, entry) => total + entry.amount, 0);
    return { expected, received, overdue, paidExpenses, expectedExpenses, balance: received - paidExpenses };
  }, [charges, expenses]);

  const saveSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const entity: FinancialSettings = {
      id: settings?.id || orgId,
      organizationId: orgId,
      monthlyFee: Number(form.get('monthlyFee')),
      dueDay: Number(form.get('dueDay')),
      enabled: form.get('enabled') === 'on',
      updatedAt: new Date().toISOString(),
    };
    await saveEntity('financialSettings', entity, 'atualizou a configuração financeira');
    notify('Configuração financeira atualizada.');
    setSettingsOpen(false);
  };

  const generateMonthlyCharges = async () => {
    if (!settings?.enabled || settings.monthlyFee <= 0) {
      notify('Configure e ative a mensalidade antes de gerar cobranças.', 'error');
      setSettingsOpen(true);
      return;
    }
    if (!subscribers.length) {
      notify('Nenhum mensalista ativo foi encontrado.', 'error');
      return;
    }
    const missing = subscribers.filter((player) => !data.financialCharges.some((entry) => (
      entry.organizationId === orgId
      && entry.playerId === player.id
      && entry.type === 'monthly'
      && entry.referenceMonth === referenceMonth
      && entry.status !== 'cancelled'
    )));
    if (!missing.length) {
      notify(`As mensalidades de ${monthLabel(referenceMonth)} já foram geradas.`, 'info');
      return;
    }
    setBusy(true);
    try {
      for (const player of missing) {
        const entity: FinancialCharge = {
          id: `monthly-${orgId}-${referenceMonth}-${player.id}`,
          organizationId: orgId,
          playerId: player.id,
          type: 'monthly',
          description: `Mensalidade · ${monthLabel(referenceMonth)}`,
          referenceMonth,
          amount: settings.monthlyFee,
          dueDate: dueDateFor(referenceMonth, settings.dueDay),
          status: 'pending',
          createdAt: new Date().toISOString(),
        };
        await saveEntity('financialCharges', entity);
      }
      notify(`${missing.length} mensalidade${missing.length === 1 ? '' : 's'} gerada${missing.length === 1 ? '' : 's'} sem duplicidades.`);
    } finally {
      setBusy(false);
    }
  };

  const saveCharge = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const playerId = String(form.get('playerId'));
    const type = String(form.get('type')) as FinancialCharge['type'];
    const entity: FinancialCharge = {
      id: createId('charge'),
      organizationId: orgId,
      playerId,
      type,
      description: String(form.get('description')).trim(),
      referenceMonth,
      amount: Number(form.get('amount')),
      dueDate: String(form.get('dueDate')),
      status: 'pending',
      createdAt: new Date().toISOString(),
      notes: String(form.get('notes') || '').trim() || undefined,
    };
    await saveEntity('financialCharges', entity, 'criou uma cobrança financeira');
    notify('Cobrança adicionada.');
    setChargeOpen(false);
  };

  const saveExpense = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const entity: FinancialExpense = {
      id: createId('expense'),
      organizationId: orgId,
      category: String(form.get('category')) as FinancialExpense['category'],
      description: String(form.get('description')).trim(),
      referenceMonth,
      amount: Number(form.get('amount')),
      dueDate: String(form.get('dueDate')),
      status: 'pending',
      createdAt: new Date().toISOString(),
      notes: String(form.get('notes') || '').trim() || undefined,
    };
    await saveEntity('financialExpenses', entity, 'registrou uma despesa');
    notify('Despesa adicionada.');
    setExpenseOpen(false);
  };

  const confirmPayment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!paymentTarget) return;
    const form = new FormData(event.currentTarget);
    const paymentData = {
      status: 'paid' as const,
      paidAt: new Date(`${String(form.get('paidDate'))}T12:00:00`).toISOString(),
      paymentMethod: String(form.get('paymentMethod')) as FinancialCharge['paymentMethod'],
    };
    if (paymentTarget.kind === 'charge') {
      await saveEntity('financialCharges', { ...paymentTarget.entry, ...paymentData }, 'registrou um recebimento');
      notify('Recebimento confirmado.');
    } else {
      await saveEntity('financialExpenses', { ...paymentTarget.entry, ...paymentData }, 'registrou o pagamento de uma despesa');
      notify('Pagamento da despesa confirmado.');
    }
    setPaymentTarget(null);
  };

  const reopenEntry = async (target: PaymentTarget) => {
    const next = { ...target.entry, status: 'pending' as const, paidAt: undefined, paymentMethod: undefined };
    if (target.kind === 'charge') await saveEntity('financialCharges', next as FinancialCharge, 'estornou um recebimento');
    else await saveEntity('financialExpenses', next as FinancialExpense, 'estornou o pagamento de uma despesa');
    notify('Lançamento voltou para pendente.', 'info');
  };

  const cancelEntry = async (target: PaymentTarget) => {
    if (!window.confirm('Cancelar este lançamento financeiro?')) return;
    const next = { ...target.entry, status: 'cancelled' as const, paidAt: undefined, paymentMethod: undefined };
    if (target.kind === 'charge') await saveEntity('financialCharges', next as FinancialCharge, 'cancelou uma cobrança');
    else await saveEntity('financialExpenses', next as FinancialExpense, 'cancelou uma despesa');
    notify('Lançamento cancelado.');
  };

  return (
    <>
      <PageHeader
        eyebrow="GESTÃO FINANCEIRA"
        title="Financeiro"
        description="Controle mensalidades, cobranças avulsas, recebimentos e despesas da organização."
        action={(
          <div className="page-header__actions">
            <Button variant="ghost" icon={Settings2} onClick={() => setSettingsOpen(true)}>Configurar</Button>
            <Button variant="secondary" icon={FilePlus2} onClick={() => setExpenseOpen(true)}>Nova despesa</Button>
            <Button icon={Plus} onClick={() => setChargeOpen(true)}>Nova cobrança</Button>
          </div>
        )}
      />

      <section className="finance-toolbar">
        <label><CalendarClock size={17} /><span>Competência</span><input type="month" value={referenceMonth} onChange={(event) => setReferenceMonth(event.target.value)} /></label>
        <div>
          <span><UserRoundCheck size={17} /><strong>{subscribers.length}</strong> mensalistas ativos</span>
          <Button icon={WalletCards} loading={busy} onClick={generateMonthlyCharges}>Gerar mensalidades</Button>
        </div>
      </section>

      <div className="finance-stat-grid">
        <article><span><CircleDollarSign size={21} /></span><small>PREVISTO</small><strong>{currency(summary.expected)}</strong><p>Total de cobranças do mês</p></article>
        <article className="finance-stat--positive"><span><TrendingUp size={21} /></span><small>RECEBIDO</small><strong>{currency(summary.received)}</strong><p>{charges.filter((entry) => entry.status === 'paid').length} pagamentos confirmados</p></article>
        <article className="finance-stat--warning"><span><AlertTriangle size={21} /></span><small>EM ATRASO</small><strong>{currency(summary.overdue)}</strong><p>{charges.filter(isOverdue).length} cobranças vencidas</p></article>
        <article className="finance-stat--expense"><span><TrendingDown size={21} /></span><small>DESPESAS PAGAS</small><strong>{currency(summary.paidExpenses)}</strong><p>{currency(summary.expectedExpenses)} lançados no mês</p></article>
        <article className={summary.balance >= 0 ? 'finance-stat--balance' : 'finance-stat--negative'}><span><Landmark size={21} /></span><small>SALDO REALIZADO</small><strong>{currency(summary.balance)}</strong><p>Recebimentos menos despesas pagas</p></article>
      </div>

      <div className="finance-tabs">
        <button type="button" className={tab === 'charges' ? 'active' : ''} onClick={() => setTab('charges')}><CreditCard size={17} />Recebimentos <Badge tone="neutral">{charges.length}</Badge></button>
        <button type="button" className={tab === 'expenses' ? 'active' : ''} onClick={() => setTab('expenses')}><ReceiptText size={17} />Despesas <Badge tone="neutral">{expenses.length}</Badge></button>
      </div>

      {tab === 'charges' ? (
        <section className="panel finance-table-panel">
          <div className="section-header"><div><h2>Contas a receber</h2><p>{monthLabel(referenceMonth)}</p></div></div>
          {charges.length ? (
            <div className="finance-list">
              {charges.map((charge) => {
                const player = players.find((item) => item.id === charge.playerId);
                const team = data.teams.find((item) => item.id === player?.teamId);
                return (
                  <article className={charge.status === 'cancelled' ? 'finance-row finance-row--cancelled' : 'finance-row'} key={charge.id}>
                    <Avatar name={player?.name || 'Jogador'} src={player?.photoUrl} size="sm" tone={team?.color} />
                    <div className="finance-row__main"><strong>{player?.name || 'Jogador removido'}</strong><small>{charge.description}</small></div>
                    <div><small>Vencimento</small><strong>{new Date(`${charge.dueDate}T12:00:00`).toLocaleDateString('pt-BR')}</strong></div>
                    <div><small>Valor</small><strong>{currency(charge.amount)}</strong></div>
                    <div>{statusBadge(charge)}{charge.status === 'paid' && <small>{methodLabel(charge.paymentMethod)}</small>}</div>
                    <div className="finance-row__actions">
                      {charge.status === 'pending' && <Button icon={Check} onClick={() => setPaymentTarget({ kind: 'charge', entry: charge })}>Receber</Button>}
                      {charge.status === 'paid' && <button type="button" title="Estornar recebimento" onClick={() => reopenEntry({ kind: 'charge', entry: charge })}><RotateCcw size={17} /></button>}
                      {charge.status !== 'cancelled' && <button type="button" title="Cancelar cobrança" onClick={() => cancelEntry({ kind: 'charge', entry: charge })}><X size={17} /></button>}
                      <button className="danger-action" type="button" title="Excluir cobrança definitivamente" onClick={() => setDeletingEntry({ kind: 'charge', entry: charge })}><Trash2 size={16} /></button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : <EmptyState title="Nenhuma cobrança nesta competência" description="Gere as mensalidades ou crie uma cobrança avulsa." />}
        </section>
      ) : (
        <section className="panel finance-table-panel">
          <div className="section-header"><div><h2>Despesas</h2><p>{monthLabel(referenceMonth)}</p></div></div>
          {expenses.length ? (
            <div className="finance-list">
              {expenses.map((expense) => (
                <article className={expense.status === 'cancelled' ? 'finance-row finance-row--cancelled' : 'finance-row'} key={expense.id}>
                  <span className="finance-expense-icon"><Banknote size={19} /></span>
                  <div className="finance-row__main"><strong>{expense.description}</strong><small>{expense.category === 'venue' ? 'Local' : expense.category === 'referee' ? 'Arbitragem' : expense.category === 'equipment' ? 'Material' : 'Outros'}</small></div>
                  <div><small>Vencimento</small><strong>{new Date(`${expense.dueDate}T12:00:00`).toLocaleDateString('pt-BR')}</strong></div>
                  <div><small>Valor</small><strong>{currency(expense.amount)}</strong></div>
                  <div>{statusBadge(expense)}{expense.status === 'paid' && <small>{methodLabel(expense.paymentMethod)}</small>}</div>
                  <div className="finance-row__actions">
                    {expense.status === 'pending' && <Button icon={Check} onClick={() => setPaymentTarget({ kind: 'expense', entry: expense })}>Pagar</Button>}
                    {expense.status === 'paid' && <button type="button" title="Estornar pagamento" onClick={() => reopenEntry({ kind: 'expense', entry: expense })}><RotateCcw size={17} /></button>}
                    {expense.status !== 'cancelled' && <button type="button" title="Cancelar despesa" onClick={() => cancelEntry({ kind: 'expense', entry: expense })}><X size={17} /></button>}
                    <button className="danger-action" type="button" title="Excluir despesa definitivamente" onClick={() => setDeletingEntry({ kind: 'expense', entry: expense })}><Trash2 size={16} /></button>
                  </div>
                </article>
              ))}
            </div>
          ) : <EmptyState title="Nenhuma despesa nesta competência" description="Registre os custos do local, arbitragem, materiais ou outros gastos." />}
        </section>
      )}

      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Configurar mensalidade" description="Defina o valor padrão usado na geração mensal.">
        <form className="form" onSubmit={saveSettings}>
          <div className="form-row form-row--2">
            <label><span>Valor mensal</span><input name="monthlyFee" type="number" min="0.01" step="0.01" required defaultValue={settings?.monthlyFee || 80} /></label>
            <label><span>Dia do vencimento</span><input name="dueDay" type="number" min="1" max="31" required defaultValue={settings?.dueDay || 10} /></label>
          </div>
          <label className="toggle-field"><input type="checkbox" name="enabled" defaultChecked={settings?.enabled ?? true} /><i /><span><strong>Controle mensal ativo</strong><small>Permite gerar cobranças para jogadores classificados como mensalistas.</small></span></label>
          <div className="form-tip"><WalletCards size={18} /><p><strong>Sem duplicidade</strong><span>Cada mensalista recebe apenas uma cobrança ativa por competência.</span></p></div>
          <div className="form-actions">
            {settings && <Button type="button" variant="danger" icon={Trash2} onClick={() => setDeleteSettingsOpen(true)}>Excluir configuração</Button>}
            <Button type="button" variant="ghost" onClick={() => setSettingsOpen(false)}>Cancelar</Button>
            <Button type="submit" icon={Settings2}>Salvar configuração</Button>
          </div>
        </form>
      </Modal>

      <Modal open={chargeOpen} onClose={() => setChargeOpen(false)} title="Nova cobrança" description={`Competência: ${monthLabel(referenceMonth)}`}>
        <form className="form" onSubmit={saveCharge}>
          <label><span>Jogador</span><select name="playerId" required defaultValue=""><option value="">Selecione</option>{players.map((player) => <option key={player.id} value={player.id}>{player.name} · {player.membershipType === 'subscriber' ? 'Mensalista' : player.membershipType === 'guest' ? 'Convidado' : 'Sem classificação'}</option>)}</select></label>
          <div className="form-row form-row--2">
            <label><span>Tipo</span><select name="type" defaultValue="guest"><option value="guest">Participação de convidado</option><option value="monthly">Mensalidade manual</option><option value="other">Outra cobrança</option></select></label>
            <label><span>Valor</span><input name="amount" type="number" min="0.01" step="0.01" required placeholder="25,00" /></label>
          </div>
          <label><span>Descrição</span><input name="description" required placeholder="Ex.: Participação no baba de sábado" /></label>
          <label><span>Vencimento</span><input name="dueDate" type="date" required defaultValue={dueDateFor(referenceMonth, settings?.dueDay || 10)} /></label>
          <label><span>Observação <small>(opcional)</small></span><textarea name="notes" rows={3} /></label>
          <div className="form-actions"><Button type="button" variant="ghost" onClick={() => setChargeOpen(false)}>Cancelar</Button><Button type="submit" icon={Plus}>Criar cobrança</Button></div>
        </form>
      </Modal>

      <Modal open={expenseOpen} onClose={() => setExpenseOpen(false)} title="Nova despesa" description={`Competência: ${monthLabel(referenceMonth)}`}>
        <form className="form" onSubmit={saveExpense}>
          <div className="form-row form-row--2">
            <label><span>Categoria</span><select name="category" defaultValue="venue"><option value="venue">Local</option><option value="referee">Arbitragem</option><option value="equipment">Material</option><option value="other">Outros</option></select></label>
            <label><span>Valor</span><input name="amount" type="number" min="0.01" step="0.01" required placeholder="240,00" /></label>
          </div>
          <label><span>Descrição</span><input name="description" required placeholder="Ex.: Aluguel da quadra" /></label>
          <label><span>Vencimento</span><input name="dueDate" type="date" required defaultValue={dueDateFor(referenceMonth, 10)} /></label>
          <label><span>Observação <small>(opcional)</small></span><textarea name="notes" rows={3} /></label>
          <div className="form-actions"><Button type="button" variant="ghost" onClick={() => setExpenseOpen(false)}>Cancelar</Button><Button type="submit" icon={TrendingDown}>Adicionar despesa</Button></div>
        </form>
      </Modal>

      <Modal open={Boolean(paymentTarget)} onClose={() => setPaymentTarget(null)} title={paymentTarget?.kind === 'charge' ? 'Confirmar recebimento' : 'Confirmar pagamento'} description={paymentTarget?.entry.description}>
        <form className="form" onSubmit={confirmPayment}>
          <div className="finance-payment-value"><small>Valor do lançamento</small><strong>{currency(paymentTarget?.entry.amount || 0)}</strong></div>
          <div className="form-row form-row--2">
            <label><span>Data</span><input name="paidDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} /></label>
            <label><span>Forma</span><select name="paymentMethod" defaultValue="pix"><option value="pix">Pix</option><option value="cash">Dinheiro</option><option value="transfer">Transferência</option><option value="card">Cartão</option><option value="other">Outro</option></select></label>
          </div>
          <div className="form-actions"><Button type="button" variant="ghost" onClick={() => setPaymentTarget(null)}>Cancelar</Button><Button type="submit" icon={Check}>Confirmar</Button></div>
        </form>
      </Modal>

      <DangerConfirmModal
        open={Boolean(deletingEntry)}
        onClose={() => setDeletingEntry(null)}
        title={`Excluir ${deletingEntry?.kind === 'charge' ? 'cobrança' : 'despesa'}?`}
        description={deletingEntry?.entry.description || 'O lançamento financeiro será removido.'}
        consequences={[
          `O valor de ${currency(deletingEntry?.entry.amount || 0)} deixará de compor os totais financeiros`,
          'O histórico de pagamento, vencimento e observações será apagado',
          'O jogador e os demais registros financeiros não serão afetados',
        ]}
        onConfirm={() => deletingEntry
          ? deleteEntityWithDependencies(
            deletingEntry.kind === 'charge' ? 'financialCharges' : 'financialExpenses',
            deletingEntry.entry.id,
            deletingEntry.kind === 'charge' ? 'uma cobrança' : 'uma despesa',
          )
          : Promise.resolve()}
      />

      <DangerConfirmModal
        open={deleteSettingsOpen}
        onClose={() => setDeleteSettingsOpen(false)}
        title="Excluir configuração financeira?"
        description="A mensalidade padrão e o dia de vencimento configurados serão removidos."
        consequences={[
          'As cobranças e despesas existentes serão preservadas',
          'A geração automática de mensalidades ficará indisponível até uma nova configuração',
        ]}
        onConfirm={async () => {
          if (!settings) return;
          await deleteEntityWithDependencies('financialSettings', settings.id, 'a configuração financeira');
          setSettingsOpen(false);
        }}
      />
    </>
  );
}
