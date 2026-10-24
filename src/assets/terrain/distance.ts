export function distanceTo(mask: Uint8Array, w:number, h:number): Float32Array{
    const D = 1.4142;
    const d = new Float32Array(w*h);
    for (let i = 0; i < d.length; ++i){
        d[i] = mask[i] ? 0 : 1e9;
    }

    for(let y = 0; y < h; ++y){
        for(let x = 0; x < w; ++x){
            const i = y*w + x;
            if(x > 0)d[i] = Math.min(d[i], d[i - 1] + 1);
            if(y > 0)d[i] = Math.min(d[i], d[i - w] + 1);
            if (x > 0 && y > 0) d[i] = Math.min(d[i], d[i - w - 1] + D);
            if (x < w - 1 && y > 0) d[i] = Math.min(d[i], d[i - w + 1] + D);
        }
    }
    for (let y = h - 1; y >= 0; --y) {
        for (let x = w - 1; x >= 0; --x) {
            const i = y * w + x;
            if (x < w - 1) d[i] = Math.min(d[i], d[i + 1] + 1);
            if (y < h - 1) d[i] = Math.min(d[i], d[i + w] + 1);
            if (x < w - 1 && y < h - 1) d[i] = Math.min(d[i], d[i + w + 1] + D);
            if (x > 0 && y < h - 1) d[i] = Math.min(d[i], d[i + w - 1] + D);
        }
    }
    return d;
}


