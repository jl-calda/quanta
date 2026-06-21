/**
 * Quanta design-system components (Milestone M3).
 *
 * Typed React recreations of the bound design system in
 * `mathcad-like/project/_ds/_ds_bundle.js`, ported 1:1 on the semantic CSS
 * variables so dark theme and density flow through unchanged. Import from the
 * barrel: `import { Button, Badge, MathRegion } from "@/components/ds"`.
 */

// core/
export { Badge } from "./core/badge";
export type { BadgeProps, BadgeTone, BadgeVariant } from "./core/badge";
export { Button } from "./core/button";
export type { ButtonProps, ButtonVariant, ButtonSize } from "./core/button";
export { Card } from "./core/card";
export type { CardProps } from "./core/card";
export { IconButton } from "./core/icon-button";
export type { IconButtonProps, IconButtonVariant, IconButtonSize } from "./core/icon-button";

// forms/
export { Input } from "./forms/input";
export type { InputProps, InputSize } from "./forms/input";
export { Select } from "./forms/select";
export type { SelectProps, SelectOption, SelectSize } from "./forms/select";
export { Checkbox } from "./forms/checkbox";
export type { CheckboxProps } from "./forms/checkbox";
export { Switch } from "./forms/switch";
export type { SwitchProps } from "./forms/switch";

// navigation/
export { Tabs } from "./navigation/tabs";
export type { TabsProps, TabItem } from "./navigation/tabs";

// feedback/
export { Dialog } from "./feedback/dialog";
export type { DialogProps } from "./feedback/dialog";
export { Toast } from "./feedback/toast";
export type { ToastProps, ToastTone } from "./feedback/toast";
export { Tooltip } from "./feedback/tooltip";
export type { TooltipProps, TooltipSide } from "./feedback/tooltip";

// math/
export { Var, Sub, Sup, Frac, Sqrt, Op, Unit, Math } from "./math/math-parts";
export type {
  VarProps,
  SubSupProps,
  FracProps,
  SqrtProps,
  OpProps,
  UnitProps,
  MathProps,
} from "./math/math-parts";
export { MathRegion } from "./math/math-region";
export type { MathRegionProps, MathRegionStatus, MathRegionMode } from "./math/math-region";
