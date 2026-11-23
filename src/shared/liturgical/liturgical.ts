/**
 * Catholic liturgical calendar (Roman Rite, ordinary form).
 *
 * Computes seasons, liturgical colours, Sundays, movable feasts (from Easter
 * and Advent), the main fixed solemnities/feasts/memorials of the General
 * Roman Calendar plus a few regional proper days (Canada, USA, Vietnam), and
 * holy days of obligation per region.
 *
 * Precedence is a simplified version of the "Table of Liturgical Days"
 * (Universal Norms on the Liturgical Year, no. 59). Lower number = higher rank.
 * Transfers implemented: St Joseph / Annunciation / Immaculate Conception
 * moved off privileged Sundays and Holy Week / Easter Octave; any other
 * solemnity impeded by a higher-ranked day moves to the next free day.
 */
import {
  addDays,
  dayOfWeek,
  diffDays,
  formatISO,
  parseISO,
  sundayAfter,
  sundayOnOrBefore,
  type ISODate,
} from '../date';

export type LiturgicalColor = 'white' | 'red' | 'green' | 'violet' | 'rose' | 'black';
export type LiturgicalRank =
  | 'triduum'
  | 'solemnity'
  | 'sunday'
  | 'feast'
  | 'memorial'
  | 'optional_memorial'
  | 'weekday'
  | 'commemoration';
export type LiturgicalSeason = 'advent' | 'christmas' | 'ordinary' | 'lent' | 'triduum' | 'easter';
export type LiturgicalRegion = 'GENERAL' | 'CA' | 'US' | 'VN';

export interface Localized {
  en: string;
  vi: string;
}

export interface Celebration {
  key: string;
  title: Localized;
  rank: LiturgicalRank;
  color: LiturgicalColor;
  precedence: number;
}

export interface LiturgicalOptions {
  region: LiturgicalRegion;
  /** Epiphany on the Sunday between Jan 2 and 8 (true in CA, US, VN) */
  epiphanySunday: boolean;
  /** Ascension on the 7th Sunday of Easter (true in CA, VN, most of US) */
  ascensionSunday: boolean;
  /** Corpus Christi on the Sunday after Trinity */
  corpusChristiSunday: boolean;
}

export const DEFAULT_LITURGICAL_OPTIONS: LiturgicalOptions = {
  region: 'CA',
  epiphanySunday: true,
  ascensionSunday: true,
  corpusChristiSunday: true,
};

export interface LiturgicalDay {
  date: ISODate;
  season: LiturgicalSeason;
  seasonTitle: Localized;
  /** Week of the season (Advent 1-4, Lent 0-5, Easter 1-7, Ordinary 1-34), 0 if not applicable */
  week: number;
  color: LiturgicalColor;
  principal: Celebration;
  /** Other (lower-ranked / optional) celebrations of the day */
  others: Celebration[];
  /** Lectionary Sunday cycle A/B/C */
  sundayCycle: 'A' | 'B' | 'C';
  /** Weekday cycle I/II */
  weekdayCycle: 'I' | 'II';
  holyDayOfObligation: boolean;
  fasting: 'fast_and_abstinence' | 'abstinence' | null;
}

// ---------------------------------------------------------------------------

export function easterSunday(year: number): ISODate {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return formatISO(year, month, day);
}

/** First Sunday of Advent of the given civil year (Nov 27 – Dec 3). */
export function firstSundayOfAdvent(year: number): ISODate {
  const christmas = formatISO(year, 12, 25);
  const dow = dayOfWeek(christmas);
  const advent4 = addDays(christmas, -(dow === 0 ? 7 : dow));
  return addDays(advent4, -21);
}

export function epiphanyDate(year: number, opts: LiturgicalOptions): ISODate {
  if (!opts.epiphanySunday) return formatISO(year, 1, 6);
  return sundayAfter(formatISO(year, 1, 1)); // Sunday between Jan 2 and Jan 8
}

export function baptismOfTheLord(year: number, opts: LiturgicalOptions): ISODate {
  const epiphany = epiphanyDate(year, opts);
  const [, , d] = parseISO(epiphany);
  if (opts.epiphanySunday && d >= 7) return addDays(epiphany, 1); // Monday
  return sundayAfter(formatISO(year, 1, 6));
}

