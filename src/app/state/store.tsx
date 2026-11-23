/**
 * App state: local-first (localStorage), synced to the user's Google Sheet
 * through the Worker when signed in. Last-writer-wins on `meta.updatedAt`,
 * with a prompt when both sides changed since the last sync.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { emptyData, mergeDefaults, DEFAULT_SETTINGS, type AppData } from '../../shared/model';
import { fromTables, toTables } from '../../shared/schema';
import { todayISO, type ISODate } from '../../shared/date';
import { localTimeZone } from '../../shared/time/timezones';
import { translate, type Lang, type TKey } from '../i18n';
import { api, ApiError, type MeResponse } from './api';

const DATA_KEY = 'fc:data';
const SYNCED_KEY = 'fc:lastSyncedAt';

export type SyncState = 'local' | 'loading' | 'saving' | 'saved' | 'error' | 'offline';
export type AuthState = 'unknown' | 'unconfigured' | 'signed_out' | 'signed_in';

interface Store {
  data: AppData;
  update: (fn: (draft: AppData) => void) => void;
  replaceData: (data: AppData) => void;
  today: ISODate;
  lang: Lang;
  t: (key: TKey, vars?: Record<string, string | number>) => string;
  auth: AuthState;
  me: MeResponse | null;
  sync: { state: SyncState; error?: string; lastSyncedAt?: string };
  syncNow: () => Promise<void>;
  signIn: () => void;
  signOut: (revoke?: boolean) => Promise<void>;
  setFeedUrl: (url: string | null) => void;
}

const Ctx = createContext<Store | null>(null);

function loadLocal(): AppData {
  const zone = localTimeZone();
  try {
    const raw = localStorage.getItem(DATA_KEY);
    if (!raw) return emptyData(zone);
    const parsed = JSON.parse(raw) as AppData;
    const base = emptyData(zone);
    return {
      ...base,
      ...parsed,
      meta: { ...base.meta, ...parsed.meta },
      settings: mergeDefaults(structuredClone(DEFAULT_SETTINGS), parsed.settings),
      clocks: parsed.clocks?.length ? parsed.clocks : base.clocks,
    };
  } catch {
    return emptyData(zone);
  }
}

function saveLocal(data: AppData) {
  try {
    localStorage.setItem(DATA_KEY, JSON.stringify(data));
  } catch {
    /* quota or private mode */
  }
}

