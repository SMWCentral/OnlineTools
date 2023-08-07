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
 * Convert MML
 * @param {string} data MML data
 * @returns 
 */
function doWalk(data) {
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
            default: {
                applyChar(data[walked]);
                walked += 1;
                break;
            }
        }
    }
    const builtLabel = [...allLabel].sort((a, b) => {
        if (a > b) {
            return 1
        }
        return -1
    })
    return { builtDataSet, builtLabel };
}

function toFixedMML(builtDataSet, label) {
    let data = "";

    // apply label define
    label.forEach((e) => {
        data += `"${e.label}=o4 c"\n`
    })
    data += "\n"

    // apply notes
    builtDataSet.forEach((e) => {
        if (typeof e === "number") {
            data += label.find((f) => f.value === e)?.label;
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
        function handleSubmit() {
            globalInfo.rawResults = doWalk(globalInfo.noteData);
            globalInfo.label = globalInfo.rawResults.builtLabel.map((e) => ({
                label: `PERC${String(e).padStart(2, "0")}X`,
                value: e,
            }))
            globalInfo.step = 2;
        }

        return {
            globalInfo,
            handleSubmit,
        }
    },
    template: `
        <form @submit.prevent="handleSubmit" target="#">
            <label for="note-data" style="display: block; margin-bottom: 0.5rem">Note Data:</label>
            <textarea id="note-data" v-model="globalInfo.noteData" style="display: block; resize: vertical; width: 100%; min-height: 250px; margin-bottom: 0.5rem" />
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
