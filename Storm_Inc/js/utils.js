/**
 * utils.js
 * 包含所有通用的、无状态的辅助函数。
 */
export const NAME_LISTS = {
    'WPAC': [
        'Damrey', 'Haikui', 'Kirogi', 'Yun-yeung', 'Koinu', 'Bolaven', 'Sanba', 'Jelawat', 'Ewiniar', 'Maliksi', 'Gaemi', 'Prapiroon', 'Maria', 'Son-Tinh',
        'Ampil', 'Wukong', 'Jongdari', 'Shanshan', 'Yagi', 'Leepi', 'Bebinca', 'Pulasan', 'Soulik', 'Cimaron', 'Jebi', 'Krathon', 'Barijat', 'Trami',
        'Kong-rey', 'Yinxing', 'Toraji', 'Man-yi', 'Usagi', 'Pabuk', 'Wutip', 'Sepat', 'Mun', 'Danas', 'Nari', 'Wipha', 'Francisco', 'Co-May',
        'Krosa', 'Bailu', 'Podul', 'Lingling', 'Kajiki', 'Nongfa', 'Peipah', 'Tapah', 'Mitag', 'Ragasa', 'Neoguri', 'Bualoi', 'Matmo', 'Halong',
        'Nakri', 'Fengshen', 'Kalmaegi', 'Fung-wong', 'Koto', 'Nokaen', 'Penha', 'Nuri', 'Sinlaku', 'Hagupit', 'Jangmi', 'Mekkhala', 'Higos', 'Bavi',
        'Maysak', 'Haishen', 'Noul', 'Dolphin', 'Kujira', 'Chan-hom', 'Peilou', 'Nangka', 'Saudel', 'Narra', 'Gaenari', 'Atsani', 'Etau', 'Bang-Lang',
        'Krovanh', 'Dujuan', 'Surigae', 'Choi-wan', 'Koguma', 'Champi', 'In-fa', 'Cempaka', 'Nepartak', 'Lupit', 'Mirinae', 'Nida', 'Omais', 'Luc-Binh',
        'Chanthu', 'Dianmu', 'Mindulle', 'Lionrock', 'Tokei', 'Namtheun', 'Malou', 'Nyatoh', 'Sarbul', 'Amuyao', 'Gosari', 'Chaba', 'Aere', 'Songda',
        'Trases', 'Mulan', 'Meari', 'Tsing-ma', 'Tokage', 'Ong-mang', 'Muifa', 'Merbok', 'Nanmadol', 'Talas', 'Hodu', 'Kulap', 'Roke', 'Sonca',
        'Nesat', 'Haitang', 'Jamjari', 'Banyan', 'Yamaneko', 'Pakhar', 'Sanvu', 'Mawar', 'Guchol', 'Talim', 'Bori', 'Khanun', 'Lan', 'Saobien'
    ],

    'NIO': [
        'Nisarga', 'Gati', 'Nivar', 'Burevi', 'Tauktae', 'Yaas', 'Gulab', 'Shaheen', 'Jawad', 'Asani', 'Sitrang', 'Mandous', 'Mocha',
        'Biparjoy', 'Tej', 'Hamoon', 'Michaung', 'Remal', 'Asna', 'Dana', 'Fengal', 'Shakthi', 'Montha', 'Senyar', 'Ditwah', 'Afoor',
        'Arnab', 'Muran', 'Uru', 'Ana', 'Baan', 'Phet', 'Gaur', 'Rahgu', 'Chhas', 'Ajar', 'Probaho', 'Jurzum', 'Bhumra',
        'Upakul', 'Aag', 'Vyom', 'Bojon', 'Jinkul', 'Pha', 'Shobha', 'Umban', 'Udita', 'Maha', 'Odi', 'Kenda', 'Ghenim',
        'Barshon', 'Neer', 'Gagan', 'Zum', 'Lisu', 'Yan', 'Prabhanjan', 'Titli', 'Teer', 'Ghuman', 'Ghambhira', 'Naseem', 'Pheru',
        'Nishit', 'Prabho', 'Jhar', 'Upana', 'Ambud', 'Singha', 'Ghurni', 'Viyana', 'Baru', 'Ghasha', 'Kurum', 'Saffar', 'Karo'
    ],

    'SATL': [
        'Arani', 'Bapu', 'Cari', 'Deni', 'Ecaí', 'Guará', 'Iba', 'Jaguar', 'Kurumí', 'Mani', 'Oquira', 'Potira', 'Raoni', 'Ubá', 'Yakecan',
        'Akará', 'Biguá', 'Caue', 'Domó', 'Endy', 'Guarani', 'Iguaçú', 'Jaci', 'Kaeté', 'Maracá', 'Okara', 'Poti', 'Reri', 'Sumé', 'Tupã',
        'Upaba', 'Votu', 'Ybba', 'Zeus'
    ]
};

