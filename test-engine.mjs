// Checks the engine against cases whose answers are known by ear.
//   node tools/understory/test-engine.mjs
// Needs lexicon.txt next to it (build-lexicon.py makes it).
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
await import(join(here, 'engine.js'));
const E = globalThis.UnderstoryEngine;
const lex = E.loadLexicon(E.createLexicon(), readFileSync(join(here, 'lexicon.txt'), 'utf8'));
if (existsSync(join(here, 'lexicon-extra.txt'))) E.loadExtra(lex, readFileSync(join(here, 'lexicon-extra.txt'), 'utf8'));

let fails = 0;
let passes = 0;
function check(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) passes++;
  else { fails++; console.log(`FAIL ${name}\n  want ${JSON.stringify(want)}\n  got  ${JSON.stringify(got)}`); }
}

// Pattison's ladder, one pair per rung.
const kind = (a, b) => (E.rhyme(lex, a, b) || { kind: null }).kind;
check('day/say perfect', kind('day', 'say'), 'perfect');
check('tight/night perfect', kind('tight', 'night'), 'perfect');
check('key/free perfect', kind('key', 'free'), 'perfect');
check('name/frame perfect', kind('name', 'frame'), 'perfect');
check('paradise/nice perfect (last strong vowel)', kind('paradise', 'nice'), 'perfect');
check('rub/dug family', kind('rub', 'dug'), 'family');
check('lock/not family', kind('lock', 'not'), 'family');
check('free/freed additive', kind('free', 'freed'), 'additive');
check('fingers/singers additive', kind('fingers', 'singers'), 'additive');
check('love/touch assonance', kind('love', 'touch'), 'assonance');
check('love/leave consonance', kind('love', 'leave'), 'consonance');
check('night/knight identity', kind('night', 'knight'), 'identity');
check('leave/believe identity', kind('leave', 'believe'), 'identity');
check('lock/lock same', kind('lock', 'lock'), 'same');
check('bed/cat none', kind('bed', 'cat'), null);

// Words.
const info = (w) => E.wordInfo(lex, w);
check('fingers borrows finger', [info('fingers').lemma, info('fingers').conc], ['finger', 5]);
check('fingers touch strong', info('fingers').senses[2] > 0.7, true);
check('pride floats', info('pride').conc < 2, true);
check("cryin' derived from crying", [info("cryin'").source, info("cryin'").syll], ['derived', 2]);
check('trembling has 3 syllables', info('trembling').syll, 3);
check('the is unstressed', info('the').stress, ['w']);
check("won't is stressed", info("won't").stress, ['S']);
check('respell fingers', E.respell(info('fingers').phones), 'FING·gurz');
check('respell night', E.respell(info('night').phones), 'NYT');
check('respell eyes', E.respell(info('eyes').phones), 'EYEZ');
check('zeus from the extra file', info('zeus').source, 'dictionary');

// A line's shape.
const one = (text, under = '') => E.analyze(lex, { text, under, follow: [] });
check('I won\'t hurt you: two stresses side by side', one("I won't hurt you").live[0].stress.join(''), 'wSSw');
check('question by mark', one('Where do your fingers go?').live[0].voice.act, 'question');
check('question by shape, no mark', one('where do your fingers go').live[0].voice.act, 'question');
check('question: do they', one('do they tremble on the edge of the bed').live[0].voice.act, 'question');
check('when you sleep is not a question', one('when you sleep').live[0].voice.act, 'statement');
check('promise', one("I won't hurt you").live[0].voice.act, 'promise');
check('plea', one('Strike me with your lightning').live[0].voice.act, 'plea');
check('love is a door is not a plea', one('Love is just a door').live[0].voice.act, 'statement');
check('future tense', one("I won't hurt you").live[0].voice.tense, 'future');
check('past tense', one('you turned it over in your hand').live[0].voice.tense, 'past');
check('persons', one("I won't hurt you").live[0].voice.persons.sort(), ['I', 'you']);

