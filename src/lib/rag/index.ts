/** Lightweight tokenizer + a tiny stemmer for the lexical index. Pure. */

const STOP = new Set(
  "the a an and or of to in on for is are was were be been being with as at by it this that these those from into your you our we i he she they them his her its their what which who whom how when where why not no do does did have has had will would can could should".split(
    " ",
  ),
);

/** crude suffix stripper — good enough for BM25 recall on documents */
function stem(w: string): string {
  return w
    .replace(/(ization|izations)$/i, "ize")
    .replace(/(ing|edly|edness)$/i, "")
    .replace(/(ies)$/i, "y")
    .replace(/(es|s)$/i, (m, _g, off, s) => (s.length - off === m.length && s.length <= 4 ? m : ""))
    .replace(/(ed|ly|ment|ness|tion|sion)$/i, "");
}

export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9][a-z0-9'-]*/g) || [])
    .map((w) => w.replace(/^'+|'+$/g, ""))
    .filter((w) => w.length > 1 && !STOP.has(w))
    .map(stem)
    .filter((w) => w.length > 1);
}

/** Build the term list stored per chunk in the (encrypted) manifest. */
export function termsFor(text: string): string[] {
  return tokenize(text);
}
