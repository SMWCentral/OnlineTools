function byte(number){
    return `$${BigInt.asUintN(8, number).toString(16).toUpperCase().padStart(2, "0")}`;
}

function doCircleTool(input, angle){
    input = input.replaceAll("\r\n", "\n");

    const tableStart = input.indexOf("HorzSineTable:\n");

    if(tableStart === -1){
        return {error: "Didn't find HorzSineTable: in the ASM file."};
    }

    if(angle < 0){
        angle = 90 - angle;
    }

    angle /= 90;

    const offX = [];
    const offY = [];

    for(let i = 0; i < 256; i++){
        offX[i] = BigInt(Math.trunc(256 * Math.sin(angle * (Math.PI / 2) * Math.sin(i * Math.PI / 256))));
        offY[i] = BigInt(Math.trunc(256 * Math.cos(angle * (Math.PI / 2) * Math.sin(i * Math.PI / 256))));
    }

    const horzSineTable = ["HorzSineTable:\n"];
    const vertSineTable = ["VertSineTable:\n"];

    for(let x = 0; x < 32; x++){
        horzSineTable.push("db ");
        vertSineTable.push("db ");

        for(let y = 0; y < 8; y++){
            if(y > 0){
                horzSineTable.push(",");
                vertSineTable.push(",");
            }

            const valueX = BigInt.asUintN(16, offX[x * 8 + y]);
            const valueY = BigInt.asUintN(16, offY[x * 8 + y]);

            horzSineTable.push(byte(valueX), ",", byte(valueX / 256n));
            vertSineTable.push(byte(valueY), ",", byte(valueY / 256n));
        }

        horzSineTable.push("\n");
        vertSineTable.push("\n");
    }

    return {
        asm: input.slice(0, tableStart).concat(horzSineTable.join("")).concat(vertSineTable.join(""))
    };
}

export default function(smwc){
    const fileInput = smwc.byID("file");
    const angleInput = smwc.byID("angle");

    const generate = smwc.byID("generate");

    generate.addEventListener("click", () => {
        const file = fileInput.files[0];

        if(file == null){
            return smwc.setStatus({error: "No file specified."});
        }

        generate.disabled = true;

        const angle = Number(angleInput.value);

        file.text().then((input) => {
            const result = doCircleTool(input, angle);

            smwc.setStatus(result);

            if(result.asm != null){
                return smwc.download(file.name, new Blob([result.asm], {type: "text/x-asm"}));
            }
        }).catch((error) => {
            console.log(error);
            smwc.setStatus({error: "Internal error."});
        }).finally(() => {
            generate.disabled = false;
        });
    });
}
