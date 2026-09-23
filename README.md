# understory

Understory is a lyric x-ray for songwriters. Write or paste a lyric and it
shows what is under the words: where the stresses fall, how each rhyme lands,
how far each line floats from things you can touch, which of the seven senses
it reaches, who is talking to whom, and which lines come back and what they
land on each time. Below a ground line sits the understory, the one sentence
the song never says, and its words light up if they surface in the lyric.
There is no AI and no server: three public word lists and a page of rules run
in the browser, and every mark opens a receipt showing exactly what it was
computed from.

**Status: Prototype.** The x-ray works on any lyric; it reads how a line is spoken, not how it is sung, and pages are saved only in the browser that wrote them.

Live at **[ampactor.dev/understory](https://ampactor.dev/understory/)**. It
opens on "Spare Key," an example written for the instrument so the first look
has something under it.

## Measured

- **55,755 words** in `lexicon.txt`: 44,276 with pronunciation and stress,
  37,058 with a concreteness rating, 36,811 with a seven-sense profile.
  **80,635 more pronunciations** (names, places, rare spellings) in
  `lexicon-extra.txt`, loaded after first paint. About 1.3 MB each, 0.5 MB
  each gzipped.
- **73 engine checks** pass: Pattison's rhyme ladder one rung at a time,
  rhymes that run across light words ("GUIDE me / inSIDE me"), stress, voice,
  refrains in turns, the understory surfacing and surfacing denied, voice
  flips.
- On the two songs it was built around (lyrics are not in this repo): "When
  You Sleep" (Cake, 1998) is 24 questions in 36 lines and never says "I";
  "I Won't Hurt You" (The West Coast Pop Art Experimental Band, 1967) is 17
  promises in 32 lines, no questions, its refrain returning in turns of four,
  four, then eight.

## How it works

No language model is involved anywhere. Every mark comes from a lookup or a
rule you could check by hand.

- **Sound** comes from the CMU Pronouncing Dictionary, which spells each word
  in phonemes and marks which vowel is stressed. "Inside" is `IH2 N S AY1 D`:
  the second syllable carries the stress. One-syllable function words (the,
  a, you, me) are read light, the way speech says them.
- **Rhyme** takes each line's last stressed word, carries up to two light
  words after it, and compares everything from the stressed vowel on.
  "Hide me" and "inside me" both come out `AY D M IY`, with different sounds
  before the vowel, so that is a perfect rhyme. Different endings are ranked
  on Pat Pattison's ladder: family (the final consonants are made the same
  way: rub / dug), additive (one runs on past the other: free / freed),
  assonance (vowel only), consonance (ending only).
- **Altitude** is the average concreteness of a line's meaningful words, from
  ratings people gave 37,000 words on a 1 (idea) to 5 (thing you can touch)
  scale. "Pride" is 1.7; "knife" is 4.9. "Fingers" borrows "finger"'s rating
  through a small set of inflection rules.
- **Senses** come from the Lancaster Sensorimotor Norms, where people rated
  how strongly they experience each word by sight, sound, touch, taste,
  smell, inside the body, and through action. Those fold into Pattison's
  seven senses; each bar is the strongest word on the line for that sense.
- **Voice** is rules with the trigger shown: a question mark or a question's
  opening ("where do," "do they"); "I will / I won't" for a promise; a line
  that starts on a verb for a plea. Pronouns say who is in the line.
- **Refrains** are whole lines that repeat, grouped into turns when they
  repeat back to back, each with the two lines it lands on.
- **The understory** matches the dictionary forms of the buried sentence's
  words against the lyric's. A match right after a negation ("won't hurt")
  is marked as said and denied.

Same lyric in, same marks out, every time. Nothing typed leaves the device;
the only network requests are the page's own files and its fonts.

## Usage

- **see / write**: the dark button. Write is a plain text box; see is the
  x-ray.
