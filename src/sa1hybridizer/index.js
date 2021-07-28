const famous_defines = `
if read1($00FFD5) == $23		; check if the rom is sa-1
	sa1rom
	!SA1 = 1
	!dp = $3000
	!addr = $6000
	!bank = $000000
	!bankA = $400000
else
	lorom
	!SA1 = 0
	!dp = $0000
	!addr = $0000
	!bank = $800000
	!bankA = $7E0000
endif

macro define_sprite_table(name, addr, addr_sa1)
	if !SA1 == 0
		!<name> = <addr>
	else
		!<name> = <addr_sa1>
	endif
endmacro

macro define_base2_address(name, addr)
	if !SA1 == 0
		!<name> = <addr>
	else
		!<name> = <addr>|!addr
	endif
endmacro
;sprite tool / pixi defines
%define_sprite_table("7FAB10",$7FAB10,$6040)
%define_sprite_table("7FAB1C",$7FAB1C,$6056)
%define_sprite_table("7FAB28",$7FAB28,$6057)
%define_sprite_table("7FAB34",$7FAB34,$606D)
%define_sprite_table("7FAB9E",$7FAB9E,$6083)
%define_sprite_table("7FAB40",$7FAB40,$6099)
%define_sprite_table("7FAB4C",$7FAB4C,$60AF)
%define_sprite_table("7FAB58",$7FAB58,$60C5)
%define_sprite_table("7FAB64",$7FAB64,$60DB)

%define_sprite_table("7FAC00",$7FAC00,$60F1)
%define_sprite_table("7FAC08",$7FAC08,$6030)
%define_sprite_table("7FAC10",$7FAC10,$6038)

;normal sprite defines

%define_sprite_table("9E", $9E, $3200)
%define_sprite_table("AA", $AA, $9E)
%define_sprite_table("B6", $B6, $B6)
%define_sprite_table("C2", $C2, $D8)
%define_sprite_table("D8", $D8, $3216)
%define_sprite_table("E4", $E4, $322C)
%define_sprite_table("14C8", $14C8, $3242)
%define_sprite_table("14D4", $14D4, $3258)
%define_sprite_table("14E0", $14E0, $326E)
%define_sprite_table("14EC", $14EC, $74C8)
%define_sprite_table("14F8", $14F8, $74DE)
%define_sprite_table("1504", $1504, $74F4)
%define_sprite_table("1510", $1510, $750A)
%define_sprite_table("151C", $151C, $3284)
%define_sprite_table("1528", $1528, $329A)
%define_sprite_table("1534", $1534, $32B0)
%define_sprite_table("1540", $1540, $32C6)
%define_sprite_table("154C", $154C, $32DC)
%define_sprite_table("1558", $1558, $32F2)
%define_sprite_table("1564", $1564, $3308)
%define_sprite_table("1570", $1570, $331E)
%define_sprite_table("157C", $157C, $3334)
%define_sprite_table("1588", $1588, $334A)
%define_sprite_table("1594", $1594, $3360)
%define_sprite_table("15A0", $15A0, $3376)
%define_sprite_table("15AC", $15AC, $338C)
%define_sprite_table("15B8", $15B8, $7520)
%define_sprite_table("15C4", $15C4, $7536)
%define_sprite_table("15D0", $15D0, $754C)
%define_sprite_table("15DC", $15DC, $7562)
%define_sprite_table("15EA", $15EA, $33A2)
%define_sprite_table("15F6", $15F6, $33B8)
%define_sprite_table("1602", $1602, $33CE)
%define_sprite_table("160E", $160E, $33E4)
%define_sprite_table("161A", $161A, $7578)
%define_sprite_table("1626", $1626, $758E)
%define_sprite_table("1632", $1632, $75A4)
%define_sprite_table("163E", $163E, $33FA)
%define_sprite_table("164A", $164A, $75BA)
%define_sprite_table("1656", $1656, $75D0)
%define_sprite_table("1662", $1662, $75EA)
%define_sprite_table("166E", $166E, $7600)
%define_sprite_table("167A", $167A, $7616)
%define_sprite_table("1686", $1686, $762C)
%define_sprite_table("186C", $186C, $7642)
%define_sprite_table("187B", $187B, $3410)
%define_sprite_table("190F", $190F, $7658)

%define_sprite_table("1938", $7FAF00, $418A00)
%define_sprite_table("7FAF00", $7FAF00, $418A00)

%define_sprite_table("1FD6", $1FD6, $766E)
%define_sprite_table("1FE2", $1FE2, $7FD6)
`;

