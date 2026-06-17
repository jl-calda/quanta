import { Badge } from "@/components/ds";
import { calcStatusMeta } from "./format";
import type { CalcStatus } from "@/lib/supabase/types";

/**
 * Live calc-status chip for a worksheet — pass / warning / error tone with a
 * leading dot, per §4.2 ("show a live calc_status chip").
 */
export function StatusChip({ status }: { status: CalcStatus }) {
  const { tone, label } = calcStatusMeta(status);
  return (
    <Badge tone={tone} dot>
      {label}
    </Badge>
  );
}
