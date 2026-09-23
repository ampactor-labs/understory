# Data notices

`lexicon.txt` and `lexicon-extra.txt` are built by `build-lexicon.py` from
three datasets. Their terms travel with the data.

## CMU Pronouncing Dictionary

Pronunciations and stress. Source: https://github.com/cmusphinx/cmudict

```
Copyright (C) 1993-2015 Carnegie Mellon University. All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions
are met:

1. Redistributions of source code must retain the above copyright
   notice, this list of conditions and the following disclaimer.
   The contents of this file are deemed to be source code.

2. Redistributions in binary form must reproduce the above copyright
   notice, this list of conditions and the following disclaimer in
   the documentation and/or other materials provided with the
   distribution.

This work was supported in part by funding from the Defense Advanced
Research Projects Agency, the Office of Naval Research and the National
Science Foundation of the United States of America, and by member
companies of the Carnegie Mellon Sphinx Speech Consortium. We acknowledge
the contributions of many volunteers to the expansion and improvement of
this dictionary.

THIS SOFTWARE IS PROVIDED BY CARNEGIE MELLON UNIVERSITY ``AS IS'' AND
ANY EXPRESSED OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL CARNEGIE MELLON UNIVERSITY
NOR ITS EMPLOYEES BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

## Concreteness ratings

Brysbaert, M., Warriner, A. B., & Kuperman, V. (2014). Concreteness ratings
for 40 thousand generally known English word lemmas. *Behavior Research
Methods*, 46, 904–911. The authors released the ratings as a free download
with the paper (their page is no longer online; a copy is mirrored at
https://github.com/ArtsEngine/concreteness). The same ratings are republished
in NoRaRe, the Database of Cross-Linguistic Norms, Ratings, and Relations for
Words and Concepts (Tjuka, Forkel & List), under CC BY 4.0:
https://norare.clld.org/contributions/Brysbaert-2014-Concreteness

Changed here: only the per-word mean is kept, rounded to one decimal; the
two-word expressions and the other columns are dropped.

## Lancaster Sensorimotor Norms

Lynott, D., Connell, L., Brysbaert, M., Brand, J., & Carney, J. (2020). The
Lancaster Sensorimotor Norms: multidimensional measures of perceptual and
action strength for 40,000 English words. *Behavior Research Methods*, 52,
1271–1291. Data: https://osf.io/7emr6/, licensed CC BY 4.0
(https://creativecommons.org/licenses/by/4.0/).

Changed here: the six perceptual means and the maximum of the foot/leg,
hand/arm and torso action means are rescaled to one digit (0–9) and
relabelled as Pattison's seven senses (sight, sound, touch, taste, smell,
body, motion). Everything else is dropped.
