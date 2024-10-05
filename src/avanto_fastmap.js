// ==UserScript==
// @name        Avanto Fastmap
// @namespace   avanto
// @match       https://map.avanto.tk/*
// @require https://cdn.jsdelivr.net/npm/@violentmonkey/shortcut@1
// @downloadURL https://raw.githubusercontent.com/brndd/avanto-tripwire-fastmap/refs/heads/master/avanto_fastmap.user.js
// @updateURL https://raw.githubusercontent.com/brndd/avanto-tripwire-fastmap/refs/heads/master/avanto_fastmap.user.js
// @grant       none
// @version     0.2.1
// @author      burneddi
// @description Adds a quick input box for adding wormholes to Tripwire using Avanto bookmark syntax.
// ==/UserScript==

const ShortClassToTW = {
    "H": "High-Sec",
    "L": "Low-Sec",
    "N": "Null-Sec",
    "Tr": "Triglavian",
    "Th": "31000005", //Thera
    "12": "31000005", //Thera
    "1": "Class-1",
    "2": "Class-2",
    "3": "Class-3",
    "4": "Class-4",
    "5": "Class-5",
    "6": "Class-6",
    "13": "Class-13",
    "14": "31000001", //Sentinel
    "15": "31000002", //Barbican
    "16": "31000003", //Vidette
    "17": "31000004", //Conflux
    "18": "31000006",  //Redoubt
    "?": "Unknown"
};

const TWToShortClass = {
    "High-Sec": "H",
    "Low-Sec": "L",
    "Null-Sec": "N",
    "Triglavian": "Tr",
    "Thera": "Th",
    "Class-1": "1",
    "Class-2": "2",
    "Class-3": "3",
    "Class-4": "4",
    "Class-5": "5",
    "Class-6": "6",
    "Class-13": "13",
    "Class-14": "14",
    "Class-15": "15",
    "Class-16": "16",
    "Class-17": "17",
    "Class-18": "18",
    "Unknown": "?",
    "31000005": "Th",
    "31000001": "14",
    "31000002": "15",
    "31000003": "16",
    "31000004": "17",
    "31000006": "18",
    "30002086": "L"
};

const IDToSystemName = {
    "31000005": "Thera",
    "31000001": "J055520", //Sentinel
    "31000002": "J110145", //Barbican
    "31000003": "J164710", //Vidette
    "31000004": "J200727", //Conflux
    "31000006": "J174618", //Redoubt
    "30002086": "Turnur"
}

VM.shortcut.register('a-n', () => {
    displayInputBox();
});

let fastmap = window.fastmap = {};

fastmap.parse = function(text) {
    wh = {
        chain: null,
        class: null,
        depth: null,
        sig: null,
        isFrig: null,
        remainingLife: null,
        remainingMass: null,
        type: null,
        comment: null
    };

    let res = peggy.parse(text);

    wh.chain = res[0][0].toUpperCase();
    
    let whClass = res[0][1].charAt(0).toUpperCase() + res[0][1].slice(1).toLowerCase();
    if (ShortClassToTW[whClass] != undefined) {
        wh.class = ShortClassToTW[whClass];
    }
    else {
        wh.class = "Unknown";
    }

    wh.depth = res[0][2].toUpperCase();

    wh.sig = res[1].toUpperCase();

    wh.remainingLife = "stable";
    wh.remainingMass = "stable";
    if (res[2] != null) {
        for (let i = 0; i < res[2].length; i++) {
            let c = res[2][i].toUpperCase();
            switch (c) {
                case "F":
                case "S":
                    wh.isFrig = true;
                    break;
                case "C":
                    wh.remainingMass = "critical";
                    break;
                case "H":
                case "D":
                    wh.remainingMass = "destab";
                    break;
                case "E":
                    wh.remainingLife = "critical";
                    break;
            }
        }
    }

    wh.type = res[3].toUpperCase();

    wh.comment = res[4];

    return wh;
}

