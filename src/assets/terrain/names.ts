import { makeRng } from "./rng";

const START = ["Al", "Bra", "Cor", "Dun", "El", "Fen", "Gar", "Hal", "Ire", "Kal", "Lor", "Mar", "Nor", "Os", "Pel", "Riv", "Sol", "Tar", "Ul", "Vel", "Wyn", "Yar", "Zan", "Ash", "Bel", "Thorn"];
const MID = ["a", "e", "i", "o", "an", "en", "or", "il", "ar", "wen"];
const END = ["ton", "ford", "haven", "mere", "wick", "dale", "stead", "port", "bury", "vale", "holm", "gard", "mouth", "bridge", "crest", "fall", "reach"];

export function makeNames(count: number, seed: number):string[]{
    const rng = makeRng(seed, 6);
    const pick = (a:string[]) => a[Math.floor(rng() * a.length)];

    const used = new Set<string>();
    const out: string[] = [];

    while(out.length < count){
        const name = pick(START) + (rng() < 0.35?pick(MID): "") + pick(END);
        if (used.has(name)) continue;
        used.add(name);
        out.push(name);
    }
    return out;
}