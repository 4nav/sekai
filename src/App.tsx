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
            const rawHeightmap = generateHeightMap(SIZE, SIZE, curSeed, terrain === "mountains");
            const climateMap = generateClimateMap(SIZE, SIZE, curSeed);
            const shapedHeightmap = shapeHeightmap(rawHeightmap, terrain);

            const hydro = flow(shapedHeightmap, seaLevelFor(terrain), curSeed);
            const settlements = placeSettlements(shapedHeightmap, hydro, terrain, curSeed);
            const roads = buildRoads(shapedHeightmap, hydro, terrain, settlements);

            renderMap(canvas, shapedHeightmap, terrain, climateMap, hydro, settlements, roads, sprites);
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

    return(
        <main>
            <h1>Sekai</h1>
            <p>Procedural World Gen</p>

            <div className = "controls">
                <label htmlFor="seed">Seed</label>
                <input id="seed" type = "number" value = {seed} onChange={(event) => setSeed(event.target.value)}/>
                <button onClick={generateWorld}>Generate</button>
                <button onClick={randomiseSeed}>Randomise</button>

                <label htmlFor="terrain">Terrain</label>
                <select id="terrain" value={terrain} onChange={(event) => setTerrain(event.target.value as TerrainType)}> 
                    <option value = "landmass">Landmass </option>
                    <option value="island">Island</option>
                    <option value="mountains">Mountain Range</option>

                </select>
            </div>

            <div className="map">
                <canvas ref={canvasRef}/>
                {towns.map(s => (
                    <span
                        key ={`${s.x}-${s.y}`}
                        className={`label ${s.size}`}
                        style={{ left: `${(s.x / SIZE) * 100}%`, top: `${((s.y + 3) / SIZE) * 100}%` }}
                    >
                        {s.name}
                    </span>
                ))}
            </div>
        </main>
    )
}

export default App;