fastmap.addWormhole = function (parsedWh) {
    let sourceID = viewingSystemID;

    //Error checking
    if (parsedWh.type != "K162" && appData.wormholes[parsedWh.type] == undefined) {
        throw new Error("Invalid wormhole type");
    }

    let targetClass = parsedWh.class;
    //Figure out the other side
    let otherSide = "????";
    if (parsedWh.type != "K162") {
        otherSide = "K162";
        //Figure out the class from the type, overriding the user input
        let target = appData.wormholes[parsedWh.type].leadsTo;

        //Stupid hack for Thera, Turnur and drifter WHs
        //because Tripwire wants the system ID, not the name
        switch (target) {
            case "Thera":
                targetClass = "31000005";
                break;
            case "J055520": //Sentinel
                targetClass = "31000001";
                break;
            case "J110145": //Barbican
                targetClass = "31000002";
                break;
            case "J164710": //Vidette
                targetClass = "31000003";
                break;
            case "J200727": //Conflux
                targetClass = "31000004";
                break;
            case "J174618": //Redoubt
                targetClass = "31000006";
                break;
            case "Turnur":
                targetClass = "30002086";
                break;
            default:
                targetClass = target;
                break;
        }
    }
    else if (parsedWh.type == "K162" && parsedWh.class != "Unknown") {
        let eligibleTypes = wormholeAnalysis.eligibleWormholeTypes(sourceID, targetClass);
        let isFrig = parsedWh.isFrig;
        if (isFrig) {
            let eligibles = eligibleTypes.from.filter((c) => c.jump <= 5000000);
            if (eligibles.length == 0) {
                let sourceType = systemAnalysis.analyse(sourceID).genericSystemType;
                let targetName = IDToSystemName[targetClass] != undefined ? IDToSystemName[targetClass] : targetClass;
                throw new Error(`Impossible connection: no frigate holes from from ${targetName} to ${sourceType}.`);
            }
            otherSide = eligibles[0].key;
        }
        else {
            let eligibles = eligibleTypes.to.filter((c) => c.jump > 5000000);
            if (eligibles.length == 0) {
                let sourceType = systemAnalysis.analyse(sourceID).genericSystemType;
                let targetName = IDToSystemName[targetClass] != undefined ? IDToSystemName[targetClass] : targetClass;
                throw new Error(`Impossible connection: no non-frigate holes from from ${targetName} to ${sourceType}.`);
            }
            otherSide = eligibles[0].key;
        }
    }

    //Figure out the full signature
    let sigs = Object.values(tripwire.signatures.currentSystem);
    let matchedSigs = sigs.filter((s) => s.signatureID.slice(0, 3).toUpperCase() === parsedWh.sig);
    //TODO: disambiguate the rare edge case of multiple matches, error out if sig not found in system(?)
    let sigObj = {};
    let fullSig = "";
    if (matchedSigs.length) {
        sigObj = matchedSigs[0];
        fullSig = sigObj.signatureID;
    }
    else {
        throw new Error("No matching sig in system (paste your sig list first).");
    }

    let maxLife = appData.wormholes[(parsedWh.type == "K162" ? otherSide : parsedWh.type)].life.substring(0, 2) * 60 * 60;
    
    //More Tripwire idiosyncracies: this function only works with system names and genericSystemTypes
    let tar = targetClass;
    if (IDToSystemName[targetClass] != undefined) {
        tar = IDToSystemName[targetClass];
    }
    let leadsTo = wormholeAnalysis.targetSystemID(tar, parsedWh.type);

    //Reconstruct name
    let thirdPart = `${parsedWh.isFrig ? "F" : ""}${parsedWh.remainingMass == "critical" ? "C" : parsedWh.remainingMass == "destab" ? "H" : ""}${parsedWh.remainingLife == "critical" ? "E" : ""}`;
    let name = `${parsedWh.chain}${TWToShortClass[targetClass]}${parsedWh.depth} ${parsedWh.sig}${thirdPart != "" ? ` ${thirdPart}` : ""}${parsedWh.type}${parsedWh.comment != null ? ` ${parsedWh.comment}` : ""}`;
    //console.log(`Reconstructed name: ${name}`);
    //console.log(`This is a wormhole in the ${wh.chain} chain leading to ${wh.class} at depth ${wh.depth} with sig ID ${fullSig}. The other side's WH type is ${otherSide}. The max life is ${maxLife} seconds.`);

    //Add the actual sig to Tripwire

    let payload = {};
    let undo = [];
    let signature = {
        "id": sigObj.id,
        "signatureID": fullSig,
        "systemID": sourceID,
        "type": "wormhole",
        "name": name,
        "lifeLength": maxLife
    };

    let signature2 = {
        "id": "",
        "signatureID": "",
        "systemID": leadsTo == null ? "" : leadsTo,
        "type": "wormhole",
        "name": "",
        "lifeLength": maxLife
    };
    let type = null;
    let parent = null;
    if (parsedWh.type.length > 0 && appData.wormholes[parsedWh.type] != undefined && parsedWh.type != "K162") {
        parent = "initial";
        type = parsedWh.type;
    }
    else if (otherSide.length > 0 && appData.wormholes[otherSide] != undefined && otherSide != "K162") {
        parent = "secondary";
        type = otherSide;
    }
    else {
        //TODO: fail more gracefully
        throw new Error("undefined WH type");
    }
    let wormhole = {
        "id": "",
        "type": type,
        "parent": parent,
        "life": parsedWh.remainingLife,
        "mass": parsedWh.remainingMass
    };

    //Check if there's a wormhole associated with this signature and find it if it exists
    if (sigObj.type == "wormhole") {
        let wormholes = Object.values(tripwire.client.wormholes).filter((s) => s.initialID == sigObj.id);
        if (!wormholes.length) {
            throw new Error("sig type is wormhole but couldn't find matching wormhole");
        }
        let existingWh = wormholes[0];
        wormhole.id = existingWh.id;
        signature2.id = existingWh.secondaryID;

        //update the wormhole initial and type based on which side we're editing
        if (parsedWh.type.length > 0 && appData.wormholes[parsedWh.type] != undefined && parsedWh.type != "K162") {
            wormhole.parent = existingWh.initialID == sigObj.id ? "initial" : "secondary";
            wormhole.type = parsedWh.type;
        }
        else if (otherSide.length > 0 && appData.wormholes[otherSide] != undefined && otherSide != "K162") {
            wormhole.parent = existingWh.initialID == sigObj.id ? "secondary" : "initial";
            wormhole.type = otherSide;
        }
        else {
            throw new Error("undefined WH type");
        }

        if (existingWh) {
            //used to be a wormhole
            //undo.push({"wormhole": existingWh, "signatures": [tripwire.client.signatures[signature.id], tripwire.client.signatures[signature2.id]]});
        }
        else {
            //used to be an unknown sig
            //undo.push(tripwire.client.signatures[signature.id]);
        }
    }
    payload = {"signatures": {"update": [{"wormhole": wormhole, "signatures": [signature, signature2]}]}};

    let success = function(data) {
        //TODO: this is where we should do some undo stuff

        // if (data.resultSet && data.resultSet[0] == true) {
        //     $("#undo").removeClass("disabled");
        //     if (sigObj.type != "wormhole") {
        //         undo = data.results;
        //     }

        // }
        console.log("Op success!");
    }
    let always = function() {
        console.log("Posted payload.");
    }

    //console.log("And this is where we would send the following payload:");
    //console.log(payload);
    tripwire.refresh('refresh', payload, success, always);
}

