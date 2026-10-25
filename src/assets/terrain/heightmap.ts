import { createNoise2D } from "simplex-noise";
import { makeRng } from "./rng";


export function generateHeightMap(width: number,height: number,seed: number, broadRelief = false, gain = 0.5):number[][]{
    const noise = createNoise2D(makeRng(seed, 0));
    const warpX = createNoise2D(makeRng(seed, 2));
    const warpY = createNoise2D(makeRng(seed, 3));
    const WARP = broadRelief ? 0 : 0.1;
    
    const map: number[][] = [];

    for(let y = 0; y < height; y++){
        const row: number[] = [];
        for(let x = 0; x < width; ++x){

            const scale = broadRelief ? 2.2 : 4;
            const nx = (x/width) * scale;
            const ny = (y/height) * scale;

            const qx = nx + warpX(nx * 0.6, ny * 0.6) * WARP;
            const qy = ny + warpY(nx * 0.6, ny * 0.6) * WARP;

            let elevation = 0, amp = 1, freq = 1, totamp = 0;

            for(let oct = 0; oct < (broadRelief ? 6 : 5); ++oct){
                elevation += noise(qx * freq, qy * freq) * amp;
                totamp += amp;
                amp *= broadRelief ? 1 / 1.7 : gain;
                freq*=2;     
            }
            row.push((elevation / totamp + 1) / 2);
        }
        map.push(row);
    }
    return map;
}

export function generateClimateMap(width: number, height: number, seed: number): number[][]{
    const noise = createNoise2D(makeRng(seed, 1));
    const mp: number[][] = [];

    for(let y = 0; y < height; ++y){
        const row: number[] = [];
        for (let x = 0; x < width; ++x){
            const nx = x / width, ny = y / height;
            const v = noise(nx * 3, ny * 3) * 0.55 + noise(nx * 7, ny * 7) * 0.30 + noise(nx * 16, ny * 16) * 0.15; 
            row.push(v);
        }
        mp.push(row);
    }
    return mp;
}