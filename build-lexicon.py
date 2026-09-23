#!/usr/bin/env python3
"""Build lexicon.txt, the one data file understory reads.

Three public datasets, merged into one line per word:

    word <TAB> pronunciation <TAB> concreteness <TAB> senses

  pronunciation  CMU Pronouncing Dictionary, first pronunciation only, each
                 ARPAbet phone packed into one character (table below; the
                 engine carries the same table). Vowels keep their stress.
  concreteness   Brysbaert, Warriner & Kuperman (2014), 1.0-5.0, stored x10.
                 1 = abstract ("pride"), 5 = something you can touch ("knife").
  senses         Lynott et al. (2020), the Lancaster Sensorimotor Norms,
                 folded into Pattison's seven senses, one digit each (0-9):
                 sight sound touch taste smell body motion.
                 body = interoceptive; motion = the strongest of the
                 foot/leg, hand/arm and torso action ratings.

Any field can be empty. A word is kept if a dataset rates it, if it is an
inflection of a rated word ("fingers" -> "finger"), or if it is a function
word the stress lane needs. Every other CMU word (names, places, rare
spellings: "zeus", "tennessee") goes to lexicon-extra.txt as word <TAB>
pronunciation, which the page loads after first paint; anything in neither
file the engine estimates from spelling.

Usage:
    python3 build-lexicon.py <cmudict.dict> <concreteness.txt> <lancaster.csv> [outdir]

Sources (fetched once, not committed):
    https://raw.githubusercontent.com/cmusphinx/cmudict/master/cmudict.dict
    https://raw.githubusercontent.com/ArtsEngine/concreteness/master/Concreteness_ratings_Brysbaert_et_al_BRM.txt
    https://osf.io/48wsc/  (Lancaster_sensorimotor_norms_for_39707_words.csv, CC BY 4.0)
"""
import csv
import re
import sys

VOWELS = ["AA", "AE", "AH", "AO", "AW", "AY", "EH", "ER", "EY", "IH", "IY", "OW", "OY", "UH", "UW"]
CONSONANTS = ["B", "CH", "D", "DH", "F", "G", "HH", "JH", "K", "L", "M", "N", "NG",
              "P", "R", "S", "SH", "T", "TH", "V", "W", "Y", "Z", "ZH"]
# 45 stressed vowels then 24 consonants, packed from '!' upward. The engine
# rebuilds this exact order, so append-only if it ever changes.
SYMBOLS = [v + s for v in VOWELS for s in "012"] + CONSONANTS
PACK = {sym: chr(33 + i) for i, sym in enumerate(SYMBOLS)}

# Words the stress lane and the voice tags need even when no norm rates them.
FUNCTION_WORDS = """
a an the and or but nor so yet for of to in on at by from with without into onto
upon out up down off over under about above below across after before behind
between beyond through throughout toward towards until till via within along
around against among i me my mine myself you your yours yourself yourselves he
him his himself she her hers herself it its itself we us our ours ourselves they
them their theirs themselves this that these those who whom whose which what
when where why how whoever whatever am is are was were be been being have has
had having do does did doing will would shall should can could may might must
ought not no nor never always ever just only very too also then than there here
if because though although while whether as like unless since once
i'm i've i'll i'd you're you've you'll you'd he's he'll he'd she's she'll she'd
it's it'll we're we've we'll we'd they're they've they'll they'd that's there's
what's who's where's how's let's don't doesn't didn't won't wouldn't can't
couldn't shouldn't isn't aren't wasn't weren't haven't hasn't hadn't ain't
gonna wanna gotta 'cause 'til o oh ah
""".split()