// Annual naming metadata.
//
// Real basins do not share one giant per-season list. They follow two schemes:
//  - NATL / EPAC (NHC): six official lists in a six-year rotation. The 2024 and
//    2025 rows are the *historical* lists actually used those seasons (Beryl,
//    Helene, Milton, ...). The 2026-2031 rows are the current published lists,
//    with WMO retirements and replacements already applied (Imani, Brianna,
//    Holly, Miguel, Jake, Debora, Otilio, Winnie, ...). Other years cycle the
//    2026-2031 rows, exactly like the real six-year cycle (2032 = 2026 list).
//  - SIO (SW Indian Ocean): the WMO/Tropical Cyclone Committee annual lists.
//    Rows are keyed by the calendar year of each season's core activity
//    (2024 = 2023-24 season ... 2028 = 2027-28 season) and cycle afterwards.
//  - SHEM (Australian region / South Pacific): published A-Z list variants,
//    rotated one per season (approximation of the BoM/RSMC-Nadi lists).
//  - WPAC / NIO / SATL stay in NAME_LISTS: their real schemes are single
//    sequential published pools (JMA 140-name list, IMD pool, Brazilian Navy
//    pool) reused in order, not a yearly rotation.
export const SEASONAL_NAME_LISTS = {
    'NATL': {
        cycleStart: 2026,
        historical: {
            2024: ['Alberto', 'Beryl', 'Chris', 'Debby', 'Ernesto', 'Francine', 'Gordon', 'Helene', 'Isaac', 'Joyce', 'Kirk', 'Leslie', 'Milton', 'Nadine', 'Oscar', 'Patty', 'Rafael', 'Sara', 'Tony', 'Valerie', 'William'],
            2025: ['Andrea', 'Barry', 'Chantal', 'Dexter', 'Erin', 'Fernand', 'Gabrielle', 'Humberto', 'Imelda', 'Jerry', 'Karen', 'Lorenzo', 'Melissa', 'Nestor', 'Olga', 'Pablo', 'Rebekah', 'Sebastien', 'Tanya', 'Van', 'Wendy']
        },
        cycle: [
            ['Arthur', 'Bertha', 'Cristobal', 'Dolly', 'Edouard', 'Fay', 'Gonzalo', 'Hanna', 'Isaias', 'Josephine', 'Kyle', 'Leah', 'Marco', 'Nana', 'Omar', 'Paulette', 'Rene', 'Sally', 'Teddy', 'Vicky', 'Wilfred'],
            ['Ana', 'Bill', 'Claudette', 'Danny', 'Elsa', 'Fred', 'Grace', 'Henri', 'Imani', 'Julian', 'Kate', 'Larry', 'Mindy', 'Nicholas', 'Odette', 'Peter', 'Rose', 'Sam', 'Teresa', 'Victor', 'Wanda'],
            ['Alex', 'Bonnie', 'Colin', 'Danielle', 'Earl', 'Farrah', 'Gaston', 'Hermine', 'Idris', 'Julia', 'Karl', 'Lisa', 'Martin', 'Nicole', 'Owen', 'Paula', 'Richard', 'Shary', 'Tobias', 'Virginie', 'Walter'],
            ['Arlene', 'Bret', 'Cindy', 'Don', 'Emily', 'Franklin', 'Gert', 'Harold', 'Idalia', 'Jose', 'Katia', 'Lee', 'Margot', 'Nigel', 'Ophelia', 'Philippe', 'Rina', 'Sean', 'Tammy', 'Vince', 'Whitney'],
            ['Alberto', 'Brianna', 'Chris', 'Debby', 'Ernesto', 'Francine', 'Gordon', 'Holly', 'Isaac', 'Joyce', 'Kirk', 'Leslie', 'Miguel', 'Nadine', 'Oscar', 'Patty', 'Rafael', 'Sara', 'Tony', 'Valerie', 'William'],
            ['Andrea', 'Barry', 'Chantal', 'Dexter', 'Erin', 'Fernand', 'Gabrielle', 'Humberto', 'Imelda', 'Jerry', 'Karen', 'Lorenzo', 'Molly', 'Nestor', 'Olga', 'Pablo', 'Rebekah', 'Sebastien', 'Tanya', 'Van', 'Wendy']
        ]
    },
    'EPAC': {
        cycleStart: 2026,
        historical: {
            2024: ['Aletta', 'Bud', 'Carlotta', 'Daniel', 'Emilia', 'Fabio', 'Gilma', 'Hector', 'Ileana', 'John', 'Kristy', 'Lane', 'Miriam', 'Norman', 'Olivia', 'Paul', 'Rosa', 'Sergio', 'Tara', 'Vicente', 'Willa', 'Xavier', 'Yolanda', 'Zeke'],
            2025: ['Alvin', 'Barbara', 'Cosme', 'Dalila', 'Erick', 'Flossie', 'Gil', 'Henriette', 'Ivo', 'Juliette', 'Kiko', 'Lorena', 'Mario', 'Narda', 'Octave', 'Priscilla', 'Raymond', 'Sonia', 'Tico', 'Velma', 'Wallis', 'Xina', 'York', 'Zelda']
        },
        cycle: [
            ['Amanda', 'Boris', 'Cristina', 'Douglas', 'Elida', 'Fausto', 'Genevieve', 'Hernan', 'Iselle', 'Julio', 'Karina', 'Lowell', 'Marie', 'Norbert', 'Odalys', 'Polo', 'Rachel', 'Simon', 'Trudy', 'Vance', 'Winnie', 'Xavier', 'Yolanda', 'Zeke'],
            ['Andres', 'Blanca', 'Carlos', 'Dolores', 'Enrique', 'Felicia', 'Guillermo', 'Hilda', 'Ignacio', 'Jimena', 'Kevin', 'Linda', 'Marty', 'Nora', 'Olaf', 'Pamela', 'Rick', 'Sandra', 'Terry', 'Vivian', 'Waldo', 'Xina', 'York', 'Zelda'],
            ['Agatha', 'Blas', 'Celia', 'Darby', 'Estelle', 'Frank', 'Georgette', 'Howard', 'Ivette', 'Javier', 'Kay', 'Lester', 'Madeline', 'Newton', 'Orlene', 'Paine', 'Roslyn', 'Seymour', 'Tina', 'Virgil', 'Winifred', 'Xavier', 'Yolanda', 'Zeke'],
            ['Adrian', 'Beatriz', 'Calvin', 'Debora', 'Eugene', 'Fernanda', 'Greg', 'Hilary', 'Irwin', 'Jova', 'Kenneth', 'Lidia', 'Max', 'Norma', 'Otilio', 'Pilar', 'Ramon', 'Selma', 'Todd', 'Veronica', 'Wiley', 'Xina', 'York', 'Zelda'],
            ['Aletta', 'Bud', 'Carlotta', 'Daniel', 'Emilia', 'Fabio', 'Gilma', 'Hector', 'Ileana', 'Jake', 'Kristy', 'Lane', 'Miriam', 'Norman', 'Olivia', 'Paul', 'Rosa', 'Sergio', 'Tara', 'Vicente', 'Willa', 'Xavier', 'Yolanda', 'Zeke'],
            ['Alvin', 'Barbara', 'Cosme', 'Dalila', 'Erick', 'Flossie', 'Gil', 'Henriette', 'Ivo', 'Juliette', 'Kiko', 'Lorena', 'Mario', 'Narda', 'Octave', 'Priscilla', 'Raymond', 'Sonia', 'Tico', 'Velma', 'Wallis', 'Xina', 'York', 'Zelda']
        ]
    },
    'SIO': {
        cycleStart: 2024,
        cycle: [
            ['Alvaro', 'Belal', 'Candice', 'Djoungou', 'Eleanor', 'Filipo', 'Gamane', 'Hidaya', 'Ialy', 'Jeremy', 'Kanga', 'Ludzi', 'Melina', 'Noah', 'Onias', 'Pelagie', 'Quamar', 'Rita', 'Solani', 'Tarik', 'Urilia', 'Vuyane', 'Wagner', 'Xusa', 'Yarona', 'Zacarias'],
            ['Ancha', 'Bheki', 'Chido', 'Dikeledi', 'Elvis', 'Faida', 'Garance', 'Honde', 'Ivone', 'Jude', 'Kanto', 'Lira', 'Maipelo', 'Njazi', 'Oscar', 'Pamela', 'Quentin', 'Rajab', 'Savana', 'Themba', 'Uyapo', 'Viviane', 'Walter', 'Xangy', 'Yemurai', 'Zanele'],
            ['Awo', 'Blossom', 'Chenge', 'Dudzai', 'Ewetse', 'Fytia', 'Gezani', 'Horacio', 'Indusa', 'Juluka', 'Kundai', 'Lisebo', 'Michel', 'Nousra', 'Olivier', 'Pokera', 'Quincy', 'Rebaone', 'Salama', 'Tristan', 'Ursula', 'Violet', 'Wilson', 'Xila', 'Yekela', 'Zaina'],
            ['Agueda', 'Bertrand', 'Celiwe', 'Dira', 'Emmie', 'Fikri', 'Gumbo', 'Hisna', 'Isaura', 'Jeremy', 'Kanga', 'Kalulu', 'Ludzi', 'Melina', 'Noah', 'Onias', 'Oscar', 'Peta', 'Quamar', 'Rita', 'Solani', 'Tarik', 'Urilia', 'Vuyane', 'Wagner', 'Xusa', 'Yarona', 'Zacarias'],
            ['Ainga', 'Basil', 'Cassia', 'Deba', 'Etienne', 'Fatuma', 'Gori', 'Henning', 'Itai', 'Josha', 'Kalulu', 'Letlama', 'Maipelo', 'Njazi', 'Oscar', 'Pamela', 'Quentin', 'Rouma', 'Soary', 'Themba', 'Uyapo', 'Viviane', 'Walter', 'Xavier', 'Yemurai', 'Zanele']
        ]
    },
    'SHEM': {
        cycleStart: 2023,
        cycle: [
            ['Anika', 'Billy', 'Charlotte', 'Darian', 'Ellie', 'Freddy', 'Gabrielle', 'Herman', 'Ilsa', 'Jasper', 'Kirrily', 'Lincoln', 'Megan', 'Neville', 'Olga', 'Paul', 'Robyn', 'Sean', 'Tiffany', 'Urton', 'Vicki'],
            ['Alessia', 'Bruce', 'Catherine', 'Dylan', 'Edna', 'Fletcher', 'Gillian', 'Hadi', 'Ivana', 'Jack', 'Kate', 'Laszlo', 'Mingzhu', 'Nathan', 'Oriana', 'Quincey', 'Raquel', 'Stan', 'Tatiana', 'Uriah', 'Yvette'],
            ['Alfred', 'Blanche', 'Caleb', 'Dara', 'Ernie', 'Frances', 'Greg', 'Hilda', 'Irving', 'Joyce', 'Kelvin', 'Linda', 'Marco', 'Nora', 'Owen', 'Penny', 'Riley', 'Savannah', 'Trevor', 'Veronica', 'Wallace'],
            ['Ana', 'Bina', 'Cody', 'Dovi', 'Eva', 'Fili', 'Gina', 'Hale', 'Irene', 'Judy', 'Kevin', 'Lola', 'Mal', 'Nat', 'Osi', 'Peta', 'Rae', 'Sheila', 'Tam', 'Urmil', 'Vaianu', 'Wati', 'Xavier', 'Yani', 'Zita']
        ]
    }
};

