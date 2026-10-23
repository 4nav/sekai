import type { TerrainType } from "../assets/terrain/shaping";

const SHADE_STRENGTH = 10;
type RGB = [number, number, number];


export function renderMap(
    canvas: HTMLCanvasElement,
    heightmap: number[][],
    terrain: TerrainType,
    climateMap: number[][]
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
    const seaLevel = terrain === "mountains" ? 0 : 0.33;
    for(let y = 0; y < height; ++y){
        for(let x = 0; x < width; ++x){
            const elevation = heightmap[y][x];

            const idx = (y*width + x)*4;

            const slope = slopeAt(heightmap, x, y);
            const [r, g, b] = getTerrainColor(elevation, terrain, climateMap[y][x], slope);

            const onLand = elevation > seaLevel;
            const light = onLand? hillShade(heightmap,x,y, SHADE_STRENGTH) : 1;
            const j = onLand ? jitter(x, y) : 0;

            img.data[idx] = r*light + j;
            img.data[idx+1] = g*light + j;
            img.data[idx+2] = b*light + j;
            img.data[idx+3] = 255;
        }
    }
    ctx.putImageData(img, 0, 0);
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
