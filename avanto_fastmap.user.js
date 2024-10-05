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

// @generated by Peggy 4.1.1.
//
// https://peggyjs.org/
(function(root) {
  "use strict";

function peg$subclass(child, parent) {
  function C() { this.constructor = child; }
  C.prototype = parent.prototype;
  child.prototype = new C();
}

function peg$SyntaxError(message, expected, found, location) {
  var self = Error.call(this, message);
  // istanbul ignore next Check is a necessary evil to support older environments
  if (Object.setPrototypeOf) {
    Object.setPrototypeOf(self, peg$SyntaxError.prototype);
  }
  self.expected = expected;
  self.found = found;
  self.location = location;
  self.name = "SyntaxError";
  return self;
}

peg$subclass(peg$SyntaxError, Error);

function peg$padEnd(str, targetLength, padString) {
  padString = padString || " ";
  if (str.length > targetLength) { return str; }
  targetLength -= str.length;
  padString += padString.repeat(targetLength);
  return str + padString.slice(0, targetLength);
}

peg$SyntaxError.prototype.format = function(sources) {
  var str = "Error: " + this.message;
  if (this.location) {
    var src = null;
    var k;
    for (k = 0; k < sources.length; k++) {
      if (sources[k].source === this.location.source) {
        src = sources[k].text.split(/\r\n|\n|\r/g);
        break;
      }
    }
    var s = this.location.start;
    var offset_s = (this.location.source && (typeof this.location.source.offset === "function"))
      ? this.location.source.offset(s)
      : s;
    var loc = this.location.source + ":" + offset_s.line + ":" + offset_s.column;
    if (src) {
      var e = this.location.end;
      var filler = peg$padEnd("", offset_s.line.toString().length, ' ');
      var line = src[s.line - 1];
      var last = s.line === e.line ? e.column : line.length + 1;
      var hatLen = (last - s.column) || 1;
      str += "\n --> " + loc + "\n"
          + filler + " |\n"
          + offset_s.line + " | " + line + "\n"
          + filler + " | " + peg$padEnd("", s.column - 1, ' ')
          + peg$padEnd("", hatLen, "^");
    } else {
      str += "\n at " + loc;
    }
  }
  return str;
};

peg$SyntaxError.buildMessage = function(expected, found) {
  var DESCRIBE_EXPECTATION_FNS = {
    literal: function(expectation) {
      return "\"" + literalEscape(expectation.text) + "\"";
    },

    class: function(expectation) {
      var escapedParts = expectation.parts.map(function(part) {
        return Array.isArray(part)
          ? classEscape(part[0]) + "-" + classEscape(part[1])
          : classEscape(part);
      });

      return "[" + (expectation.inverted ? "^" : "") + escapedParts.join("") + "]";
    },

    any: function() {
      return "any character";
    },

    end: function() {
      return "end of input";
    },

    other: function(expectation) {
      return expectation.description;
    }
  };

  function hex(ch) {
    return ch.charCodeAt(0).toString(16).toUpperCase();
  }

  function literalEscape(s) {
    return s
      .replace(/\\/g, "\\\\")
      .replace(/"/g,  "\\\"")
      .replace(/\0/g, "\\0")
      .replace(/\t/g, "\\t")
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/[\x00-\x0F]/g,          function(ch) { return "\\x0" + hex(ch); })
      .replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) { return "\\x"  + hex(ch); });
  }

  function classEscape(s) {
    return s
      .replace(/\\/g, "\\\\")
      .replace(/\]/g, "\\]")
      .replace(/\^/g, "\\^")
      .replace(/-/g,  "\\-")
      .replace(/\0/g, "\\0")
      .replace(/\t/g, "\\t")
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/[\x00-\x0F]/g,          function(ch) { return "\\x0" + hex(ch); })
      .replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) { return "\\x"  + hex(ch); });
  }

  function describeExpectation(expectation) {
    return DESCRIBE_EXPECTATION_FNS[expectation.type](expectation);
  }

  function describeExpected(expected) {
    var descriptions = expected.map(describeExpectation);
    var i, j;

    descriptions.sort();

    if (descriptions.length > 0) {
      for (i = 1, j = 1; i < descriptions.length; i++) {
        if (descriptions[i - 1] !== descriptions[i]) {
          descriptions[j] = descriptions[i];
          j++;
        }
      }
      descriptions.length = j;
    }

    switch (descriptions.length) {
      case 1:
        return descriptions[0];

      case 2:
        return descriptions[0] + " or " + descriptions[1];

      default:
        return descriptions.slice(0, -1).join(", ")
          + ", or "
          + descriptions[descriptions.length - 1];
    }
  }

  function describeFound(found) {
    return found ? "\"" + literalEscape(found) + "\"" : "end of input";
  }

  return "Expected " + describeExpected(expected) + " but " + describeFound(found) + " found.";
};

