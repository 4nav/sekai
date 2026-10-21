import { useEffect, useRef, useState  } from "react";
import { generateHeightMap } from "./assets/terrain/heightmap";
import { shapeHeightmap, type TerrainType } from "./assets/terrain/shaping";
import { renderMap } from "./rendering/rendermap";
import './index.css';

function App(){
    const [terrain, setTerrain] = useState<TerrainType>("landmass");
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [seed, setSeed] = useState("42");
    const [curSeed, setCurSeed] = useState(42);


    useEffect(() =>{
        const canvas = canvasRef.current;

        if(!canvas)return;
        const rawHeightmap = generateHeightMap(300, 300, curSeed);
        const shapedHeightmap = shapeHeightmap(rawHeightmap, terrain);

        renderMap(canvas, shapedHeightmap);
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

            <canvas ref={canvasRef} />
        </main>
    )
}

export default App;