export function holyFamily(year: number): ISODate {
  const christmas = formatISO(year, 12, 25);
  if (dayOfWeek(christmas) === 0) return formatISO(year, 12, 30);
  return sundayAfter(christmas);
}

const L = (en: string, vi: string): Localized => ({ en, vi });

const ORDINALS_EN = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th', '13th', '14th', '15th', '16th', '17th', '18th', '19th', '20th', '21st', '22nd', '23rd', '24th', '25th', '26th', '27th', '28th', '29th', '30th', '31st', '32nd', '33rd', '34th'];
const WEEKDAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAYS_VI = ['Chúa Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI', 'XXII', 'XXIII', 'XXIV', 'XXV', 'XXVI', 'XXVII', 'XXVIII', 'XXIX', 'XXX', 'XXXI', 'XXXII', 'XXXIII', 'XXXIV'];

export const SEASON_TITLES: Record<LiturgicalSeason, Localized> = {
  advent: L('Advent', 'Mùa Vọng'),
  christmas: L('Christmas Time', 'Mùa Giáng Sinh'),
  ordinary: L('Ordinary Time', 'Mùa Thường Niên'),
  lent: L('Lent', 'Mùa Chay'),
  triduum: L('Paschal Triduum', 'Tam Nhật Vượt Qua'),
  easter: L('Easter Time', 'Mùa Phục Sinh'),
};

// Precedence levels (simplified UNLY 59)
const P_TRIDUUM = 1;
const P_PRIVILEGED = 2; // Christmas, Epiphany, Ascension, Pentecost, Sundays of Advent/Lent/Easter, Ash Wed, Holy Week, Easter Octave
const P_SOLEMNITY = 3;
const P_PROPER_SOLEMNITY = 4;
const P_FEAST_OF_LORD = 5;
const P_SUNDAY = 6; // Sundays of Christmas Time and Ordinary Time
const P_FEAST = 7;
const P_PRIVILEGED_WEEKDAY = 9; // Dec 17-24, Christmas Octave, Lent weekdays
const P_MEMORIAL = 10;
const P_OPTIONAL = 12;
const P_WEEKDAY = 13;

type FixedDef = [month: number, day: number, rank: LiturgicalRank, color: LiturgicalColor, en: string, vi: string, key: string, regions?: LiturgicalRegion[], lordFeast?: boolean];

