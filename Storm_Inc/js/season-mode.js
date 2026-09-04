/**
 * season-mode.js
 * 全自动季节模式 (Automated full-season mode).
 *
 * Pure, DOM-free helpers: given a basin + season year, this module knows the
 * basin's natural season window and its monthly climatological activity
 * (mean named storms per month, ~1991-2020 values), and produces a concrete
 * spawn schedule: a sorted list of { month, day } start dates for the invests
 * the automated run should spin up.
 *
 * The sim plays storms sequentially (one live cyclone at a time, like real
 * watches), so the schedule simply spaces systems through the season window.
 */

// Months in order for each basin's natural season (1 = Jan ... 12 = Dec).
// SIO/SHEM cross the year boundary (Nov -> Apr).
export const SEASON_WINDOWS = {
    NATL: [6, 7, 8, 9, 10, 11],
    EPAC: [5, 6, 7, 8, 9, 10, 11],
    WPAC: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    NIO: [4, 5, 6, 7, 8, 9, 10, 11, 12],
    SIO: [11, 12, 1, 2, 3, 4],
    SHEM: [11, 12, 1, 2, 3, 4],
    SATL: [1, 2, 3, 4]
};

// Mean number of named systems per calendar month, indexed 1..12
// (climatological activity curves for each basin).
export const MONTHLY_CLIMATOLOGY = {
    // Atlantic (Jun-Nov core; 1991-2020 mean ~14 named)
    NATL: [0, 0, 0, 0, 0, 0.9, 1.8, 3.6, 4.4, 2.9, 1.1, 0],
    // East Pacific (May-Nov; ~17 named)
    EPAC: [0, 0, 0, 0, 1.0, 2.2, 3.2, 3.6, 3.0, 1.8, 1.0, 0],
    // West Pacific (year-round; ~26 named)
    WPAC: [0.4, 0.3, 0.3, 0.6, 1.0, 1.7, 2.6, 3.5, 3.5, 2.9, 1.8, 1.0],
    // North Indian (pre- & post-monsoon peaks; ~7 named)
    NIO: [0.2, 0.1, 0.1, 0.5, 1.0, 0.9, 0.2, 0.2, 0.4, 1.0, 1.4, 0.7],
    // South-West Indian (Nov-Apr; ~9 named)
    SIO: [0.4, 0.3, 0.2, 0.1, 0, 0, 0, 0, 0, 0.1, 0.4, 1.1],
    // Australian region + South Pacific (Nov-Apr; ~8 named)
    SHEM: [0.5, 0.4, 0.2, 0.1, 0, 0, 0, 0, 0, 0.2, 0.5, 1.0],
    // South Atlantic (rare; occasionally none in a season)
    SATL: [0.1, 0.15, 0.2, 0.15, 0, 0, 0, 0, 0, 0, 0, 0]
};

// Optional scale on top of the climatology (leave 1.0 for faithful seasons).
export const SEASON_SYSTEM_SCALE = 1.0;

// Month names (short) for readable labels.
export const MONTH_LABELS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(month, year) {
    if (month === 2 && isLeapYear(year)) return 29;
    return DAYS_IN_MONTH[month - 1];
}

// Poisson sampler (Knuth) so the number of systems in a month varies
// realistically around the climatological mean (cap guards freak rolls).
function samplePoisson(lambda, random = Math.random) {
    if (lambda <= 0) return 0;
    const L = Math.exp(-lambda);
    let k = 0;
    let p = 1;
    do {
        k++;
        p *= random();
    } while (p > L && k < 14);
    return Math.min(k - 1, 10);
}

/**
 * Create a full-season plan for a basin.
 * Returns { basin, year, months, schedule, expectedTotal } where schedule is a
 * sorted list of { month, day, ordinal } invest start dates inside the window.
 */
export function createAutoSeason(basin = 'NATL', year = new Date().getFullYear(), random = Math.random) {
    const months = SEASON_WINDOWS[basin] || SEASON_WINDOWS.NATL;
    const climate = MONTHLY_CLIMATOLOGY[basin] || MONTHLY_CLIMATOLOGY.NATL;
    const schedule = [];
    let expectedTotal = 0;

    for (const month of months) {
        const mean = (climate[month - 1] || 0) * SEASON_SYSTEM_SCALE;
        expectedTotal += mean;
        const count = samplePoisson(mean, random);
        if (count <= 0) continue;
        const dim = daysInMonth(month, year);
        // Stratified start days: spread `count` systems through the month with
        // jitter, never on the very first/last day.
        const days = [];
        const spacing = dim / count;
        for (let i = 0; i < count; i++) {
            const day = Math.max(2, Math.min(dim - 1, Math.floor(spacing * i + spacing * random() + 0.5)));
            if (days.indexOf(day) === -1) days.push(day);
        }
        for (const day of days) {
            schedule.push({ month, day });
        }
    }

    // Order by month position in the window (handles the Nov->Apr wrap), then day.
    const monthOrder = {};
    months.forEach((m, i) => { monthOrder[m] = i; });
    schedule.sort((a, b) => (monthOrder[a.month] - monthOrder[b.month]) || (a.day - b.day));

    return {
        basin,
        year,
        months,
        schedule,
        expectedTotal
    };
}

/** "AUG 12" style label for a schedule item (year rolls for SHEM/SIO). */
export function formatSeasonDate(item, year) {
    const labelMonth = MONTH_LABELS[item.month - 1];
    const labelYear = item.month <= 6 ? year + 1 : year;
    return `${labelMonth} ${String(item.day).padStart(2, '0')}`;
}

export function formatSeasonRange(months, year) {
    const first = MONTH_LABELS[months[0] - 1];
    const last = MONTH_LABELS[months[months.length - 1] - 1];
    return `${first} 01 - ${last} 30, ${year}`;
}
