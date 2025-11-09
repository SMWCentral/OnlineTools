let outstr = "";
let octaveG = 4; //current octave
const noteG = 1; //note number in the current octave, 1-12

let pos = 0; //current parser position
let l = 24; //default note length (ticks)
let lengthPrev = 24; //previous note length (ticks)
const volPrev = 0; //previous volume

let h = 0; //h shift

//let firstnote = false;
let lactivated = false;

const noteshape = /[a-g][+-]?=?[0-9]*/;

const notemap = new Map([
    ["c", 1],
    ["d", 3],
    ["e", 5],
    ["f", 6],
    ["g", 8],
    ["a", 10],
    ["b", 12],
]);

const warnings = [];

function clamp(x, a, b) {
    return Math.max(a, Math.min(x, b));
}

function handleNote(token) {
    let shift = 0;

    //note and length to output
    let noteOut = "";
    let lengthOut = "";

    //check for sharp/flat
    if (token.includes("+")) {
        shift = 1;
    } else if (token.includes("-")) {
        shift = -1;
    }

    //check whether there's a number
    if (/[0-9]+/.test(token)) {
        //extract number
        let lengthtoken = parseInt(/[0-9]+/.exec(token)[0]);

        //convert to ticks if needed
        if (!token.includes("=")) {
            lengthtoken = 192 / lengthtoken;
        }

        if (lengthPrev != lengthtoken) {
            //check whether to interpret number as ticks
            if (token.includes("=")) {
                if (lengthtoken > 0x7f) {
                    warnings.push("⚠ Note length > $7F at " + pos);
                    lengthtoken = 0x7f; //cap it at $7F
                }

                lengthOut = "$" + lengthtoken.toString(16).padStart(2, "0");
            } else {
                if (192 % lengthtoken != 0) {
                    warnings.push("⚠ Invalid note length at " + pos);
                    lengthtoken = Math.floor(lengthtoken);
                } else if (lengthtoken > 0x7f) {
                    warnings.push("⚠ Note length > $7F at " + pos);
                    lengthtoken = 0x7f; //cap it at $7F
                }

                lengthOut = "$" + lengthtoken.toString(16).padStart(2, "0");
            }

            // lengthPrev = lengthG;
            // lengthG = parseInt(lengthtoken);
        }

        if (lengthtoken != l) {
            lactivated = false;
        }

        lengthPrev = lengthtoken; //the previous note length for the next note is this note's length
    } else {
        if (!lactivated) {
            if (l != lengthPrev) {
                lengthOut = "$" + l.toString(16).padStart(2, "0");
                lactivated = true;
            }
        }
        lengthPrev = l; //the previous note length for the next note is this note's length (which is equivalent to l because there is no length defined)
    }

    let notenum = notemap.get(token[0]) + (octaveG - 1) * 12 + shift + h + 0x7f;

    //check for invalid notes
    if (notenum < 0x80) {
        warnings.push("⚠ Note pitch < o1c at " + pos);
    } else if (notenum > 0xc5) {
        warnings.push("⚠ Note pitch > o6a at " + pos);
    }

    notenum = clamp(notenum, 0x80, 0xc5);

    noteOut = "$" + notenum.toString(16).padStart(2, "0");

    //firstnote = true;

    pos += token.length - 1; //move cursor position
    outstr += lengthOut + noteOut + " ";
}

function handleL(token) {
    //extract number
    let lengthtoken = parseInt(/[0-9]+/.exec(token)[0]);

    if (!token.includes("=")) {
        lengthtoken = 192 / lengthtoken;
    }

    lactivated = false;

    l = lengthtoken;
    pos += token.length - 1; //move cursor position
    //-1 because the pos++ in the main function already accounts for one character (and it has to be there for unexpected charaacters)
}

function handleO(token) {
    const numtoken = parseInt(/[0-9]+/.exec(token)[0]);
    if (numtoken < 1) {
        warnings.push("⚠ Octave too low (o < 1) at " + pos);
    } else if (numtoken > 6) {
        warnings.push("⚠ Octave too high (o > 6) at " + pos);
    }
    clamp(numtoken, 1, 6);

    octaveG = numtoken;

    pos += token.length - 1; //move cursor position
}

function handleOd() {
    if (octaveG == 1) {
        warnings.push("⚠ Octave too low (o < 1) at " + pos);
    } else {
        octaveG--;
    }
}

function handleOu() {
    if (octaveG == 6) {
        warnings.push("⚠ Octave too high (o > 6) at " + pos);
    } else {
        octaveG++;
    }
}

