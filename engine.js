/* understory engine: the analysis half, no DOM.
 *
 * Everything here answers one question about words a person wrote: what is
 * under them? Stress, rhyme, how high a line floats (concreteness), which
 * senses it touches, who is talking to whom, which lines come back, and
 * whether the one sentence the song is not supposed to say has surfaced.
 *
 * It never writes a word. Every number it returns carries its receipt: the
 * words, phones and ratings it came from, so the page can show its work.
 *
 * Data: lexicon.txt (see build-lexicon.py for the format and sources).
 * Works in the browser (window.UnderstoryEngine) and in node (globalThis).
 */
(function (root) {
  'use strict';

  // ---------------------------------------------------------------- phones
  const VOWELS = ['AA', 'AE', 'AH', 'AO', 'AW', 'AY', 'EH', 'ER', 'EY', 'IH', 'IY', 'OW', 'OY', 'UH', 'UW'];
  const CONSONANTS = ['B', 'CH', 'D', 'DH', 'F', 'G', 'HH', 'JH', 'K', 'L', 'M', 'N', 'NG',
    'P', 'R', 'S', 'SH', 'T', 'TH', 'V', 'W', 'Y', 'Z', 'ZH'];
  const SYMBOLS = [];
  for (const v of VOWELS) for (const s of '012') SYMBOLS.push(v + s);
  SYMBOLS.push(...CONSONANTS);
  const UNPACK = new Map(SYMBOLS.map((s, i) => [String.fromCharCode(33 + i), s]));

  const isVowel = (p) => p.length === 3 || VOWELS.includes(p);
  const baseOf = (p) => (p.length === 3 ? p.slice(0, 2) : p);
  const stressOf = (p) => (p.length === 3 ? +p[2] : -1);

  // Pattison's consonant families: sounds made the same way, which is why
  // "rub" and "dug" rhyme softly while "love" and "touch" only share a vowel.
  const FAMILY = {
    B: 'plosive', D: 'plosive', G: 'plosive', P: 'plosive', T: 'plosive', K: 'plosive',
    V: 'fricative', DH: 'fricative', Z: 'fricative', ZH: 'fricative',
    F: 'fricative', TH: 'fricative', S: 'fricative', SH: 'fricative',
    CH: 'affricate', JH: 'affricate',
    M: 'nasal', N: 'nasal', NG: 'nasal',
  };
  const VOICED_END = new Set(['B', 'D', 'G', 'V', 'DH', 'Z', 'ZH', 'JH', 'M', 'N', 'NG', 'L', 'R', 'W', 'Y']);
  const SIBILANT = new Set(['S', 'Z', 'SH', 'ZH', 'CH', 'JH']);

  // How a vowel sounds, for receipts: the keyword a person already knows.
  const VOWEL_AS = {
    AA: ['ah', 'father'], AE: ['a', 'cat'], AH: ['u', 'cup'], AO: ['aw', 'thought'],
    AW: ['ow', 'cow'], AY: ['i', 'ride'], EH: ['e', 'bed'], ER: ['ur', 'bird'],
    EY: ['ay', 'say'], IH: ['i', 'sit'], IY: ['ee', 'see'], OW: ['o', 'go'],
    OY: ['oy', 'boy'], UH: ['oo', 'book'], UW: ['oo', 'food'],
  };
  const RESPELL = {
    AA: 'ah', AE: 'a', AH: 'uh', AO: 'aw', AW: 'ow', AY: 'eye', EH: 'e', ER: 'ur', EY: 'ay',
    IH: 'i', IY: 'ee', OW: 'oh', OY: 'oy', UH: 'uu', UW: 'oo',
    B: 'b', CH: 'ch', D: 'd', DH: 'th', F: 'f', G: 'g', HH: 'h', JH: 'j', K: 'k', L: 'l',
    M: 'm', N: 'n', NG: 'ng', P: 'p', R: 'r', S: 's', SH: 'sh', T: 't', TH: 'th', V: 'v',
    W: 'w', Y: 'y', Z: 'z', ZH: 'zh',
  };

  // Pattison's seven senses, in the order lexicon.txt stores them.
  const SENSES = ['sight', 'sound', 'touch', 'taste', 'smell', 'body', 'motion'];

  // ----------------------------------------------------------------- words
  const FUNCTION_WORDS = new Set(`a an the and or but nor so yet for of to in on at by from with
    without into onto upon out up down off over under about above below across after before
    behind between beyond through toward towards until till via within along around against
    among i me my mine myself you your yours yourself yourselves he him his himself she her hers
    herself it its itself we us our ours ourselves they them their theirs themselves this that
    these those who whom whose which what when where why how am is are was were be been being
    have has had having do does did can could may might must shall should will would ought
    just than then there here if because though although while whether as like unless since once
    i'm i've i'll i'd you're you've you'll you'd he's he'll he'd she's she'll she'd it's it'll
    we're we've we'll we'd they're they've they'll they'd that's there's what's who's where's
    how's let's gonna wanna gotta 'cause 'til o oh ah ya y'all em 'em`.split(/\s+/));
  // Negatives and a few adverbs carry stress in speech; they stay content.
  // Too common to mean anything when counting what a writer keeps returning to.
  const TOO_COMMON = new Set(`be have do get go make know think say see come take want look like
    thing things way one ones really very still even back well yeah yes no not never always
    something nothing anything everything someone anyone everyone some any every all more most
    much many little own same other another now then again ever too also only just gonna got
    let put tell give lot bit kind sort maybe`.split(/\s+/));

  const IRREGULAR = {
    went: 'go', gone: 'go', saw: 'see', seen: 'see', left: 'leave', felt: 'feel', held: 'hold',
    thought: 'think', told: 'tell', took: 'take', taken: 'take', gave: 'give', given: 'give',
    broke: 'break', broken: 'break', came: 'come', fell: 'fall', fallen: 'fall', knew: 'know',
    known: 'know', made: 'make', said: 'say', slept: 'sleep', woke: 'wake', woken: 'wake',
    wore: 'wear', worn: 'wear', drove: 'drive', driven: 'drive', ran: 'run', sang: 'sing',
    sung: 'sing', sat: 'sit', stood: 'stand', found: 'find', lost: 'lose', kept: 'keep',
    bought: 'buy', brought: 'bring', caught: 'catch', taught: 'teach', fought: 'fight',
    hung: 'hang', hid: 'hide', hidden: 'hide', lay: 'lie', laid: 'lay', led: 'lead',
    meant: 'mean', met: 'meet', paid: 'pay', sold: 'sell', sent: 'send', shot: 'shoot',
    spoke: 'speak', spoken: 'speak', spent: 'spend', struck: 'strike', swam: 'swim',
    threw: 'throw', thrown: 'throw', understood: 'understand', wept: 'weep', won: 'win',
    wrote: 'write', written: 'write', men: 'man', women: 'woman', children: 'child',
    feet: 'foot', teeth: 'tooth', mice: 'mouse', geese: 'goose', lives: 'life',
    knives: 'knife', wives: 'wife', leaves: 'leaf', wolves: 'wolf', shelves: 'shelf',
    halves: 'half', began: 'begin', begun: 'begin', bit: 'bite', bitten: 'bite', blew: 'blow',
    blown: 'blow', built: 'build', burnt: 'burn', chose: 'choose', chosen: 'choose',
    dealt: 'deal', dug: 'dig', drew: 'draw', drawn: 'draw', drank: 'drink', drunk: 'drink',
    ate: 'eat', eaten: 'eat', fed: 'feed', fled: 'flee', flew: 'fly', flown: 'fly',
    forgot: 'forget', forgotten: 'forget', froze: 'freeze', frozen: 'freeze', got: 'get',
    gotten: 'get', grew: 'grow', grown: 'grow', heard: 'hear', knelt: 'kneel', lent: 'lend',
    lit: 'light', rode: 'ride', ridden: 'ride', rang: 'ring', rung: 'ring', rose: 'rise',
    risen: 'rise', sank: 'sink', sunk: 'sink', shook: 'shake', shaken: 'shake',
    shone: 'shine', shrank: 'shrink', slid: 'slide', spun: 'spin', stole: 'steal',
    stolen: 'steal', stuck: 'stick', stung: 'sting', swore: 'swear', sworn: 'swear',
    swept: 'sweep', swung: 'swing', tore: 'tear', torn: 'tear', wound: 'wind', wrung: 'wring',
    was: 'be', were: 'be', been: 'be', am: 'be', is: 'be', are: 'be', had: 'have',
    has: 'have', did: 'do', does: 'do', done: 'do',
  };
  const PAST_IRREGULAR = new Set(`went saw left felt held thought told took gave broke came fell
    knew made said slept woke wore drove ran sang sat stood found lost kept bought brought caught
    taught fought hung hid led meant met paid sold sent shot spoke spent struck swam threw
    understood wept won wrote began blew built chose dealt dug drew drank ate fed fled flew forgot
    froze got grew heard knelt lent lit rode rang rose sank shook shone slid spun stole stuck
    stung swore swept swung tore was were had did`.split(/\s+/));

  /** Every plausible dictionary form of an inflected word, best first.
   *  Mirrors lemma_candidates() in build-lexicon.py; keep the two in step. */
  function lemmaCandidates(w) {
    const out = [w];
    const n = w.length;
    if (IRREGULAR[w]) out.push(IRREGULAR[w]);
    if (w.endsWith("'s")) out.push(w.slice(0, -2));
    if (w.endsWith("s'")) out.push(w.slice(0, -1));
    if (n > 4 && w.endsWith('ies')) out.push(w.slice(0, -3) + 'y');
    if (n > 4 && w.endsWith('ves')) out.push(w.slice(0, -3) + 'f', w.slice(0, -3) + 'fe');
    if (n > 3 && w.endsWith('es')) out.push(w.slice(0, -2));
    if (n > 3 && w.endsWith('s') && !w.endsWith('ss')) out.push(w.slice(0, -1));
    if (n > 4 && w.endsWith('ied')) out.push(w.slice(0, -3) + 'y');
    if (n > 3 && w.endsWith('ed')) {
      out.push(w.slice(0, -2), w.slice(0, -1));
      if (n > 4 && w[n - 3] === w[n - 4]) out.push(w.slice(0, -3));
    }
    if (n > 4 && w.endsWith('ing')) {
      out.push(w.slice(0, -3), w.slice(0, -3) + 'e');
      if (n > 5 && w[n - 4] === w[n - 5]) out.push(w.slice(0, -4));
      if (w.endsWith('ying')) out.push(w.slice(0, -4) + 'ie');
    }
    if (n > 3 && w.endsWith('er')) {
      out.push(w.slice(0, -2), w.slice(0, -1));
      if (n > 4 && w[n - 3] === w[n - 4]) out.push(w.slice(0, -3));
    }
    if (n > 4 && w.endsWith('est')) {
      out.push(w.slice(0, -3), w.slice(0, -2));
      if (n > 5 && w[n - 4] === w[n - 5]) out.push(w.slice(0, -4));
    }
    if (n > 4 && w.endsWith('ily')) out.push(w.slice(0, -3) + 'y');
    if (n > 3 && w.endsWith('ly')) out.push(w.slice(0, -2), w.slice(0, -2) + 'le');
    return [...new Set(out.filter(Boolean))];
  }

  // --------------------------------------------------------------- lexicon
  function createLexicon() {
    return { pron: new Map(), conc: new Map(), sense: new Map(), words: 0, extra: false };
  }

  function loadLexicon(lex, text) {
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line || line[0] === '#') continue;
      const t1 = line.indexOf('\t');
      const t2 = line.indexOf('\t', t1 + 1);
      const t3 = line.indexOf('\t', t2 + 1);
      const w = line.slice(0, t1);
      const p = line.slice(t1 + 1, t2);
      const c = line.slice(t2 + 1, t3);
      const s = line.slice(t3 + 1);
      if (p) lex.pron.set(w, p);
      if (c) lex.conc.set(w, +c / 10);
      if (s) lex.sense.set(w, s);
      lex.words++;
    }
    return lex;
  }

  function loadExtra(lex, text) {
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line || line[0] === '#') continue;
      const t = line.indexOf('\t');
      const w = line.slice(0, t);
      if (!lex.pron.has(w)) lex.pron.set(w, line.slice(t + 1));
    }
    lex.extra = true;
    return lex;
  }

  const unpack = (packed) => Array.from(packed, (ch) => UNPACK.get(ch));

  function normalize(raw) {
    let w = raw.toLowerCase().replace(/[‘’ʼ`]/g, "'");
    w = w.replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, '');
    return w;
  }

  // A dropped g ("cryin'") is the -ing form with its last sound softened.
  function suffixPhones(base, suffix) {
    const last = base[base.length - 1];
    const lb = baseOf(last);
    switch (suffix) {
      case 's':
        if (SIBILANT.has(lb)) return [...base, 'IH0', 'Z'];
        return [...base, VOICED_END.has(lb) || isVowel(last) ? 'Z' : 'S'];
      case 'ed':
        if (lb === 'T' || lb === 'D') return [...base, 'IH0', 'D'];
        return [...base, VOICED_END.has(lb) || isVowel(last) ? 'D' : 'T'];
      case 'ing': return [...base, 'IH0', 'NG'];
      case 'in': return [...base, 'IH0', 'N'];
      case 'er': return [...base, 'ER0'];
      case 'est': return [...base, 'AH0', 'S', 'T'];
      case 'ly': return [...base, 'L', 'IY0'];
      case 'll': return [...base, 'L'];
      case 're': return [...base, 'ER0'];
      case 've': return [...base, 'V'];
      case 'd': return [...base, 'D'];
      case 'm': return [...base, 'M'];
      case 'nt': return [...base, 'AH0', 'N', 'T'];
      default: return base;
    }
  }

  function derivePhones(lex, w) {
    const get = (x) => (lex.pron.has(x) ? unpack(lex.pron.get(x)) : null);
    let p;
    if (/in'$/.test(w) && (p = get(w.slice(0, -1) + 'g'))) {
      return p[p.length - 1] === 'NG' ? [...p.slice(0, -1), 'N'] : p;
    }
    const tries = [
      [/'s$/, 2, 's'], [/'ll$/, 3, 'll'], [/'re$/, 3, 're'], [/'ve$/, 3, 've'],
      [/'d$/, 2, 'd'], [/'m$/, 2, 'm'], [/n't$/, 3, 'nt'],
    ];
    for (const [re, cut, suf] of tries) {
      if (re.test(w) && (p = get(w.slice(0, -cut)))) return suffixPhones(p, suf);
    }
    const n = w.length;
    if (n > 3 && w.endsWith('s')) {
      for (const b of [w.slice(0, -1), w.endsWith('es') ? w.slice(0, -2) : null,
        w.endsWith('ies') ? w.slice(0, -3) + 'y' : null]) {
        if (b && (p = get(b))) return suffixPhones(p, 's');
      }
    }
    if (n > 3 && w.endsWith('ed')) {
      for (const b of [w.slice(0, -2), w.slice(0, -1), n > 4 && w[n - 3] === w[n - 4] ? w.slice(0, -3) : null,
        w.endsWith('ied') ? w.slice(0, -3) + 'y' : null]) {
        if (b && (p = get(b))) return suffixPhones(p, 'ed');
      }
    }
    if (n > 4 && w.endsWith('ing')) {
      for (const b of [w.slice(0, -3), w.slice(0, -3) + 'e', n > 5 && w[n - 4] === w[n - 5] ? w.slice(0, -4) : null]) {
        if (b && (p = get(b))) return suffixPhones(p, 'ing');
      }
    }
    for (const [suf, cut] of [['er', 2], ['est', 3], ['ly', 2]]) {
      if (n > cut + 2 && w.endsWith(suf) && (p = get(w.slice(0, -cut)))) return suffixPhones(p, suf);
    }
    return null;
  }

  // For words no dictionary knows: count vowel groups, stress the first.
  function spellingEstimate(w) {
    const core = w.replace(/[^a-z]/g, '');
    let groups = core.match(/[aeiouy]+/g) || [];
    let n = groups.length;
    if (n > 1 && /[^aeiou]e$/.test(core) && !/[^aeiou]le$/.test(core)) n--;
    n = Math.max(1, n);
    const m = core.match(/[aeiouy]+[^aeiouy]*e?$/);
    return { syll: n, tail: m ? m[0].replace(/e$/, '') || m[0] : core.slice(-2) };
  }

  const infoCache = new WeakMap();

  /** Everything the engine knows about one word, with where each fact came
   *  from. `source` is 'dictionary', 'derived' (built from a dictionary
   *  base, e.g. "cryin'" from "crying") or 'spelling' (a guess). */
  function wordInfo(lex, raw) {
    let cache = infoCache.get(lex);
    if (!cache) { cache = new Map(); infoCache.set(lex, cache); }
    const key = normalize(raw) + (lex.extra ? '|x' : '');
    if (cache.has(key)) return cache.get(key);
    const w = normalize(raw);
    const info = { raw, w, phones: null, source: 'spelling', syll: 0, stress: [], lemma: w,
      conc: null, concFrom: null, senses: null, sensesFrom: null, fn: FUNCTION_WORDS.has(w) };
    if (lex.pron.has(w)) { info.phones = unpack(lex.pron.get(w)); info.source = 'dictionary'; }
    else {
      const d = derivePhones(lex, w);
      if (d) { info.phones = d; info.source = 'derived'; }
    }
    if (info.phones) {
      const vowels = info.phones.filter(isVowel);
      info.syll = vowels.length || 1;
      info.stress = vowels.map((v) => (stressOf(v) === 1 ? 'S' : stressOf(v) === 2 ? 's' : 'w'));
      if (!info.stress.length) info.stress = ['S'];
    } else {
      const est = spellingEstimate(w);
      info.syll = est.syll;
      info.tail = est.tail;
      info.stress = Array.from({ length: est.syll }, (_, i) => (i === 0 ? 'S' : 'w'));
    }
    if (info.syll === 1) info.stress = [info.fn ? 'w' : 'S'];
    // Ratings belong to dictionary forms: "fingers" borrows "finger".
    const cands = lemmaCandidates(w.replace(/in'$/, 'ing'));
    for (const c of cands) {
      if (lex.conc.has(c) || lex.sense.has(c)) { info.lemma = c; break; }
    }
    if (lex.conc.has(info.lemma)) { info.conc = lex.conc.get(info.lemma); info.concFrom = info.lemma; }
    if (lex.sense.has(info.lemma)) {
      info.senses = Array.from(lex.sense.get(info.lemma), (d) => +d / 9);
      info.sensesFrom = info.lemma;
    }
    cache.set(key, info);
    return info;
  }

  function respell(phones) {
    if (!phones) return null;
    const syl = syllabify(phones);
    return syl.map((s) => {
      const txt = s.phones.map((p, i) => {
        if (p === 'AH1' || p === 'AH2') return 'u';
        if (baseOf(p) === 'AY' && i > 0) return 'y';
        return RESPELL[baseOf(p)];
      }).join('');
      return s.stress === 1 ? txt.toUpperCase() : txt;
    }).join('·');
  }

  // Each vowel takes the consonants before it; a run between two vowels
  // gives its last consonant to the next syllable ("fing-gurz").
  function syllabify(phones) {
    const vIdx = phones.map((p, i) => (isVowel(p) ? i : -1)).filter((i) => i >= 0);
    if (!vIdx.length) return [{ phones, stress: 1 }];
    const out = [];
    let start = 0;
    vIdx.forEach((vi, k) => {
      const next = vIdx[k + 1];
      let end;
      if (next === undefined) end = phones.length;
      else {
        const gap = next - vi - 1;
        end = gap <= 1 ? vi + 1 : next - 1;
      }
      out.push({ phones: phones.slice(start, end), stress: stressOf(phones[vi]) });
      start = end;
    });
    return out;
  }

  // ----------------------------------------------------------------- rhyme
  function rhymeParts(phones) {
    let idx = -1;
    for (let i = phones.length - 1; i >= 0; i--) {
      if (isVowel(phones[i]) && stressOf(phones[i]) >= 1) { idx = i; break; }
    }
    if (idx < 0) for (let i = phones.length - 1; i >= 0; i--) if (isVowel(phones[i])) { idx = i; break; }
    if (idx < 0) return null;
    const onset = [];
    for (let j = idx - 1; j >= 0 && !isVowel(phones[j]); j--) onset.unshift(phones[j]);
    return { vowel: baseOf(phones[idx]), onset, rest: phones.slice(idx + 1).map(baseOf), at: idx };
  }

  function segments(rest) {
    const clusters = [[]];
    const vowels = [];
    for (const p of rest) {
      if (VOWELS.includes(p)) { vowels.push(p); clusters.push([]); }
      else clusters[clusters.length - 1].push(p);
    }
    return { clusters, vowels };
  }

  const reduced = (v) => (v === 'IH' || v === 'AH' ? 'AH' : v);

  function isSubsequence(small, big) {
    let i = 0;
    for (const p of big) if (i < small.length && small[i] === p) i++;
    return i === small.length;
  }

  // 3 = same sounds, 2 = cousins, 1 = one adds a sound, 0 = unrelated.
  function clusterRank(a, b, notes) {
    if (a.length === b.length && a.every((p, i) => p === b[i])) return 3;
    if (a.length === b.length && a.length > 0 &&
        a.every((p, i) => FAMILY[p] && FAMILY[p] === FAMILY[b[i]])) {
      notes.push(`${a.join(' ')} / ${b.join(' ')}: both ${FAMILY[a[0]]}s`);
      return 2;
    }
    if (a.length !== b.length) {
      const [s, l] = a.length < b.length ? [a, b] : [b, a];
      if (isSubsequence(s, l)) {
        notes.push(`${l.join(' ')} adds ${l.filter((p, i) => s[i] !== p).slice(0, 2).join(' ') || l[l.length - 1]}`);
        return 1;
      }
    }
    return 0;
  }

  const RHYME_RANK = { perfect: 6, family: 5, additive: 4, identity: 3, assonance: 2, consonance: 1 };

  /** Compare two words the way Pattison ranks rhyme, from the last strong
   *  vowel to the end. Returns null when there is no relation worth drawing. */
  function rhyme(lex, rawA, rawB) {
    const a = wordInfo(lex, rawA);
    const b = wordInfo(lex, rawB);
    if (!a.w || !b.w) return null;
    return classify(a, b, a.phones, b.phones);
  }

  // The rhyme itself, on two phone sequences. `a` and `b` are the stressed
  // words the sequences start from (for sameness and for receipts); the
  // sequences may run on through light words after them ("guide me").
  function classify(a, b, pa, pb) {
    if (a.w === b.w) return { kind: 'same', rank: 0, a, b };
    if (!pa || !pb) {
      if (pa || pb) return null;
      if (a.tail && a.tail === b.tail) return { kind: 'perfect', rank: RHYME_RANK.perfect, a, b, estimated: true };
      return null;
    }
    const A = rhymeParts(pa);
    const B = rhymeParts(pb);
    if (!A || !B) return null;
    // One ending runs on past the other ("side" / "GUIDE me", "free" /
    // "freed"): the shorter lands and the longer keeps going. Additive.
    const prefix = (x, y) => x.length < y.length && x.every((ph, i) => ph === y[i]);
    if (A.vowel === B.vowel && (prefix(A.rest, B.rest) || prefix(B.rest, A.rest))) {
      const [sh, lg] = A.rest.length < B.rest.length ? [A.rest, B.rest] : [B.rest, A.rest];
      return { a, b, vowel: A.vowel, tailA: [A.vowel, ...A.rest], tailB: [B.vowel, ...B.rest],
        notes: [`one ending runs on: + ${lg.slice(sh.length).join(' ').toLowerCase()}`], kind: 'additive', rank: RHYME_RANK.additive };
    }
    const sa = segments(A.rest);
    const sb = segments(B.rest);
    const notes = [];
    let shapeMatch = sa.vowels.length === sb.vowels.length &&
      sa.vowels.every((v, i) => reduced(v) === reduced(sb.vowels[i]));
    let rank = 3;
    if (shapeMatch) {
      for (let i = 0; i < sa.clusters.length; i++) {
        rank = Math.min(rank, clusterRank(sa.clusters[i], sb.clusters[i], notes));
      }
    } else rank = 0;
    const base = { a, b, vowel: A.vowel, tailA: [A.vowel, ...A.rest], tailB: [B.vowel, ...B.rest], notes };
    if (A.vowel === B.vowel) {
      if (rank === 3) {
        const sameOnset = A.onset.length === B.onset.length && A.onset.every((p, i) => p === B.onset[i]);
        if (sameOnset) return { ...base, kind: 'identity', rank: RHYME_RANK.identity };
        return { ...base, kind: 'perfect', rank: RHYME_RANK.perfect };
      }
      if (rank === 2) return { ...base, kind: 'family', rank: RHYME_RANK.family };
      if (rank === 1) return { ...base, kind: 'additive', rank: RHYME_RANK.additive };
      return { ...base, kind: 'assonance', rank: RHYME_RANK.assonance };
    }
    const hasConsonant = A.rest.some((p) => !VOWELS.includes(p));
    if (rank === 3 && shapeMatch && hasConsonant) return { ...base, kind: 'consonance', rank: RHYME_RANK.consonance };
    return null;
  }

  // Where a line's rhyme lives: its last stressed word, carrying up to two
  // light words after it. "inside me" rhymes on SIDE, not on "me".
  function lineTail(words) {
    if (!words.length) return null;
    const light = (w) => w.info.fn && w.info.syll === 1;
    let k = words.length - 1;
    const trail = [];
    while (k > 0 && trail.length < 2 && light(words[k])) { trail.unshift(words[k]); k--; }
    const last = words[words.length - 1];
    if (light(words[k])) return { key: last, trail: [], phones: last.info.phones, text: last.t };
    const key = words[k];
    let phones = key.info.phones;
    if (phones && trail.length) {
      phones = [...phones];
      for (const t of trail) {
        if (!t.info.phones) continue;
        for (const ph of t.info.phones) phones.push(isVowel(ph) ? baseOf(ph) + '0' : ph);
      }
    }
    return { key, trail, phones, text: [key, ...trail].map((w) => w.t).join(' ') };
  }

  function rhymeTails(A, B) {
    const r = classify(A.key.info, B.key.info, A.phones, B.phones);
    if (!r) return null;
    return { ...r, textA: A.text, textB: B.text, phonesA: A.phones, phonesB: B.phones };
  }

  // ---------------------------------------------------------------- voice
  const WH = new Set(['who', 'what', 'when', 'where', 'why', 'how', 'which', 'whose', "where'd", "what'd", "how'd", "who'd", "why'd"]);
  const AUX = new Set(['do', 'does', 'did', 'is', 'are', 'was', 'were', 'am', 'can', 'could', 'will',
    'would', 'should', 'shall', 'may', 'might', 'must', 'have', 'has', 'had', "don't", "doesn't",
    "didn't", "won't", "can't", "isn't", "aren't", "wasn't", "weren't", "wouldn't", "couldn't"]);
  const SUBJECTS = new Set(['i', 'you', 'he', 'she', 'it', 'we', 'they', 'your', 'my', 'his', 'her',
    'their', 'our', 'the', 'this', 'that', 'these', 'those', 'there', 'anyone', 'someone']);
  const IMPERATIVE = new Set(`let come go take hold stay look listen tell give bring strike bury leave
    keep wait kiss touch show turn open close call sing dance run stop forget remember forgive
    believe trust help save follow meet find hide sleep wake rest breathe be get put say lay try
    carry catch cut drop fly hear hush love make move pour pull push shut sit stand throw walk
    wash watch write don't never please pray light burn break fold dream`.split(/\s+/));
  const PERSON = {
    i: 'I', me: 'I', my: 'I', mine: 'I', myself: 'I', "i'm": 'I', "i've": 'I', "i'll": 'I', "i'd": 'I',
    you: 'you', your: 'you', yours: 'you', yourself: 'you', "you're": 'you', "you've": 'you',
    "you'll": 'you', "you'd": 'you', ya: 'you', "y'all": 'you', yourselves: 'you',
    we: 'we', us: 'we', our: 'we', ours: 'we', ourselves: 'we', "we're": 'we', "we've": 'we',
    "we'll": 'we', "we'd": 'we', "let's": 'we',
    he: 'he', him: 'he', his: 'he', himself: 'he', "he's": 'he', "he'll": 'he', "he'd": 'he',
    she: 'she', her: 'she', hers: 'she', herself: 'she', "she's": 'she', "she'll": 'she', "she'd": 'she',
    they: 'they', them: 'they', their: 'they', theirs: 'they', themselves: 'they',
    "they're": 'they', "they've": 'they', "they'll": 'they', "they'd": 'they',
  };
  const FUTURE = new Set(['will', "won't", 'shall', 'gonna', "i'll", "you'll", "we'll", "they'll",
    "he'll", "she'll", "it'll", "that'll", "there'll"]);
  const PAST_AUX = new Set(['was', 'were', 'had', 'did', "didn't", "wasn't", "weren't", "hadn't", 'used']);

  function voiceOf(lex, words) {
    const ws = words.map((t) => t.info.w);
    const v = { act: 'statement', trigger: null, persons: [], tense: 'present', tenseTrigger: null };
    const persons = new Set();
    ws.forEach((w) => { if (PERSON[w]) persons.add(PERSON[w]); });
    v.persons = [...persons];
    // Speech act. A line is a question when it says so with "?" or opens
    // the way questions open ("where do", "do they").
    let k = 0;
    while (k < ws.length - 1 && ['and', 'but', 'so', 'oh', 'now', 'or', 'then'].includes(ws[k])) k++;
    const first = ws[k];
    const second = ws[k + 1];
    if (words.lineText && /\?\s*["'”’)]*\s*$/.test(words.lineText)) { v.act = 'question'; v.trigger = '?'; }
    else if (WH.has(first) && (AUX.has(second) || (first.includes("'") && second))) { v.act = 'question'; v.trigger = `${first} ${second}`; }
    else if (AUX.has(first) && first !== 'will' && SUBJECTS.has(second) && ws.length > 2) { v.act = 'question'; v.trigger = `${first} ${second}`; }
    else {
      for (let i = 0; i < ws.length; i++) {
        const w = ws[i];
        const nxt = ws[i + 1] || '';
        if ((w === "i'll" || w === "we'll") ||
            ((w === 'i' || w === 'we') && ['will', "won't", 'shall', 'promise', 'swear', 'gonna', 'never'].includes(nxt))) {
          v.act = 'promise';
          v.trigger = w.includes("'") ? w : `${w} ${nxt}`;
          break;
        }
      }
      if (v.act === 'statement' && first && IMPERATIVE.has(first)) {
        const notVerb = ['is', 'was', "'s", 'are', 'were', 'has', 'had', 'will', 'would', 'can', 'could', 'of', 'and'];
        // "never let me go" pleads; "never rewarded" only describes.
        const negation = ['never', "don't", 'please'].includes(first);
        const okNeg = !negation || IMPERATIVE.has(second || '') || VERBS_S.has(second || '');
        if (okNeg && !notVerb.includes(second || '') && !(first === 'love' && second === 'is')) {
          v.act = 'plea';
          v.trigger = first;
        }
      }
    }
    // Tense: first marker wins the label, both markers make it mixed.
    let past = null;
    let future = null;
    for (let i = 0; i < ws.length; i++) {
      const w = ws[i];
      if (!future && (FUTURE.has(w) || (w === 'going' && ws[i + 1] === 'to' && ws[i + 2] && !['the', 'a', 'my', 'your', 'bed'].includes(ws[i + 2])))) future = w === 'going' ? 'going to' : w;
      if (!past && (PAST_AUX.has(w) || PAST_IRREGULAR.has(w))) past = w;
      if (!past && w.length > 4 && w.endsWith('ed') && !FUNCTION_WORDS.has(w)) {
        const info = words[i].info;
        if (info.lemma !== w || lemmaCandidates(w).slice(1).some((c) => lex.pron.has(c))) past = w;
      }
    }
    if (past && future) { v.tense = 'mixed'; v.tenseTrigger = `${past} / ${future}`; }
    else if (future) { v.tense = 'future'; v.tenseTrigger = future; }
    else if (past) { v.tense = 'past'; v.tenseTrigger = past; }
    return v;
  }

  const NEGATORS = new Set(`not never no nor don't doesn't didn't won't wouldn't can't cannot
    couldn't shouldn't isn't aren't wasn't weren't haven't hasn't hadn't ain't mustn't
    nobody nothing nowhere neither`.split(/\s+/));

  // ------------------------------------------------------------------ page
  const WORD_RE = /[A-Za-z0-9À-ɏ]+(?:['’][A-Za-zÀ-ɏ]+)*'?|['’](?:cause|til|em|round|bout|fore)\b/g;

  function tokenize(line) {
    const out = [];
    WORD_RE.lastIndex = 0;
    let m;
    while ((m = WORD_RE.exec(line))) out.push({ t: m[0], start: m.index, end: m.index + m[0].length });
    return out;
  }

  const normLine = (s) => s.toLowerCase().replace(/[‘’]/g, "'").replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();

  function contentLemma(info) {
    if (info.fn || !/[a-z]/.test(info.w)) return null;
    return info.lemma;
  }

  /** Analyze a page: {text, under (the understory), follow: [lemmas]}. */
  function analyze(lex, page) {
    const rawLines = (page.text || '').replace(/\r\n?/g, '\n').split('\n');
    const lines = [];
    let stanza = 0;
    let pos = 0;
    let prevBlank = true;
    rawLines.forEach((text, i) => {
      const blank = !text.trim();
      if (blank) {
        lines.push({ i, text, blank: true, stanza: -1, pos: -1, words: [] });
        prevBlank = true;
        return;
      }
      if (prevBlank && lines.some((l) => !l.blank)) { stanza++; pos = 0; }
      prevBlank = false;
      const words = tokenize(text).map((tok) => ({ ...tok, info: wordInfo(lex, tok.t) }));
      words.lineText = text;
      const line = { i, text, blank: false, stanza, pos: pos++, words };
      lines.push(line);
    });
    const live = lines.filter((l) => !l.blank);

    for (const l of live) {
      // Stress: a line's syllables in order, function words already demoted.
      l.stress = l.words.flatMap((w) => w.info.stress);
      l.syll = l.stress.length;
      l.end = l.words.length ? l.words[l.words.length - 1] : null;
      l.tail = lineTail(l.words);
      // Altitude: how far the content words float from things you can touch.
      const rated = [];
      const unrated = [];
      for (const w of l.words) {
        if (!contentLemma(w.info)) continue;
        if (w.info.conc != null) rated.push({ w: w.t, lemma: w.info.concFrom, c: w.info.conc });
        else unrated.push(w.t);
      }
      const mean = rated.length ? rated.reduce((s, r) => s + r.c, 0) / rated.length : null;
      l.alt = { value: mean == null ? null : Math.max(0, Math.min(1, (5 - mean) / 4)), mean, rated, unrated };
      // Senses: the strongest word in each of the seven.
      const vals = new Array(7).fill(0);
      const drivers = new Array(7).fill(null);
      for (const w of l.words) {
        if (!contentLemma(w.info) || !w.info.senses) continue;
        w.info.senses.forEach((v, k) => {
          if (v > vals[k]) { vals[k] = v; drivers[k] = w.t; }
        });
      }
      l.senses = { vals, drivers };
      l.voice = voiceOf(lex, l.words);
    }

    // Refrains: whole lines that come back.
    const groups = new Map();
    for (const l of live) {
      const key = normLine(l.text);
      if (!key) continue;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(l);
    }
    const refrains = [];
    for (const [key, ls] of groups) {
      if (ls.length < 2) continue;
      const id = refrains.length;
      refrains.push({ id, key, text: ls[0].text.trim(), lines: ls.map((l) => l.i) });
      ls.forEach((l, k) => { l.refrain = id; l.refrainTurn = k; });
    }
    // A refrain returns in turns: repeats on consecutive lines are one turn
    // ("I won't hurt you" x4, x4, then x8), and each turn has a floor, the
    // two lines it lands on.
    const liveAt = new Map(live.map((l, n) => [l.i, n]));
    for (const r of refrains) {
      r.turns = [];
      let prev = -2;
      for (const li of r.lines) {
        const n = liveAt.get(li);
        const t = r.turns[r.turns.length - 1];
        if (t && n === prev + 1) { t.count++; t.lines.push(li); }
        else r.turns.push({ start: li, count: 1, lines: [li] });
        prev = n;
      }
      r.floors = r.turns.map((t) => {
        const floor = [];
        for (let j = t.start - 1; j >= 0 && floor.length < 2; j--) {
          const l = lines[j];
          if (l.blank) { if (floor.length) break; continue; }
          if (l.refrain === r.id) break;
          floor.unshift(l.text.trim());
        }
        return floor;
      });
      r.turns.forEach((t, n) => t.lines.forEach((li) => { lines[li].refrainTurnNo = n; }));
    }

    // Rhyme: each line end against the four line ends before it.
    for (let idx = 0; idx < live.length; idx++) {
      const l = live[idx];
      if (!l.end) continue;
      let best = null;
      let gaps = 0;
      for (let back = 1; back <= 4 && idx - back >= 0; back++) {
        const m = live[idx - back];
        if (m.stanza !== l.stanza) gaps++;
        if (gaps > 1) break;
        if (!m.end) continue;
        if (l.refrain != null && l.refrain === m.refrain) continue;
        const r = rhymeTails(l.tail, m.tail);
        if (!r) continue;
        const rank = r.kind === 'same' ? 2.5 : r.rank;
        if (!best || rank > best.rank) best = { ...r, rank, with: m.i };
      }
      l.rhyme = best;
    }
    // Each end of a link knows the other: the earlier line of a pair is
    // rhymed *by* the later one, and wears the stronger of its rungs.
    for (const l of live) l.rhymedBy = [];
    for (const l of live) {
      if (l.rhyme) lines[l.rhyme.with].rhymedBy.push({ from: l.i, kind: l.rhyme.kind, rank: l.rhyme.rank });
    }
    for (const l of live) {
      const own = l.rhyme ? { kind: l.rhyme.kind, rank: l.rhyme.rank } : null;
      const best = [own, ...l.rhymedBy].filter(Boolean).sort((x, y) => y.rank - x.rank)[0];
      l.rhymeClass = best ? best.kind : null;
    }

    // Scheme letters over the rhyme links; unrhymed lines get x.
    const parent = new Map(live.map((l) => [l.i, l.i]));
    const find = (x) => (parent.get(x) === x ? x : (parent.set(x, find(parent.get(x))), parent.get(x)));
    for (const l of live) {
      if (l.rhyme && l.rhyme.rank >= RHYME_RANK.assonance) parent.set(find(l.i), find(l.rhyme.with));
    }
    for (const r of refrains) for (const li of r.lines.slice(1)) parent.set(find(li), find(r.lines[0]));
    const size = new Map();
    for (const l of live) size.set(find(l.i), (size.get(find(l.i)) || 0) + 1);
    const letters = new Map();
    let next = 0;
    for (const l of live) {
      const rootId = find(l.i);
      if (size.get(rootId) < 2 || !l.end) { l.scheme = 'x'; continue; }
      if (!letters.has(rootId)) {
        letters.set(rootId, next < 26 ? String.fromCharCode(65 + next) : `A${next - 25}`);
        next++;
      }
      l.scheme = letters.get(rootId);
    }

    // The understory: its words, and every place one surfaces above ground.
    const underWords = tokenize(page.under || '').map((tok) => wordInfo(lex, tok.t));
    const underLemmas = new Set(underWords.map(contentLemma).filter((x) => x && !TOO_COMMON.has(x)));
    const followLemmas = new Set((page.follow || []).map((w) => wordInfo(lex, w).lemma));
    const surfaced = [];
    const followed = [];
    for (const l of live) {
      l.surfaced = [];
      l.denied = [];
      l.followed = [];
      l.words.forEach((w, k) => {
        const lem = contentLemma(w.info);
        if (lem && underLemmas.has(lem)) {
          // "won't hurt": the word surfaced, and the line denies it.
          let denial = null;
          for (let j = k - 1; j >= Math.max(0, k - 2); j--) {
            if (NEGATORS.has(l.words[j].info.w)) { denial = l.words.slice(j, k + 1).map((x) => x.t).join(' '); break; }
          }
          l.surfaced.push(k);
          if (denial) l.denied.push(k);
          surfaced.push({ line: l.i, word: w.t, lemma: lem, denial });
        }
        if (followLemmas.has(w.info.lemma) || followLemmas.has(w.info.w)) { l.followed.push(k); followed.push({ line: l.i, word: w.t }); }
      });
    }

    // Motifs: content words that come back on more than one line.
    const motif = new Map();
    for (const l of live) {
      if (l.refrain != null && l.refrainTurn > 0) continue;
      const seen = new Set();
      for (const w of l.words) {
        const lem = contentLemma(w.info);
        if (!lem || TOO_COMMON.has(lem) || seen.has(lem)) continue;
        seen.add(lem);
        if (!motif.has(lem)) motif.set(lem, { lemma: lem, lines: [], conc: w.info.conc });
        motif.get(lem).lines.push(l.i);
      }
    }
    const motifs = [...motif.values()].filter((m) => m.lines.length > 1)
      .sort((a, b) => b.lines.length - a.lines.length || (b.conc || 0) - (a.conc || 0));

    // Mirrors: the line in the same seat of every other stanza.
    const byPos = new Map();
    for (const l of live) {
      if (!byPos.has(l.pos)) byPos.set(l.pos, []);
      byPos.get(l.pos).push(l.i);
    }
    for (const l of live) l.mirrors = byPos.get(l.pos).filter((i) => i !== l.i);

    // The whole song, summarized from the lines up.
    const counts = { question: 0, promise: 0, plea: 0, statement: 0 };
    live.forEach((l) => { counts[l.voice.act]++; });
    const kinds = {};
    live.forEach((l) => { if (l.rhyme && l.rhyme.kind !== 'same') kinds[l.rhyme.kind] = (kinds[l.rhyme.kind] || 0) + 1; });
    const alts = live.map((l) => l.alt.value).filter((v) => v != null);
    const senseTotals = new Array(7).fill(0);
    live.forEach((l) => l.senses.vals.forEach((v, k) => { if (v >= 0.5) senseTotals[k]++; }));
    const persons = {};
    const firstSeen = {};
    live.forEach((l) => l.voice.persons.forEach((p) => {
      persons[p] = (persons[p] || 0) + 1;
      if (firstSeen[p] == null) firstSeen[p] = l.i;
    }));
    const byStanza = [];
    for (const l of live) {
      const st = byStanza[l.stanza] || (byStanza[l.stanza] = { stanza: l.stanza, first: l.i, lines: 0, persons: {}, alts: [] });
      st.lines++;
      l.voice.persons.forEach((p) => { st.persons[p] = (st.persons[p] || 0) + 1; });
      if (l.alt.mean != null) st.alts.push(l.alt.mean);
    }
    const stanzas = byStanza.filter(Boolean).map((st) => ({
      stanza: st.stanza, first: st.first, lines: st.lines, persons: st.persons,
      conc: st.alts.length ? st.alts.reduce((x, y) => x + y, 0) / st.alts.length : null,
    }));

    return {
      lines, live, refrains, motifs, surfaced, followed,
      underWords: underWords.map((w) => w.w).filter(Boolean),
      underLemmas: [...underLemmas],
      stanzas: stanza + (live.length ? 1 : 0),
      summary: {
        lines: live.length, counts, kinds,
        altitude: alts.length ? alts.reduce((s, v) => s + v, 0) / alts.length : null,
        senseTotals, persons, firstSeen, stanzas,
        syllables: live.reduce((s, l) => s + l.syll, 0),
      },
    };
  }

  // --------------------------------------------------------------- gravity
  /** What a writer keeps coming back to, across every page. */
  function gravity(lex, pages) {
    const hits = new Map();
    for (const p of pages) {
      const seenLines = new Set();
      (p.text || '').split('\n').forEach((text, i) => {
        const key = normLine(text);
        if (!key || seenLines.has(key)) return;
        seenLines.add(key);
        for (const tok of tokenize(text)) {
          const info = wordInfo(lex, tok.t);
          const lem = contentLemma(info);
          if (!lem || TOO_COMMON.has(lem) || lem.length < 3) continue;
          if (!hits.has(lem)) hits.set(lem, { lemma: lem, count: 0, pages: new Set(), conc: info.conc, where: [] });
          const h = hits.get(lem);
          h.count++;
          h.pages.add(p.id);
          if (h.where.length < 12) h.where.push({ page: p.id, title: p.title, line: i, text: text.trim() });
        }
      });
    }
    return [...hits.values()].filter((h) => h.count > 1)
      .sort((a, b) => b.pages.size - a.pages.size || b.count - a.count || (b.conc || 0) - (a.conc || 0))
      .map((h) => ({ ...h, pages: h.pages.size }));
  }

  // ----------------------------------------------------------------- voice
  // Rewrite a draft in another person's mouth, for a preview. Pronouns and
  // the verbs that lean on them (am/are/is, have/has, do/does); everything
  // else is left for the writer, who hears the rest better than a table.
  const TO = {
    I: { subj: 'I', obj: 'me', det: 'my', pron: 'mine', refl: 'myself', be: 'am', was: 'was', have: 'have', do: 'do', m: "I'm", ve: "I've", ll: "I'll", d: "I'd", third: false },
    you: { subj: 'you', obj: 'you', det: 'your', pron: 'yours', refl: 'yourself', be: 'are', was: 'were', have: 'have', do: 'do', m: "you're", ve: "you've", ll: "you'll", d: "you'd", third: false },
    she: { subj: 'she', obj: 'her', det: 'her', pron: 'hers', refl: 'herself', be: 'is', was: 'was', have: 'has', do: 'does', m: "she's", ve: "she's", ll: "she'll", d: "she'd", third: true },
    he: { subj: 'he', obj: 'him', det: 'his', pron: 'his', refl: 'himself', be: 'is', was: 'was', have: 'has', do: 'does', m: "he's", ve: "he's", ll: "he'll", d: "he'd", third: true },
    they: { subj: 'they', obj: 'them', det: 'their', pron: 'theirs', refl: 'themselves', be: 'are', was: 'were', have: 'have', do: 'do', m: "they're", ve: "they've", ll: "they'll", d: "they'd", third: false },
  };
  // 'you' and 'her' are each two words in one spelling (subject or object,
  // object or possessive); the flip decides from the neighbors.
  const FROM = {
    I: { i: 'subj', me: 'obj', my: 'det', mine: 'pron', myself: 'refl', "i'm": 'm', "i've": 've', "i'll": 'll', "i'd": 'd' },
    you: { you: 'you', your: 'det', yours: 'pron', yourself: 'refl', "you're": 'm', "you've": 've', "you'll": 'll', "you'd": 'd' },
    she: { she: 'subj', her: 'her', hers: 'pron', herself: 'refl', "she's": 'm', "she'll": 'll', "she'd": 'd' },
    he: { he: 'subj', him: 'obj', his: 'det', himself: 'refl', "he's": 'm', "he'll": 'll', "he'd": 'd' },
    they: { they: 'subj', them: 'obj', their: 'det', theirs: 'pron', themselves: 'refl', "they're": 'm', "they've": 've', "they'll": 'll', "they'd": 'd' },
  };
  const VERBS_S = new Set(`go know want need love like keep take make see feel think say come leave stay
    wait hold give find tell try call turn count change sleep dream walk run play drive sing dance
    fall break burn cry hurt hope pray carry remember forget miss lose win get put sit stand lie
    wake watch hear listen touch kiss hate mean learn live die write read speak talk ask answer
    open close lock pull push reach hide show bring send buy sell pay steal own believe trust doubt
    wonder worry fear care seem look sound taste smell move shake tremble fold clench scratch swim
    drift float sink rise shine glow fade grow heal bleed breathe smoke drink eat cook clean wash
    pack return begin end start stop follow let owe`.split(/\s+/));
  const OBJECT_BEFORE = new Set(`to for with at from about like than into onto upon of by without
    over under behind beside near around through against`.split(/\s+/));
  const SUBJECT_BEFORE = new Set(`and but or so that if when while because where how why what who
    do does did can could will would should shall may might must than as since until once whether
    though although unless`.split(/\s+/));

  function conjugate(v) {
    if (v === 'have') return 'has';
    if (v === 'do') return 'does';
    if (v === 'go') return 'goes';
    if (/(s|sh|ch|x|z|o)$/.test(v)) return v + 'es';
    if (/[^aeiou]y$/.test(v)) return v.slice(0, -1) + 'ies';
    return v + 's';
  }
  // "I" is capitalized by grammar, not by position: its replacement takes
  // a capital only at the start of a line, and any new "I" always has one.
  const I_FORMS = new Set(['i', "i'm", "i've", "i'll", "i'd"]);
  function matchCase(src, out, lineStart) {
    const cap = (x) => x[0].toUpperCase() + x.slice(1);
    if (/^I('|$)/.test(out)) return out;
    if (I_FORMS.has(src.toLowerCase())) return lineStart ? cap(out) : out;
    if (src.length > 1 && src === src.toUpperCase()) return out.toUpperCase();
    return src[0] === src[0].toUpperCase() ? cap(out) : out;
  }

  /** Rewrite `text` so the `from` person becomes `to`. I and you trade
   *  places both ways; any other pair moves one direction only. */
  function flipVoice(text, from, to) {
    if (!TO[to] || !FROM[from] || from === to) return text;
    const swap = (from === 'I' && to === 'you') || (from === 'you' && to === 'I');
    const back = from === 'I' ? 'you' : 'I';
    return text.split('\n').map((line) => {
      const toks = tokenize(line);
      const outWords = toks.map((t) => t.t);
      toks.forEach((tok, k) => {
        const w = normalize(tok.t);
        const prev = k > 0 ? normalize(toks[k - 1].t) : '';
        const nextW = k + 1 < toks.length ? normalize(toks[k + 1].t) : '';
        let role = null;
        let target = null;
        if (FROM[from][w]) { role = FROM[from][w]; target = TO[to]; }
        else if (swap && FROM[back][w]) { role = FROM[back][w]; target = TO[from]; }
        if (!role) return;
        let out;
        if (role === 'you') {
          const verbNext = nextW && (AUX.has(nextW) || VERBS_S.has(nextW) || PAST_IRREGULAR.has(nextW) ||
            /^(can|could|will|would|should|must|might|may|never|always|just|still|ever)$/.test(nextW) ||
            (nextW.endsWith('ed') && nextW.length > 4) || /^(are|were|'re|'ve|'ll|'d)$/.test(nextW));
          const isObj = !verbNext && (OBJECT_BEFORE.has(prev) ||
            (prev && !SUBJECT_BEFORE.has(prev) && !WH.has(prev) && !PERSON[prev] && !AUX.has(prev) && k > 0) ||
            (!nextW && k > 0));
          role = isObj ? 'obj' : 'subj';
        } else if (role === 'her') {
          const nextInfo = nextW ? FUNCTION_WORDS.has(nextW) : true;
          role = nextInfo ? 'obj' : 'det';
        }
        out = target[role];
        outWords[k] = matchCase(tok.t, out, k === 0);
        // Agreement for the verb right after a new subject.
        if (role === 'subj' && k + 1 < toks.length) {
          const n = normalize(toks[k + 1].t);
          let fix = null;
          if (['am', 'are', 'is'].includes(n)) fix = target.be;
          else if (['was', 'were'].includes(n)) fix = target.was;
          else if (['have', 'has'].includes(n)) fix = target.have;
          else if (['do', 'does'].includes(n)) fix = target.do;
          else if (["don't", "doesn't"].includes(n)) fix = target.third ? "doesn't" : "don't";
          else if (target.third && VERBS_S.has(n)) fix = conjugate(n);
          else if (!target.third && /s$/.test(n) && VERBS_S.has(n.replace(/(ies)$/, 'y').replace(/(es|s)$/, ''))) {
            const base = n.endsWith('ies') ? n.slice(0, -3) + 'y' : ['goes', 'does', 'has'].includes(n) ? { goes: 'go', does: 'do', has: 'have' }[n] : n.replace(/(ches|shes|sses|xes|zes|oes)$/, (m) => m.slice(0, -2)).replace(/s$/, '');
            if (VERBS_S.has(base)) fix = base;
          }
          if (fix) outWords[k + 1] = matchCase(toks[k + 1].t, fix, false);
        }
      });
      let out = '';
      let at = 0;
      toks.forEach((tok, k) => { out += line.slice(at, tok.start) + outWords[k]; at = tok.end; });
      return out + line.slice(at);
    }).join('\n');
  }

  root.UnderstoryEngine = {
    SYMBOLS, SENSES, VOWEL_AS, RHYME_RANK, FAMILY,
    createLexicon, loadLexicon, loadExtra, normalize, tokenize, lemmaCandidates,
    wordInfo, respell, syllabify, rhymeParts, rhyme, lineTail, analyze, gravity, flipVoice,
    baseOf, isVowel,
  };
})(typeof window !== 'undefined' ? window : globalThis);