/** General Roman Calendar (selection) + regional proper days. */
const FIXED: FixedDef[] = [
  [1, 1, 'solemnity', 'white', 'Mary, the Holy Mother of God', 'Đức Maria, Mẹ Thiên Chúa', 'mary_mother_of_god'],
  [1, 2, 'memorial', 'white', 'Sts Basil the Great and Gregory Nazianzen', 'Thánh Basiliô Cả và Thánh Grêgôriô Nazianzênô', 'basil_gregory'],
  [1, 25, 'feast', 'white', 'Conversion of St Paul, Apostle', 'Thánh Phaolô Tông đồ trở lại', 'conversion_paul'],
  [1, 28, 'memorial', 'white', 'St Thomas Aquinas', 'Thánh Tôma Aquinô', 'thomas_aquinas'],
  [1, 31, 'memorial', 'white', 'St John Bosco', 'Thánh Gioan Bosco', 'john_bosco'],
  [2, 2, 'feast', 'white', 'Presentation of the Lord', 'Dâng Chúa Giêsu trong Đền Thánh', 'presentation_lord', undefined, true],
  [2, 11, 'optional_memorial', 'white', 'Our Lady of Lourdes', 'Đức Mẹ Lộ Đức', 'lourdes'],
  [2, 22, 'feast', 'white', 'Chair of St Peter, Apostle', 'Lập Tông Tòa Thánh Phêrô', 'chair_peter'],
  [3, 19, 'solemnity', 'white', 'St Joseph, Spouse of the Blessed Virgin Mary', 'Thánh Giuse, Bạn trăm năm Đức Maria', 'joseph'],
  [3, 25, 'solemnity', 'white', 'Annunciation of the Lord', 'Lễ Truyền Tin', 'annunciation'],
  [4, 17, 'memorial', 'white', 'St Kateri Tekakwitha', 'Thánh Kateri Tekakwitha', 'kateri', ['CA']],
  [4, 25, 'feast', 'red', 'St Mark, Evangelist', 'Thánh Marcô, Tác giả Sách Tin Mừng', 'mark'],
  [5, 1, 'optional_memorial', 'white', 'St Joseph the Worker', 'Thánh Giuse Thợ', 'joseph_worker'],
  [5, 3, 'feast', 'red', 'Sts Philip and James, Apostles', 'Thánh Philípphê và Thánh Giacôbê, Tông đồ', 'philip_james'],
  [5, 13, 'optional_memorial', 'white', 'Our Lady of Fatima', 'Đức Mẹ Fatima', 'fatima'],
  [5, 14, 'feast', 'red', 'St Matthias, Apostle', 'Thánh Matthia, Tông đồ', 'matthias'],
  [5, 31, 'feast', 'white', 'Visitation of the Blessed Virgin Mary', 'Đức Maria thăm viếng bà Êlisabét', 'visitation'],
  [6, 13, 'memorial', 'white', 'St Anthony of Padua', 'Thánh Antôn Pađôva', 'anthony_padua'],
  [6, 24, 'solemnity', 'white', 'Nativity of St John the Baptist', 'Sinh nhật Thánh Gioan Tẩy Giả', 'john_baptist_nativity'],
  [6, 29, 'solemnity', 'red', 'Sts Peter and Paul, Apostles', 'Thánh Phêrô và Thánh Phaolô, Tông đồ', 'peter_paul'],
  [7, 3, 'feast', 'red', 'St Thomas, Apostle', 'Thánh Tôma, Tông đồ', 'thomas_apostle'],
  [7, 14, 'memorial', 'white', 'St Kateri Tekakwitha', 'Thánh Kateri Tekakwitha', 'kateri_us', ['US']],
  [7, 22, 'feast', 'white', 'St Mary Magdalene', 'Thánh Maria Mađalêna', 'mary_magdalene'],
  [7, 25, 'feast', 'red', 'St James, Apostle', 'Thánh Giacôbê, Tông đồ', 'james'],
  [7, 26, 'memorial', 'white', 'Sts Joachim and Anne, Parents of the Blessed Virgin Mary', 'Thánh Gioakim và Thánh Anna, song thân Đức Maria', 'joachim_anne'],
  [7, 29, 'memorial', 'white', 'Sts Martha, Mary and Lazarus', 'Thánh Mácta, Maria và Lagiarô', 'martha_mary_lazarus'],
  [7, 31, 'memorial', 'white', 'St Ignatius of Loyola', 'Thánh Inhaxiô Loyola', 'ignatius'],
  [8, 4, 'memorial', 'white', 'St John Vianney', 'Thánh Gioan Maria Vianney', 'john_vianney'],
  [8, 6, 'feast', 'white', 'Transfiguration of the Lord', 'Chúa Hiển Dung', 'transfiguration', undefined, true],
  [8, 8, 'memorial', 'white', 'St Dominic', 'Thánh Đaminh', 'dominic'],
  [8, 10, 'feast', 'red', 'St Lawrence, Deacon and Martyr', 'Thánh Lôrensô, Phó tế, Tử đạo', 'lawrence'],
  [8, 15, 'solemnity', 'white', 'Assumption of the Blessed Virgin Mary', 'Đức Mẹ Hồn Xác Lên Trời', 'assumption'],
  [8, 22, 'memorial', 'white', 'Queenship of the Blessed Virgin Mary', 'Đức Maria Nữ Vương', 'queenship_mary'],
  [8, 24, 'feast', 'red', 'St Bartholomew, Apostle', 'Thánh Batôlômêô, Tông đồ', 'bartholomew'],
  [8, 27, 'memorial', 'white', 'St Monica', 'Thánh Mônica', 'monica'],
  [8, 28, 'memorial', 'white', 'St Augustine', 'Thánh Augustinô', 'augustine'],
  [9, 8, 'feast', 'white', 'Nativity of the Blessed Virgin Mary', 'Sinh nhật Đức Trinh Nữ Maria', 'nativity_mary'],
  [9, 14, 'feast', 'red', 'Exaltation of the Holy Cross', 'Suy tôn Thánh Giá', 'exaltation_cross', undefined, true],
  [9, 15, 'memorial', 'white', 'Our Lady of Sorrows', 'Đức Mẹ Sầu Bi', 'our_lady_sorrows'],
  [9, 21, 'feast', 'red', 'St Matthew, Apostle and Evangelist', 'Thánh Mátthêu, Tông đồ, Tác giả Sách Tin Mừng', 'matthew'],
  [9, 26, 'feast', 'red', 'Sts John de Brébeuf, Isaac Jogues and Companions, Canadian Martyrs', 'Các Thánh Tử Đạo Canada', 'canadian_martyrs', ['CA']],
  [9, 29, 'feast', 'white', 'Sts Michael, Gabriel and Raphael, Archangels', 'Các Tổng Lãnh Thiên Thần Micae, Gabriel và Raphael', 'archangels'],
  [9, 30, 'memorial', 'white', 'St Jerome', 'Thánh Giêrônimô', 'jerome'],
  [10, 1, 'memorial', 'white', 'St Thérèse of the Child Jesus', 'Thánh Têrêsa Hài Đồng Giêsu', 'therese'],
  [10, 2, 'memorial', 'white', 'Holy Guardian Angels', 'Các Thiên Thần Hộ Thủ', 'guardian_angels'],
  [10, 4, 'memorial', 'white', 'St Francis of Assisi', 'Thánh Phanxicô Assisi', 'francis_assisi'],
  [10, 7, 'memorial', 'white', 'Our Lady of the Rosary', 'Đức Mẹ Mân Côi', 'rosary'],
  [10, 18, 'feast', 'red', 'St Luke, Evangelist', 'Thánh Luca, Tác giả Sách Tin Mừng', 'luke'],
  [10, 28, 'feast', 'red', 'Sts Simon and Jude, Apostles', 'Thánh Simon và Thánh Giuđa, Tông đồ', 'simon_jude'],
  [11, 1, 'solemnity', 'white', 'All Saints', 'Các Thánh Nam Nữ', 'all_saints'],
  [11, 2, 'commemoration', 'violet', 'All Souls (Commemoration of All the Faithful Departed)', 'Cầu cho các tín hữu đã qua đời', 'all_souls'],
  [11, 9, 'feast', 'white', 'Dedication of the Lateran Basilica', 'Cung hiến Thánh đường Latêranô', 'lateran', undefined, true],
  [11, 21, 'memorial', 'white', 'Presentation of the Blessed Virgin Mary', 'Đức Mẹ dâng mình trong Đền Thờ', 'presentation_mary'],
  [11, 24, 'memorial', 'red', 'Sts Andrew Dũng-Lạc, Priest, and Companions, Vietnamese Martyrs', 'Các Thánh Tử Đạo Việt Nam', 'vietnamese_martyrs'],
  [11, 30, 'feast', 'red', 'St Andrew, Apostle', 'Thánh Anrê, Tông đồ', 'andrew'],
  [12, 8, 'solemnity', 'white', 'Immaculate Conception of the Blessed Virgin Mary', 'Đức Mẹ Vô Nhiễm Nguyên Tội', 'immaculate_conception'],
  [12, 12, 'feast', 'white', 'Our Lady of Guadalupe', 'Đức Mẹ Guadalupe', 'guadalupe', ['CA', 'US']],
  [12, 25, 'solemnity', 'white', 'The Nativity of the Lord (Christmas)', 'Chúa Giáng Sinh', 'christmas'],
  [12, 26, 'feast', 'red', 'St Stephen, the First Martyr', 'Thánh Stêphanô, Tử đạo tiên khởi', 'stephen'],
  [12, 27, 'feast', 'white', 'St John, Apostle and Evangelist', 'Thánh Gioan, Tông đồ, Tác giả Sách Tin Mừng', 'john_apostle'],
  [12, 28, 'feast', 'red', 'The Holy Innocents, Martyrs', 'Các Thánh Anh Hài, Tử đạo', 'holy_innocents'],
];