function handleVol(token) {
    let volout = "$" + lengthPrev.toString(16).padStart(2, "0"); //always have to put the volume
    const vols = token.match(/[0-9]+/g);

    for (const i of vols) {
        const curvol = parseInt(i);
        if (curvol > 0x7f) {
            warnings.push("⚠ Volume > $7F at " + pos);
            volout += "$7F";
        } else {
            volout += "$" + curvol.toString(16).padStart(2, "0");
        }
    }

    outstr += volout;
    pos += token.length - 1; //move cursor position
}

function handleInst(token) {
    let numtoken = parseInt(/[0-9]+/.exec(token)[0]);
    if (numtoken > 0x7f) {
        warnings.push("⚠ Instrument > $7F at " + pos);
        numtoken = 0x7f;
    }
    outstr += "$da$" + numtoken.toString(16).padStart(2, 0) + " ";

    pos += token.length - 1; //move cursor position
}

function handleHex(token) {
    //check for pitch bend commands to adjust based on h
    //console.log(token);

    if (token.substring(1, 3) == "dd") {
        //console.log(token);
        //hex syntax
        if (
            /\$dd\$[0-9A-Fa-f][0-9A-Fa-f]\$[0-9A-Fa-f][0-9A-Fa-f]\$[0-9A-Fa-f][0-9A-Fa-f]\$[0-9A-Fa-f][0-9A-Fa-f]/.test(
                token.substring(0, 15),
            )
        ) {
            let startnote = parseInt(token.substring(4, 6), 16) + h;
            let delay = parseInt(token.substring(7, 9), 16);
            let duration = parseInt(token.substring(10, 12), 16);
            let endnote = parseInt(token.substring(13, 15), 16) + h;

            if (startnote < 0x80) {
                warnings.push("⚠ Pitch bend start note < o1c");
                startnote = 0x80;
            }

            if (delay > 0x7f) {
                warnings.push("⚠ Pitch bend delay > $7F");
                delay = 0x7f;
            }
            if (duration > 0x7f) {
                warnings.push("⚠ Pitch bend duration > $7F");
                duration = 0x7f;
            }

            if (endnote < 0x80) {
                warnings.push("⚠ Pitch bend end note < o1c");
                endnote = 0x80;
            }

            outstr +=
                "$dd$" +
                startnote.toString(16).padStart(2, "0") +
                "$" +
                delay.toString(16).padStart(2, "0") +
                "$" +
                duration.toString(16).padStart(2, "0") +
                "$" +
                endnote.toString(16).padStart(2, "0");
            pos += 14; //move cursor position-- hardcoded because we always exactly advance 14 characters, otherwise it's improper syntax anyway so it'll become a ?
        }
        //note syntax
        else if (
            /\$dd(<|>)*[A-Ga-g][+-]?\$[0-9A-Fa-f][0-9A-Fa-f]\$[0-9A-Fa-f][0-9A-Fa-f](<|>)*[A-Ga-g][+-]?/.test(token)
        ) {
            let pshift = 0;
            //process the start note, etc.
            const startnote = /(<|>)*[A-Ga-g][+-]?/.exec(token.substring(3)); //remove the $DD at the beginning
            let delay = parseInt(token.substring(startnote[0].length + 4, startnote[0].length + 6), 16);
            let duration = parseInt(token.substring(startnote[0].length + 7, startnote[0].length + 9), 16);
            const endnote = /(<|>)*[A-Ga-g][+-]?/.exec(token.substring(3 + startnote[0].length + 3 + 3)); //move cursor to the end; additions for clarity

            for (const i of startnote[0]) {
                if (i == "<") {
                    handleOd();
                } else if (i == ">") {
                    handleOu();
                }
            }

            //check for sharp/flat
            if (startnote[0].includes("+")) {
                pshift = 1;
            } else if (startnote[0].includes("-")) {
                pshift = -1;
            } else {
                pshift = 0;
            }

            //the replace here removes everything but the note
            let notenum = notemap.get(startnote[0].replace(/[^A-Ga-g]/g, "")) + (octaveG - 1) * 12 + pshift + h + 0x7f;

            notenum = clamp(notenum, 0x80, 0xc5);

            outstr += "$dd$" + notenum.toString(16).padStart(2, "0");

            //handle delay and duration
            if (delay > 0x7f) {
                warnings.push("⚠ Pitch bend delay > $7F");
                delay = 0x7f;
            }
            if (duration > 0x7f) {
                warnings.push("⚠ Pitch bend duration > $7F");
                duration = 0x7f;
            }

            outstr += "$" + delay.toString(16).padStart(2, "0") + "$" + duration.toString(16).padStart(2, "0");

            //handle end note
            for (const i of endnote[0]) {
                if (i == "<") {
                    handleOd();
                } else if (i == ">") {
                    handleOu();
                }
            }

            //check for sharp/flat
            if (endnote[0].includes("+")) {
                pshift = 1;
            } else if (endnote[0].includes("-")) {
                pshift = -1;
            } else {
                pshift = 0;
            }

            //the replace here removes everything but the note
            notenum = notemap.get(endnote[0].replace(/[^A-Ga-g]/g, "")) + (octaveG - 1) * 12 + pshift + h + 0x7f;
            notenum = clamp(notenum, 0x80, 0xc5);

            outstr += "$" + notenum.toString(16).padStart(2, "0");

            pos += token.length - 1;
        } else {
            warnings.push("⚠ Incorrect $DD parameters (should be 4 parameters, notes should have no lengths).");
            pos += 2;
        }
    } else if (token.substring(1, 3) == "eb") {
        if (
            /\$eb\$[0-9A-Fa-f][0-9A-Fa-f]\$[0-9A-Fa-f][0-9A-Fa-f]\$[0-9A-Fa-f][0-9A-Fa-f]/.test(token.substring(0, 12))
        ) {
            let delay = parseInt(token.substring(4, 6), 16);
            let duration = parseInt(token.substring(7, 9), 16);
            const endnote = parseInt(token.substring(10, 12), 16) + h;

            if (delay > 0x7f) {
                warnings.push("⚠ Pitch bend delay > $7F");
                delay = 0x7f;
            }
            if (duration > 0x7f) {
                warnings.push("⚠ Pitch bend duration > $7F");
                duration = 0x7f;
            }

            outstr +=
                "$eb$" +
                delay.toString(16).padStart(2, "0") +
                "$" +
                duration.toString(16).padStart(2, "0") +
                "$" +
                endnote.toString(16);
            pos += 11; //move cursor position-- hardcoded because we always exactly advance 12 characters, otherwise it's improper syntax anyway so it'll become a ?
        }
        //note syntax
        else if (/\$eb\$[0-9A-Fa-f][0-9A-Fa-f]\$[0-9A-Fa-f][0-9A-Fa-f](<|>)*[A-Ga-g][+-]?/.test(token)) {
            let pshift = 0;
            //process the start note, etc.
            let delay = parseInt(token.substring(4, 6), 16);
            let duration = parseInt(token.substring(7, 9), 16);
            const endnote = token.substring(9);

            //handle delay and duration
            if (delay > 0x7f) {
                warnings.push("⚠ Pitch bend delay > $7F");
                delay = 0x7f;
            }
            if (duration > 0x7f) {
                warnings.push("⚠ Pitch bend duration > $7F");
                duration = 0x7f;
            }

            outstr += "$eb$" + delay.toString(16).padStart(2, "0") + "$" + duration.toString(16).padStart(2, "0");

            //handle end note
            for (const i of endnote) {
                if (i == "<") {
                    handleOd();
                } else if (i == ">") {
                    handleOu();
                }
            }

            //check for sharp/flat
            if (endnote.includes("+")) {
                pshift = 1;
            } else if (endnote.includes("-")) {
                pshift = -1;
            } else {
                pshift = 0;
            }

            //the replace here removes everything but the note
            let notenum = notemap.get(endnote.replace(/[^A-Ga-g]/g, "")) + (octaveG - 1) * 12 + pshift + h + 0x7f;
            notenum = clamp(notenum, 0x80, 0xc5);

            outstr += "$" + notenum.toString(16).padStart(2, "0");

            pos += token.length - 1;
        } else {
            warnings.push("⚠ Too few parameters for $EB (should be 3), parameters treated separate.");
            pos += 2;
        }
    } else {
        //only add one byte since it's not a pitch bend so we don't care
        outstr += token.substring(0, 3);
        pos += 2; //move cursor position-- hardcoded because we always exactly advance 3 characters, otherwise it's improper syntax anyway so it'll become a ?
    }
}