//begin:chatgpt
// Create the input box container
const inputBoxContainer = document.createElement('div');
inputBoxContainer.id = 'fastmap-inputbox-container';
inputBoxContainer.style.all = 'initial';
inputBoxContainer.style.position = 'fixed';
inputBoxContainer.style.top = '50%';
inputBoxContainer.style.left = '50%';
inputBoxContainer.style.transform = 'translate(-50%, -50%)';
inputBoxContainer.style.backgroundColor = 'white';
inputBoxContainer.style.border = '1px solid black';
inputBoxContainer.style.padding = '0';
inputBoxContainer.style.zIndex = '10000';
inputBoxContainer.style.width = '300px';
inputBoxContainer.style.display = 'none'; // Initially hidden

// Create the syntax hint box
const syntaxHintBox = document.createElement('div');
syntaxHintBox.id = 'fastmap-syntaxhintbox';
syntaxHintBox.style.all = 'initial';
syntaxHintBox.style.backgroundColor = 'lightyellow';
syntaxHintBox.style.color = 'black';
syntaxHintBox.style.padding = '5px';
syntaxHintBox.style.border = '1px solid black';
syntaxHintBox.style.boxSizing = 'border-box';
syntaxHintBox.style.display = 'none'; // Initially hidden
syntaxHintBox.style.position = 'absolute';
syntaxHintBox.style.bottom = '100%'; // Position above the input box
syntaxHintBox.style.width = '300px';
syntaxHintBox.style.fontFamily = 'Verdana, "Helvetica Neue", Arial, sans-serif'
syntaxHintBox.style.fontSize = '10px';
syntaxHintBox.innerHTML = `
<b>Input a wormhole signature in the following format:</b><br>
<span style="font-family: monospace;">[chain][class][depth] [sig] [size/mass/life] [type] [comment]</span><br><br>
For example: <span style="font-family: monospace;">H5A ABC EC H296 (sig)</span><br><br>
<b>Chain:</b><br>
&nbsp;&nbsp;- Any single letter.<br>
<b>Class:</b><br>
&nbsp;&nbsp;- One of: H / L / N / 1-6 / 13 / Tr, Trig / Th, Thera.<br>
<b>Depth:</b><br>
&nbsp;&nbsp;- A-Z (beyond 26: AA, AB, ..., AZ, BA, ...).<br>
<b>Sig:</b><br>
&nbsp;&nbsp;- The letter part of the signature.<br>
<b>Life/Mass/Lifetime (opt.):</b><br>
&nbsp;&nbsp;- C (crit) / H, D (half-mass) / E (EOL) / F, S (frig).<br>
<b>Type:</b><br>
&nbsp;&nbsp;- K162, H296, B274...<br>
<b>Comment (opt.):</b><br>
&nbsp;&nbsp;- Any text in parenthesis (like this). Added to connection name after other info.
`;

