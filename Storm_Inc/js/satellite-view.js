/**
 * js/satellite-view.js
 * 负责处理 WebGL 卫星云图渲染
 */

let gl, program;
let startTime;
let canvas;
let uniforms = {};
let isGrayscale = false;

// 顶点着色器
const vertexShaderSource = `
    attribute vec2 a_position;
    void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
    }
`;

// 片元着色器 (已更新不对称逻辑)
const fragmentShaderSource = `
    precision mediump float;
    uniform vec2 u_resolution;
    uniform float u_time;
    uniform float u_spiral_strength;
    uniform float u_eye_radius;
    uniform float u_shape_distortion;
    uniform float u_storm_radius;
    uniform float u_cloud_low;
    uniform float u_cloud_high;
    uniform float u_central_mass_size;
    uniform float u_wind_shear_strength;
    uniform float u_random_seed;
    uniform float u_hemisphere; 

    uniform float u_grayscale;
    
    // [新增] 不对称参数
    uniform float u_asym_strength;
    uniform float u_asym_dir;

    // [新增] 眼墙置换 (ERC) 动画参数
    uniform float u_erc_strength;
    uniform float u_erc_radius;
    uniform float u_erc_contract;
    uniform float u_erc_inner_fill;

    float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
    }
    float noise(vec2 st) {
        vec2 i = floor(st);
        vec2 f = fract(st);
        float a = random(i);
        float b = random(i + vec2(1.0, 0.0));
        float c = random(i + vec2(0.0, 1.0));
        float d = random(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.y * u.x;
    }
    #define FBM_OCTAVES 5
    float fbm(vec2 st) {
        float value = 0.0;
        float amplitude = 0.6;
        float max_amplitude = 0.0;
        for (int i = 0; i < FBM_OCTAVES; i++) {
            value += amplitude * noise(st);
            max_amplitude += amplitude;
            st *= 2.0;
            amplitude *= 0.5;
        }
        return (value / max_amplitude) * 0.9999;
    }
    // 真实 GOES 红外 (IR) 灰度配色: 近黑海洋 -> 暗灰低云 -> 亮白高冷云顶
    vec3 ir_grayscale(float t) {
        t = clamp(t, 0.0, 1.0);
        vec3 ocean   = vec3(0.012, 0.014, 0.022); // 近黑海洋
        vec3 low     = vec3(0.14, 0.15, 0.18);    // 暗灰低云
        vec3 mid     = vec3(0.44, 0.46, 0.51);    // 中层云
        vec3 high    = vec3(0.80, 0.82, 0.88);    // 高冷云顶
        vec3 coldest = vec3(1.0, 1.0, 1.0);       // 极冷云顶纯白
        vec3 c = ocean;
        c = mix(c, low,     smoothstep(0.04, 0.22, t));
        c = mix(c, mid,     smoothstep(0.22, 0.48, t));
        c = mix(c, high,    smoothstep(0.48, 0.72, t));
        c = mix(c, coldest, smoothstep(0.72, 0.90, t));
        return c;
    }

    // 增强型 IR (彩色增强, 类似 GOES Color IR)
    vec3 enhanced_ir(float t) {
        t = clamp(t, 0.0, 1.0);
        vec3 ocean     = vec3(0.004, 0.010, 0.030); // 深蓝黑海洋
        vec3 low       = vec3(0.09, 0.11, 0.19);    // 深蓝灰低云
        vec3 mid       = vec3(0.36, 0.40, 0.50);    // 蓝灰中层云
        vec3 high      = vec3(0.72, 0.78, 0.88);    // 亮蓝白高云
        vec3 coldest   = vec3(0.96, 0.98, 1.0);     // 云顶近白
        vec3 overshoot = vec3(1.0, 0.62, 0.68);     // 过冲云顶淡红
        vec3 c = ocean;
        c = mix(c, low,       smoothstep(0.03, 0.18, t));
        c = mix(c, mid,       smoothstep(0.18, 0.42, t));
        c = mix(c, high,      smoothstep(0.42, 0.66, t));
        c = mix(c, coldest,   smoothstep(0.66, 0.86, t));
        c = mix(c, overshoot, smoothstep(0.92, 0.98, t));
        return c;
    }

    void main() {
        vec2 uv = 0.7 * (2.0 * gl_FragCoord.xy - u_resolution.xy) / u_resolution.y;
        float dist = length(uv);
        float angle = atan(uv.y, uv.x);
        
        // --- [新增] 不对称几何计算 ---
        // 1. 计算角度差异
        float angle_diff = angle - u_asym_dir;
        // 2. 角度因子
        float asym_factor = cos(angle_diff);
        // 3. 半径拉伸
        float radius_multiplier = 1.0 + asym_factor * u_asym_strength;
        radius_multiplier = max(0.3, radius_multiplier); 
        // 4. 动态风暴半径
        float dynamic_storm_radius = u_storm_radius * radius_multiplier;
        
        float base_distortion_amp = 0.01;
        float shear_distortion_factor = 0.9;
        float total_distortion_amplitude = base_distortion_amp + u_wind_shear_strength * shear_distortion_factor;
        
        float ROTATION_SPEED = 0.12; // 减慢旋转, 更接近真实卫星环流的缓慢演变
        float NOISE_SCALE = 4.0;

        // 1. 螺旋云带
        float spiral_angle = angle + u_spiral_strength * log(dist) * u_hemisphere - u_time * ROTATION_SPEED * u_hemisphere;
        
        vec2 noise_uv = vec2(cos(spiral_angle) * dist, sin(spiral_angle) * dist) * NOISE_SCALE;
        noise_uv.y += u_time * 0.1;
        float noise_val = fbm(noise_uv + u_random_seed);

        // --- 密度不对称增强 (让延伸侧云层稍厚) ---
        float density_boost = smoothstep(-0.5, 1.0, asym_factor) * u_asym_strength * 0.2;
        noise_val += density_boost;

        // 2. 风眼与边缘
        vec2 spiral_boundary_noise_uv = uv * 6.0 + u_time * 0.3;
        float spiral_boundary_perturbation = fbm(spiral_boundary_noise_uv) * total_distortion_amplitude;
        
        float spiral_inner_radius = (u_eye_radius - u_wind_shear_strength) + spiral_boundary_perturbation;
        float spiral_inner_radius_soft = (u_eye_radius + 0.1 - u_wind_shear_strength) + spiral_boundary_perturbation;
        
        float eye_falloff = smoothstep(spiral_inner_radius, spiral_inner_radius_soft, dist);
        noise_val *= eye_falloff;
        
        float distortion_noise = fbm(uv * 1.5 + u_time * 0.05);
        float distorted_dist = dist - distortion_noise * u_shape_distortion;
        
        // [修改] 使用 dynamic_storm_radius 替代原有的 u_storm_radius
        float storm_falloff = 1.0 - smoothstep(dynamic_storm_radius, dynamic_storm_radius + 0.2, distorted_dist);
        noise_val *= storm_falloff;
        
        // 3. 中心云团 (CDO)
        float central_mass_value = 0.0;
        if (u_central_mass_size > 0.0) {
            vec2 shear_direction = normalize(vec2(1.0, 1.0));
            vec2 cdo_uv = uv - shear_direction * u_wind_shear_strength;
            float cdo_dist = length(cdo_uv);
            float cdo_angle = atan(cdo_uv.y, cdo_uv.x);
            
            float central_mass_outer_radius = u_eye_radius + u_central_mass_size;
            vec2 boundary_noise_uv = cdo_uv * 6.0 + u_time * 0.3;
            float boundary_perturbation = fbm(boundary_noise_uv) * total_distortion_amplitude;

            float perturbed_inner_radius = (u_eye_radius - u_wind_shear_strength) + boundary_perturbation;
            float perturbed_outer_radius = central_mass_outer_radius + boundary_perturbation;

            float central_mass_shape = smoothstep(perturbed_inner_radius, perturbed_inner_radius + 0.06, cdo_dist)
                                     * (1.0 - smoothstep(perturbed_outer_radius, perturbed_outer_radius + 0.15, cdo_dist));
            
            float central_mass_rotation_speed = ROTATION_SPEED * 1.2;
            
            float central_mass_internal_angle = cdo_angle + u_spiral_strength * log(cdo_dist) * u_hemisphere 
                                              - u_time * central_mass_rotation_speed * u_hemisphere 
                                              - u_wind_shear_strength;
                                  
            vec2 central_mass_internal_noise_coords;
            central_mass_internal_noise_coords.x = cos(central_mass_internal_angle) * cdo_dist - u_wind_shear_strength;
            central_mass_internal_noise_coords.y = sin(central_mass_internal_angle) * cdo_dist - u_wind_shear_strength;
            
            float internal_texture = fbm(central_mass_internal_noise_coords * 6.0);
            central_mass_value = central_mass_shape * (0.85 + internal_texture * 0.15);
        }
        // ERC 期间旧 CDO 分解变淡, 让外眼墙环成为主导 (经典置换特征)
        central_mass_value *= (1.0 - 0.65 * u_erc_strength);
        
        noise_val = max(noise_val, central_mass_value);

        // --- 眼墙置换 (ERC) 动画: 外眼墙环 + 内眼填塞 ---
        if (u_erc_strength > 0.001) {
            // 外眼墙环: 从外围逐渐向内收缩 (u_erc_contract 0->1)
            float erc_ring_radius = u_eye_radius + u_erc_radius * (1.0 - u_erc_contract);
            float erc_ring_width = 0.032 + 0.02 * u_erc_contract;
            float erc_ring = exp(-pow(dist - erc_ring_radius, 2.0) / (2.0 * erc_ring_width * erc_ring_width));
            // 环的纹理化: 叠加高频噪声, 让新眼墙看起来是真实的云墙而非完美圆环
            float ring_texture = fbm(uv * 6.0 + u_random_seed + u_time * 0.05);
            erc_ring *= 0.85 + 0.15 * ring_texture;
            // 环两侧渐隐, 避免生硬边缘
            erc_ring *= smoothstep(0.0, 0.06, dist)
                      * (1.0 - smoothstep(erc_ring_radius + 0.15, erc_ring_radius + 0.28, dist));
            noise_val = max(noise_val, erc_ring * u_erc_strength);

            // 内眼墙衰弱: 云层填塞原风眼 (旧眼模糊, 置换完成后重新露眼)
            // 高斯型: 仅影响风眼及其紧邻区域, 随距离快速衰减
            float erc_fill_radius = max(0.02, u_eye_radius + 0.06);
            float erc_inner_fill = exp(-pow(dist / erc_fill_radius, 2.0) * 2.0) * u_erc_inner_fill * u_erc_strength;
            noise_val = max(noise_val, erc_inner_fill * 0.85);
        }

        // 增强螺旋雨带对比度: 突出亮带与暗隙, 更接近真实雨带结构
        noise_val = pow(clamp(noise_val, 0.0, 1.0), 1.35);

        float cloud_intensity = smoothstep(u_cloud_low, u_cloud_high, noise_val);

        // 精细纹理: 云区叠加高频颗粒感, 还原真实红外云图的粗糙质感
        float detail = fbm(uv * 14.0 + u_random_seed * 2.0);
        cloud_intensity = clamp(cloud_intensity + (detail - 0.5) * 0.08 * cloud_intensity, 0.0, 1.0);

        // 真实感配色: 增强 IR (彩色) 或 经典 IR (黑白)
        vec3 final_color = mix(enhanced_ir(cloud_intensity), ir_grayscale(cloud_intensity), u_grayscale);
        
        gl_FragColor = vec4(final_color, 1.0);
    }
`;

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

