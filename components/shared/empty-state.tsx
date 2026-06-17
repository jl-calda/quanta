import Link from "next/link";
import { Button } from "@/components/ds";
import { ManageAccessIcon } from "./icons";

/**
 * Empty states for the two Shared tabs (ported from `shared-app.jsx`). One
 * primary action, in the app's voice — never a dead end.
 */
export function SharedEmptyState({ tab }: { tab: "with" | "by" }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "90px 0",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 54,
          height: 54,
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border-hairline)",
          background: "var(--surface-raised)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-muted)",
          marginBottom: 18,
        }}
      >
        <ManageAccessIcon size={26} />
      </div>
      <h3 style={{ margin: "0 0 7px", font: "600 16px/1.3 var(--font-sans)", color: "var(--text-primary)" }}>
        {tab === "with" ? "Nothing shared with you yet" : "You haven't shared anything yet"}
      </h3>
      <p
        style={{
          margin: "0 auto 20px",
          maxWidth: 340,
          font: "13px/1.55 var(--font-sans)",
          color: "var(--text-muted)",
        }}
      >
        {tab === "with"
          ? "When a colleague shares a worksheet with you, it shows up here."
          : "Open any worksheet and choose Share to give your team access."}
      </p>
      {tab === "by" && (
        <Link href="/worksheets" style={{ textDecoration: "none" }}>
          <Button variant="primary">Open a worksheet to share</Button>
        </Link>
      )}
    </div>
  );
}
