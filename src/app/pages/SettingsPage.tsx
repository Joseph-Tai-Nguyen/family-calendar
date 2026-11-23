import { useEffect, useState, type ReactNode } from 'react';
import { todayISO } from '../../shared/date';
import { buildCalendarFile } from '../../shared/ics';
import { emptyData, mergeDefaults, DEFAULT_SETTINGS, type AppData, type Settings } from '../../shared/model';
import { fromTables, toTables } from '../../shared/schema';
import type { LiturgicalRegion } from '../../shared/liturgical/liturgical';
import { localTimeZone } from '../../shared/time/timezones';
import { readXlsx, writeXlsx } from '../lib/xlsx';
import {
  clearPin,
  copyText,
  disableNotifications,
  downloadBlob,
  enableNotifications,
  hasPin,
  notificationsEnabled,
  pickFile,
  setPin,
  showNotification,
} from '../lib/browser';
import { api } from '../state/api';
import { useStore } from '../state/store';
import { Card, Field, Toggle } from '../components/ui';

export function SettingsPage() {
  const { data, update, t, lang } = useStore();
  const s = data.settings;
  const set = (fn: (st: Settings) => void) => update((d) => fn(d.settings));
  const vi = lang === 'vi';

  return (
    <div className="page settings">
      <AccountCard />
      <BackupCard />
      <FeedCard />

      <Card title={t('settings.reminders')}>
        <NotificationRow />
        <Field label={vi ? 'Giờ nhắc mặc định' : 'Default reminder time'}>
          <input type="time" value={s.reminders.time} onChange={(e) => set((st) => void (st.reminders.time = e.target.value))} />
        </Field>
        <Group title={vi ? 'Chu kỳ' : 'Cycle'}>
          <ToggleDays label={vi ? 'Kỳ kinh sắp đến' : 'Upcoming period'} value={s.reminders.period} onChange={(v) => set((st) => void (st.reminders.period = v))} />
          <ToggleDays label={vi ? 'Thời kỳ dễ thụ thai' : 'Fertile window'} value={s.reminders.fertile} onChange={(v) => set((st) => void (st.reminders.fertile = v))} />
          <ToggleDays label={vi ? 'Ngày rụng trứng' : 'Ovulation'} value={s.reminders.ovulation} onChange={(v) => set((st) => void (st.reminders.ovulation = v))} />
          <ToggleTime label={vi ? 'Uống thuốc tránh thai mỗi ngày' : 'Daily pill'} value={s.reminders.pill} onChange={(v) => set((st) => void (st.reminders.pill = v))} />
          <ToggleTime label={vi ? 'Đo nhiệt độ cơ thể (BBT)' : 'Basal body temperature'} value={s.reminders.bbt} onChange={(v) => set((st) => void (st.reminders.bbt = v))} />
        </Group>
        <Group title={vi ? 'Lịch Công giáo' : 'Catholic liturgical calendar'}>
          <ToggleDays label={vi ? 'Nhắc ngày lễ' : 'Remind important days'} value={s.reminders.liturgical} onChange={(v) => set((st) => void Object.assign(st.reminders.liturgical, v))} />
          <div className="filter-row">
            {(
              [
                ['solemnities', vi ? 'Lễ trọng' : 'Solemnities'],
                ['obligations', vi ? 'Lễ buộc' : 'Holy days of obligation'],
                ['fastDays', vi ? 'Ngày chay tịnh' : 'Fast days'],
                ['feasts', vi ? 'Lễ kính' : 'Feasts'],
                ['memorials', vi ? 'Lễ nhớ' : 'Memorials'],
                ['sundays', vi ? 'Chúa Nhật' : 'Sundays'],
              ] as const
            ).map(([k, l]) => (
              <Toggle key={k} checked={s.reminders.liturgical[k]} onChange={(v) => set((st) => void (st.reminders.liturgical[k] = v))} label={l} />
            ))}
          </div>
        </Group>
        <Group title={vi ? 'Âm lịch' : 'Vietnamese lunar calendar'}>
          <ToggleDays label={vi ? 'Nhắc ngày âm lịch' : 'Lunar reminders'} value={s.reminders.lunar} onChange={(v) => set((st) => void Object.assign(st.reminders.lunar, v))} />
          <div className="filter-row">
            <Toggle checked={s.reminders.lunar.holidays} onChange={(v) => set((st) => void (st.reminders.lunar.holidays = v))} label={vi ? 'Lễ Tết truyền thống' : 'Traditional holidays'} />
            <Toggle checked={s.reminders.lunar.catholicTet} onChange={(v) => set((st) => void (st.reminders.lunar.catholicTet = v))} label={vi ? 'Thánh lễ đầu năm' : 'Tết Masses'} />
            <Toggle checked={s.reminders.lunar.mung1} onChange={(v) => set((st) => void (st.reminders.lunar.mung1 = v))} label={vi ? 'Mùng Một' : '1st of each month'} />
            <Toggle checked={s.reminders.lunar.ram} onChange={(v) => set((st) => void (st.reminders.lunar.ram = v))} label={vi ? 'Ngày Rằm' : 'Full moon (15th)'} />
          </div>
        </Group>
        <p className="muted small">
          {vi
            ? 'Ngày giỗ và sự kiện cá nhân có giờ nhắc riêng trong từng sự kiện.'
            : 'Death anniversaries and personal events have their own reminder days and time on each event.'}
        </p>
      </Card>

      <Card title={t('settings.cycle')}>
        <Toggle checked={s.showCycle} onChange={(v) => set((st) => void (st.showCycle = v))} label={vi ? 'Hiện theo dõi chu kỳ' : 'Show cycle tracking'} />
        <Toggle checked={s.cycle.useAverage} onChange={(v) => set((st) => void (st.cycle.useAverage = v))} label={vi ? 'Dự đoán theo trung bình lịch sử' : 'Predict from my history (average)'} />
        <div className="grid3">
          <Field label={vi ? 'Chu kỳ mặc định' : 'Default cycle length'}>
            <input type="number" min={15} max={60} value={s.cycle.defaultCycleLength} onChange={(e) => set((st) => void (st.cycle.defaultCycleLength = clamp(e.target.value, 15, 60, 28)))} />
          </Field>
          <Field label={vi ? 'Số ngày hành kinh' : 'Default period length'}>
            <input type="number" min={1} max={15} value={s.cycle.defaultPeriodLength} onChange={(e) => set((st) => void (st.cycle.defaultPeriodLength = clamp(e.target.value, 1, 15, 5)))} />
          </Field>
          <Field label={vi ? 'Pha hoàng thể' : 'Luteal phase'}>
            <input type="number" min={8} max={18} value={s.cycle.lutealPhase} onChange={(e) => set((st) => void (st.cycle.lutealPhase = clamp(e.target.value, 8, 18, 14)))} />
          </Field>
        </div>
        <Field label={vi ? 'Số chu kỳ gần nhất để tính trung bình' : 'Average over last N cycles'}>
          <input type="number" min={1} max={24} value={s.cycle.averageOver} onChange={(e) => set((st) => void (st.cycle.averageOver = clamp(e.target.value, 1, 24, 6)))} />
        </Field>
        <Toggle checked={s.cycle.showFertile} onChange={(v) => set((st) => void (st.cycle.showFertile = v))} label={vi ? 'Hiện ngày dễ thụ thai' : 'Show fertile window'} />
        <Toggle checked={s.cycle.showOvulation} onChange={(v) => set((st) => void (st.cycle.showOvulation = v))} label={vi ? 'Hiện ngày rụng trứng' : 'Show ovulation day'} />
      </Card>

      <Card title={t('settings.liturgical')}>
        <Field label={vi ? 'Lịch địa phương' : 'Regional calendar'}>
          <select value={s.liturgical.region} onChange={(e) => set((st) => void (st.liturgical.region = e.target.value as LiturgicalRegion))}>
            <option value="CA">Canada</option>
            <option value="US">United States</option>
            <option value="VN">Việt Nam</option>
            <option value="GENERAL">{vi ? 'Lịch chung Rôma' : 'General Roman Calendar'}</option>
          </select>
        </Field>
        <Toggle checked={s.liturgical.epiphanySunday} onChange={(v) => set((st) => void (st.liturgical.epiphanySunday = v))} label={vi ? 'Lễ Hiển Linh vào Chúa Nhật' : 'Epiphany on Sunday'} />
        <Toggle checked={s.liturgical.ascensionSunday} onChange={(v) => set((st) => void (st.liturgical.ascensionSunday = v))} label={vi ? 'Lễ Thăng Thiên vào Chúa Nhật' : 'Ascension on Sunday'} />
        <Toggle checked={s.liturgical.corpusChristiSunday} onChange={(v) => set((st) => void (st.liturgical.corpusChristiSunday = v))} label={vi ? 'Lễ Mình Máu Thánh vào Chúa Nhật' : 'Corpus Christi on Sunday'} />
      </Card>

      <Card title={t('settings.display')}>
        <div className="grid2">
          <Field label={t('settings.language')}>
            <select value={s.language} onChange={(e) => set((st) => void (st.language = e.target.value as Settings['language']))}>
              <option value="en">English</option>
              <option value="vi">Tiếng Việt</option>
            </select>
          </Field>
          <Field label={t('settings.weekStart')}>
            <select value={s.weekStart} onChange={(e) => set((st) => void (st.weekStart = Number(e.target.value) as 0 | 1))}>
              <option value={0}>{vi ? 'Chủ Nhật' : 'Sunday'}</option>
              <option value={1}>{vi ? 'Thứ Hai' : 'Monday'}</option>
            </select>
          </Field>
          <Field label={t('settings.theme')}>
            <select value={s.theme} onChange={(e) => set((st) => void (st.theme = e.target.value as Settings['theme']))}>
              <option value="rose">Rose</option>
              <option value="lavender">Lavender</option>
              <option value="mint">Mint</option>
              <option value="ocean">Ocean</option>
            </select>
          </Field>
          <Field label={t('settings.colorMode')}>
            <select value={s.colorMode} onChange={(e) => set((st) => void (st.colorMode = e.target.value as Settings['colorMode']))}>
              <option value="auto">Auto</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </Field>
        </div>
        <Toggle checked={s.showLunar} onChange={(v) => set((st) => void (st.showLunar = v))} label={vi ? 'Hiện âm lịch' : 'Show lunar dates'} />
        <Toggle checked={s.showVnHolidays} onChange={(v) => set((st) => void (st.showVnHolidays = v))} label={vi ? 'Hiện lễ Tết Việt Nam' : 'Show Vietnamese holidays'} />
        <Toggle checked={s.showLiturgical} onChange={(v) => set((st) => void (st.showLiturgical = v))} label={vi ? 'Hiện lịch phụng vụ' : 'Show liturgical calendar'} />
      </Card>

      <Card title={t('settings.timeBuddy')}>
        <Toggle checked={s.timeBuddy.hour12} onChange={(v) => set((st) => void (st.timeBuddy.hour12 = v))} label={vi ? 'Định dạng 12 giờ' : '12-hour clock'} />
        <div className="grid2">
          <Field label={vi ? 'Bắt đầu giờ làm' : 'Work day starts'}>
            <input type="number" min={0} max={23} value={s.timeBuddy.workStart} onChange={(e) => set((st) => void (st.timeBuddy.workStart = clamp(e.target.value, 0, 23, 9)))} />
          </Field>
          <Field label={vi ? 'Kết thúc giờ làm' : 'Work day ends'}>
            <input type="number" min={1} max={24} value={s.timeBuddy.workEnd} onChange={(e) => set((st) => void (st.timeBuddy.workEnd = clamp(e.target.value, 1, 24, 17)))} />
          </Field>
        </div>
      </Card>

      <PrivacyCard />

      <Card title={t('settings.about')}>
        <p className="small">
          {vi
            ? 'Âm lịch Việt Nam tính theo thuật toán thiên văn của Hồ Ngọc Đức (múi giờ UTC+7). Lịch phụng vụ theo Lịch Rôma chung (giản lược) với lịch riêng Canada, Hoa Kỳ, Việt Nam.'
            : 'Vietnamese lunar dates use Hồ Ngọc Đức’s astronomical algorithm (UTC+7). The liturgical calendar follows the General Roman Calendar (simplified rubrics) with Canadian, US and Vietnamese proper days.'}
        </p>
        <p className="muted small">{t('cycle.disclaimer')}</p>
      </Card>
    </div>
  );
}

