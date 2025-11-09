/*!
 * license: you may do whatever you want with this file, except blame the author if anything goes wrong
 * author: https://www.smwcentral.net/?p=profile&id=1686
 * smc support by randomdude999 (https://smwc.me/u/32552)
 * SMB2 version correction by CircleFriendo (https://smwc.me/u/49634)
 */

const E_WRONG_INPUT = Symbol("wrong input file");
const E_NOT_BPS = Symbol("not a BPS patch");

const ERROR_MESSAGES = new Map([
    [E_WRONG_INPUT, "This patch is not intended for this ROM."],
    [E_NOT_BPS, "Not a BPS patch."],
]);

const SourceRead = 0;
const TargetRead = 1;
const SourceCopy = 2;
const TargetCopy = 3;

const crcTable = [];

for (let n = 0; n < 256; n += 1) {
    let c = n;

    for (let k = 0; k < 8; k += 1) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }

    crcTable[n] = c;
}

function crc32(bytes) {
    let crc = 0 ^ -1;

    for (let i = 0; i < bytes.length; i += 1) {
        crc = (crc >>> 8) ^ crcTable[(crc ^ bytes[i]) & 0xff];
    }

    return (crc ^ -1) >>> 0;
}

const u32at = (patch, pos) =>
    ((patch[pos + 0] << 0) | (patch[pos + 1] << 8) | (patch[pos + 2] << 16) | (patch[pos + 3] << 24)) >>> 0;

// no error checking, other than BPS signature, input size/crc and JS auto checking array bounds
function applyBPS(rom, patch) {
    let patchpos = 0;

    const u8 = () => patch[patchpos++];

    function decode() {
        let ret = 0;
        let sh = 0;

        while (true) {
            const next = u8();
            ret += (next ^ 0x80) << sh;

            if (next & 0x80) {
                return ret;
            }

            sh += 7;
        }
    }

    function decodes() {
        const enc = decode();
        const ret = enc >> 1;

        return enc & 1 ? -ret : ret;
    }

    if (u8() !== 0x42 || u8() !== 0x50 || u8() !== 0x53 || u8() !== 0x31) {
        throw E_NOT_BPS;
    }

    if (decode() !== rom.length) {
        throw E_WRONG_INPUT;
    }

    if (crc32(rom) !== u32at(patch, patch.length - 12)) {
        throw E_WRONG_INPUT;
    }

    const out = new Uint8Array(decode());

    let outpos = 0;

    const metalen = decode();
    patchpos += metalen; // can't join these two, JS reads patchpos before calling decode

    let inreadpos = 0;
    let outreadpos = 0;

    while (patchpos < patch.length - 12) {
        const thisinstr = decode();
        const len = (thisinstr >> 2) + 1;
        const action = thisinstr & 3;

        switch (action) {
            case SourceRead: {
                for (let i = 0; i < len; i += 1) {
                    out[outpos] = rom[outpos];
                    outpos++;
                }

                break;
            }

            case TargetRead: {
                for (let i = 0; i < len; i += 1) {
                    out[outpos++] = u8();
                }

                break;
            }

            case SourceCopy: {
                inreadpos += decodes();

                for (let i = 0; i < len; i += 1) {
                    out[outpos++] = rom[inreadpos++];
                }

                break;
            }

            case TargetCopy: {
                outreadpos += decodes();

                for (let i = 0; i < len; i += 1) {
                    out[outpos++] = out[outreadpos++];
                }

                break;
            }
        }
    }

    return out;
}

const SMB2_REV_0 = Symbol("Rev 0");
const SMB2_REV_A = Symbol("Rev A");

const SMB2_REV_0_CRC = 0x7d3f6f3d;
const SMB2_REV_A_CRC = 0xe0ca425c;

