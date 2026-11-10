# Content schemas — Parlance (Legal & HR English for a French HR consultant)

Audience: a French HR consultant, intermediate English (B1-B2) aiming at C1, who works
exclusively in English. Reference law: FRENCH employment law explained in English, with the
British and American equivalents always shown side by side.
Goal of all content: elegant, natural English as used by an educated native professional —
never textbook English, never calques from French.

Conventions (all files):
- UTF-8 JSON, no comments, no trailing commas. Typographic apostrophes are NOT wanted: use ' and ".
- English text: UK variants in British spelling, US variants in American spelling.
- Fields ending in `_fr` are written in French (short, precise, professional tone).
- In example sentences the target expression is wrapped in double square brackets: `She is still [[on probation]].`
  Exactly one [[...]] per example sentence.
- `variety`: "both" | "uk" | "us".  `register`: "formal" | "everyday" | "informal".
- IPA: broad phonemic transcription between slashes, with stress marks, e.g. "/prəˈbeɪʃ(ə)n/".
- Never invent statutes, case names, article numbers or figures. Describe legal notions accurately and
  generally; if a notion differs between France, the UK and the US, say so in `note_fr`.

## entries-<theme>.json — array of entries
{
  "id": "ct-001",                      // unique, theme prefix + number
  "level": 1,                          // 1 = core, 2 = intermediate, 3 = advanced
  "fr": "période d'essai",
  "term": {"uk": "probationary period", "us": "probationary period"},   // neutral professional headword; identical strings if no difference
  "ipa": {"uk": "/.../", "us": "/.../"},
  "def": "Plain-English definition, one sentence.",
  "registers": {
    "formal":   {"uk": "...", "us": "...", "ex": "Sentence with [[target]]."},
    "everyday": {"uk": "...", "us": "...", "ex": "Sentence with [[target]]."},
    "informal": null                   // or same object shape when a genuine colloquial form exists
  },
  "collocations": ["to serve a probationary period", "to extend probation"],   // 2 to 4
  "note_fr": "Piège, faux ami, différence UK/US ou différence juridique. Une ou deux phrases.",
  "french_concept": false,             // true when there is no direct UK/US equivalent (CDI, CSE, ...)
  "explain": null                      // when french_concept is true: {"written": "formal one-sentence gloss for a document", "spoken": "simple way to say it in a meeting"}
}
The [[target]] of each register's `ex` must be (a natural inflection of) that register's UK expression;
if the US wording would differ in the sentence, add `"ex_us": "..."` in that register object.