// Basins whose public naming is lettered (a seasonal A/B/C sequence). WPAC
// (JMA) and NIO (IMD) publish plain names with no list letters.
const LETTERED_BASINS = new Set(['NATL', 'EPAC', 'SIO', 'SHEM', 'SATL']);

export const RETIRED_STORM_NAMES = {
    WPAC: ['Haiyan', 'Mangkhut', 'Yutu'],
    EPAC: ['Patricia', 'Otis'],
    NATL: ['Katrina', 'Harvey', 'Irma', 'Maria', 'Dorian'],
    NIO: ['Amphan', 'Tauktae'],
    SIO: ['Idai', 'Kenneth'],
    SHEM: ['Pam', 'Winston'],
    SATL: []
};

export function getSeasonNameList(basin = 'WPAC', year = new Date().getFullYear()) {
    const seasonal = SEASONAL_NAME_LISTS[basin];
    if (seasonal) {
        if (seasonal.historical && seasonal.historical[year]) return [...seasonal.historical[year]];
        const { cycleStart, cycle } = seasonal;
        const index = (((year - cycleStart) % cycle.length) + cycle.length) % cycle.length;
        return [...cycle[index]];
    }
    // Sequential pools (WPAC / NIO / SATL) are copied so callers cannot mutate
    // the canonical list. The year is metadata only: those basins restart at
    // the top of their published list each season.
    const list = NAME_LISTS[basin] || NAME_LISTS.WPAC;
    return [...list];
}

