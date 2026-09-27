# understory

[![Deploy to GitHub Pages](https://github.com/ampactor-labs/understory/actions/workflows/pages.yml/badge.svg)](https://github.com/ampactor-labs/understory/actions/workflows/pages.yml)

A lyric x-ray for songwriters that shows where a lyric's stresses fall, how
its lines rhyme, how concrete each line is and which senses it reaches.
Under a ground line you can bury the one sentence the song never says, and
its words light up wherever they surface in the lyric. It is plain
JavaScript in the browser with no language model or backend of its own:
rules and three public word lists make every mark, and each mark opens a
receipt showing what it came from.

**Status: prototype.** It marks stress as a line is spoken because it has no melody to read, and the hosted copy keeps pages only in the browser that saved them.

Live: https://ampactor.dev/understory/

## Quick start

```sh
bash build.sh && python3 -m http.server --directory site 8000
```

This needs only bash and Python 3; there is nothing to install. Open
http://localhost:8000/. The page opens on "Spare Key", an example lyric
written for it. Once `lexicon.txt` has loaded, each line gets an altitude
tick and a voice mark on the left, a dot under each syllable for stress,
and a rhyme letter and seven sense bars on the right. The page fetches its
word lists, so it needs the server. Opened straight from disk, it shows
plain text and the status "dictionary missing; text only".

## Usage

The mode button at the bottom left switches between write (a plain text
box) and see (the marked-up lyric). Beside it are the zoom levels. Shape
draws the whole song as an altitude contour next to a sense-o-gram, a heat
map with a row per line and a column per sense. Lines shows the altitude
ticks, each syllable's stress, the rhyme letters and the sense bars. Sounds
respells each word the way it is said ("fingers" becomes FING·gurz) and
lights the rhyme sound.

Tap any mark to open its receipt, which shows what it was computed from.
From a word's receipt you can follow the word, which lights every use of it.

In write mode, type the sentence the song never says under the ground line.
In see mode it stays blurred until you uncover it, with the lines where its
words surface listed below.

The pages button opens a drawer for new pages and for importing `.txt`,
`.md` or ChordPro files (a plain-text format for lyrics with chords). It
shows gravity, the words you keep returning to across pages, and previews
voice flips such as I ↔ you or she → you before applying them with an undo.
It copies a page as plain text, Markdown or ChordPro, or saves it as a
Markdown file. Backup and restore move every page to and from a JSON file.

## How it works

`engine.js` holds all the analysis and never touches the page, so it runs
in the browser as `window.UnderstoryEngine` and in Node for the checks.
`index.html` draws the page, fetches `lexicon.txt` and analyzes the lyric,
then fetches `lexicon-extra.txt` and analyzes it again. Each mark carries
the dictionary entries and ratings it came from, which become its receipt.

I kept language models out of it. Every mark comes from a lookup or a rule
a person could check by hand, and the same lyric and word lists always give
the same marks:

- **Stress** (which syllables a speaker leans on) comes from the CMU
  Pronouncing Dictionary, which marks the stressed vowel in each word.
- **Rhyme** compares the sounds from each line's last stressed vowel on
  with up to four line ends before it. Pairs are ranked on Pat Pattison's
  rhyme ladder, a scale from his songwriting book that runs from perfect
  rhyme down to endings that share only their consonants.
- **Altitude** is a line's average concreteness: how physical its words
  are, as people rated them from 1 (an idea) to 5 (a thing you can touch).
- **Senses** come from the Lancaster Sensorimotor Norms, ratings of how
  strongly people experience a word through each sense and through
  movement. They are folded into seven: sight, sound, touch, taste, smell,
  body and motion.
- **Voice, refrains and the understory** are rules over the words, and each
  receipt names what triggered it.

[`docs/how-it-works.md`](docs/how-it-works.md) walks through each mark with
examples. It also explains how the hosted copy keeps pages in the browser
while a private claude.ai Artifact (a page hosted inside claude.ai), built
from the same `index.html`, saves them to the viewer's Claude account.

## Data

Three public datasets feed two word lists, which `build-lexicon.py` builds
and the repo commits, so the page never fetches from the sources and keeps
working if one moves. Full citations and licence terms are in
[`NOTICE.md`](NOTICE.md).

| Dataset | Gives | Licence |
| --- | --- | --- |
| CMU Pronouncing Dictionary | pronunciation and stress | BSD-style, Carnegie Mellon University |
| Brysbaert, Warriner and Kuperman (2014) | concreteness, 1 to 5 | released with the paper; CC BY 4.0 as republished in NoRaRe |
| Lancaster Sensorimotor Norms (Lynott et al., 2020) | the seven senses | CC BY 4.0 |

`lexicon.txt` holds 55,755 words: 44,276 with a pronunciation, 37,058 with
a concreteness rating and 36,811 with a seven-sense profile, as the build
prints them. 25,477 have all three in their own entry, counted from the
file's columns. Inflections kept without ratings borrow their base word's
when the page runs. The other 80,635 pronunciations in the CMU dictionary
(names of people and places, rare spellings) go to `lexicon-extra.txt`,
loaded after first paint. The files are 1.3 MB and 1.2 MB, and the live
site sends each gzipped at about 0.5 MB (measured with `curl`).

A rebuild takes about 22 MB of downloads, which are not committed:

```sh
curl -LO https://raw.githubusercontent.com/cmusphinx/cmudict/master/cmudict.dict
curl -LO https://raw.githubusercontent.com/ArtsEngine/concreteness/master/Concreteness_ratings_Brysbaert_et_al_BRM.txt
curl -L -o lancaster.csv https://osf.io/download/48wsc/
python3 build-lexicon.py cmudict.dict Concreteness_ratings_Brysbaert_et_al_BRM.txt lancaster.csv .
```

On 27 September 2026 this reproduced both committed files byte for byte
(checked with `cmp`).

## Project layout

```text
index.html           the page, written as a claude.ai Artifact
engine.js            the analysis, which runs in the browser and in Node
lexicon*.txt         the two word lists, built by build-lexicon.py
test-engine.mjs      the engine checks
build.sh, src/       the hosted copy: head, manifest, service worker, icons
docs/                the long form of How it works
```

## Deploy

The hosted copy is a GitHub Pages project site, served at
https://ampactor.dev/understory/ under the organization's custom domain.
`.github/workflows/pages.yml` runs on every push to `main` and on manual
dispatch: `node test-engine.mjs` on Node 22, then `bash build.sh`, then a
publish of `site/`. A failing check stops the deploy. The hosted copy has a
service worker, a script that keeps the page working offline after the
first visit. `build.sh` stamps its cache name with the build time, and each
new worker deletes the older caches. The Artifact copy is republished by hand
([`docs/how-it-works.md`](docs/how-it-works.md)).

## Testing

```sh
node test-engine.mjs   # prints: 73 passed, 0 failed
```

The 73 checks compare the engine with answers known by ear. They cover each
rung of the rhyme ladder, rhymes across light words ("hide me" / "inside
me"), word lookups, stress, voice and tense, a three-stanza page, the
understory surfacing under a denial, voice flips and gravity. The Pages
workflow runs them on Node 22 before every deploy. They leave out these
parts:

- **The page.** `index.html` has no automated test. A browser pass in
  headless Chrome at a 390 × 844 viewport, in light and dark mode, checks
  that it loads, fills in marks once the word list arrives, has no
  horizontal scroll, opens receipts, renders all three zooms, re-analyzes
  after an edit, previews, applies and undoes a voice flip, keeps a new page
  across a reload and throws no page errors. It last ran on 27 September
  2026, from a script that is not in this repo.
- **Build and storage.** `build-lexicon.py` has no tests, though a rebuild
  reproduces the committed lists (see Data). Nothing checks the service
  worker or the Artifact copy's saving to a Claude account.

## Limitations

It reads how a line is spoken. In a song the melody decides which syllables
land on strong beats, and judging how well the words fit the tune (prosody)
needs a musical grid of beats and bars, which this does not have. The other
marks come from word lists and fixed rules, so they know one pronunciation
per word and cannot see context such as irony.

- **One pronunciation and one rating per spelling.** The build keeps the CMU
  dictionary's first pronunciation of each word, so "read" always sounds
  like "red". "Light" the lamp and "light" the weight share a rating.
- **One accent.** If you say "dawn" and "don" alike, the engine still hears
  two vowels and ranks the pair as consonance, the lowest rung.
- **Line ends only.** Rhyme is compared between line ends, up to four lines
  back, so rhymes inside a line are not marked.
- **Voice is guessed.** The receipt names the word it guessed from. A
  question inside a statement ("I asked where you go") reads as a statement.
- **Unknown words.** A word that no dictionary entry explains, such as a new
  name or slang, gets a spelling guess: first syllable stressed, usually no
  ratings, and any rhyme marked as estimated.
- **Browser storage.** On the hosted copy, clearing the site's data deletes
  every page. Back up from the pages drawer.
- **No published lyrics in the repo.** Lyrics are under copyright, so none
  are committed, including the two songs the engine was built around ("When
  You Sleep" by Cake and "I Won't Hurt You" by The West Coast Pop Art
  Experimental Band). Results on them cannot be reproduced from here.

## License

No license chosen yet. The word lists carry their sources' terms, set out in
[`NOTICE.md`](NOTICE.md).
