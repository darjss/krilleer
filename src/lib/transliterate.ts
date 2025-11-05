// transliterate-mn.ts
// Latin (ASCII) -> Mongolian Cyrillic transliterator in TypeScript.
// Features:
// - Multigraphs matched longest-first (e.g. "sh", "ch", "ts").
// - Latin 'i' becomes 'й' when it follows a Cyrillic vowel in output.
// - Explicit mapping: 'w' -> 'ү', 'q' -> 'ө' (as requested).
// - Basic capitalization preservation (capitalize first Cyrillic letter
//   of a token if the source token starts uppercase).
//
// Usage:
//   console.log(transliterateLatinToCyrillic("bayar")); // баяр
//   console.log(transliterateLatinToCyrillic("shinii")); // шинэй or шинэи depending on i-rule
//
// Note: adapt singleMap/multigraphs to match your romanization variant.

export interface TransliterateOptions {
  preserveCase?: boolean // default true
  // asciiHarmony not necessary when using explicit w/q for ү/ө,
  // but kept for optional heuristics if you want o/u -> ө/ү
  asciiHarmony?: boolean
}

const CYRILLIC_VOWELS = new Set(["а", "э", "е", "ё", "о", "у", "ү", "ө", "ы", "и", "я", "ю"])

const MULTIGRAPHS: Record<string, string> = {
  shch: "щ",
  sch: "щ",
  kh: "х",
  ch: "ч",
  sh: "ш",
  ts: "ц",
  yo: "ё",
  yu: "ю",
  ya: "я",
  ye: "е",
  ph: "ф",
  yy: "й",
}

const SINGLE_MAP: Record<string, string> = {
  a: "а",
  b: "б",
  v: "в",
  g: "г",
  d: "д",
  e: "э", // plain e -> э (ye/je handled in multigraphs)
  ë: "ё",
  z: "з",
  i: "и", // special-case handled in runtime: may become 'й'
  j: "ж",
  y: "ы",
  k: "к",
  l: "л",
  m: "м",
  n: "н",
  o: "о",
  p: "п",
  r: "р",
  s: "с",
  t: "т",
  u: "у",
  f: "ф",
  h: "х",
  c: "ц",
  q: "ө", // explicit mapping for ө (user requested)
  w: "ү", // explicit mapping for ү (user requested)
  x: "кс",
  "'": "ь",
  "`": "ь",
  ".": ".",
  ",": ",",
  " ": " ",
}

// Public mapping pairs for UI display (Latin → Cyrillic)
export type LatinToCyrillicMapping = { latin: string; cyrillic: string; note?: string }

const EXCLUDED_FROM_DISPLAY = new Set([" ", ".", ","])

export const LATIN_TO_CYRILLIC_DISPLAY_MAPPINGS: LatinToCyrillicMapping[] = (() => {
  const pairs: LatinToCyrillicMapping[] = []

  // Multigraphs first
  for (const [latin, cyrillic] of Object.entries(MULTIGRAPHS)) {
    pairs.push({ latin, cyrillic })
  }

  
  for (const [latin, cyrillic] of Object.entries(SINGLE_MAP)) {
    if (EXCLUDED_FROM_DISPLAY.has(latin)) continue
    const mapping: LatinToCyrillicMapping = { latin, cyrillic }

    pairs.push(mapping)
  }

  pairs.sort((a, b) => b.latin.length - a.latin.length || a.latin.localeCompare(b.latin))
  return pairs
})()

// Precompute multigraph keys sorted by length desc so longest match first
const MULTI_KEYS_DESC = Object.keys(MULTIGRAPHS).sort((a, b) => b.length - a.length)

// Cache for transliteration results
const transliterationCache = new Map<string, string>()
const MAX_CACHE_SIZE = 1000

/**
 * Transliterate a Latin-input string to Mongolian Cyrillic.
 */