// Create the toggle button
const toggleButton = document.createElement('button');
toggleButton.innerHTML = '?';
toggleButton.title = 'Toggle syntax help';
toggleButton.style.all = 'initial';
toggleButton.style.position = 'absolute';
toggleButton.style.right = '5px';
toggleButton.style.top = '5px';
toggleButton.style.width = '20px';
toggleButton.style.height = '20px';
toggleButton.style.backgroundColor = '#333333';
toggleButton.style.border = '1px solid black';
toggleButton.style.cursor = 'pointer';
toggleButton.style.display = 'flex';
toggleButton.style.alignItems = 'center';
toggleButton.style.justifyContent = 'center';
toggleButton.style.color = 'white';
toggleButton.style.userSelect = 'none';

// Event listener for toggle button
toggleButton.addEventListener('click', () => {
    if (syntaxHintBox.style.display === 'none') {
        syntaxHintBox.style.display = 'block';
        toggleButton.style.backgroundColor = "#666666";
    } else {
        syntaxHintBox.style.display = 'none';
        toggleButton.style.backgroundColor = "#333333";
    }
});

// Create the input box
const inputBox = document.createElement('input');
inputBox.id = 'fastmap-inputbox';
inputBox.type = 'text';
inputBox.style.all = 'initial';
inputBox.style.width = '300px';
inputBox.style.fontSize = '16px';
inputBox.style.padding = '5px';
inputBox.style.paddingRight = '30px';
inputBox.style.border = '1px solid black';
inputBox.style.boxSizing = 'border-box';

// Create the error box
const errorBox = document.createElement('div');
errorBox.id = 'fastmap-errorbox';
errorBox.style.all = 'initial';
errorBox.style.color = 'red';
errorBox.style.padding = '5px';
errorBox.style.display = 'none';
errorBox.style.whiteSpace = 'pre-line';

inputBoxContainer.appendChild(syntaxHintBox);
inputBoxContainer.appendChild(toggleButton);
inputBoxContainer.appendChild(inputBox);
inputBoxContainer.appendChild(errorBox);
document.body.appendChild(inputBoxContainer);

function displayInputBox() {
    // Show the input box container
    inputBoxContainer.style.display = 'block';

    // Clear previous content and error messages
    inputBox.value = '';
    errorBox.style.display = 'none';

    // Focus on the input box
    inputBox.focus();
}

// Event listener for keypresses in the input box
inputBox.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        // Hide the input box when Escape is pressed
        inputBoxContainer.style.display = 'none';
    } else if (event.key === 'Enter') {
        // Prevent default behavior of Enter key
        event.preventDefault();
        clearTimeout(fastmap.timeout);

        // Get the input box content
        const content = inputBox.value;

        // Clear previous error message
        errorBox.style.display = 'none';

        try {
            let parsedWh = fastmap.parse(content);
            fastmap.addWormhole(parsedWh);

            // Hide the input box after successful submission
            inputBoxContainer.style.display = 'none';
        } catch (error) {
            // Display the error message
            errorBox.textContent = "FATAL: " + error.message;
            errorBox.style.display = 'block';
        }
    }
});
//end:chatgpt

fastmap.timeout = null;
function debounce(immediate, afterDelay, delay) {
    return function(...args) {
        clearTimeout(fastmap.timeout);
        immediate.apply(this);
        fastmap.timeout = setTimeout(() => {
            afterDelay.apply(this, args);
        }, delay);
    };
}

inputBox.addEventListener("input", debounce(() => {
    errorBox.style.display = "none";
    errorBox.textContent = "";
},
(event) => {
    try {
        let result = fastmap.parse(inputBox.value);
    }
    catch (error) {
        if (inputBox.value.length > 0) {
            errorBox.textContent = error.message;
            errorBox.style.display = "block";
        }
    }
}, 500));

