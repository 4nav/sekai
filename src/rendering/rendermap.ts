import { seaLevelFor, type TerrainType } from "../assets/terrain/shaping";
import type { Hydro } from "../assets/terrain/rivers";
import { distanceTo, blur } from "../assets/terrain/distance";
import type { Settlement } from "../assets/terrain/settlements";
import type { Road } from "../assets/terrain/roads";
import type { Sprites } from "./sprites";
import { RIVER_MIN, MOUNTAIN_RIVER_MIN, LAKE_MIN } from "../assets/terrain/config";
import type { ClimateField } from "../assets/terrain/climate";

const LAKE_EDGE = 0.004;
const SHADE_STRENGTH = 10;
type RGB = [number, number, number];
const RIVER_COLOR: RGB = [48, 118, 168];
const LAKE_SHALLOW_COLOR: RGB = [92, 168, 170];
const SHORE_SCALE = 4;                          
const LAKE_MID_COLOR: RGB = [52, 124, 160];
const LAKE_DEEP_COLOR: RGB = [28, 82, 134];
const LAKE_OPACITY_MIN = 0.55;   
const BANK_WIDTH = 3;       
const BANK_DARKEN = 0.3;
const RIM_STRENGTH = 0.3;
const SIZE_PX = { city: 12, town: 8, village: 8 };
const CASING_PX = 3;
const PLANK_EVERY = 3;
const DECK_PX = 1;
const CASING_COLOR = "#3a2a1a";      
const DECK_COLOR = "#cfae72";        
const PLANK_COLOR = "#8c6b3e";     
const RIVER_WIDTH = 0.9;
const RIVER_GROW = 0.05;
const CONTOUR_STEP: Record<TerrainType, number> = { landmass: 0.07, island: 0.05, mountains: 0.04 };const INDEX_EVERY = 5;                
const CONTOUR_ALPHA = 0.14;
const INDEX_ALPHA = 0.28;
const CONTOUR_COLOR: RGB = [60, 40, 25];

const LAND: RGB[][] = [
    [[150, 155, 140], [128, 150, 120], [76, 120, 98],  [52, 98, 84]],
    [[172, 166, 110], [136, 170, 84],  [62, 128, 62],  [34, 100, 58]],
    [[208, 180, 110], [182, 176, 84],  [70, 140, 56],  [66, 110, 72]],
    [[226, 196, 128], [200, 150, 80],  [60, 138, 52],  [34, 108, 46]],
];
const TROPICAL: RGB[][] = [
    [[150, 155, 140], [128, 150, 120], [76, 120, 98],  [52, 98, 84]],
    [[172, 166, 110], [120, 168, 80],  [70, 150, 70],  [40, 118, 60]],
    [[222, 196, 128], [170, 184, 84],  [84, 160, 62],  [40, 128, 56]],
    [[236, 208, 140], [190, 176, 88],  [74, 160, 56],  [30, 122, 50]],
];
const ALPINE: RGB[][] = [
    [[132, 134, 122], [110, 128, 104], [70, 106, 86],  [48, 86, 74]],     
    [[150, 148, 100], [118, 146, 84],  [58, 112, 62],  [36, 88, 52]],     
    [[184, 166, 100], [150, 158, 80],  [66, 122, 56],  [44, 98, 50]],
    [[206, 172, 104], [176, 146, 80],  [70, 120, 52],  [48, 96, 46]],
];

type Style = {
    palette: RGB[][];
    discrete: boolean;
    rockColor: RGB;
    rockSlope: [number, number];
    rockFrom: [number, number];
    highRock: [number, number];
    beach: [number, number] | null;
    marsh: number;
}

type Biome = {color: RGB; speck?: RGB,density?: number, band?: boolean};

const B = {
    snowPlains: { color: [228, 236, 240]},
    snowTaiga:  { color: [214, 226, 228]},
    tundra:     { color: [150, 158, 140]},
    taiga:      { color: [62, 102, 82]},
    spruce:     { color: [44, 82, 66]},
    plains:     { color: [142, 184, 86]},
    flowers:    { color: [152, 192, 96]},
    forest:     { color: [66, 134, 64]},
    birch:      { color: [112, 164, 92]},
    darkForest: { color: [38, 96, 50]},
    swamp:      { color: [84, 112, 72]},
    savanna:    { color: [196, 178, 90]},
    shrub:      { color: [158, 172, 82] },
    jungle:     { color: [38, 146, 48]},
    desert:     { color: [228, 202, 132] },
    badlands:   { color: [196, 118, 70], band: true },
} satisfies Record<string, Biome>;

const BANDS: RGB[] = [[196, 118, 70], [214, 142, 88], [176, 100, 62], [224, 170, 110]];

