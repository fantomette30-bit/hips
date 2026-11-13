# Brief for writing extra grammar lessons for Parlance

Read `SCHEMA.md` (same folder) for the audience and conventions. The learner is a French senior HR and
labour-relations director (upper-intermediate, aiming at C1) who works entirely in English with US, UK and
Indian head offices. Every example and exercise sentence must be set in an HR / employment-law / management
workplace context and sound like an educated native professional. No invented statutes or figures.

Look at the six existing lessons to match depth and tone: print two of them with a short Python snippet from
`language.json` (key `grammar`); do not dump the whole file.

## Output: ONE JSON file, an array of lesson objects, each exactly:
{
 "id": "gr-xxx",                       // given in your task
 "track": "legal" | "intermediate" | "advanced" | "writing",   // given in your task
 "title": "Short English title",
 "title_fr": "Titre français court",
 "points": [                           // 4 to 6 points
   {"rule": "One or two sentences in plain English.",
    "rule_fr": "La règle en français, précise, avec le piège pour un francophone.",
    "examples": [                      // 2 or 3 per point
      {"wrong": "Typical French speaker's error as a full sentence, or null",
       "right": "The correct sentence with exactly one [[target]] marking the key words.",
       "note_fr": "Pourquoi, en une phrase."}
    ]}
 ],
 "exercises": [                        // exactly 12: 5 "mcq", 4 "gap", 3 "rewrite", in that order
   {"type": "mcq", "prompt": "Sentence with ___ (or a question)", "options": ["..","..","..",".."], "answer": 0, "explain_fr": "..."},
   {"type": "gap", "prompt": "Sentence with ___ (base word in brackets if useful).", "answer": "...", "accept": ["other correct forms"], "explain_fr": "..."},
   {"type": "rewrite", "prompt": "Instruction + sentence to rewrite or two sentences to combine.", "answer": "...", "accept": ["other fully correct versions"], "explain_fr": "..."}
 ]
}

## Rules
- At least 6 examples per lesson must have a non-null `wrong`: a realistic error (calque, wrong tense, wrong
  preposition...). `wrong` must differ from `right` once the [[ ]] are removed, and must be genuinely incorrect
  or clearly unnatural, never merely a less elegant alternative.
- `right` contains exactly one [[...]].
- mcq: exactly 4 distinct options, only ONE defensible answer; vary the position of the correct answer across
  the lesson (do not leave it at index 0). The 3 distractors should be the mistakes learners really make.
- gap: exactly one `___` in the prompt; the answer is 1 to 4 words; put every other acceptable form in `accept`
  (contractions, UK/US variants). Never a gap with several equally good answers that you do not list.
- rewrite: production, not recognition; `accept` lists the realistic alternative correct answers.
- Where British and American usage differ, say so in `rule_fr` or `note_fr` and accept both in exercises unless
  the prompt names the variety.
- Plain ASCII apostrophes and quotes.

## Before reporting
Validate with a Python script kept in a /tmp folder named after your file: file parses; ids and tracks as
assigned; 4-6 points; each example `right` has exactly one [[...]]; >= 6 non-null `wrong` per lesson and none
equal to its `right` without brackets; exactly 12 exercises in the 5/4/3 order; mcq answers in range with 4
distinct options and not all at the same index; every gap prompt has exactly one ___; answers non-empty.
Create no other file in the repository. Do not commit. Do not run the build script.
Report in under 60 words: lessons written, and any rule you are unsure about.
