// ================================================================================================
// Core logic

const notePitch = {
    'c': 0,
    'd': 2,
    'e': 4,
    'f': 5,
    'g': 7,
    'a': 9,
    'b': 11,
}

/**
 * @typedef {Object} DoWalkOptions
 * @property {boolean | undefined} sort
 */

/**
 * Convert MML
 * @param {string} data MML data
 * @param {DoWalkOptions} options
 * @returns 
 */
function doWalk(data, options) {
    const walkLength = data.length;
    /**
     * @type {Set<number>}
     */
    const allLabel = new Set();
    /**
     * @type {Array<string | number>}
     */
    const builtDataSet = [];

    let walked = 0;
    let currentOctave = 4;
    let currentPitch = 0;

    function applyChar(char) {
        if (typeof builtDataSet[builtDataSet.length - 1] === "string") {
            builtDataSet[builtDataSet.length - 1] += char;
        } else {
            builtDataSet.push(char);
        }
    }

    while (walked < walkLength) {
        switch (data[walked]) {
            case 'o': {
                currentOctave = Number(data[walked + 1]);
                walked += 2;
                break;
            }
            case '<': {
                currentOctave -= 1;
                walked += 1;
                break;
            }
            case '>': {
                currentOctave += 1;
                walked += 1;
                break;
            }
            case 'c':
            case 'd':
            case 'e':
            case 'f':
            case 'g':
            case 'a':
            case 'b': {
                currentPitch = currentOctave * 12 + notePitch[data[walked]];
                if (data[walked + 1] === "+" || data[walked + 1] === "-") {
                    currentPitch += data[walked + 1] === "+" ? 1 : -1;
                    walked += 1;
                }
                allLabel.add(currentPitch);
                applyChar(" ");
                builtDataSet.push(currentPitch);
                walked += 1;
                break;
            }
            case 'q':
            case '$': {
                applyChar(data.slice(walked, walked + 3));
                walked += 3;
                break;
            }
            default: {
                applyChar(data[walked]);
                walked += 1;
                break;
            }
        }
    }
    const builtLabel = [...allLabel]
    if (options.sort) {
        builtLabel.sort((a, b) => {
            if (a > b) {
                return 1
            }
            return -1
        })
    }
    return { builtDataSet, builtLabel };
}

function toFixedMML(builtDataSet, label) {
    let data = `; Note: All labels suffixed with _R means repeated drum note.
; Thus, you don't need to redefine instrument, volume, octave, etc. on labels suffixed with _R, which helps saving insert size.
; Though if you want to use vanilla percussion (@21 - @29), you still have to redefine percussion (volume and others are still not required).
; See https://smwc.me/1505080 for more details.

`;

    // apply label define
    label.forEach((e) => {
        data += `"${e.label}=o4 @0 c"\n`
        data += `"${e.label}_R=c"\n`
    })
    data += "\n"

    // apply notes
    let prevNote = null;
    builtDataSet.forEach((e) => {
        if (typeof e === "number") {
            data += label.find((f) => f.value === e)?.label;
            if (prevNote === e) {
                data += "_R";
            }
            prevNote = e;
            return;
        }
        data += e;
    })

    return data;
}

/**
 * @param {number} id 
 */
function idToNoteName(id) {
    const prefix = "C C# D D# E F F# G G# A A# B".split(" ");
    return prefix[id % 12] + Math.floor(id / 12);
}

// ================================================================================================
// Building interface
const { createApp, defineComponent, ref, reactive } = Vue

// todo: in the future when OnlineTools fully support native ESM, use this instead (at top of the file):
// import { createApp, defineComponent, ref, reactive } from "vue"

// ================================================================================================
// Shared global info
const globalInfo = reactive({
    noteData: `o3c4c4c4c4
c4c4c4c4
>c4c4c4c4
c4c4c4c4
d4d4d4d4
d4d4d4d4
<f4f4f4f4
f4f4f4f4`,
    step: 1,
    rawResults: {
        builtDataSet: [], 
        builtLabel: [],
    },
    label: []
})