const COLD = 0.10;
const COOL = 0.30;
const TEMPERATE = 0.60;
const WARM = 0.82;
const DRY = 0.30;
const WET = 0.62;

function pickBiome(t: number, m: number, height: number, slope: number, v:number):Biome{
    if(t < COLD)return m < 0.5?B.snowPlains:B.snowTaiga;
    if (t < COOL) return m < DRY ? B.tundra : m < WET ? B.taiga : B.spruce;
    if(t < TEMPERATE){
        if (m < DRY) return v > 0.45 ? B.flowers : B.plains;
        if (m < WET) return v > 0.35 ? B.birch : v < -0.35 ? B.darkForest : B.forest;
        return height < 0.45 && slope < 0.02 ? B.swamp : B.darkForest;
    }
    if(t < WARM){
        if(m < DRY)return B.savanna;
        if (m < WET) return v > 0.3 ? B.plains : B.shrub;
        return B.jungle;
    }
    return m < DRY?B.desert: m < WET? B.badlands:B.jungle;
}

const STYLES: Record<TerrainType, Style> = {
    landmass:  { palette: LAND,     discrete: true, rockColor: [125, 127, 120], rockSlope: [0.035, 0.08],  rockFrom: [0.40, 0.60], highRock: [0.70, 0.88], beach: [0.33, 0.37], marsh: 0.6 },
    island:    { palette: TROPICAL, discrete: true, rockColor: [112, 105, 91],  rockSlope: [0.035, 0.08],  rockFrom: [0.45, 0.65], highRock: [0.80, 0.95], beach: [0.34, 0.42], marsh: 0.4 },
    mountains: { palette: ALPINE,   discrete: true, rockColor: [108, 110, 108], rockSlope: [0.018, 0.055], rockFrom: [0.30, 0.48], highRock: [0.62, 0.80], beach: null,         marsh: 0 },
};

