const HASHTAG = /(#[\p{L}\p{N}_]+)/gu;
const IS_HASHTAG = /^#[\p{L}\p{N}_]+$/u;

// Splits a caption into plain text and hashtag parts, e.g. "oi #rock!" ->
// [{ text: "oi " }, { text: "#rock", tag: "rock" }, { text: "!" }].
export const splitHashtags = (text = '') =>
    text
        .split(HASHTAG)
        .filter(Boolean)
        .map((part) => (IS_HASHTAG.test(part) ? { text: part, tag: part.slice(1) } : { text: part }));
