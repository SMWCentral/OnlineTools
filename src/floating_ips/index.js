/*!
 * license: you may do whatever you want with this file, except blame the author if anything goes wrong
 * author: https://www.smwcentral.net/?p=profile&id=1686
 * smc support by randomdude999 (https://smwc.me/u/32552)
*/

const E_WRONG_INPUT = Symbol("wrong input file");
const E_NOT_BPS = Symbol("not a BPS patch");

const ERROR_MESSAGES = new Map([
    [E_WRONG_INPUT, "This patch is not intended for this ROM."],
    [E_NOT_BPS, "Not a BPS patch."]
]);

const SourceRead = 0;
const TargetRead = 1;
const SourceCopy = 2;
const TargetCopy = 3;

const crcTable = [];

for(let n = 0; n < 256; n += 1){
    let c = n;

    for(let k = 0; k < 8; k += 1){
        c = ((c&1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    }

    crcTable[n] = c;
}

function crc32(bytes){
    let crc = 0 ^ (-1);

    for(let i = 0; i < bytes.length; i += 1){
        crc = (crc >>> 8) ^ crcTable[(crc ^ bytes[i]) & 0xFF];
    }

    return (crc ^ (-1)) >>> 0;
}

// no error checking, other than BPS signature, input size/crc and JS auto checking array bounds
function applyBPS(rom, patch){
    let patchpos = 0;

    const u8 = () => patch[patchpos++];
    const u32at = (pos) => (patch[pos+0]<<0 | patch[pos+1]<<8 | patch[pos+2]<<16 | patch[pos+3]<<24)>>>0;

    function decode(){
        let ret = 0;
        let sh = 0;

        while(true){
            const next = u8();
            ret += (next^0x80) << sh;

            if(next & 0x80){
                return ret;
            }

            sh += 7;
        }
    }

    function decodes(){
        const enc = decode();
        const ret = enc>>1;

        return (enc & 1) ? -ret : ret;
    }

    if(u8() !== 0x42 || u8() !== 0x50 || u8() !== 0x53 || u8() !== 0x31){
        throw E_NOT_BPS;
    }

    if(decode() !== rom.length){
        throw E_WRONG_INPUT;
    }

    if(crc32(rom) !== u32at(patch.length - 12)){
        throw E_WRONG_INPUT;
    }

    const out = new Uint8Array(decode());

    let outpos = 0;

    const metalen = decode();
    patchpos += metalen; // can't join these two, JS reads patchpos before calling decode

    let inreadpos = 0;
    let outreadpos = 0;

    while(patchpos < patch.length - 12){
        const thisinstr = decode();
        const len = (thisinstr>>2)+1;
        const action = (thisinstr&3);

        switch(action){
            case SourceRead: {
                for(let i = 0; i < len; i += 1){
                    out[outpos] = rom[outpos];
                    outpos++;
                }

                break;
            }

            case TargetRead: {
                for(let i = 0; i < len; i += 1){
                    out[outpos++] = u8();
                }

                break;
            }

            case SourceCopy: {
                inreadpos += decodes();

                for(let i = 0; i < len; i += 1){
                    out[outpos++] = rom[inreadpos++];
                }

                break;
            }

            case TargetCopy: {
                outreadpos += decodes();

                for(let i = 0; i < len; i += 1){
                    out[outpos++] = out[outreadpos++];
                }

                break;
            }
        }
    }

    return out;
}

function handleBPS(romFile, romData, patchFile, patchData){
    try {
        let result;

        try {
            result = applyBPS(new Uint8Array(romData), new Uint8Array(patchData));
        }catch(error){
            if(error === E_WRONG_INPUT){
                // maybe a headered rom? skip first 512 bytes for patching
                result = applyBPS(new Uint8Array(romData, 512), new Uint8Array(patchData));

                // if we reached here, there were no errors, so the assumption about a headered rom was correct.
                // now re-add the 512 bytes from the original ROM to the patched one
                let buffer = new Uint8Array(result.length + 512); // create buffer large enough for rom and header
                buffer.set(new Uint8Array(romData, 0, 512)); // copy header
                buffer.set(result, 512); // copy rom data

                result = buffer;
            }else{
                throw error;
            }
        }

        const basename = patchFile.name.slice(0, patchFile.name.lastIndexOf("."));
        const ext = romFile.name.split(".").pop();

        return {
            name: `${basename}.${ext}`,
            blob: new Blob([result], {type: romFile.type})
        };
    }catch(error){
        if(ERROR_MESSAGES.has(error)){
            return {
                error: ERROR_MESSAGES.get(error)
            };
        }

        throw error;
    }
}

export default function(smwc){
    /** @type HTMLInputElement */

    const romInput = smwc.byID("rom");

    /** @type HTMLInputElement */
    const patchInput = smwc.byID("patch");

    /** @type HTMLButtonElement */
    const button = smwc.byID("button");

    button.addEventListener("click", () => {
        const romFile = romInput.files[0];

        if(romFile == null){
            return smwc.setStatus({error: "No base ROM selected."});
        }

        const patchFile = patchInput.files[0];

        if(patchFile == null){
            return smwc.setStatus({error: "No patch selected."});
        }

        button.disabled = true;

        Promise.all([romFile.arrayBuffer(), patchFile.arrayBuffer()]).then(([romData, patchData]) => {
            const result = handleBPS(romFile, romData, patchFile, patchData);

            smwc.setStatus(result);

            if(result.error == null){
                return smwc.download(result.name, result.blob);
            }
        }).catch((error) => {
            console.log(error);
            smwc.setStatus({error: "Internal error."});
        }).finally(() => {
            button.disabled = false;
        });
    });
}