// A page.
const song = `Brass, and bent a little at the tip,
warm from riding in my coat all day.
You turned it over like a word you couldn't say.
You can keep the key.

Three a.m., the deadbolt turning slow.
I count the turns and keep my eyes shut tight.
Where'd you learn to be that quiet in the night?
You can keep the key.

The porch light's on, a lie I tell the moths.
Maybe trust is just a habit with a name.
The lock is still the lock. The frame is still the frame.
You can keep the key.`;
const a = E.analyze(lex, { text: song, under: "I think you're already gone.", follow: ['key'] });
check('three stanzas', a.stanzas, 3);
check('one refrain, three turns', [a.refrains.length, a.refrains[0].lines.length], [1, 3]);
check('floor under the second turn', a.refrains[0].floors[1][1], "Where'd you learn to be that quiet in the night?");
check('day/say links lines 1 and 2', [a.lines[2].rhyme.kind, a.lines[2].rhyme.with], ['perfect', 1]);
check('the earlier line of a pair wears its rung', a.lines[1].rhymeClass, 'perfect');
check('and knows who rhymed it', a.lines[1].rhymedBy.map((x) => x.from), [2]);
check('scheme of stanza one', a.live.slice(0, 4).map((l) => l.scheme).join(''), 'xAAB');
check('the question is found', a.lines[7].voice.act, 'question');
check('understory stays under', a.surfaced.length, 0);
check('followed word, three times', a.followed.length, 3);
check('trust line floats highest', Math.max(...a.live.map((l) => l.alt.value)) === a.lines[11].alt.value, true);
check('key is a motif', a.motifs.some((m) => m.lemma === 'key'), false /* only in the refrain */);
check('lock is a motif', a.motifs.some((m) => m.lemma === 'lock'), false /* one line */);
const b = E.analyze(lex, { text: song, under: 'I am afraid the lock will change', follow: [] });
check('understory surfaces when its words do', b.surfaced.map((s) => s.word), ['lock', 'lock']);

// A line rhymes on its last stressed word, light words and all.
const pair = (x, y) => { const r = E.analyze(lex, { text: `${x}\n${y}`, under: '', follow: [] }); return r.lines[1].rhyme && r.lines[1].rhyme.kind; };
check('hide me / inside me rhymes on the stressed word', pair("please don't hide me", 'the fire inside me'), 'perfect');
check('a feminine ending against a masculine one is additive', pair('down by the side', 'nobody to guide me'), 'additive');
check('light words alike are not a rhyme', pair('I walked over to find you', "and I won't hurt you"), null);
check('a line of only light words falls back to its last word', pair('it was you', "it's me and you"), 'same');

// Refrains come back in turns.
const turns = E.analyze(lex, { text: 'a verse line\nthe same line\nthe same line\n\nanother verse\nthe same line', under: '', follow: [] });
check('refrain turns', turns.refrains[0].turns.map((t) => t.count), [2, 1]);
check('each turn has its floor', turns.refrains[0].floors.map((f) => f.join(' / ')), ['a verse line', 'another verse']);

// Denied words: the shadow sentence, found from the other side.
const shadow = E.analyze(lex, { text: "I won't hurt you\nI hurt all over", under: 'I will hurt you', follow: [] });
check('surfaced under a denial', shadow.surfaced.map((x) => x.denial), ["won't hurt", null]);

// Who, stanza by stanza.
const who = E.analyze(lex, { text: 'I lost my way\n\nyou came along\nand I followed', under: '', follow: [] });
check('first appearances', who.summary.firstSeen, { I: 0, you: 2 });
check('persons by stanza', who.summary.stanzas.map((st) => Object.keys(st.persons).sort().join('+')), ['I', 'I+you']);

// Voice.
check('swap I/you', E.flipVoice("I won't hurt you", 'I', 'you'), "You won't hurt me");
check('swap mid-line', E.flipVoice("and then I told you", 'I', 'you'), 'and then you told me');
check('swap keeps punctuation', E.flipVoice('When you sleep, where do your fingers go?', 'I', 'you'), 'When I sleep, where do my fingers go?');
check('third person agrees', E.flipVoice('I am tired and I go home', 'I', 'she'), 'She is tired and she goes home');
check('capitals survive', E.flipVoice('I count the turns', 'I', 'he'), 'He counts the turns');
check('you before a helper stays a subject', E.flipVoice("You turned it over like a word you couldn't say.", 'I', 'you'), "I turned it over like a word I couldn't say.");
check('you after a verb is an object', E.flipVoice('I love you more', 'I', 'you'), 'You love me more');
check('she becomes you', E.flipVoice('she never caught a tan. I met her in the rain, her hair wet', 'she', 'you'), 'you never caught a tan. I met you in the rain, your hair wet');
check('she is becomes you are', E.flipVoice('She is the one', 'she', 'you'), 'You are the one');
check('you becomes I, both ways', E.flipVoice('you told me', 'you', 'I'), 'I told you');
check('never rewarded is no plea', one('but then never rewarded with the fruits').live[0].voice.act, 'statement');
check('never let me go pleads', one('never let me go').live[0].voice.act, 'plea');

// Gravity.
const g = E.gravity(lex, [
  { id: 'a', title: 'one', text: 'the smoke in the rain\nsmoke on the water' },
  { id: 'b', title: 'two', text: 'rain on the porch' },
]);
check('gravity ranks across pages', g.map((h) => h.lemma), ['rain', 'smoke']);

console.log(`${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
