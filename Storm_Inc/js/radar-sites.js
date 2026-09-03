/**
 * radar-sites.js
 * 真实雷达站点与主要城市数据 (用于全屏雷达画面上的地理标注)。
 * 坐标取站点/城市中心的近似值。NEXRAD 使用站点代号, 其他以城市+机构命名。
 */

// 真实雷达站点 (全球主要台站)
export const RADAR_SITES = [
    // --- 美国 NEXRAD ---
    { id: 'KBUF', name: 'BUFFALO NY', lat: 42.94, lon: -78.74 },
    { id: 'KOKX', name: 'NEW YORK (UPTON)', lat: 40.87, lon: -72.86 },
    { id: 'KBOX', name: 'BOSTON', lat: 41.96, lon: -71.14 },
    { id: 'KLWX', name: 'WASHINGTON (STERLING)', lat: 38.98, lon: -77.48 },
    { id: 'KDOX', name: 'DOVER DE', lat: 38.83, lon: -75.44 },
    { id: 'KRAX', name: 'RALEIGH NC', lat: 35.67, lon: -78.49 },
    { id: 'KCLX', name: 'CHARLESTON SC', lat: 32.66, lon: -81.04 },
    { id: 'KMLB', name: 'MELBOURNE FL', lat: 28.11, lon: -80.65 },
    { id: 'KAMX', name: 'MIAMI FL', lat: 25.61, lon: -80.41 },
    { id: 'KJAX', name: 'JACKSONVILLE FL', lat: 30.49, lon: -81.70 },
    { id: 'KTBW', name: 'TAMPA FL', lat: 27.71, lon: -82.40 },
    { id: 'KATX', name: 'SEATTLE WA', lat: 48.19, lon: -122.50 },
    { id: 'KMUX', name: 'SAN FRANCISCO', lat: 37.15, lon: -121.90 },
    { id: 'KVBX', name: 'LOS ANGELES (VANDENBERG)', lat: 34.84, lon: -120.40 },
    { id: 'KNKX', name: 'SAN DIEGO', lat: 32.93, lon: -117.04 },
    { id: 'KDAX', name: 'SACRAMENTO', lat: 38.50, lon: -121.68 },
    { id: 'KFWS', name: 'DALLAS/FT. WORTH', lat: 32.57, lon: -97.30 },
    { id: 'KTLX', name: 'OKLAHOMA CITY', lat: 35.33, lon: -97.28 },
    { id: 'KHGX', name: 'HOUSTON/GALVESTON', lat: 29.47, lon: -95.08 },
    { id: 'KLCH', name: 'LAKE CHARLES LA', lat: 30.13, lon: -93.22 },
    { id: 'KGRK', name: 'AUSTIN TX', lat: 30.72, lon: -97.38 },
    { id: 'KBRO', name: 'BROWNSVILLE TX', lat: 25.92, lon: -97.42 },
    { id: 'KILX', name: 'CHICAGO (LINCOLN)', lat: 40.15, lon: -89.34 },
    { id: 'KLOT', name: 'CHICAGO (ROMEOVILLE)', lat: 41.60, lon: -88.08 },
    { id: 'KDTX', name: 'DETROIT', lat: 42.70, lon: -83.47 },
    { id: 'KGRR', name: 'GRAND RAPIDS MI', lat: 42.89, lon: -85.54 },
    { id: 'KMPX', name: 'MINNEAPOLIS', lat: 44.85, lon: -93.57 },
    { id: 'KFSD', name: 'SIOUX FALLS SD', lat: 43.59, lon: -96.73 },
    { id: 'KABR', name: 'ABERDEEN SD', lat: 45.45, lon: -98.41 },
    { id: 'KOAX', name: 'OMAHA NE', lat: 41.32, lon: -96.37 },
    { id: 'KICT', name: 'WICHITA KS', lat: 37.65, lon: -97.44 },
    { id: 'KLSX', name: 'ST. LOUIS', lat: 38.70, lon: -90.68 },
    { id: 'KEAX', name: 'KANSAS CITY', lat: 38.81, lon: -94.27 },
    { id: 'KFTG', name: 'DENVER', lat: 39.79, lon: -104.55 },
    { id: 'KMTX', name: 'SALT LAKE CITY', lat: 41.26, lon: -112.45 },
    { id: 'KIWA', name: 'PHOENIX AZ', lat: 33.29, lon: -111.67 },
    { id: 'KEMX', name: 'TUCSON AZ', lat: 31.89, lon: -110.63 },
    { id: 'KABX', name: 'ALBUQUERQUE NM', lat: 35.15, lon: -106.82 },
    { id: 'KESX', name: 'LAS VEGAS NV', lat: 36.24, lon: -114.89 },
    { id: 'KRTX', name: 'PORTLAND OR', lat: 45.72, lon: -122.97 },
    { id: 'KOTX', name: 'SPOKANE WA', lat: 47.68, lon: -117.63 },
    { id: 'KTFX', name: 'GREAT FALLS MT', lat: 47.46, lon: -111.39 },
    { id: 'KRIW', name: 'RIVERTON WY', lat: 43.07, lon: -108.48 },
    { id: 'KBIS', name: 'BISMARCK ND', lat: 46.77, lon: -100.76 },
    { id: 'KMVX', name: 'GRAND FORKS ND', lat: 47.53, lon: -97.33 },
    { id: 'KDLH', name: 'DULUTH MN', lat: 46.84, lon: -92.21 },
    { id: 'KGRB', name: 'GREEN BAY WI', lat: 44.50, lon: -88.11 },
    { id: 'KMKX', name: 'MILWAUKEE', lat: 42.97, lon: -88.55 },
    { id: 'KPBZ', name: 'PITTSBURGH PA', lat: 40.53, lon: -80.22 },
    { id: 'KCCX', name: 'STATE COLLEGE PA', lat: 40.92, lon: -78.00 },
    { id: 'KGYX', name: 'PORTLAND ME', lat: 43.89, lon: -70.26 },
    { id: 'KCBW', name: 'HOULTON ME', lat: 46.04, lon: -67.81 },
    { id: 'KTYX', name: 'FORT DRUM NY', lat: 43.76, lon: -75.68 },
    { id: 'KENX', name: 'ALBANY NY', lat: 42.59, lon: -74.06 },
    // 夏威夷 / 关岛 / 波多黎各
    { id: 'PHKI', name: 'KAUAI HI', lat: 21.89, lon: -159.55 },
    { id: 'PHMO', name: 'MOLOKAI HI', lat: 21.13, lon: -157.18 },
    { id: 'PHWA', name: 'BIG ISLAND HI', lat: 19.10, lon: -155.57 },
    { id: 'PGUA', name: 'GUAM', lat: 13.46, lon: 144.83 },
    { id: 'TJUA', name: 'SAN JUAN PR', lat: 18.12, lon: -66.08 },
    // 加拿大
    { id: 'XFT', name: 'VANCOUVER (ALDERGROVE)', lat: 49.06, lon: -122.46 },
    { id: 'XSS', name: 'TORONTO (KING CITY)', lat: 44.06, lon: -79.57 },
    { id: 'XWL', name: 'MONTREAL (BLAINVILLE)', lat: 45.66, lon: -73.89 },
    { id: 'XHB', name: 'HALIFAX (BEAVER ISLAND)', lat: 44.82, lon: -62.34 },
    // 亚洲 / 西太平洋
    { id: 'JMA-TOKYO', name: 'TOKYO (JMA)', lat: 35.60, lon: 139.90 },
    { id: 'JMA-OKINAWA', name: 'OKINAWA (JMA)', lat: 26.20, lon: 127.70 },
    { id: 'JMA-SAPPORO', name: 'SAPPORO (JMA)', lat: 43.10, lon: 141.40 },
    { id: 'CWB-TAIPEI', name: 'TAIPEI (CWB)', lat: 25.06, lon: 121.47 },
    { id: 'CWB-CHIAYI', name: 'CHIAYI (CWB)', lat: 23.50, lon: 120.50 },
    { id: 'HKO-HONGKONG', name: 'HONG KONG (HKO)', lat: 22.36, lon: 114.22 },
    { id: 'KMA-SEOUL', name: 'SEOUL (KMA)', lat: 37.40, lon: 126.90 },
    { id: 'KMA-BUSAN', name: 'BUSAN (KMA)', lat: 35.20, lon: 129.10 },
    { id: 'CMA-BEIJING', name: 'BEIJING (CMA)', lat: 39.90, lon: 116.40 },
    { id: 'CMA-SHANGHAI', name: 'SHANGHAI (CMA)', lat: 31.20, lon: 121.50 },
    { id: 'PAGASA-SUBIC', name: 'SUBIC BAY (PAGASA)', lat: 14.78, lon: 120.27 },
    { id: 'PAGASA-CEBU', name: 'CEBU (PAGASA)', lat: 10.32, lon: 123.90 },
    // 澳洲 / 新西兰
    { id: 'BOM-DARWIN', name: 'DARWIN (BoM)', lat: -12.40, lon: 130.90 },
    { id: 'BOM-BRISBANE', name: 'BRISBANE (BoM)', lat: -27.50, lon: 153.00 },
    { id: 'BOM-SYDNEY', name: 'SYDNEY (BoM)', lat: -33.90, lon: 151.20 },
    { id: 'BOM-MELBOURNE', name: 'MELBOURNE (BoM)', lat: -37.86, lon: 144.76 },
    { id: 'NZM-AUCKLAND', name: 'AUCKLAND (MetService)', lat: -36.90, lon: 174.70 },
    // 南亚 / 东南亚
    { id: 'IMD-MUMBAI', name: 'MUMBAI (IMD)', lat: 19.10, lon: 72.90 },
    { id: 'IMD-CHENNAI', name: 'CHENNAI (IMD)', lat: 13.00, lon: 80.20 },
    { id: 'IMD-KOLKATA', name: 'KOLKATA (IMD)', lat: 22.60, lon: 88.40 },
    { id: 'BMKG-JAKARTA', name: 'JAKARTA (BMKG)', lat: -6.20, lon: 106.80 },
    { id: 'MSS-SINGAPORE', name: 'SINGAPORE (MSS)', lat: 1.36, lon: 104.00 },
    { id: 'TMD-BANGKOK', name: 'BANGKOK (TMD)', lat: 13.70, lon: 100.60 },
    // 欧洲 / 非洲 / 中东
    { id: 'UK-LONDON', name: 'LONDON (Met Office)', lat: 51.50, lon: 0.00 },
    { id: 'DE-BERLIN', name: 'BERLIN (DWD)', lat: 52.50, lon: 13.40 },
    { id: 'FR-PARIS', name: 'PARIS (Météo-France)', lat: 48.90, lon: 2.30 },
    { id: 'RU-MOSCOW', name: 'MOSCOW', lat: 55.70, lon: 37.60 },
    { id: 'SA-JOHANNESBURG', name: 'JOHANNESBURG (SAWS)', lat: -26.20, lon: 28.00 },
    { id: 'SA-CAPETOWN', name: 'CAPE TOWN (SAWS)', lat: -33.90, lon: 18.40 },
    { id: 'EG-CAIRO', name: 'CAIRO (EMA)', lat: 30.00, lon: 31.20 },
    // 南美 / 中美
    { id: 'MX-MEXICO', name: 'MEXICO CITY (SMN)', lat: 19.40, lon: -99.10 },
    { id: 'BR-RIO', name: 'RIO DE JANEIRO (INMET)', lat: -22.90, lon: -43.20 },
    { id: 'AR-BUENOSAIRES', name: 'BUENOS AIRES (SMN)', lat: -34.60, lon: -58.40 },
    { id: 'CL-SANTIAGO', name: 'SANTIAGO (DMC)', lat: -33.40, lon: -70.70 }
];

