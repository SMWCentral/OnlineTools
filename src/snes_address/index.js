import Alpine from "alpinejs";

export default function () {
    window.Alpine = Alpine;

    window.toHex = (/** @type number */ input) => `$${input.toString(16).toUpperCase().padStart(6, "0")}`;

    window.fromHex = (/** @type string */ input, /** @type number */ fallback) => {
        let text = input.toLowerCase();

        if (text.startsWith("$") || text.startsWith("x")) {
            text = text.slice(1);
        } else if (text.startsWith("0x")) {
            text = text.slice(2);
        }

        const hex = parseInt(text, 16);

        return Number.isNaN(hex) || hex < 0 || hex > 0xffffff ? fallback : hex;
    };

    window.convertLoROMToPC = (lorom) => {
        if (lorom < 0 || lorom >= 0xffffff) {
            return {snes: lorom, pc: 0, region: "Unknown"};
        }

        if ((lorom & 0xfe0000) === 0x7e0000) {
            return {snes: lorom, pc: 0, region: "RAM"};
        }

        if ((lorom & 0x408000) === 0x000000) {
            return {snes: lorom, pc: 0, region: "Misc."};
        }

        if ((lorom & 0x708000) === 0x700000) {
            return {snes: lorom, pc: 0, region: "SRAM"};
        }

        return {snes: lorom, pc: ((lorom & 0x7f0000) >> 1) | (lorom & 0x7fff), region: "ROM"};
    };

    window.convertPCToLoROM = (pc) => {
        if (pc < 0 || pc >= 0x400000) {
            return {snes: 0, pc, region: "Unknown"};
        }

        const snes = ((pc << 1) & 0x7f0000) | (pc & 0x7fff) | 0x8000;

        // Remap to the FastROM region if the address would map to WRAM.
        return {snes: (snes & 0xfe0000) === 0x7e0000 ? snes | 0x800000 : snes, pc, region: "ROM"};
    };

    Alpine.start();
}