// The lists a season may draw from: its own list first, then the later lists
// in the rotation — a record season rolls over the way the real basins switch
// to their supplemental / next-published list.
function getSeasonListSequence(basin, year) {
    const seasonal = SEASONAL_NAME_LISTS[basin];
    if (!seasonal) return null;
    const sequence = [];
    if (seasonal.historical && seasonal.historical[year]) sequence.push(seasonal.historical[year]);
    const { cycleStart, cycle } = seasonal;
    const start = (((year - cycleStart) % cycle.length) + cycle.length) % cycle.length;
    for (let offset = 0; offset < cycle.length; offset++) {
        sequence.push(cycle[(start + offset) % cycle.length]);
    }
    return sequence;
}

export function isRetiredStormName(name, basin = 'WPAC') {
    if (!name) return false;
    const retired = RETIRED_STORM_NAMES[basin] || [];
    return retired.some(item => item.toLowerCase() === String(name).toLowerCase());
}

export function getStormNameMeta(basin = 'WPAC', index = 0, year = new Date().getFullYear()) {
    const safeIndex = Math.max(0, Number.isFinite(index) ? Math.floor(index) : 0);
    const sequence = getSeasonListSequence(basin, year);
    let name = '';
    let listPosition = 0;
    if (sequence) {
        let remaining = safeIndex;
        let chosen = null;
        for (const list of sequence) {
            if (remaining < list.length) {
                chosen = list;
                listPosition = remaining;
                break;
            }
            remaining -= list.length;
        }
        if (!chosen) {
            chosen = sequence[sequence.length - 1];
            listPosition = remaining % chosen.length;
        }
        name = chosen[listPosition];
    } else {
        const list = NAME_LISTS[basin] || NAME_LISTS.WPAC;
        listPosition = safeIndex % list.length;
        name = list[listPosition];
    }
    const lettered = LETTERED_BASINS.has(basin);
    const letter = lettered && name ? String(name).charAt(0).toUpperCase() : '';
    return {
        name,
        letter,
        index: safeIndex,
        year,
        designation: letter ? `${year}-${letter}` : `${year}-${String(safeIndex + 1).padStart(2, '0')}`,
        retired: isRetiredStormName(name, basin)
    };
}