/** Regional rank overrides. */
const REGIONAL_RANK: Partial<Record<LiturgicalRegion, Record<string, LiturgicalRank>>> = {
  VN: { vietnamese_martyrs: 'solemnity' },
  US: { guadalupe: 'feast' },
};

/** Holy days of obligation other than Sundays. */
const OBLIGATIONS: Record<LiturgicalRegion, string[]> = {
  GENERAL: ['christmas', 'mary_mother_of_god', 'epiphany', 'ascension', 'corpus_christi', 'joseph', 'peter_paul', 'assumption', 'all_saints', 'immaculate_conception'],
  CA: ['christmas', 'mary_mother_of_god'],
  US: ['christmas', 'mary_mother_of_god', 'ascension', 'assumption', 'all_saints', 'immaculate_conception'],
  VN: ['christmas', 'ascension', 'assumption', 'all_saints'],
};

function precedenceFor(rank: LiturgicalRank, isProper: boolean, lordFeast: boolean): number {
  switch (rank) {
    case 'triduum':
      return P_TRIDUUM;
    case 'solemnity':
      return isProper ? P_PROPER_SOLEMNITY : P_SOLEMNITY;
    case 'feast':
      return lordFeast ? P_FEAST_OF_LORD : P_FEAST;
    case 'commemoration':
      return P_SOLEMNITY; // All Souls takes precedence like a solemnity (even on Sunday)
    case 'memorial':
      return P_MEMORIAL;
    case 'optional_memorial':
      return P_OPTIONAL;
    case 'sunday':
      return P_SUNDAY;
    default:
      return P_WEEKDAY;
  }
}