const smb2_versions = {
    [SMB2_REV_0_CRC]: {
        name: "Super Mario Bros. 2 (U) (PRG0) [!].nes",
        revision: SMB2_REV_0,
        unheaderedCode: 0x57ac67af,
        header: [0x4e, 0x45, 0x53, 0x1a, 0x08, 0x10, 0x40, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
    },
    1129345586: {
        name: "Super Mario Bros. 2 (USA).nes",
        revision: SMB2_REV_0,
        unheaderedCode: 0x57ac67af,
        header: [0x4e, 0x45, 0x53, 0x1a, 0x08, 0x10, 0x40, 0x08, 0x00, 0x00, 0x07, 0x00, 0x00, 0x00, 0x00, 0x01],
    },
    [SMB2_REV_A_CRC]: {
        name: "Super Mario Bros. 2 (USA) (Rev A).nes",
        revision: SMB2_REV_A,
        unheaderedCode: 0xca594ace,
        header: [0x4e, 0x45, 0x53, 0x1a, 0x08, 0x10, 0x40, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
    },
};

// bps patch to convert from "Super Mario Bros. 2 (U) (PRG0) [!].nes" to "Super Mario Bros. 2 (USA) (Rev A).nes"
const Rev0ToRevA = Uint8Array.fromBase64(
    "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",
);

// bps patch to convert from "Super Mario Bros. 2 (USA) (Rev A).nes" to "Super Mario Bros. 2 (U) (PRG0) [!].nes"
const RevAToRev0 = Uint8Array.fromBase64(
    "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",
);

function handleBPS(romData, patchData) {
    const rom = new Uint8Array(romData);
    const patch = new Uint8Array(patchData);

    // Best-case: the patch is intended for this ROM (also validates the patch)
    try {
        return applyBPS(rom, patch);
    } catch (error) {
        // Fallthrough if wrong ROM
        if (error !== E_WRONG_INPUT) {
            throw error;
        }
    }

    // Maybe the patch is intended for a version of SMB2?
    // (this u32at is safe, as the patch itself has already been validated above)
    const requiredCode = u32at(patch, patch.length - 12);

    if (requiredCode in smb2_versions) {
        const requiredHeader = smb2_versions[requiredCode].header;
        const unheaderedRom = new Uint8Array(romData, 16);
        const unheaderedRomCode = crc32(unheaderedRom);

        // Just fix the header.
        if (unheaderedRomCode === smb2_versions[requiredCode].unheaderedCode) {
            const reheaderedRom = Uint8Array.from(rom);
            reheaderedRom.set(requiredHeader);

            return applyBPS(reheaderedRom, patch);
        }

        // Convert from Rev 0 to Rev A.
        if (
            unheaderedRomCode == smb2_versions[SMB2_REV_0_CRC].unheaderedCode &&
            smb2_versions[requiredCode].unheaderedCode == smb2_versions[SMB2_REV_A_CRC].unheaderedCode
        ) {
            const reheaderedRom = Uint8Array.from(rom);
            reheaderedRom.set(smb2_versions[SMB2_REV_0_CRC].header);

            const revisedRom = applyBPS(reheaderedRom, Rev0ToRevA);

            const reheaderedRevisedRom = Uint8Array.from(revisedRom);
            reheaderedRevisedRom.set(requiredHeader);

            return applyBPS(reheaderedRevisedRom, patch);
        }

        // Convert from Rev A to Rev 0.
        if (
            unheaderedRomCode == smb2_versions[SMB2_REV_A_CRC].unheaderedCode &&
            smb2_versions[requiredCode].unheaderedCode == smb2_versions[SMB2_REV_0_CRC].unheaderedCode
        ) {
            const reheaderedRom = Uint8Array.from(rom);
            reheaderedRom.set(smb2_versions[SMB2_REV_A_CRC].header);

            const revisedRom = applyBPS(reheaderedRom, RevAToRev0);

            const reheaderedRevisedRom = Uint8Array.from(revisedRom);
            reheaderedRevisedRom.set(requiredHeader);

            return applyBPS(reheaderedRevisedRom, patch);
        }
    }

    // Maybe a headered SNES ROM? Try to skip the first 512 bytes for patching
    try {
        const result = applyBPS(new Uint8Array(romData, 512), patch);

        const buffer = new Uint8Array(result.length + 512); // create buffer large enough for rom and header
        buffer.set(new Uint8Array(romData, 0, 512)); // copy header
        buffer.set(result, 512); // copy rom data

        return buffer;
    } catch (error) {
        // Fallthrough if wrong ROM
        if (error !== E_WRONG_INPUT) {
            throw error;
        }
    }

    // None of our checks worked, this patch is not intended for this ROM
    throw E_WRONG_INPUT;
}

export default function (smwc) {
    /** @type HTMLInputElement */
    const romInput = smwc.byID("rom");

    /** @type HTMLInputElement */
    const patchInput = smwc.byID("patch");

    /** @type HTMLButtonElement */
    const button = smwc.byID("button");

    smwc.setStatus({message: "Select a Base ROM and a Patch."});

    let result = null;

    async function patchROM() {
        button.disabled = true;

        try {
            const romFile = romInput.files[0];
            const patchFile = patchInput.files[0];

            if (romFile == null && patchFile == null) {
                smwc.setStatus({message: "Select a Base ROM and a Patch."});
                return;
            }

            if (romFile == null) {
                smwc.setStatus({message: "Select a Base ROM."});
                return;
            }

            if (patchFile == null) {
                smwc.setStatus({message: "Select a Patch."});
                return;
            }

            const [romData, patchData] = await Promise.all([romFile.arrayBuffer(), patchFile.arrayBuffer()]);

            const resultFile = handleBPS(romData, patchData);

            const basename = patchFile.name.slice(0, patchFile.name.lastIndexOf("."));
            const ext = romFile.name.split(".").pop();

            result = {
                name: `${basename}.${ext}`,
                blob: new Blob([resultFile], {type: romFile.type}),
            };

            button.disabled = false;

            smwc.setStatus({success: "Patch successful."});
        } catch (error) {
            if (ERROR_MESSAGES.has(error)) {
                smwc.setStatus({
                    error: ERROR_MESSAGES.get(error),
                });
            } else {
                console.log(error);
                smwc.setStatus({error: "Internal error."});
            }
        }
    }

    romInput.addEventListener("change", patchROM);
    patchInput.addEventListener("change", patchROM);

    button.addEventListener("click", () => {
        if (result != null) {
            smwc.download(result.name, result.blob);
        }
    });
}
