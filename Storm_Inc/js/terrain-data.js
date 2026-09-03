/**
 * terrain-data.js
 * 负责管理地形高程数据和陆地遮罩
 */

let elevationData = null; // 存储高程图像素数据 (RGBA)
let landMaskData = null;  // 存储陆地遮罩像素数据 (Alpha channel only is enough, but we use RGBA)
let mapWidth = 0;
let mapHeight = 0;

const MAX_ELEVATION_METERS = 680; // 设定最大海拔

// 初始化地形系统
export function initTerrainSystem(imageUrl, worldData) {
    return new Promise((resolve, reject) => {
        // 1. 加载高程图
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = imageUrl;
        
        img.onload = () => {
            mapWidth = img.width;
            mapHeight = img.height;
            
            // --- A. 处理高程数据 ---
            const elevCanvas = document.createElement('canvas');
            elevCanvas.width = mapWidth;
            elevCanvas.height = mapHeight;
            const elevCtx = elevCanvas.getContext('2d');
            elevCtx.drawImage(img, 0, 0);
            const rawData = elevCtx.getImageData(0, 0, mapWidth, mapHeight).data;
            elevationData = new Uint8Array(mapWidth * mapHeight);
            for (let i = 0, j = 0; i < rawData.length; i += 4, j++) {
                elevationData[j] = rawData[i]; // 只取 Red 通道
            }
            // --- B. 生成陆地遮罩 (Land Mask) ---
            // 使用 D3 将矢量地图绘制到内存 Canvas 上
            if (worldData) {
                const maskCanvas = document.createElement('canvas');
                maskCanvas.width = mapWidth;
                maskCanvas.height = mapHeight;
                const maskCtx = maskCanvas.getContext('2d');

                // 设置投影以匹配图片 (Equirectangular)
                const projection = d3.geoEquirectangular()
                    .scale(mapWidth / (2 * Math.PI))
                    .translate([mapWidth / 2, mapHeight / 2]);

                const pathGenerator = d3.geoPath()
                    .projection(projection)
                    .context(maskCtx);

                // 绘制背景（海洋 = 黑色）
                maskCtx.fillStyle = '#000000';
                maskCtx.fillRect(0, 0, mapWidth, mapHeight);

                // 绘制陆地（陆地 = 白色）
                maskCtx.fillStyle = '#FFFFFF';
                maskCtx.beginPath();
                pathGenerator(worldData);
                maskCtx.fill();

                // 获取遮罩数据
                const raw = maskCtx.getImageData(0, 0, mapWidth, mapHeight).data;
                landMaskData = new Uint8Array(mapWidth * mapHeight);

                for (let i = 0, j = 0; i < raw.length; i += 4, j++) {
                    landMaskData[j] = raw[i];
                }
            }

            console.log(`Terrain System Initialized. Size: ${mapWidth}x${mapHeight}`);
            resolve();
        };
        
        img.onerror = (e) => reject(e);
    });
}

// 内部辅助：经纬度转像素坐标
function getPixelCoords(lon, lat) {
    // 经度归一化 [-180, 180] -> [0, 360]
    let normLon = ((lon + 180) % 360 + 360) % 360 - 180;

    // 映射到像素
    // 假设图片是标准等距投影: -180在左边缘, +180在右边缘
    let x = Math.floor(((normLon + 180) / 360) * (mapWidth - 1));
    let y = Math.floor(((90 - lat) / 180) * (mapHeight - 1));

    // 边界钳制
    x = Math.max(0, Math.min(x, mapWidth - 1));
    y = Math.max(0, Math.min(y, mapHeight - 1));

    return { x, y };
}

// 获取海拔 (米)
export function getElevationAt(lon, lat) {
    if (!elevationData) return 0;
    const { x, y } = getPixelCoords(lon, lat);
    const index = y * mapWidth + x;
    const brightness = elevationData[index]; // Read Red channel
    
    // 如果亮度很低，直接返回0
    if (brightness < 5) return 0;
    return (brightness / 255) * MAX_ELEVATION_METERS;
}

// 缓存的地形着色瓦片 (仅陆地, 海洋透明)
let terrainTile = null;