export function renderMap(
    canvas: HTMLCanvasElement,
    heightmap: number[][],
    terrain: TerrainType,
    field: ClimateField,
    hydro: Hydro | null,
    settlements: Settlement[],
    roads: Road[],
    sprites: Sprites | null
): void{
    const height = heightmap.length;
    const width = heightmap[0].length;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");

    if(!ctx){
        throw new Error("Could not get canvas context");
    }
    const img = ctx.createImageData(width, height);
    const seaLevel = seaLevelFor(terrain);
    const riverMin = terrain === "mountains" ? MOUNTAIN_RIVER_MIN : RIVER_MIN;
    let shore: Float32Array | null = null;
    let bank: Float32Array | null = null;
    let riverAlpha: Float32Array | null = null;

    if(hydro){
        const n = width * height;
        const isLake = new Uint8Array(n);
        const isLand = new Uint8Array(n);

        for(let i = 0; i < n; ++i){
            const wet = hydro.depth[i] > LAKE_MIN;
            isLake[i] = wet ? 1 : 0;
            isLand[i] = wet ? 0 : 1;
        }
        shore = blur(blur(distanceTo(isLand, width, height), width, height), width, height);
        bank = distanceTo(isLake, width, height);
        riverAlpha = new Float32Array(n);

        for(let y = 0; y < height; ++y){
            for(let x = 0; x< width; ++x){
                const f = hydro.fflow[y * width + x];
                if(f <= riverMin)continue;

                const r = RIVER_WIDTH + RIVER_GROW* Math.log2(f/riverMin);
                const reach = Math.ceil(r + 1);

                for(let dy = -reach; dy <= reach; ++dy){
                    for (let dx = -reach; dx <= reach; ++dx){
                        const nx = x + dx, ny = y + dy;
                        if(nx < 0 || nx >= width || ny < 0 || ny >= height)continue;

                        const a = 1 - smooth(r - 0.5, r + 0.5, Math.hypot(dx, dy));
                        const ni = ny*width + nx;
                        if (a > riverAlpha[ni]) riverAlpha[ni] = a;
                    }
                }
            }
        }
    }

    function lakeColor(dist: number): RGB {
        const t = 1 - Math.exp(-dist / SHORE_SCALE);   
        return t < 0.5 ? mix(LAKE_SHALLOW_COLOR, LAKE_MID_COLOR, t * 2): mix(LAKE_MID_COLOR, LAKE_DEEP_COLOR, (t - 0.5) * 2);
    }

    const flat = new Float32Array(width * height);
    for(let y = 0; y < height; ++y){
        for(let x = 0; x < width; ++x){
            flat[y*width + x] = heightmap[y][x];
        }
    }

    const smoothH = blur(blur(flat, width, height), width, height);
    const band = (i: number) => Math.floor((smoothH[i] - seaLevel) / CONTOUR_STEP[terrain]);

    for(let y = 0; y < height; ++y){
        for(let x = 0; x < width; ++x){
            const elevation = heightmap[y][x];

            const idx = (y*width + x)*4;
            const slope = slopeAt(heightmap, x, y);
            const [r, g, b] = getTerrainColor(elevation, terrain, field.temp[y*width + x], field.moist[y*width + x], field.variant[y*width + x], slope,x,y);

            const onLand = elevation > seaLevel;
            const light = onLand? hillShade(heightmap,x,y, SHADE_STRENGTH) : 1;
            const j = onLand ? jitter(x, y) : 0;

            let R = r*light + j;
            let G = g*light + j;
            let B = b*light + j;

            if(onLand && x < width - 1 && y < height - 1){
                const i0 = y * width + x;
                const b0 = band(i0);
                const bR = band(i0 + 1);
                const bD = band(i0 + width);

                if(b0 !== bR || b0 !== bD){
                const level = Math.max(b0, bD, bR);
                
                if(level > 0){
                        const a = level % INDEX_EVERY === 0 ? INDEX_ALPHA : CONTOUR_ALPHA;
                        R+= (CONTOUR_COLOR[0] - R)*a;
                        G+= (CONTOUR_COLOR[1] - G)*a;
                        B+= (CONTOUR_COLOR[2] - B)*a;
                    }
                }
            }

            if(hydro && onLand){
                const i = y*width + x;
                const riv = riverAlpha![i];
                R+= (RIVER_COLOR[0] - R)*riv;
                G+= (RIVER_COLOR[1] - G)*riv;
                B+= (RIVER_COLOR[2] - B)*riv;

                const lake = smooth(LAKE_MIN, LAKE_MIN + LAKE_EDGE, hydro.depth[i]);
                if (lake > 0) {
                    const c = lakeColor(shore![i]);
                    const deep = 1 - Math.exp(-shore![i]/SHORE_SCALE);
                    const opacity = lake * (LAKE_OPACITY_MIN + (1 - LAKE_OPACITY_MIN) * deep);

                    R += (c[0] - R) * opacity;
                    G += (c[1] - G) * opacity;
                    B += (c[2] - B) * opacity;

                    const rim = (1 - smooth(0, 2.5, shore![i])) * RIM_STRENGTH * lake;
                    R += (255 - R) * rim;
                    G += (255 - G) * rim;
                    B += (255 - B) * rim;

                }else{
                    const o = bank![i];
                    if (o < BANK_WIDTH) {
                        const k = (1 - o / BANK_WIDTH) * BANK_DARKEN;
                        R *= 1 - k;
                        G *= 1 - k;
                        B *= 1 - k;
                    }
                }
            }

            img.data[idx] = R;
            img.data[idx+1] = G;
            img.data[idx+2] = B;
            img.data[idx+3] = 255;
        }
    }
    ctx.putImageData(img, 0, 0);
    const stamp = (p: {x:number; y:number}, px: number) => {
        const half = Math.floor(px / 2);
        ctx.fillRect(p.x - half, p.y - half, px, px);
    }
    ctx.fillStyle  = CASING_COLOR;
    for(const road of roads){
        for(const p of road){
            stamp(p, CASING_PX);
        }
    }

    ctx.fillStyle = DECK_COLOR;
    for(const road of roads){
        for(const p of road){
            stamp(p, DECK_PX);
        }
    }

    if(PLANK_EVERY > 0){
        ctx.fillStyle = PLANK_COLOR;
        for(const road of roads){
            road.forEach((p,k) => {
                if (k%PLANK_EVERY === 0){
                    stamp(p, DECK_PX);
                }
            });
        }
    }
    ctx.imageSmoothingEnabled = false; 

    for(const s of settlements){
        const img  = sprites?.[s.size];
        if (!img) continue;
        
        const w = SIZE_PX[s.size];
        const h = Math.round(w*img?.height/img?.width);
        ctx.drawImage(img, Math.round(s.x - w / 2), Math.round(s.y - h + 1), w, h);
    }
}

function jitter(x:number, y:number):number {
    let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return (((h ^ (h >>> 16)) >>> 0) / 4294967296 - 0.5) * 3; 
}

function neighbors(heightmap: number[][], x: number, y: number) {
    const h = heightmap.length, w = heightmap[0].length;
    const xl = Math.max(x - 1, 0), xr = Math.min(x + 1, w - 1);
    const yu = Math.max(y - 1, 0), yd = Math.min(y + 1, h - 1);
    return {
        dx: heightmap[y][xr] - heightmap[y][xl],
        dy: heightmap[yd][x] - heightmap[yu][x],
    };
}