interface YearAnchors {
  year: number;
  easter: ISODate;
  ashWednesday: ISODate;
  palmSunday: ISODate;
  holyThursday: ISODate;
  pentecost: ISODate;
  advent1: ISODate;
  christmas: ISODate;
  baptism: ISODate;
  christTheKing: ISODate;
}

function anchors(year: number, opts: LiturgicalOptions): YearAnchors {
  const easter = easterSunday(year);
  const advent1 = firstSundayOfAdvent(year);
  return {
    year,
    easter,
    ashWednesday: addDays(easter, -46),
    palmSunday: addDays(easter, -7),
    holyThursday: addDays(easter, -3),
    pentecost: addDays(easter, 49),
    advent1,
    christmas: formatISO(year, 12, 25),
    baptism: baptismOfTheLord(year, opts),
    christTheKing: addDays(advent1, -7),
  };
}

function seasonOf(date: ISODate, a: YearAnchors): { season: LiturgicalSeason; week: number } {
  if (date >= a.christmas) return { season: 'christmas', week: 0 };
  if (date >= a.advent1) return { season: 'advent', week: Math.floor(diffDays(a.advent1, date) / 7) + 1 };
  if (date <= a.baptism) return { season: 'christmas', week: 0 };
  if (date < a.ashWednesday) {
    const baptismSunday = sundayOnOrBefore(a.baptism);
    return { season: 'ordinary', week: Math.floor(diffDays(baptismSunday, date) / 7) + 1 };
  }
  if (date < a.holyThursday) {
    const lent1 = addDays(a.ashWednesday, 4);
    return { season: 'lent', week: date < lent1 ? 0 : Math.floor(diffDays(lent1, date) / 7) + 1 };
  }
  if (date < a.easter) return { season: 'triduum', week: 0 };
  if (date <= a.pentecost) return { season: 'easter', week: Math.floor(diffDays(a.easter, date) / 7) + 1 };
  const sunday = sundayOnOrBefore(date);
  return { season: 'ordinary', week: 34 - Math.floor(diffDays(sunday, a.christTheKing) / 7) };
}

