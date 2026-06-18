"use client";

import { useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { Icon, type IconName } from "../icons";

/**
 * Ribbon control primitives — typed React ports of the design mockup
 * (`mathcad-like/project/ribbon-app.jsx`), matching its exact dimensions and
 * tokens. Styling is inline `CSSProperties` over semantic CSS variables (the DS
 * convention) so dark theme and density flow through. Tooltips use the native
 * `title` attribute. Controls that insert into the live math field take an
 * `onMouseDown` so they never steal focus from the editor.
 */

type Press = {
  onClick?: () => void;
  onMouseDown?: (e: MouseEvent) => void;
};

const hoverable = (
  disabled: boolean | undefined,
  bg: string,
  rest: string = "transparent",
) => ({
  onMouseEnter: (e: MouseEvent<HTMLElement>) => {
    if (!disabled) e.currentTarget.style.background = bg;
  },
  onMouseLeave: (e: MouseEvent<HTMLElement>) => {
    e.currentTarget.style.background = rest;
  },
});

/* ------------------------------------------------------------------ *
 * Groups
 * ------------------------------------------------------------------ */

export function Group({
  caption,
  children,
  minW,
}: {
  caption: ReactNode;
  children: ReactNode;
  minW?: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        height: "100%",
        padding: "0 10px",
        borderRight: "1px solid var(--border-hairline)",
        minWidth: minW,
        flex: "0 0 auto",
      }}
    >
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 4 }}>{children}</div>
      <div
        style={{
          font: "10px/1 var(--font-sans)",
          color: "var(--text-muted)",
          paddingBottom: 5,
          letterSpacing: "0.01em",
          whiteSpace: "nowrap",
        }}
      >
        {caption}
      </div>
    </div>
  );
}

/** A contextual group (e.g. Plot's Traces/Axes when a plot is selected). */
export function ContextGroup({
  caption,
  children,
  minW,
}: {
  caption: ReactNode;
  children: ReactNode;
  minW?: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        height: "100%",
        padding: "0 10px",
        borderRight: "1px solid var(--border-hairline)",
        minWidth: minW,
        flex: "0 0 auto",
        background: "color-mix(in srgb, var(--accent-tint) 35%, transparent)",
      }}
    >
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 4 }}>{children}</div>
      <div
        style={{
          font: "10px/1 var(--font-sans)",
          color: "var(--accent)",
          paddingBottom: 5,
          letterSpacing: "0.01em",
          whiteSpace: "nowrap",
        }}
      >
        {caption}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Buttons
 * ------------------------------------------------------------------ */

export function BigBtn({
  icon,
  glyph,
  label,
  dropdown,
  tip,
  onClick,
  onMouseDown,
  disabled,
}: {
  icon?: IconName;
  glyph?: ReactNode;
  label: string;
  dropdown?: boolean;
  tip?: string;
} & Press & { disabled?: boolean }) {
  return (
    <button
      type="button"
      title={disabled ? `${tip ?? label} — coming soon` : tip ?? label}
      disabled={disabled}
      onClick={onClick}
      onMouseDown={onMouseDown}
      {...hoverable(disabled, "var(--surface-hover)")}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        width: 60,
        height: 62,
        border: "1px solid transparent",
        borderRadius: 6,
        background: "transparent",
        cursor: disabled ? "not-allowed" : "pointer",
        color: disabled ? "var(--text-muted)" : "var(--text-primary)",
        opacity: disabled ? 0.5 : 1,
        padding: "6px 2px",
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", height: 24 }}>
        {glyph ?? (icon && <Icon name={icon} size={22} />)}
      </span>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 2,
          font: "11px/1.1 var(--font-sans)",
          textAlign: "center",
        }}
      >
        {label}
        {dropdown && (
          <span style={{ color: "var(--text-muted)", display: "inline-flex" }}>
            <Icon name="chevD" size={11} />
          </span>
        )}
      </span>
    </button>
  );
}