// ================================================================================================
// First step form
const FirstStep = defineComponent({
    name: "FirstStep",
    setup() {
        const sortMode = ref(/** @typedef sortMode "appear" | "pitch" */ "appear");

        function handleSubmit() {
            globalInfo.rawResults = doWalk(globalInfo.noteData, {
                sort: sortMode.value === "pitch"
            });
            globalInfo.label = globalInfo.rawResults.builtLabel.map((e) => ({
                label: `PERC${String(e).padStart(2, "0")}X`,
                value: e,
            }))
            globalInfo.step = 2;
        }

        return {
            globalInfo,
            handleSubmit,
            sortMode,
        }
    },
    template: `
        <form @submit.prevent="handleSubmit" target="#">
            <label for="note-data" style="display: block; margin-bottom: 0.5rem">Note Data:</label>
            <textarea id="note-data" v-model="globalInfo.noteData" style="display: block; resize: vertical; width: 100%; min-height: 250px; margin-bottom: 0.5rem" />
            <fieldset>
                <legend>How do we sort labels representing drum notes?</legend>
                <div>
                    <input type="radio" id="sort-by-appearing" value="appear" v-model="sortMode" />
                    <label for="sort-by-appearing">By when they appears</label>
                </div>
                <div>
                    <input type="radio" id="sort-by-pitch" value="pitch" v-model="sortMode" />
                    <label for="sort-by-pitch">By octave and pitch</label>
                </div>
            </fieldset>
            <div style="display: flex; justify-content: flex-end">
                <button type="submit">Next Step</button>
            </div>
        </form>
    `
})

// ================================================================================================
// Second step form
const SecondStep = defineComponent({
    name: "SecondStep",
    setup() {
        function handlePrevStep() {
            globalInfo.step = 1;
        }

        function handleNextStep() {
            globalInfo.step = 3;
        }

        return {
            globalInfo,
            idToNoteName,
            handleNextStep,
            handlePrevStep
        }
    },
    template: `
        <p>(Optional) You can set label name for each note here. Each label name should begin or end with UPPERCASE letter.</p>
        <p>If not needed, just select <strong>Next Step</strong>.</p>
        <table>
            <thead>
                <tr>
                    <th>Note</th>
                    <th>Label</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="(e, i) in globalInfo.label" key="i">
                    <td style="vertical-align: middle">{{ idToNoteName(e.value) }}</td>
                    <td><input v-model="e.label" style="margin: 0" /></td>
                </tr>
            </tbody>
        </table>
        <div style="display: flex; justify-content: space-between">
            <button @click="handlePrevStep">Prev Step</button>
            <button @click="handleNextStep">Next Step</button>
        </div>
    `
})

// ================================================================================================
// First step form
const ThirdStep = defineComponent({
    name: "ThirdStep",
    setup() {
        const result = ref(toFixedMML(globalInfo.rawResults.builtDataSet, globalInfo.label));

        function handleFixAnother() {
            globalInfo.step = 1;
        }

        return {
            globalInfo,
            result,
            handleFixAnother,
        }
    },
    template: `
        <form @submit.prevent="handleFixAnother" target="#">
            <label for="note-data" style="display: block; margin-bottom: 0.5rem">Here is your fixed Note Data for drum:</label>
            <textarea id="note-data" v-model="result" style="display: block; resize: vertical; width: 100%; min-height: 250px; margin-bottom: 0.5rem" />
            <div style="display: flex; justify-content: flex-start">
                <button type="submit">Fix Another</button>
            </div>
        </form>
    `
})

// ================================================================================================
// Init program
export default function() {
    createApp({
        components: {
            FirstStep,
            SecondStep,
            ThirdStep,
        },
        setup() {
            return {
                globalInfo
            }
        },
        template: `
            <first-step v-if="globalInfo.step === 1"></first-step>
            <second-step v-if="globalInfo.step === 2"></second-step>
            <third-step v-if="globalInfo.step === 3"></third-step>
        `
    }).mount('#drum-fixer-main')
}
