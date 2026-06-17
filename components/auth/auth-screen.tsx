"use client";

import { useState } from "react";
import Link from "next/link";
import { Tabs } from "@/components/ds";
import { BrandPanel } from "./brand-panel";
import { SignInForm } from "./sign-in-form";
import { SignUpForm } from "./sign-up-form";
import { FormErrorInline } from "./fields";

type Tab = "signin" | "create";

/**
 * The Sign in / Sign up screen — a split layout with the dark brand panel and a
 * tabbed form panel. Both `/sign-in` and `/sign-up` render this; `initialTab`
 * seeds which tab opens. Tab + the contextual top-right link switch in place.
 * Ported from `Sign in.html`.
 */
export function AuthScreen({
  initialTab = "signin",
  next,
  error,
}: {
  initialTab?: Tab;
  next: string;
  error?: string;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);

  return (
    <div className="auth-split">
      <BrandPanel />

      <main
        style={{
          background: "var(--surface-paper)",
          display: "flex",
          flexDirection: "column",
          padding: "40px 56px 28px",
          overflowY: "auto",
        }}
      >
        {/* contextual switch */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            minHeight: 30,
          }}
        >
          <span style={{ font: "12.5px/1 var(--font-sans)", color: "var(--text-muted)" }}>
            {tab === "signin" ? (
              <>
                New to Quanta?{" "}
                <button type="button" className="auth-link" onClick={() => setTab("create")}>
                  Create account
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button type="button" className="auth-link" onClick={() => setTab("signin")}>
                  Sign in
                </button>
              </>
            )}
          </span>
        </div>

        {/* centered form column */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div style={{ width: "100%", maxWidth: 384, margin: "0 auto", padding: "24px 0" }}>
            <h2
              style={{
                margin: "0 0 4px",
                font: "600 22px/1.2 var(--font-sans)",
                letterSpacing: "-0.01em",
                color: "var(--text-primary)",
              }}
            >
              {tab === "signin" ? "Sign in to your workspace" : "Create your account"}
            </h2>
            <p
              style={{
                margin: "0 0 24px",
                font: "13.5px/1.5 var(--font-sans)",
                color: "var(--text-muted)",
              }}
            >
              {tab === "signin"
                ? "Pick up where your calculations left off."
                : "Start a worksheet in minutes — no credit card."}
            </p>

            {error ? (
              <div style={{ marginBottom: 20 }}>
                <FormErrorInline>{error}</FormErrorInline>
              </div>
            ) : null}

            <div style={{ marginBottom: 24 }}>
              <Tabs
                items={[
                  { value: "signin", label: "Sign in" },
                  { value: "create", label: "Create account" },
                ]}
                value={tab}
                onChange={(v) => setTab(v as Tab)}
              />
            </div>

            {tab === "signin" ? <SignInForm next={next} /> : <SignUpForm next={next} />}
          </div>
        </div>

        {/* footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 8,
            paddingTop: 16,
          }}
        >
          <Link
            href="/terms"
            className="auth-link"
            style={{ font: "12px/1 var(--font-sans)", color: "var(--text-muted)" }}
          >
            Terms
          </Link>
          <span style={{ color: "var(--border-strong)" }}>·</span>
          <Link
            href="/privacy"
            className="auth-link"
            style={{ font: "12px/1 var(--font-sans)", color: "var(--text-muted)" }}
          >
            Privacy
          </Link>
        </div>
      </main>
    </div>
  );
}
