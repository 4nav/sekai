import cityUrl from "../assets/sprites/city.png";
import townUrl from "../assets/sprites/town.png";
import vilUrl from "../assets/sprites/village.png";

export type Sprites = Record<"city" | "town" | "village", HTMLImageElement>;

function load(url: string): Promise <HTMLImageElement>{
    return new Promise((resolve, reject) =>{
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
    });
}

async function loadSprites(): Promise<Sprites>{
    const [city, town, village] = await Promise.all([load(cityUrl), load(townUrl), load(vilUrl)]);
    return { city, town, village };
}

export const spritesPromise: Promise<Sprites | null> = loadSprites().catch(() => null);