// 构建地形着色瓦片: 根据高程灰度 + 陆地遮罩生成暗色主题地形色带
// 带山体阴影 (西北光照) / 纬度雪线 / 海岸压暗 / 细腻色阶, 最后 2x 平滑放大避免低分辨率色块感。
// 海洋部分完全透明, 可直接叠加到等距投影地图上
export function getTerrainTile() {
    if (!elevationData || !landMaskData) return null;
    if (terrainTile) return terrainTile;

    const sw = mapWidth, sh = mapHeight;
    const d = new Uint8ClampedArray(sw * sh * 4);

    // 地形色带 (暗色主题): 海岸深绿 -> 低地绿 -> 平原橄榄 -> 丘陵橄榄棕 -> 山地棕 -> 高海拔棕灰 -> 岩漠灰
    const stops = [
        [0.00, 36, 58, 43],
        [0.06, 52, 79, 55],
        [0.20, 77, 91, 67],
        [0.40, 104, 100, 76],
        [0.60, 125, 110, 86],
        [0.78, 144, 131, 108],
        [0.90, 162, 154, 136]
    ];
    const snowCol = [200, 207, 217]; // 雪顶

    // 轻量伪随机抖动 (消除大面积平色带)
    const hash = (x, y) => {
        let h = (x * 374761393 + y * 668265263) | 0;
        h = ((h ^ (h >> 13)) * 1274126177) | 0;
        h = (h ^ (h >> 16)) >>> 0;
        return h / 4294967295;
    };

    const smoothstep = (a, b, x) => {
        const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
        return t * t * (3 - 2 * t);
    };

    // 粗略荒漠判定 (纬度带 + 主要沙漠经度区间), 让撒哈拉/阿拉伯/戈壁/澳洲内陆等呈沙色而非绿色
    const desertMix = (lon, lat) => {
        const a = Math.abs(lat);
        if (a < 12) return 0;
        let m = 0;
        if (lat > 10 && lat < 35 && lon > -20 && lon < 60) m = Math.max(m, 1);        // 撒哈拉 + 阿拉伯
        if (lat > 25 && lat < 42 && lon > 45 && lon < 78) m = Math.max(m, 0.9);        // 伊朗高原/中亚
        if (lat > 34 && lat < 49 && lon > 72 && lon < 112) m = Math.max(m, 0.85);      // 戈壁/塔克拉玛干
        if (lat > 20 && lat < 38 && lon < -95 && lon > -123) m = Math.max(m, 0.9);      // 西南北美/墨西哥
        if (lat < -15 && lat > -32 && lon > 112 && lon < 148) m = Math.max(m, 0.9);     // 澳洲内陆
        if (lat < -18 && lat > -30 && lon > 7 && lon < 27) m = Math.max(m, 0.9);        // 卡拉哈里
        if (lat < -15 && lat > -27 && lon < -66 && lon > -73) m = Math.max(m, 1);       // 阿塔卡马
        return m;
    };

    const elevAt = (x, y) => {
        // x 环绕 (经度无缝), y 钳制 (极点)
        let xi = x;
        if (xi < 0) xi += sw;
        else if (xi >= sw) xi -= sw;
        const yi = y < 0 ? 0 : (y >= sh ? sh - 1 : y);
        return elevationData[yi * sw + xi];
    };
    const landAt = (x, y) => {
        let xi = x;
        if (xi < 0) xi += sw;
        else if (xi >= sw) xi -= sw;
        const yi = y < 0 ? 0 : (y >= sh ? sh - 1 : y);
        return landMaskData[yi * sw + xi];
    };

    for (let y = 0; y < sh; y++) {
        const row = y * sw;
        // 纬度雪线: 低纬仅极高海拔有雪, 高纬雪线快速降低
        const latDeg = Math.abs(90 - (y / sh) * 180);
        const snowLine = 0.93 - 0.22 * smoothstep(0, 72, latDeg);
        for (let x = 0; x < sw; x++) {
            const i = row + x;
            const idx = i * 4;
            const e = elevationData[i];
            const landV = landMaskData[i];
            // 仅陆地; 沿海遮罩渐变处允许半透明 (让海岸平滑)。
            // 陆地即使海拔 ~0 (如亚马逊/刚果盆地) 也要着色, 避免海洋色漏进大陆内部。
            if (landV <= 8) continue;

            const alpha = Math.min(255, landV);
            const t = Math.min(1, Math.max(0, e) / 255);

            // 1. 基础色带插值
            let r = stops[0][1], g = stops[0][2], b = stops[0][3];
            for (let s = 0; s < stops.length - 1; s++) {
                const lo = stops[s], hi = stops[s + 1];
                if (t >= lo[0] && t < hi[0]) {
                    const k = (t - lo[0]) / (hi[0] - lo[0]);
                    r = lo[1] + (hi[1] - lo[1]) * k;
                    g = lo[2] + (hi[2] - lo[2]) * k;
                    b = lo[3] + (hi[3] - lo[3]) * k;
                    break;
                }
            }
            if (t >= stops[stops.length - 1][0]) { r = stops[6][1]; g = stops[6][2]; b = stops[6][3]; }

            // 1b. 荒漠地带: 海拔越低越沙色 (山地保留自身色调)
            const lonDeg = (x / sw) * 360 - 180;
            const latDegC = 90 - (y / sh) * 180;
            const dm = desertMix(lonDeg, latDegC) * (0.25 + 0.75 * (1 - t));
            if (dm > 0) {
                const arid = [152, 132, 96]; // 暗色主题的沙色
                r = r + (arid[0] - r) * dm;
                g = g + (arid[1] - g) * dm;
                b = b + (arid[2] - b) * dm;
            }

            // 2. 山体阴影 (光照来自西北): 面向西北的坡更亮, 背光坡更暗
            const er = elevAt(x + 1, y), el = elevAt(x - 1, y);
            const ed = elevAt(x, y + 1), eu = elevAt(x, y - 1);
            const lit = Math.min(0.9, Math.max(0.12, 0.5 - ((er - el) + (ed - eu)) * 0.055));
            const shade = 0.62 + 0.82 * lit; // 0.72..1.36

            // 3. 海岸线: 邻海陆地轻微压暗, 让海岸更有层次
            let coast = 1;
            if (landAt(x + 1, y) <= 8 || landAt(x - 1, y) <= 8 || landAt(x, y + 1) <= 8 || landAt(x, y - 1) <= 8) {
                coast = 0.87;
            }

            // 4. 积雪: 越过雪线的海拔渐变成雪白
            let snowK = 0;
            if (t > snowLine) {
                snowK = smoothstep(snowLine, Math.min(1, snowLine + 0.045), t) * 0.95;
            }

            const mult = shade * coast;
            r *= mult; g *= mult; b *= mult;
            if (snowK > 0) {
                r = r + (snowCol[0] - r) * snowK;
                g = g + (snowCol[1] - g) * snowK;
                b = b + (snowCol[2] - b) * snowK;
            }
            // 5. 轻微颗粒抖动, 打破平涂
            const grain = (hash(x, y) - 0.5) * 0.045;
            const m2 = 1 + grain;
            d[idx] = Math.max(0, Math.min(255, Math.round(r * m2)));
            d[idx + 1] = Math.max(0, Math.min(255, Math.round(g * m2)));
            d[idx + 2] = Math.max(0, Math.min(255, Math.round(b * m2)));
            d[idx + 3] = alpha;
        }
    }

    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d');
    ctx.putImageData(new ImageData(d, sw, sh), 0, 0);
    // 最终绘制到地图时按双线性平滑缩放, 不需要额外放大缓存
    terrainTile = canvas;
    return canvas;
}