// 主要城市 (用于雷达画面中的城市标注; rank 1 = 更重要)
export const CITIES = [
    // 北美
    { name: 'New York', lat: 40.71, lon: -74.01, rank: 1 }, { name: 'Los Angeles', lat: 34.05, lon: -118.24, rank: 1 },
    { name: 'Chicago', lat: 41.88, lon: -87.63, rank: 1 }, { name: 'Houston', lat: 29.76, lon: -95.37, rank: 1 },
    { name: 'Phoenix', lat: 33.45, lon: -112.07, rank: 1 }, { name: 'Philadelphia', lat: 39.95, lon: -75.17, rank: 1 },
    { name: 'San Antonio', lat: 29.42, lon: -98.49, rank: 1 }, { name: 'San Diego', lat: 32.72, lon: -117.16, rank: 1 },
    { name: 'Dallas', lat: 32.78, lon: -96.80, rank: 1 }, { name: 'San Francisco', lat: 37.77, lon: -122.42, rank: 1 },
    { name: 'Austin', lat: 30.27, lon: -97.74, rank: 2 }, { name: 'Seattle', lat: 47.61, lon: -122.33, rank: 1 },
    { name: 'Denver', lat: 39.74, lon: -104.99, rank: 1 }, { name: 'Boston', lat: 42.36, lon: -71.06, rank: 1 },
    { name: 'Washington DC', lat: 38.91, lon: -77.04, rank: 1 }, { name: 'Miami', lat: 25.76, lon: -80.19, rank: 1 },
    { name: 'Atlanta', lat: 33.75, lon: -84.39, rank: 1 }, { name: 'New Orleans', lat: 29.95, lon: -90.07, rank: 1 },
    { name: 'Minneapolis', lat: 44.98, lon: -93.27, rank: 1 }, { name: 'Detroit', lat: 42.33, lon: -83.05, rank: 1 },
    { name: 'Toronto', lat: 43.65, lon: -79.38, rank: 1 }, { name: 'Montreal', lat: 45.50, lon: -73.57, rank: 1 },
    { name: 'Vancouver', lat: 49.28, lon: -123.12, rank: 1 }, { name: 'Mexico City', lat: 19.43, lon: -99.13, rank: 1 },
    { name: 'Monterrey', lat: 25.69, lon: -100.32, rank: 2 }, { name: 'Guadalajara', lat: 20.67, lon: -103.35, rank: 2 },
    { name: 'Honolulu', lat: 21.31, lon: -157.86, rank: 1 }, { name: 'Havana', lat: 23.11, lon: -82.37, rank: 2 },
    { name: 'San Juan', lat: 18.47, lon: -66.11, rank: 2 }, { name: 'Las Vegas', lat: 36.17, lon: -115.14, rank: 1 },
    // 中/南美
    { name: 'Panama City', lat: 8.98, lon: -79.52, rank: 2 }, { name: 'Caracas', lat: 10.48, lon: -66.90, rank: 2 },
    { name: 'Bogotá', lat: 4.71, lon: -74.07, rank: 1 }, { name: 'Lima', lat: -12.05, lon: -77.04, rank: 1 },
    { name: 'Santiago', lat: -33.45, lon: -70.67, rank: 1 }, { name: 'Buenos Aires', lat: -34.60, lon: -58.38, rank: 1 },
    { name: 'São Paulo', lat: -23.55, lon: -46.63, rank: 1 }, { name: 'Rio de Janeiro', lat: -22.91, lon: -43.17, rank: 1 },
    { name: 'Recife', lat: -8.05, lon: -34.88, rank: 2 }, { name: 'Salvador', lat: -12.97, lon: -38.50, rank: 2 },
    // 欧洲
    { name: 'London', lat: 51.51, lon: -0.13, rank: 1 }, { name: 'Paris', lat: 48.86, lon: 2.35, rank: 1 },
    { name: 'Berlin', lat: 52.52, lon: 13.41, rank: 1 }, { name: 'Madrid', lat: 40.42, lon: -3.70, rank: 1 },
    { name: 'Barcelona', lat: 41.39, lon: 2.17, rank: 2 }, { name: 'Rome', lat: 41.90, lon: 12.50, rank: 1 },
    { name: 'Milan', lat: 45.46, lon: 9.19, rank: 2 }, { name: 'Amsterdam', lat: 52.37, lon: 4.90, rank: 1 },
    { name: 'Brussels', lat: 50.85, lon: 4.35, rank: 2 }, { name: 'Lisbon', lat: 38.72, lon: -9.14, rank: 1 },
    { name: 'Dublin', lat: 53.35, lon: -6.26, rank: 2 }, { name: 'Copenhagen', lat: 55.68, lon: 12.57, rank: 2 },
    { name: 'Stockholm', lat: 59.33, lon: 18.07, rank: 2 }, { name: 'Oslo', lat: 59.91, lon: 10.75, rank: 2 },
    { name: 'Helsinki', lat: 60.17, lon: 24.94, rank: 2 }, { name: 'Warsaw', lat: 52.23, lon: 21.01, rank: 2 },
    { name: 'Prague', lat: 50.08, lon: 14.44, rank: 2 }, { name: 'Vienna', lat: 48.21, lon: 16.37, rank: 2 },
    { name: 'Athens', lat: 37.98, lon: 23.73, rank: 2 }, { name: 'Istanbul', lat: 41.01, lon: 28.98, rank: 1 },
    { name: 'Moscow', lat: 55.76, lon: 37.62, rank: 1 }, { name: 'St Petersburg', lat: 59.94, lon: 30.31, rank: 2 },
    { name: 'Reykjavik', lat: 64.15, lon: -21.94, rank: 2 },
    // 非洲 / 中东
    { name: 'Cairo', lat: 30.04, lon: 31.24, rank: 1 }, { name: 'Algiers', lat: 36.75, lon: 3.06, rank: 2 },
    { name: 'Casablanca', lat: 33.57, lon: -7.59, rank: 2 }, { name: 'Lagos', lat: 6.52, lon: 3.38, rank: 1 },
    { name: 'Accra', lat: 5.60, lon: -0.19, rank: 2 }, { name: 'Nairobi', lat: -1.29, lon: 36.82, rank: 2 },
    { name: 'Cape Town', lat: -33.92, lon: 18.42, rank: 1 }, { name: 'Johannesburg', lat: -26.20, lon: 28.05, rank: 1 },
    { name: 'Dubai', lat: 25.20, lon: 55.27, rank: 1 }, { name: 'Abu Dhabi', lat: 24.45, lon: 54.38, rank: 2 },
    { name: 'Riyadh', lat: 24.71, lon: 46.68, rank: 1 }, { name: 'Tehran', lat: 35.69, lon: 51.39, rank: 1 },
    { name: 'Baghdad', lat: 33.31, lon: 44.37, rank: 2 }, { name: 'Karachi', lat: 24.86, lon: 67.01, rank: 1 },
    { name: 'Tel Aviv', lat: 32.09, lon: 34.78, rank: 2 },
    // 亚洲
    { name: 'Tokyo', lat: 35.68, lon: 139.69, rank: 1 }, { name: 'Yokohama', lat: 35.44, lon: 139.64, rank: 1 },
    { name: 'Osaka', lat: 34.69, lon: 135.50, rank: 1 }, { name: 'Nagoya', lat: 35.18, lon: 136.91, rank: 1 },
    { name: 'Sapporo', lat: 43.06, lon: 141.35, rank: 1 }, { name: 'Sendai', lat: 38.27, lon: 140.87, rank: 2 },
    { name: 'Fukuoka', lat: 33.59, lon: 130.40, rank: 2 }, { name: 'Hiroshima', lat: 34.39, lon: 132.46, rank: 2 },
    { name: 'Taipei', lat: 25.03, lon: 121.57, rank: 1 }, { name: 'Kaohsiung', lat: 22.62, lon: 120.31, rank: 1 },
    { name: 'Hong Kong', lat: 22.32, lon: 114.17, rank: 1 }, { name: 'Macau', lat: 22.20, lon: 113.55, rank: 2 },
    { name: 'Seoul', lat: 37.57, lon: 126.98, rank: 1 }, { name: 'Busan', lat: 35.18, lon: 129.08, rank: 1 },
    { name: 'Incheon', lat: 37.46, lon: 126.71, rank: 2 }, { name: 'Beijing', lat: 39.90, lon: 116.41, rank: 1 },
    { name: 'Tianjin', lat: 39.13, lon: 117.20, rank: 2 }, { name: 'Shanghai', lat: 31.23, lon: 121.47, rank: 1 },
    { name: 'Shenzhen', lat: 22.54, lon: 114.06, rank: 1 }, { name: 'Guangzhou', lat: 23.13, lon: 113.26, rank: 1 },
    { name: 'Xiamen', lat: 24.48, lon: 118.09, rank: 2 }, { name: 'Qingdao', lat: 36.07, lon: 120.38, rank: 2 },
    { name: 'Manila', lat: 14.60, lon: 120.98, rank: 1 }, { name: 'Cebu City', lat: 10.32, lon: 123.89, rank: 2 },
    { name: 'Davao', lat: 7.07, lon: 125.61, rank: 2 }, { name: 'Hanoi', lat: 21.03, lon: 105.85, rank: 1 },
    { name: 'Ho Chi Minh City', lat: 10.82, lon: 106.63, rank: 1 }, { name: 'Bangkok', lat: 13.76, lon: 100.50, rank: 1 },
    { name: 'Singapore', lat: 1.35, lon: 103.82, rank: 1 }, { name: 'Kuala Lumpur', lat: 3.14, lon: 101.69, rank: 1 },
    { name: 'Jakarta', lat: -6.21, lon: 106.85, rank: 1 }, { name: 'Surabaya', lat: -7.26, lon: 112.75, rank: 2 },
    { name: 'Denpasar', lat: -8.65, lon: 115.22, rank: 2 }, { name: 'Mumbai', lat: 19.08, lon: 72.88, rank: 1 },
    { name: 'Delhi', lat: 28.61, lon: 77.21, rank: 1 }, { name: 'Kolkata', lat: 22.57, lon: 88.36, rank: 1 },
    { name: 'Chennai', lat: 13.08, lon: 80.27, rank: 1 }, { name: 'Dhaka', lat: 23.81, lon: 90.41, rank: 1 },
    { name: 'Colombo', lat: 6.93, lon: 79.85, rank: 2 }, { name: 'Yangon', lat: 16.87, lon: 96.20, rank: 2 },
    // 澳洲 / 大洋洲
    { name: 'Perth', lat: -31.95, lon: 115.86, rank: 1 }, { name: 'Sydney', lat: -33.87, lon: 151.21, rank: 1 },
    { name: 'Melbourne', lat: -37.81, lon: 144.96, rank: 1 }, { name: 'Brisbane', lat: -27.47, lon: 153.03, rank: 1 },
    { name: 'Darwin', lat: -12.46, lon: 130.84, rank: 2 }, { name: 'Cairns', lat: -16.92, lon: 145.77, rank: 2 },
    { name: 'Auckland', lat: -36.85, lon: 174.76, rank: 1 }, { name: 'Wellington', lat: -41.29, lon: 174.78, rank: 2 },
    { name: 'Nouméa', lat: -22.28, lon: 166.46, rank: 2 }
];

const RAD = Math.PI / 180;

// 球面距离 (km)
export function haversineKm(lat1, lon1, lat2, lon2) {
    const dLat = (lat2 - lat1) * RAD;
    const dLon = (lon2 - lon1) * RAD;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * RAD) * Math.cos(lat2 * RAD) * Math.sin(dLon / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(a)));
}

// 查找最近的真实雷达站点
export function findNearestRadarSite(lat, lon, maxKm = 1500) {
    let best = null;
    let bestKm = Infinity;
    for (const site of RADAR_SITES) {
        const km = haversineKm(lat, lon, site.lat, site.lon);
        if (km < bestKm) { bestKm = km; best = site; }
    }
    return best && bestKm <= maxKm ? { site: best, km: bestKm } : null;
}