function clamp(v: string, min: number, max: number, fallback: number): number {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="group">
      <h4>{title}</h4>
      {children}
    </div>
  );
}

function ToggleDays({ label, value, onChange }: { label: string; value: { enabled: boolean; daysBefore: number }; onChange: (v: { enabled: boolean; daysBefore: number }) => void }) {
  const { lang } = useStore();
  return (
    <div className="toggle-days">
      <Toggle checked={value.enabled} onChange={(enabled) => onChange({ ...value, enabled })} label={label} />
      <label className="inline">
        <input type="number" min={0} max={30} value={value.daysBefore} disabled={!value.enabled} onChange={(e) => onChange({ ...value, daysBefore: clamp(e.target.value, 0, 30, 1) })} />
        <span className="muted small">{lang === 'vi' ? 'ngày trước' : 'days before'}</span>
      </label>
    </div>
  );
}

function ToggleTime({ label, value, onChange }: { label: string; value: { enabled: boolean; time: string }; onChange: (v: { enabled: boolean; time: string }) => void }) {
  return (
    <div className="toggle-days">
      <Toggle checked={value.enabled} onChange={(enabled) => onChange({ ...value, enabled })} label={label} />
      <input type="time" value={value.time} disabled={!value.enabled} onChange={(e) => onChange({ ...value, time: e.target.value })} />
    </div>
  );
}