function peg$parse(input, options) {
  options = options !== undefined ? options : {};

  var peg$FAILED = {};
  var peg$source = options.grammarSource;

  var peg$startRuleFunctions = { start: peg$parsestart };
  var peg$startRuleFunction = peg$parsestart;

  var peg$c0 = " ";
  var peg$c1 = "12";
  var peg$c2 = "13";
  var peg$c3 = "14";
  var peg$c4 = "15";
  var peg$c5 = "16";
  var peg$c6 = "17";
  var peg$c7 = "18";
  var peg$c8 = "?";
  var peg$c9 = "thera";
  var peg$c10 = "th";
  var peg$c11 = "trig";
  var peg$c12 = "tr";
  var peg$c13 = "c";
  var peg$c14 = "e";
  var peg$c15 = "(";
  var peg$c16 = ")";

  var peg$r0 = /^[a-z]/i;
  var peg$r1 = /^[1-6]/;
  var peg$r2 = /^[HLN]/i;
  var peg$r3 = /^[fs]/i;
  var peg$r4 = /^[hd]/i;
  var peg$r5 = /^[0-9]/;
  var peg$r6 = /^[^)]/;

  var peg$e0 = peg$otherExpectation("\" \"");
  var peg$e1 = peg$literalExpectation(" ", false);
  var peg$e2 = peg$otherExpectation("chain letter");
  var peg$e3 = peg$classExpectation([["a", "z"]], false, true);
  var peg$e4 = peg$otherExpectation("class identifier");
  var peg$e5 = peg$literalExpectation("12", false);
  var peg$e6 = peg$literalExpectation("13", false);
  var peg$e7 = peg$literalExpectation("14", false);
  var peg$e8 = peg$literalExpectation("15", false);
  var peg$e9 = peg$literalExpectation("16", false);
  var peg$e10 = peg$literalExpectation("17", false);
  var peg$e11 = peg$literalExpectation("18", false);
  var peg$e12 = peg$classExpectation([["1", "6"]], false, false);
  var peg$e13 = peg$classExpectation(["H", "L", "N"], false, true);
  var peg$e14 = peg$literalExpectation("?", false);
  var peg$e15 = peg$literalExpectation("Thera", true);
  var peg$e16 = peg$literalExpectation("Th", true);
  var peg$e17 = peg$literalExpectation("Trig", true);
  var peg$e18 = peg$literalExpectation("Tr", true);
  var peg$e19 = peg$otherExpectation("depth");
  var peg$e20 = peg$otherExpectation("signature");
  var peg$e21 = peg$otherExpectation("size/mass/lifetime");
  var peg$e22 = peg$classExpectation(["f", "s"], false, true);
  var peg$e23 = peg$classExpectation(["h", "d"], false, true);
  var peg$e24 = peg$literalExpectation("C", true);
  var peg$e25 = peg$literalExpectation("E", true);
  var peg$e26 = peg$otherExpectation("wormhole type");
  var peg$e27 = peg$classExpectation([["0", "9"]], false, false);
  var peg$e28 = peg$otherExpectation("parenthesized comment");
  var peg$e29 = peg$literalExpectation("(", false);
  var peg$e30 = peg$literalExpectation(")", false);
  var peg$e31 = peg$classExpectation([")"], true, false);

  var peg$f0 = function(hole, comment) {return hole.concat(comment);};
  var peg$f1 = function(first, sig, third, type) {return [first, sig, third, type];};
  var peg$f2 = function(first, sig, type) {return [first, sig, null, type];};
  var peg$f3 = function(ident) { return ident };
  var peg$f4 = function() {return "Th";};
  var peg$f5 = function() {return "Tr";};
  var peg$f6 = function(ident) { if (!seenSize) { seenSize = true; return true; } else { return false; }};
  var peg$f7 = function(ident) {return ident;};
  var peg$f8 = function(ident) { if (!seenMass) { seenMass = true; return true; } else { return false; }};
  var peg$f9 = function(ident) {return ident;};
  var peg$f10 = function(ident) { if (!seenLife) { seenLife = true; return true; } else { return false; }};
  var peg$f11 = function(ident) {return ident;};
  var peg$f12 = function() { return "F"; };
  var peg$f13 = function() { return "H"; };
  var peg$f14 = function() {return text();};
  var peg$f15 = function() {return text();};
  var peg$f16 = function() {return text();};
  var peg$currPos = options.peg$currPos | 0;
  var peg$savedPos = peg$currPos;
  var peg$posDetailsCache = [{ line: 1, column: 1 }];
  var peg$maxFailPos = peg$currPos;
  var peg$maxFailExpected = options.peg$maxFailExpected || [];
  var peg$silentFails = options.peg$silentFails | 0;

  var peg$result;

  if (options.startRule) {
    if (!(options.startRule in peg$startRuleFunctions)) {
      throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
    }

    peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
  }

  function text() {
    return input.substring(peg$savedPos, peg$currPos);
  }

  function offset() {
    return peg$savedPos;
  }

  function range() {
    return {
      source: peg$source,
      start: peg$savedPos,
      end: peg$currPos
    };
  }

  function location() {
    return peg$computeLocation(peg$savedPos, peg$currPos);
  }

  function expected(description, location) {
    location = location !== undefined
      ? location
      : peg$computeLocation(peg$savedPos, peg$currPos);

    throw peg$buildStructuredError(
      [peg$otherExpectation(description)],
      input.substring(peg$savedPos, peg$currPos),
      location
    );
  }

  function error(message, location) {
    location = location !== undefined
      ? location
      : peg$computeLocation(peg$savedPos, peg$currPos);

    throw peg$buildSimpleError(message, location);
  }

  function peg$literalExpectation(text, ignoreCase) {
    return { type: "literal", text: text, ignoreCase: ignoreCase };
  }

  function peg$classExpectation(parts, inverted, ignoreCase) {
    return { type: "class", parts: parts, inverted: inverted, ignoreCase: ignoreCase };
  }

  function peg$anyExpectation() {
    return { type: "any" };
  }

  function peg$endExpectation() {
    return { type: "end" };
  }

  function peg$otherExpectation(description) {
    return { type: "other", description: description };
  }

  function peg$computePosDetails(pos) {
    var details = peg$posDetailsCache[pos];
    var p;

    if (details) {
      return details;
    } else {
      if (pos >= peg$posDetailsCache.length) {
        p = peg$posDetailsCache.length - 1;
      } else {
        p = pos;
        while (!peg$posDetailsCache[--p]) {}
      }

      details = peg$posDetailsCache[p];
      details = {
        line: details.line,
        column: details.column
      };

      while (p < pos) {
        if (input.charCodeAt(p) === 10) {
          details.line++;
          details.column = 1;
        } else {
          details.column++;
        }

        p++;
      }

      peg$posDetailsCache[pos] = details;

      return details;
    }
  }

  function peg$computeLocation(startPos, endPos, offset) {
    var startPosDetails = peg$computePosDetails(startPos);
    var endPosDetails = peg$computePosDetails(endPos);

    var res = {
      source: peg$source,
      start: {
        offset: startPos,
        line: startPosDetails.line,
        column: startPosDetails.column
      },
      end: {
        offset: endPos,
        line: endPosDetails.line,
        column: endPosDetails.column
      }
    };
    if (offset && peg$source && (typeof peg$source.offset === "function")) {
      res.start = peg$source.offset(res.start);
      res.end = peg$source.offset(res.end);
    }
    return res;
  }

  function peg$fail(expected) {
    if (peg$currPos < peg$maxFailPos) { return; }

    if (peg$currPos > peg$maxFailPos) {
      peg$maxFailPos = peg$currPos;
      peg$maxFailExpected = [];
    }

    peg$maxFailExpected.push(expected);
  }

  function peg$buildSimpleError(message, location) {
    return new peg$SyntaxError(message, null, null, location);
  }

  function peg$buildStructuredError(expected, found, location) {
    return new peg$SyntaxError(
      peg$SyntaxError.buildMessage(expected, found),
      expected,
      found,
      location
    );
  }

  function peg$parsestart() {
    var s0, s1, s2, s3;

    s0 = peg$currPos;
    s1 = peg$parsehole();
    if (s1 !== peg$FAILED) {
      s2 = peg$parse_();
      if (s2 === peg$FAILED) {
        s2 = null;
      }
      s3 = peg$parsecomment();
      if (s3 === peg$FAILED) {
        s3 = null;
      }
      peg$savedPos = s0;
      s0 = peg$f0(s1, s3);
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parsehole() {
    var s0, s1, s2, s3, s4, s5, s6, s7;

    s0 = peg$currPos;
    s1 = peg$parsefirst();
    if (s1 !== peg$FAILED) {
      s2 = peg$parse_();
      if (s2 !== peg$FAILED) {
        s3 = peg$parsesig();
        if (s3 !== peg$FAILED) {
          s4 = peg$parse_();
          if (s4 !== peg$FAILED) {
            s5 = peg$parsethird();
            if (s5 !== peg$FAILED) {
              s6 = peg$parse_();
              if (s6 !== peg$FAILED) {
                s7 = peg$parsetype();
                if (s7 !== peg$FAILED) {
                  peg$savedPos = s0;
                  s0 = peg$f1(s1, s3, s5, s7);
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      s1 = peg$parsefirst();
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          s3 = peg$parsesig();
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_();
            if (s4 !== peg$FAILED) {
              s5 = peg$parsetype();
              if (s5 !== peg$FAILED) {
                peg$savedPos = s0;
                s0 = peg$f2(s1, s3, s5);
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    }

    return s0;
  }

  function peg$parse_() {
    var s0, s1;

    peg$silentFails++;
    s0 = [];
    if (input.charCodeAt(peg$currPos) === 32) {
      s1 = peg$c0;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e1); }
    }
    if (s1 !== peg$FAILED) {
      while (s1 !== peg$FAILED) {
        s0.push(s1);
        if (input.charCodeAt(peg$currPos) === 32) {
          s1 = peg$c0;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e1); }
        }
      }
    } else {
      s0 = peg$FAILED;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e0); }
    }

    return s0;
  }

  function peg$parsefirst() {
    var s0, s1, s2, s3;

    s0 = peg$currPos;
    s1 = peg$parsechain();
    if (s1 !== peg$FAILED) {
      s2 = peg$parseclass();
      if (s2 !== peg$FAILED) {
        s3 = peg$parsedepth();
        if (s3 !== peg$FAILED) {
          s1 = [s1, s2, s3];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parsechain() {
    var s0, s1;

    peg$silentFails++;
    s0 = input.charAt(peg$currPos);
    if (peg$r0.test(s0)) {
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e3); }
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e2); }
    }

    return s0;
  }

  function peg$parseclass() {
    var s0, s1, s2, s3;

    peg$silentFails++;
    s0 = peg$currPos;
    s1 = peg$parseambiguousIdent();
    if (s1 !== peg$FAILED) {
      s2 = peg$currPos;
      peg$silentFails++;
      s3 = peg$parsedepth();
      peg$silentFails--;
      if (s3 !== peg$FAILED) {
        peg$currPos = s2;
        s2 = undefined;
      } else {
        s2 = peg$FAILED;
      }
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s0 = peg$f3(s1);
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$parseunambiguousIdent();
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e4); }
    }

    return s0;
  }

  function peg$parseunambiguousIdent() {
    var s0;

    if (input.substr(peg$currPos, 2) === peg$c1) {
      s0 = peg$c1;
      peg$currPos += 2;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e5); }
    }
    if (s0 === peg$FAILED) {
      if (input.substr(peg$currPos, 2) === peg$c2) {
        s0 = peg$c2;
        peg$currPos += 2;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e6); }
      }
      if (s0 === peg$FAILED) {
        if (input.substr(peg$currPos, 2) === peg$c3) {
          s0 = peg$c3;
          peg$currPos += 2;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e7); }
        }
        if (s0 === peg$FAILED) {
          if (input.substr(peg$currPos, 2) === peg$c4) {
            s0 = peg$c4;
            peg$currPos += 2;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$e8); }
          }
          if (s0 === peg$FAILED) {
            if (input.substr(peg$currPos, 2) === peg$c5) {
              s0 = peg$c5;
              peg$currPos += 2;
            } else {
              s0 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$e9); }
            }
            if (s0 === peg$FAILED) {
              if (input.substr(peg$currPos, 2) === peg$c6) {
                s0 = peg$c6;
                peg$currPos += 2;
              } else {
                s0 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$e10); }
              }
              if (s0 === peg$FAILED) {
                if (input.substr(peg$currPos, 2) === peg$c7) {
                  s0 = peg$c7;
                  peg$currPos += 2;
                } else {
                  s0 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$e11); }
                }
                if (s0 === peg$FAILED) {
                  s0 = input.charAt(peg$currPos);
                  if (peg$r1.test(s0)) {
                    peg$currPos++;
                  } else {
                    s0 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$e12); }
                  }
                  if (s0 === peg$FAILED) {
                    s0 = input.charAt(peg$currPos);
                    if (peg$r2.test(s0)) {
                      peg$currPos++;
                    } else {
                      s0 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$e13); }
                    }
                    if (s0 === peg$FAILED) {
                      if (input.charCodeAt(peg$currPos) === 63) {
                        s0 = peg$c8;
                        peg$currPos++;
                      } else {
                        s0 = peg$FAILED;
                        if (peg$silentFails === 0) { peg$fail(peg$e14); }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    return s0;
  }

  function peg$parseambiguousIdent() {
    var s0;

    s0 = peg$parsetheraIdent();
    if (s0 === peg$FAILED) {
      s0 = peg$parsetrigIdent();
    }

    return s0;
  }

  function peg$parsetheraIdent() {
    var s0, s1;

    s0 = input.substr(peg$currPos, 5);
    if (s0.toLowerCase() === peg$c9) {
      peg$currPos += 5;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e15); }
    }
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      s1 = input.substr(peg$currPos, 2);
      if (s1.toLowerCase() === peg$c10) {
        peg$currPos += 2;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e16); }
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$f4();
      }
      s0 = s1;
    }

    return s0;
  }

  function peg$parsetrigIdent() {
    var s0, s1;

    s0 = input.substr(peg$currPos, 4);
    if (s0.toLowerCase() === peg$c11) {
      peg$currPos += 4;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e17); }
    }
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      s1 = input.substr(peg$currPos, 2);
      if (s1.toLowerCase() === peg$c12) {
        peg$currPos += 2;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e18); }
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$f5();
      }
      s0 = s1;
    }

    return s0;
  }

  function peg$parsedepth() {
    var s0, s1, s2;

    peg$silentFails++;
    s0 = peg$currPos;
    s1 = [];
    s2 = input.charAt(peg$currPos);
    if (peg$r0.test(s2)) {
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e3); }
    }
    if (s2 !== peg$FAILED) {
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        s2 = input.charAt(peg$currPos);
        if (peg$r0.test(s2)) {
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e3); }
        }
      }
    } else {
      s1 = peg$FAILED;
    }
    if (s1 !== peg$FAILED) {
      s0 = input.substring(s0, peg$currPos);
    } else {
      s0 = s1;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e19); }
    }

    return s0;
  }

  function peg$parsesig() {
    var s0, s1, s2, s3;

    peg$silentFails++;
    s0 = peg$currPos;
    s1 = peg$currPos;
    s2 = [];
    s3 = input.charAt(peg$currPos);
    if (peg$r0.test(s3)) {
      peg$currPos++;
    } else {
      s3 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e3); }
    }
    while (s3 !== peg$FAILED) {
      s2.push(s3);
      if (s2.length >= 3) {
        s3 = peg$FAILED;
      } else {
        s3 = input.charAt(peg$currPos);
        if (peg$r0.test(s3)) {
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e3); }
        }
      }
    }
    if (s2.length < 3) {
      peg$currPos = s1;
      s1 = peg$FAILED;
    } else {
      s1 = s2;
    }
    if (s1 !== peg$FAILED) {
      s0 = input.substring(s0, peg$currPos);
    } else {
      s0 = s1;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e20); }
    }

    return s0;
  }

  function peg$parsethird() {
    var s0, s1;

    peg$silentFails++;
    s0 = [];
    s1 = peg$parseholeIdentifier();
    if (s1 !== peg$FAILED) {
      while (s1 !== peg$FAILED) {
        s0.push(s1);
        s1 = peg$parseholeIdentifier();
      }
    } else {
      s0 = peg$FAILED;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e21); }
    }

    return s0;
  }

  function peg$parseholeIdentifier() {
    var s0, s1, s2;

    s0 = peg$currPos;
    s1 = peg$parsesizeIdentifier();
    if (s1 !== peg$FAILED) {
      peg$savedPos = peg$currPos;
      s2 = peg$f6(s1);
      if (s2) {
        s2 = undefined;
      } else {
        s2 = peg$FAILED;
      }
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s0 = peg$f7(s1);
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      s1 = peg$parsemassIdentifier();
      if (s1 !== peg$FAILED) {
        peg$savedPos = peg$currPos;
        s2 = peg$f8(s1);
        if (s2) {
          s2 = undefined;
        } else {
          s2 = peg$FAILED;
        }
        if (s2 !== peg$FAILED) {
          peg$savedPos = s0;
          s0 = peg$f9(s1);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parselifeIdentifier();
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f10(s1);
          if (s2) {
            s2 = undefined;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f11(s1);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      }
    }

    return s0;
  }

  function peg$parsesizeIdentifier() {
    var s0, s1;

    s0 = peg$currPos;
    s1 = input.charAt(peg$currPos);
    if (peg$r3.test(s1)) {
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e22); }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$f12();
    }
    s0 = s1;

    return s0;
  }

  function peg$parsemassIdentifier() {
    var s0, s1;

    s0 = peg$currPos;
    s1 = input.charAt(peg$currPos);
    if (peg$r4.test(s1)) {
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e23); }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$f13();
    }
    s0 = s1;
    if (s0 === peg$FAILED) {
      s0 = input.charAt(peg$currPos);
      if (s0.toLowerCase() === peg$c13) {
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e24); }
      }
    }

    return s0;
  }

  function peg$parselifeIdentifier() {
    var s0;

    s0 = input.charAt(peg$currPos);
    if (s0.toLowerCase() === peg$c14) {
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e25); }
    }

    return s0;
  }

  function peg$parsetype() {
    var s0, s1, s2, s3, s4;

    peg$silentFails++;
    s0 = peg$currPos;
    s1 = input.charAt(peg$currPos);
    if (peg$r0.test(s1)) {
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e3); }
    }
    if (s1 !== peg$FAILED) {
      s2 = input.charAt(peg$currPos);
      if (peg$r5.test(s2)) {
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e27); }
      }
      if (s2 !== peg$FAILED) {
        s3 = input.charAt(peg$currPos);
        if (peg$r5.test(s3)) {
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e27); }
        }
        if (s3 !== peg$FAILED) {
          s4 = input.charAt(peg$currPos);
          if (peg$r5.test(s4)) {
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$e27); }
          }
          if (s4 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f14();
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e26); }
    }

    return s0;
  }

  function peg$parsecomment() {
    var s0, s1, s2, s3;

    peg$silentFails++;
    s0 = peg$currPos;
    if (input.charCodeAt(peg$currPos) === 40) {
      s1 = peg$c15;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e29); }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parsecommentContent();
      if (input.charCodeAt(peg$currPos) === 41) {
        s3 = peg$c16;
        peg$currPos++;
      } else {
        s3 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e30); }
      }
      if (s3 !== peg$FAILED) {
        peg$savedPos = s0;
        s0 = peg$f15();
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e28); }
    }

    return s0;
  }

  function peg$parsecommentContent() {
    var s0, s1, s2;

    s0 = peg$currPos;
    s1 = [];
    s2 = input.charAt(peg$currPos);
    if (peg$r6.test(s2)) {
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e31); }
    }
    while (s2 !== peg$FAILED) {
      s1.push(s2);
      s2 = input.charAt(peg$currPos);
      if (peg$r6.test(s2)) {
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e31); }
      }
    }
    peg$savedPos = s0;
    s1 = peg$f16();
    s0 = s1;

    return s0;
  }


  var seenSize = false;
  var seenMass = false;
  var seenLife = false;

  peg$result = peg$startRuleFunction();

  if (options.peg$library) {
    return /** @type {any} */ ({
      peg$result,
      peg$currPos,
      peg$FAILED,
      peg$maxFailExpected,
      peg$maxFailPos
    });
  }
  if (peg$result !== peg$FAILED && peg$currPos === input.length) {
    return peg$result;
  } else {
    if (peg$result !== peg$FAILED && peg$currPos < input.length) {
      peg$fail(peg$endExpectation());
    }

    throw peg$buildStructuredError(
      peg$maxFailExpected,
      peg$maxFailPos < input.length ? input.charAt(peg$maxFailPos) : null,
      peg$maxFailPos < input.length
        ? peg$computeLocation(peg$maxFailPos, peg$maxFailPos + 1)
        : peg$computeLocation(peg$maxFailPos, peg$maxFailPos)
    );
  }
}

  root.peggy = {
    StartRules: ["start"],
    SyntaxError: peg$SyntaxError,
    parse: peg$parse
  };
})(this);