export function getNextStormNameMeta(basin = 'WPAC', index = 0, year = new Date().getFullYear()) {
    const list = getSeasonNameList(basin, year);
    for (let offset = 0; offset < list.length; offset++) {
        const meta = getStormNameMeta(basin, index + offset, year);
        if (!meta.retired) return meta;
    }
    return getStormNameMeta(basin, index, year);
}

// INVEST identifiers use the operational 90–99 range and a basin suffix.
// They are intentionally separate from the annual storm-name sequence.
export const INVEST_BASIN_CODES = {
    WPAC: 'W',
    EPAC: 'E',
    NATL: 'L',
    NIO: 'A',
    SIO: 'S',
    SHEM: 'S',
    SATL: 'Q'
};

export function getInvestIdentifier(basin = 'WPAC', sequence = 0) {
    const safeSequence = Number.isFinite(Number(sequence)) ? Math.floor(Number(sequence)) : 0;
    const number = 90 + ((safeSequence % 10) + 10) % 10;
    const basinCode = INVEST_BASIN_CODES[basin] || 'W';
    return {
        number,
        basinCode,
        designation: `INVEST ${number}${basinCode}`
    };
}

const NOISE_CONFIG = {
    seed: 12345.67, // 随机种子
    baseScale: 25,  // [关键] 基底噪声的尺度（越大越平滑），建议 20-40
    detailScale: 8, // 细节噪声的尺度
    baseAmp: 1.5,   // 基底噪声幅度 (hPa)
    detailAmp: 0.5  // 细节噪声幅度 (hPa)
};

function pseudoNoise(x, y, seed) {
    // 使用质数乘法来打破周期性，模拟随机感
    const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
    return n - Math.floor(n);
}

function getSmoothNoise(lon, lat, scale, seed) {
    const x = lon / scale;
    const y = lat / scale;
    
    const i = Math.floor(x);
    const j = Math.floor(y);
    
    const fX = x - i;
    const fY = y - j;
    
    //缓动曲线 (Ease curve): 3t^2 - 2t^3，消除晶格感
    const u = fX * fX * (3.0 - 2.0 * fX);
    const v = fY * fY * (3.0 - 2.0 * fY);

    // 获取四个顶点的随机值
    const n00 = pseudoNoise(i, j, seed);
    const n10 = pseudoNoise(i + 1, j, seed);
    const n01 = pseudoNoise(i, j + 1, seed);
    const n11 = pseudoNoise(i + 1, j + 1, seed);

    // 双线性插值
    const nx0 = n00 * (1 - u) + n10 * u;
    const nx1 = n01 * (1 - u) + n11 * u;
    
    return nx0 * (1 - v) + nx1 * v;
}

