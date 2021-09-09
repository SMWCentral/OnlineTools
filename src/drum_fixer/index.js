var notePitch = {
    'c': 0,
    'd': 2,
    'e': 4,
    'f': 5,
    'g': 7,
    'a': 9,
    'b': 11,
}

function massMarge(orig, insert) {
    var temp2 = orig;
    if (!temp2.includes(insert)) {
        temp2.push(insert);
    }
    return temp2;
}

/**
 * Convert MML
 * @param {string} data MML data
 * @returns 
 */
function doWalk(data) {
    // var data = document.getElementById("note_data").value;
    var newData = "";
    var walked = 0;
    var walkLength = data.length;
    var currentOctave = 4;
    var privPitch = -1;
    var currentPitch = 0;
    var allLabel = [];
    while (walked < walkLength) {
        switch (data[walked]) {
            case 'o':
            currentOctave = Number(data[walked + 1]);
            walked += 2;
            break;
            case '<':
            currentOctave -= 1;
            walked += 1;
            break;
            case '>':
            currentOctave += 1;
            walked += 1;
            break;
            case 'c':
            case 'd':
            case 'e':
            case 'f':
            case 'g':
            case 'a':
            case 'b':
            privPitch = currentPitch;
            currentPitch = currentOctave * 12 + notePitch[data[walked]];
            if (data[walked + 1] === "+" || data[walked + 1] === "-") {
                currentPitch += data[walked + 1] === "+" ? 1 : -1;
                walked += 1;
            }
            var nowLabelName;
            if (privPitch === currentPitch) {
                nowLabelName = "c";
            } else {
                nowLabelName = "PERC" + currentPitch + "X";
                allLabel = massMarge(allLabel, '"' + nowLabelName + '=o4 c"');
            }
            newData += " " + nowLabelName;
            walked += 1;
            break;
            default:
            newData += data[walked];
            walked += 1;
            break;
        }
    }
    return allLabel.join("\n") + "\n\n" + newData;
}

export default function(smwc) {
    const noteInput = smwc.byID("note_data")
    const makeBtn = smwc.byID("make_btn")

    makeBtn.addEventListener('click', () => {
        noteInput.value = doWalk(noteInput.value)
    })
}
