"""Shared text helpers: spell out numbers and compare two sentences word by word."""
import difflib
import re
import unicodedata

ONES = ("zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen "
        "fifteen sixteen seventeen eighteen nineteen").split()
TENS = "_ _ twenty thirty forty fifty sixty seventy eighty ninety".split()
SAME = {"kilometers": "kilometres", "km": "kilometres", "kilometer": "kilometre"}


def number_words(n):
    """English words for 0..999999, read as a quantity, without "and"."""
    if n < 20:
        return ONES[n]
    if n < 100:
        return TENS[n // 10] + ("" if n % 10 == 0 else " " + ONES[n % 10])
    if n < 1000:
        rest = n % 100
        return ONES[n // 100] + " hundred" + ("" if rest == 0 else " " + number_words(rest))
    rest = n % 1000
    head = number_words(n // 1000) + " thousand"
    return head if rest == 0 else head + " " + number_words(rest)


def spell_numbers(text):
    text = re.sub(r"(?<=\d),(?=\d{3})", "", text)
    return re.sub(r"\d+", lambda m: number_words(int(m.group())), text)


def strip_accents(text):
    return "".join(c for c in unicodedata.normalize("NFKD", text) if not unicodedata.combining(c))


def words(text, spell=False):
    text = re.sub(r"(?<=\d),(?=\d{3})", "", text)
    if spell:
        text = spell_numbers(text)
    text = strip_accents(text.lower()).replace("’", "'")
    text = re.sub(r"[-–—]", " ", text)
    text = re.sub(r"[^a-z0-9' ]", " ", text).replace("'", "")
    return [SAME.get(w, w) for w in text.split()]


def diff(expected, heard):
    """Word-level differences between two sentences, as a list of readable strings."""
    best = None
    for spell in (False, True):
        a, b = words(expected, spell), words(heard, spell)
        ops = []
        for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
            if tag == "equal":
                continue
            want, got = " ".join(a[i1:i2]), " ".join(b[j1:j2])
            if want.replace(" ", "") == got.replace(" ", ""):
                continue  # only the spacing differs
            close = difflib.SequenceMatcher(None, want, got).ratio()
            ops.append({"expected": want, "heard": got, "similarity": round(close, 2),
                        "words": max(i2 - i1, j2 - j1)})
        if best is None or sum(o["words"] for o in ops) < sum(o["words"] for o in best):
            best = ops
    return best


def verdict(ops):
    """ok: same words. minor: one near-miss spelling. flag: anything bigger."""
    if not ops:
        return "ok"
    if len(ops) == 1 and ops[0]["words"] <= 2 and ops[0]["similarity"] >= 0.7:
        return "minor"
    return "flag"