// 参数状态
let currentParams = {
    spiral: 1.0, eye: -0.1, distortion: 0.4, stormRadius: 0.2,
    centralMass: 0.0, shear: 0.0, cloudLow: 0.1, cloudHigh: 0.8,
    hemisphere: 1.0, // [新增] 1.0 for NH, -1.0 for SH
    seed: Math.random() * 100,
    asymStrength: 0.0,
    asymDir: 0.0,
    // [新增] 眼墙置换 (ERC) 动画参数
    ercStrength: 0.0,
    ercRadius: 0.10,
    ercContract: 1.0,
    ercInnerFill: 0.0
};

export function resetSatelliteParams() {
    currentParams = {
        spiral: 1.0, 
        eye: -0.1, 
        distortion: Math.random() * 0.4, 
        stormRadius: Math.random() * 0.2 + 0.1,
        centralMass: Math.random() * 0.2, 
        shear: Math.random() * 0.1, 
        cloudLow: 0.0, 
        cloudHigh: Math.random() * 0.5 + 0.5,
        hemisphere: 1.0, // 默认为北半球
        seed: Math.random() * 100,
        asymStrength: Math.random() * 0.3, 
        asymDir: Math.random() * 6.28,
        // [新增] 眼墙置换 (ERC) 动画参数
        ercStrength: 0.0,
        ercRadius: 0.10,
        ercContract: 1.0,
        ercInnerFill: 0.0
    };
}

