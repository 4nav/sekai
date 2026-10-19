import { createNoise2D } from "simplex-noise";

export function generateHeightMap(
    width: number,
    height: number,
    seed: number
):number[][]{
    let state = seed >>>0;

    const rand = () => {
        state = (state * 1664525 + 1013904223) >>> 0;
        return state / 2 ** 32;
    };
    const noise = createNoise2D(rand);
    const map: number[][] = [];

    for(let y = 0; y < height; y++){
        const row: number[] = [];
        for(let x = 0; x < width; ++x){
        let elevation = 0;
        let amp = 1;
        let freq = 1;
        let totamp = 0;

        for(let oct = 0; oct < 5; ++oct){
            elevation += noise((x/width)*4*freq, (y/height)*4*freq)*amp;
            totamp += amp;
            amp /=2;
            freq*=2;     
            }
            row.push((elevation/totamp +1)/2);
        }
        map.push(row);
    }
    return map;
}