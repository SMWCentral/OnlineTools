import {execSync} from "child_process";
import fs from "fs/promises";
import path from "path";

import Ajv from "ajv";
import chalk from "chalk";
import escape from "escape-html";
import {minify as minifyJS} from "terser";
import { minify as minifyHTML } from "html-minifier-terser";

import indexHTML from "./indexHTML.mjs";
import toolHTML from "./toolHTML.mjs";

const start = Date.now();

const root = path.dirname(import.meta.dirname);

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

    const result = await minifyJS(file, {toplevel: true});
    return result.code;
}

async function processHTML(html){
    if(process.argv.includes("--no-minify")){
        return html;
    }

    return minifyHTML(html, {
        caseSensitive: true,
        collapseWhitespace: true,
        decodeEntities: true,
        minifyCSS: true,
        minifyJS: true,
        removeComments: true,
        removeOptionalTags: true,
    });
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

    let html;

    try {
        html = await readFile("src", id, "index.html");
    }catch(error){
        if(error.code === "ENOENT"){
            html = "";
        }else{
            logFatal(id, `Couldn't read index.html: ${error.stack}`);
        }
    }

    let css;

    try {
        css = await readFile("src", id, "main.css");
    }catch(error){
        if(error.code === "ENOENT"){
            css = "";
        }else{
            logFatal(id, `Couldn't read main.css: ${error.stack}`);
        }
    }

    let script;

    try {
        script = await processJS("src", id, "index.js");
    }catch(error){
        logFatal(id, `Couldn't process index.js: ${error.stack}`);
    }

    let finalHTML = toolHTML({
        id,
        name: info.name,
        authors: info.authors.map((author) => author.name).sort((a, b) => a.localeCompare(b)).join(", "),
        css: css ? `<style>${css}</style>` : "",
        html: `<div id="tool-${escape(id)}">${html.trim()}</div>`,
    }, escape);

    try {
        finalHTML = await processHTML(finalHTML);
    }catch(error){
        logFatal(id, `Couldn't process final index.html: ${error.stack}`);
    }

    try {
        await fs.mkdir(path.resolve(root, "dist", id), {recursive: true});

        await Promise.all([
            fs.writeFile(path.resolve(root, "dist", id, "index.js"), script),
            fs.writeFile(path.resolve(root, "dist", id, "index.html"), finalHTML)
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

let commit = "main";

if(String(execSync("git status --porcelain")).length === 0){
    // Working directory clean - point to last commit
    commit = String(execSync("git rev-parse --short HEAD")).trim();
}else{
    // Uncommitted changes - point to current branch
    commit = String(execSync("git rev-parse --abbrev-ref HEAD")).trim();
}

let finalIndexHTML = indexHTML(tools, escape);

try {
    finalIndexHTML = await processHTML(finalIndexHTML);
}catch(error){
    logFatal(id, `Couldn't process index HTML: ${error.stack}`);
}

await Promise.all([
    fs.writeFile(path.resolve(root, "dist", "online_tools.json"), JSON.stringify({
        commit,
        tools: tools.map((tool) => ({
            id: tool.id,
            name: tool.info.name,
            game: tool.info.game,
            description: tool.info.description,
            authors: tool.info.authors
        }))
    }, undefined, "    ")),
    fs.writeFile(path.resolve(root, "dist", "index.html"), finalIndexHTML)
]);

logInfo("Success", `Built ${tools.length} tools in ${Date.now() - start} ms`);
