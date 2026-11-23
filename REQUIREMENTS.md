# Requirements

Status legend: ✅ implemented · 🟡 partial / simplified · ⏳ planned (not implemented yet)

## 1. Platform & data

| ID | Requirement | Status |
| --- | --- | --- |
| P-1 | Web app (responsive, installable PWA) hosted on **Cloudflare Workers** (static assets + Worker API) | ✅ |
| P-2 | Sign in with **Google**; data is stored in a **Google Sheet in the user's own Drive** (`drive.file` scope: the app can only see files it created) | ✅ |
| P-3 | Works offline / without an account (localStorage). Syncs when signed in. | ✅ |
| P-4 | **Export to Excel (.xlsx)** for backup, and import from .xlsx. JSON export/import as well. | ✅ |
| P-5 | Export an iCalendar (.ics) file, plus a private **subscribable ICS feed** so reminders show up in phone calendars | ✅ |
| P-6 | English and Vietnamese UI | ✅ (Vietnamese covers most labels) |
| P-7 | Light/dark themes and colour themes | ✅ |
| P-8 | Conflict handling when two devices edit offline | 🟡 last-writer-wins, with a prompt when both sides changed |

## 2. Period Calendar parity (cycle tracking)

Modelled on the feature set of *Period Calendar Period Tracker* (Android).

| ID | Feature | Status |
| --- | --- | --- |
| C-1 | Mark period start / end on the calendar; edit and delete past periods; add past periods | ✅ |
| C-2 | Predict the next periods, ovulation day and fertile window | ✅ |
| C-3 | Averages from history (last *N* cycles), or user-set defaults for cycle length, period length and luteal phase | ✅ |
| C-4 | Cycle day, "period in X days", "late by X days", chance of pregnancy (low / high) | ✅ |
| C-5 | Daily log: flow, symptoms, moods, cervical mucus, temperature (BBT), weight, intercourse (protected/unprotected), pill, ovulation test, pregnancy test, notes | ✅ |
| C-6 | Charts: cycle length, period length, BBT, weight, most frequent symptoms | ✅ |
| C-7 | Cycle history table with statistics (shortest, longest, variation) | ✅ |
| C-8 | Pregnancy mode: due date, gestational week/day, trimester; pauses predictions | ✅ |
| C-9 | Reminders: upcoming period, fertile window, ovulation, daily pill, BBT | ✅ (see R-*) |
| C-10 | PIN / passcode lock | 🟡 device-local privacy screen, not encryption |
| C-11 | Backup & restore | ✅ (Google Sheet, .xlsx, JSON) |
| C-12 | Themes / skins; week starts on Sunday or Monday | ✅ |
| C-13 | Home-screen widgets, multiple profiles, cloud providers other than Google | ⏳ |

## 3. Vietnamese lunar calendar

| ID | Feature | Status |
| --- | --- | --- |
| L-1 | Lunar date on every calendar cell. Day 1 is shown as `d/m`, and leap months are marked. | ✅ |
| L-2 | Day details: lunar day/month/year, Can Chi of day/month/year, zodiac, full or short month (tháng đủ/thiếu), solar term (tiết khí), auspicious hours (giờ hoàng đạo) | ✅ |
| L-3 | Traditional holidays (Tết, Nguyên Tiêu, Hàn Thực, Giỗ Tổ, Phật Đản, Đoan Ngọ, Vu Lan, Trung Thu, Trùng Cửu, Thường Tân, Ông Táo, Giao Thừa) | ✅ |
| L-4 | Catholic Tết Masses (Mùng 1: peace, Mùng 2: ancestors, Mùng 3: work) | ✅ |
| L-5 | Solar ↔ lunar date converter | ✅ |
| L-6 | Optional reminders for mùng 1 and rằm (15th) of each lunar month | ✅ |

## 4. Death anniversaries (giỗ) & personal days