function handleNoise(token) {
    let noiseout = "$da";
    const nparam = token.match(/[0-9A-Fa-f]+/g);

    if (parseInt(nparam[0], 16) > 0x1f) {
        warnings.push("⚠ Noise pitch > $1F at " + pos);
        noiseout += "$9f";
    } else {
        console.log(nparam[0]);
        noiseout += "$" + (parseInt(nparam[0], 16) + 0x80).toString(16);
    }

    //if there is a second argument
    if (nparam.length == 2) {
        if (nparam[1] > 0x7f) {
            warnings.push("⚠ Noise instrument ref. > $7F at " + pos);
            noiseout += "$7f";
        } else {
            noiseout += "$" + parseInt(nparam[1]).toString(16).padStart(2, 0);
        }
    }

    outstr += noiseout + " ";
    pos += token.length - 1; //move cursor position
}

function handleH(token) {
    const htoken = parseInt(/-?[0-9]+/.exec(token)[0]);

    h = htoken;
    pos += token.length - 1; //move cursor position
}

function parseMML(inputMML) {
    //strip whitespace
    inputMML = inputMML.replace(/\s/g, "");
    inputMML = inputMML.replace(/\n/g, "");
    inputMML = inputMML.toLowerCase();

    lengthPrev = 24;
    l = 24;
    octaveG = 4;
    lactivated = false;

    pos = 0;
    h = 0;

    while (pos < inputMML.length) {
        switch (inputMML[pos]) {
            case "a":
            case "b":
            case "c":
            case "d":
            case "e":
            case "f":
            case "g":
                handleNote(noteshape.exec(inputMML.substring(pos))[0]);
                break;
            case "h":
                try {
                    handleH(/h-?[0-9]+/.exec(inputMML.substring(pos))[0]);
                } catch {
                    warnings.push("⚠ Invalid h command at " + pos);
                }
                break;
            case "l":
                try {
                    handleL(/l=?[0-9]+/.exec(inputMML.substring(pos))[0]);
                } catch {
                    warnings.push("⚠ Invalid l command at at " + pos);
                }
                break;
            case "o":
                try {
                    handleO(/o[0-9]/.exec(inputMML.substring(pos))[0]);
                } catch {
                    warnings.push("⚠ Invalid o command at at " + pos);
                }
                break;
            case "<":
                handleOd();
                break;
            case ">":
                handleOu();
                break;
            case "v":
                try {
                    handleVol(/v[0-9]+(?:,[0-9]+)?/.exec(inputMML.substring(pos))[0]);
                } catch {
                    warnings.push("⚠ Invalid v command at at " + pos);
                }
                break;
            case "@":
                try {
                    handleInst(/@[0-9]+/.exec(inputMML.substring(pos))[0]);
                } catch {
                    warnings.push("⚠ Invalid @ command at at " + pos);
                }
                break;
            case "$":
                handleHex(
                    /(\$dd(<|>)*[A-Ga-g][+-]?\$[0-9A-Fa-f][0-9A-Fa-f]\$[0-9A-Fa-f][0-9A-Fa-f](<|>)*[A-Ga-g][+-]?)|(\$eb\$[0-9A-Fa-f][0-9A-Fa-f]\$[0-9A-Fa-f][0-9A-Fa-f](<|>)*[A-Ga-g][+-]?)|((\$[0-9A-Fa-f][0-9A-Fa-f])+)/.exec(
                        inputMML.substring(pos),
                    )[0],
                );
                break;
            case "n":
                try {
                    handleNoise(/n[0-9A-Fa-f]+(?:,[0-9A-Fa-f]+)?/.exec(inputMML.substring(pos))[0]);
                } catch {
                    warnings.push("⚠ Invalid n command at at " + pos);
                }
                break;
            default:
                outstr += "?";
                break;
        }
        pos++;
    }

    return outstr;
}

export default function (smwc) {
    const input = smwc.byID("input");
    const convbutton = smwc.byID("convert");
    const output = smwc.byID("output");
    const warninglist = smwc.byID("warninglist");
    const priority = smwc.byID("priority");

    convbutton.addEventListener("click", () => {
        //realistically i don't see a sound effect breaking the 200-300 character limit in extreme cases
        if (input.value.length <= 10000) {
            warninglist.textContent = "";
            outstr = "";
            warnings.length = 0;

            if (priority.value) {
                outstr +=
                    "$E0$" +
                    parseInt(clamp(priority.value, 0x00, 0xff))
                        .toString(16)
                        .padStart(2, 0) +
                    "\n";
            }

            parseMML(input.value);
            output.value = outstr.toUpperCase();
        } else {
            output.value = "";
            warnings.push("⛔ Input length > 10000. Input not processed.");
        }

        if (warnings.length != 0) {
            warninglist.appendChild(document.createTextNode("Warnings:"));
            for (const i of warnings) {
                warninglist.appendChild(document.createElement("br"));
                warninglist.appendChild(document.createTextNode(i));
            }
        }
    });
}
