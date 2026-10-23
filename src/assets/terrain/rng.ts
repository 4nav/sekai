export function makeRng(seed: number, stream = 0): () => number{
    let h = (seed ^ Math.imul(stream + 1, 0x9e3779b9)) >>> 0;
    h = Math.imul(h^(h >>> 16), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    let a = (h ^ (h >>> 16)) >>> 0;

    return () => {
        a = (a + 0x6d2b79f5) >>>0;
        let t= a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}