function read(view, index, length){
    let bytes = "";

    for(let i = length - 1; i >= 0; i -= 1){
        bytes += view.getUint8(index + i).toString(16).padStart(2, "0");
    }

    return bytes;
}

// See ".map16 File Format" under Technical Information
// in the Lunar Magic help file.
function readMap16(file){
    const view = new DataView(file);

    // Must start with "LM16"
    if(view.byteLength % 2 !== 0 || view.getUint32(0, false) !== 0x4C4D3136){
        return {error: "Invalid Map16 file."};
    }

    const tiles = new Map();

    const width = view.getUint32(0x18, true);
	const height = view.getUint32(0x1C, true);
	const tableLoc = view.getUint32(0x10, true);
	const tileDataLoc = view.getUint32(tableLoc, true);
	const actsLikeLoc = view.getUint32(tableLoc + 0x08, true);

	let topLeftTile = 0x10 * view.getUint32(0x24, true) + view.getUint32(0x20, true);

    const coordBase = view.getUint8(0x28);

    if(coordBase === 0x00 && topLeftTile >= 0x4000){
        // 0x00: retain backwards compatibility with old .map16 files.
        // Tiles on pages 0x00-0x3F are stored directly,
        // while pages 0x80-0xFF are stored as 0x40-0x7F.
        topLeftTile += 0x4000;
    }else if(coordBase === 0x08){
        // 0x08: appears to only be used when exporting from pages 0xC0-0xFF
        // Tiles are stored offset by 0x8000.
        topLeftTile += 0x8000;
    }

    // Coordinate base 0x04 is used when exporting from 0x40-0x7F and doesn't
    // need special handling.

	for(let i = 0; i < width * height; i += 1){
		const row = Math.floor(i / width);
		const col = (i % width);
		const tile = topLeftTile + 16 * row + col;

		const tileData = read(view, tileDataLoc + 8 * i, 8);

        let actsLike;

		if(tile >= 0x8000){
            // background tiles have no "acts like" settings,
            // they get a dummy value so we don't compare FG with BG tiles
			actsLike = "bg";
        }else{
			actsLike = read(view, actsLikeLoc + 2 * i, 2);
        }

		tiles.set(tile, tileData + actsLike);
	}

    return tiles;
}

function findDuplicates(/** @type [number, string][] */ tiles, ignoreEmpty, minDupes){
    tiles.sort((a, b) => a[1].localeCompare(b[1]));

    const dupes = new Map();

    for(let i = 0; i < tiles.length;){
        const [id, tile] = tiles[i];

        i += 1;

        if(
            i < tiles.length
            && tiles[i][1] === tile
            && (!ignoreEmpty || (tile !== "10041004100410040130" && tile !== "1004100410041004bg"))
        ){
            const tileDupes = [];

            while(i < tiles.length && tiles[i][1] === tile){
                tileDupes.push(tiles[i][0]);
                i += 1;
            }

            if(tileDupes.length >= minDupes){
                dupes.set(id, tileDupes);
            }
        }
    }

    return dupes;
}

export default function(smwc){
    /** @type HTMLInputElement */
    const fileInput = smwc.byID("file");
    const find = smwc.byID("find");

    find.addEventListener("click", () => {
        const file = fileInput.files[0];

        smwc.byID("dupes").innerHTML = "";

        if(file == null){
            return smwc.setStatus({error: "No file specified."});
        }

        const ignoreEmpty = smwc.byID("ignore-empty").checked;
        const minDupes = smwc.byID("only-min-dupes").checked ? Number(smwc.byID("min-dupes").value) : 1;

        file.arrayBuffer().then((input) => {
            const map16 = readMap16(input);

            if(map16.error == null){
                /** @type Map<number, number[]> */
                const dupes = findDuplicates([...map16], ignoreEmpty, minDupes);
                const numDupes = dupes.size;

                if(numDupes === 0){
                    smwc.setStatus({message: "✔️ No duplicates found."});
                }else{
                    smwc.setStatus({success: `${map16.size} (0x${map16.size.toString(16).toUpperCase()}) tiles were found, of which ${numDupes} (0x${numDupes.toString(16).toUpperCase()}) ${(numDupes === 1) ? "has" : "have"} ${minDupes} or more duplicates.`});

                    let html = `<table class="table">`;
                    html += "<tr><th>Tile</th><th>Duplicates</th></tr>";

                    const sortedDupes = [...dupes];
                    sortedDupes.sort((a, b) => a[0] - b[0]);

                    for(const [tile, dupeList] of sortedDupes){
                        html += `<tr><td>${tile.toString(16).toUpperCase()}</td><td>${dupeList.map((item) => item.toString(16).toUpperCase()).join(", ")}</td></tr>`;
                    }

                    html += "</table>";

                    smwc.byID("dupes").innerHTML = html;
                }
            }else{
                smwc.setStatus(map16);
            }
        }).catch((error) => {
            console.log(error);
            smwc.setStatus({error: "Internal error."});
        });
    });
}
