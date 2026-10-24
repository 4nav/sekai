import { seaLevelFor, type TerrainType } from "../assets/terrain/shaping";
import type { Hydro } from "../assets/terrain/rivers";
import { distanceTo } from "../assets/terrain/distance";
import type { Settlement } from "../assets/terrain/settlements";
import type { Road } from "../assets/terrain/roads";
import type { Sprites } from "./sprites";


const RIVER_MIN = 300;   
const MOUNTAIN_RIVER_MIN = 900;
const LAKE_MIN = 0.05;
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
const CONTOUR_STEP = 0.04;
const INDEX_EVERY = 5;                
const CONTOUR_ALPHA = 0.14;
const INDEX_ALPHA = 0.28;
const CONTOUR_COLOR: RGB = [60, 40, 25];

export function renderMap(
    canvas: HTMLCanvasElement,
    heightmap: number[][],
    terrain: TerrainType,
    climateMap: number[][],
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

        for(let y = 0; y <= height; ++y){
            for(let x = 0; x<=width; ++x){
                const f = hydro.fflow[y * width + x];
                if(f <= riverMin)continue;

                const r = RIVER_WIDTH + RIVER_GROW* Math.log2(f/riverMin);
                const reach = Math.ceil(r + 1);

                for(let dy = -reach; dy <= reach; ++dy){
                    for (let dx = -reach; dx <= reach; ++dx){
                        const nx = x + dx, ny = y + dy;
                        if(nx < 0 || nx >= height || ny < 0 || ny >= width)continue;

                        const a = 1 - smooth(r - 0.5, r + 0.5, Math.hypot(dx, dy));
                        const ni = ny*width + nx;
                        if (a > riverAlpha[ni]) riverAlpha[ni] = a;
                    }
                }
            }
        }
    }

    function blur(src: Float32Array, w:number, h:number): Float32Array{
        const out = new Float32Array(src.length);
        for(let y = 0; y < h; ++y){
            for(let x = 0; x < w; ++ x){
                let sum = 0;
                let cnt = 0;

                for(let dy = -1; dy <= 1; ++dy){
                    for (let dx = -1; dx <= 1; ++dx) {
                        const nx = x + dx, ny = y + dy;
                        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
                        sum += src[ny*w + nx];
                        ++cnt;
                    }
                }
                out[y*w + x] = sum/cnt
            }
        }
        return out;
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
    const band = (i: number) => Math.floor((smoothH[i] - seaLevel) / CONTOUR_STEP);

    for(let y = 0; y < height; ++y){
        for(let x = 0; x < width; ++x){
            const elevation = heightmap[y][x];

            const idx = (y*width + x)*4;

            const slope = slopeAt(heightmap, x, y);
            const [r, g, b] = getTerrainColor(elevation, terrain, climateMap[y][x], slope);

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

function mountainColor(height: number, slope: number):RGB{
    let c: RGB = [48, 112, 62];
    c = mix(c, [119, 137, 79], smooth(0.30, 0.36, height));
    c = mix(c, [132, 134, 130], smooth(0.43, 0.50, height));
    c = mix(c, [76, 82, 91], smooth(0.018, 0.055, slope) * smooth(0.38, 0.48, height));

    const snowline = smooth(0.60, 0.70, height);
    const snowCoverage = 0.68 + smooth(0.035, 0.12, slope) * 0.32;
    return mix(c, [239, 242, 244], snowline * snowCoverage);
}

function getTerrainColor(height: number, terrain: TerrainType,climate: number, slope: number):[number, number, number] {
    if (terrain === "mountains") return mountainColor(height, slope);

    if (terrain === "island") {
        if (height < 0.15) return [18, 39, 76];    // Deep pirate-sea navy
        if (height < 0.25) return [25, 81, 119];   // Open ocean
        if (height < 0.30) return [40, 151, 165];  // Turquoise shallows
        if (height < 0.34) return [231, 207, 148]; // Pale sandy beaches
        if (height < 0.43) return climate > 0.2 ? [205, 185, 120] : [190, 177, 105]; // Dry sand and scrub
        if (height < 0.55) return climate < -0.1 ? [86, 140, 70] : [110, 151, 65];  // Tropical grass
        if (height < 0.70) return climate > 0.2 ? [74, 120, 50] : [54, 112, 52];   // Dense jungle
        if (height < 0.80) return [39, 83, 49];    // Dark jungle
        if (height < 0.90) return [112, 105, 91];  // Rocky cliffs
        return [184, 181, 163];                    // Pale exposed rock
    }

    // Landmass
    if (height < 0.15) return [25, 60, 104];       // Deep ocean
    if (height < 0.25) return [40, 120, 165];      // Ocean
    if (height < 0.30) return [85, 184, 201];      // Shallow water
    if (height < 0.33) return [217, 194, 126];     // Beach

    if (height > 0.84) return [238, 240, 236];     // Snow
    if (height > 0.72) return [125, 127, 120];     // Stone

    // Cold
    if (climate < -0.25) {
        if (height > 0.62) return [105, 111, 105]; // Cold stone
        return [94, 128, 105];                     // Taiga
    }

    // Hot
    if (climate > 0.25) {
        if (height > 0.55) return [174, 123, 78];  // Badlands
        return [222, 195, 126];                    // Sand
    }

    // Temperate
    if (height > 0.58) return [82, 119, 63];       // Forested highlands
    if (height > 0.43) return [52, 122, 56];       // Forest
    return [120, 184, 74];                         // Plains
}

