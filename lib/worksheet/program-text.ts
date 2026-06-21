/**
 * Program body ↔ indented-text bridge (pure).
 *
 * The program region stores its body as a structured {@link ProgramStatement}
 * tree (so the read view renders the exact Mathcad 2D layout and the engine
 * evaluates structure, not parsed text). The inspector, however, edits the body
 * as plain indented text — fast to type, diffable, and Mathcad-like:
 *
 *   result := 1
 *   if n > 1
 *     for i in 2..n
 *       result := result * i
 *   return result
 *
 * This module converts between the two. It is lenient on parse (an unreadable
 * line never throws — the engine surfaces the typed error when it evaluates) and
 * stable on round-trip, so editing through the inspector is non-lossy.
 */
import type { ProgramStatement } from "@/lib/calc";

const INDENT = "  ";

/* ------------------------------------------------------------------ *
 * Serialize: structure → indented text
 * ------------------------------------------------------------------ */

export function programBodyToText(body: ProgramStatement[]): string {
  return writeBlock(body, 0).join("\n");
}

function writeBlock(stmts: ProgramStatement[], depth: number): string[] {
  const out: string[] = [];
  const pad = INDENT.repeat(depth);
  for (const stmt of stmts) {
    switch (stmt.kind) {
      case "assign":
        out.push(`${pad}${stmt.target} := ${stmt.expr}`);
        break;
      case "return":
        out.push(`${pad}return ${stmt.expr}`);
        break;
      case "if":
        stmt.branches.forEach((b, i) => {
          out.push(`${pad}${i === 0 ? "if" : "else if"} ${b.cond}`);
          out.push(...writeBlock(b.body, depth + 1));
        });
        if (stmt.otherwise && stmt.otherwise.length > 0) {
          out.push(`${pad}otherwise`);
          out.push(...writeBlock(stmt.otherwise, depth + 1));
        }
        break;
      case "for":
        out.push(`${pad}for ${stmt.var} in ${stmt.from}..${stmt.to}${stmt.step ? ` step ${stmt.step}` : ""}`);
        out.push(...writeBlock(stmt.body, depth + 1));
        break;
      case "while":
        out.push(`${pad}while ${stmt.cond}`);
        out.push(...writeBlock(stmt.body, depth + 1));
        break;
    }
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Parse: indented text → structure
 * ------------------------------------------------------------------ */

interface Line {
  indent: number;
  text: string;
}

interface Cursor {
  pos: number;
}

export function parseProgramBody(text: string): ProgramStatement[] {
  const lines: Line[] = text
    .split("\n")
    .map((raw) => ({ indent: indentOf(raw), text: raw.trim() }))
    .filter((l) => l.text.length > 0);
  if (lines.length === 0) return [];
  const cursor: Cursor = { pos: 0 };
  return parseBlock(lines, cursor, lines[0].indent);
}

/** Count leading whitespace, a tab worth 2 columns (matching the 2-space writer). */
function indentOf(raw: string): number {
  let n = 0;
  for (const ch of raw) {
    if (ch === " ") n += 1;
    else if (ch === "\t") n += 2;
    else break;
  }
  return n;
}

function parseBlock(lines: Line[], cursor: Cursor, baseIndent: number): ProgramStatement[] {
  const stmts: ProgramStatement[] = [];
  while (cursor.pos < lines.length) {
    const line = lines[cursor.pos];
    if (line.indent !== baseIndent) break; // dedent (or unexpected indent) ends the block
    const lower = line.text.toLowerCase();

    // else-if / otherwise attach to the preceding `if` at this indent.
    const elif = matchKeyword(line.text, ["else if", "elif"]);
    if (elif !== null) {
      const prev = stmts[stmts.length - 1];
      if (prev && prev.kind === "if") {
        cursor.pos += 1;
        prev.branches.push({ cond: elif, body: parseChildBlock(lines, cursor, baseIndent) });
        continue;
      }
    }
    if (lower === "otherwise" || lower === "else") {
      const prev = stmts[stmts.length - 1];
      if (prev && prev.kind === "if") {
        cursor.pos += 1;
        prev.otherwise = parseChildBlock(lines, cursor, baseIndent);
        continue;
      }
    }

    cursor.pos += 1;
    const ifCond = matchKeyword(line.text, ["if"]);
    if (ifCond !== null) {
      stmts.push({ kind: "if", branches: [{ cond: ifCond, body: parseChildBlock(lines, cursor, baseIndent) }] });
      continue;
    }
    const whileCond = matchKeyword(line.text, ["while"]);
    if (whileCond !== null) {
      stmts.push({ kind: "while", cond: whileCond, body: parseChildBlock(lines, cursor, baseIndent) });
      continue;
    }
    const forSpec = matchFor(line.text);
    if (forSpec) {
      stmts.push({ ...forSpec, body: parseChildBlock(lines, cursor, baseIndent) });
      continue;
    }
    const ret = matchKeyword(line.text, ["return"]);
    if (ret !== null) {
      stmts.push({ kind: "return", expr: ret });
      continue;
    }
    const assignAt = line.text.indexOf(":=");
    if (assignAt !== -1) {
      stmts.push({
        kind: "assign",
        target: line.text.slice(0, assignAt).trim(),
        expr: line.text.slice(assignAt + 2).trim(),
      });
      continue;
    }
    // A bare expression is treated as the program's result (Mathcad: last line).
    stmts.push({ kind: "return", expr: line.text });
  }
  return stmts;
}

/** Parse the (more-indented) child block following a compound statement. */
function parseChildBlock(lines: Line[], cursor: Cursor, parentIndent: number): ProgramStatement[] {
  if (cursor.pos < lines.length && lines[cursor.pos].indent > parentIndent) {
    return parseBlock(lines, cursor, lines[cursor.pos].indent);
  }
  return [];
}

/** If `text` begins with one of `keywords` (word-boundary), return the remainder. */
function matchKeyword(text: string, keywords: string[]): string | null {
  for (const kw of keywords) {
    if (text.toLowerCase().startsWith(kw + " ")) return text.slice(kw.length).trim();
    if (text.toLowerCase() === kw) return "";
  }
  return null;
}

/** `for i in 2..n` / `for i ∈ 2..n step 2` → the for statement (sans body). */
function matchFor(text: string): Omit<Extract<ProgramStatement, { kind: "for" }>, "body"> | null {
  const m = /^for\s+(\S+)\s+(?:in|∈)\s+(.+?)\s*\.\.\s*(.+?)(?:\s+step\s+(.+))?$/i.exec(text);
  if (!m) return null;
  return {
    kind: "for",
    var: m[1].trim(),
    from: m[2].trim(),
    to: m[3].trim(),
    ...(m[4]?.trim() ? { step: m[4].trim() } : {}),
  };
}