IRREGULAR = {
    "went": "go", "gone": "go", "saw": "see", "seen": "see", "left": "leave",
    "felt": "feel", "held": "hold", "thought": "think", "told": "tell",
    "took": "take", "taken": "take", "gave": "give", "given": "give",
    "broke": "break", "broken": "break", "came": "come", "fell": "fall",
    "fallen": "fall", "knew": "know", "known": "know", "made": "make",
    "said": "say", "slept": "sleep", "woke": "wake", "woken": "wake",
    "wore": "wear", "worn": "wear", "drove": "drive", "driven": "drive",
    "ran": "run", "sang": "sing", "sung": "sing", "sat": "sit", "stood": "stand",
    "found": "find", "lost": "lose", "kept": "keep", "bought": "buy",
    "brought": "bring", "caught": "catch", "taught": "teach", "fought": "fight",
    "hung": "hang", "hid": "hide", "hidden": "hide", "lay": "lie", "laid": "lay",
    "led": "lead", "meant": "mean", "met": "meet", "paid": "pay", "sold": "sell",
    "sent": "send", "shot": "shoot", "spoke": "speak", "spoken": "speak",
    "spent": "spend", "struck": "strike", "swam": "swim", "threw": "throw",
    "thrown": "throw", "understood": "understand", "wept": "weep", "won": "win",
    "wrote": "write", "written": "write", "men": "man", "women": "woman",
    "children": "child", "feet": "foot", "teeth": "tooth", "mice": "mouse",
    "geese": "goose", "lives": "life", "knives": "knife", "wives": "wife",
    "leaves": "leaf", "wolves": "wolf", "shelves": "shelf", "halves": "half",
    "began": "begin", "begun": "begin", "bit": "bite", "bitten": "bite",
    "blew": "blow", "blown": "blow", "built": "build", "burnt": "burn",
    "chose": "choose", "chosen": "choose", "dealt": "deal", "dug": "dig",
    "drew": "draw", "drawn": "draw", "drank": "drink", "drunk": "drink",
    "ate": "eat", "eaten": "eat", "fed": "feed", "fled": "flee", "flew": "fly",
    "flown": "fly", "forgot": "forget", "forgotten": "forget", "froze": "freeze",
    "frozen": "freeze", "got": "get", "gotten": "get", "grew": "grow",
    "grown": "grow", "heard": "hear", "hit": "hit", "hurt": "hurt",
    "knelt": "kneel", "lent": "lend", "lit": "light", "rode": "ride",
    "ridden": "ride", "rang": "ring", "rung": "ring", "rose": "rise",
    "risen": "rise", "sank": "sink", "sunk": "sink", "shook": "shake",
    "shaken": "shake", "shone": "shine", "shrank": "shrink", "slid": "slide",
    "spun": "spin", "stole": "steal", "stolen": "steal", "stuck": "stick",
    "stung": "sting", "swore": "swear", "sworn": "swear", "swept": "sweep",
    "swung": "swing", "tore": "tear", "torn": "tear", "wound": "wind",
    "wrung": "wring", "was": "be", "were": "be", "been": "be", "am": "be",
    "is": "be", "are": "be", "had": "have", "has": "have", "did": "do",
    "does": "do", "done": "do",
}


def lemma_candidates(w):
    """Every plausible dictionary form of an inflected word, best first.
    Mirrors lemmaCandidates() in engine.js; keep the two in step."""
    out = [w]
    if w in IRREGULAR:
        out.append(IRREGULAR[w])
    if w.endswith("'s"):
        out.append(w[:-2])
    if w.endswith("s'"):
        out.append(w[:-1])
    n = len(w)
    if n > 4 and w.endswith("ies"):
        out.append(w[:-3] + "y")
    if n > 4 and w.endswith("ves"):
        out += [w[:-3] + "f", w[:-3] + "fe"]
    if n > 3 and w.endswith("es"):
        out.append(w[:-2])
    if n > 3 and w.endswith("s") and not w.endswith("ss"):
        out.append(w[:-1])
    if n > 4 and w.endswith("ied"):
        out.append(w[:-3] + "y")
    if n > 3 and w.endswith("ed"):
        out += [w[:-2], w[:-1]]
        if n > 4 and w[-3] == w[-4]:
            out.append(w[:-3])
    if n > 4 and w.endswith("ing"):
        out += [w[:-3], w[:-3] + "e"]
        if n > 5 and w[-4] == w[-5]:
            out.append(w[:-4])
        if w.endswith("ying"):
            out.append(w[:-4] + "ie")
    if n > 3 and w.endswith("er"):
        out += [w[:-2], w[:-1]]
        if n > 4 and w[-3] == w[-4]:
            out.append(w[:-3])
    if n > 4 and w.endswith("est"):
        out += [w[:-3], w[:-2]]
        if n > 5 and w[-4] == w[-5]:
            out.append(w[:-4])
    if n > 4 and w.endswith("ily"):
        out.append(w[:-3] + "y")
    if n > 3 and w.endswith("ly"):
        out += [w[:-2], w[:-2] + "le"]
    seen, uniq = set(), []
    for c in out:
        if c and c not in seen:
            seen.add(c)
            uniq.append(c)
    return uniq


