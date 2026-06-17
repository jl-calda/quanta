"use client";

import { Switch } from "@/components/ds";
import { Group, ReadOnlyNote, Row, Section } from "@/components/settings/controls";
import type { WorkspaceSectionProps } from "./calculation";

/**
 * Sharing & permissions — workspace-level access defaults. Currently the home of
 * the export/print gate (Func §4.10): everyone with view access can export, and
 * this toggle decides whether plain viewers/commenters may too.
 */
export function SharingSection({ settings: s, canEdit, patch }: WorkspaceSectionProps) {
  const disabled = !canEdit;
  return (
    <Section
      title="Sharing & permissions"
      desc="Who can do what across this workspace's worksheets."
    >
      {disabled && (
        <ReadOnlyNote>Only owners and admins can change workspace permissions.</ReadOnlyNote>
      )}

      <Group title="Export & print">
        <Row
          label="Allow viewers to export"
          help="Let members with view or comment access export and print worksheets. Editors and owners can always export."
          control={
            <Switch
              checked={s.allowViewerExport}
              disabled={disabled}
              onChange={(e) => patch({ allowViewerExport: e.target.checked }, true)}
            />
          }
        />
      </Group>
    </Section>
  );
}
