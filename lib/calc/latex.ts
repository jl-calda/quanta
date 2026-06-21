/**
 * LaTeX ⇄ engine-source conversion.
 *
 * The primary editor (MathLive) speaks LaTeX; the calc engine speaks a
 * mathjs-compatible plain-text expression (`N_Rd := 0.75 * A_s * f_ub`,
 * `700 MPa * 16 mm^2`). These pure helpers bridge the two: `latexToSource`
 * lets MathLive's 2D entry round-trip through the engine, and `sourceToLatex`
 * seeds the 2D editor from an existing plain-text formula. They live in
 * `/lib/calc` because the engine is the single source of truth for the
 * expression grammar its parser accepts.
 *
 * Scope is the common engineering set — fractions, roots, super/subscripts,
 * `·`/`×`/`÷`, `\mathrm{}` units, and Greek. Exotic LaTeX (matrices, integrals,
 * `cases`, feet-inches like `5 ft 6 in`) is deferred to later editor work.
 * `latexToSource` is defensive and never throws; worst case it returns a
 * best-effort string that the engine's typed error model can surface.
 */
import { math } from "./math";
import { splitDefinition, normalizeRanges } from "./parse";

/** Greek command names mathjs accepts as symbols (it re-renders them to TeX). */
const GREEK = new Set([
  "alpha", "beta", "gamma", "delta", "epsilon", "varepsilon", "zeta", "eta",
  "theta", "vartheta", "iota", "kappa", "lambda", "mu", "nu", "xi", "pi",
  "varpi", "rho", "varrho", "sigma", "varsigma", "tau", "upsilon", "phi",
  "varphi", "chi", "psi", "omega",
  "Gamma", "Delta", "Theta", "Lambda", "Xi", "Pi", "Sigma", "Upsilon", "Phi",
  "Psi", "Omega",
]);

/** Text-style wrappers whose only effect is presentation — unwrap to contents. */
const WRAPPERS = new Set([
  "mathrm", "operatorname", "text", "textrm", "mathbf", "mathit", "mathsf",
  "mathtt", "mathnormal", "mathbb", "boldsymbol", "rm", "bf", "it",
]);

/** A bare identifier/number needs no wrapping parens in a power or group. */
function isSimpleToken(s: string): boolean {
  return /^[A-Za-z0-9.]+$/.test(s);
}

function skipSpaces(s: string, i: number): number {
  while (i < s.length && (s[i] === " " || s[i] === "~")) i++;
  return i;
}

/** Read a `{…}` (or `[…]`) balanced group; assumes `s[i] === open`. */
function readGroup(
  s: string,
  i: number,
  open = "{",
  close = "}",
): { body: string; next: number } {
  let depth = 0;
  for (let j = i; j < s.length; j++) {
    const c = s[j];
    if (c === "\\") {
      j++; // skip the escaped char
      continue;
    }
    if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) return { body: s.slice(i + 1, j), next: j + 1 };
    }
  }
  return { body: s.slice(i + 1), next: s.length };
}

/** Read the operand of a command/script: a `{group}` or a single token. */
function nextOperand(s: string, i: number): { body: string; next: number } {
  i = skipSpaces(s, i);
  if (s[i] === "{") return readGroup(s, i);
  if (s[i] === "\\") {
    const m = /^\\([a-zA-Z]+|.)/.exec(s.slice(i));
    if (m) return { body: m[0], next: i + m[0].length };
  }
  if (i < s.length) return { body: s[i], next: i + 1 };
  return { body: "", next: i };
}

function normalizeGreek(cmd: string): string {
  // mathjs has no `varphi`/`varepsilon` — fold the variants onto the base name.
  return cmd.replace(/^var/, "");
}