function AccountCard() {
  const { auth, me, sync, syncNow, signIn, signOut, t, lang } = useStore();
  const [loginMsg, setLoginMsg] = useState<string | null>(null);
  useEffect(() => {
    const m = window.location.hash.match(/login=([^&]+)/);
    if (m) {
      setLoginMsg(decodeURIComponent(m[1]));
      history.replaceState(null, '', '#/settings');
    }
  }, []);
  return (
    <Card title={t('settings.account')}>
      {loginMsg && loginMsg !== 'ok' && <p className="error small">Sign-in failed: {loginMsg}</p>}
      {auth === 'unconfigured' && <p className="muted">{t('settings.notConfigured')}</p>}
      {auth === 'signed_out' && (
        <>
          <p className="muted">{t('settings.localOnly')}</p>
          <button className="btn primary google" onClick={signIn}>
            <span aria-hidden>G</span> {t('settings.signIn')}
          </button>
          <p className="muted small">
            {lang === 'vi'
              ? 'Ứng dụng chỉ được quyền truy cập các tệp do chính nó tạo (drive.file), không đọc được các tệp khác trong Drive của bạn.'
              : 'The app only gets access to files it creates (drive.file scope) — it cannot see anything else in your Drive.'}
          </p>
        </>
      )}
      {auth === 'signed_in' && me?.user && (
        <>
          <div className="account-row">
            {me.user.picture && <img src={me.user.picture} alt="" className="avatar" referrerPolicy="no-referrer" />}
            <div>
              <strong>{me.user.name}</strong>
              <div className="muted small">{me.user.email}</div>
            </div>
          </div>
          <p className="small">
            {t(`sync.${sync.state === 'local' ? 'local' : sync.state}` as const)}
            {sync.lastSyncedAt && ` · ${new Date(sync.lastSyncedAt).toLocaleString()}`}
            {sync.error && <span className="error"> · {sync.error}</span>}
          </p>
          <div className="actions-row">
            <button className="btn" onClick={() => syncNow()}>
              🔄 {t('settings.syncNow')}
            </button>
            {me.spreadsheetUrl && (
              <a className="btn" href={me.spreadsheetUrl} target="_blank" rel="noreferrer">
                📊 {t('settings.openSheet')}
              </a>
            )}
            <button className="btn ghost" onClick={() => signOut(false)}>
              {t('settings.signOut')}
            </button>
            <button
              className="btn ghost danger"
              onClick={() =>
                window.confirm(lang === 'vi' ? 'Thu hồi quyền truy cập Google? Google Sheet vẫn nằm trong Drive của bạn.' : 'Revoke Google access? Your Google Sheet stays in your Drive.') &&
                signOut(true)
              }
            >
              {t('settings.disconnect')}
            </button>
          </div>
        </>
      )}
      {auth === 'unknown' && <p className="muted">{t('sync.loading')}</p>}
    </Card>
  );
}