const bwram_defines = `
macro define_bwram(addr, bwram)
    if read1($00FFD5) == $23
        !<addr> = $<bwram>
    else
        !<addr> = $<addr>
    endif
endmacro
%define_bwram(7F9A7B, 418800) ; ends at 7F9C7A
%define_bwram(700800, 41A000) ; ends at 7027FF
if read1($00FFD5) == $23
    !map16_lo_by = $400000
    !map16_hi_by = $410000
    !save_mem = $41C000
else
    !map16_lo_by = $7E0000
    !map16_hi_by = $7F0000
    !save_mem = $700000
endif"
`;

const sprite_addr_list = [0x7fab10, 0x7fab1c, 0x7fab28, 0x7fab34, 0x7fab9e, 0x7fab40, 0x7fab4c, 0x7fab58, 0x7fab64, 0x7fac00,
    0x7fac08, 0x7fac10, 0x9e, 0xaa, 0xb6, 0xc2, 0xd8, 0xe4, 0x14c8, 0x14d4, 0x14e0, 0x14ec, 0x14f8,
    0x1504, 0x1510, 0x151c, 0x1528, 0x1534, 0x1540, 0x154c, 0x1558, 0x1564, 0x1570, 0x157c, 0x1588,
    0x1594, 0x15a0, 0x15ac, 0x15b8, 0x15c4, 0x15d0, 0x15dc, 0x15ea, 0x15f6, 0x1602, 0x160e, 0x161a,
    0x1626, 0x1632, 0x163e, 0x164a, 0x1656, 0x1662, 0x166e, 0x167a, 0x1686, 0x186c, 0x187b, 0x190f,
    0x1938, 0x7faf00, 0x1fd6, 0x1fe2];

const WordType = {
    OTHER: -1,
    ADDR: 1,
    COMMA: 2
}

class WordTuple {
    constructor(type, word, index) {
        this.type = type;
        this.word = word;
        this.index = index;
    }
}

Object.freeze(WordType);

function normalizeHexStringToHexString(str) {
    // this seems rather useless (and it may be) but it ensures consitency (kills whitespace, makes it all capital, fixes weird formats, etc..)
    return parseInt(str, 16).toString(16).toUpperCase();
}

// inclusive range check
function checkRange(value, begin, end) {
    return value >= begin && value <= end;
}

function check_bwram(word) {
    let bwram_word = parseInt(word, 16);
    let bwram_remapped_list = [0x7F9A7B, 0x7027FF];          // Wiggler's segment buffer, Expansion area planned for SMW hacks
    let map16_lo_by = [0x7EC800, 0x7EFFFF];                // Map16 low byte plus Overworld related data.
    let map16_hi_by = [0x7FC800, 0x7FFFFF];                // Map16 high byte.
    let save_mem = [0x700000, 0x7007FF];                // Original save memory (2 kB big). Not everything is used
    let bwram_list = [map16_lo_by, map16_hi_by, save_mem];
    let bwram_indexes = bwram_list.map(x => {
        let [b, e] = x;
        return checkRange(bwram_word, b, e);
    });
    let subs = ['map16_lo_by', 'map16_hi_by', 'save_mem'];
    if (bwram_indexes.some(x => x)) {
        let true_index = bwram_indexes.indexOf(true);
        let sub = `${bwram_word.toString(16).toUpperCase().padStart(6, '0')}&$00FFFF|!${subs[true_index]}`;
        return [sub, true];
    }
    else if (bwram_word in bwram_remapped_list) {
        let sub = `!${bwram_word.toString(16).toUpperCase().padStart(6, '0')}`;
        return [sub, true];
    }
    return [word, false];
}