export function SmBtn({
  icon,
  glyph,
  label,
  dropdown,
  toggle,
  on,
  tip,
  onClick,
  onMouseDown,
  disabled,
}: {
  icon?: IconName;
  glyph?: ReactNode;
  label?: string;
  dropdown?: boolean;
  toggle?: boolean;
  on?: boolean;
  tip?: string;
} & Press & { disabled?: boolean }) {
  const active = !!(toggle && on);
  return (
    <button
      type="button"
      title={disabled ? `${tip ?? label ?? ""} — coming soon` : tip ?? label}
      disabled={disabled}
      onClick={onClick}
      onMouseDown={onMouseDown}
      onMouseEnter={(e) => {
        if (!disabled && !active) e.currentTarget.style.background = "var(--surface-hover)";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = "transparent";
      }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        height: 23,
        padding: "0 8px 0 6px",
        border: "1px solid transparent",
        borderRadius: 5,
        background: active ? "var(--accent-tint)" : "transparent",
        cursor: disabled ? "not-allowed" : "pointer",
        color: disabled ? "var(--text-muted)" : active ? "var(--accent)" : "var(--text-primary)",
        width: "100%",
        textAlign: "left",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span
        style={{
          display: "inline-flex",
          width: 17,
          justifyContent: "center",
          color: active ? "var(--accent)" : "var(--text-muted)",
        }}
      >
        {glyph ?? (icon && <Icon name={icon} size={16} />)}
      </span>
      {label && (
        <span style={{ font: "11.5px/1 var(--font-sans)", whiteSpace: "nowrap", flex: 1 }}>{label}</span>
      )}
      {dropdown && (
        <span style={{ color: "var(--text-muted)", display: "inline-flex" }}>
          <Icon name="chevD" size={12} />
        </span>
      )}
    </button>
  );
}

export function SmStack({ children, w = 124 }: { children: ReactNode; w?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 1, justifyContent: "center", minWidth: w }}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Special widgets
 * ------------------------------------------------------------------ */

export function Stepper({
  label,
  value,
  onDec,
  onInc,
  disabled,
}: {
  label?: string;
  value: number | string;
  onDec?: () => void;
  onInc?: () => void;
  disabled?: boolean;
}) {
  const btn: CSSProperties = {
    width: 17,
    height: "100%",
    border: "none",
    background: "var(--surface-raised)",
    cursor: disabled ? "not-allowed" : "pointer",
    color: "var(--text-primary)",
    fontSize: 12,
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 6px", height: 23, opacity: disabled ? 0.5 : 1 }}>
      {label ? (
        <span style={{ font: "11.5px/1 var(--font-sans)", color: disabled ? "var(--text-muted)" : "var(--text-primary)" }}>
          {label}
        </span>
      ) : null}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          border: "1px solid var(--border-strong)",
          borderRadius: 4,
          overflow: "hidden",
          height: 19,
        }}
      >
        <button type="button" disabled={disabled} onClick={onDec} style={btn}>
          −
        </button>
        <span style={{ width: 18, textAlign: "center", font: "11px var(--font-mono)" }}>{value}</span>
        <button type="button" disabled={disabled} onClick={onInc} style={{ ...btn, borderLeft: "1px solid var(--border-hairline)" }}>
          +
        </button>
      </div>
    </div>
  );
}

export function DropField({
  label,
  glyph,
  w = 128,
  onClick,
  disabled,
}: {
  label: string;
  glyph?: ReactNode;
  w?: number;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={disabled ? `${label} — coming soon` : label}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.borderColor = "var(--accent)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border-strong)";
      }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        height: 28,
        padding: "0 9px",
        border: "1px solid var(--border-strong)",
        borderRadius: 4,
        background: "var(--surface-raised)",
        cursor: disabled ? "not-allowed" : "pointer",
        width: w,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {glyph && <span style={{ display: "inline-flex", color: "var(--text-muted)" }}>{glyph}</span>}
      <span style={{ font: "12px/1 var(--font-sans)", color: "var(--text-primary)", flex: 1, textAlign: "left" }}>
        {label}
      </span>
      <span style={{ color: "var(--text-muted)", display: "inline-flex" }}>
        <Icon name="chevD" size={13} />
      </span>
    </button>
  );
}

export function ColorBtn({ disabled }: { disabled?: boolean }) {
  return (
    <button
      type="button"
      title={disabled ? "Text color — coming soon" : "Text color"}
      disabled={disabled}
      {...hoverable(disabled, "var(--surface-hover)")}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 1,
        width: 30,
        height: 23,
        border: "1px solid transparent",
        borderRadius: 5,
        background: "transparent",
        cursor: disabled ? "not-allowed" : "pointer",
        justifyContent: "center",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span style={{ display: "inline-flex", color: "var(--text-primary)" }}>
        <Icon name="color" size={15} />
      </span>
      <span style={{ width: 17, height: 3, borderRadius: 1, background: "var(--accent)" }} />
    </button>
  );
}

