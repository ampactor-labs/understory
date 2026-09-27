# How understory reads a lyric

This is the long form of the README's "How it works" section. Every mark
comes from a lookup in one of three public word lists or from a fixed rule,
and each mark's receipt on the page shows the dictionary entries and ratings
behind it. The examples below come from `engine.js` and the word lists, and
`test-engine.mjs` checks most of them.

## Stress

Stress is which syllables a speaker leans on. The CMU Pronouncing
Dictionary spells each word in phonemes (the separate sounds of speech) and
marks each vowel's stress. In "inside", `IH2 N S AY1 D`, the 1 marks the
main stress and the 2 a lighter one. One-syllable function words (small
grammatical words such as the, a, you, me) are read light, the way speech
says them. A word the dictionary lacks is built from a dictionary word when
it can be ("cryin'" from "crying"). Otherwise its stress is guessed from its
spelling, with the first syllable stressed.

## Rhyme

A line's rhyme starts at its last stressed word and carries up to two light
words after it. Everything from the stressed vowel on is compared with up
to four line ends before it. "Hide me" and "inside me" both end `AY D M IY`,
with different sounds before the vowel, so they are a perfect rhyme.

Pairs are ranked on Pat Pattison's rhyme ladder, a scale of rhyme types
from his book *Writing Better Lyrics*, strongest first:

| Rung | What matches | Example |
| --- | --- | --- |
| perfect | the vowel and the ending, with a different sound before the vowel | day / say |
| family | the vowel; the endings are made the same way | rub / dug |
| additive | the vowel; one ending runs on past the other | free / freed |
| assonance | the vowel only | love / touch |
| consonance | the ending only | love / leave |

A pair whose sounds also match before the vowel (leave / believe) is marked
identity, which the engine ranks between additive and assonance. The rhyme
letters beside each line group the lines linked at assonance or stronger,
plus every return of a refrain. A line with no partner gets `x`.

## Altitude

Altitude is a line's average concreteness: how physical its words are.
Brysbaert, Warriner and Kuperman (2014) had people rate 37,058 single words
on a scale from 1 (an idea) to 5 (a thing you can touch). "Pride" is 1.7
and "knife" is 4.9. The page places each line between the ground (things
you can touch) and the sky (ideas). Inflected words borrow a rating through
a small set of rules, so "fingers" reads as "finger". Function words and
unrated words do not count toward the average.

## Senses

The Lancaster Sensorimotor Norms (Lynott et al., 2020) are ratings of 39,707
words for how strongly people experience each one through six senses (the
usual five plus interoception, the feeling inside the body) and through
action with five parts of the body. `build-lexicon.py` folds these into
Pattison's seven senses: sight, sound, touch, taste, smell, body and motion.
Motion is the strongest of the leg, hand and torso ratings. Each of a
line's seven bars shows its strongest word for that sense.

## Voice

Voice is a set of rules, and each receipt names its trigger. A question
mark or a question's opening ("where do", "do they") marks a question. "I
will" or "I won't" marks a promise, and a line that starts on a verb marks
a plea. Pronouns say who is in the line, and markers such as "will" and
"was" set its tense.

## Refrains

Refrains are whole lines that repeat. Repeats on back-to-back lines form one
turn, and each turn shows the two lines before it, so you can read what
changed around words that did not.

## The understory

The understory is the one sentence the song never says, typed under the
ground line. The engine matches the dictionary forms of its content words
against the lyric's, leaving out very common words such as "be" and "have".
A match one or two words after a negation ("won't hurt") is marked as said
and denied.

## One page, two copies

`index.html` is the only page source. It is written as a claude.ai Artifact
(a page hosted inside claude.ai), so it has no `<html>` or `<head>`: the
host adds them. `build.sh` wraps it in a full document for the hosted copy
and adds a web manifest, icons and a service worker (a script the browser
keeps so the page works offline after the first visit). The Artifact's
frame does not allow a service worker, so only the hosted copy has one.

Understory has no accounts of its own. Where pages are kept depends on the
copy:

- **ampactor.dev/understory** has no sign-in. It keeps pages in the
  browser's `localStorage`, and nothing typed there leaves the browser. Its
  only network requests are the page's own files and its Google Fonts.
- **The Artifact copy** is published from the same `index.html`, with
  `engine.js` and both word lists beside it. Opened on claude.ai, it saves
  each viewer's pages under the Claude account they are signed in with,
  through the Artifact's `db` and `user` capabilities, so the pages follow
  them to any device. Files save through its `downloads` capability.

The Artifact copy is published by hand from `index.html`, `engine.js` and
the two word lists, at the private address
`https://claude.ai/artifact/C6Rb7rK4CGtppYrJF5cCXS`. Update it by
republishing to that address; publishing without it creates a second one.
