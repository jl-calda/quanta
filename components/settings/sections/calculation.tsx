"use client";

import { Select, Switch } from "@/components/ds";
import {
  Group,
  MonoField,
  Radio,
  ReadOnlyNote,
  Row,
  Section,
} from "@/components/settings/controls";
import type { FormatSettings, WorkspaceSettings } from "@/lib/settings/types";

/** Width wrapper so the DS Select (which fills its parent) sits at a fixed size. */
function Sel({ width = 200, children }: { width?: number; children: React.ReactNode }) {
  return <div style={{ width }}>{children}</div>;
}

export interface WorkspaceSectionProps {
  settings: WorkspaceSettings;
  canEdit: boolean;
  patch: (partial: Partial<WorkspaceSettings>, save: boolean) => void;
  patchFormat: (partial: Partial<FormatSettings>, save: boolean) => void;
}

export function CalculationSection({ settings: s, canEdit, patch }: WorkspaceSectionProps) {
  const disabled = !canEdit;
  return (
    <Section
      title="Calculation"
      desc="How worksheets evaluate by default. These apply to new worksheets; any worksheet can override them in its own settings."
    >
      {disabled && (
        <ReadOnlyNote>
          Only owners and admins can change workspace defaults.
        </ReadOnlyNote>
      )}

      <Group title="Recalculation">
        <Row
          label="Default calc mode"
          help="Auto recalculates dependents the moment a value changes. Manual waits for an explicit Recalculate."
          control={
            <Radio
              disabled={disabled}
              options={[
                { value: "auto", label: "Auto" },
                { value: "manual", label: "Manual" },
              ]}
              value={s.calcMode}
              onChange={(v) => patch({ calcMode: v }, true)}
            />
          }
        />
        <Row
          label="Recalculate on open"
          help="Re-evaluate the whole worksheet each time it is opened."
          control={
            <Switch
              checked={s.recalcOnOpen}
              disabled={disabled}
              onChange={(e) => patch({ recalcOnOpen: e.target.checked }, true)}
            />
          }
        />
        <Row
          label="Multithreaded evaluation"
          help="Use all available cores for large worksheets and matrix operations."
          control={
            <Switch
              checked={s.multithread}
              disabled={disabled}
              onChange={(e) => patch({ multithread: e.target.checked }, true)}
            />
          }
        />
      </Group>

      <Group title="Solving algorithms">
        <Row
          label="Nonlinear solve — find / root"
          help="Default method for solve blocks and root-finding."
          control={
            <Sel>
              <Select
                value={s.findAlgo}
                disabled={disabled}
                onChange={(e) =>
                  patch({ findAlgo: e.currentTarget.value as WorkspaceSettings["findAlgo"] }, true)
                }
                options={[
                  { value: "lm", label: "Levenberg–Marquardt" },
                  { value: "conjgrad", label: "Conjugate gradient" },
                  { value: "quasinewton", label: "Quasi-Newton (BFGS)" },
                ]}
              />
            </Sel>
          }
        />
        <Row
          label="ODE solver — Odesolve"
          help="Integrator for ordinary differential equations."
          control={
            <Sel>
              <Select
                value={s.odeAlgo}
                disabled={disabled}
                onChange={(e) =>
                  patch({ odeAlgo: e.currentTarget.value as WorkspaceSettings["odeAlgo"] }, true)
                }
                options={[
                  { value: "rkf45", label: "Runge–Kutta–Fehlberg (RKF45)" },
                  { value: "rkfixed", label: "Fixed-step Runge–Kutta" },
                  { value: "radau", label: "Radau (stiff)" },
                ]}
              />
            </Sel>
          }
        />
        <Row
          label="Numerical integration"
          help="Quadrature rule for definite integrals."
          control={
            <Sel>
              <Select
                value={s.intAlgo}
                disabled={disabled}
                onChange={(e) =>
                  patch({ intAlgo: e.currentTarget.value as WorkspaceSettings["intAlgo"] }, true)
                }
                options={[
                  { value: "adaptive", label: "Adaptive (recommended)" },
                  { value: "romberg", label: "Romberg" },
                  { value: "simpson", label: "Simpson" },
                ]}
              />
            </Sel>
          }
        />
      </Group>

      <Group title="Convergence">
        <Row
          label="Convergence tolerance (CTOL)"
          help="How closely constraints must be met before a solve is accepted."
          control={
            <MonoField
              ariaLabel="Convergence tolerance"
              value={s.ctol}
              disabled={disabled}
              onChange={(v) => patch({ ctol: v }, false)}
            />
          }
        />
        <Row
          label="Iteration tolerance (TOL)"
          help="Step-size tolerance for iterative methods."
          control={
            <MonoField
              ariaLabel="Iteration tolerance"
              value={s.tol}
              disabled={disabled}
              onChange={(v) => patch({ tol: v }, false)}
            />
          }
        />
        <Row
          label="Maximum iterations"
          help="Solvers stop and flag non-convergence after this many steps."
          control={
            <MonoField
              ariaLabel="Maximum iterations"
              value={s.maxIter}
              width={90}
              disabled={disabled}
              onChange={(v) => patch({ maxIter: v }, false)}
            />
          }
        />
      </Group>
    </Section>
  );
}
