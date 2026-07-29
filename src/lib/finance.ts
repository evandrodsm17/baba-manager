import type {
  FinancialCharge,
  FinancialRequirement,
  FinancialStatus,
  Match,
  Player,
} from '../types';

export function financialStatusId(organizationId: string, playerId: string) {
  return `${organizationId}-${playerId}`;
}

export function matchReferenceMonth(startsAt: string) {
  const date = new Date(startsAt);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function buildFinancialStatus(
  organizationId: string,
  playerId: string,
  charges: FinancialCharge[],
  now = new Date(),
): FinancialStatus {
  const today = now.toISOString().slice(0, 10);
  const monthlyCharges = charges.filter((charge) => (
    charge.organizationId === organizationId
    && charge.playerId === playerId
    && charge.type === 'monthly'
    && charge.status !== 'cancelled'
  ));
  const paidReferenceMonths = [...new Set(
    monthlyCharges
      .filter((charge) => charge.status === 'paid')
      .map((charge) => charge.referenceMonth),
  )].sort();
  return {
    id: financialStatusId(organizationId, playerId),
    organizationId,
    playerId,
    overdueMonthlyCount: monthlyCharges.filter((charge) => charge.status === 'pending' && charge.dueDate < today).length,
    paidReferenceMonths,
    updatedAt: now.toISOString(),
  };
}

export interface FinancialEligibility {
  required: boolean;
  eligible: boolean;
  waived: boolean;
  reason?: string;
}

export function getFinancialEligibility(
  match: Pick<
    Match,
    'financialRequirement' | 'financialReferenceMonth' | 'financialWaiverPlayerIds' | 'startsAt'
  >,
  player: Player,
  statuses: FinancialStatus[],
): FinancialEligibility {
  const policy: FinancialRequirement = match.financialRequirement || 'none';
  if (policy === 'none' || player.membershipType !== 'subscriber') {
    return { required: false, eligible: true, waived: false };
  }
  if (match.financialWaiverPlayerIds?.includes(player.id)) {
    return { required: true, eligible: true, waived: true };
  }
  const status = statuses.find((item) => item.organizationId === player.organizationId && item.playerId === player.id);
  if (!status) {
    return {
      required: true,
      eligible: false,
      waived: false,
      reason: 'Situação financeira ainda não atualizada',
    };
  }
  if (policy === 'no_overdue') {
    return status.overdueMonthlyCount === 0
      ? { required: true, eligible: true, waived: false }
      : {
        required: true,
        eligible: false,
        waived: false,
        reason: `${status.overdueMonthlyCount} mensalidade${status.overdueMonthlyCount === 1 ? '' : 's'} vencida${status.overdueMonthlyCount === 1 ? '' : 's'}`,
      };
  }
  const referenceMonth = match.financialReferenceMonth || matchReferenceMonth(match.startsAt);
  return status.paidReferenceMonths.includes(referenceMonth)
    ? { required: true, eligible: true, waived: false }
    : {
      required: true,
      eligible: false,
      waived: false,
      reason: `Mensalidade de ${referenceMonth} ainda não paga`,
    };
}

export function financialRequirementLabel(requirement?: FinancialRequirement) {
  if (requirement === 'no_overdue') return 'Sem mensalidade vencida';
  if (requirement === 'match_month_paid') return 'Competência da partida paga';
  return 'Não exigir situação financeira';
}
