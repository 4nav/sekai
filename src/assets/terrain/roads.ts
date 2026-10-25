import { seaLevelFor, type TerrainType } from "./shaping";
import type { Hydro } from "./rivers";
import type { Settlement } from "./settlements";
import { RIVER_MIN, MOUNTAIN_RIVER_MIN, LAKE_MIN } from "./config";

export type Road = {x: number, y: number}[];

const ROAD_RANGE = 70;
const CLIMB = 150;
const PEN = 6;
const CAP = 3;


function findPath(heightmap: number[][], blocked: Uint8Array, river: Uint8Array, w: number, h: number, a: Settlement, b: Settlement): Road|null{
    const n = w*h;
    const start = a.y * w + a.x;
    const goal = b.y * w + b.x;
    const cap = Math.hypot(a.x - b.x, a.y - b.y) * CAP;

    const g = new Float32Array(n).fill(Infinity);
    const from = new Int32Array(n).fill(-1);
    const closed = new Uint8Array(n);

    //now we implement dijkstra
    const heap: [number, number][] = [];
    const push = (f: number, i: number) => {
        heap.push([f, i]);
        let c = heap.length - 1;
        while (c > 0){
            const p = (c - 1) >> 1;
            if (heap[p][0] <= heap[c][0]) break;
            [heap[p], heap[c]] = [heap[c], heap[p]];
            c = p;
        }
    };
    const pop = (): [number, number] => {
        const top = heap[0];
        const last = heap.pop()!;
        if(heap.length){
            heap[0] = last;
            let p = 0;
            while(true){
                const l = 2 * p + 1;
                const r= l + 1;
                let m = p;
                if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
                if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
                if(m == p)break;
                [heap[p], heap[m]] = [heap[m], heap[p]];
                p = m;
            }
        }
        return top;
    };

    g[start] = 0;
    push(0, start);

    while(heap.length){
        const [,c] = pop();
        if(closed[c])continue;
        closed[c] = 1;
        if(c == goal){
            const path: Road = [];
            for(let i = goal; i !== -1; i = from[i]){
                path.push({x: i % w, y: (i / w) | 0});
            }
            return path.reverse();
        }
        
        const cx = c%w;
        const cy = (c / w) | 0;

        for(let dy = -1; dy <= 1; ++dy){
            for (let dx = -1; dx <= 1; ++dx){
                if (!dx && !dy) continue;
                const nx = cx + dx;
                const ny = cy + dy;
                if(nx < 0 || nx >= w || ny < 0 || ny >= h)continue;
                const ni = ny*w + nx;
                if (closed[ni] || blocked[ni]) continue;

                const step = dx && dy? Math.SQRT2 : 1;
                const climb = Math.abs(heightmap[ny][nx] - heightmap[cy][cx]) * CLIMB;
                const ng = g[c] + step + climb + (river[ni]?PEN:0); //apply a penalty here
                if (ng >= g[ni] || ng > cap) continue;

                g[ni] = ng;
                from[ni] = c;
                push(ng, ni);
            }
        }
    }
    return null;
}

export function buildRoads(heightmap: number[][], hydro: Hydro, terrain: TerrainType, settlements: Settlement[]): Road[] {
    const h =heightmap.length;
    const w = heightmap[0].length;
    const n = h*w;

    const sea  =seaLevelFor(terrain);

    const riverMin = terrain == "mountains" ? MOUNTAIN_RIVER_MIN : RIVER_MIN;

    const blocked = new Uint8Array(n);
    const river = new Uint8Array(n);
    for(let y = 0; y < h; ++y){
        for(let x = 0; x < h; ++x){
            const i = y * w + x;
            if(heightmap[y][x] <= sea || hydro.depth[i] > LAKE_MIN){blocked[i] = 1;}
            else if (hydro.fflow[i] > riverMin)river[i] = 1;
        }
    }

    const edges: {a: number; b:number; d:number}[] = [];
    for(let i = 0; i < settlements.length; ++i){
        for (let j = i + 1; j < settlements.length; ++j) {
        const d = Math.hypot(settlements[i].x -settlements[j].x, settlements[i].y - settlements[j].y);
        if (d < ROAD_RANGE) edges.push({ a: i, b: j, d });
        }
    }
    edges.sort((p,q) => p.d - q.d);

    //DSU
    const parent = settlements.map((_, i) => i);
    const find = (i:number):number => (parent[i] === i ? i: (parent[i] = find(parent[i])));

    const roads: Road[] = [];
    for(const e of edges){
        const ra = find(e.a);
        const rb = find(e.b);
        if (ra === rb) continue;

        const path = findPath(heightmap, blocked, river, w, h, settlements[e.a], settlements[e.b]);
        if(!path)continue;
        parent[ra] = rb;
        roads.push(path);
    }
    return roads;
}