export function calculateAtmosphericNoise(lon, lat) {
    // 层级 1: 大尺度波动 (决定主要的非线性气流)
    // 减去 0.5 是为了让噪声有正有负 (-0.5 到 0.5)
    const base = (getSmoothNoise(lon, lat, NOISE_CONFIG.baseScale, NOISE_CONFIG.seed) - 0.5) * 2;
    
    // 层级 2: 小尺度细节 (增加仿真感，但不影响大方向)
    const detail = (getSmoothNoise(lon, lat, NOISE_CONFIG.detailScale, NOISE_CONFIG.seed + 100) - 0.5) * 8;

    return (base * NOISE_CONFIG.baseAmp) + (detail * NOISE_CONFIG.detailAmp);
}

export const normalizeLongitude = (lon) => {
    // 健壮的标准化方法：确保结果在 [-180, 180] 之间
    let result = (lon + 180) % 360;
    if (result < 0) result += 360;
    return result - 180;
};

export const shortestLongitudeDistance = (lon1, lon2) => {
    let diff = lon1 - lon2;
    if (diff > 180) {
        diff -= 360;
    } else if (diff < -180) {
        diff += 360;
    }
    return diff;
};

export function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export const unwrapLongitude = (lon, referenceLon) => {
    if (isNaN(referenceLon)) return lon;
    let diff = lon - referenceLon;
    if (Math.abs(diff) > 180) {
        lon += (diff > 0) ? -360 : 360;
    }
    return lon;
};

export function calculateHollandPressure(r, Rm, Pc, Pn) {
    if (r <= 5) return Pc; // 极靠近中心时直接返回中心气压
    // 简化 Holland B 参数取 1.0
    return Pc + (Pn - Pc) * Math.exp(-Rm / r);
}

export function createGeoCircle(centerLon, centerLat, radiusKm, numPoints = 64) {
    const coords = [];
    const radiusRad = radiusKm / 6371; // 地球半径
    const lat1 = centerLat * Math.PI / 180;
    const lon1 = centerLon * Math.PI / 180;

    for (let i = 0; i <= numPoints; i++) {
        const bearing = (i / numPoints) * 2 * Math.PI;
        const lat2 = Math.asin(Math.sin(lat1) * Math.cos(radiusRad) +
                     Math.cos(lat1) * Math.sin(radiusRad) * Math.cos(bearing));
        const lon2 = lon1 + Math.atan2(Math.sin(bearing) * Math.sin(radiusRad) * Math.cos(lat1),
                     Math.cos(radiusRad) - Math.sin(lat1) * Math.sin(lat2));
        
        // 保持经度原始展开状态，不在此处强制 normalize
        coords.push([lon2 * 180 / Math.PI, lat2 * 180 / Math.PI]);
    }
    return { type: "LineString", coordinates: coords };
}

export const getCategory = (windKts, isTransitioning = false, isExtratropical = false, isSubtropical = false) => {
    if (isSubtropical) {
        if (windKts < 34) return { name: "副热带低压", shortName: "SD", color: "#76d7c4" };
        return { name: "副热带风暴", shortName: "SS", color: "#48c9b0" };
    }
    if (isExtratropical) return { name: "温带气旋", shortName: "EXT", color: "#8e44ad" };
    if (isTransitioning) return { name: "正在温带转化", shortName: "ET", color: "#efcdeb" };
    if (windKts < 24) return { name: "低压区", shortName: "LPA", color: "#aaaaaa" };
    if (windKts < 34) return { name: "热带低压", shortName: "TD", color: "#6ec1ea" };
    if (windKts < 64) return { name: "热带风暴", shortName: "TS", color: "#4dffff" };
    if (windKts < 83) return { name: "1级飓风", shortName: "Cat 1", color: "#ffffd9" };
    if (windKts < 96) return { name: "2级飓风", shortName: "Cat 2", color: "#ffd98c" };
    if (windKts < 113) return { name: "3级飓风 (强)", shortName: "Cat 3", color: "#ff9e59" };
    if (windKts < 137) return { name: "4级飓风 (强)", shortName: "Cat 4", color: "#ff738a" };
    return { name: "5级飓风 (巨)", shortName: "Cat 5", color: "#8d75e6" };
};

export const knotsToKph = kts => Math.round(kts * 1.852);
export const knotsToMph = kts => Math.round(kts * 1.15078);

export const windToPressure = (windKts, circulationSize = 300, basin = 'WPAC', envPressure = null) => { let backgroundPressure = envPressure;
    if (backgroundPressure === null || backgroundPressure === undefined) {
        switch (basin) {
          case 'WPAC':
          case 'NIO':
              backgroundPressure = 1010; 
              break;
          default:
              backgroundPressure = 1018; 
        }
    }
    const basePressureCalc = backgroundPressure - 12.5 * (windKts ** 1.6) / (48.0) ** 1.6;
    const pressure = basePressureCalc + (basePressureCalc - backgroundPressure) * (0.0012 * circulationSize);
    return Math.max(640, Math.round(pressure));
};