function hillShade(heightmap: number[][], x: number, y: number, strength: number): number {
    const { dx, dy } = neighbors(heightmap, x, y);
    const shade = (dx + dy)*strength;
    return 1 + Math.max(-0.30, Math.min(0.30, shade));
}

function slopeAt(heightmap: number[][], x: number, y: number): number {
    const { dx, dy } = neighbors(heightmap, x, y);
    return Math.hypot(dx, dy);
}

const mix = (a: RGB, b:RGB, t: number): RGB => [
    a[0] + (b[0] - a[0])*t,
    a[1] + (b[1] - a[1])*t,
    a[2] + (b[2] - a[2])*t
];

const smooth = (a: number, b: number, v: number) => {
    const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
    return t * t * (3 - 2 * t);
};

const WATER: Record<"landmass" | "island", [number,RGB][]> = {
    landmass: [[0.15, [25, 60, 104]], [0.25, [40, 120, 165]], [0.30, [85, 184, 201]], [0.33, [217, 194, 126]]],
    island:   [[0.15, [18, 39, 76]],  [0.25, [25, 81, 119]],  [0.30, [40, 151, 165]], [0.34, [231, 207, 148]]],
};

function getTerrainColor(height: number, terrain: TerrainType, temp: number, moist: number, variant: number, slope:number, x: number, y: number): RGB{
    if (terrain !== "mountains"){
        for(const [limit, color] of WATER[terrain]){
            if (height < limit) return color;
        }
    }
    return biomeColor(STYLES[terrain], temp, moist, variant, height, slope, x, y);
}

const BIOME_STEPS = 12;
const BIOME_NOISE = 0.025;

const SAND_COLOR: RGB = [222, 198, 134];
const SNOW_COLOR: RGB = [238, 240, 236];
const MARSH_COLOR: RGB = [78, 112, 72];

const clamp = (v: number) => Math.max(0, Math.min(1, v));

function biomeColor(s: Style, temp: number, moist: number,variant: number, height: number, slope: number, x: number, y: number): RGB {
    if (s.discrete) return discreteBiomeColor(s, temp, moist, variant, height, slope, x, y);
    const t = clamp(temp + jitter(x,y)*(BIOME_NOISE/1.5));
    const m = clamp(moist + jitter(x + 97,y + 31)*(BIOME_NOISE/1.5));
    const q = (v:number) => ((BIOME_STEPS > 0)?Math.round(v*BIOME_STEPS)/BIOME_STEPS:v);

    const ft = q(t) * 3;
    const fm = q(m) * 3;
    const t0 = Math.min(2, Math.floor(ft));
    const m0 = Math.min(2, Math.floor(fm));
    const top = mix(s.palette[t0][m0], s.palette[t0][m0 + 1], fm-m0);
    const bot = mix(s.palette[t0 + 1][m0], s.palette[t0 + 1][m0 + 1], fm - m0);
    let c = mix(top, bot, ft-t0);
    
    if(s.beach){
        c = mix(SAND_COLOR, c, smooth(s.beach[0], s.beach[1], height));
    }
    const marsh = smooth(0.8, 0.95, moist)* (1 - smooth(0.01, 0.03, slope)) * (1 - smooth(0.38, 0.5, height)) * s.marsh;
    c = mix(c, MARSH_COLOR, marsh);

    const rock = Math.max(smooth(s.rockSlope[0], s.rockSlope[1], slope) * smooth(s.rockFrom[0], s.rockFrom[1], height), smooth(s.highRock[0], s.highRock[1], height));
    c = mix(c, s.rockColor, rock);

    const snow = (1 - smooth(0.06, 0.16, temp)) * (1 - 0.6*smooth(0.05, 0.10, slope));
    return mix(c, SNOW_COLOR, snow);
}

function discreteBiomeColor(s:Style, temp: number, moist: number, variant: number, height: number, slope: number, x: number, y: number):RGB{
    const t= clamp(temp + jitter(x,y)*0.02);
    const m = clamp(moist + jitter(x + 97, y + 31)*0.02);
    const b = pickBiome(t,m, height, slope, variant);

    let c: RGB = b.color;
    if (b.band) c = BANDS[Math.floor(height * 55) % BANDS.length];

    if(s.beach){
        c = mix(SAND_COLOR ,c, smooth(s.beach[0], s.beach[1], height));
    }

    const rock = Math.max(smooth(s.rockSlope[0], s.rockSlope[1], slope) * smooth(s.rockFrom[0], s.rockFrom[1], height), smooth(s.highRock[0], s.highRock[1], height));
    c = mix(c, s.rockColor, rock);
    const snow = (1 - smooth(0.06, 0.16, temp)) * (1 - 0.6 * smooth(0.05, 0.10, slope));
    return mix(c, SNOW_COLOR, snow);
}