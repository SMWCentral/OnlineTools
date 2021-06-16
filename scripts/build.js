const fs = require("fs");
const path = require("path");

const Ajv = require("ajv");
const axios = require("axios").default;
const {minify} = require("terser");

const root = path.resolve(__dirname, "..");

function readFile(...segments){
    return String(fs.readFileSync(path.resolve(root, ...segments)));
}

function readJSON(...segments){
    return JSON.parse(readFile(...segments));
}

const fetchedLibraries = new Map();

async function fetchLibrary(name, version){
    const id = `${name}/${version}`;

    if(fetchedLibraries.has(id)){
        return fetchedLibraries.get(id);
    }

    console.log("fetch", id);

    const request = axios.get(`https://api.cdnjs.com/libraries/${id}`);
    fetchedLibraries.set(id, request);

    return request;
}

const toolHTML = ({id, name, authors, styles, markup, scripts}) => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>${name} - Online Tools - SMW Central</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="author" content="${authors}">
    ${styles}
</head>
<body>
    ${markup}
    ${scripts}
    <script type="module">
        import {init} from "../api.js";
        import tool from "./index.js";

        tool(init(${JSON.stringify(id)}));
    </script>
</body>
</html>
`;

const validate = new Ajv().compile(readJSON("scripts", "tool.schema.json"));

Promise.all(fs.readdirSync(path.resolve(root, "src"), {withFileTypes: true}).filter(
    (file) => !file.name.startsWith(".") && file.isDirectory()
).map((file) => file.name).map(async (id) => {
    let info;

    try {
        info = readJSON("src", id, "tool.json");
    }catch(error){
        console.error(e);
        return;
    }

    if(!validate(info)){
        console.log(id, validate.errors);
        return;
    }

    let markup;

    try {
        markup = readFile("src", id, "index.html");
    }catch(error){
        if(error.code === "ENOENT"){
            markup = "";
        }else{
            console.error(e);
            return;
        }
    }

    let script;

    try {
        script = await minify(readFile("src", id, "index.js"), {toplevel: true});
    }catch(error){
        console.error(error);
        return;
    }

    const styles = [];
    const scripts = [];

    await Promise.all(info.dependencies.map(async (dependency, index) => {
        let response;

        try {
            response = await fetchLibrary(dependency.library, dependency.version);
        }catch(error){
            console.error(error);
            return;
        }

        const {data} = response;

        if(!data.files.includes(dependency.file)){
            console.error("404", dependency.file);
            return;
        }

        const url = `https://cdnjs.cloudflare.com/ajax/libs/${dependency.library}/${dependency.version}/${dependency.file}`;

        // TODO: escape
        const sri = (dependency.file in data.sri) ? `integrity="${data.sri[dependency.file]}"` : "";

        if(sri === ""){
            console.warn("sri", dependency.file);
            return;
        }

        // Put at [index] to ensure the order stays unchanged
        if(dependency.type === "script"){
            scripts[index] = `<script src="${url}" ${sri} crossorigin="anonymous" referrerpolicy="no-referrer"></script>`;
        }else{
            styles[index] = `<link rel="stylesheet" href="${url}" ${sri} crossorigin="anonymous" referrerpolicy="no-referrer" />`;
        }
    }));

    fs.mkdirSync(path.resolve(root, "dist", id), {recursive: true});
    fs.writeFileSync(path.resolve(root, "dist", id, "index.js"), script.code);
    fs.writeFileSync(path.resolve(root, "dist", id, "index.html"), toolHTML({
        id,
        name: info.name,
        authors: info.authors.map((author) => author.name).sort((a, b) => a.localeCompare(b)).join(", "),
        styles: styles.filter((item) => item != null).join("\n    "),
        markup: `<div id="tool-${id}">${markup.trim()}</div>`,
        scripts: scripts.filter((item) => item != null).join("\n    ")
    }));

    return {id, info};
})).then((tools) => {
    fs.writeFileSync(path.resolve(root, "dist", "online_tools.json"), JSON.stringify({
        commit: null,
        tools: tools.map((tool) => ({
            id: tool.id,
            name: tool.info.name,
            game: tool.info.game,
            description: tool.info.description,
            authors: tool.info.authors
        }))
    }, undefined, 4));

    fs.writeFileSync(path.resolve(root, "dist", "index.html"), `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Online Tools - SMW Central</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
    <h1>Online Tools</h1>
    <ul>
        ${tools.map((tool) => `<li><a href="${tool.id}">${tool.info.name}</a></li>`).join("\n        ")}
    </ul>
</body>
</html>
`);
}).then(async () => {
    let api;

    try {
        api = await minify(readFile("src/api.js"), {toplevel: true});
    }catch(error){
        console.error(e);
        return;
    }

    fs.writeFileSync(path.resolve(root, "dist/api.js"), api.code);
});
