# Algorithms

## Vietnamese lunar calendar (`src/shared/lunar/vietnamese-lunar.ts`)

This is Hồ Ngọc Đức's well-known algorithm, based on Jean Meeus' *Astronomical Algorithms*:

1. `newMoon(k)` gives the k-th new moon after 1900-01-01 (Julian date, with periodic corrections and ΔT).
2. `sunLongitude(jd)` gives the apparent solar longitude.
3. Month 11 is the lunar month containing the winter solstice (`getLunarMonth11`).
4. A lunar year with 13 months has a leap month. It is the **first month that contains no major solar term** (`getLeapMonthOffset`).
5. All day boundaries are computed at **UTC+7**. This is why Vietnamese Tết 1985 (Jan 21) differs from Chinese New Year 1985 (Feb 20).

Derived values:

| Value | Formula |
| --- | --- |
| Can of year | `(y + 6) % 10` |
| Chi of year | `(y + 8) % 12` |
| Can of month | `(y × 12 + m + 3) % 10` |
| Chi of month | `(m + 1) % 12` |
| Can Chi of day | `(jd + 9) % 10`, `(jd + 1) % 12` |
| Solar term | `floor(sunLongitude / 15°)`, index 0 = Xuân phân |
| Auspicious hours | the classic 6-pattern table indexed by day chi mod 6 |

Tests (`tests/lunar.test.ts`) cover:

- Tết 2023–2027,
- leap months 2023 (2) and 2025 (6),
- Mid-Autumn 2025,
- Tết 1985 at UTC+7 vs UTC+8,
- a lunar ↔ solar round-trip for every 5th day from 1950 to 2100.

## Death anniversaries (`src/shared/events/events.ts`)

- The solar date of death is converted to lunar (day, month, year, leap).
- For each lunar year *Y* > death year, the observance is `lunarToSolar(min(day, monthLength(month, Y)), month, Y, leap=false)`. A leap-month death is observed in the regular month, and day 30 becomes 29 in a short month.
- The anniversary number is *Y − deathYear*. Number 1 is *giỗ đầu*, number 2 is *giỗ hết*.

## Liturgical calendar (`src/shared/liturgical/liturgical.ts`)

**Easter** uses the Anonymous Gregorian (Meeus/Jones/Butcher) algorithm.

**Anchors:**

| Day | Rule |
| --- | --- |
| Ash Wednesday | Easter − 46 |
| Palm Sunday | Easter − 7 |
| Triduum | Easter − 3 … Easter − 1 |
| Divine Mercy Sunday | Easter + 7 |
| Ascension | Easter + 39 (Thursday) or + 42 (Sunday) |
| Pentecost | Easter + 49 |
| Trinity | Easter + 56 |
| Corpus Christi | Easter + 60 or + 63 |
| Sacred Heart | Easter + 68 |
| 4th Sunday of Advent | the Sunday before Christmas; Advent 1 is 21 days earlier |
| Christ the King | Advent 1 − 7 |
| Epiphany | Jan 6, or the Sunday Jan 2–8 |
| Baptism of the Lord | the Sunday after Jan 6, or Monday when Epiphany falls on Jan 7–8 |
| Holy Family | the Sunday in the Christmas octave, or Dec 30 if there is none |

**Weeks:**

- Ordinary Time before Lent counts from the Sunday of the Baptism.
- Ordinary Time after Pentecost counts backwards from Christ the King (week 34).

**Cycles:** the liturgical year is the civil year, plus 1 from Advent 1 onwards.

- Sunday cycle: `['C', 'A', 'B'][year % 3]`
- Weekday cycle: I for odd years, II for even years.

**Precedence** is a simplified version of the Table of Liturgical Days:

1. Triduum
2. Privileged days (Christmas, Epiphany, Ascension, Pentecost, Sundays of Advent, Lent and Easter, Ash Wednesday, Holy Week, Easter Octave)
3. Solemnities
4. Proper solemnities
5. Feasts of the Lord
6. Sundays of Christmas Time and Ordinary Time
7. Feasts
8. *(unused)*
9. Privileged weekdays
10. Memorials
11. *(unused)*
12. Optional memorials
13. Weekdays

**Transfers:**

- St Joseph in Holy Week moves to the Saturday before Palm Sunday.
- The Annunciation in Holy Week or the Easter Octave moves to the Monday after Divine Mercy Sunday.
- Any other impeded solemnity moves to the next day it outranks.
- Memorials in Lent and on privileged weekdays become commemorations. Memorials and feasts on Sundays are omitted.

**Regional proper days:**

- **CA:** Kateri (Apr 17), Canadian Martyrs (Sep 26), Guadalupe.
- **US:** Kateri (Jul 14), Guadalupe as a feast.
- **VN:** Vietnamese Martyrs as a solemnity.

**Holy days of obligation:**

| Region | Holy days (besides Sundays) |
| --- | --- |
| GENERAL | Universal list (canon 1246) |
| CA | Christmas, Jan 1 |
| US | Jan 1, Ascension, Assumption, All Saints, Immaculate Conception, Christmas. The Saturday/Monday abrogation is not modelled. |
| VN | Christmas, Ascension, Assumption, All Saints |

**Known simplifications:**

- Not every optional memorial is listed.
- Some rare collisions (e.g. Nativity of John the Baptist on the Sacred Heart) move forward instead of backward.
- Diocesan proper days are not included.

## Cycle predictions (`src/shared/cycle/cycle.ts`)

- Cycle length is the gap between consecutive starts. Averages use the last *N* valid cycles (15–60 days).
- Next start = last start + average cycle (repeated for future cycles).
- Ovulation = next start − luteal phase (default 14). Fertile window = ovulation − 5 … ovulation + 1.
- Fertility level: `peak` on ovulation day, `high` from −2 to +1, otherwise `medium` within the window.
- Pregnancy mode uses Naegele's rule: due date = LMP + 280 days.

## Time zones (`src/shared/time/timezones.ts`)

- The offset at an instant comes from `Intl.DateTimeFormat#formatToParts` in the zone, compared with UTC.
- Wall time → UTC uses a two-pass offset correction (handles DST gaps and overlaps deterministically).
- The next DST transition is found with a daily scan up to 400 days, then a minute-precision bisection. The UI recomputes it hourly.