export function AlignCluster({ disabled }: { disabled?: boolean }) {
  const icons: IconName[] = ["alignLeft", "alignCenter", "alignRight"];
  return (
    <div style={{ display: "flex", gap: 1 }}>
      {icons.map((ic, i) => (
        <button
          key={ic}
          type="button"
          disabled={disabled}
          title={disabled ? "Alignment — coming soon" : ic.replace("align", "Align ")}
          style={{
            width: 24,
            height: 23,
            border: "1px solid transparent",
            borderRadius: 4,
            background: i === 0 ? "var(--accent-tint)" : "transparent",
            cursor: disabled ? "not-allowed" : "pointer",
            color: i === 0 ? "var(--accent)" : "var(--text-muted)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: disabled ? 0.6 : 1,
          }}
        >
          <Icon name={ic} size={16} />
        </button>
      ))}
    </div>
  );
}

export function ColumnsPicker({
  value,
  onSelect,
  disabled,
}: {
  value: 1 | 2 | 3;
  onSelect: (n: 1 | 2 | 3) => void;
  disabled?: boolean;
}) {
  const cols: (1 | 2 | 3)[] = [1, 2, 3];
  return (
    <div
      style={{
        display: "inline-flex",
        border: "1px solid var(--border-strong)",
        borderRadius: 4,
        overflow: "hidden",
        height: 30,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {cols.map((n) => {
        const on = n === value;
        return (
          <button
            key={n}
            type="button"
            disabled={disabled}
            title={`${n} column${n > 1 ? "s" : ""}`}
            onClick={() => onSelect(n)}
            onMouseEnter={(e) => {
              if (!on && !disabled) e.currentTarget.style.background = "var(--surface-hover)";
            }}
            onMouseLeave={(e) => {
              if (!on) e.currentTarget.style.background = "var(--surface-raised)";
            }}
            style={{
              width: 34,
              height: "100%",
              border: "none",
              borderLeft: n > 1 ? "1px solid var(--border-hairline)" : "none",
              background: on ? "var(--accent-tint)" : "var(--surface-raised)",
              cursor: disabled ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              color: on ? "var(--accent)" : "var(--text-muted)",
            }}
          >
            {Array.from({ length: n }).map((_, i) => (
              <span
                key={i}
                style={{
                  width: n === 1 ? 14 : n === 2 ? 6 : 4,
                  height: 16,
                  border: "1px solid currentColor",
                  borderRadius: 1,
                }}
              />
            ))}
          </button>
        );
      })}
    </div>
  );
}

export function RowsColsPicker({
  onPick,
  disabled,
}: {
  onPick: (rows: number, cols: number) => void;
  disabled?: boolean;
}) {
  const R = 4;
  const C = 5;
  const [hover, setHover] = useState<{ r: number; c: number }>({ r: 2, c: 3 });
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, opacity: disabled ? 0.5 : 1 }}>
      <div
        onMouseLeave={() => setHover({ r: 0, c: 0 })}
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${C}, 11px)`,
          gridAutoRows: "11px",
          gap: 2,
          padding: 4,
          border: "1px solid var(--border-strong)",
          borderRadius: 4,
          background: "var(--surface-raised)",
        }}
      >
        {Array.from({ length: R * C }).map((_, i) => {
          const r = Math.floor(i / C);
          const cc = i % C;
          const on = r < hover.r && cc < hover.c;
          return (
            <span
              key={i}
              onMouseEnter={() => {
                if (!disabled) setHover({ r: r + 1, c: cc + 1 });
              }}
              onMouseDown={(e) => {
                if (disabled) return;
                e.preventDefault();
                onPick(r + 1, cc + 1);
              }}
              style={{
                width: 11,
                height: 11,
                borderRadius: 2,
                background: on ? "var(--accent)" : "var(--surface-chrome)",
                border: "1px solid " + (on ? "var(--accent)" : "var(--border-hairline)"),
                cursor: disabled ? "not-allowed" : "pointer",
              }}
            />
          );
        })}
      </div>
      <span style={{ font: "10px/1 var(--font-mono)", color: "var(--text-muted)" }}>
        {hover.r || 0} × {hover.c || 0}
      </span>
    </div>
  );
}

/** An operator tile (Operators tab) — large STIX glyph over a small caption. */
export function Tile({
  glyph,
  label,
  tip,
  onMouseDown,
  disabled,
}: {
  glyph: ReactNode;
  label: string;
  tip?: string;
  onMouseDown?: (e: MouseEvent) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={disabled ? `${tip ?? label} — coming soon` : tip ?? label}
      disabled={disabled}
      onMouseDown={onMouseDown}
      {...hoverable(disabled, "var(--surface-hover)")}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 3,
        width: 46,
        height: 56,
        border: "1px solid transparent",
        borderRadius: 6,
        background: "transparent",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", height: 22, color: "var(--text-math)" }}>
        {glyph}
      </span>
      <span style={{ font: "9.5px/1.1 var(--font-sans)", color: "var(--text-muted)", textAlign: "center" }}>
        {label}
      </span>
    </button>
  );
}
