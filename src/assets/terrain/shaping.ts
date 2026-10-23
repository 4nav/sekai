export type TerrainType = "landmass" | "island" | "mountains";

export function shapeHeightmap(
    heightmap: number[][],
    terrain: TerrainType
):number[][]{
    const height = heightmap.length;
    const width = heightmap[0].length;

    return heightmap.map((row,y) =>
        row.map((value,x) =>{
            const nx = (x / (width - 1)) * 2 - 1;
            const ny = (y / (height - 1)) * 2 - 1;

            
            if (terrain === "island") {
                const coastNoise = sampleNoise(heightmap, x, y, 12);
                const dist = Math.sqrt( (nx * nx) / 0.85 + (ny * ny) / 0.7);
                const warpedDist = dist + 0.10 * Math.sin(ny * 3.5 + coastNoise * 2) + 0.07 * Math.sin(nx * 4.0 - coastNoise * 2) + 0.04 * Math.sin(nx * 7.0 + ny * 5.0);
                const mask = clamp((1.0 - warpedDist) * 3.0);
                return clamp(0.02 + mask * (0.25 + value * 0.73));
            }

            
            if (terrain === "mountains") {
                return clamp(0.16 + Math.pow(value, 1.15) * 0.84);
            }

            //landscape or wtvr
            const warpedX = nx + 0.18 * Math.sin(ny * 3.0 + 0.5) + 0.09 * Math.sin(ny * 7.1 - 1.0);
            const warpedY = ny + 0.16 * Math.sin(nx * 3.5 - 0.7) + 0.08 * Math.sin(nx * 6.2 - 1.0);
            const dist = Math.sqrt((warpedX * warpedX) / 1.8 +(warpedY * warpedY) / 1.25);

            const coastNoise = sampleNoise(heightmap, x, y, 16);
            const coastline = 0.22 * coastNoise + 0.025 * Math.sin(nx * 4.0 + ny * 3.0) + 0.02 * Math.sin(ny * 6.0 - nx * 2.0);

            const mask = clamp((1.12 - dist + coastline) * 2.0);
            return clamp(0.02 + mask * (0.2 + value * 0.78));
        })
    );
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function sampleNoise(heightmap: number[][], x: number, y:number, scale: number): number{
    const height = heightmap.length;
    const width = heightmap[0].length;

    const gx = x / scale;
    const gy = y / scale;

    const x0 = Math.floor(gx) * scale;
    const y0 = Math.floor(gy) * scale;
    const x1 = Math.min(width - 1, x0 + scale);
    const y1 = Math.min(height - 1, y0 + scale);

    const tx = (x - x0) / Math.max(1, x1 - x0);
    const ty = (y - y0) / Math.max(1, y1 - y0);

    const a = heightmap[y0][x0];
    const b = heightmap[y0][x1];
    const c = heightmap[y1][x0];
    const d = heightmap[y1][x1];

    const top = a * (1 - tx) + b * tx;
    const bottom = c * (1 - tx) + d * tx;

    return (top * (1 - ty) + bottom * ty) * 2 - 1;
}