function convert(s: string): string {
  let out = "";
  let i = 0;
  const n = s.length;

  while (i < n) {
    const c = s[i];

    if (c === "\\") {
      const m = /^\\([a-zA-Z]+|.)/.exec(s.slice(i));
      if (!m) {
        i++;
        continue;
      }
      const cmd = m[1];
      i += m[0].length;

      if (cmd === "frac" || cmd === "dfrac" || cmd === "tfrac") {
        const a = nextOperand(s, i);
        const b = nextOperand(s, a.next);
        out += `((${convert(a.body)})/(${convert(b.body)}))`;
        i = b.next;
      } else if (cmd === "sqrt") {
        let idx = skipSpaces(s, i);
        let index: string | null = null;
        if (s[idx] === "[") {
          const br = readGroup(s, idx, "[", "]");
          index = br.body;
          idx = br.next;
        }
        const g = nextOperand(s, idx);
        const inner = convert(g.body);
        out += index !== null ? `nthRoot(${inner}, ${convert(index)})` : `sqrt(${inner})`;
        i = g.next;
      } else if (WRAPPERS.has(cmd)) {
        const g = nextOperand(s, i);
        out += convert(g.body);
        i = g.next;
      } else if (
        cmd === "left" || cmd === "right" || cmd === "bigl" || cmd === "bigr" ||
        cmd === "Bigl" || cmd === "Bigr" || cmd === "biggl" || cmd === "biggr" ||
        cmd === "Biggl" || cmd === "Biggr"
      ) {
        const idx = skipSpaces(s, i);
        if (s[idx] === ".") i = idx + 1; // \left. / \right. — drop the null delim
      } else if (cmd === "cdot" || cmd === "cdotp" || cmd === "times" || cmd === "ast") {
        out += "*";
      } else if (cmd === "div") {
        out += "/";
      } else if (cmd === "coloneq" || cmd === "coloneqq" || cmd === "Coloneq" || cmd === "Coloneqq") {
        out += ":=";
      } else if (cmd === "colon") {
        out += ":";
      } else if (cmd === "pi") {
        out += "pi";
      } else if (cmd === "infty") {
        out += "Infinity";
      } else if (
        cmd === "," || cmd === ";" || cmd === ":" || cmd === "!" || cmd === " " ||
        cmd === "quad" || cmd === "qquad" || cmd === "\\"
      ) {
        out += " ";
      } else if (cmd === "_") {
        out += "_";
      } else if (cmd === "{") {
        out += "(";
      } else if (cmd === "}") {
        out += ")";
      } else if (cmd === "%" || cmd === "displaystyle" || cmd === "textstyle") {
        // drop
      } else if (GREEK.has(cmd)) {
        out += normalizeGreek(cmd);
      } else {
        // Unknown command — best effort: drop the backslash, keep the name
        // (covers `\sin`, `\cos`, `\log`, `\max`, … which mathjs accepts).
        out += cmd;
      }
    } else if (c === "^") {
      i++;
      const g = nextOperand(s, i);
      const inner = convert(g.body);
      out += isSimpleToken(inner) ? `^${inner}` : `^(${inner})`;
      i = g.next;
    } else if (c === "_") {
      i++;
      const g = nextOperand(s, i);
      const inner = convert(g.body).replace(/\s+/g, "");
      out += `_${inner}`;
      i = g.next;
    } else if (c === "{") {
      const g = readGroup(s, i);
      const inner = convert(g.body);
      out += isSimpleToken(inner) ? inner : `(${inner})`;
      i = g.next;
    } else if (c === "}") {
      i++; // stray close — ignore
    } else if (c === "~") {
      out += " ";
      i++;
    } else if (c === "&" || c === "$") {
      i++; // alignment / inline-math markers — drop
    } else {
      out += c;
      i++;
    }
  }

  return out;
}

