const cleanROMHeader = new Uint8Array(512);
cleanROMHeader[0] = 0x40;

// SHA-256 hash of a clean headerless ROM
const cleanROMHash = new Uint8Array([
    0x08, 0x38, 0xe5, 0x31, 0xfe, 0x22, 0xc0, 0x77, 0x52, 0x8f, 0xeb, 0xe1, 0x4c, 0xb3, 0xff, 0x7c, 0x49, 0x2f, 0x1f,
    0x5f, 0xa8, 0xde, 0x35, 0x41, 0x92, 0xbd, 0xff, 0x71, 0x37, 0xc2, 0x7f, 0x5b,
]);

// SHA-256 hash of a clean Japanese headerless ROM
const cleanJapaneseHash = new Uint8Array([
    0xc6, 0x80, 0x8e, 0x08, 0x2a, 0xb3, 0x43, 0xbe, 0x55, 0x4d, 0x07, 0xf2, 0xb3, 0xeb, 0x15, 0x7c, 0x3c, 0x51, 0x34,
    0xb3, 0x64, 0xa2, 0xff, 0xb3, 0x80, 0x6a, 0x67, 0xf1, 0x7e, 0x09, 0x92, 0xd0,
]);

function compareBytes(/** @type Uint8Array */ a, /** @type Uint8Array */ b) {
    if (a.byteLength !== b.byteLength) {
        return false;
    }

    for (let index = 0; index < a.byteLength; index += 1) {
        if (a[index] !== b[index]) {
            return false;
        }
    }

    return true;
}

async function processROM(/** @type string */ originalFilename, /** @type Uint8Array */ bytes) {
    const feedback = [];

    let outputName = originalFilename;
    let outputData = bytes;

    if (!originalFilename.endsWith(".smc")) {
        const ext = originalFilename.lastIndexOf(".");

        outputName = `${ext === -1 ? originalFilename : originalFilename.slice(0, ext)}.smc`;

        feedback.push(`✨ Fixing file extension`);
    }

    const romSize = bytes.byteLength;

    if (romSize !== 0x80000 && romSize !== 0x80200) {
        return {error: "ROM has wrong size. Couldn't clean the ROM."};
    }

    let shaHash;

    if ((romSize & 0x7fff) === 0x00000) {
        shaHash = new Uint8Array(await window.crypto.subtle.digest("SHA-256", bytes));
    } else {
        shaHash = new Uint8Array(await window.crypto.subtle.digest("SHA-256", bytes.slice(512)));
    }

    if (!compareBytes(shaHash, cleanROMHash)) {
        if (compareBytes(shaHash, cleanJapaneseHash)) {
            return {error: "This is a Japanese ROM. Couldn't clean the ROM."};
        }

        return {error: "ROM has wrong contents. Couldn't clean the ROM."};
    }

    if ((romSize & 0x7fff) === 0x00000) {
        feedback.push("✨ Adding header");

        outputData = new Uint8Array(0x80200);
        outputData.set(cleanROMHeader, 0);
        outputData.set(bytes, 512);
    } else if (!compareBytes(bytes.slice(0, 512), cleanROMHeader)) {
        feedback.push("✨ Fixing header");

        outputData = new Uint8Array(0x80200);
        outputData.set(cleanROMHeader, 0);
        outputData.set(bytes.slice(512), 512);
    }

    if (outputName === originalFilename && outputData === bytes) {
        return {success: "Your ROM is already clean."};
    }

    feedback.push("✔️ Your ROM is now clean.");

    return {
        message: feedback.join("\r\n"),
        file: {name: outputName, data: outputData},
    };
}

export default function (smwc) {
    smwc.setStatus({message: "No ROM selected."});

    const fileInput = smwc.byID("file");

    fileInput.addEventListener("change", (event) => {
        /** @type HTMLInputElement */
        const input = event.target;
        const file = input.files[0];

        if (file == null) {
            smwc.setStatus({message: "No ROM selected."});
        } else {
            fileInput.disabled = true;

            file.arrayBuffer()
                .then((buffer) => processROM(file.name, new Uint8Array(buffer)))
                .then((result) => {
                    smwc.setStatus(result);

                    if (result.file != null) {
                        return smwc.download(
                            result.file.name,
                            new Blob([result.file.data], {type: "application/octet-stream"}),
                        );
                    }
                })
                .catch((error) => {
                    console.log(error);
                    smwc.setStatus({error: "Internal error."});
                })
                .finally(() => {
                    fileInput.disabled = false;
                    fileInput.value = null;
                });
        }
    });
}
