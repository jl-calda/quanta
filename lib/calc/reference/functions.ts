/**
 * Functions catalog (Functional Brief §3.6 / 4.6 · Matrix G4).
 *
 * The function half of the Reference library, grouped by the mockup's eight
 * subcategories. Worked examples are authored in engine-evaluable mathjs so the
 * detail pane runs them live — the rendered result can never drift. For Mathcad
 * functions the engine doesn't yet implement (interp, Vlookup, root, Odesolve),
 * the example demonstrates the *operation* with engine-native math while the
 * signature, parameters, and prose still teach the real function.
 *
 * `insert` is the signature skeleton dropped at the caret for the user to fill.
 */
import type { FunctionRef } from "./types";

const F = (o: Omit<FunctionRef, "kind">): FunctionRef => ({ kind: "function", ...o });

export const FUNCTIONS: FunctionRef[] = [
  /* ---- lookup & data ---- */
  F({
    id: "interp",
    cat: "lookup",
    name: "interp",
    sig: "interp(vx, vy, x)",
    tag: "Lookup & data",
    desc: "Linear interpolation of a value x against paired data vectors.",
    params: [
      ["vx", "vector", "Strictly increasing x-data (e.g. heights)."],
      ["vy", "vector", "Matching y-data (e.g. pressures)."],
      ["x", "real", "Point to interpolate at; must lie within the vx range."],
    ],
    units: "Result carries the units of vy. x must be unit-compatible with vx; a mismatch flags inline.",
    related: ["linterp", "Vlookup", "max"],
    insert: "interp(vx, vy, x)",
    example: {
      caption: "Interpolating a wind-pressure profile at z = 17 m from a code table:",
      table: {
        headers: ["z (m)", "qₚ (kPa)"],
        rows: [["10", "0.74"], ["15", "0.86"], ["20", "0.95"], ["30", "1.08"]],
        highlightRows: [1, 2],
      },
      regions: ["qp := 0.86 kPa + (17 m - 15 m)/(20 m - 15 m) * (0.95 kPa - 0.86 kPa)"],
      units: ["kPa"],
      format: { decimals: 2, trailingZeros: true },
    },
  }),
  F({
    id: "vlookup",
    cat: "lookup",
    name: "Vlookup",
    sig: "Vlookup(value, table, col, [match])",
    tag: "Lookup & data",
    desc: "Finds a value in the first column of a table and returns a cell from the same row.",
    params: [
      ["value", "real | string", "Value to search for in column 1."],
      ["table", "matrix", "The lookup range."],
      ["col", "integer", "Column index of the value to return."],
      ["[match]", "flag", "Optional: 0 exact (default), 1 nearest-below."],
    ],
    units: "Returns the stored cell value with its units. The search value is compared dimensionally.",
    related: ["interp", "linterp", "max"],
    insert: "Vlookup(value, table, col)",
    example: {
      caption: "Looking up the tensile stress area of an M16 bolt from a property table:",
      table: {
        headers: ["d (mm)", "Aₛ (mm²)", "fᵤ (MPa)"],
        rows: [["12", "84.3", "800"], ["16", "157", "800"], ["20", "245", "800"]],
        highlightRows: [1],
      },
      regions: ["A_s := 157 mm^2"],
    },
  }),
  F({ id: "linterp", cat: "lookup", name: "linterp", sig: "linterp(vx, vy, x)", tag: "Lookup & data", desc: "Piecewise-linear interpolation that also extrapolates beyond the data.", params: [["vx", "vector", "x-data."], ["vy", "vector", "y-data."], ["x", "real", "Point to evaluate."]], units: "Result carries the units of vy.", related: ["interp", "Vlookup"], insert: "linterp(vx, vy, x)" }),

  /* ---- math & trig ---- */
  F({
    id: "max",
    cat: "mathtrig",
    name: "max",
    sig: "max(a, b, …)",
    tag: "Math & trig",
    desc: "Returns the largest of its arguments or of a data set.",
    params: [["a, b, …", "real | vector", "Values, or a single data vector to reduce."]],
    units: "All arguments must share a dimension; the result keeps it.",
    related: ["min", "mean", "sqrt"],
    insert: "max(a, b)",
    example: {
      caption: "Governing utilisation across three independent checks:",
      regions: ["URmax := max(0.23, 0.85, 0.61)"],
      format: { decimals: 2 },
    },
  }),
  F({ id: "min", cat: "mathtrig", name: "min", sig: "min(a, b, …)", tag: "Math & trig", desc: "Returns the smallest of its arguments or of a data set.", params: [["a, b, …", "real | vector", "Values, or a single data vector to reduce."]], units: "All arguments must share a dimension; the result keeps it.", related: ["max", "mean"], insert: "min(a, b)" }),
  F({
    id: "sqrt",
    cat: "mathtrig",
    name: "sqrt",
    sig: "sqrt(x)",
    tag: "Math & trig",
    desc: "Principal square root of a non-negative real number.",
    params: [["x", "real ≥ 0", "The radicand."]],
    units: "Takes the square root of the argument's units too (mm² → mm).",
    related: ["abs", "hypot", "max"],
    insert: "sqrt(x)",
    example: {
      caption: "Equivalent side of a 157 mm² area — note the unit takes the root:",
      regions: ["a := sqrt(157 mm^2)"],
      units: ["mm"],
      format: { decimals: 2 },
    },
  }),
  F({ id: "abs", cat: "mathtrig", name: "abs", sig: "abs(x)", tag: "Math & trig", desc: "Absolute value (magnitude) of a real number.", params: [["x", "real", "Input value."]], units: "Keeps the unit of the argument.", related: ["sqrt", "max"], insert: "abs(x)" }),
  F({ id: "sin", cat: "mathtrig", name: "sin", sig: "sin(θ)", tag: "Math & trig", desc: "Sine of an angle.", params: [["θ", "angle", "Angle in radians (or a unit-tagged angle)."]], units: "Argument is an angle; the result is dimensionless.", related: ["abs", "sqrt"], insert: "sin(theta)" }),

  /* ---- statistics ---- */
  F({
    id: "mean",
    cat: "stats",
    name: "mean",
    sig: "mean(A)",
    tag: "Statistics",
    desc: "Arithmetic mean of the elements of a vector or matrix.",
    params: [["A", "vector | matrix", "Data to average."]],
    units: "Result carries the common unit of the elements.",
    related: ["median", "std", "max"],
    insert: "mean(A)",
    example: {
      caption: "Average of four measured bay loads:",
      regions: ["P := [12.0, 14.5, 11.8, 13.1] kN", "Pbar := mean(P)"],
      units: [undefined, "kN"],
      format: { decimals: 2 },
    },
  }),
  F({ id: "median", cat: "stats", name: "median", sig: "median(A)", tag: "Statistics", desc: "Median (middle value) of a data set.", params: [["A", "vector | matrix", "Data."]], units: "Keeps the unit of the data.", related: ["mean", "std"], insert: "median(A)" }),
  F({ id: "std", cat: "stats", name: "std", sig: "std(A)", tag: "Statistics", desc: "Standard deviation of a data set.", params: [["A", "vector | matrix", "Data."]], units: "Keeps the unit of the data.", related: ["mean", "median"], insert: "std(A)" }),

  /* ---- solving ---- */
  F({
    id: "root",
    cat: "solving",
    name: "root",
    sig: "root(f(x), x, [a, b])",
    tag: "Solving",
    desc: "Solves f(x) = 0 for x, optionally bracketed on [a, b].",
    params: [
      ["f(x)", "expression", "Function whose root is sought."],
      ["x", "variable", "The unknown, with a guess value."],
      ["[a, b]", "real", "Optional bracketing interval."],
    ],
    units: "x keeps the units of its guess; f is evaluated dimensionally at each step.",
    related: ["polyroots", "minimize", "Odesolve"],
    insert: "root(f(x), x)",
    example: {
      caption: "x = 2 solves x² − 5x + 6 = 0 — substituting it back returns zero:",
      regions: ["x := 2", "f := x^2 - 5*x + 6"],
      format: { decimals: 2 },
      tone: "pass",
    },
  }),
  F({ id: "minimize", cat: "solving", name: "minimize", sig: "minimize(f, x₀)", tag: "Solving", desc: "Finds the x that minimises f, starting from guess x₀.", params: [["f", "expression", "Objective function."], ["x₀", "real | vector", "Starting guess."]], units: "x₀ sets the units of the optimisation variable.", related: ["root", "polyroots"], insert: "minimize(f, x0)" }),
  F({ id: "polyroots", cat: "solving", name: "polyroots", sig: "polyroots(v)", tag: "Solving", desc: "All roots of a polynomial given its coefficient vector.", params: [["v", "vector", "Coefficients, highest power first."]], units: "Coefficients should be dimensionally consistent.", related: ["root", "minimize"], insert: "polyroots(v)" }),
  F({ id: "odesolve", cat: "solving", name: "Odesolve", sig: "Odesolve(x, b, [steps])", tag: "Solving", desc: "Solves an ODE defined in a solve block over [0, b].", params: [["x", "variable", "Independent variable."], ["b", "real", "Upper limit of the solution interval."], ["[steps]", "integer", "Optional number of integration steps."]], units: "Solution and derivatives track the units declared in the solve block.", related: ["root", "polyroots"], insert: "Odesolve(x, b)" }),

  /* ---- matrix & vector ---- */
  F({ id: "identity", cat: "matrix", name: "identity", sig: "identity(n)", tag: "Matrix & vector", desc: "Returns the n × n identity matrix.", params: [["n", "integer", "Matrix order."]], units: "Dimensionless.", related: ["transpose", "inv", "det"], insert: "identity(n)" }),
  F({ id: "transpose", cat: "matrix", name: "transpose", sig: "transpose(M)", tag: "Matrix & vector", desc: "Swaps the rows and columns of a matrix.", params: [["M", "matrix", "Input matrix."]], units: "Element units are preserved.", related: ["identity", "inv", "det"], insert: "transpose(M)" }),
  F({ id: "det", cat: "matrix", name: "det", sig: "det(M)", tag: "Matrix & vector", desc: "Determinant of a square matrix.", params: [["M", "matrix", "Square input matrix."]], units: "Carries the product of the element units.", related: ["inv", "identity"], insert: "det(M)" }),
  F({ id: "inv", cat: "matrix", name: "inv", sig: "inv(M)", tag: "Matrix & vector", desc: "Inverse of a square, non-singular matrix.", params: [["M", "matrix", "Square input matrix."]], units: "Element units invert.", related: ["det", "transpose"], insert: "inv(M)" }),

  /* ---- programming ---- */
  F({ id: "if", cat: "programming", name: "if", sig: "if(cond, then, else)", tag: "Programming", desc: "Returns then when cond is true, otherwise else.", params: [["cond", "boolean", "Condition to test."], ["then", "any", "Value if true."], ["else", "any", "Value if false."]], units: "then and else should share a dimension.", related: ["and", "or"], insert: "if(cond, then, else)" }),
  F({ id: "and", cat: "programming", name: "and", sig: "and(a, b)", tag: "Programming", desc: "Logical conjunction of two conditions.", params: [["a", "boolean", "First condition."], ["b", "boolean", "Second condition."]], units: "Operands are dimensionless booleans.", related: ["or", "if"], insert: "and(a, b)" }),
  F({ id: "or", cat: "programming", name: "or", sig: "or(a, b)", tag: "Programming", desc: "Logical disjunction of two conditions.", params: [["a", "boolean", "First condition."], ["b", "boolean", "Second condition."]], units: "Operands are dimensionless booleans.", related: ["and", "if"], insert: "or(a, b)" }),

  /* ---- string ---- */
  F({ id: "concat", cat: "string", name: "concat", sig: "concat(s1, s2, …)", tag: "String", desc: "Joins two or more strings into one.", params: [["s1, s2, …", "string", "Strings to join."]], units: "Not applicable.", related: ["format", "number"], insert: 'concat(s1, s2)' }),
  F({ id: "format", cat: "string", name: "format", sig: "format(x)", tag: "String", desc: "Formats a value as a string for labels and notes.", params: [["x", "any", "Value to render."]], units: "Carries the value's unit into the text.", related: ["concat", "number"], insert: "format(x)" }),
  F({ id: "number", cat: "string", name: "number", sig: "number(s)", tag: "String", desc: "Parses a numeric string into a number.", params: [["s", "string", "Text to parse."]], units: "Dimensionless unless a unit is appended.", related: ["format", "concat"], insert: "number(s)" }),

  /* ---- engineering ---- */
  F({ id: "reynolds", cat: "engineering", name: "Re", sig: "Re(ρ, v, L, μ)", tag: "Engineering", desc: "Reynolds number characterising a flow regime.", params: [["ρ", "density", "Fluid density."], ["v", "velocity", "Flow velocity."], ["L", "length", "Characteristic length."], ["μ", "viscosity", "Dynamic viscosity."]], units: "Dimensionless result; arguments are checked for consistency.", related: ["sqrt"], insert: "rho * v * L / mu" }),
  F({ id: "hypot", cat: "engineering", name: "hypot", sig: "hypot(a, b)", tag: "Engineering", desc: "Euclidean norm √(a² + b²) — resultant of two orthogonal components.", params: [["a", "real", "First component."], ["b", "real", "Second component."]], units: "Both arguments must share a dimension; the result keeps it.", related: ["sqrt", "max"], insert: "hypot(a, b)" }),
];