- **shape · lines · sounds**: zoom. Shape is the whole song as an altitude
  contour beside a sense-o-gram (a spectrogram of the senses: time runs down,
  seven bands across). Lines is every syllable's stress, the rhyme letters,
  and a seven-band meter. Sounds spells each word the way it is said and
  lights the rhyme sound.
- **Tap anything.** Every dot, letter and bar has a receipt.
- **The ground**: in write mode, type the sentence the song never says under
  the ground line. In see mode it stays blurred until uncovered.
- **Pages**: new page, import a text file, gravity (the words you return to
  across pages), voice flips as a preview (she → you, I ↔ you, I → she),
  copy as text, Markdown or ChordPro, backup and restore.

To run it locally:

```sh
bash build.sh && python3 -m http.server --directory site 8000
```

## Two homes, one source

`index.html` is the only page source. It is written as a claude.ai Artifact:
no `<html>` or `<head>`, which the Artifact host supplies. `build.sh` wraps
it in a real document with a manifest, icons, and a service worker for the
hosted copy.

- **ampactor.dev/understory** saves pages in the browser (`localStorage`) and
  works offline after the first visit. Back up from the pages drawer.
- **The Artifact copy** (private, https://claude.ai/artifact/C6Rb7rK4CGtppYrJF5cCXS)
  is the same file with `engine.js` and both word lists as its files. It
  saves each viewer's pages to their own account through the Artifact's `db`
  and `user` capabilities, and saves files through `downloads`. Republishing
  it means passing that URL as `url`, or a second artifact appears.

## Weak spots

It reads words, not songs. The stress lane shows how a line is spoken; where
a melody puts the stress is the real prosody, and that needs a musical grid
this doesn't have.

- **One accent.** Pronunciations are General American. If your mouth rhymes
  "caught" and "cot," it will hear rhymes this can't.
- **Voice is guessed.** The receipt names the word it guessed from. A
  statement with a question inside it reads as a statement.
- **One rating per spelling.** "Light" the lamp and "light" the weight share
  a concreteness rating.
- **Names and slang** fall back to a spelling guess: first syllable stressed,
  no ratings, rhymes marked as estimated.
- **Irony is invisible.** No word list can see a joke.
- **Browser storage is one cleared cache from gone.** Back up.
- Pasting a published lyric to study it is fine; committing one here is not.

## Verification

```sh
node test-engine.mjs      # 73 passed, 0 failed
```

The Pages workflow runs the same checks before every deploy. Beyond them,
the page has had headless-Chrome passes at 390 × 844 in light and dark: it
loads, fills in marks when the dictionary arrives, has no horizontal scroll,
opens receipts, renders all three zooms, re-analyzes after an edit, previews,
applies and undoes a voice flip, keeps a new page across a reload, and throws
no page errors.

## Files

| | |
|---|---|
| `index.html` | the instrument, as an Artifact page |
| `engine.js` | the analysis; no DOM, runs in the browser and in node |
| `lexicon.txt`, `lexicon-extra.txt` | the word lists, one word per line |
| `build-lexicon.py` | builds the word lists from the three datasets |
| `test-engine.mjs` | the engine checks |
| `build.sh`, `src/` | the hosted wrapper: head, manifest, service worker, icons |

## Rebuilding the data

```sh
curl -LO https://raw.githubusercontent.com/cmusphinx/cmudict/master/cmudict.dict
curl -LO https://raw.githubusercontent.com/ArtsEngine/concreteness/master/Concreteness_ratings_Brysbaert_et_al_BRM.txt
curl -L -o lancaster.csv https://osf.io/download/48wsc/
python3 build-lexicon.py cmudict.dict Concreteness_ratings_Brysbaert_et_al_BRM.txt lancaster.csv .
```

The raw downloads are not committed; the two built files are, so the
instrument runs offline and keeps running if a source moves. Credits and
licences are in [`NOTICE.md`](NOTICE.md).