// 插值函数
function lerp(start, end, t) {
    return start * (1 - t) + end * t;
}

// 辅助: GLSL 风格 smoothstep (用于 ERC 相位渐变)
function smoothstep(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
}

// 辅助：生成正弦波动
function oscillate(base, amplitude, speed) {
    return base + Math.sin(Date.now() * 0.001 * speed) * amplitude;
}

export function initSatelliteView(canvasId) {
    canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
    if (!gl) return;

    const vShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    if (!vShader || !fShader) return;

    program = gl.createProgram();
    gl.attachShader(program, vShader);
    gl.attachShader(program, fShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error("Program link error:", gl.getProgramInfoLog(program));
        return;
    }

    // Cache uniform locations
    const uniformNames = [
        "u_resolution", "u_time", "u_spiral_strength", "u_eye_radius", 
        "u_shape_distortion", "u_storm_radius", "u_central_mass_size", 
        "u_wind_shear_strength", "u_cloud_low", "u_cloud_high", "u_random_seed",
        "u_hemisphere", "u_asym_strength", "u_asym_dir", "u_grayscale",
        "u_erc_strength", "u_erc_radius", "u_erc_contract", "u_erc_inner_fill" // [新增] ERC
    ];
    uniformNames.forEach(name => {
        uniforms[name] = gl.getUniformLocation(program, name);
    });

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

    const positionAttrib = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionAttrib);
    gl.vertexAttribPointer(positionAttrib, 2, gl.FLOAT, false, 0, 0);

    startTime = Date.now();
    requestAnimationFrame(render);
}