function process_word(word, index, splitted, comma_index, messages) {
    let requires_manual_conversion = false;
    let converted = true;
    let add_dp = false;
    if (comma_index !== -1) {
        if (word.length == 4 && (splitted[comma_index + 1] === 'y' || splitted[comma_index + 1] === 'x') && word.substring(0, 2) == '00')
            add_dp = true;
    }
    if (word.startsWith('8') && word.length == 6) {
        word = word.replace('8', '0', 1);
    }
    let numeric_word = parseInt(word, 16);
    if (Number.isNaN(numeric_word)) {
        throw `Error during parsing of address ${word}`;
    }
    let bwram_define_needed = false;
    if (word.length === 6)
        [word, bwram_define_needed] = check_bwram(word);
    if (bwram_define_needed)
        return [word, bwram_define_needed, converted, requires_manual_conversion];

    if (sprite_addr_list.indexOf(numeric_word) !== -1) {
        word = '!' + (add_dp ? `${normalizeHexStringToHexString(word)}|!dp` : `${normalizeHexStringToHexString(word)}`);
    } else if (word.length === 6 && checkRange(numeric_word, 0x000000, 0x0FFFFF)) {
        word = '$' + word + '|!bank';
    } else if (word.length === 6 && checkRange(numeric_word, 0x7E0000, 0x7E1FFF)) {
        try {
            let short_word = word.substring(2);
            let spr_index = sprite_addr_list.indexOf(parseInt(short_word, 16));
            word = `!${sprite_addr_list[spr_index].toString(16)}`;
        } catch {
            word = `($${word}&$FFFF)|bankA`;
        }
    } else if (word.length === 2) {
        converted = false;
        word = '$' + word;
    } else if (checkRange(numeric_word, 0x0100, 0x1FFF)) {
        word = '$' + word + '|!addr';
    } else if (checkRange(numeric_word, 0x0000, 0x00FF)) {
        word = '$' + word + '|!dp';
    } else {
        converted = false;
        requires_manual_conversion = true;
        word = '$' + word;
        messages.push(`Address ${word.toString(16).padStart(word.length, '0')} at line ${index} couldn't be converted`);
    }
    return [word, bwram_define_needed, converted, requires_manual_conversion];
}

function eval_stmt(string) {
    return (new Function('return (' + string + ')')());
}