| ID | Requirement | Status |
| --- | --- | --- |
| E-1 | Add a giỗ by **solar date of death**, which is converted to lunar automatically, or by lunar day/month directly | ✅ |
| E-2 | Recurs every lunar year. A death in a leap month is observed in the regular month. Day 30 falls back to day 29 when the month is short. | ✅ |
| E-3 | Anniversary count ("Giỗ đầu", "Giỗ hết", "Giỗ lần N") | ✅ |
| E-4 | Several reminders per event (e.g. 7, 1 and 0 days before), each at a set time | ✅ |
| E-5 | Other kinds: birthday, wedding anniversary, name day (patron saint), memorial, other, on the solar or lunar calendar | ✅ |
| E-6 | Feb 29 solar events fall on Feb 28 in common years | ✅ |

## 5. Catholic liturgical calendar

| ID | Requirement | Status |
| --- | --- | --- |
| K-1 | Seasons, weeks, liturgical colour, Sunday cycle A/B/C, weekday cycle I/II | ✅ |
| K-2 | Movable days (Ash Wednesday, Holy Week, Triduum, Easter, Divine Mercy, Ascension, Pentecost, Trinity, Corpus Christi, Sacred Heart, Christ the King, Advent) | ✅ |
| K-3 | Fixed solemnities, feasts and main memorials of the General Roman Calendar | 🟡 a curated selection, not every optional memorial |
| K-4 | Regional calendars: Canada (incl. Canadian Martyrs, Kateri), USA, Vietnam (Vietnamese Martyrs as a solemnity), General | ✅ |
| K-5 | Options: Epiphany, Ascension and Corpus Christi on Sunday | ✅ |
| K-6 | Transfer rules (St Joseph, Annunciation, Immaculate Conception; impeded solemnities) | 🟡 simplified precedence table |
| K-7 | Holy days of obligation per region; fast & abstinence days | ✅ |
| K-8 | Reminders, filterable by solemnities, obligations, fast days, feasts, memorials and Sundays | ✅ |
| K-9 | Daily Mass readings | ⏳ (needs a licensed source) |

## 6. Time Buddy parity

Modelled on the feature set of *Time Buddy – Clock & Converter* (Android).

| ID | Feature | Status |
| --- | --- | --- |
| T-1 | World clock list: live time, date, UTC offset, abbreviation, difference from home, DST badge, next clock change | ✅ |
| T-2 | Add cities by search (accent-insensitive, Vietnamese names) or any IANA zone. Rename, reorder, delete, set home. | ✅ |
| T-3 | Meeting planner: a 24-hour timeline per city, aligned by instant, with working-hour/evening/night colouring, a date picker, a slider in 30-minute steps, a "now" marker and date-change markers | ✅ |
| T-4 | Copy the selected time across all cities as text; export a meeting as .ics | ✅ |
| T-5 | Converter: date and time in any zone → all saved clocks plus extra cities, with differences | ✅ |
| T-6 | 12/24-hour format; configurable working hours | ✅ |
| T-7 | Home-screen widgets | ⏳ (not possible on the web; the PWA can be installed) |

## 7. Reminders

| ID | Requirement | Status |
| --- | --- | --- |
| R-1 | A unified reminder engine (events, liturgical, lunar, cycle, pill, BBT) shared by the browser and the Worker | ✅ |
| R-2 | Browser notifications while the app is open | ✅ |
| R-3 | A subscribable ICS feed with VALARMs, so reminders work when the app is closed | ✅ |
| R-4 | Server-push notifications (Web Push via Worker cron) | ⏳ |

## 8. Non-functional

- **Privacy:** health data stays in the user's own Google Drive. The Worker stores only an encrypted refresh token (AES-GCM), the sheet id and a feed token in KV. Cycle data is left out of the ICS feed unless the user opts in.
- **Security:** OAuth code flow with PKCE and a state cookie; HttpOnly SameSite=Lax session cookie; CSRF header plus an Origin check on mutations; CSP and security headers; least-privilege `drive.file` scope.
- **Performance:** all calendar math runs client-side with no network. The lunar reminder builder iterates over lunar years, not individual days, so the feed fits Workers' CPU limits.
- **Correctness:** unit tests cover the lunar calendar (Tết dates, leap months, a round-trip over 1950–2100), Easter and Advent, transfers, regional proper days, cycle math, time-zone offsets and DST, giỗ rules, the sheet round-trip and ICS line folding.
- **Accessibility:** keyboard focus rings, ARIA roles on tabs, dialogs and grids, and colour paired with text labels in the legends.
