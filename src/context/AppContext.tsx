/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  setDoc,
  where,
  type Query,
} from 'firebase/firestore';
import { demoData, demoUsers } from '../data/demo';
import {
  planEntityDeletion,
  planOrganizationCleanup,
  type DeletableDataKey,
  type DeletionPlan,
} from '../lib/dataDeletion';
import { activateUserAccess, db, isFirebaseConfigured, resolveUserProfile, signInWithGoogle, signOutUser, watchAuth } from '../lib/firebase';
import { deletePublicLeagueSnapshot, syncOrganizationPublicSnapshots, syncPublicLeagueSnapshot } from '../lib/publicLeague';
import { buildFinancialStatus } from '../lib/finance';
import type { AppData, AuditLog, UserProfile, UserRole } from '../types';

type DataKey = keyof AppData;
type DataEntity<K extends DataKey> = AppData[K][number];

interface Toast {
  id: string;
  message: string;
  tone: 'success' | 'error' | 'info';
}

interface AppContextValue {
  data: AppData;
  currentUser: UserProfile | null;
  authLoading: boolean;
  isDemo: boolean;
  toasts: Toast[];
  loginGoogle: () => Promise<void>;
  enterDemo: (role: UserRole) => void;
  switchDemoRole: (role: UserRole) => void;
  switchAccess: (accessId: string) => Promise<void>;
  logout: () => Promise<void>;
  saveEntity: <K extends DataKey>(key: K, entity: DataEntity<K>, auditMessage?: string) => Promise<void>;
  removeEntity: (key: DataKey, id: string, auditMessage?: string) => Promise<void>;
  deleteEntityWithDependencies: (key: DeletableDataKey, id: string, label: string) => Promise<number>;
  clearOrganizationData: () => Promise<number>;
  notify: (message: string, tone?: Toast['tone']) => void;
}

const AppContext = createContext<AppContextValue | null>(null);
const storageKey = 'adminfut-demo-data-v11';

const emptyData: AppData = {
  organizations: [],
  teams: [],
  players: [],
  venues: [],
  leagues: [],
  matches: [],
  checkins: [],
  matchConfirmations: [],
  statSubmissions: [],
  financialSettings: [],
  financialCharges: [],
  financialStatuses: [],
  financialWaivers: [],
  financialExpenses: [],
  managerInvites: [],
  auditLogs: [],
};

function readDemoData() {
  try {
    const saved = localStorage.getItem(storageKey);
    return saved ? (JSON.parse(saved) as AppData) : structuredClone(demoData);
  } catch {
    return structuredClone(demoData);
  }
}

function readDemoRole() {
  const role = sessionStorage.getItem('adminfut-demo-role') as UserRole | null;
  return role && demoUsers[role] ? role : null;
}

function withoutUndefined(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutUndefined);
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .map(([key, entry]) => [key, withoutUndefined(entry)]),
    );
  }
  return value;
}

