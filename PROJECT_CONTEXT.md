# Project context

## Why this exists

The family is a Vietnamese Catholic family (based in Canada) who currently juggle several phone apps:

- a period tracker (*Period Calendar Period Tracker*),
- a world-clock app (*Time Buddy*) to call relatives in Vietnam and elsewhere,
- paper or memory for **giỗ** (death anniversaries, which follow the lunar calendar),
- parish bulletins for Catholic feast days and holy days of obligation.

This project puts all of these into **one private web app**. The data is owned by the family, in their own Google Drive, and can be exported to Excel at any time.

## Users

- **Primary user:** an adult family member tracking their cycle, family anniversaries and church days. They are bilingual (English/Vietnamese).
- **Other family members** may use the calendar, giỗ and time features on their own Google accounts. Each account gets its own sheet. Sharing one sheet between people is not supported yet.

## Domain glossary

| Term | Meaning |
| --- | --- |
| **Âm lịch** | Vietnamese lunisolar calendar. Computed for UTC+7, so it sometimes differs from the Chinese calendar (UTC+8). |
| **Tháng nhuận** | Leap month. Repeats the previous month number, roughly 7 times in 19 years. |
| **Tháng đủ / thiếu** | 30-day / 29-day lunar month |
| **Mùng 1 / Rằm** | 1st / 15th day of a lunar month (new moon / full moon) |
| **Can Chi** | Sexagenary cycle (10 Heavenly Stems × 12 Earthly Branches) naming years, months, days and hours |
| **Tiết khí** | 24 solar terms (every 15° of the sun's longitude) |
| **Giờ hoàng đạo** | Auspicious hours of a day |
| **Giỗ** | Death anniversary, observed on the lunar date of death. *Giỗ đầu* is the 1st anniversary; *giỗ hết* is the 2nd, which ends mourning. |
| **Lễ bổn mạng** | Feast of one's patron saint (name day) |
| **Solemnity / Feast / Memorial** | Ranks of liturgical celebrations (Lễ trọng / Lễ kính / Lễ nhớ) |
| **Holy day of obligation** | Day Catholics are obliged to attend Mass (Lễ buộc). It differs by country. |
| **Sunday cycle A/B/C** | Three-year Sunday lectionary cycle; the year starts on the 1st Sunday of Advent |
| **Luteal phase** | Days from ovulation to the next period. Usually about 14, and fairly constant. |
| **Fertile window** | Ovulation − 5 days … ovulation + 1 day |

## Key decisions (see docs/adr/)

1. **Google Sheet as the database** (ADR-0001). The user can read, edit and keep their data, and storage costs nothing. Small datasets make a full-table rewrite per save acceptable.
2. **Local-first SPA + thin Worker** (ADR-0002). All calendar math runs in the browser from `src/shared`. The Worker only handles OAuth, the Sheets proxy and the ICS feed.
3. **No date or time-zone libraries.** Dates are ISO strings with epoch-day arithmetic, and time zones use the built-in `Intl` (IANA database in the runtime).
4. **Reminders via an ICS feed.** Reliable background reminders on phones without native apps or Web Push infrastructure.
5. **Feature parity, original implementation.** The two Android apps are a functional reference only. No names, artwork or assets are copied from them.

## Constraints

- Cloudflare Workers CPU budget (10 ms on the free plan). Keep Worker-side computation light. The ICS feed covers about 1 year ahead.
- The Google `drive.file` scope means the app cannot open a sheet the user created by hand. It only works with the sheet it created, and a new one is created if that sheet is deleted.
- Health data is sensitive. Never log it, never put it in URLs, and keep it out of the feed by default.

## Out of scope (for now)

Native mobile apps, widgets, multiple profiles per account, family sharing, Mass readings, Web Push.