// [已移除] unused pressureToWind function

export function getPressureAt(lon, lat, pressureSystemsLayer, useNoise = true) {
    let pressureValue = 1010; // 基础气压
    const safeLon = lon; 
    const systems = Array.isArray(pressureSystemsLayer) ? pressureSystemsLayer : (pressureSystemsLayer.lower || []);
    systems.forEach(cell => {
        const dx = shortestLongitudeDistance(safeLon, cell.x); 
        const dy = lat - cell.y;
        
        const exponent = -( ((dx**2) / (2 * cell.sigmaX**2)) + ((dy**2) / (2 * cell.sigmaY**2)) );
        let pressureOffset = Math.exp(exponent) * cell.strength;
        
        if (cell.noiseLayers) {
            let noise = 0;
            cell.noiseLayers.forEach(layer => {
                noise += Math.sin((safeLon + layer.offsetX) / layer.freqX) * Math.cos((lat + layer.offsetY) / layer.freqY) * layer.amplitude;
            });
            pressureValue += noise;
        }

        pressureValue += pressureOffset;
    });
    if (useNoise) {
        pressureValue += calculateAtmosphericNoise(lon, lat);
    }
    return pressureValue;
}

export const directionToCompass = deg => {
    const val = Math.floor((deg / 22.5) + 0.5);
    const arr = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
    return arr[(val % 16)];
};

// --- 海温气候学 (Realistic sea-surface-temperature climatology) ---
//
// getSST returns °C. The model is built from three layers:
//   1. A latitude + season base: real open-ocean monthly climatology curves
//      for each hemisphere (peaks in local summer), blended across the
//      equator so the deep tropics keep a small, realistic annual range.
//   2. Large-scale climate features: the WPAC warm pool, Bay of Bengal /
//      Arabian Sea heat, the eastern-Pacific & Gulf-of-Guinea cold tongues
//      (seasonal), the Caribbean & Loop Current.
//   3. Narrow boundary currents: Gulf Stream & Kuroshio warm ribbons,
//      California / Canary / Peru / Benguela / Somali / West-Australia cool
//      ribbons, Agulhas warmth, plus monsoon-driven coastal upwelling.
// The global-temp slider (Kelvin offset from 289 K) shifts the result by
// ~0.5 °C per K, clamped to a sane ±5 °C.
//
// Latitude anchors: °C at 0,5,...,70 lat for each hemisphere's warm and cool
// solstice (approx. real basin interiors).
const SST_NH_SUMMER = [27.2, 28.6, 28.8, 28.5, 28.3, 28.2, 27.3, 24.8, 20.8, 16.5, 13.2, 10.5, 8.6, 6.2, 4.0];
const SST_NH_WINTER = [26.9, 27.7, 26.9, 25.7, 24.3, 22.7, 19.9, 15.0, 11.2, 8.8, 6.8, 5.0, 3.0, 1.6, 0.0];
const SST_SH_SUMMER = [27.2, 28.6, 29.0, 28.4, 27.1, 25.3, 22.9, 19.6, 15.7, 12.5, 9.5, 6.8, 4.2, 2.2, 0.4];
const SST_SH_WINTER = [26.9, 27.5, 26.5, 25.3, 23.1, 20.6, 17.6, 14.9, 12.1, 9.5, 7.0, 5.0, 2.8, 1.2, -0.6];

function sstAnchorLookup(table, latAbs) {
    const lat = Math.max(0, Math.min(70, latAbs));
    const step = lat / 5;
    const i = Math.min(table.length - 2, Math.floor(step));
    const frac = step - i;
    return table[i] + (table[i + 1] - table[i]) * frac;
}

function sstSeasonalBase(lat, month) {
    const absLat = Math.abs(lat);
    // Hemisphere seasonal position: 0 = cool solstice, 1 = warm solstice.
    const nhPos = (Math.cos((month - 8) * (Math.PI / 6)) + 1) / 2;  // peaks in Aug
    const shPos = (1 - Math.cos((month - 8) * (Math.PI / 6))) / 2;  // peaks in Feb
    const nhSst = sstAnchorLookup(SST_NH_WINTER, absLat) + nhPos * (sstAnchorLookup(SST_NH_SUMMER, absLat) - sstAnchorLookup(SST_NH_WINTER, absLat));
    const shSst = sstAnchorLookup(SST_SH_WINTER, absLat) + shPos * (sstAnchorLookup(SST_SH_SUMMER, absLat) - sstAnchorLookup(SST_SH_WINTER, absLat));
    // Blend the two hemispheric curves across the equatorial band (±12°).
    const nhWeight = Math.max(0, Math.min(1, (lat + 12) / 24));
    return nhSst * nhWeight + shSst * (1 - nhWeight);
}

