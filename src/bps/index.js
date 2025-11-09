import * as bps from "@smwcentral/bps";

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

            const rom = new Uint8Array(romData);
            const patch = new Uint8Array(patchData);

            const resultFile = bps.adaptiveApplyBPS(rom, patch);

            const basename = patchFile.name.slice(0, patchFile.name.lastIndexOf("."));
            const ext = romFile.name.split(".").pop();

            result = {
                name: `${basename}.${ext}`,
                blob: new Blob([resultFile], {type: romFile.type}),
            };

            button.disabled = false;

            smwc.setStatus({success: "Patch successful."});
        } catch (error) {
            if (error instanceof bps.MalformedPatchError) {
                smwc.setStatus({error: "This is not a BPS patch."});
            } else if (error instanceof bps.WrongInputError) {
                smwc.setStatus({error: "This patch is not intended for this ROM."});
            } else if (error instanceof bps.PatchError) {
                console.log(error);
                smwc.setStatus({error: "Couldn't apply patch."});
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
