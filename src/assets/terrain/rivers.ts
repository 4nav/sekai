import { createNoise2D } from "simplex-noise";
import { makeRng } from "./rng";

const EPS = 1e-5;
const WOBBLE = 0.01;

//yay now im gonna finally be able to use my 1000 hours of competitive programming knowledge!
function hash(i:number):number{
    let h = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

class minHeap{
    private items: number[] = [];
    private key: Float32Array;
    constructor(key: Float32Array) { this.key = key; }

    get size() {return this.items.length;}

    push(i: number){
        const a = this.items;
        a.push(i);
        let c = a.length - 1;
        while(c > 0){
            const p = (c-1)>>1;
            if (this.key[a[p]] <= this.key[a[c]]) break;
            [a[p], a[c]] = [a[c], a[p]];
            c = p;
        }
    }

    pop(): number{
        const a = this.items;
        const top = a[0];
        const last = a.pop()!;

        if(a.length){
            a[0] = last;
            let p = 0;

            while(true){
                const l = 2*p + 1;
                const r = l + 1;
                let m = p;
                if (l < a.length && this.key[a[l]] < this.key[a[m]]) m = l;
                if(r < a.length && this.key[a[r]] < this.key[a[m]])m = r;

                if(m === p)break;
                [a[p], a[m]] = [a[m], a[p]];
                p = m;
            }
        }
        return top;
    }
}

export type Hydro = {fflow: Float32Array; depth: Float32Array};

export function flow(heightmap: number[][], seaLevel: number, seed:number): Hydro{
    const h = heightmap.length;
    const w = heightmap[0].length;

    const n = h*w;
    const wob = createNoise2D(makeRng(seed, 4));
    const elev =new Float32Array(n);
    for(let y = 0; y < h; ++y){
        for(let x = 0; x < w; ++x){
            const base = heightmap[y][x];

            const wobble = base > seaLevel ? (wob(x * 0.04, y * 0.04) + 0.5 * wob(x * 0.12, y * 0.12)) * WOBBLE : 0;
            elev[y * w + x] = base + wobble;
        }
    }

    const filled = new Float32Array(n);
    const drain = new Int32Array(n).fill(-1);
    const done = new Uint8Array(n);
    const ord = new Int32Array(n);

    let cnt = 0;
    const heap = new minHeap(filled);

    for(let y= 0; y < h; ++y){
        for(let x = 0;x < w; ++x){
            const i = y * w + x;
            if(x == 0 || y == 0 || x == w-1 || y === h - 1 || heightmap[y][x] <= seaLevel){
                filled[i] = elev[i];
                done[i] = 1;
                heap.push(i);
            }
        }
    }

    while(heap.size > 0){
        const c = heap.pop();
        ord[cnt++] = c;
        const cx = c%w, cy = c/w | 0;
        
        for(let dy = -1; dy <= 1; ++dy){
            for(let dx = -1; dx <= 1; ++dx){
                if(!dx && !dy)continue;
                const nx = cx + dx;
                const ny = cy + dy;

                if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
                const ni = ny*w + nx;
                if (done[ni]) continue;

                done[ni] = 1;
                filled[ni] = Math.max(elev[ni], filled[c] + EPS * (1 + 4 * hash(ni ^ seed)));
                drain[ni] = c;
                heap.push(ni);
            }
        }
    }

    const fflow = new Float32Array(n).fill(1);
    for(let i = cnt - 1; i>=0; --i){
        const c = ord[i];
        const r = drain[c];
        if (r >= 0) fflow[r] += fflow[c];
    }

    const depth = new Float32Array(n);
    for(let i = 0; i < n; ++i){
        depth[i] = filled[i] - elev[i];
    }

    let maxD = 0;
    for (let i = 0; i < n; ++i) if (depth[i] > maxD) maxD = depth[i];
    console.log("max lake depth", maxD);
    return {fflow,depth};
}