function convert(input) {
    const lines = input.split("\n");
    let bw_defs = [];
    let output = famous_defines;
    let outlines = [];
    let messages = [];
    let tot_conversions = 0;
    let requires_manual_conversion = false;
    for (const [index, line] of lines.entries()) {
        outlines.push('');
        const data_types = ['db', 'dw', 'dl', 'dd'];
        let in_comment = false;
        let in_data = false;
        let reg = /![A-Za-z\d_]+\s+=\s+((\$)?[\dA-Fa-f]{2,6})\S*/;
        let define_found = line.match(reg);
        let words = line.trimEnd().split(/([ \t;])/);
        if (line.trim() === "" || line.trimStart().startsWith(';') || define_found) {
            if (define_found) {
                requires_manual_conversion = true;
                let is_hex = define_found[2] != undefined;
                const addr = parseInt(is_hex ? define_found[1].replace('$', '0x') : define_found[1], is_hex ? 16 : 10);
                if (addr === 12) {
                    messages.push(`There is define ${define_found[0]} at line ${index + 1} which is equal to 12,
                     this might be a define related to how many sprites can be loaded by the game
                     if so, change it to 22 or $16, or (even better) use the following\n
                    \tif read1($00FFD5) == $23\n\t\t${define_found[0]}\n\telse\n\t\t
                    ${define_found[0].split("=")[0]}= ${is_hex ? "$16" : "22"}\n\tendif\n`)
                } else if (sprite_addr_list.indexOf(addr) !== -1 && is_hex) {
                    messages.push(`There is define ${define_found[0]} at line ${index + 1} which is a sprite
                    address, usually replacing the $ with ! works in most tools, it didn't get
                    converted automatically because it might not be necessary to do so, make sure
                    to convert manually it ONLY if needed.\n`)
                } else if (checkRange(addr, 0x0100, 0x1FFF)) {
                    messages.push(`There is define ${define_found[0]} at line ${index + 1} which might be a ram
                     address, if it is, convert it by adding |!addr at the end of it, if it's not
                     a ram address leave it alone\n`);
                }
            }
            outlines[index] = line.trimEnd();
            continue;
        }
        let ignore_next_address = false;
        for (let og_word of words) {
            let stripped_word = og_word.trim();
            let to_insert = '';
            let addr = /\$[\da-fA-F]{1,6}\|![a-zA-Z\d_]+\b/.exec(og_word);
            if (in_comment || in_data) { }
            else if (stripped_word[0] === ';') {
                in_comment = true;
            } else if (data_types.some(x => x === stripped_word)) {
                in_data = true;
            } else if (stripped_word.startsWith('PEA') || stripped_word.startsWith('PER')) {
                ignore_next_address = true;
            } else if (addr !== null) {
                messages.push(`Address was maybe already hybrid ${addr} at line ${index + 1}`);
            } else if (/\$[^, \n()\[\]]{1,6}/.exec(og_word) !== null) {
                if (ignore_next_address) {
                    ignore_next_address = false;
                    outlines[index] += og_word;
                    continue;
                }
                let splitted = og_word.split(/([\[\](), ])/);
                let word_tuples = []
                for (let [i, word] of splitted.entries()) {
                    if (word.startsWith('$')) {
                        let proc_word = parseInt(eval_stmt(word.replace('$', '0x')));
                        if (Number.isNaN(proc_word)) {
                            let expr = word.replace('$', '').split(/[+\\\-^*~<>|]/);
                            word = `$${proc_word.toString(16).toUpperCase().padStart(Math.max(...expr.map((e) => e.length)), "0")}`;
                            word_tuples.push(new WordTuple(WordType.ADDR, word, i));
                        } else {
                            let bunch = word.split(/([+\-^*~<>| ])/);
                            for (let w of bunch) {
                                if (w.startsWith('$'))
                                    word_tuples.push(new WordTuple(WordType.ADDR, w, i));
                                else
                                    word_tuples.push(new WordTuple(WordType.OTHER, w, i));
                            }
                        }
                    } else if (word.startsWith(',')) {
                        word_tuples.push(new WordTuple(WordType.COMMA, word, i));
                    } else {
                        word_tuples.push(new WordTuple(WordType.OTHER, word, i));
                    }
                }
                for (let struct of word_tuples) {
                    let wordtype = struct.type;
                    let word = struct.word;
                    let i = struct.index;
                    if (wordtype === WordType.ADDR) {
                        try {
                            let current_tuple = word_tuples[i + 1];
                            let comma_index = -1;
                            if (current_tuple !== undefined)
                                comma_index = current_tuple.type === WordType.COMMA ? i + 1 : -1;
                            let [ww, bwram_define_needed, converted, manual_conversion] = process_word(word.replace('$', ''), index, splitted, comma_index, messages);
                            if (manual_conversion)
                                requires_manual_conversion = true;
                            if (converted) {
                                tot_conversions += 1;
                                messages.push(`Conversion ${word} -> ${ww}`);
                            }
                            bw_defs.push(bwram_define_needed);
                            to_insert += ww;
                        } catch {
                            to_insert += word;
                        }
                    } else {
                        to_insert += word;
                    }
                }
            }
            outlines[index] += to_insert.length !== 0 ? to_insert : og_word;
        }
    }
    if (bw_defs.some(x => x)) {
        output += bwram_defines;
    }
    messages.push(`Total conversions: ${tot_conversions}`);
    if (requires_manual_conversion) {
        messages.push(`Could require manual conversion for some addresses`);
    }
    output += outlines.join('\n');
    return [output, messages.join('\n')];
}

function doSa1Hybridize(input) {
    try {
        let [output, messages] = convert(input);
        return { asm: output, messages: messages };
    } catch (err) {
        return { err: err };
    }
}

export default function (smwc) {
    const fileInput = smwc.byID("file");

    const generate = smwc.byID("generate");

    generate.addEventListener("click", () => {
        const file = fileInput.files[0];

        if (file == null) {
            return smwc.setStatus({ error: "No file specified." });
        }

        generate.disabled = true;
        file.text().then((input) => {
            const result = doSa1Hybridize(input);
            smwc.setStatus({ success: '\n' + result.messages });
            if (result.asm != null) {
                return smwc.download(file.name, new Blob([result.asm], { type: "text/x-asm" }));
            }
        }).catch((error) => {
            console.log(error);
            smwc.setStatus({ error: "Internal error." });
        }).finally(() => {
            generate.disabled = false;
        });
    });
}
