"use client";

import type { ComponentType, MouseEvent } from "react";
import { Icon, type IconName } from "../icons";
import type { UnitsSystem } from "../state/editor-reducer";
import { Big, Dn, It, MiniFrac, Up } from "./glyphs";
import {
  AlignCluster,
  BigBtn,
  ColorBtn,
  ColumnsPicker,
  ContextGroup,
  DropField,
  Group,
  RowsColsPicker,
  SmBtn,
  SmStack,
  Stepper,
  Tile,
} from "./primitives";
import type { RibbonCommands, RibbonSelection } from "./commands";

export interface TabProps {
  cmd: RibbonCommands;
  sel: RibbonSelection;
}

/** Fire `fn` on mousedown without stealing focus from the active math field. */
const press = (fn: () => void) => (e: MouseEvent) => {
  e.preventDefault();
  fn();
};

/** A 28×28 icon-only ribbon button (indent / span). */
function IconBtn({
  icon,
  tip,
  onClick,
  disabled,
}: {
  icon: IconName;
  tip: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={disabled ? `${tip} — select a region first` : tip}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.background = "var(--surface-hover)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
      style={{
        width: 28,
        height: 28,
        border: "1px solid transparent",
        borderRadius: 5,
        background: "transparent",
        cursor: disabled ? "not-allowed" : "pointer",
        color: disabled ? "var(--text-muted)" : "var(--text-primary)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Icon name={icon} size={18} />
    </button>
  );
}

/* ============================ TAB CONTENTS ============================ */

function HomeTab({ cmd, sel }: TabProps) {
  const mathDisabled = !sel.canEdit || !sel.isMath;
  return (
    <>
      <Group caption="Clipboard">
        <BigBtn icon="paste" label="Paste" dropdown disabled />
        <SmStack w={92}>
          <SmBtn icon="cut" label="Cut" disabled />
          <SmBtn icon="copy" label="Copy" disabled />
        </SmStack>
      </Group>
      <Group caption="Region">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px 4px" }}>
          <SmBtn glyph={<Big s={15}>=</Big>} label="Math" onClick={() => cmd.insertRegion("math")} disabled={!sel.canEdit} />
          <SmBtn icon="area" label="Area" onClick={() => cmd.insertRegion("area")} disabled={!sel.canEdit} />
          <SmBtn icon="text" label="Text" onClick={() => cmd.insertRegion("text")} disabled={!sel.canEdit} />
          <SmBtn icon="image" label="Image" onClick={() => cmd.insertRegion("image")} disabled={!sel.canEdit} />
          <SmBtn icon="table" label="Table" onClick={() => cmd.insertRegion("table")} disabled={!sel.canEdit} />
          <SmBtn icon="control" label="Control" onClick={() => cmd.insertRegion("control")} disabled={!sel.canEdit} />
        </div>
      </Group>
      <Group caption="Math format">
        <BigBtn icon="fmt" label="Result format" dropdown disabled />
        <SmStack w={150}>
          <SmBtn icon="units" label="Units display" dropdown onClick={cmd.openUnits} />
          <Stepper
            label="Decimals"
            value={sel.decimals}
            onDec={() => cmd.setDecimals(sel.decimals - 1)}
            onInc={() => cmd.setDecimals(sel.decimals + 1)}
            disabled={mathDisabled}
          />
          <SmBtn icon="steps" label="Show steps" toggle on={sel.showSteps} onClick={cmd.toggleShowSteps} disabled={mathDisabled} />
        </SmStack>
      </Group>
      <Group caption="Text styles">
        <DropField label="Body" w={130} disabled />
      </Group>
      <Group caption="Editing">
        <BigBtn icon="find" label="Find" disabled />
      </Group>
    </>
  );
}

function InsertTab({ cmd, sel }: TabProps) {
  const d = !sel.canEdit;
  return (
    <>
      <Group caption="Regions">
        <BigBtn glyph={<Big s={20}>=</Big>} label="Math" onClick={() => cmd.insertRegion("math")} disabled={d} />
        <SmStack w={92}>
          <SmBtn icon="text" label="Text" onClick={() => cmd.insertRegion("text")} disabled={d} />
          <SmBtn icon="table" label="Table" onClick={() => cmd.insertRegion("table")} disabled={d} />
        </SmStack>
        <BigBtn icon="solve" label="Solve block" onClick={() => cmd.insertRegion("solve")} disabled={d} />
      </Group>
      <Group caption="Visuals">
        <BigBtn icon="plot" label="Plot" dropdown onClick={() => cmd.insertRegion("plot")} disabled={d} />
        <SmStack w={104}>
          <SmBtn icon="image" label="Image" onClick={() => cmd.insertRegion("image")} disabled={d} />
          <SmBtn icon="sketch" label="Sketch" disabled />
        </SmStack>
      </Group>
      <Group caption="Controls">
        <BigBtn icon="control" label="Control" dropdown onClick={() => cmd.insertRegion("control")} disabled={d} />
      </Group>
      <Group caption="Reference">
        <SmStack w={150}>
          <SmBtn icon="include" label="Include worksheet" onClick={() => cmd.insertRegion("include")} disabled={d} />
          <SmBtn glyph={<Big s={15}>Σ</Big>} label="Symbol" onClick={cmd.openConstants} />
          <SmBtn icon="link" label="Link / tag" disabled />
        </SmStack>
      </Group>
    </>
  );
}

function MathTab({ cmd, sel }: TabProps) {
  const d = !sel.canEdit;
  const mathDisabled = !sel.canEdit || !sel.isMath;
  return (
    <>
      <Group caption="Palettes">
        <BigBtn icon="palette" label="Operators" dropdown onClick={() => cmd.setTab("Operators")} />
        <BigBtn glyph={<Big s={18}>ƒ(x)</Big>} label="Functions" dropdown onClick={cmd.openFunctions} />
      </Group>
      <Group caption="Result">
        <BigBtn icon="fmt" label="Result format" dropdown disabled />
        <SmStack w={132}>
          <SmBtn icon="units" label="Units" dropdown onClick={cmd.openUnits} />
          <Stepper
            label="Decimals"
            value={sel.decimals}
            onDec={() => cmd.setDecimals(sel.decimals - 1)}
            onInc={() => cmd.setDecimals(sel.decimals + 1)}
            disabled={mathDisabled}
          />
        </SmStack>
      </Group>
      <Group caption="Evaluation">
        <SmStack w={150}>
          <SmBtn glyph={<Big s={13}>:=</Big>} label="Assignment  ( := )" onMouseDown={press(() => cmd.insertOp("assign"))} disabled={d} />
          <SmBtn glyph={<Big s={13}>=</Big>} label="Evaluate  ( = )" onMouseDown={press(() => cmd.insertOp("evaluate"))} disabled={d} />
          <SmBtn glyph={<Big s={13}>≡</Big>} label="Global  ( ≡ )" onMouseDown={press(() => cmd.insertOp("global"))} disabled={d} />
        </SmStack>
      </Group>
      <Group caption="Modifiers">
        <SmStack w={140}>
          <SmBtn icon="vectorize" label="Vectorize" disabled />
          <SmBtn icon="label" label="Label / identifier" disabled />
        </SmStack>
      </Group>
    </>
  );
}

function OperatorsTab({ cmd, sel }: TabProps) {
  const d = !sel.canEdit;
  return (
    <>
      <Group caption="Structures">
        <Tile glyph={<MiniFrac n="a" d="b" />} label="Fraction" onMouseDown={press(() => cmd.insertOp("fraction"))} disabled={d} />
        <Tile glyph={<Big s={16}><It>x</It><Up>n</Up></Big>} label="Exponent" onMouseDown={press(() => cmd.insertOp("exponent"))} disabled={d} />
        <Tile glyph={<Big s={16}>√<span style={{ borderTop: "1px solid currentColor" }}><It>x</It></span></Big>} label="Root" onMouseDown={press(() => cmd.insertOp("root"))} disabled={d} />
        <Tile glyph={<Big s={15}><It>x</It><Dn>n</Dn></Big>} label="Subscript" onMouseDown={press(() => cmd.insertOp("subscript"))} disabled={d} />
        <Tile glyph={<Big s={16}>|<It>x</It>|</Big>} label="Absolute" onMouseDown={press(() => cmd.insertOp("absolute"))} disabled={d} />
        <Tile glyph={<Big s={15}><It>n</It>!</Big>} label="Factorial" onMouseDown={press(() => cmd.insertOp("factorial"))} disabled={d} />
      </Group>
      <Group caption="Large operators">
        <Tile glyph={<Big s={20}>Σ</Big>} label="Summation" onMouseDown={press(() => cmd.insertOp("summation"))} disabled={d} />
        <Tile glyph={<Big s={20}>∏</Big>} label="Product" onMouseDown={press(() => cmd.insertOp("product"))} disabled={d} />
        <Tile glyph={<Big s={20}>∫</Big>} label="Integral" onMouseDown={press(() => cmd.insertOp("integral"))} disabled={d} />
      </Group>
      <Group caption="Calculus">
        <Tile glyph={<MiniFrac n="d" d="dx" />} label="Derivative" onMouseDown={press(() => cmd.insertOp("derivative"))} disabled={d} />
        <Tile glyph={<MiniFrac n="∂" d="∂x" />} label="Partial" onMouseDown={press(() => cmd.insertOp("partial"))} disabled={d} />
        <Tile glyph={<Big s={13}>lim</Big>} label="Limit" onMouseDown={press(() => cmd.insertOp("limit"))} disabled={d} />
      </Group>
      <Group caption="Ranges">
        <Tile glyph={<Big s={13}><It>m</It>‥<It>n</It></Big>} label="Range variable" onMouseDown={press(() => cmd.insertOp("range"))} disabled={d} />
        <Tile glyph={<Big s={14}>[ ]</Big>} label="Index" onMouseDown={press(() => cmd.insertOp("index"))} disabled={d} />
      </Group>
    </>
  );
}

function FunctionsTab({ cmd }: TabProps) {
  return (
    <>
      <Group caption="Categories">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          <DropField label="Math" w={120} onClick={cmd.openFunctions} />
          <DropField label="Statistics" w={120} onClick={cmd.openFunctions} />
          <DropField label="Solving" w={120} onClick={cmd.openFunctions} />
          <DropField label="Matrix" w={120} onClick={cmd.openFunctions} />
        </div>
      </Group>
      <Group caption="More categories">
        <SmStack w={150}>
          <SmBtn icon="fx" label="Lookup & data" dropdown onClick={cmd.openFunctions} />
          <SmBtn icon="fx" label="Programming" dropdown onClick={cmd.openFunctions} />
          <SmBtn icon="fx" label="Engineering" dropdown onClick={cmd.openFunctions} />
        </SmStack>
      </Group>
      <Group caption="Insert">
        <BigBtn icon="fx" label="Insert function…" onClick={cmd.openFunctions} />
      </Group>
    </>
  );
}

function MatricesTab({ cmd, sel }: TabProps) {
  const d = !sel.canEdit;
  return (
    <>
      <Group caption="Insert" minW={92}>
        <RowsColsPicker onPick={(r, c) => cmd.insertMatrix(r, c)} disabled={d} />
      </Group>
      <Group caption="Operations">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px 4px" }}>
          <SmBtn icon="transpose" label="Transpose" onMouseDown={press(() => cmd.insertMatrixOp("transpose"))} disabled={d} />
          <SmBtn icon="identity" label="Identity" onMouseDown={press(() => cmd.insertMatrixOp("identity"))} disabled={d} />
          <SmBtn icon="inverse" label="Inverse" onMouseDown={press(() => cmd.insertMatrixOp("inverse"))} disabled={d} />
          <SmBtn icon="determinant" label="Determinant" onMouseDown={press(() => cmd.insertMatrixOp("determinant"))} disabled={d} />
        </div>
      </Group>
      <Group caption="Build">
        <SmStack w={132}>
          <SmBtn icon="augment" label="Augment" onMouseDown={press(() => cmd.insertMatrixOp("augment"))} disabled={d} />
          <SmBtn icon="augment" label="Stack" onMouseDown={press(() => cmd.insertMatrixOp("stack"))} disabled={d} />
          <SmBtn icon="indexing" label="Indexing" onMouseDown={press(() => cmd.insertMatrixOp("indexing"))} disabled={d} />
        </SmStack>
      </Group>
    </>
  );
}

function PlotTab({ cmd, sel }: TabProps) {
  const d = !sel.canEdit;
  return (
    <>
      <Group caption="Insert plot">
        <BigBtn icon="plot" label="2D plot" onClick={() => cmd.insertRegion("plot")} disabled={d} />
        <SmStack w={104}>
          <SmBtn icon="polar" label="Polar" disabled />
          <SmBtn icon="contour" label="Contour" disabled />
        </SmStack>
        <SmStack w={96}>
          <SmBtn icon="plot3d" label="3D" disabled />
          <SmBtn icon="chart" label="Chart" disabled />
        </SmStack>
      </Group>
      {sel.isPlot && (
        <>
          <ContextGroup caption="Traces · selected">
            <SmStack w={132}>
              <SmBtn icon="plot" label="Add trace" disabled />
              <SmBtn icon="color" label="Trace style" dropdown disabled />
              <SmBtn icon="label" label="Legend" toggle on disabled />
            </SmStack>
          </ContextGroup>
          <ContextGroup caption="Axes · selected">
            <SmStack w={128}>
              <SmBtn icon="gridlines" label="Gridlines" toggle on disabled />
              <SmBtn icon="units" label="Scale (lin/log)" dropdown disabled />
              <SmBtn icon="label" label="Axis labels" disabled />
            </SmStack>
          </ContextGroup>
          <ContextGroup caption="Chart · selected">
            <SmStack w={120}>
              <SmBtn icon="fmt" label="Title" disabled />
              <SmBtn icon="border" label="Frame" toggle on disabled />
            </SmStack>
          </ContextGroup>
        </>
      )}
    </>
  );
}

function FormatTab({ cmd, sel }: TabProps) {
  const regionDisabled = !sel.canEdit || !sel.hasSelection;
  return (
    <>
      <Group caption="Text">
        <DropField label="Body" w={108} disabled />
        <Stepper value="13" disabled />
        <div style={{ display: "flex", gap: 1 }}>
          <SmBtn icon="bold" tip="Bold" disabled />
          <SmBtn icon="italic" tip="Italic" disabled />
          <SmBtn icon="underline" tip="Underline" disabled />
        </div>
      </Group>
      <Group caption="Color">
        <ColorBtn disabled />
      </Group>
      <Group caption="Align">
        <AlignCluster disabled />
      </Group>
      <Group caption="Indent">
        <div style={{ display: "flex", gap: 1 }}>
          <IconBtn icon="indentL" tip="Outdent" onClick={() => cmd.indent(-1)} disabled={regionDisabled} />
          <IconBtn icon="indentR" tip="Indent" onClick={() => cmd.indent(1)} disabled={regionDisabled} />
        </div>
      </Group>
      <Group caption="Row columns" minW={0}>
        <ColumnsPicker value={sel.columns} onSelect={cmd.setColumns} disabled={regionDisabled} />
        <span style={{ marginLeft: 4 }}>
          <IconBtn icon="spanCols" tip="Span all columns" onClick={cmd.toggleSpan} disabled={!sel.canSpan} />
        </span>
      </Group>
      <Group caption="Region">
        <SmStack w={132}>
          <SmBtn icon="border" label="Region border" toggle on={sel.border} onClick={cmd.toggleBorder} disabled={regionDisabled} />
          <SmBtn icon="condfmt" label="Conditional format" disabled />
        </SmStack>
      </Group>
    </>
  );
}

function DocumentTab() {
  return (
    <>
      <Group caption="Setup">
        <BigBtn icon="pagesetup" label="Page setup" dropdown disabled />
        <SmStack w={120}>
          <SmBtn icon="margins" label="Margins" dropdown disabled />
          <SmBtn icon="header" label="Headers / footers" disabled />
        </SmStack>
      </Group>
      <Group caption="Columns">
        <BigBtn icon="columns" label="Default columns" dropdown tip="Default columns — page / section" disabled />
      </Group>
      <Group caption="Show">
        <SmStack w={150}>
          <SmBtn icon="gridlines" label="Gridlines" toggle on disabled />
          <SmBtn icon="frameToggle" label="Page-body frame" toggle disabled />
          <SmBtn icon="header" label="Header / footer frame" toggle disabled />
        </SmStack>
      </Group>
      <Group caption="Navigate">
        <SmStack w={120}>
          <SmBtn icon="toc" label="Table of contents" disabled />
          <SmBtn icon="gotopage" label="Go to page…" disabled />
        </SmStack>
      </Group>
    </>
  );
}

const UNIT_SYSTEMS: UnitsSystem[] = ["si", "uscs", "cgs"];

function CalculateTab({ cmd, sel }: TabProps) {
  const cycleUnits = () => {
    const i = UNIT_SYSTEMS.indexOf(sel.unitsSystem);
    cmd.setUnitsSystem(UNIT_SYSTEMS[(i + 1) % UNIT_SYSTEMS.length] ?? "si");
  };
  return (
    <>
      <Group caption="Mode">
        <div style={{ display: "inline-flex", border: "1px solid var(--border-strong)", borderRadius: 4, overflow: "hidden", height: 28 }}>
          {(["auto", "manual"] as const).map((m, i) => {
            const on = sel.calcMode === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => cmd.setMode(m)}
                style={{
                  padding: "0 11px",
                  height: "100%",
                  border: "none",
                  borderLeft: i ? "1px solid var(--border-hairline)" : "none",
                  cursor: "pointer",
                  background: on ? "var(--accent-tint)" : "var(--surface-raised)",
                  color: on ? "var(--accent)" : "var(--text-muted)",
                  font: (on ? "600" : "500") + " 12px/1 var(--font-sans)",
                  textTransform: "capitalize",
                }}
              >
                {m}
              </button>
            );
          })}
        </div>
      </Group>
      <Group caption="Recalculate">
        <BigBtn icon="refresh" label="Recalculate" onClick={cmd.recalculate} />
        <BigBtn icon="refreshHere" label="To here" onClick={cmd.recalculateToHere} />
      </Group>
      <Group caption="Engine">
        <SmStack w={160}>
          <SmBtn icon="units" label={`Units system  (${sel.unitsSystem.toUpperCase()})`} dropdown onClick={cycleUnits} />
          <SmBtn icon="thread" label="Multithreading" toggle on disabled />
          <SmBtn icon="algo" label="Solver options…" disabled />
        </SmStack>
      </Group>
    </>
  );
}