function useToday(): ISODate {
  const [today, setToday] = useState(todayISO());
  useEffect(() => {
    const id = setInterval(() => setToday(todayISO()), 60_000);
    return () => clearInterval(id);
  }, []);
  return today;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(loadLocal);
  const [auth, setAuth] = useState<AuthState>('unknown');
  const [me, setMe] = useState<MeResponse | null>(null);
  const [sync, setSync] = useState<Store['sync']>({ state: 'local', lastSyncedAt: localStorage.getItem(SYNCED_KEY) ?? undefined });
  const today = useToday();
  const dataRef = useRef(data);
  dataRef.current = data;
  const authRef = useRef(auth);
  authRef.current = auth;
  const pushTimer = useRef<ReturnType<typeof setTimeout>>();

  const markSynced = (updatedAt: string) => {
    localStorage.setItem(SYNCED_KEY, updatedAt);
    setSync({ state: 'saved', lastSyncedAt: updatedAt });
  };

  const push = useCallback(async () => {
    if (authRef.current !== 'signed_in') return;
    const snapshot = dataRef.current;
    setSync((s) => ({ ...s, state: 'saving' }));
    try {
      const res = await api.save(toTables(snapshot));
      markSynced(snapshot.meta.updatedAt);
      setMe((m) => (m ? { ...m, spreadsheetUrl: res.spreadsheetUrl } : m));
    } catch (e) {
      handleError(e);
    }
  }, []);

  const handleError = (e: unknown) => {
    if (e instanceof ApiError && e.status === 401) {
      setAuth('signed_out');
      setSync((s) => ({ ...s, state: 'local', error: undefined }));
      return;
    }
    const offline = !navigator.onLine || e instanceof TypeError;
    setSync((s) => ({ ...s, state: offline ? 'offline' : 'error', error: (e as Error).message }));
  };

  const commit = useCallback(
    (next: AppData, schedulePush = true) => {
      saveLocal(next);
      setData(next);
      dataRef.current = next;
      if (schedulePush && authRef.current === 'signed_in') {
        clearTimeout(pushTimer.current);
        pushTimer.current = setTimeout(push, 1500);
      }
    },
    [push],
  );

  const update = useCallback(
    (fn: (draft: AppData) => void) => {
      const draft = structuredClone(dataRef.current);
      fn(draft);
      draft.meta.updatedAt = new Date().toISOString();
      commit(draft);
    },
    [commit],
  );

  const replaceData = useCallback(
    (next: AppData) => {
      const copy = structuredClone(next);
      copy.meta.updatedAt = new Date().toISOString();
      commit(copy);
    },
    [commit],
  );

  /** Pull from the sheet and reconcile with local data. */
  const syncNow = useCallback(async () => {
    if (authRef.current !== 'signed_in') return;
    setSync((s) => ({ ...s, state: 'loading' }));
    try {
      const res = await api.load();
      setMe((m) => (m ? { ...m, spreadsheetUrl: res.spreadsheetUrl } : m));
      const remote = fromTables(res.tables, localTimeZone());
      const local = dataRef.current;
      const last = localStorage.getItem(SYNCED_KEY) ?? '';
      const r = remote.meta.updatedAt;
      const l = local.meta.updatedAt;
      if (!r) {
        if (l) await push();
        else markSynced('');
        return;
      }
      if (!l || r === l) {
        commit(remote, false);
        markSynced(r);
        return;
      }
      const localChanged = l > last;
      const remoteChanged = r > last || !last;
      let useRemote: boolean;
      if (localChanged && remoteChanged) useRemote = window.confirm(translate(local.settings.language, 'sync.conflict'));
      else useRemote = remoteChanged;
      if (useRemote) {
        commit(remote, false);
        markSynced(r);
      } else {
        await push();
      }
    } catch (e) {
      handleError(e);
    }
  }, [commit, push]);

  // Initial auth check
  useEffect(() => {
    api
      .me()
      .then((m) => {
        setMe(m);
        setAuth(!m.configured ? 'unconfigured' : m.user ? 'signed_in' : 'signed_out');
      })
      .catch(() => setAuth('unconfigured'));
  }, []);

  useEffect(() => {
    if (auth === 'signed_in') void syncNow();
  }, [auth, syncNow]);

  // Retry when the connection comes back; flush pending changes when the tab is hidden.
  useEffect(() => {
    const online = () => authRef.current === 'signed_in' && void syncNow();
    const hidden = () => {
      if (document.visibilityState === 'hidden' && pushTimer.current && authRef.current === 'signed_in') {
        clearTimeout(pushTimer.current);
        pushTimer.current = undefined;
        void push();
      }
    };
    window.addEventListener('online', online);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      window.removeEventListener('online', online);
      document.removeEventListener('visibilitychange', hidden);
    };
  }, [syncNow, push]);

  const signIn = useCallback(() => {
    window.location.href = '/auth/login';
  }, []);

  const signOut = useCallback(async (revoke = false) => {
    try {
      await api.logout(revoke);
    } finally {
      setAuth('signed_out');
      setMe((m) => (m ? { ...m, user: null, spreadsheetUrl: null, feedUrl: null } : m));
      setSync({ state: 'local' });
      localStorage.removeItem(SYNCED_KEY);
    }
  }, []);

  const setFeedUrl = useCallback((url: string | null) => setMe((m) => (m ? { ...m, feedUrl: url } : m)), []);

  const lang = data.settings.language;
  const t = useCallback((key: TKey, vars?: Record<string, string | number>) => translate(lang, key, vars), [lang]);

  const value = useMemo<Store>(
    () => ({ data, update, replaceData, today, lang, t, auth, me, sync, syncNow, signIn, signOut, setFeedUrl }),
    [data, update, replaceData, today, lang, t, auth, me, sync, syncNow, signIn, signOut, setFeedUrl],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore outside StoreProvider');
  return s;
}