function baseDay(date: ISODate, season: LiturgicalSeason, week: number, a: YearAnchors): Celebration {
  const dow = dayOfWeek(date);
  const s = SEASON_TITLES[season];
  if (dow === 0) {
    const privileged = season === 'advent' || season === 'lent' || season === 'easter';
    let color: LiturgicalColor = season === 'ordinary' ? 'green' : season === 'christmas' || season === 'easter' ? 'white' : 'violet';
    if ((season === 'advent' && week === 3) || (season === 'lent' && week === 4)) color = 'rose';
    const titleEn = season === 'christmas' ? 'Sunday of Christmas Time' : `${ORDINALS_EN[week]} Sunday of ${s.en}`;
    const titleVi = season === 'christmas' ? 'Chúa Nhật Mùa Giáng Sinh' : `Chúa Nhật ${ROMAN[week]} ${s.vi}`;
    return {
      key: `sunday_${season}_${week}`,
      title: L(titleEn, titleVi),
      rank: 'sunday',
      color,
      precedence: privileged ? P_PRIVILEGED : P_SUNDAY,
    };
  }
  let precedence = P_WEEKDAY;
  if (season === 'lent' || (season === 'advent' && date >= formatISO(a.year, 12, 17))) precedence = P_PRIVILEGED_WEEKDAY;
  if (season === 'christmas' && date > a.christmas) precedence = P_PRIVILEGED_WEEKDAY; // Christmas Octave
  if (season === 'easter' && week === 1) precedence = P_PRIVILEGED; // Easter Octave
  const color: LiturgicalColor = season === 'ordinary' ? 'green' : season === 'christmas' || season === 'easter' ? 'white' : 'violet';
  const weekEn = week > 0 ? ` of the ${ORDINALS_EN[week]} Week of ${s.en}` : season === 'lent' ? ' after Ash Wednesday' : ` of ${s.en}`;
  const weekVi = week > 0 ? ` Tuần ${ROMAN[week]} ${s.vi}` : season === 'lent' ? ' sau Lễ Tro' : ` ${s.vi}`;
  return {
    key: `weekday_${season}_${week}_${dow}`,
    title: L(`${WEEKDAYS_EN[dow]}${weekEn}`, `${WEEKDAYS_VI[dow]}${weekVi}`),
    rank: 'weekday',
    color,
    precedence,
  };
}

function movable(a: YearAnchors, opts: LiturgicalOptions): Map<ISODate, Celebration[]> {
  const map = new Map<ISODate, Celebration[]>();
  const add = (date: ISODate, c: Celebration) => {
    const list = map.get(date) ?? [];
    list.push(c);
    map.set(date, list);
  };
  const E = a.easter;
  const y = a.year;
  add(epiphanyDate(y, opts), { key: 'epiphany', title: L('The Epiphany of the Lord', 'Chúa Hiển Linh'), rank: 'solemnity', color: 'white', precedence: P_PRIVILEGED });
  add(a.baptism, { key: 'baptism_lord', title: L('The Baptism of the Lord', 'Chúa Giêsu chịu phép rửa'), rank: 'feast', color: 'white', precedence: P_FEAST_OF_LORD });
  add(a.ashWednesday, { key: 'ash_wednesday', title: L('Ash Wednesday', 'Thứ Tư Lễ Tro'), rank: 'weekday', color: 'violet', precedence: P_PRIVILEGED });
  add(a.palmSunday, { key: 'palm_sunday', title: L("Palm Sunday of the Lord's Passion", 'Chúa Nhật Lễ Lá'), rank: 'sunday', color: 'red', precedence: P_PRIVILEGED });
  for (let i = 1; i <= 3; i++) {
    add(addDays(a.palmSunday, i), {
      key: `holy_week_${i}`,
      title: L(`${WEEKDAYS_EN[i]} of Holy Week`, `${WEEKDAYS_VI[i]} Tuần Thánh`),
      rank: 'weekday',
      color: 'violet',
      precedence: P_PRIVILEGED,
    });
  }
  add(a.holyThursday, { key: 'holy_thursday', title: L("Holy Thursday (Evening Mass of the Lord's Supper)", 'Thứ Năm Tuần Thánh - Thánh lễ Tiệc Ly'), rank: 'triduum', color: 'white', precedence: P_TRIDUUM });
  add(addDays(E, -2), { key: 'good_friday', title: L("Good Friday of the Lord's Passion", 'Thứ Sáu Tuần Thánh - Tưởng niệm Cuộc Thương Khó'), rank: 'triduum', color: 'red', precedence: P_TRIDUUM });
  add(addDays(E, -1), { key: 'holy_saturday', title: L('Holy Saturday (Easter Vigil)', 'Thứ Bảy Tuần Thánh - Canh thức Vượt Qua'), rank: 'triduum', color: 'white', precedence: P_TRIDUUM });
  add(E, { key: 'easter', title: L("Easter Sunday of the Lord's Resurrection", 'Chúa Nhật Phục Sinh'), rank: 'solemnity', color: 'white', precedence: P_TRIDUUM });
  add(addDays(E, 7), { key: 'divine_mercy', title: L('2nd Sunday of Easter (Divine Mercy Sunday)', 'Chúa Nhật II Phục Sinh - Lòng Chúa Thương Xót'), rank: 'sunday', color: 'white', precedence: P_PRIVILEGED });
  add(addDays(E, opts.ascensionSunday ? 42 : 39), { key: 'ascension', title: L('The Ascension of the Lord', 'Chúa Thăng Thiên'), rank: 'solemnity', color: 'white', precedence: P_PRIVILEGED });
  add(a.pentecost, { key: 'pentecost', title: L('Pentecost Sunday', 'Chúa Thánh Thần Hiện Xuống'), rank: 'solemnity', color: 'red', precedence: P_PRIVILEGED });
  add(addDays(E, 50), { key: 'mary_mother_church', title: L('Blessed Virgin Mary, Mother of the Church', 'Đức Maria, Mẹ Giáo Hội'), rank: 'memorial', color: 'white', precedence: P_MEMORIAL });
  add(addDays(E, 56), { key: 'trinity', title: L('The Most Holy Trinity', 'Chúa Ba Ngôi'), rank: 'solemnity', color: 'white', precedence: P_SOLEMNITY });
  add(addDays(E, opts.corpusChristiSunday ? 63 : 60), { key: 'corpus_christi', title: L('The Most Holy Body and Blood of Christ', 'Mình và Máu Thánh Chúa Kitô'), rank: 'solemnity', color: 'white', precedence: P_SOLEMNITY });
  add(addDays(E, 68), { key: 'sacred_heart', title: L('The Most Sacred Heart of Jesus', 'Thánh Tâm Chúa Giêsu'), rank: 'solemnity', color: 'white', precedence: P_SOLEMNITY });
  add(addDays(E, 69), { key: 'immaculate_heart', title: L('The Immaculate Heart of the Blessed Virgin Mary', 'Trái Tim Vô Nhiễm Đức Mẹ'), rank: 'memorial', color: 'white', precedence: P_MEMORIAL });
  add(a.christTheKing, { key: 'christ_the_king', title: L('Our Lord Jesus Christ, King of the Universe', 'Chúa Giêsu Kitô, Vua Vũ Trụ'), rank: 'solemnity', color: 'white', precedence: P_SOLEMNITY });
  add(holyFamily(y), { key: 'holy_family', title: L('The Holy Family of Jesus, Mary and Joseph', 'Thánh Gia Thất'), rank: 'feast', color: 'white', precedence: P_FEAST_OF_LORD });
  return map;
}