export function transliterateLatinToCyrillic(input: string, opts?: TransliterateOptions): string {
  // Check cache first
  const cacheKey = `${input}|${opts?.preserveCase}|${opts?.asciiHarmony}`
  if (transliterationCache.has(cacheKey)) {
    return transliterationCache.get(cacheKey)!
  }

  const options = {
    preserveCase: true,
    asciiHarmony: false,
    ...opts,
  }

  // Early return for empty input
  if (!input) {
    transliterationCache.set(cacheKey, "")
    return ""
  }

  let out = ""
  const lower = input.toLowerCase()

  // Helper: return whether a given Cyrillic char is a vowel
  const isCyrVowel = (ch: string) => {
    if (!ch) return false
    return CYRILLIC_VOWELS.has(ch.toLowerCase())
  }

  for (let i = 0; i < input.length; ) {
    const remaining = lower.slice(i)

    // Try multigraphs (longest first) - optimized with direct lookup
    let foundMultigraph = false
    for (const key of MULTI_KEYS_DESC) {
      if (remaining.startsWith(key)) {
        const cyr = MULTIGRAPHS[key]
        // preserve capitalization: if source first char of piece is uppercase,
        // uppercase the first letter of the cyrillic result.
        const srcFirst = input[i]
        const shouldCap = options.preserveCase && srcFirst !== srcFirst.toLowerCase()
        if (shouldCap && cyr.length > 0) {
          out += cyr[0].toUpperCase() + cyr.slice(1)
        } else {
          out += cyr
        }
        i += key.length
        foundMultigraph = true
        break
      }
    }
    if (foundMultigraph) continue

    // single character handling
    const srcCh = input.charAt(i)
    const lowerCh = lower.charAt(i)

    // special rule: 'i' after a Cyrillic vowel -> 'й' (semivowel)
    if (lowerCh === "i") {
      const prevCyr = out[out.length - 1]
      if (isCyrVowel(prevCyr)) {
        // produce й, respect capitalization of source char
        const shouldCap = options.preserveCase && srcCh !== srcCh.toLowerCase()
        out += shouldCap ? "Й" : "й"
      } else {
        const mapped = SINGLE_MAP[lowerCh] ?? srcCh
        const shouldCap = options.preserveCase && srcCh !== srcCh.toLowerCase()
        out += shouldCap ? mapped.toUpperCase() : mapped
      }
      i += 1
      continue
    }

    // asciiHarmony optional handling: if enabled, adapt o/u based on presence
    // of front vowels in the token (simple heuristic). Since user requested
    // explicit q/w for ө/ү, asciiHarmony is optional and off by default.
    if (options.asciiHarmony && (lowerCh === "o" || lowerCh === "u")) {
      // find token bounds (space/punct delim)
      const tokenStart = input.lastIndexOf(" ", i) + 1
      let tokenEnd = input.indexOf(" ", i)
      if (tokenEnd === -1) tokenEnd = input.length
      const token = input.slice(tokenStart, tokenEnd).toLowerCase()
      const hasFront = /[eiyäüöiy]/.test(token)
      let mapped = SINGLE_MAP[lowerCh] ?? srcCh
      if (hasFront) {
        if (lowerCh === "o") mapped = "ө"
        if (lowerCh === "u") mapped = "ү"
      } else {
        mapped = SINGLE_MAP[lowerCh] ?? srcCh
      }
      const shouldCap = options.preserveCase && srcCh !== srcCh.toLowerCase()
      out += shouldCap ? mapped.toUpperCase() : mapped
      i += 1
      continue
    }

    // default mapping for single char
    const mapped = SINGLE_MAP[lowerCh]
    if (mapped !== undefined) {
      const shouldCap = options.preserveCase && srcCh !== srcCh.toLowerCase()
      out += shouldCap ? mapped.toUpperCase() : mapped
    } else {
      // unknown char: copy as-is
      out += srcCh
    }
    i += 1
  }

  // Cache the result
  if (transliterationCache.size >= MAX_CACHE_SIZE) {
    // Clear oldest entry if cache is full
    const firstKey = transliterationCache.keys().next().value
    if (firstKey) transliterationCache.delete(firstKey)
  }
  transliterationCache.set(cacheKey, out)

  return out
}

// Reverse helper: best-effort Cyrillic -> Latin so we can keep a single
// textarea while still recognizing multigraphs typed incrementally.
// This does not aim for perfect reversibility; it just picks a canonical
// Latin spelling that round-trips with the forward mapping.
const CYR_TO_LAT: Record<string, string> = {
  "щ": "shch",
  "ш": "sh",
  "ч": "ch",
  "ц": "c", // map to 'c' so 'ch' survives the reverse step
  "ё": "yo",
  "ю": "yu",
  "я": "ya",
  "е": "ye",
  "ж": "j",
  "х": "h",
  "а": "a",
  "б": "b",
  "в": "v",
  "г": "g",
  "д": "d",
  "э": "e",
  "з": "z",
  "и": "i",
  "й": "yy",
  "к": "k",
  "л": "l",
  "м": "m",
  "н": "n",
  "о": "o",
  "п": "p",
  "р": "r",
  "с": "s",
  "т": "t",
  "у": "u",
  "ф": "f",
  "q": "q", // pass-through just in case
  "w": "w", // pass-through just in case
  "ө": "q",
  "ү": "w",
  "ы": "y",
  "ь": "'",
}

export function reverseTransliterateCyrillicToLatin(input: string): string {
  if (!input) return ""
  let out = ""
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i]
    const lower = ch.toLowerCase()
    const mapped = CYR_TO_LAT[lower]
    if (mapped !== undefined) {
      const isUpper = ch !== lower
      if (isUpper && mapped.length > 0) {
        out += mapped[0].toUpperCase() + mapped.slice(1)
      } else {
        out += mapped
      }
    } else {
      // unknown or already Latin; passthrough
      out += ch
    }
  }
  return out
}

// Example quick tests (uncomment to run):
// console.log(transliterateLatinToCyrillic("bayar")); // баяр
// console.log(transliterateLatinToCyrillic("bayar", { preserveCase: true }));
// console.log(transliterateLatinToCyrillic("w q", { preserveCase: false })); // ү ө
