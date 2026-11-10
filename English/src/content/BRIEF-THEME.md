# Brief for writing one theme of Parlance

Read `SCHEMA.md` (same folder) first: audience, conventions, and the exact JSON shape of a vocabulary entry.
The finished model theme is `entries-contract.json` and `skills-contract.json` (same folder). Look at a few
items of each to match depth, tone and quality (use a short Python snippet to print 3-4 items; do not dump the files).
Reference law: FRENCH employment law explained in English, with British and American equivalents side by side.

You write TWO files for your theme (id `<theme>`, id prefix `<p>`):

## 1. entries-<theme>.json — exactly 100 entries, ids <p>-001 to <p>-100
- Shape: see SCHEMA.md. About 35 entries level 1, 40 level 2, 25 level 3.
- A majority of collocations and full expressions rather than isolated nouns.
- Do NOT repeat an expression already in entries-contract.json (print its `fr` and `term.uk` lists and check).
  Stay inside the scope given for your theme: neighbouring themes are written by other people in parallel.
- French notions with no direct equivalent: `french_concept` true and `explain.written` / `explain.spoken` filled.
- Registers: formal = contract / official letter / policy wording; everyday = what a native professional says in a
  meeting or an email (phrasal verbs, contractions where natural); informal only when a genuine colloquial form
  exists, otherwise null. UK/US: the real difference where there is one, identical strings otherwise.
- `note_fr`: the most useful warning for a French speaker (faux ami, calque, legal difference between countries).
- IPA for both varieties. Never invent statutes, article numbers, case names or figures.

## 2. skills-<theme>.json — one object
{
 "reading": [ 4 items
   {"id":"rd-<p>-1","title":"...","kind":"contract clause|policy extract|long email|client memo|letter|report extract","level":1-3,
    "paragraphs":["..."],                         // 180-320 words in total, in the style of the real document
    "glossary":[{"term":"...","plain":"plain-English meaning","fr":"..."}],   // 5-8, terms verbatim in the text
    "legalese":[{"phrase":"...","plain":"..."}],  // 0-5, verbatim in the text
    "questions":[{"q":"...","options":["..","..","..",".."],"answer":0,"explain_fr":"..."}]   // 4, vary the answer position
   }],
 "writing": [ 6 items, two per stage
   {"id":"wr-<p>-1","title":"...","stage":1,     // 1 complete sentences, 2 paragraph from an outline, 3 whole document
    "kind":"email|meeting minutes|client note|formal letter|contract clause|report",
    "brief":"...","brief_fr":"...",
    "gaps":[{"text":"... ___ ...","answer":"...","accept":["..."],"explain_fr":"..."}],   // stage 1 only: 6 gaps, exactly one ___ each; else []
    "outline":["..."],                            // stage 2 and 3: 3-6 points; stage 1: []
    "model":"Full model answer (\n\n between paragraphs).",
    "model_us":null,                              // or the US version when wording / spelling / date format differ noticeably
    "commentary":[{"quote":"verbatim excerpt of model","note_fr":"..."}],   // 4-6
    "checklist":["..."],                          // 4-6 self-assessment questions
    "phrasebank":["..."]                          // 5-8 reusable formulas
   }],
 "dialogues": [ 4 items, two "uk" and two "us"
   {"id":"dl-<p>-1","title":"...","context":"...","context_fr":"...","variety":"uk",
    "lines":[{"speaker":"Anna","text":"...","note_fr":null}],   // 10-14 lines of natural spoken professional English; note_fr on the lines worth a comment
    "questions":[{"q":"...","options":["..","..","..",".."],"answer":0,"explain_fr":"..."}]   // 3
   }],
 "roleplays": [ 4 items
   {"id":"rp-<p>-1","title":"...","situation":"...","situation_fr":"...",
    "turns":[{"say":"What the other person says.","seconds":30,"model":"Model answer, 2-4 sentences.","tips_fr":"..."}]   // 4-5 turns
   }],
 "functional": [ 3 items — moves of conversation SPECIFIC to your theme's situations
   {"function":"...","function_fr":"...","phrases":[{"text":"...","register":"formal|everyday|informal","variety":"both|uk|us"}]}   // 6-8 phrases each
 ]
}
Do not reuse these generic functions, already covered: taking the floor, interrupting politely, asking for clarification,
rephrasing, disagreeing tactfully, buying time, summarising and closing, small talk before a meeting.

Style for everything: an educated native professional. Varied sentence length, natural linking words, softeners
("I'm afraid", "it might be worth"), no overuse of "moreover / indeed"; British understatement in UK items, a more
direct style in US items. Scenario details (names, dates, amounts) may be fictional; legal rules must stay general and accurate.

## Before reporting
Validate both files with a Python script kept in /tmp: files parse; 100 entries, unique ids, required fields present;
every `ex` / `ex_us` has exactly one [[...]]; french_concept implies a filled explain; skills counts as specified;
every `answer` index in range and no duplicate options; glossary terms, legalese phrases and commentary quotes appear
verbatim (case-insensitive for glossary/legalese) in their text / model; every gap has exactly one "___".
Then run `python3 /home/user/hips/Tools/build-english.py` and fix anything it reports about YOUR files.
Create no other file in the repository. Do not commit, do not push.

Report in under 80 words: counts, and the ids you are unsure about (legal accuracy, IPA).