const yearCache = new Map<string, Map<ISODate, LiturgicalDay>>();

function optsKey(year: number, o: LiturgicalOptions): string {
  return `${year}|${o.region}|${+o.epiphanySunday}${+o.ascensionSunday}${+o.corpusChristiSunday}`;
}

/** Build every liturgical day of a civil year. */
export function liturgicalYear(year: number, opts: LiturgicalOptions = DEFAULT_LITURGICAL_OPTIONS): Map<ISODate, LiturgicalDay> {
  const cacheKey = optsKey(year, opts);
  const cached = yearCache.get(cacheKey);
  if (cached) return cached;

  const a = anchors(year, opts);
  const candidates = movable(a, opts);
  const base = new Map<ISODate, { season: LiturgicalSeason; week: number; celebration: Celebration }>();
  for (let d = formatISO(year, 1, 1); d <= formatISO(year, 12, 31); d = addDays(d, 1)) {
    const { season, week } = seasonOf(d, a);
    base.set(d, { season, week, celebration: baseDay(d, season, week, a) });
  }
  const topPrecedence = (date: ISODate): number => {
    let p = base.get(date)?.celebration.precedence ?? P_WEEKDAY;
    for (const c of candidates.get(date) ?? []) p = Math.min(p, c.precedence);
    return p;
  };

  // Fixed celebrations, applying regional calendars and transfers.
  const regional = REGIONAL_RANK[opts.region] ?? {};
  for (const [m, d, rank0, color, en, vi, key, regions, lordFeast] of FIXED) {
    if (regions && !regions.includes(opts.region)) continue;
    const rank = regional[key] ?? rank0;
    const isProper = !!regions || key in regional;
    const c: Celebration = { key, title: L(en, vi), rank, color, precedence: precedenceFor(rank, isProper, !!lordFeast) };
    let date = formatISO(year, m, d);

    if (key === 'joseph' || key === 'annunciation') {
      const inHolyWeekOrOctave = date >= a.palmSunday && date <= addDays(a.easter, 7);
      if (inHolyWeekOrOctave) date = key === 'joseph' ? addDays(a.palmSunday, -1) : addDays(a.easter, 8);
    }
    if (rank === 'solemnity') {
      // Move an impeded solemnity to the next day that it outranks.
      let guard = 0;
      while (topPrecedence(date) <= c.precedence && guard++ < 14) date = addDays(date, 1);
    }
    if (date.slice(0, 4) !== String(year)) continue;
    const list = candidates.get(date) ?? [];
    list.push(c);
    candidates.set(date, list);
  }

  const out = new Map<ISODate, LiturgicalDay>();
  const obligations = new Set(OBLIGATIONS[opts.region]);
  const litYear = (date: ISODate) => (date >= a.advent1 ? year + 1 : year);

  for (const [date, b] of base) {
    // Proper celebrations listed before the base day so they win precedence ties (stable sort).
    const all = [...(candidates.get(date) ?? []), b.celebration].sort((x, y) => x.precedence - y.precedence);
    let principal = all[0];
    let others = all.slice(1);
    // Memorials falling in Lent / Dec 17-24 / Easter Octave are only commemorated.
    if ((b.season === 'lent' || b.celebration.precedence === P_PRIVILEGED_WEEKDAY) && principal.rank === 'weekday') {
      others = others.map((o) => (o.rank === 'memorial' ? { ...o, rank: 'commemoration' as const } : o));
    }
    // On Sundays, memorials and ordinary feasts are omitted.
    if (dayOfWeek(date) === 0) others = others.filter((o) => o.precedence <= P_FEAST_OF_LORD || o.rank === 'solemnity');
    // Saturday memorial of the BVM is optional — not modelled.
    if (principal.rank === 'optional_memorial' || principal.rank === 'commemoration' && principal.key !== 'all_souls') {
      principal = b.celebration;
      others = all.filter((c) => c !== b.celebration);
    }
    const ly = litYear(date);
    const fasting =
      principal.key === 'ash_wednesday' || principal.key === 'good_friday'
        ? 'fast_and_abstinence'
        : b.season === 'lent' && dayOfWeek(date) === 5
          ? 'abstinence'
          : null;
    out.set(date, {
      date,
      season: b.season,
      seasonTitle: SEASON_TITLES[b.season],
      week: b.week,
      color: principal.color,
      principal,
      others,
      sundayCycle: (['C', 'A', 'B'] as const)[ly % 3],
      weekdayCycle: ly % 2 === 0 ? 'II' : 'I',
      holyDayOfObligation: dayOfWeek(date) === 0 || obligations.has(principal.key),
      fasting,
    });
  }
  yearCache.set(cacheKey, out);
  return out;
}