export function setSatelliteGrayscale(enable) {
    isGrayscale = enable;
}

// 根据强度更新目标参数
// erc: { active, phase ('contracting'|'rebuilding'|'complete'|'none'), progress (0..1), count }
export function updateSatelliteView(intensityKnots, age, latitude, isExtratropical, isSubtropical, isLand = false, sst = 29, humidity = 75, erc = null) { 
    if (intensityKnots == null || isNaN(intensityKnots)) intensityKnots = 0;
    if (latitude == null || isNaN(latitude)) latitude = 0;
    if (sst == null || isNaN(sst)) sst = 29;
    if (humidity == null || isNaN(humidity)) humidity = 75;

    currentParams.hemisphere = latitude < 0 ? -1.0 : 1.0;

    // 基础目标对象
    let target = { 
        spiral: 1.0, eye: -0.1, distortion: 0.4, stormRadius: 0.2, 
        centralMass: 0.0, shear: 0.0, 
        cloudLow: 0.1, 
        cloudHigh: 0.8, // 默认值，会被覆盖
        asymStrength: 0.0, asymDir: 0.0,
        // [新增] ERC 动画参数 (默认无 ERC)
        ercStrength: 0.0, ercContract: 1.0, ercInnerFill: 0.0
    };
    let randomFactor = Math.random(); 
    let dynamicAsymStr = oscillate(0.25, 0.55, 0.5);
    let dynamicAsymDir = (Date.now() * 0.0002) % 6.28;
    // ============================================================
    // 1. 结构形态设定 (Spiral, Eye, Distortion) - 保持基于强度的逻辑
    // ============================================================
    if (isExtratropical) {
        target.spiral = 0.8; target.eye = -0.2; target.distortion = 0.6; target.stormRadius = 0.4; target.centralMass = 0.0; target.shear = 0.2; target.asymStrength = 1.5; target.asymDir = 5.5;
    } else if (isSubtropical) {
        target.spiral = 1.0; target.eye = -0.15; target.distortion = 0.5; target.stormRadius = 0.3; target.centralMass = 0.05; target.shear = 0.15; target.asymStrength = 0.5; target.asymDir = dynamicAsymDir;
    } else if (intensityKnots < 24) { // LO
        target.spiral = 0.5; target.eye = -0.10; target.distortion = Math.random()*0.3+0.1; target.stormRadius = 0.1; target.centralMass = 0.0; target.shear = 0.10; target.asymStrength = dynamicAsymStr * 1.5; target.asymDir = dynamicAsymDir;
    } else if (intensityKnots < 34) { // TD
        target.spiral = 1.0; target.eye = -0.10; target.distortion = 0.4; target.stormRadius = 0.15; target.centralMass = 0.0; target.shear = 0.10; target.asymStrength = dynamicAsymStr * 1.4; target.asymDir = dynamicAsymDir;
    } else if (intensityKnots < 64) { // TS
        let dynamicShear = randomFactor * 0.20;
        let dynamicMass = randomFactor * 0.30;
        target.spiral = 1.2; target.eye = -0.06; target.distortion = 0.35; target.stormRadius = 0.25; target.centralMass = dynamicMass; target.shear = dynamicShear; target.asymStrength = dynamicAsymStr * 1.3; target.asymDir = dynamicAsymDir;
    } else if (intensityKnots < 83) { // Cat 1
        if (currentParams.seed > 50) {
            let dynamicEye = oscillate(0.025, 0.025, 1.0); 
            target.spiral = 1.4; target.eye = dynamicEye; target.distortion = 0.30; target.stormRadius = 0.2; target.centralMass = 0.15; target.shear = 0.08; target.asymStrength = dynamicAsymStr * 1.2; target.asymDir = dynamicAsymDir;
        } else {
            let dynamicEye = oscillate(0.0, 0.025, 1.0); 
            target.spiral = 1.4; target.eye = dynamicEye; target.distortion = 0.30; target.stormRadius = 0.2; target.centralMass = -0.05; target.shear = 0.0; target.asymStrength = dynamicAsymStr * 1.2; target.asymDir = dynamicAsymDir;
        }
    } else if (intensityKnots < 96) { // Cat 2
        let dynamicEye = oscillate(0.025, 0.025, 1.5); 
        target.spiral = 1.6; target.eye = dynamicEye; target.distortion = 0.35; target.stormRadius = 0.22; target.centralMass = 0.12; target.shear = 0.04; target.asymStrength = dynamicAsymStr * 1.1; target.asymDir = dynamicAsymDir;
    } else if (intensityKnots < 113) { // Cat 3
        let dynamicEye = oscillate(0.025, 0.025, 2.0); 
        target.spiral = 1.9; target.eye = dynamicEye; target.distortion = Math.random()*0.05 + 0.27; target.stormRadius = Math.random()*0.05 + 0.27; target.centralMass = 0.10; target.shear = 0.03; target.asymStrength = dynamicAsymStr * 1.0; target.asymDir = dynamicAsymDir;
    } else if (intensityKnots < 137) { // Cat 4
        let dynamicEye = oscillate(0.0, 0.02, 2.5); 
        target.spiral = 2.0; target.eye = dynamicEye; target.distortion = Math.random()*0.30; target.stormRadius = 0.25; target.centralMass = 0.08; target.shear = 0.02; target.asymStrength = dynamicAsymStr * 1.0; target.asymDir = dynamicAsymDir;
    } else { // Cat 5
        let dynamicEye = oscillate(-0.005, 0.015, 3.0);
        target.spiral = 2.5; target.eye = dynamicEye; target.distortion = Math.random()*0.30; target.stormRadius = 0.20; target.centralMass = Math.random()*0.05 + 0.05; target.shear = 0.00; target.asymStrength = dynamicAsymStr * 1.0; target.asymDir = dynamicAsymDir;
    }

    // ============================================================
    // 2. 云量 (Cloud High) 核心计算逻辑
    // ============================================================
    
    // 判断是否为成熟的热带系统 (TS及以上)
    const isMatureTropical = !isExtratropical && !isSubtropical && intensityKnots >= 34;

    if (!isMatureTropical) {
        // [A] 弱系统/非热带系统：保持原有的“松散/随机”风格
        // 这里的 CloudHigh 仍然主要由预设决定，湿度只做微调
        if (isExtratropical) target.cloudHigh = 2.0;
        else if (isSubtropical) target.cloudHigh = 1.6;
        else if (intensityKnots < 24) target.cloudHigh = 1.3; // LO: 很淡
        else target.cloudHigh = 1.1; // TD: 稍浓
        
        // 弱系统对湿度的敏感度较低，但也稍微受点影响
        // 湿度越低，云越淡 (+0.1)
        if (humidity < 60) target.cloudHigh += 0.2;

    } else {
        // [B] 成熟热带气旋：完全由湿度驱动 (Direct Mapping)
        // ---------------------------------------------------
        // 映射逻辑：
        // 湿度 95% -> CloudHigh 0.45 (极浓密，CDO 亮白)
        // 湿度 75% -> CloudHigh 0.80 (正常，有层次)
        // 湿度 40% -> CloudHigh 1.35 (极稀薄，即将消散)
        // ---------------------------------------------------
        
        // 钳制湿度输入范围，防止数值溢出
        const effectiveHum = Math.max(30, Math.min(98, humidity));
        
        // 线性方程：y = mx + c
        // (95, 0.45), (40, 1.35)
        // m = (1.35 - 0.45) / (40 - 95) = 0.9 / -55 ≈ -0.0163
        // 使用稍微平滑一点的系数 -0.013
        
        target.cloudHigh = 2.1 - (effectiveHum * 0.015);
    }

    // 全局随机性
    let jitter = (Math.random() - 0.5) * 0.02;
    target.stormRadius += jitter;
    target.distortion += jitter * 2.0;

    let sstThreshold = 27.0;
    let sstEffect = Math.max(0, (sstThreshold - sst) * 0.3);
    
    target.cloudHigh += sstEffect;

    // ============================================================
    // 3. 眼墙置换 (ERC) 动画目标参数
    //    contracting: 外眼墙环渐显 + 内眼填塞 (旧眼变模糊)
    //    rebuilding : 外眼墙环向内收缩, 新眼重新清晰
    //    complete   : 环淡出, 恢复单眼结构
    // ============================================================
    if (erc && erc.active) {
        const p = Math.max(0, Math.min(1, erc.progress || 0));
        if (erc.phase === 'contracting') {
            const ramp = smoothstep(0.0, 0.35, p);
            target.ercStrength = ramp;
            target.ercContract = 0.0;
            target.ercInnerFill = ramp * 0.9;
        } else if (erc.phase === 'rebuilding') {
            target.ercStrength = 1.0;
            target.ercContract = smoothstep(0.0, 1.0, p);
            target.ercInnerFill = 0.9 * (1.0 - smoothstep(0.0, 0.8, p));
        } else { // 'complete'
            target.ercStrength = 0.0;
            target.ercContract = 1.0;
            target.ercInnerFill = 0.0;
        }
    } else {
        target.ercStrength = 0.0;
        target.ercContract = 1.0;
        target.ercInnerFill = 0.0;
    }

    const smoothFactor = 0.25;

    // 登陆后逻辑
    if (isLand) {
        currentParams.cloudHigh += 0.15; 
        currentParams.centralMass -= 0.04;
        if (currentParams.cloudHigh > 2.0) currentParams.cloudHigh = 2.0; 
        
        target.eye = -0.15; 
        target.spiral *= 0.8; 
    } else {
        currentParams.cloudHigh = lerp(currentParams.cloudHigh, target.cloudHigh, smoothFactor);
    }

    currentParams.spiral = lerp(currentParams.spiral, target.spiral, smoothFactor);
    currentParams.eye = lerp(currentParams.eye, target.eye, smoothFactor);
    currentParams.distortion = lerp(currentParams.distortion, target.distortion, smoothFactor);
    currentParams.stormRadius = lerp(currentParams.stormRadius, target.stormRadius, smoothFactor);
    currentParams.centralMass = lerp(currentParams.centralMass, target.centralMass, smoothFactor);
    currentParams.shear = lerp(currentParams.shear, target.shear, smoothFactor);
    currentParams.cloudLow = lerp(currentParams.cloudLow, target.cloudLow, smoothFactor);
    currentParams.cloudHigh = lerp(currentParams.cloudHigh, target.cloudHigh, smoothFactor);
    currentParams.asymStrength = lerp(currentParams.asymStrength, target.asymStrength, smoothFactor);
    currentParams.asymDir = lerp(currentParams.asymDir, target.asymDir, smoothFactor * 0.5);
    // [新增] ERC 动画参数平滑过渡
    currentParams.ercStrength = lerp(currentParams.ercStrength, target.ercStrength, smoothFactor);
    currentParams.ercContract = lerp(currentParams.ercContract, target.ercContract, smoothFactor);
    currentParams.ercInnerFill = lerp(currentParams.ercInnerFill, target.ercInnerFill, smoothFactor);
}

