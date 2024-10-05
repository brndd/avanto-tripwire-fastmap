// ==UserScript==
// @name        Avanto Fastmap
// @namespace   avanto
// @match       https://map.avanto.tk/*
// @require https://cdn.jsdelivr.net/npm/@violentmonkey/shortcut@1
// @grant       none
// @version     0.1
// @author      burneddi
// @description 24/06/2024, 20:09:54
// ==/UserScript==

class WormholeParser {
    wh = {
        name: null,
        chain: null,
        class: null,
        depth: null,
        sig: null,
        isFrig: null,
        remainingLife: null,
        remainingMass: null,
        type: null
    };

    errors = [];

    reset() {
        this.wh.name = null;
        this.wh.chain = null;
        this.wh.class = null;
        this.wh.depth = null;
        this.wh.sig = null;
        this.wh.isFrig = null;
        this.wh.remainingLife = null;
        this.wh.remainingMass = null;
        this.wh.type = null;
        this.errors = [];
    };

    whClasses = {
        "H": "High-Sec",
        "L": "Low-Sec",
        "N": "Null-Sec",
        "T": "Triglavian",
        "Tr": "Triglavian",
        "Th": "Thera",
        "1": "Class-1",
        "2": "Class-2",
        "3": "Class-3",
        "4": "Class-4",
        "5": "Class-5",
        "6": "Class-6",
        "13": "Class-13"
    };

    parse(text) {
        this.reset();
        let position = 0;
        let i;
        if (position >= text.length) return false;

        //Chain name
        let chain = text[position].toUpperCase();
        if (!RegExp(/^\p{L}/,'u').test(chain)) {
            this.errors.push({position: position, error: "Chain name must be a letter."});
        }
        else {
            this.wh.chain = chain;
            position++;
            if (position >= text.length) return false;
        }

        //Class
        i = position;
        let classes = Object.keys(this.whClasses);
        let classBuf = text[i];
        while (isPrefixOfSome(classBuf, classes)) {
            i++;
            if (i >= text.length) return false;
            classBuf += text[i];
        }
        classBuf = classBuf.slice(0, -1);
        if (classBuf == "") {
            this.errors.push({position: position, error: "No valid class found."});
        }
        else {
            this.wh.class = this.whClasses[classBuf];
            position = i;
        }

        //Depth
        let depth = text[position].toUpperCase();
        if (!RegExp(/^\p{L}/,'u').test(depth)) {
            this.errors.push({position: position, error: "Depth must be a letter."});
        }
        else {
            this.wh.depth = depth;
            position++;
            if (position >= text.length) return false;
        }

        //We should now be at a space
        if (text[position] != " ") {
            this.errors.push({position: position, error: `Expected space after depth, got ${text[position]}`});
            //Seek until we are at a space (or the string runs out)
            position = text.indexOf(" ", position);
            if (position == -1) {
                return false;
            }
        }

        //Seek until first non-space character
        i = position;
        while (text[i] == " ") {
            i++;
            if (i >= text.length) return false;
        }
        position = i;

        //Next 3 letters should be the sig
        let sig = text.slice(position, position + 3);
        if (sig.length != 3) {
            this.errors.push({position: position, error: "Signature must be three letters"});
            return false;
        }
        this.wh.sig = sig.toLowerCase(); //mapper wants this as lower case
        //We can now craft the name
        this.wh.name = (this.wh.chain + classBuf + this.wh.depth + " " + this.wh.sig.toUpperCase());
        position = position + 3;
        if (position >= text.length) return false;

        //We should now be at a space
        if (text[position] != " ") {
            this.errors.push({position: position, error: `Expected space after sig, got ${text[position]}`});
            //Seek until we are at a space (or the string runs out)
            position = text.indexOf(" ", position);
            if (position == -1) {
                return false;
            }
        }
        //Seek until first non-space character
        i = position;
        while (text[i] == " ") {
            i++;
            if (i >= text.length) return false;
        }
        position = i;

        //We now have up to two blocks remaining: the optional size/mass/life block, and the wormhole type block
        let blocks = text.slice(position).split(" ").filter((x) => x != "");
        this.wh.isFrig = false;
        this.wh.remainingLife = "stable";
        this.wh.remainingMass = "stable";
        //If there are two blocks, assume the first one is size/mass/life. Possible letters here: FECHD
        if (blocks.length > 1) {
            i = position;
            while (text[i] != " ") {
                let c = text[i].toUpperCase();
                if (c == "F") {
                    this.wh.isFrig = true;
                }
                else if (c == "E") {
                    this.wh.remainingLife = "critical";
                }
                else if (c == "C") {
                    this.wh.remainingMass = "critical";
                }
                else if (c == "H" || c == "D") {
                    this.wh.remainingMass = "destab";
                }
                else {
                    this.errors.push({position: i, error: `Invalid size/mass/life specifier ${c}`});
                }
                i++;
                if (i >= text.length) return false;
            }
            position = i;

            //We should now be at a space
            if (text[position] != " ") {
                this.errors.push({position: position, error: `Expected space after size/mass/life, got ${text[position]}`});
                //Seek until we are at a space (or the string runs out)
                position = text.indexOf(" ", position);
                if (position == -1) {
                    return false;
                }
            }
            //Seek until first non-space character
            i = position;
            while (text[i] == " ") {
                i++;
                if (i >= text.length) return false;
            }
            position = i;
        }

        //Parse the wh type
        let whType = text.slice(position, position + 4).toUpperCase();
        if (whType != "K162" && appData.wormholes[whType] == undefined) {
            this.errors.push({position: position, error: `Invalid WH type ${whType}`});
            this.wh.type = "????";
            return false;
        }
        this.wh.type = whType;

        return true;
    }
}


