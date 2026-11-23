/** Curated city list for the world clock search. Any IANA zone can also be added directly. */
export interface City {
  name: string;
  country: string;
  tz: string;
  /** optional alternate names for search (incl. Vietnamese) */
  alt?: string;
}

export const CITIES: City[] = [
  // Vietnam & SE Asia
  { name: 'Ho Chi Minh City', country: 'Vietnam', tz: 'Asia/Ho_Chi_Minh', alt: 'Sài Gòn Saigon TP HCM' },
  { name: 'Hanoi', country: 'Vietnam', tz: 'Asia/Ho_Chi_Minh', alt: 'Hà Nội' },
  { name: 'Da Nang', country: 'Vietnam', tz: 'Asia/Ho_Chi_Minh', alt: 'Đà Nẵng' },
  { name: 'Hue', country: 'Vietnam', tz: 'Asia/Ho_Chi_Minh', alt: 'Huế' },
  { name: 'Can Tho', country: 'Vietnam', tz: 'Asia/Ho_Chi_Minh', alt: 'Cần Thơ' },
  { name: 'Bangkok', country: 'Thailand', tz: 'Asia/Bangkok' },
  { name: 'Phnom Penh', country: 'Cambodia', tz: 'Asia/Phnom_Penh' },
  { name: 'Vientiane', country: 'Laos', tz: 'Asia/Vientiane' },
  { name: 'Yangon', country: 'Myanmar', tz: 'Asia/Yangon' },
  { name: 'Kuala Lumpur', country: 'Malaysia', tz: 'Asia/Kuala_Lumpur' },
  { name: 'Singapore', country: 'Singapore', tz: 'Asia/Singapore' },
  { name: 'Jakarta', country: 'Indonesia', tz: 'Asia/Jakarta' },
  { name: 'Manila', country: 'Philippines', tz: 'Asia/Manila' },
  // East Asia
  { name: 'Hong Kong', country: 'China', tz: 'Asia/Hong_Kong' },
  { name: 'Beijing', country: 'China', tz: 'Asia/Shanghai' },
  { name: 'Shanghai', country: 'China', tz: 'Asia/Shanghai' },
  { name: 'Taipei', country: 'Taiwan', tz: 'Asia/Taipei' },
  { name: 'Seoul', country: 'South Korea', tz: 'Asia/Seoul' },
  { name: 'Tokyo', country: 'Japan', tz: 'Asia/Tokyo' },
  { name: 'Ulaanbaatar', country: 'Mongolia', tz: 'Asia/Ulaanbaatar' },
  // South & Central Asia, Middle East
  { name: 'New Delhi', country: 'India', tz: 'Asia/Kolkata' },
  { name: 'Mumbai', country: 'India', tz: 'Asia/Kolkata' },
  { name: 'Kathmandu', country: 'Nepal', tz: 'Asia/Kathmandu' },
  { name: 'Dhaka', country: 'Bangladesh', tz: 'Asia/Dhaka' },
  { name: 'Colombo', country: 'Sri Lanka', tz: 'Asia/Colombo' },
  { name: 'Karachi', country: 'Pakistan', tz: 'Asia/Karachi' },
  { name: 'Kabul', country: 'Afghanistan', tz: 'Asia/Kabul' },
  { name: 'Tashkent', country: 'Uzbekistan', tz: 'Asia/Tashkent' },
  { name: 'Dubai', country: 'UAE', tz: 'Asia/Dubai' },
  { name: 'Tehran', country: 'Iran', tz: 'Asia/Tehran' },
  { name: 'Riyadh', country: 'Saudi Arabia', tz: 'Asia/Riyadh' },
  { name: 'Doha', country: 'Qatar', tz: 'Asia/Qatar' },
  { name: 'Jerusalem', country: 'Israel', tz: 'Asia/Jerusalem' },
  { name: 'Beirut', country: 'Lebanon', tz: 'Asia/Beirut' },
  { name: 'Istanbul', country: 'Türkiye', tz: 'Europe/Istanbul' },
  // Europe
  { name: 'London', country: 'United Kingdom', tz: 'Europe/London' },
  { name: 'Dublin', country: 'Ireland', tz: 'Europe/Dublin' },
  { name: 'Lisbon', country: 'Portugal', tz: 'Europe/Lisbon' },
  { name: 'Paris', country: 'France', tz: 'Europe/Paris' },
  { name: 'Brussels', country: 'Belgium', tz: 'Europe/Brussels' },
  { name: 'Amsterdam', country: 'Netherlands', tz: 'Europe/Amsterdam' },
  { name: 'Berlin', country: 'Germany', tz: 'Europe/Berlin' },
  { name: 'Frankfurt', country: 'Germany', tz: 'Europe/Berlin' },
  { name: 'Zurich', country: 'Switzerland', tz: 'Europe/Zurich' },
  { name: 'Vienna', country: 'Austria', tz: 'Europe/Vienna' },
  { name: 'Prague', country: 'Czechia', tz: 'Europe/Prague' },
  { name: 'Warsaw', country: 'Poland', tz: 'Europe/Warsaw' },
  { name: 'Madrid', country: 'Spain', tz: 'Europe/Madrid' },
  { name: 'Rome', country: 'Italy', tz: 'Europe/Rome' },
  { name: 'Vatican City', country: 'Vatican', tz: 'Europe/Vatican', alt: 'Holy See Tòa Thánh' },
  { name: 'Stockholm', country: 'Sweden', tz: 'Europe/Stockholm' },
  { name: 'Oslo', country: 'Norway', tz: 'Europe/Oslo' },
  { name: 'Copenhagen', country: 'Denmark', tz: 'Europe/Copenhagen' },
  { name: 'Helsinki', country: 'Finland', tz: 'Europe/Helsinki' },
  { name: 'Athens', country: 'Greece', tz: 'Europe/Athens' },
  { name: 'Bucharest', country: 'Romania', tz: 'Europe/Bucharest' },
  { name: 'Kyiv', country: 'Ukraine', tz: 'Europe/Kyiv' },
  { name: 'Moscow', country: 'Russia', tz: 'Europe/Moscow' },
  { name: 'Reykjavik', country: 'Iceland', tz: 'Atlantic/Reykjavik' },
  // Africa
  { name: 'Cairo', country: 'Egypt', tz: 'Africa/Cairo' },
  { name: 'Lagos', country: 'Nigeria', tz: 'Africa/Lagos' },
  { name: 'Nairobi', country: 'Kenya', tz: 'Africa/Nairobi' },
  { name: 'Johannesburg', country: 'South Africa', tz: 'Africa/Johannesburg' },
  { name: 'Casablanca', country: 'Morocco', tz: 'Africa/Casablanca' },
  { name: 'Accra', country: 'Ghana', tz: 'Africa/Accra' },
  { name: 'Addis Ababa', country: 'Ethiopia', tz: 'Africa/Addis_Ababa' },
  // North America
  { name: 'Toronto', country: 'Canada', tz: 'America/Toronto' },
  { name: 'Montreal', country: 'Canada', tz: 'America/Toronto' },
  { name: 'Ottawa', country: 'Canada', tz: 'America/Toronto' },
  { name: 'Vancouver', country: 'Canada', tz: 'America/Vancouver' },
  { name: 'Calgary', country: 'Canada', tz: 'America/Edmonton' },
  { name: 'Edmonton', country: 'Canada', tz: 'America/Edmonton' },
  { name: 'Winnipeg', country: 'Canada', tz: 'America/Winnipeg' },
  { name: 'Regina', country: 'Canada', tz: 'America/Regina' },
  { name: 'Halifax', country: 'Canada', tz: 'America/Halifax' },
  { name: "St. John's", country: 'Canada', tz: 'America/St_Johns' },
  { name: 'New York', country: 'USA', tz: 'America/New_York' },
  { name: 'Washington, D.C.', country: 'USA', tz: 'America/New_York' },
  { name: 'Boston', country: 'USA', tz: 'America/New_York' },
  { name: 'Atlanta', country: 'USA', tz: 'America/New_York' },
  { name: 'Miami', country: 'USA', tz: 'America/New_York' },
  { name: 'Chicago', country: 'USA', tz: 'America/Chicago' },
  { name: 'Houston', country: 'USA', tz: 'America/Chicago' },
  { name: 'Dallas', country: 'USA', tz: 'America/Chicago' },
  { name: 'New Orleans', country: 'USA', tz: 'America/Chicago' },
  { name: 'Denver', country: 'USA', tz: 'America/Denver' },
  { name: 'Phoenix', country: 'USA', tz: 'America/Phoenix' },
  { name: 'Los Angeles', country: 'USA', tz: 'America/Los_Angeles' },
  { name: 'San Francisco', country: 'USA', tz: 'America/Los_Angeles' },
  { name: 'San Jose', country: 'USA', tz: 'America/Los_Angeles' },
  { name: 'Seattle', country: 'USA', tz: 'America/Los_Angeles' },
  { name: 'Anchorage', country: 'USA', tz: 'America/Anchorage' },
  { name: 'Honolulu', country: 'USA', tz: 'Pacific/Honolulu' },
  { name: 'Mexico City', country: 'Mexico', tz: 'America/Mexico_City' },
  // Central & South America
  { name: 'Guatemala City', country: 'Guatemala', tz: 'America/Guatemala' },
  { name: 'Havana', country: 'Cuba', tz: 'America/Havana' },
  { name: 'Bogotá', country: 'Colombia', tz: 'America/Bogota' },
  { name: 'Lima', country: 'Peru', tz: 'America/Lima' },
  { name: 'Caracas', country: 'Venezuela', tz: 'America/Caracas' },
  { name: 'Santiago', country: 'Chile', tz: 'America/Santiago' },
  { name: 'Buenos Aires', country: 'Argentina', tz: 'America/Argentina/Buenos_Aires' },
  { name: 'São Paulo', country: 'Brazil', tz: 'America/Sao_Paulo' },
  { name: 'Rio de Janeiro', country: 'Brazil', tz: 'America/Sao_Paulo' },
  // Oceania
  { name: 'Sydney', country: 'Australia', tz: 'Australia/Sydney' },
  { name: 'Melbourne', country: 'Australia', tz: 'Australia/Melbourne' },
  { name: 'Brisbane', country: 'Australia', tz: 'Australia/Brisbane' },
  { name: 'Adelaide', country: 'Australia', tz: 'Australia/Adelaide' },
  { name: 'Perth', country: 'Australia', tz: 'Australia/Perth' },
  { name: 'Darwin', country: 'Australia', tz: 'Australia/Darwin' },
  { name: 'Auckland', country: 'New Zealand', tz: 'Pacific/Auckland' },
  { name: 'Fiji', country: 'Fiji', tz: 'Pacific/Fiji' },
  { name: 'Guam', country: 'USA', tz: 'Pacific/Guam' },
  // UTC
  { name: 'UTC', country: 'Coordinated Universal Time', tz: 'UTC', alt: 'GMT Zulu' },
];

function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

/** Search cities by name/country/alt name (accent-insensitive) and raw IANA zone ids. */
export function searchCities(query: string, allZones: string[] = [], limit = 30): City[] {
  const q = normalize(query.trim());
  if (!q) return CITIES.slice(0, limit);
  const hits = CITIES.filter((c) => normalize(`${c.name} ${c.country} ${c.alt ?? ''} ${c.tz}`).includes(q));
  const known = new Set(hits.map((c) => c.tz));
  for (const tz of allZones) {
    if (hits.length >= limit) break;
    if (known.has(tz)) continue;
    if (normalize(tz.replace(/_/g, ' ')).includes(q)) {
      const name = tz.split('/').pop()!.replace(/_/g, ' ');
      hits.push({ name, country: tz.split('/')[0], tz });
      known.add(tz);
    }
  }
  return hits.slice(0, limit);
}