/**
 * Heuristic: does this pasted text look like LaTeX rather than an engine source
 * expression? Used by the math-entry paste paths to decide whether to route a
 * clipboard string through {@link latexToSource} (mono field) or insert it as
 * LaTeX into the 2D field. A backslash command, a brace group, `~`, or a script
 * with a brace operand (`x^{2}`) signals LaTeX; bare `a^2 / b` does not (the
 * engine reads it directly). Conservative on purpose — false negatives just mean
 * the text is treated as plain source, which the parser still normalizes.
 */
export function looksLikeLatex(text: string): boolean {
  return /\\[a-zA-Z]+|\\[{}\\,;!]|[{}]|~|[_^]\s*\{/.test(text);
}

/** Convert MathLive/mathjs LaTeX to the engine's plain-text expression form. */
export function latexToSource(latex: string): string {
  try {
    return (
      convert(latex)
        .replace(/\s+/g, " ")
        // Tidy the spaces LaTeX scatters around operators (`a\cdot b` → `a*b`).
        // Operator-adjacent only, so unit spacing (`12 kN`, `5 kN m`) survives.
        .replace(/\s*([+\-*/^(),])\s*/g, "$1")
        .trim()
    );
  } catch {
    return latex.trim();
  }
}

/** Render `N_Rd` → `N_{Rd}` so MathLive draws a proper subscript. */
function nameToLatex(name: string): string {
  return name.replace(/_([A-Za-z0-9]+)/g, "_{$1}");
}

/**
 * Seed the 2D editor from an existing plain-text formula. We render the
 * right-hand side with mathjs `toTex` (the engine's own LaTeX) and rebuild the
 * `name := …` assignment as literal LaTeX MathLive can parse. Falls back to the
 * raw source if the expression doesn't parse (in-progress / invalid input).
 */
export function sourceToLatex(source: string): string {
  const trimmed = source.trim();
  if (!trimmed) return "";
  const { name, expr } = splitDefinition(trimmed);
  if (!expr.trim()) return trimmed; // half-typed (`x :=`) — seed verbatim
  let rhs: string;
  try {
    rhs = math.parse(normalizeRanges(expr)).toTex();
  } catch {
    return trimmed;
  }
  return name ? `${nameToLatex(name)} := ${rhs}` : rhs;
}

/** Render a single expression to LaTeX (degrades to raw text on a parse error). */
export function exprToLatex(src: string): string {
  const t = src.trim();
  if (!t) return "";
  try {
    return math.parse(normalizeRanges(t)).toTex();
  } catch {
    return t;
  }
}

const REL_LATEX: Record<string, string> = {
  "<=": "\\le",
  ">=": "\\ge",
  "==": "=",
  "!=": "\\ne",
  "<": "<",
  ">": ">",
  "=": "=",
};

/**
 * Render a solve-block constraint (`a = b`, `a <= b`, or a chained `lo <= x <= hi`)
 * to LaTeX by splitting at top-level relational operators and rendering each side.
 * Shared by the solve-block read view and the print/export renderer.
 */
export function constraintToLatex(src: string): string {
  const sides: string[] = [];
  const ops: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (ch === "(" || ch === "[" || ch === "{") depth += 1;
    else if (ch === ")" || ch === "]" || ch === "}") depth -= 1;
    else if (depth === 0) {
      const two = src.slice(i, i + 2);
      if (two === "<=" || two === ">=" || two === "==" || two === "!=") {
        sides.push(src.slice(start, i));
        ops.push(two);
        i += 1;
        start = i + 1;
        continue;
      }
      if ((ch === "<" || ch === ">" || ch === "=") && src[i + 1] !== "=" && src[i - 1] !== ":") {
        sides.push(src.slice(start, i));
        ops.push(ch);
        start = i + 1;
      }
    }
  }
  sides.push(src.slice(start));
  if (ops.length === 0) return exprToLatex(src);
  let out = exprToLatex(sides[0]);
  for (let k = 0; k < ops.length; k += 1) out += ` ${REL_LATEX[ops[k]] ?? "="} ${exprToLatex(sides[k + 1])}`;
  return out;
}