def load_cmu(path):
    prons = {}
    word_re = re.compile(r"^[a-z][a-z']*$")
    with open(path, encoding="utf-8", errors="ignore") as f:
        for line in f:
            line = line.split("#")[0].strip()
            if not line:
                continue
            parts = line.split()
            word = parts[0]
            if "(" in word:          # alternate pronunciations: keep the first
                continue
            if not word_re.match(word):
                continue
            phones = parts[1:]
            if not all(p in PACK for p in phones):
                continue
            prons[word] = "".join(PACK[p] for p in phones)
    return prons


def load_concreteness(path):
    conc = {}
    with open(path, encoding="utf-8", errors="ignore") as f:
        next(f)
        for line in f:
            cols = line.rstrip("\n").split("\t")
            if len(cols) < 3 or cols[1] != "0":   # single words only
                continue
            word = cols[0].strip().lower()
            if not re.match(r"^[a-z][a-z'-]*$", word):
                continue
            conc[word] = int(round(float(cols[2]) * 10))
    return conc


def load_senses(path):
    senses = {}

    def digit(x):
        return str(max(0, min(9, int(round(float(x) / 5 * 9)))))

    with open(path, encoding="utf-8", errors="ignore") as f:
        for r in csv.DictReader(f):
            word = r["Word"].strip().lower()
            if " " in word or not re.match(r"^[a-z][a-z'-]*$", word):
                continue
            motion = max(float(r["Foot_leg.mean"]), float(r["Hand_arm.mean"]), float(r["Torso.mean"]))
            senses[word] = "".join([
                digit(r["Visual.mean"]), digit(r["Auditory.mean"]), digit(r["Haptic.mean"]),
                digit(r["Gustatory.mean"]), digit(r["Olfactory.mean"]),
                digit(r["Interoceptive.mean"]), digit(motion),
            ])
    return senses


def main():
    if len(sys.argv) < 4:
        sys.exit(__doc__)
    cmu_path, conc_path, lanc_path = sys.argv[1:4]
    out_dir = sys.argv[4] if len(sys.argv) > 4 else "."
    out_path = f"{out_dir}/lexicon.txt"
    extra_path = f"{out_dir}/lexicon-extra.txt"

    prons = load_cmu(cmu_path)
    conc = load_concreteness(conc_path)
    senses = load_senses(lanc_path)
    rated = set(conc) | set(senses)
    function = set(FUNCTION_WORDS)

    keep = set(rated) | (function & set(prons))
    for w in prons:
        if w in keep:
            continue
        if any(c in rated for c in lemma_candidates(w)[1:]):
            keep.add(w)

    rows = []
    for w in sorted(keep):
        p = prons.get(w, "")
        c = str(conc[w]) if w in conc else ""
        s = senses.get(w, "")
        if not (p or c or s):
            continue
        rows.append(f"{w}\t{p}\t{c}\t{s}")

    header = "#understory-lexicon v1\t" + " ".join(SYMBOLS)
    with open(out_path, "w", encoding="utf-8", newline="\n") as f:
        f.write(header + "\n")
        f.write("\n".join(rows) + "\n")

    extra = [f"{w}\t{prons[w]}" for w in sorted(prons) if w not in keep]
    with open(extra_path, "w", encoding="utf-8", newline="\n") as f:
        f.write("#understory-lexicon-extra v1\n")
        f.write("\n".join(extra) + "\n")

    with_p = sum(1 for r in rows if r.split("\t")[1])
    print(f"{len(rows)} words -> {out_path} "
          f"({with_p} pronounced, {len(conc)} concreteness, {len(senses)} senses)")
    print(f"{len(extra)} more pronunciations -> {extra_path}")


if __name__ == "__main__":
    main()