async function retryOperation(operation: () => Promise<void>, attempts = 3) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await operation();
      return;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => window.setTimeout(resolve, attempt * 250));
      }
    }
  }
  throw lastError;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => isFirebaseConfigured && !readDemoRole() ? emptyData : readDemoData());
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(isFirebaseConfigured && !readDemoRole());
  const [isDemo, setIsDemo] = useState(!isFirebaseConfigured || Boolean(readDemoRole()));
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dataRef = useRef(data);

  const notify = useCallback((message: string, tone: Toast['tone'] = 'success') => {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3500);
  }, []);

  useEffect(() => {
    const demoRole = readDemoRole();
    if (demoRole) {
      setData(readDemoData());
      setCurrentUser(demoUsers[demoRole]);
      setIsDemo(true);
      setAuthLoading(false);
      return;
    }
    if (!isFirebaseConfigured) {
      setAuthLoading(false);
      return;
    }

    return watchAuth(async (firebaseUser) => {
      if (!firebaseUser) {
        setCurrentUser(null);
        setAuthLoading(false);
        return;
      }
      try {
        const profile = await resolveUserProfile(firebaseUser);
        setCurrentUser(profile);
        setIsDemo(false);
      } catch (error) {
        console.error(error);
        setCurrentUser(null);
        const message = error instanceof Error ? error.message : 'Não foi possível carregar seu perfil.';
        notify(message, 'error');
      } finally {
        setAuthLoading(false);
      }
    });
  }, [notify]);

  useEffect(() => {
    if (!db || !currentUser || isDemo) return;

    const firestore = db;
    const organizationId = currentUser.organizationId;
    const standardKeys: DataKey[] = ['teams', 'players', 'venues', 'leagues', 'matches', 'checkins'];
    const financialKeys: DataKey[] = ['financialSettings', 'financialCharges', 'financialStatuses', 'financialWaivers', 'financialExpenses'];
    const unsubscribes: Array<() => void> = [];

    const subscribe = (key: DataKey, source: Query) => {
      unsubscribes.push(onSnapshot(source, (snapshot) => {
        const entries = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
        setData((current) => ({ ...current, [key]: entries }));
      }, (error) => console.error(`Falha ao sincronizar ${key}:`, error)));
    };

    standardKeys.forEach((key) => {
      const source = currentUser.role === 'master'
        ? query(collection(firestore, key))
        : query(collection(firestore, key), where('organizationId', '==', organizationId || '__none__'));
      subscribe(key, source);
    });

    if (currentUser.role === 'master') {
      subscribe('matchConfirmations', query(collection(firestore, 'matchConfirmations')));
    } else if (organizationId) {
      subscribe('matchConfirmations', query(
        collection(firestore, 'matchConfirmations'),
        where('organizationId', '==', organizationId),
      ));
    }

    if (currentUser.role === 'master') {
      financialKeys.forEach((key) => subscribe(key, query(collection(firestore, key))));
    } else if (currentUser.role === 'manager' && organizationId) {
      financialKeys.forEach((key) => subscribe(
        key,
        query(collection(firestore, key), where('organizationId', '==', organizationId)),
      ));
    }

    if (currentUser.role === 'master') {
      subscribe('organizations', query(collection(firestore, 'organizations')));
      subscribe('managerInvites', query(collection(firestore, 'managerInvites')));
      subscribe('auditLogs', query(collection(firestore, 'auditLogs')));
      subscribe('statSubmissions', query(collection(firestore, 'statSubmissions')));
    } else if (organizationId) {
      subscribe('organizations', query(collection(firestore, 'organizations'), where('__name__', '==', organizationId)));
      subscribe('auditLogs', query(collection(firestore, 'auditLogs'), where('organizationId', '==', organizationId)));
      if (currentUser.role === 'manager') {
        subscribe('statSubmissions', query(collection(firestore, 'statSubmissions'), where('organizationId', '==', organizationId)));
      } else if (currentUser.playerId) {
        subscribe('statSubmissions', query(collection(firestore, 'statSubmissions'), where('playerId', '==', currentUser.playerId)));
        subscribe('financialStatuses', query(collection(firestore, 'financialStatuses'), where('playerId', '==', currentUser.playerId)));
      }
    }

    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [currentUser, isDemo]);

  useEffect(() => {
    if (isDemo) localStorage.setItem(storageKey, JSON.stringify(data));
  }, [data, isDemo]);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    if (!currentUser?.organizationId || currentUser.role !== 'manager') return;
    const organizationId = currentUser.organizationId;
    const organizationPlayers = data.players.filter((player) => player.organizationId === organizationId);
    if (!organizationPlayers.length) return;
    const now = new Date();
    const statuses = organizationPlayers.map((player) => (
      buildFinancialStatus(organizationId, player.id, data.financialCharges, now)
    ));
    const currentStatuses = dataRef.current.financialStatuses.filter((status) => status.organizationId === organizationId);
    const sameStatus = statuses.every((status) => {
      const current = currentStatuses.find((item) => item.id === status.id);
      return current
        && current.overdueMonthlyCount === status.overdueMonthlyCount
        && JSON.stringify(current.paidReferenceMonths) === JSON.stringify(status.paidReferenceMonths);
    }) && currentStatuses.length === statuses.length;
    if (sameStatus) return;

    const nextData = {
      ...dataRef.current,
      financialStatuses: [
        ...dataRef.current.financialStatuses.filter((status) => status.organizationId !== organizationId),
        ...statuses,
      ],
    };
    dataRef.current = nextData;
    setData(nextData);
    if (db && !isDemo) {
      void Promise.all(statuses.map((status) => setDoc(
        doc(db!, 'financialStatuses', status.id),
        withoutUndefined(status) as Record<string, unknown>,
      ))).catch((error) => console.error('Falha ao atualizar elegibilidade financeira:', error));
    }
  }, [currentUser, data.players, data.financialCharges, isDemo]);

  const loginGoogle = useCallback(async () => {
    setAuthLoading(true);
    sessionStorage.removeItem('adminfut-demo-role');
    try {
      const credential = await signInWithGoogle();
      const profile = await resolveUserProfile(credential.user);
      setCurrentUser(profile);
      setIsDemo(false);
    } catch (error) {
      setCurrentUser(null);
      await signOutUser().catch(() => undefined);
      const message = error instanceof Error ? error.message : 'Falha ao entrar com Google.';
      notify(message, 'error');
    } finally {
      setAuthLoading(false);
    }
  }, [notify]);

  const enterDemo = useCallback((role: UserRole) => {
    setIsDemo(true);
    setData(readDemoData());
    setCurrentUser(demoUsers[role]);
    sessionStorage.setItem('adminfut-demo-role', role);
  }, []);

  const switchDemoRole = useCallback((role: UserRole) => {
    if (!isDemo) return;
    setCurrentUser(demoUsers[role]);
    sessionStorage.setItem('adminfut-demo-role', role);
    notify(`Visão alterada para ${role === 'master' ? 'Master' : role === 'manager' ? 'Gerenciador' : 'Jogador'}.`, 'info');
  }, [isDemo, notify]);

  const switchAccess = useCallback(async (accessId: string) => {
    if (!currentUser) return;
    const access = currentUser.accesses.find((item) => item.id === accessId);
    if (!access || (
      access.role === currentUser.role
      && access.organizationId === currentUser.organizationId
      && access.playerId === currentUser.playerId
      && access.managerInviteId === currentUser.managerInviteId
    )) return;

    setAuthLoading(true);
    try {
      let nextProfile: UserProfile;
      if (isDemo) {
        nextProfile = {
          id: currentUser.id,
          uid: currentUser.uid,
          name: currentUser.name,
          email: currentUser.email,
          role: access.role,
          accesses: currentUser.accesses,
          active: currentUser.active,
          lastAccess: new Date().toISOString(),
          ...(currentUser.photoUrl ? { photoUrl: currentUser.photoUrl } : {}),
          ...(currentUser.platformRole ? { platformRole: currentUser.platformRole } : {}),
          ...(access.organizationId ? { organizationId: access.organizationId } : {}),
          ...(access.managerInviteId ? { managerInviteId: access.managerInviteId } : {}),
          ...(access.playerId ? { playerId: access.playerId } : {}),
        };
      } else {
        nextProfile = await activateUserAccess(currentUser, access);
        setData(emptyData);
      }
      setCurrentUser(nextProfile);
      notify(`Acesso alterado para ${access.role === 'master' ? 'Master' : access.role === 'manager' ? 'Gerenciador' : 'Jogador'}.`, 'info');
    } catch (error) {
      console.error(error);
      notify(error instanceof Error ? error.message : 'Não foi possível alternar o acesso.', 'error');
    } finally {
      setAuthLoading(false);
    }
  }, [currentUser, isDemo, notify]);

  const logout = useCallback(async () => {
    sessionStorage.removeItem('adminfut-demo-role');
    if (!isDemo) await signOutUser();
    setCurrentUser(null);
    if (!isDemo) setData(emptyData);
  }, [isDemo]);

  const saveEntity = useCallback(async <K extends DataKey>(
    key: K,
    entity: DataEntity<K>,
    auditMessage?: string,
  ) => {
    const currentData = dataRef.current;
    const list = currentData[key] as Array<{ id: string }>;
    const previousEntity = list.find((item) => item.id === entity.id) as { leagueId?: string } | undefined;
    const next = list.some((item) => item.id === entity.id)
      ? list.map((item) => item.id === entity.id ? entity : item)
      : [entity, ...list];
    const nextData = { ...currentData, [key]: next } as AppData;
    dataRef.current = nextData;
    setData(nextData);

    if (db && !isDemo) {
      await setDoc(
        doc(db, key, entity.id),
        withoutUndefined(entity) as Record<string, unknown>,
      );
      if (currentUser?.role === 'manager' && ['leagues', 'matches', 'teams', 'players', 'venues', 'organizations'].includes(key)) {
        const changedEntity = entity as { id: string; organizationId?: string; leagueId?: string };
        const affectedLeagueIds = key === 'leagues'
          ? [changedEntity.id]
          : key === 'matches'
            ? [previousEntity?.leagueId, changedEntity.leagueId].filter((leagueId): leagueId is string => Boolean(leagueId))
            : nextData.leagues
              .filter((league) => (
                league.isPublic
                && league.organizationId === (changedEntity.organizationId || currentUser.organizationId)
              ))
              .map((league) => league.id);
        try {
          await Promise.all([...new Set(affectedLeagueIds)].map((leagueId) => (
            syncPublicLeagueSnapshot(db!, nextData, leagueId)
          )));
        } catch (error) {
          console.error('Falha ao atualizar a página pública da liga:', error);
          notify('Os dados foram salvos, mas a página pública não pôde ser atualizada.', 'error');
        }
      }
    }

    if (auditMessage && currentUser) {
      const audit: AuditLog = {
        id: crypto.randomUUID(),
        actorName: currentUser.name,
        action: auditMessage,
        entity: 'AdminFut',
        createdAt: new Date().toISOString(),
        ...(currentUser.organizationId ? { organizationId: currentUser.organizationId } : {}),
      };
      setData((current) => ({ ...current, auditLogs: [audit, ...current.auditLogs] }));
      if (db && !isDemo) {
        try {
          await setDoc(
            doc(db, 'auditLogs', audit.id),
            withoutUndefined(audit) as Record<string, unknown>,
          );
        } catch (error) {
          console.error('Falha ao registrar auditoria:', error);
        }
      }
    }
  }, [currentUser, isDemo, notify]);

  const removeEntity = useCallback(async (key: DataKey, id: string, auditMessage?: string) => {
    const currentData = dataRef.current;
    const removed = (currentData[key] as Array<{ id: string; organizationId?: string; leagueId?: string }>)
      .find((item) => item.id === id);
    const nextData = {
      ...currentData,
      [key]: (currentData[key] as Array<{ id: string }>).filter((item) => item.id !== id),
    } as AppData;
    dataRef.current = nextData;
    setData(nextData);
    if (db && !isDemo) await deleteDoc(doc(db, key, id));
    if (db && !isDemo && currentUser?.role === 'manager' && removed) {
      if (key === 'leagues') {
        try {
          await deletePublicLeagueSnapshot(db, id);
        } catch (error) {
          console.error('Falha ao remover a página pública da liga:', error);
          notify('A liga foi removida, mas a publicação não pôde ser totalmente apagada. Use a limpeza geral para reconciliar os dados.', 'error');
        }
      }
      const affectedLeagueIds = key === 'leagues'
        ? []
        : key === 'matches' && removed.leagueId
          ? [removed.leagueId]
          : nextData.leagues
            .filter((league) => league.isPublic && league.organizationId === removed.organizationId)
            .map((league) => league.id);
      try {
        await Promise.all([...new Set(affectedLeagueIds)].map((leagueId) => (
          syncPublicLeagueSnapshot(db!, nextData, leagueId)
        )));
      } catch (error) {
        console.error('Falha ao atualizar a página pública da liga:', error);
        notify('O item foi removido, mas a página pública não pôde ser atualizada.', 'error');
      }
    }
    if (auditMessage) notify(auditMessage);
  }, [currentUser, isDemo, notify]);

  const applyDeletionPlan = useCallback(async (plan: DeletionPlan, auditAction: string) => {
    if (!currentUser?.organizationId || currentUser.role !== 'manager') {
      throw new Error('Somente o gerenciador da organização pode excluir estes dados.');
    }

    if (db && !isDemo) {
      if (plan.reconcileOrganizationPublicData) {
        try {
          await retryOperation(() => syncOrganizationPublicSnapshots(
            db!,
            plan.nextData,
            currentUser.organizationId!,
          ));
        } catch (error) {
          console.error('Falha ao reconciliar as páginas públicas antes da exclusão:', error);
          throw new Error('A exclusão foi interrompida porque as páginas públicas não puderam ser limpas. Nenhum dado interno foi removido; tente novamente.');
        }
      }
      await Promise.all([
        ...plan.deletedDocuments.map(({ key, id }) => deleteDoc(doc(db!, key, id))),
        ...plan.updatedDocuments.map(({ key, id, entity }) => setDoc(
          doc(db!, key, id),
          withoutUndefined(entity) as Record<string, unknown>,
        )),
      ]);
    }

    const audit: AuditLog = {
      id: crypto.randomUUID(),
      organizationId: currentUser.organizationId,
      actorName: currentUser.name,
      action: auditAction,
      entity: 'AdminFut',
      createdAt: new Date().toISOString(),
    };
    const finalData = {
      ...plan.nextData,
      auditLogs: [audit, ...plan.nextData.auditLogs],
    };
    dataRef.current = finalData;
    setData(finalData);

    if (db && !isDemo) {
      try {
        await setDoc(doc(db, 'auditLogs', audit.id), audit);
      } catch (error) {
        console.error('Falha ao registrar auditoria da exclusão:', error);
      }
    }

    return plan.removedCount;
  }, [currentUser, isDemo]);

  const deleteEntityWithDependencies = useCallback(async (
    key: DeletableDataKey,
    id: string,
    label: string,
  ) => {
    try {
      if (!currentUser?.organizationId || currentUser.role !== 'manager') {
        throw new Error('Somente o gerenciador pode realizar esta exclusão.');
      }
      const plan = planEntityDeletion(dataRef.current, key, id, currentUser.organizationId);
      const removedCount = await applyDeletionPlan(
        plan,
        `excluiu ${label} e ${Math.max(0, plan.removedCount - 1)} dependência${plan.removedCount - 1 === 1 ? '' : 's'}`,
      );
      notify(`Exclusão concluída: ${removedCount} registro${removedCount === 1 ? '' : 's'} removido${removedCount === 1 ? '' : 's'}.`);
      return removedCount;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível concluir a exclusão.';
      notify(message, 'error');
      throw error;
    }
  }, [applyDeletionPlan, currentUser, notify]);

  const clearOrganizationData = useCallback(async () => {
    try {
      if (!currentUser?.organizationId || currentUser.role !== 'manager') {
        throw new Error('Somente o gerenciador pode limpar os dados da organização.');
      }
      const plan = planOrganizationCleanup(dataRef.current, currentUser.organizationId);
      const removedCount = await applyDeletionPlan(plan, `limpou os dados da organização (${plan.removedCount} registros)`);
      notify(`Organização limpa: ${removedCount} registro${removedCount === 1 ? '' : 's'} removido${removedCount === 1 ? '' : 's'}.`);
      return removedCount;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível limpar a organização.';
      notify(message, 'error');
      throw error;
    }
  }, [applyDeletionPlan, currentUser, notify]);

  const value = useMemo<AppContextValue>(() => ({
    data,
    currentUser,
    authLoading,
    isDemo,
    toasts,
    loginGoogle,
    enterDemo,
    switchDemoRole,
    switchAccess,
    logout,
    saveEntity,
    removeEntity,
    deleteEntityWithDependencies,
    clearOrganizationData,
    notify,
  }), [data, currentUser, authLoading, isDemo, toasts, loginGoogle, enterDemo, switchDemoRole, switchAccess, logout, saveEntity, removeEntity, deleteEntityWithDependencies, clearOrganizationData, notify]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp deve ser usado dentro de AppProvider.');
  return context;
}

export function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}