function render() {
    if (!gl || !program) return;

    const time = (Date.now() - startTime) * 0.001;
    
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;
    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
    }

    gl.useProgram(program);
    
    gl.uniform2f(uniforms.u_resolution, canvas.width, canvas.height);
    gl.uniform1f(uniforms.u_time, time);
    gl.uniform1f(uniforms.u_spiral_strength, currentParams.spiral);
    gl.uniform1f(uniforms.u_eye_radius, currentParams.eye);
    gl.uniform1f(uniforms.u_shape_distortion, currentParams.distortion);
    gl.uniform1f(uniforms.u_storm_radius, currentParams.stormRadius);
    gl.uniform1f(uniforms.u_central_mass_size, currentParams.centralMass);
    gl.uniform1f(uniforms.u_wind_shear_strength, currentParams.shear);
    gl.uniform1f(uniforms.u_cloud_low, currentParams.cloudLow);
    gl.uniform1f(uniforms.u_cloud_high, currentParams.cloudHigh);
    gl.uniform1f(uniforms.u_random_seed, currentParams.seed);
    gl.uniform1f(uniforms.u_hemisphere, currentParams.hemisphere);
    gl.uniform1f(uniforms.u_asym_strength, currentParams.asymStrength);
    gl.uniform1f(uniforms.u_asym_dir, currentParams.asymDir);
    gl.uniform1f(uniforms.u_grayscale, isGrayscale ? 1.0 : 0.0);
    gl.uniform1f(uniforms.u_erc_strength, currentParams.ercStrength);
    gl.uniform1f(uniforms.u_erc_radius, currentParams.ercRadius);
    gl.uniform1f(uniforms.u_erc_contract, currentParams.ercContract);
    gl.uniform1f(uniforms.u_erc_inner_fill, currentParams.ercInnerFill);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
    requestAnimationFrame(render);
}

export function getSatelliteSnapshot() {
    if (!gl || !canvas || !program) return null;

    // 1. 强制渲染一帧，确保画面是最新的
    render(); 
    
    // 2. 导出图片数据
    return canvas.toDataURL('image/png');
}