{
  var seenSize = false;
  var seenMass = false;
  var seenLife = false;
}

start
  = hole:hole _? comment:comment? {return hole.concat(comment);}

hole
  = first:first _ sig:sig _ third:third _ type:type {return [first, sig, third, type];}
  / first:first _ sig:sig _ type:type {return [first, sig, null, type];}

//this seemingly redundant name makes errors prettier
//by not expecting more than the minimum necessary whitespace
_ "\" \""
  = " "+

/*
FIRST PART: [chain][class][depth], e.g. A3C, K13B
*/
first = chain class depth

//Chain is always a single letter
chain "chain letter"
  = [a-z]i

//Class is any one of the known class identifiers,
//but possibly ambiguous identifiers must be followed by depth to be considered.
//(otherwise they could eat the depth)
class "class identifier"
  = ident:ambiguousIdent &depth { return ident }
  / unambiguousIdent

//Make sure these are longest first
unambiguousIdent
  = "12" / "13" / "14" / "15" / "16" / "17" / "18"
  / "1" / "2" / "3" / "4" / "5" / "6" / "H"i / "L"i / "N"i / "?"

ambiguousIdent
  = theraIdent
  / trigIdent

theraIdent
  = "Thera"i / "Th"i {return "Th";}

trigIdent
  = "Trig"i / "Tr"i {return "Tr";}

//Depth is usually a single letter, but this syntax extends
//to extra-long chains by allowing arbitrarily many letters
//using the Linux drive lettering format (sdaa follows sdz)
depth "depth"
  = $[a-z]i+

/*
SECOND PART: sig id, e.g. ABC, XYZ, LUX
The alphabet part of the sig ID
*/
sig "signature"
  = $[a-z]i|3|

/*
THIRD PART: size/mass/lifetime specifiers,
e.g. E (end-of-life), C (crit), H (half), F (frigate),
S (small, synonymous with frigate)
*/
third "size/mass/lifetime"
  = holeIdentifier+

holeIdentifier
  = ident:sizeIdentifier &{ if (!seenSize) { seenSize = true; return true; } else { return false; }} {return ident;}
  / ident:massIdentifier &{ if (!seenMass) { seenMass = true; return true; } else { return false; }} {return ident;}
  / ident:lifeIdentifier &{ if (!seenLife) { seenLife = true; return true; } else { return false; }} {return ident;}

sizeIdentifier
  = [fs]i { return "F"; }

massIdentifier
  = [hd]i { return "H"; }
  / "C"i

lifeIdentifier
  = "E"i

/*
FOURTH PART: type of the wormhole (C247, H900, K162, etc.)
For now instead of listing all valid types here, we expect
the format of a letter followed by three numbers.
Validity will be checked in script.
*/
type "wormhole type"
  = [a-z]i [0-9] [0-9] [0-9] {return text();}

/*
FIFTH PART: optional comment in parenthesis
*/
comment "parenthesized comment"
  = "(" commentContent ")" {return text();}

commentContent
  = [^)]* {return text();}
