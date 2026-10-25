import { useEffect, useRef, useState  } from "react";
import { generateHeightMap, generateClimateMap } from "./assets/terrain/heightmap";
import { shapeHeightmap, seaLevelFor, type TerrainType } from "./assets/terrain/shaping";
import { renderMap } from "./rendering/rendermap";
import {flow} from "./assets/terrain/rivers"
import './index.css';
import { placeSettlements } from "./assets/terrain/settlements";
import { buildRoads } from "./assets/terrain/roads";
import { spritesPromise } from "./rendering/sprites";
import type { Settlement } from "./assets/terrain/settlements";
import { computeClimate } from "./assets/terrain/climate";

const SIZE = 300;


function App(){
    const [terrain, setTerrain] = useState<TerrainType>("landmass");
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [seed, setSeed] = useState("42");
    const [curSeed, setCurSeed] = useState(42);
    const [towns, setTowns] = useState<Settlement[]>([]);


    useEffect(() =>{
        let cancelled = false;
        (async () => {
            const sprites = await spritesPromise;
            const canvas = canvasRef.current;
            if(cancelled || !canvas)return;
            const rawHeightmap = generateHeightMap(300, 300, curSeed, terrain === "mountains", terrain === "landmass" ? 0.38 : 0.5);
            const climateMap = generateClimateMap(SIZE, SIZE, curSeed);
            const shapedHeightmap = shapeHeightmap(rawHeightmap, terrain);

            const hydro = flow(shapedHeightmap, seaLevelFor(terrain), curSeed);
            const settlements = placeSettlements(shapedHeightmap, hydro, terrain, curSeed);
            const roads = buildRoads(shapedHeightmap, hydro, terrain, settlements);
            const field = computeClimate(shapedHeightmap, hydro, climateMap, terrain, curSeed);

            renderMap(canvas, shapedHeightmap, terrain, field, hydro, settlements, roads, sprites);
            setTowns(settlements);
        })();
        return() => {cancelled = true;};
    }, [curSeed, terrain]);
    
    function generateWorld(){
        const parsedSeed = Number(seed);

        if(!Number.isSafeInteger(parsedSeed)){
            alert("Enter a valid seed");
            return;
        }

        setCurSeed(parsedSeed);
    }
    function randomiseSeed(){
        const newSeed = Math.floor(Math.random() * 1_000_000_000);
        setSeed(String(newSeed));
        setCurSeed(newSeed);
    }

    function exportPNG(){
        const canvas = canvasRef.current;
        if(!canvas)return;

        const output = document.createElement("canvas");
        const exportScale = 4;

        output.width = canvas.width * exportScale;
        output.height = canvas.height * exportScale;

        const ctx = output.getContext("2d");
        if(!ctx)return;

        ctx.scale(exportScale, exportScale);
        ctx.drawImage(canvas,0,0);

        const map = canvas.parentElement;
        if (!map) return;

        const mapRect = map.getBoundingClientRect();
        const labels = map.querySelectorAll<HTMLElement>(".label");

        const scaleX =  canvas.width/mapRect.width;
        const scaleY = canvas.height/mapRect.height;

        labels.forEach((label) =>{
            const rect = label.getBoundingClientRect();
            const style = getComputedStyle(label);
            const name = label.textContent ?? "";

            const x = (rect.left - mapRect.left) * scaleX;
            const y = (rect.top - mapRect.top) * scaleY;

            ctx.save();

            ctx.scale(scaleX, scaleY);
            ctx.font = style.font;
            ctx.textAlign = "left";
            ctx.textBaseline = "top";
            ctx.fillStyle = style.color;
            ctx.globalAlpha = Number(style.opacity);

            ctx.shadowColor = "transparent";
            ctx.shadowBlur = 0;

            ctx.fillStyle = "#1a1410";
            ctx.fillText(name, x/scaleX - 1, y/scaleY - 1);
            ctx.fillText(name, x/scaleX + 1, y/scaleY - 1);
            ctx.fillText(name, x/scaleX + 1, y/scaleY + 1);
            ctx.fillText(name, x/scaleX - 1, y/scaleY + 1);

            ctx.fillStyle = style.color;
            ctx.shadowColor = "#1a1410";
            ctx.shadowBlur = 4;
            ctx.fillText(name, x / scaleX, y / scaleY);

            ctx.restore();
        })

        const link = document.createElement("a");
        link.download = `sekai-${curSeed}-${terrain}.png`;
        link.href = output.toDataURL("image/png");
        link.click();
    }

    return(
        <main>
            <header className="page-header">
                <h1>Sekai</h1>
                <p>Procedural Cartography</p>
            </header>

            <div className = "controls">
                <label htmlFor="seed">Seed</label>
                <input id="seed" type = "number" value = {seed} onChange={(event) => setSeed(event.target.value)}/>
                <button onClick={generateWorld}>Generate</button>
                <button onClick={randomiseSeed}>Randomise</button>
                <button className="export-button" onClick={exportPNG}>
                    Export PNG
                </button>

                <label htmlFor="terrain">Terrain</label>
                <select id="terrain" value={terrain} onChange={(event) => setTerrain(event.target.value as TerrainType)}> 
                    <option value = "landmass">Landmass </option>
                    <option value="island">Island</option>
                    <option value="mountains">Mountain Range</option>

                </select>
            </div>

            <div className="map">
                <canvas ref={canvasRef}/>
                {towns.map(s => {
                    const nearRight = s.x > SIZE * 0.88;
                    const nearLeft = s.x < SIZE * 0.12;

                    return (
                        <span
                            key={`${s.x} - ${s.y}`}
                            className={`label ${s.size}`}
                            style ={{
                                left: `${(s.x/SIZE)*100}%`,
                                top: `${((s.y + 3)/SIZE)*100}%`,
                                transform: nearRight ? "translateX(-100%)" : nearLeft ? "translateX(0)" : undefined,
                            }}
                        >
                            {s.name}
                        </span>
                    );
                })}
            </div>
        </main>
    )
}

export default App;