function isPrefixOfSome(str, arr) {
    return arr.filter((x) => x.startsWith(str)).length > 0;
}

//seeks str starting at i until c is encountered, returns position of c or -1 if not found
function seekUntil(str, c, i = 0) {
    let pos = i;
    while (str[pos] != c) {
        pos++;
        if (pos == str.length) {
            return -1;
        }
    }
    return pos;
}

VM.shortcut.register('a-n', () => {
    displayInputBox();
});

let fastmap = window.fastmap = {};

fastmap.wormholeParser = new WormholeParser();

fastmap.parseWormhole = function (whString) {
    whString = whString.toUpperCase();
    let blocks = whString.split(' ');

    let firstBlock = blocks[0];
    let chain = firstBlock.charAt(0);
    let classAndDepth = firstBlock.slice(1);
    let depth = classAndDepth.slice(-1);
    let wormholeClass = classAndDepth.slice(0, -1);
    switch (wormholeClass) {
        case "H":
            wormholeClass = "High-Sec";
            break;
        case "L":
            wormholeClass = "Low-Sec";
            break;
        case "N":
            wormholeClass = "Null-Sec";
            break;
        case "T":
            wormholeClass = "Triglavian";
            break;
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
        case "6":
        case "13":
            wormholeClass = "Class-" + wormholeClass;
            break;
        default:
            wormholeClass = "?";
            break;
    }

    let sig = blocks[1].toLowerCase();

    let thirdBlock = blocks[2];
    let isFrig = thirdBlock.includes('F') ? true : false;
    let remainingLife = thirdBlock.includes('E') ? 'critical' : 'stable';
    let remainingMass = thirdBlock.includes('C') ? 'critical' : (thirdBlock.includes('H') ? 'destab' : 'stable');

    let type = blocks[3];
    if (type != "K162" && appData.wormholes[type] == undefined) {
        type = "????"; //todo: show error for unrecognized type
    }

    return {
        name: blocks[0] + " " + blocks[1],
        chain: chain,
        class: wormholeClass,
        depth: depth,
        sig: sig,
        isFrig: isFrig,
        remainingLife: remainingLife,
        remainingMass: remainingMass,
        type: type
    };
}

fastmap.addWormhole = function (parsedWh) {
    let sourceID = viewingSystemID;

    //Figure out the other side
    let otherSide = "????";
    if (parsedWh.type.length > 0 && parsedWh.type != "K162" && parsedWh.type != null) {
        otherSide = "K162";
    }
    else if (parsedWh.type == "K162") {
        let eligibleTypes = wormholeAnalysis.eligibleWormholeTypes(sourceID, parsedWh.class);
        let isFrig = parsedWh.isFrig;
        if (isFrig) {
            otherSide = eligibleTypes.to.filter((c) => c.jump <= 5000000)[0].key;
        }
        else {
            otherSide = eligibleTypes.to.filter((c) => c.jump > 5000000)[0].key;
        }
    }

    //Figure out the full signature
    let sigs = Object.values(tripwire.signatures.currentSystem);
    let matchedSigs = sigs.filter((s) => s.signatureID.slice(0, 3) === parsedWh.sig);
    //TODO: disambiguate the rare edge case of multiple matches, error out if sig not found in system(?)
    let sigObj = {};
    let fullSig = "";
    if (matchedSigs.length) {
        sigObj = matchedSigs[0];
        fullSig = sigObj.signatureID;
    }
    else {
        throw new Error("no matching sig in system (paste your sig list here first)");
    }

    let maxLife = appData.wormholes[(parsedWh.type == "K162" ? otherSide : parsedWh.type)].life.substring(0, 2) * 60 * 60;

    //console.log(`This is a wormhole in the ${wh.chain} chain leading to ${wh.class} at depth ${wh.depth} with sig ID ${fullSig}. The other side's WH type is ${otherSide}. The max life is ${maxLife} seconds.`);

    //Add the actual sig to Tripwire

    let payload = {};
    let undo = [];
    let signature = {
        "id": sigObj.id,
        "signatureID": fullSig,
        "systemID": sourceID,
        "type": "wormhole",
        "name": parsedWh.name,
        "lifeLength": maxLife
    };
    let leadsTo = wormholeAnalysis.targetSystemID(parsedWh.class, parsedWh.type);

    let signature2 = {
        "id": "",
        "signatureID": "",
        "systemID": leadsTo,
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

    console.log("And this is where we would send the following payload:");
    console.log(payload);

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

// Create the input box
const inputBox = document.createElement('input');
inputBox.id = 'fastmap-inputbox';
inputBox.type = 'text';
inputBox.style.all = 'initial';
inputBox.style.width = '300px';
inputBox.style.fontSize = '16px';
inputBox.style.padding = '5px';
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

// Append the input box and error box to the container
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
            if (!fastmap.wormholeParser.parse(content)) {
                return;
            }
            fastmap.addWormhole(fastmap.wormholeParser.wh);

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
    let result = fastmap.wormholeParser.parse(inputBox.value);
    let errors = fastmap.wormholeParser.errors;
    if (!result && errors.length) {
        for (let i = 0; i < errors.length; i++) {
            let e = errors[i];
            if (i != 0) {
                errorBox.textContent += "\r\n";
            }
            errorBox.textContent += `col. ${e.position}: ${e.error}`;
        }
        errorBox.style.display = "block";
    }
}, 500));

