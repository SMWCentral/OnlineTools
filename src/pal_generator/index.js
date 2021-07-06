const imageCanvas = document.createElement("canvas");

const scalingConfigs = [
    {colorSize: {x: 32, y: 32}, backAreaColorOffset: {x: 724, y: 118}}, // 200%
    {colorSize: {x: 26, y: 28}, backAreaColorOffset: {x: 598, y: 104}}, // 175%
    {colorSize: {x: 24, y: 23}, backAreaColorOffset: {x: 539, y: 86}},  // 150%
    {colorSize: {x: 18, y: 19}, backAreaColorOffset: {x: 421, y: 72}},  // 125%
    {colorSize: {x: 16, y: 16}, backAreaColorOffset: {x: 362, y: 59}},  // 100%
];

const colorsPerAxis = 16;

function inBounds(image, x, y){
    return x >= 0 && x < image.width && y >= 0 && y < image.height;
}

function getColor({data, width}, x, y){
    const index = (y * width + x) * 4;

    return [
        data[index],
        data[index + 1],
        data[index + 2]
    ];
}

function isSingleColorRectangle(/** @type ImageData */ image, startX, startY, config){
    const [r, g, b] = getColor(image, startX, startY);

    for(let y = 0; y < config.colorSize.y; y += 1){
        for(let x = 0; x < config.colorSize.x; x += 1){
            const curX = startX + x;
            const curY = startY + y;

            if(!inBounds(image, curX, curY)){
                return false;
            }

            const [newR, newG, newB] = getColor(image, curX, curY);

            if(r !== newR || g !== newG || b !== newB){
                return false;
            }
        }
    }

    return true;
}

function isProbableStartingPoint(/** @type ImageData */ image, x, y, config){
    for(let i = 0; i < colorsPerAxis; i += 1){
        const curX = x + i * config.colorSize.x;
        const curY = y + i * config.colorSize.y;

        if(!inBounds(image, curX, curY)){
            return false;
        }

        if(!isSingleColorRectangle(image, curX, curY, config)){
            return false;
        }
    }

    return true;
}

function findProbableStartingPointAndScaling(/** @type ImageData */ image){
    for(const config of scalingConfigs){
        const paletteWidth = config.colorSize.x * colorsPerAxis;
        const paletteHeight = config.colorSize.y * colorsPerAxis;

        for(let y = 0; y <= image.height - paletteHeight; y += 1){
            for(let x = 0; x <= image.width - paletteWidth; x += 1){
                if(isProbableStartingPoint(image, x, y, config)){
                    return {x, y, config};
                }
            }
        }
    }

    return {error: "Nothing in that image looks like a palette from Lunar Magic."};
}

function getBackAreaColor(/** @type ImageData */ image, startX, startY, config){
    const colorX = startX + config.backAreaColorOffset.x;
    const colorY = startY + config.backAreaColorOffset.y;

    if(!inBounds(image, colorX, colorY)){
        return undefined;
    }

    return getColor(image, colorX, colorY);
}

function getPaletteDataFromImage(/** @type ImageData */ image, startX, startY, config){
    const data = new Uint8Array(768);

    const backAreaColor = getBackAreaColor(image, startX, startY, config);

    let index = 0;

    for(let y = 0; y < colorsPerAxis; y += 1){
        for(let x = 0; x < colorsPerAxis; x += 1){
            const curX = startX + x * config.colorSize.x;
            const curY = startY + y * config.colorSize.y;

            let r, g, b;

            if(x === 0 && backAreaColor != null){
                [r, g, b] = backAreaColor;
            }else{
                [r, g, b] = getColor(image, curX, curY);
            }

            data[index++] = r & 0xFF;
            data[index++] = g & 0xFF;
            data[index++] = b & 0xFF;
        }
    }

    return data;
}

function processImage(/** @type HTMLImageElement */ image){
    const width = image.naturalWidth;
    const height = image.naturalHeight;

    imageCanvas.width = width;
    imageCanvas.height = height;

    const ctx = imageCanvas.getContext("2d");
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0);

    const data = ctx.getImageData(0, 0, width, height);

    const start = findProbableStartingPointAndScaling(data);

    if(start.error != null){
        return start;
    }

    return {pal: getPaletteDataFromImage(data, start.x, start.y, start.config)};
}

function updatePreview(canvas, palette){
    /** @type CanvasRenderingContext2D */
    const ctx = canvas.getContext("2d");

    const imageData = ctx.getImageData(0, 0, colorsPerAxis, colorsPerAxis);
    const {data} = imageData;

    for(let d = 0, p = 0; p < palette.length; d += 4, p += 3){
        data[d] = palette[p];
        data[d + 1] = palette[p + 1];
        data[d + 2] = palette[p + 2];
        data[d + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);
}

export default function(smwc){
    /** @type HTMLInputElement */
    const fileInput = smwc.byID("file");

    /** @type HTMLDivElement */
    const outputDiv = smwc.byID("output");

    const previewCanvas = smwc.byID("preview");

    let output;

    async function processFile(file){
        smwc.setStatus({message: "⌛ Processing..."});

        new Promise((resolve, reject) => {
            const image = document.createElement("img");
            image.src = URL.createObjectURL(file);

            image.onload = () => {
                URL.revokeObjectURL(image.src);
                resolve(processImage(image));
            };

            image.onerror = (error) => {
                URL.revokeObjectURL(image.src);
                reject(error);
            };
        }).then((result) => {
            smwc.setStatus(result);

            if(result.pal != null){
                const ext = file.name.lastIndexOf(".");
                const name = `${(ext === -1) ? file.name : file.name.slice(0, ext)}.pal`;

                output = {name, blob: new Blob([result.pal], {type: "application/octet-stream"})};
                outputDiv.style.display = "";

                updatePreview(previewCanvas, result.pal);
            }
        }).catch((error) => {
            console.log(error);
            smwc.setStatus({error: "Internal error."});
        });
    }

    fileInput.addEventListener("change", () => {
        const file = fileInput.files[0];

        output = undefined;
        outputDiv.style.display = "none";

        if(file == null){
            return smwc.setStatus({error: "No file specified."});
        }

        processFile(file);
    });

    smwc.root.addEventListener("paste", (event) => {
        for(const file of event.clipboardData.files){
            if(file.type.startsWith("image/")){
                fileInput.value = null;

                output = undefined;
                outputDiv.style.display = "none";

                processFile(file);
            }
        }
    });

    smwc.byID("download").addEventListener("click", () => {
        if(output != null){
            smwc.download(output.name, output.blob);
        }
    });
}