// Seasonal envelope: 1 at `center`, smoothly to 0 at center ± `half` months.
function seasonalFactor(month, center, half) {
    let d = Math.abs(month - center);
    if (d > 6) d = 12 - d;
    if (d >= half) return 0;
    return Math.cos((d / half) * (Math.PI / 2));
}

// Large-scale climate anomalies and boundary currents (gaussian blobs; values
// are peak °C anomalies from the open-ocean climatology). Optional seasonal
// entries only act during their active window (monsoon upwelling, cold tongues).
const SST_ANOMALIES = [
    // --- Warm features ---
    { name: 'WPac warm pool',     lat: 12,  lon: 141,  max: 1.0,  sLat: 14, sLon: 30 },
    { name: 'Bay of Bengal',      lat: 14,  lon: 89,   max: 0.9,  sLat: 7,  sLon: 7 },
    { name: 'Arabian Sea',        lat: 15,  lon: 65,   max: 0.5,  sLat: 9,  sLon: 8 },
    { name: 'Caribbean',          lat: 16.5, lon: -77, max: 0.45, sLat: 6,  sLon: 7 },
    { name: 'Loop Current',       lat: 26,  lon: -88,  max: 1.0,  sLat: 5,  sLon: 6 },
    { name: 'Gulf Stream (winter)',       lat: 37,   lon: -73,   max: 3.2,  sLat: 3.2, sLon: 5,   center: 1.8, half: 3.3 },
    { name: 'Gulf Stream north (winter)', lat: 41,   lon: -63,   max: 1.8,  sLat: 3,   sLon: 6,   center: 1.8, half: 3.3 },
    { name: 'Kuroshio (winter)',          lat: 30.8, lon: 132.5, max: 2.6,  sLat: 2.6, sLon: 4.2, center: 1.8, half: 3.3 },
    { name: 'NW Pacific interior (winter cool)', lat: 29, lon: 152, max: -1.3, sLat: 9, sLon: 20, center: 2, half: 3.5 },
    { name: 'Agulhas',            lat: -33, lon: 29,   max: 2.4,  sLat: 3.5, sLon: 5 },
    // --- Cold features ---
    { name: 'California cold',    lat: 34,  lon: -121, max: -2.6, sLat: 6,  sLon: 5 },
    { name: 'Canary cold',        lat: 26,  lon: -16.5, max: -2.4, sLat: 7, sLon: 6 },
    { name: 'Peru / Humboldt',    lat: -14, lon: -77,  max: -3.0, sLat: 6,  sLon: 6 },
    { name: 'Benguela cold',      lat: -24, lon: 12.5, max: -2.6, sLat: 7,  sLon: 7 },
    { name: 'West Australia cold', lat: -27, lon: 113.5, max: -1.3, sLat: 6, sLon: 6 },
    // --- Seasonal cold tongues & monsoon upwelling ---
    { name: 'EPac cold tongue',   lat: 0.5, lon: -107, max: -2.4, sLat: 4.5, sLon: 20, center: 9.5, half: 4.2 },
    { name: 'Guinea cold tongue', lat: 3.5, lon: -2,   max: -1.5, sLat: 3.5, sLon: 6, center: 8.5, half: 2.0 },
    { name: 'Somali upwelling',   lat: 9.5, lon: 51.5, max: -3.4, sLat: 3.5, sLon: 4.5, center: 7.5, half: 2.2 },
    { name: 'Arabian upwelling',  lat: 16.5, lon: 57.5, max: -1.5, sLat: 4,  sLon: 6, center: 8, half: 2.5 }
];

export function getSST(lat, lon, month, globalTempK = 289) {
    let sst = sstSeasonalBase(lat, month);

    SST_ANOMALIES.forEach(feature => {
        const dLon = shortestLongitudeDistance(lon, feature.lon);
        const dLat = lat - feature.lat;
        const influence = Math.exp(-( (dLon * dLon) / (2 * feature.sLon * feature.sLon) + (dLat * dLat) / (2 * feature.sLat * feature.sLat) ));
        let magnitude = feature.max;
        if (feature.center != null) magnitude *= seasonalFactor(month, feature.center, feature.half);
        sst += magnitude * influence;
    });

    // Global-temperature (Kelvin) offset from the 289 K baseline, damped.
    const tempAnomaly = globalTempK - 289.0;
    sst += Math.max(-5, Math.min(5, tempAnomaly * 0.5));

    return Math.max(-1.9, Math.min(33.5, sst));
}