export function getLiturgicalDay(date: ISODate, opts: LiturgicalOptions = DEFAULT_LITURGICAL_OPTIONS): LiturgicalDay {
  return liturgicalYear(Number(date.slice(0, 4)), opts).get(date)!;
}

export type ImportantDayFilter = {
  solemnities: boolean;
  feasts: boolean;
  memorials: boolean;
  sundays: boolean;
  obligations: boolean;
  fastDays: boolean;
};

/** "Important" liturgical days in a date range, for lists and reminders. */
export function importantLiturgicalDays(
  start: ISODate,
  end: ISODate,
  filter: ImportantDayFilter,
  opts: LiturgicalOptions = DEFAULT_LITURGICAL_OPTIONS,
): LiturgicalDay[] {
  const out: LiturgicalDay[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) {
    const day = getLiturgicalDay(d, opts);
    const r = day.principal.rank;
    const isSunday = dayOfWeek(d) === 0;
    const keep =
      (filter.solemnities && (r === 'solemnity' || r === 'triduum' || day.principal.key === 'ash_wednesday' || day.principal.key === 'all_souls')) ||
      (filter.feasts && r === 'feast') ||
      (filter.memorials && r === 'memorial') ||
      (filter.sundays && isSunday) ||
      (filter.obligations && day.holyDayOfObligation && !isSunday) ||
      (filter.fastDays && day.fasting === 'fast_and_abstinence');
    if (keep) out.push(day);
  }
  return out;
}

export const COLOR_HEX: Record<LiturgicalColor, string> = {
  white: '#f4efe1',
  red: '#c0392b',
  green: '#2e8b57',
  violet: '#7d3c98',
  rose: '#e8a0bf',
  black: '#222222',
};
