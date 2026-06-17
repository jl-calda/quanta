"use client";

import { useMemo, useRef, useState } from "react";
import {
  ALL,
  TREE,
  itemById,
  itemsInCategory,
  searchItems,
  categoryLabel,
  type ReferenceItem,
  type RefGroup,
} from "@/lib/calc/reference";
import { Toast } from "@/components/ds";
import { CategorySidebar } from "./category-sidebar";
import { ItemList } from "./item-list";
import { DetailPane } from "./detail-pane";

export interface ReferenceLibraryProps {
  /** `editor` shows "Insert into worksheet"; `standalone` shows Copy only. */
  variant: "editor" | "standalone";
  /** Insert at the caret (editor only). */
  onInsert?: (item: ReferenceItem) => void;
  /** Group to open to; its first subcategory is selected. Defaults to Functions. */
  initialGroup?: RefGroup;
  className?: string;
}

/**
 * The reusable 3-pane Reference browser (categories · list · detail). Pure
 * presentational state lives here (selected category, item, query); the only
 * outward effect is `onInsert` (editor) or clipboard copy (both). Hosted by the
 * editor overlay and the standalone /reference page.
 */
export function ReferenceLibrary({
  variant,
  onInsert,
  initialGroup = "FUNCTIONS",
  className,
}: ReferenceLibraryProps) {
  const firstCat = TREE[initialGroup][0].id;
  const [cat, setCat] = useState(firstCat);
  const [selId, setSelId] = useState<string | null>(
    () => itemsInCategory(firstCat)[0]?.id ?? ALL[0]?.id ?? null,
  );
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const items = useMemo(
    () => (query.trim() ? searchItems(query) : itemsInCategory(cat)),
    [query, cat],
  );

  // Selected item: the chosen id if it's in view, else the first listed item.
  const selected: ReferenceItem | null =
    (selId ? itemById(selId) : undefined) ?? items[0] ?? null;

  const pickCat = (c: string) => {
    setQuery("");
    setCat(c);
    setSelId(itemsInCategory(c)[0]?.id ?? null);
  };

  const pickRelated = (target: ReferenceItem) => {
    setQuery("");
    setCat(target.cat);
    setSelId(target.id);
  };

  const copy = (item: ReferenceItem) => {
    void navigator.clipboard?.writeText(item.sig);
    setToast(item.sig);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  };

  return (
    <div style={{ display: "flex", minHeight: 0, height: "100%" }} className={className}>
      <CategorySidebar selected={cat} onPick={pickCat} />
      <ItemList
        items={items}
        selectedId={selected?.id ?? null}
        onSelect={setSelId}
        query={query}
        onQuery={setQuery}
        categoryLabel={categoryLabel(cat)}
      />
      {selected ? (
        <DetailPane
          item={selected}
          onInsert={variant === "editor" ? onInsert : undefined}
          onCopy={copy}
          onRelated={pickRelated}
        />
      ) : (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--surface-chrome)",
            color: "var(--text-muted)",
            font: "13px/1.5 var(--font-sans)",
          }}
        >
          Select an item to see its reference.
        </div>
      )}

      {toast && (
        <div style={{ position: "fixed", right: 20, bottom: 20, zIndex: 200 }}>
          <Toast
            tone="success"
            title="Copied to clipboard"
            description={toast}
            onDismiss={() => setToast(null)}
          />
        </div>
      )}
    </div>
  );
}
