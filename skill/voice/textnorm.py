"""Text helpers for the voice pipeline: spell out numbers, and compare what was said with what was meant.
From stage 0's voice tools (stage0/voice/tools/textnorm.py), with decimals and ordinals added. Plain Python:
it runs in any of the environments, and in the skill itself."""
import difflib
import re
import unicodedata

ONES = ("zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen "
        "fifteen sixteen seventeen eighteen nineteen").split()
TENS = "_ _ twenty thirty forty fifty sixty seventy eighty ninety".split()
ORDINAL = {"one": "first", "two": "second", "three": "third", "five": "fifth", "eight": "eighth", "nine": "ninth", "twelve": "twelfth"}
# Words a recogniser may write either way: spellings, and words that sound the same (it can't tell "sea"
# from "see"). Compared as the same word.
SAME = {"kilometers": "kilometres", "km": "kilometres", "kilometer": "kilometre", "meters": "metres", "meter": "metre",
        "centre": "center", "colour": "color", "colours": "colors", "coloured": "colored", "vapour": "vapor", "ok": "okay",
        "see": "sea", "seas": "sea", "sees": "sea", "too": "to", "two": "to", "their": "there", "theyre": "there",
        "hear": "here", "its": "it's", "whether": "weather", "whole": "hole", "for": "four", "right": "write", "knew": "new",
        # names a recogniser writes the way it knows them, said the way `say` spells them
        "noaa": "noah"}


def number_words(n):
    """English words for 0..999999999, read as a quantity, without "and"."""
    if n < 20:
        return ONES[n]
    if n < 100:
        return TENS[n // 10] + ("" if n % 10 == 0 else " " + ONES[n % 10])
    if n < 1000:
        rest = n % 100
        return ONES[n // 100] + " hundred" + ("" if rest == 0 else " " + number_words(rest))
    if n < 1000000:
        rest = n % 1000
        head = number_words(n // 1000) + " thousand"
        return head if rest == 0 else head + " " + number_words(rest)
    rest = n % 1000000
    head = number_words(n // 1000000) + " million"
    return head if rest == 0 else head + " " + number_words(rest)


def year_words(n):
    """1999 as nineteen ninety nine, 2005 as two thousand five: how a year is read."""
    if 1100 <= n <= 1999 or 2010 <= n <= 2099:
        hi, lo = divmod(n, 100)
        return number_words(hi) + (" hundred" if lo == 0 else (" oh " + ONES[lo] if lo < 10 else " " + number_words(lo)))
    return number_words(n)


def ordinal_words(n):
    words = number_words(n).split()
    last = words[-1]
    words[-1] = ORDINAL.get(last, (last[:-1] + "ieth") if last.endswith("y") else last + "th")
    return " ".join(words)


def spell_numbers(text, years=False):
    text = re.sub(r"(?<=\d),(?=\d{3})", "", text)
    text = re.sub(r"\s*(?:1⁄2|½)", " and a half", text)  # 26 1/2 (as a recogniser writes it): twenty-six and a half
    text = re.sub(r"(\d+)(st|nd|rd|th)\b", lambda m: ordinal_words(int(m.group(1))), text)
    text = re.sub(r"(\d+)\.(\d+)", lambda m: number_words(int(m.group(1))) + " point " + " ".join(ONES[int(d)] for d in m.group(2)), text)
    text = text.replace("%", " percent")
    return re.sub(r"\d+", lambda m: (year_words if years else number_words)(int(m.group())), text)


def strip_accents(text):
    return "".join(c for c in unicodedata.normalize("NFKD", text) if not unicodedata.combining(c))


def words(text, spell=False, years=False):
    text = re.sub(r"(?<=\d),(?=\d{3})", "", text)
    if spell:
        text = spell_numbers(text, years)
    text = strip_accents(text.lower()).replace("’", "'")
    # "they're" and "there are" sound the same, and a recogniser writes either
    text = re.sub(r"\bthey're\b", "there are", text)
    # "four hundred and eighty" is how a number is said; "four hundred eighty" how it's spelled out here
    text = re.sub(r"\b(hundred|thousand|million) and (?=(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)\b)", r"\1 ", text)
    text = re.sub(r"[-–—]", " ", text)
    text = re.sub(r"[^a-z0-9' ]", " ", text).replace("'", "")
    return [SAME.get(w, w) for w in text.split()]


def diff(expected, heard):
    """Word-level differences between two sentences, as a list of readable strings: the fewest of the ways
    of reading the numbers in them."""
    best = None
    for spell, years in ((False, False), (True, False), (True, True)):
        a, b = words(expected, spell, years), words(heard, spell, years)
        ops = []
        for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
            if tag == "equal":
                continue
            want, got = " ".join(a[i1:i2]), " ".join(b[j1:j2])
            if want.replace(" ", "") == got.replace(" ", ""):
                continue  # only the spacing differs
            close = difflib.SequenceMatcher(None, want, got).ratio()
            ops.append({"expected": want, "heard": got, "similarity": round(close, 2), "words": max(i2 - i1, j2 - j1)})
        if best is None or sum(o["words"] for o in ops) < sum(o["words"] for o in best):
            best = ops
    return best


def verdict(ops):
    """ok: the same words. minor: one near-miss spelling. flag: anything bigger."""
    if not ops:
        return "ok"
    if len(ops) == 1 and ops[0]["words"] <= 2 and ops[0]["similarity"] >= 0.7:
        return "minor"
    return "flag"


def spoken_letters(word):
    """The letters an English aligner should hear for one written word, as a list of spoken words."""
    text = strip_accents(spell_numbers(word, years=bool(re.fullmatch(r"\d{4}\W*", word)))).upper().replace("’", "'")
    text = re.sub(r"[-–—/]", " ", text)
    return re.sub(r"[^A-Z' ]", "", text).split()