function BackupCard() {
  const { data, replaceData, t } = useStore();
  const stamp = todayISO();
  const importData = (next: AppData) => {
    if (window.confirm(t('settings.importConfirm'))) replaceData(next);
  };
  return (
    <Card title={t('settings.backup')}>
      <div className="actions-row wrap">
        <button className="btn primary" onClick={() => downloadBlob(writeXlsx(toTables(data)) as Uint8Array<ArrayBuffer>,`family-calendar-backup-${stamp}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}>
          ⬇️ {t('settings.exportXlsx')}
        </button>
        <button
          className="btn"
          onClick={async () => {
            const f = await pickFile('.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            if (!f) return;
            try {
              importData(fromTables(readXlsx(new Uint8Array(await f.arrayBuffer())), localTimeZone()));
            } catch (e) {
              alert(`Import failed: ${(e as Error).message}`);
            }
          }}
        >
          ⬆️ {t('settings.importXlsx')}
        </button>
        <button className="btn" onClick={() => downloadBlob(JSON.stringify(data, null, 2), `family-calendar-backup-${stamp}.json`, 'application/json')}>
          {t('settings.exportJson')}
        </button>
        <button
          className="btn"
          onClick={async () => {
            const f = await pickFile('.json,application/json');
            if (!f) return;
            try {
              const parsed = JSON.parse(await f.text()) as AppData;
              const base = emptyData(localTimeZone());
              importData({ ...base, ...parsed, settings: mergeDefaults(structuredClone(DEFAULT_SETTINGS), parsed.settings) });
            } catch (e) {
              alert(`Import failed: ${(e as Error).message}`);
            }
          }}
        >
          {t('settings.importJson')}
        </button>
        <button
          className="btn"
          onClick={() =>
            downloadBlob(
              buildCalendarFile(data, { ...data.settings.feed, years: 1 }),
              `family-calendar-${stamp}.ics`,
              'text/calendar',
            )
          }
        >
          📅 {t('settings.exportIcs')}
        </button>
      </div>
    </Card>
  );
}

function FeedCard() {
  const { auth, me, setFeedUrl, data, update, t } = useStore();
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (auth !== 'signed_in') return null;
  const feed = data.settings.feed;
  const run = async (fn: () => Promise<void>) => {
    setErr(null);
    try {
      await fn();
    } catch (e) {
      setErr((e as Error).message);
    }
  };
  return (
    <Card title={t('settings.feed')}>
      <p className="muted small">{t('settings.feedHint')}</p>
      {me?.feedUrl ? (
        <>
          <div className="copy-row">
            <input readOnly value={me.feedUrl} onFocus={(e) => e.target.select()} aria-label="Feed URL" />
            <button
              className="btn small"
              onClick={async () => {
                setCopied(await copyText(me.feedUrl!));
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? t('common.copied') : t('common.copy')}
            </button>
          </div>
          <div className="actions-row">
            <button className="btn small" onClick={() => run(async () => setFeedUrl((await api.createFeed()).feedUrl))}>
              {t('settings.feedRotate')}
            </button>
            <button className="btn small ghost" onClick={() => run(async () => (await api.deleteFeed(), setFeedUrl(null)))}>
              {t('settings.feedDisable')}
            </button>
          </div>
        </>
      ) : (
        <button className="btn primary" onClick={() => run(async () => setFeedUrl((await api.createFeed()).feedUrl))}>
          {t('settings.feedEnable')}
        </button>
      )}
      <Toggle checked={feed.includeLiturgical} onChange={(v) => update((d) => void (d.settings.feed.includeLiturgical = v))} label={t('settings.liturgical')} />
      <Toggle checked={feed.includeVnHolidays} onChange={(v) => update((d) => void (d.settings.feed.includeVnHolidays = v))} label={t('events.lunarHolidays')} />
      <Toggle checked={feed.includeCycle} onChange={(v) => update((d) => void (d.settings.feed.includeCycle = v))} label={t('settings.feedCycle')} />
      {err && <p className="error small">{err}</p>}
    </Card>
  );
}

function NotificationRow() {
  const { t } = useStore();
  const [on, setOn] = useState(notificationsEnabled());
  return (
    <div className="toggle-days">
      <Toggle
        checked={on}
        onChange={async (v) => {
          if (v) setOn(await enableNotifications());
          else {
            disableNotifications();
            setOn(false);
          }
        }}
        label={t('settings.notifications')}
      />
      {on && (
        <button className="btn small" onClick={() => showNotification('Family Calendar', '🔔 Test')}>
          {t('settings.notifyTest')}
        </button>
      )}
    </div>
  );
}

function PrivacyCard() {
  const { t, lang } = useStore();
  const [pin, setPinState] = useState(hasPin());
  return (
    <Card title={t('settings.privacy')}>
      {pin ? (
        <button
          className="btn"
          onClick={() => {
            clearPin();
            setPinState(false);
          }}
        >
          🔓 {t('settings.pinRemove')}
        </button>
      ) : (
        <button
          className="btn"
          onClick={async () => {
            const p = window.prompt(t('settings.pinPrompt'));
            if (p && /^\d{4,8}$/.test(p)) {
              await setPin(p);
              setPinState(true);
            }
          }}
        >
          🔒 {t('settings.pinSet')}
        </button>
      )}
      <p className="muted small">
        {lang === 'vi'
          ? 'Mã PIN chỉ áp dụng trên thiết bị này và chỉ che màn hình, không mã hóa dữ liệu.'
          : 'The PIN applies to this device only. It is a privacy screen, not encryption.'}
      </p>
    </Card>
  );
}
