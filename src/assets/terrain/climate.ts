import { createNoise2D } from "simplex-noise";
import { makeRng } from "./rng";
import { distanceTo } from "./distance";
import { seaLevelFor, type TerrainType } from "./shaping";
import type { Hydro } from "./rivers";
import { LAKE_MIN, RIVER_MIN, MOUNTAIN_RIVER_MIN } from "./config";

const BASE_MOIST = 0.25;
const WATER_BONUS = 0.45;
const WET_SCALE = 12;
const MOIST_NOISE = 0.3;

const clamp = (v:number) => Math.max(0, Math.min(1,v));

export type ClimateField = { temp: Float32Array; moist: Float32Array; variant: Float32Array };

const RANGE: Record<TerrainType, {t: [number, number]; m: [number, number]} >= {
    landmass: {t: [0,1], m: [0,1]},
    island: {t: [0.3,1], m: [0.2, 1]},
    mountains: { t: [0, 1],   m: [0, 1] }
};

function stretch(field: Float32Array, water: Uint8Array, [lo, hi]: [number, number]){
    const land:number[] = [];
    for(let i = 0; i < field.length; ++i){
        if(!water[i])land.push(field[i]);
    }
    const sorted = Float32Array.from(land).sort();
    const a = sorted[Math.floor(sorted.length*0.02)];
    const b = sorted[Math.floor(sorted.length * 0.98)];
    const span = Math.max(1e-6, b - a);

    for(let i = 0; i < field.length; ++i){
        field[i] = lo + clamp((field[i] - a) / span) * (hi - lo);
    }
}

const TEMP: Record<TerrainType, { base: number; noise: number; lat: number; lapse: number }> = {
    landmass:  { base: 0.58, noise: 0.55, lat: 0.15, lapse: 0.50 },   
    island:    { base: 0.75, noise: 0.45, lat: 0.08, lapse: 0.60 },   
    mountains: { base: 0.68, noise: 0.30, lat: 0.10, lapse: 0.80 },  
};

export function computeClimate(heightmap: number[][], hydro: Hydro, climateMap: number[][], terrain: TerrainType, seed:number): ClimateField {
    const h = heightmap.length;
    const w = heightmap[0].length;
    const n = h*w;

    const sea = seaLevelFor(terrain);
    const riverMin = (terrain === "mountains")?MOUNTAIN_RIVER_MIN:RIVER_MIN;

    const water = new Uint8Array(n);
    for(let y = 0; y < h; ++y){
        for(let x = 0; x < w; ++x){
            const i = y*w+x;
            if(heightmap[y][x] <= sea || hydro.depth[i] > LAKE_MIN || hydro.fflow[i] > riverMin)water[i] = 1; 
        }
    }
    const toWater = distanceTo(water, w, h);

    const noise = createNoise2D(makeRng(seed, 8));
    const moist = new Float32Array(n);
    const temp = new Float32Array(n);
    const variant = new Float32Array(n);
    const vNoise = createNoise2D(makeRng(seed, 9));

    for(let y = 0; y < h; ++y){
        for(let x = 0; x < w; ++x){
            const i = y*w + x;
            const nx = x/w;
            const ny = y/h;

            const nearWater = Math.exp(-toWater[i]/WET_SCALE);
            const wobble = noise(nx*3, ny*3) * 0.7 + noise(nx*8, ny*8)*0.3;
            moist[i] = clamp(BASE_MOIST + WATER_BONUS*nearWater + MOIST_NOISE*wobble);

            const above = Math.max(0, heightmap[y][x] - sea) / (1 - sea);
            const t = TEMP[terrain];
            temp[i] = clamp(t.base + climateMap[y][x] * t.noise + (ny - 0.5) * t.lat * 2 - t.lapse * above);
            variant[i] = vNoise(nx*5, ny*5)*0.7 + vNoise(nx * 12, ny * 12) * 0.3;
        }
    }
    if (terrain !== "mountains") {
        stretch(temp, water, RANGE[terrain].t);
        stretch(moist, water, RANGE[terrain].m);
    }
    return {temp, moist, variant};
}