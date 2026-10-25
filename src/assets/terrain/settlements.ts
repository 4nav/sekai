import { distanceTo } from "./distance";
import { seaLevelFor, type TerrainType } from "./shaping";
import type { Hydro } from "./rivers";
import { makeRng } from "./rng";
import { makeNames } from "./names";
import { RIVER_MIN, MOUNTAIN_RIVER_MIN, LAKE_MIN } from "./config";

export type Settlement = {x: number, y: number; size: "city" | "town" | "village"; name:string};

const MIN_DIST = 26;
const WATER_GAP = 1;

function hash(i:number):number{
    let h = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const smooth = (a: number, b: number, v: number) => {
    const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
        return t * t * (3 - 2 * t);
};

export function placeSettlements(heightmap: number[][], hydro: Hydro, terrain: TerrainType, seed: number): Settlement[]{
    const rng = makeRng(seed, 5);
    const total = 1 + Math.floor(rng() * 9);
    const cities = Math.min(total, 1 + (rng() < 0.3 ? 1 : 0));
    const rest = total - cities;
    const towns = Math.round(rest * (0.25 + rng() * 0.4));

    const h = heightmap.length;
    const w = heightmap[0].length;

    const n = w*h;
    const sea = seaLevelFor(terrain);
    const riverMin = terrain === "mountains" ? MOUNTAIN_RIVER_MIN : RIVER_MIN;

    const water = new Uint8Array(n);
    for(let y = 0; y < h; ++y){
        for(let x = 0; x < w; ++x){
            const i = y * w + x;
            if (heightmap[y][x] <= sea || hydro.depth[i] > LAKE_MIN || hydro.fflow[i] > riverMin) water[i] = 1;
        }
    }
    
    const toWater = distanceTo(water, w, h);

    const cand: {i: number, score: number}[] = [];
    for(let y= 1; y < h - 1; ++y){
        for (let x = 1; x < w - 1; ++x){
            const i = y*w + x;
            const elev = heightmap[y][x];
            if(water[i] || elev - sea > 0.5)continue;
            const slope = Math.hypot(heightmap[y][x + 1] - heightmap[y][x - 1], heightmap[y + 1][x] - heightmap[y - 1][x]);
            if(slope > 0.03)continue;
            if (toWater[i] < WATER_GAP) continue;

            const wet = Math.exp((-toWater[i] - WATER_GAP)/ 6);
            const flat = 1 - smooth(0.004, 0.03, slope);
            const low = 1 - smooth(0.02, 0.4, elev - sea);
            cand.push({ i, score: wet + flat + 0.5 * low + 0.15 * hash(i ^ seed) });
        }
    }
    cand.sort((a,b) => b.score - a.score);

    const out: Settlement[] = [];
    for(const c of cand){
        if (out.length >= total) break;
        const x = c.i % w;
        const y = (c.i / w) | 0;
        if(out.some(s => Math.hypot(s.x - x, s.y - y) < MIN_DIST))continue;
        const k = out.length;
        const size = k < cities ? "city" : k < cities + towns ? "town" : "village";
        out.push({x,y,size, name: ""});
    }
    const names = makeNames(out.length, seed);
    out.forEach((s,i) => {s.name = names[i];})
    return out;
}


