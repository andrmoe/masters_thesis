/* Renders references.bib into <section id="references">.
 *
 *   <a href="#key"></a>         citation; empty text is filled with "Surname 2026",
 *                               "A and B 2026" or "A et al. 2026"
 *   <a href="#key">text</a>     citation with your own text
 *   data-nocite="all"           on #references: list every entry, not just cited ones
 *
 * Links to keys that are neither in the .bib nor an id in the page get class
 * "cite-missing". fetch() does not work from file://, so preview with
 * `python -m http.server` and open http://localhost:8000/autoreproduce.html.
 */
(() => {
  const BIB_URL = "references.bib";

  // --- BibTeX parsing ----------------------------------------------------

  function parseBib(src) {
    const entries = {};
    let i = 0;
    while ((i = src.indexOf("@", i)) !== -1) {
      const m = /^@(\w+)\s*[{(]/.exec(src.slice(i));
      if (!m) { i++; continue; }
      const type = m[1].toLowerCase();
      i += m[0].length;
      if (type === "comment" || type === "string" || type === "preamble") {
        i = skipGroup(src, i - 1);
        continue;
      }
      const comma = src.indexOf(",", i);
      const key = src.slice(i, comma).trim();
      i = comma + 1;
      const fields = {};
      for (;;) {
        i = skipSpace(src, i);
        if (src[i] === "}" || src[i] === ")" || i >= src.length) { i++; break; }
        const fm = /^([\w-]+)\s*=\s*/.exec(src.slice(i));
        if (!fm) { i++; continue; }
        i += fm[0].length;
        let value;
        if (src[i] === "{") {
          const end = skipGroup(src, i);
          value = src.slice(i + 1, end - 1);
          i = end;
        } else if (src[i] === '"') {
          const end = src.indexOf('"', i + 1);
          value = src.slice(i + 1, end);
          i = end + 1;
        } else {
          const vm = /^[^,}\s]+/.exec(src.slice(i));
          value = vm[0];
          i += value.length;
        }
        fields[fm[1].toLowerCase()] = value.replace(/\s+/g, " ").trim();
        i = skipSpace(src, i);
        if (src[i] === ",") i++;
      }
      entries[key] = { key, type, fields };
    }
    return entries;
  }

  function skipSpace(s, i) {
    while (i < s.length && /\s/.test(s[i])) i++;
    return i;
  }

  // s[i] is an opening brace or parenthesis; returns the index after its match.
  function skipGroup(s, i) {
    const open = s[i], close = open === "(" ? ")" : "}";
    let depth = 0;
    for (; i < s.length; i++) {
      if (s[i] === "\\") { i++; continue; }
      if (s[i] === open) depth++;
      else if (s[i] === close && --depth === 0) return i + 1;
    }
    return s.length;
  }

  // --- LaTeX to text -----------------------------------------------------

  const ACCENTS = { '"': "̈", "'": "́", "`": "̀", "^": "̂",
                    "~": "̃", "=": "̄", ".": "̇", "c": "̧",
                    "v": "̌", "u": "̆", "H": "̋" };
  const SYMBOLS = { "&": "&", "%": "%", "$": "$", "#": "#", "_": "_",
                    "ss": "ß", "o": "ø", "O": "Ø", "aa": "å", "AA": "Å",
                    "ae": "æ", "AE": "Æ", "l": "ł", "L": "Ł", "i": "ı" };

  function delatex(s) {
    return s
      .replace(/\\([\"'`^~=.]|[cvuH](?=[\s{]))\s*\{?\\?([A-Za-z])\}?/g,
               (_, a, c) => (c === "i" ? "i" : c) + ACCENTS[a])
      .replace(/\\(ss|aa|AA|ae|AE|[oOlLi])\b\s*/g, (_, c) => SYMBOLS[c])
      .replace(/\\([&%$#_])/g, "$1")
      .replace(/---/g, "—").replace(/--/g, "–")
      .replace(/~/g, " ")
      .replace(/[{}]/g, "")
      .normalize("NFC");
  }

  // --- Names -------------------------------------------------------------

  // Returns [{ first, last }] from "A and B and C"; braced names stay whole.
  function parseNames(s) {
    return splitTopLevel(s, /\s+and\s+/).map(name => {
      name = name.trim();
      if (/^\{.*\}$/.test(name)) return { first: "", last: delatex(name) };
      const parts = splitTopLevel(name, /\s*,\s*/);
      if (parts.length >= 2) return { first: delatex(parts[parts.length - 1]), last: delatex(parts[0]) };
      const words = splitTopLevel(name, /\s+/);
      // Lowercase particles (van, von, de) belong to the surname.
      let k = words.length - 1;
      while (k > 1 && /^[a-z]/.test(words[k - 1])) k--;
      return { first: delatex(words.slice(0, k).join(" ")), last: delatex(words.slice(k).join(" ")) };
    });
  }

  // Splits on a separator only outside braces.
  function splitTopLevel(s, sep) {
    const out = [];
    let depth = 0, start = 0;
    for (let i = 0; i < s.length; i++) {
      if (s[i] === "{") depth++;
      else if (s[i] === "}") depth--;
      else if (depth === 0) {
        const m = sep.exec(s.slice(i));
        if (m && m.index === 0 && m[0].length) {
          out.push(s.slice(start, i));
          i += m[0].length - 1;
          start = i + 1;
        }
      }
    }
    out.push(s.slice(start));
    return out.filter(p => p.length);
  }

  function initials(first) {
    return first.split(/\s+/).filter(Boolean)
      .map(w => w.split("-").map(p => p[0] + ".").join("-"))
      .join(" ");
  }

  // --- Formatting --------------------------------------------------------

  const esc = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  function authorsOf(e) {
    return parseNames(e.fields.author || e.fields.editor || "");
  }

  function citeText(e) {
    const a = authorsOf(e), y = e.fields.year || "n.d.";
    if (a.length === 0) return `${delatex(e.fields.title || e.key)} ${y}`;
    if (a.length === 1) return `${a[0].last} ${y}`;
    if (a.length === 2) return `${a[0].last} and ${a[1].last} ${y}`;
    return `${a[0].last} et al. ${y}`;
  }

  function formatEntry(e) {
    const f = e.fields, t = s => esc(delatex(s));
    const authors = authorsOf(e)
      .map(n => esc([initials(n.first), n.last].filter(Boolean).join(" ")))
      .join(", ");
    const parts = [];
    if (authors) parts.push(authors + ".");
    if (f.title) parts.push(`<i>${t(f.title)}</i>.`);

    const venue = [];
    const container = f.journal || f.booktitle;
    if (container) venue.push(t(container));
    if (f.volume) venue.push(esc(f.volume) + (f.number ? `(${esc(f.number)})` : ""));
    if (f.pages) venue.push("pp. " + t(f.pages));
    if (!container && (f.archiveprefix || "").toLowerCase() === "arxiv" && f.eprint)
      venue.push(`<a href="https://arxiv.org/abs/${esc(f.eprint)}">arXiv:${esc(f.eprint)}</a>`);
    else if (!container && f.publisher) venue.push(t(f.publisher));
    if (f.year) venue.push(esc(f.year));
    if (venue.length) parts.push(venue.join(", ") + ".");

    if (f.doi) parts.push(`<a href="https://doi.org/${esc(f.doi)}">doi:${esc(f.doi)}</a>`);
    else if (f.url && !f.eprint) parts.push(`<a href="${esc(f.url)}">${esc(f.url)}</a>`);
    return parts.join(" ");
  }

  function sortKey(e) {
    const a = authorsOf(e)[0];
    return `${a ? a.last : delatex(e.fields.title || "")} ${e.fields.year || ""}`.toLowerCase();
  }

  // --- Page --------------------------------------------------------------

  async function render() {
    const section = document.getElementById("references");
    if (!section) return;
    let list = section.querySelector("ol");
    if (!list) list = section.appendChild(document.createElement("ol"));

    let entries;
    try {
      const res = await fetch(BIB_URL);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      entries = parseBib(await res.text());
    } catch (err) {
      list.innerHTML = `<li class="cite-missing">Could not load ${BIB_URL} (${esc(String(err.message || err))}).
        Pages opened from file:// cannot fetch it; run <code>python -m http.server</code> and open the page through localhost.</li>`;
      return;
    }

    const cited = new Set();
    for (const a of document.querySelectorAll('a[href^="#"]')) {
      const key = decodeURIComponent(a.getAttribute("href").slice(1));
      const e = entries[key];
      if (e) {
        cited.add(key);
        a.classList.add("cite");
        if (!a.textContent.trim()) a.textContent = citeText(e);
      } else if (key && !document.getElementById(key)) {
        a.classList.add("cite-missing");
        if (!a.textContent.trim()) a.textContent = `[${key}?]`;
        console.warn(`Citation key not found: ${key}`);
      }
    }

    const shown = section.dataset.nocite === "all" ? Object.keys(entries) : [...cited];
    list.innerHTML = shown.map(k => entries[k])
      .sort((x, y) => sortKey(x).localeCompare(sortKey(y)))
      .map(e => `<li id="${esc(e.key)}">${formatEntry(e)}</li>`)
      .join("\n");

    // The list did not exist when the browser first tried to scroll to #key.
    if (location.hash) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", render);
  else render();
})();
