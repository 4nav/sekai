import { createNoise2D } from "simplex-noise";
import { makeRng } from "./rng";


export function generateHeightMap(width: number,height: number,seed: number, ridged = false, broadRelief = false):number[][]{
    const noise = createNoise2D(makeRng(seed, 0));
    const warpX = createNoise2D(makeRng(seed, 2));
    const warpY = createNoise2D(makeRng(seed, 3));
    const WARP = broadRelief ? 0.02 : 0.1;
    
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
            let weight = 1;

            for(let oct = 0; oct < (broadRelief ? 6 : 5); ++oct){
                let n = noise(qx * freq, qy * freq);
                if(ridged){
                    n = 1 - Math.sqrt(n * n + 0.02);
                    n*=n;
                    n*=weight;
                    weight = Math.min(1, Math.max(0, n * 2));
                }
                elevation += n * amp;
                totamp += amp;
                amp /= broadRelief ? 1.7 : 2;
                freq*=2;     
            }
            const v = elevation/totamp;
            row.push(ridged?v:(v+1)/2);
        }
        map.push(row);
    }
    if(ridged){
        let min = Infinity, max = -Infinity;
        for(const row of map){
            for(const v of row){
                if(v < min){
                    min = v;
                }
                if(v > max){
                    max =v;
                }
            }
        }

        for(const row of map){
            for(let x = 0; x < row.length; ++x){
                row[x] = (row[x] - min) / (max - min);
            }
        }
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