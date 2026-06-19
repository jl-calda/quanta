"use client";

import { useMemo, useState } from "react";
import { Button, Checkbox, Dialog, IconButton, Input } from "@/components/ds";
import { findRegion } from "@/lib/worksheet/flatten";
import {
  findMatches,
  replaceAllInContent,
  replaceOne,
  type FindOptions,
  type FindScope,
} from "@/lib/worksheet/find";
import { useEditor } from "../state/editor-provider";
import { Icon } from "../icons";
import { InlineRow } from "./parts";

/** Read the current value of a matched field from the tree. */
function fieldValue(content: ReturnType<typeof useEditor>["state"]["content"], match: ReturnType<typeof findMatches>[number]): string | null {
  const region = findRegion(content, match.regionId);
  if (!region) return null;
  if (match.field === "source" && region.type === "math") return region.source;
  if (match.field === "text" && region.type === "text") return region.text;
  if (match.field === "cell" && region.type === "table" && match.cell) return region.rows[match.cell.r]?.[match.cell.c] ?? null;
  return null;
}

/**
 * Find & replace dialog (Func §7.21) — searches math, text, and table cells with
 * case / whole-word / subscript-identifier options, navigates matches, and
 * replaces one or all (occurrences flow through the editor reducer so they
 * autosave + recompute). Subscript mode rewrites an identifier's base, keeping
 * its subscript (`x_i` → `y_i`).
 */
export function FindReplaceDialog({ onClose }: { onClose: () => void }) {
  const { state, dispatch, canEdit } = useEditor();
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [subscript, setSubscript] = useState(false);
  const [scopes, setScopes] = useState<Record<FindScope, boolean>>({ math: true, text: true, table: true });
  const [index, setIndex] = useState(0);

  const options = useMemo<FindOptions>(() => {
    const active = (Object.keys(scopes) as FindScope[]).filter((s) => scopes[s]);
    return { caseSensitive, wholeWord, subscriptIdentifier: subscript, scopes: active };
  }, [caseSensitive, wholeWord, subscript, scopes]);

  const matches = useMemo(() => findMatches(state.content, query, options), [state.content, query, options]);
  const current = matches[Math.min(index, Math.max(matches.length - 1, 0))];

  const go = (delta: number) => {
    if (matches.length === 0) return;
    const next = (index + delta + matches.length) % matches.length;
    setIndex(next);
    dispatch({ type: "SELECT", id: matches[next].regionId });
  };

  const replaceCurrent = () => {
    if (!current || !canEdit) return;
    const value = fieldValue(state.content, current);
    if (value === null) return;
    const updated = replaceOne(value, current, replacement);
    if (current.field === "source") dispatch({ type: "EDIT_SOURCE", id: current.regionId, source: updated });
    else if (current.field === "text") dispatch({ type: "EDIT_TEXT", id: current.regionId, text: updated });
    else if (current.field === "cell" && current.cell)
      dispatch({ type: "EDIT_TABLE_CELL", id: current.regionId, r: current.cell.r, c: current.cell.c, source: updated });
  };

  const replaceAll = () => {
    if (!canEdit) return;
    const { content, count } = replaceAllInContent(state.content, query, replacement, options);
    if (count > 0) dispatch({ type: "REPLACE_CONTENT", content });
  };

  const toggleScope = (s: FindScope) => setScopes((sc) => ({ ...sc, [s]: !sc[s] }));

  return (
    <Dialog
      open
      eyebrow="Edit"
      title="Find & replace"
      width={500}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <Button variant="secondary" onClick={replaceCurrent} disabled={!canEdit || !current}>Replace</Button>
          <Button onClick={replaceAll} disabled={!canEdit || matches.length === 0}>Replace all</Button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Input autoFocus placeholder="Find" value={query} onChange={(e) => { setQuery(e.target.value); setIndex(0); }} style={{ flex: 1 }} />
          <span style={{ font: "12px/1 var(--font-sans)", color: "var(--text-muted)", minWidth: 78, textAlign: "right" }}>
            {query ? (matches.length ? `${Math.min(index + 1, matches.length)} of ${matches.length}` : "No matches") : ""}
          </span>
          <IconButton label="Previous match" size="sm" onClick={() => go(-1)} disabled={matches.length === 0}>
            <Icon name="chevL" size={16} />
          </IconButton>
          <IconButton label="Next match" size="sm" onClick={() => go(1)} disabled={matches.length === 0}>
            <Icon name="chevR" size={16} />
          </IconButton>
        </div>

        <Input placeholder="Replace with" value={replacement} onChange={(e) => setReplacement(e.target.value)} />

        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 18px" }}>
          <Checkbox checked={caseSensitive} onChange={(e) => setCaseSensitive(e.target.checked)} label="Match case" />
          <Checkbox checked={wholeWord} onChange={(e) => setWholeWord(e.target.checked)} label="Whole word" />
          <Checkbox checked={subscript} onChange={(e) => setSubscript(e.target.checked)} label="Subscript identifier" />
        </div>

        <InlineRow label="Search in">
          <div style={{ display: "flex", gap: 14 }}>
            <Checkbox checked={scopes.math} onChange={() => toggleScope("math")} label="Math" />
            <Checkbox checked={scopes.text} onChange={() => toggleScope("text")} label="Text" />
            <Checkbox checked={scopes.table} onChange={() => toggleScope("table")} label="Tables" />
          </div>
        </InlineRow>
      </div>
    </Dialog>
  );
}
