export function renderMap(
    canvas: HTMLCanvasElement,
    heightmap: number[][]
): void{
    const height = heightmap.length;
    const width = heightmap[0].length;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");

    if(!ctx){
        throw new Error("Could not get canvas context");
    }
    const img = ctx.createImageData(width, height);

    for(let y = 0; y < height; ++y){
        for(let x = 0; x < width; ++x){
            const elevation = heightmap[y][x];

            const idx = (y*width + x)*4;

            const val = Math.round(elevation* 255);

            img.data[idx] = val;
            img.data[idx+1] = val;
            img.data[idx+2] = val;
            img.data[idx+3] = 255;
        }
    }
    ctx.putImageData(img, 0, 0);
}