// 获取陆地状态 (包含 isLand 和 isNearLand)
// nearThresholdDeg: 近岸判定阈值，单位度。默认 0.2 度
export function getLandStatus(lon, lat, nearThresholdDeg = 0.2) {
    if (!landMaskData) return { isLand: false, isNearLand: false };

    const { x: cx, y: cy } = getPixelCoords(lon, lat);
    
    // 1. 判断正中心是否为陆地 (R通道 > 128 即为白色)
    const idx = cy * mapWidth + cx;
    const isLand = landMaskData[idx] > 128;

    // 2. 判断 Near Land
    const pixelsPerDeg = mapWidth / 360;
    const radius = Math.max(1, Math.ceil(nearThresholdDeg * pixelsPerDeg));

    let isNearLand = isLand; // 如果已经在陆地上，当然也是 Near Land

    if (!isLand) {
        // 只有当中心在海上时，才去搜寻周围
        // 搜索 3x3 或 5x5 区域
        searchLoop:
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                if (dx === 0 && dy === 0) continue;

                let nx = cx + dx;
                let ny = cy + dy;

                // 处理地图水平循环
                if (nx < 0) nx += mapWidth;
                if (nx >= mapWidth) nx -= mapWidth;
                // 垂直方向不循环，直接夹断
                if (ny < 0 || ny >= mapHeight) continue;

                const idx = ny * mapWidth + nx;
                if (landMaskData[idx] > 128) {
                    isNearLand = true;
                    break searchLoop; // 找到一个陆地像素即可停止
                }
            }
        }
    }

    return { isLand, isNearLand };
}