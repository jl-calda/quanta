/**
 * Show-steps substitution (Functional Brief §2.5).
 *
 * The signature middle line of `formula → formula-with-values → result`: clone
 * the AST and replace each leaf variable with its evaluated value (keeping
 * units), then render to TeX. Function names and unit literals are untouched.
 */
import { math } from "./math";
import type { MathNode } from "./math";
import { isUnit } from "./units";

/**
 * TeX of the expression with every in-scope leaf variable replaced by its value.
 * Substituted values are wrapped in parentheses to preserve precedence (e.g.
 * `a^b` with `a = -4` becomes `(-4)^b`, not `-4^b`).
 */
export function buildSubstitutedTex(
  node: MathNode,
  scope: Map<string, unknown>,
): string {
  const substituted = node.transform((current) => {
    if (!isSymbolNode(current)) return current;
    if (!scope.has(current.name)) return current;
    const replacement = valueNode(scope.get(current.name));
    return replacement ? new math.ParenthesisNode(replacement) : current;
  });
  return substituted.toTex();
}

/** Build an AST node that renders a scope value (number or unit) as notation. */
function valueNode(value: unknown): MathNode | null {
  if (typeof value === "number") {
    return new math.ConstantNode(value);
  }
  if (isUnit(value)) {
    const label = value.formatUnits();
    const num = value.toNumber(label);
    try {
      // Parse "12 kN" → a node whose toTex carries the unit notation.
      return math.parse(`${num} ${label}`);
    } catch {
      return new math.ConstantNode(num);
    }
  }
  return null;
}

interface SymbolNodeLike extends MathNode {
  isSymbolNode: true;
  name: string;
}
function isSymbolNode(n: MathNode): n is SymbolNodeLike {
  return (n as { isSymbolNode?: boolean }).isSymbolNode === true;
}