function ReviewTab({ cmd, sel }: TabProps) {
  return (
    <>
      <Group caption="Comments">
        <BigBtn icon="commentPlus" label="New comment" onClick={cmd.newComment} disabled={!sel.canComment} />
        <SmStack w={112}>
          <SmBtn icon="comment" label="Show all" toggle on={sel.commentsOpen} onClick={cmd.toggleComments} />
          <SmBtn icon="comment" label="Resolve" disabled />
        </SmStack>
      </Group>
      <Group caption="Changes">
        <SmStack w={170}>
          <SmBtn icon="track" label="Track changes" toggle disabled />
          <SmBtn icon="redefine" label="Redefinition warnings" toggle on disabled />
          <SmBtn icon="compare" label="Compare versions" disabled />
        </SmStack>
      </Group>
      <Group caption="Proofing">
        <BigBtn icon="spell" label="Spell check" disabled />
      </Group>
      <Group caption="Protect">
        <BigBtn icon="protect" label="Lock area" dropdown disabled />
      </Group>
    </>
  );
}

export const TAB_CONTENT: Record<string, ComponentType<TabProps>> = {
  Home: HomeTab,
  Insert: InsertTab,
  Math: MathTab,
  Operators: OperatorsTab,
  Functions: FunctionsTab,
  Matrices: MatricesTab,
  Plot: PlotTab,
  Format: FormatTab,
  Document: DocumentTab,
  Calculate: CalculateTab,
  Review: ReviewTab,
};

export const TABS = [
  "Home", "Insert", "Math", "Operators", "Functions", "Matrices",
  "Plot", "Format", "Document", "Calculate", "Review",
];
