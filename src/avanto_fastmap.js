// ==UserScript==
// @name        Avanto Fastmap
// @namespace   avanto
// @match       https://map.avant0.fi/*
// @require https://cdn.jsdelivr.net/npm/@violentmonkey/shortcut@1
// @downloadURL https://raw.githubusercontent.com/brndd/avanto-tripwire-fastmap/refs/heads/master/avanto_fastmap.user.js
// @updateURL https://raw.githubusercontent.com/brndd/avanto-tripwire-fastmap/refs/heads/master/avanto_fastmap.meta.js
// @grant       none
// @version     0.5.2
// @author      burneddi
// @description Adds a quick input box for adding wormholes to Tripwire using Avanto bookmark syntax.
// ==/UserScript==

const ShortClassToTW = {
    "H": "High-Sec",
    "L": "Low-Sec",
    "N": "Null-Sec",
    "P": "Triglavian",
    "T": "31000005", //Thera
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
    "Triglavian": "P",
    "Thera": "T",
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
    "31000005": "T",
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

class WhAddError extends Error {
    constructor(message) {
        super(message);
        this.name = "WhAddError";
    }
}

VM.shortcut.register('a-s', () => {
  displayInputBox();
});

VM.shortcut.register('ctrl-cmd-s', () => {
  displayInputBox();
})

let fastmap = window.fastmap = {};

fastmap.parse = function(text) {
    wh = {
        chain: null,
        class: null,
        depth: null,
        sig: null,
        isFrig: null,
        remainingLife: null,
        remainingLifeSeconds: null,
        remainingMass: null,
        type: null,
        comment: null,
        origText: text
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
    wh.remainingLifeSeconds = 16 * 60 * 60;
    wh.remainingMass = "stable";
    if (res[2] != null) {
        for (let i = 0; i < res[2].length; i++) {
            let c = res[2][i].toUpperCase();
            if (c == "F" || c == "S") {
                wh.isFrig = true;
            }
            else if (c == "C") {
                wh.remainingMass = "critical";
            }
            else if (c == "H" || c == "D") {
                wh.remainingMass = "destab";
            }
            else if (c.match(/[0-9]+/)) {
                const life = parseInt(c);
                if (life <= 4) {
                    wh.remainingLife = "critical";
                }
                else {
                    wh.remainingLife = "stable";
                }
                wh.remainingLifeSeconds = life * 60 * 60;
            }
        }
    }

    wh.type = res[3].toUpperCase();

    wh.comment = res[4];

    return wh;
}

fastmap.addWormholes = function (parsedWhArray) {
    let sourceID = viewingSystemID;
    let errors = new Array(parsedWhArray.length).fill(null);
    let wormholesPayload = [];
    
    let sigs = Object.values(tripwire.signatures.currentSystem);
    if (sigs.length == 0) {
        throw new Error("No signatures in system (paste your sig list first).");
    }

    for (let i = 0; i < parsedWhArray.length; i++) {
        let parsedWh = parsedWhArray[i];

        try {
            //Error checking
            if (parsedWh.type != "K162" && appData.wormholes[parsedWh.type] == undefined) {
                throw new WhAddError("Invalid wormhole type");
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
                // If there's only one possible connection,
                // the user probably means that regardless of what they specify for the frig status.
                if (eligibleTypes.to.length == 1) {
                    otherSide = eligibleTypes.to[0].key;
                }
                else if (isFrig) {
                    let eligibles = eligibleTypes.to.filter((c) => c.jump <= 5000000);
                    if (eligibles.length == 0) {
                        let sourceType = systemAnalysis.analyse(sourceID).genericSystemType;
                        let targetName = IDToSystemName[targetClass] != undefined ? IDToSystemName[targetClass] : targetClass;
                        throw new WhAddError(`Impossible connection: no frigate holes from from ${targetName} to ${sourceType}.`);
                    }
                    otherSide = eligibles[0].key;
                }
                else {
                    let eligibles = eligibleTypes.to.filter((c) => c.jump > 5000000);
                    if (eligibles.length == 0) {
                        let sourceType = systemAnalysis.analyse(sourceID).genericSystemType;
                        let targetName = IDToSystemName[targetClass] != undefined ? IDToSystemName[targetClass] : targetClass;
                        throw new WhAddError(`Impossible connection: no non-frigate holes from from ${targetName} to ${sourceType}.`);
                    }
                    otherSide = eligibles[0].key;
                }
            }

            //Figure out the full signature
            let matchedSigs = sigs.filter((s) => s.signatureID && s.signatureID.slice(0, 3).toUpperCase() == parsedWh.sig);
            //TODO: disambiguate the rare edge case of multiple matches, error out if sig not found in system(?)
            let sigObj = {};
            let fullSig = "";
            if (matchedSigs.length) {
                sigObj = matchedSigs[0];
                fullSig = sigObj.signatureID;
            }
            else {
                throw new WhAddError("No matching sig in system.");
            }

            let maxLife = 24 * 60 * 60;
            let holedata = appData.wormholes[(parsedWh.type == "K162" ? otherSide : parsedWh.type)];
            if (holedata != undefined) {
                maxLife = holedata.life.substring(0, 2) * 60 * 60;
            }
            
            //More Tripwire idiosyncracies: this function only works with system names and genericSystemTypes
            let tar = targetClass;
            if (IDToSystemName[targetClass] != undefined) {
                tar = IDToSystemName[targetClass];
            }
            let leadsTo = wormholeAnalysis.targetSystemID(tar, parsedWh.type);
            if (leadsTo == null) {
                leadsTo = "";
            }

            //Reconstruct name
            //let thirdPart = `${parsedWh.isFrig ? "F" : ""}${parsedWh.remainingMass == "critical" ? "C" : parsedWh.remainingMass == "destab" ? "H" : ""}${parsedWh.remainingLife == "critical" ? "E" : ""}`;
            let name = `${parsedWh.chain}${TWToShortClass[targetClass]}${parsedWh.depth} ${parsedWh.sig}${parsedWh.comment != null ? ` ${parsedWh.comment}` : ""}`;
            //console.log(`Reconstructed name: ${name}`);
            //console.log(`This is a wormhole in the ${wh.chain} chain leading to ${wh.class} at depth ${wh.depth} with sig ID ${fullSig}. The other side's WH type is ${otherSide}. The max life is ${maxLife} seconds.`);

            //Add the actual sig to Tripwire
            let undo = [];
            let wormhole = null;
            let signature = null;
            let signature2 = null;
            //Check if there's a wormhole associated with this signature and use that instead if it exists
            if (sigObj.type == "wormhole") {
                let wormholes = Object.values(tripwire.client.wormholes).filter((s) => s.initialID == sigObj.id || s.secondaryID == sigObj.id);
                if (!wormholes.length) {
                    throw new WhAddError("sig type is wormhole but couldn't find matching wormhole");
                }
                let existingWh = wormholes[0];
                wormhole = {
                    "id": existingWh.id,
                    "life": parsedWh.remainingLife,
                    "mass": parsedWh.remainingMass
                }

                //update the wormhole initial and type based on which side we're editing
                //if this looks like insane nonsense it's because this is basically copypasted from Tripwire source
                if (parsedWh.type.length > 0 && appData.wormholes[parsedWh.type] != undefined && parsedWh.type != "K162") {
                    wormhole.parent = existingWh.initialID == sigObj.id ? "initial" : "secondary";
                    wormhole.type = parsedWh.type;
                }
                else if ((otherSide.length > 0 && appData.wormholes[otherSide] != undefined && otherSide != "K162") || (targetClass == "Unknown" && otherSide == "????")) {
                    wormhole.parent = existingWh.initialID == sigObj.id ? "secondary" : "initial";
                    wormhole.type = otherSide;
                }
                else {
                    throw new Error("undefined WH type");
                }

                //Tripwire expects Y-m-d H:i:s in UTC, this wonderful hack gets us that
                //let lifeLeft = new Date(Date.now() + parsedWh.remainingLifeSeconds * 1000).toISOString().slice(0, 19).replace('T', ' ');
                let lifeLeft = "+" + parsedWh.remainingLifeSeconds + " seconds";
                //console.log("lifeLeft: " + lifeLeft);

                let existingSig = null;
                let existingSig2 = null;
                
                if (existingWh.initialID == sigObj.id) {
                    existingSig = tripwire.signatures.list[existingWh.initialID];
                    existingSig2 = tripwire.signatures.list[existingWh.secondaryID];
                }
                else {
                    existingSig = tripwire.signatures.list[existingWh.secondaryID];
                    existingSig2 = tripwire.signatures.list[existingWh.initialID];
                }

                signature = {
                    "type": "wormhole",
                    "lifeLength": maxLife,
                    "lifeLeft": lifeLeft
                };

                signature2 = {
                    "type": "wormhole",
                    "lifeLength": maxLife,
                    "lifeLeft": lifeLeft
                };

                signature.id = existingSig.id;
                signature.signatureID = fullSig;
                signature.systemID = sourceID;
                signature.name = name;
                
                signature2.id = existingSig2.id;
                if (existingSig2.systemID == null) {
                    signature2.systemID = leadsTo;
                }
                else {
                    signature2.systemID = existingSig2.systemID;
                }
            }
            else {
                signature = {
                    "id": sigObj.id,
                    "signatureID": fullSig,
                    "systemID": sourceID,
                    "type": "wormhole",
                    "name": name,
                    "lifeLength": maxLife,
                    "lifeLeft": "+" + parsedWh.remainingLifeSeconds + " seconds"
                };

                signature2 = {
                    "id": "",
                    "signatureID": "",
                    "systemID": leadsTo,
                    "type": "wormhole",
                    "name": "",
                    "lifeLength": maxLife,
                    "lifeLeft": "+" + parsedWh.remainingLifeSeconds + " seconds"
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
                else if (targetClass == "Unknown" && otherSide == "????") {
                    parent = "secondary";
                    type = otherSide;
                }
                else {
                    //TODO: fail more gracefully
                    throw new WhAddError("undefined WH type");
                }

                wormhole = {
                    "id": "",
                    "type": type,
                    "parent": parent,
                    "life": parsedWh.remainingLife,
                    "mass": parsedWh.remainingMass
                };
            }
            wormholesPayload.push({"wormhole": wormhole, "signatures": [signature, signature2]});
        } catch (error) {
            errors[i] = error;
        }
    }

    if (wormholesPayload.length > 0) {
        let payload = {"signatures":  {"update": wormholesPayload}};

        let success = function(data) {
            console.log("Op success!");
        }
        let always = function() {
            console.log("Posted payload.");
        }

        tripwire.refresh('refresh', payload, success, always);
    }

    return errors;
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
<span style="font-family: monospace;">[chain][class][depth] [sig] [type] [size/mass/life] [comment]</span><br><br>
For example: <span style="font-family: monospace;">H5A ABC H296 EC (bubbled)</span><br>
[type] and [size/mass/life] can be in either order.<br><br>
<b>Chain:</b><br>
&nbsp;&nbsp;- Any single letter.<br>
<b>Class:</b><br>
&nbsp;&nbsp;- One of: H / L / N / 1-6 / 13 / P (Pochven) / T (Thera).<br>
&nbsp;&nbsp;- You can use ? for unknown class and the mapper will try to infer it from WH type.<br>
<b>Depth:</b><br>
&nbsp;&nbsp;- A-Z (beyond 26: AA, AB, ..., AZ, BA, ...).<br>
<b>Sig:</b><br>
&nbsp;&nbsp;- The letter part of the signature.<br>
<b>Type:</b><br>
&nbsp;&nbsp;- K162, H296, B274...<br>
<b>Life/Mass/Lifetime (opt.):</b><br>
&nbsp;&nbsp;- C (crit) / H, D (half-mass) / E (1h EOL) <i>OR</i> number (life in hours) / F, S (frig).<br>
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

    if (Object.values(tripwire.signatures.currentSystem).length == 0) {
        errorBox.textContent = "No signatures in system (paste your sig list first).";
        errorBox.style.display = 'block';
    }

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
            let error = fastmap.addWormholes([parsedWh])[0];

            if (error == null) {
                // Hide the input box after successful submission
                inputBoxContainer.style.display = 'none';
            }
            else {
                throw error;
            }
        } catch (error) {
            // Display the error message
            errorBox.textContent = "FATAL: " + error.message;
            errorBox.style.display = 'block';
            console.log(error);
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

//Returns true if we handled the input, false otherwise
function pasteHandler(e) {
    const content = window.clipboardData ? window.clipboardData.getData("Text") : (e.originalEvent || e).clipboardData.getData('text/plain');

    // this looks like multi-line input, check if it's from the bookmark window
    if (/[\r\n]/.test(content)) {
        const lines = content.split(/\r?\n/).map(line => line.split('\t'));
        
        // We only care if there are any possible WH bookmarks here, which always have the type "Coordinate" (as they are points in space)
        // Also we don't want to see bookmarks in other systems besides the currently active one (for now, at least).
        const filtered = lines.filter(
            line => line[1] == "Coordinate" && line[3] == viewingSystem
        );
        if (filtered.length == 0) {
            //console.log("not parsing multi-line paste");
            return false;
        }
        
        //console.log("parsing multi-line paste");
        e.preventDefault();
        parseMultiLinePaste(filtered)
        return true;
    }

    // ignore input if the focus is on a textarea
    // if ($(document.activeElement).is("textarea, input")) {
    //     return;
    // }

    // Check if it's a single bookmark paste
    let splitcontent = content.split('\t');
    if (splitcontent.length >= 4 && splitcontent[1] == "Coordinate" && splitcontent[3] == viewingSystem) {
        e.preventDefault();
        parseSingleLinePaste(splitcontent[0]);
        return true;
    }
    // Don't parse other tab-containing pastes to parse single-line sig pastes correctly
    else if (splitcontent.length > 1) {
        return false;
    }

    e.preventDefault();
    parseSingleLinePaste(content);
    return true;
}

function parseSingleLinePaste(content) {
    try {
        const parsedWh = fastmap.parse(content);
        let error = fastmap.addWormholes([parsedWh])[0];
        if (error == null) {
            // show success message using tripwire notification
            Notify.trigger("Fastmap: Added wormhole via paste.");
        }
        else {
            throw error;
        }
    } catch (error) {
        // show error message using tripwire notification
        Notify.trigger("Fastmap: " + error.message, "yellow", 5000);
    }
}

function parseMultiLinePaste(lines) {
    var validWhs = 0;
    var invalidWhs = 0;
    var parsedWhArray = [];
    lines.forEach(line => {
        const bmname = line[0]
        try {
            const parsedWh = fastmap.parse(bmname);
            parsedWhArray.push(parsedWh);
        } catch (error) {
            if (error instanceof peggy.SyntaxError) {
                // If it looks like it might be intended to be a WH (starts with a #), count the failure
                if (/^\s*#/.test(bmname)) {
                    invalidWhs++;
                    const errmsg = `Fastmap: Syntax error on "${bmname}": ${error.message}`;
                    Notify.trigger(errmsg, "yellow", 10000);
                    console.log(error);
                }
            }
        }
    });

    let errs = [];

    try {
        errs = fastmap.addWormholes(parsedWhArray);
    } catch (error) {
        Notify.trigger(`Fastmap: ${error.message}`, "yellow", 10000);
    }

    for (let i = 0; i < errs.length; i++) {
        let error = errs[i];
        if (error != null) {
                invalidWhs++;
                const errmsg = `Fastmap: Error adding "${parsedWhArray[i].origText}": ${error.message}`;
                Notify.trigger(errmsg, "yellow", 10000);
                console.log(error);
        }
        else {
            validWhs++;
        }
    }

    Notify.trigger(`Fastmap: Added ${validWhs} WHs, skipped ${invalidWhs} invalid WHs.`);
}

//Intercept Tripwire paste handler and replace it with our own
let twPaste = $._data($('#clipboard')[0], 'events').paste[0];
const origPasteHandler = twPaste.handler;
function injectedHandler(e) {
    if (!pasteHandler(e)) {
        origPasteHandler(e);
    }
}
twPaste.handler = injectedHandler;
