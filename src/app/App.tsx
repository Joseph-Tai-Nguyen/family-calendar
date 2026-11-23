import { useEffect, useState } from 'react';
import { useStore } from './state/store';
import { checkDueReminders, isUnlocked } from './lib/browser';
import { LockScreen } from './components/LockScreen';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CalendarPage } from './pages/CalendarPage';
import { CyclePage } from './pages/CyclePage';
import { EventsPage } from './pages/EventsPage';
import { TimeBuddyPage } from './pages/TimeBuddyPage';
import { SettingsPage } from './pages/SettingsPage';
import type { TKey } from './i18n';

type Route = 'calendar' | 'cycle' | 'events' | 'time' | 'settings';
const ROUTES: { id: Route; icon: string; label: TKey }[] = [
  { id: 'calendar', icon: '📅', label: 'nav.calendar' },
  { id: 'cycle', icon: '🌸', label: 'nav.cycle' },
  { id: 'events', icon: '🕯️', label: 'nav.events' },
  { id: 'time', icon: '🌏', label: 'nav.time' },
  { id: 'settings', icon: '⚙️', label: 'nav.settings' },
];

function parseRoute(): Route {
  const r = window.location.hash.replace(/^#\/?/, '').split(/[?/]/)[0] as Route;
  return ROUTES.some((x) => x.id === r) ? r : 'calendar';
}

export function App() {
  const { data, t, sync, auth } = useStore();
  const [route, setRoute] = useState<Route>(parseRoute);
  const [unlocked, setUnlocked] = useState(isUnlocked());
  const s = data.settings;

  useEffect(() => {
    const onHash = () => setRoute(parseRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Theme
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = s.theme;
    root.dataset.mode = s.colorMode;
    root.lang = s.language;
  }, [s.theme, s.colorMode, s.language]);

  // In-app reminder notifications
  useEffect(() => {
    checkDueReminders(data);
    const id = setInterval(() => checkDueReminders(data), 60_000);
    return () => clearInterval(id);
  }, [data]);

  if (!unlocked) return <LockScreen onUnlock={() => setUnlocked(true)} />;

  const hideCycle = !s.showCycle;
  const routes = ROUTES.filter((r) => !(hideCycle && r.id === 'cycle'));

  return (
    <div className="app">
      <header className="topbar">
        <h1>
          <span aria-hidden>🌸</span> {s.language === 'vi' ? 'Lịch Gia Đình' : 'Family Calendar'}
        </h1>
        {auth === 'signed_in' && (
          <span className={`sync-pill ${sync.state}`} title={sync.error}>
            {t(`sync.${sync.state}` as const)}
          </span>
        )}
      </header>
      <nav className="sidenav" aria-label="Main">
        {routes.map((r) => (
          <a key={r.id} href={`#/${r.id}`} className={route === r.id ? 'active' : ''} aria-current={route === r.id ? 'page' : undefined}>
            <span className="nav-icon" aria-hidden>
              {r.icon}
            </span>
            <span className="nav-label">{t(r.label)}</span>
          </a>
        ))}
      </nav>
      <main className="content">
        <ErrorBoundary resetKey={route}>
          {route === 'calendar' && <CalendarPage />}
          {route === 'cycle' && <CyclePage />}
          {route === 'events' && <EventsPage />}
          {route === 'time' && <TimeBuddyPage />}
          {route === 'settings' && <SettingsPage />}
        </ErrorBoundary>
      </main>
    </div>
  );
}
