import fs from "fs/promises";
import path from "path";
import url from "url";

import Ajv from "ajv";
import axios from "axios";
import chalk from "chalk";
import escape from "escape-html";
import {minify} from "terser";

import indexHTML from "./indexHTML.mjs";
import toolHTML from "./toolHTML.mjs";

const start = Date.now();

const root = url.fileURLToPath(new URL("..", import.meta.url));

function logInfo(source, text){
    if(text == null){
        console.log(source);
    }else{
        console.log(chalk`{blue [${source}]} ${text}`);
    }
}

function logFatal(source, text){
    console.log(chalk`{bgRed.white [${source}]} ${text}`);
    process.exit(-1);
}

async function readFile(...segments){
    return String(await fs.readFile(path.resolve(root, ...segments)));
}

async function readJSON(...segments){
    return JSON.parse(await readFile(...segments));
}

async function processJS(...segments){
    const file = await readFile(...segments);

    if(process.argv.includes("--no-minify")){
        return file;
    }

    const result = await minify(file, {toplevel: true});
    return result.code;
}

const fetchedLibraries = new Map();

async function fetchLibrary(id){
    if(fetchedLibraries.has(id)){
        return fetchedLibraries.get(id);
    }

    logInfo(`Fetching data for library ${id}`);

    const request = axios.get(`https://api.cdnjs.com/libraries/${id}`);
    fetchedLibraries.set(id, request);

    return request;
}

const validate = new Ajv().compile(await readJSON("scripts", "tool.schema.json"));

try {
    await fs.access(path.resolve(root, "dist"));

    console.log(chalk`{bgYellow.black [Warning]} Found stale dist directory (delete manually for a clean build)`);
}catch(error){
    // ignore
}

// Read and process all tools
const tools = await Promise.all((await fs.readdir(path.resolve(root, "src"), {withFileTypes: true})).filter(
    (file) => !file.name.startsWith(".") && file.isDirectory()
).map((file) => file.name).map(async (id) => {
    logInfo(`Discovered tool ${id}`);

    let info;

    try {
        info = await readJSON("src", id, "tool.json");
    }catch(error){
        logFatal(id, `Couldn't read tool.json: ${error.stack}`);
    }

    if(!validate(info)){
        logFatal(id, `Invalid tool.json: ${JSON.stringify(validate.errors)}`);
    }

    let markup;

    try {
        markup = await readFile("src", id, "index.html");
    }catch(error){
        if(error.code === "ENOENT"){
            markup = "";
        }else{
            logFatal(id, `Couldn't read index.html: ${error.stack}`);
        }
    }

    let script;

    try {
        script = await processJS("src", id, "index.js");
    }catch(error){
        logFatal(id, `Couldn't process index.js: ${error.stack}`);
    }

    const styles = [];
    const scripts = [];

    await Promise.all(info.dependencies.map(async (dependency, index) => {
        const library = `${dependency.library}/${dependency.version}`;

        let response;

        try {
            response = await fetchLibrary(library);
        }catch(error){
            logFatal(id, `Couldn't fetch required library ${library}: ${error.stack}`);
        }

        const {data} = response;

        if(!data.files.includes(dependency.file)){
            logFatal(id, `Library ${library} doesn't include required file ${dependency.file}`);
        }

        const url = `https://cdnjs.cloudflare.com/ajax/libs/${library}/${dependency.file}`;

        if(!(dependency.file in data.sri)){
            logFatal(id, `No SRI hash provided for file ${dependency.file} from library ${library}`);
        }

        const tail = `integrity="${escape(data.sri[dependency.file])}" crossorigin="anonymous" referrerpolicy="no-referrer"`;

        // Put at `index` to ensure the order stays constant
        if(dependency.type === "script"){
            scripts[index] = `<script src="${escape(url)}" ${tail}></script>`;
        }else{
            styles[index] = `<link rel="stylesheet" href="${escape(url)}" ${tail} />`;
        }
    }));

    try {
        await fs.mkdir(path.resolve(root, "dist", id), {recursive: true});

        await Promise.all([
            fs.writeFile(path.resolve(root, "dist", id, "index.js"), script),
            fs.writeFile(path.resolve(root, "dist", id, "index.html"), toolHTML({
                id,
                name: info.name,
                authors: info.authors.map((author) => author.name).sort((a, b) => a.localeCompare(b)).join(", "),
                styles: styles.filter((item) => item != null).join("\n    "),
                markup: `<div id="tool-${escape(id)}">${markup.trim()}</div>`,
                scripts: scripts.filter((item) => item != null).join("\n    ")
            }, escape))
        ]);

        logInfo(id, "Build successful");
    }catch(error){
        logFatal(id, `Couldn't write output: ${error.stack}`);
    }

    return {id, info};
}));

// Process API code
try {
    await fs.writeFile(path.resolve(root, "dist/api.js"), await processJS("src/api.js"));
}catch(error){
    logFatal("api.js", `Couldn't process API code: ${error.stack}`);
}

logInfo("api.js", "Processed successfully");

// Create index files (`index.html` and `online_tools.json`)
logInfo("Writing indexes");

await Promise.all([
    fs.writeFile(path.resolve(root, "dist", "online_tools.json"), JSON.stringify({
        commit: null,
        tools: tools.map((tool) => ({
            id: tool.id,
            name: tool.info.name,
            game: tool.info.game,
            description: tool.info.description,
            authors: tool.info.authors
        }))
    }, undefined, "    ")),
    fs.writeFile(path.resolve(root, "dist", "index.html"), indexHTML(tools, escape))
]);

logInfo("Success", `Built ${tools.length} tools in ${Date.now() - start} ms`);
