/* @ds-bundle: {"format":3,"namespace":"QuantaDesignSystem_019e2c","components":[{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"Dialog","sourcePath":"components/feedback/Dialog.jsx"},{"name":"Toast","sourcePath":"components/feedback/Toast.jsx"},{"name":"Tooltip","sourcePath":"components/feedback/Tooltip.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"Var","sourcePath":"components/math/MathParts.jsx"},{"name":"Sub","sourcePath":"components/math/MathParts.jsx"},{"name":"Sup","sourcePath":"components/math/MathParts.jsx"},{"name":"Frac","sourcePath":"components/math/MathParts.jsx"},{"name":"Sqrt","sourcePath":"components/math/MathParts.jsx"},{"name":"Op","sourcePath":"components/math/MathParts.jsx"},{"name":"Unit","sourcePath":"components/math/MathParts.jsx"},{"name":"Math","sourcePath":"components/math/MathParts.jsx"},{"name":"MathRegion","sourcePath":"components/math/MathRegion.jsx"},{"name":"Tabs","sourcePath":"components/navigation/Tabs.jsx"}],"sourceHashes":{"components/core/Badge.jsx":"1fbfa9a2925b","components/core/Button.jsx":"372f955d1bd7","components/core/Card.jsx":"40bdcb77828e","components/core/IconButton.jsx":"877ec59e5b66","components/feedback/Dialog.jsx":"2cb78a3474ff","components/feedback/Toast.jsx":"18599467acbd","components/feedback/Tooltip.jsx":"eeb1ce60bb19","components/forms/Checkbox.jsx":"a32850484237","components/forms/Input.jsx":"a31d809813a9","components/forms/Select.jsx":"5a68c409c786","components/forms/Switch.jsx":"b31742201b10","components/math/MathParts.jsx":"04b4c38c4532","components/math/MathRegion.jsx":"53adbf4fb3c6","components/navigation/Tabs.jsx":"a26ee7bfbd63","ui_kits/editor/AppBar.jsx":"06bfda1963d8","ui_kits/editor/EditorApp.jsx":"dd82a9faaabe","ui_kits/editor/InspectorPanel.jsx":"d7f7b8db7e41","ui_kits/editor/OutlinePanel.jsx":"bed99c8201a0","ui_kits/editor/Ribbon.jsx":"83879c6e3def","ui_kits/editor/Worksheet.jsx":"9d0026dae6d2"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.QuantaDesignSystem_019e2c = window.QuantaDesignSystem_019e2c || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Badge — compact status pill for results, utilization, and region states.
 * Tones: neutral, accent, pass, warning, error. Style: soft (tinted, default)
 * or solid. 4px radius (not pill) to match the precise instrument aesthetic.
 */
function Badge({
  tone = 'neutral',
  variant = 'soft',
  dot = false,
  children,
  style = {},
  ...rest
}) {
  const tones = {
    neutral: {
      fg: 'var(--text-muted)',
      bg: 'var(--chrome)',
      solidBg: 'var(--muted)'
    },
    accent: {
      fg: 'var(--accent)',
      bg: 'var(--accent-tint)',
      solidBg: 'var(--accent)'
    },
    pass: {
      fg: 'var(--status-pass)',
      bg: 'var(--status-pass-bg)',
      solidBg: 'var(--status-pass)'
    },
    warning: {
      fg: 'var(--status-warning)',
      bg: 'var(--status-warning-bg)',
      solidBg: 'var(--status-warning)'
    },
    error: {
      fg: 'var(--status-error)',
      bg: 'var(--status-error-bg)',
      solidBg: 'var(--status-error)'
    }
  };
  const t = tones[tone] || tones.neutral;
  const solid = variant === 'solid';
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      height: 19,
      padding: '0 7px',
      font: '600 var(--text-11)/1 var(--font-sans)',
      letterSpacing: '0.01em',
      color: solid ? '#FFFFFF' : t.fg,
      background: solid ? t.solidBg : t.bg,
      border: '1px solid ' + (solid ? 'transparent' : 'color-mix(in srgb, ' + t.fg + ' 22%, transparent)'),
      borderRadius: 'var(--radius-sm)',
      whiteSpace: 'nowrap',
      ...style
    }
  }, rest), dot && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: solid ? '#FFFFFF' : t.fg,
      flex: '0 0 auto'
    }
  }), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Button — primary action control for Quanta.
 * Variants: primary (blueprint fill), secondary (hairline outline),
 * ghost (no chrome), danger (error fill). Sizes: sm / md.
 * Precise 4px radius, never pill. Sentence-case labels that say what happens.
 */
function Button({
  variant = 'primary',
  size = 'md',
  iconLeft = null,
  iconRight = null,
  disabled = false,
  fullWidth = false,
  type = 'button',
  children,
  style = {},
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const [active, setActive] = React.useState(false);
  const sizes = {
    sm: {
      height: 26,
      padding: '0 10px',
      font: 'var(--text-12)',
      gap: 6
    },
    md: {
      height: 32,
      padding: '0 14px',
      font: 'var(--text-13)',
      gap: 7
    }
  };
  const s = sizes[size] || sizes.md;
  const palette = {
    primary: {
      bg: 'var(--accent)',
      bgHover: 'var(--accent)',
      bgActive: 'var(--accent-press)',
      fg: 'var(--text-inverse)',
      border: 'transparent',
      overlay: hover ? 'rgba(255,255,255,0.08)' : 'transparent'
    },
    secondary: {
      bg: 'var(--surface-raised)',
      bgHover: 'var(--surface-hover)',
      bgActive: 'var(--surface-hover)',
      fg: 'var(--text-primary)',
      border: 'var(--border-strong)',
      overlay: 'transparent'
    },
    ghost: {
      bg: 'transparent',
      bgHover: 'var(--surface-hover)',
      bgActive: 'var(--surface-hover)',
      fg: 'var(--text-primary)',
      border: 'transparent',
      overlay: 'transparent'
    },
    danger: {
      bg: 'var(--status-error)',
      bgHover: 'var(--status-error)',
      bgActive: 'var(--status-error)',
      fg: '#FFFFFF',
      border: 'transparent',
      overlay: hover ? 'rgba(0,0,0,0.10)' : 'transparent'
    }
  };
  const p = palette[variant] || palette.primary;
  const bg = disabled ? 'var(--surface-hover)' : active ? p.bgActive : hover ? p.bgHover : p.bg;
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    disabled: disabled,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false);
      setActive(false);
    },
    onMouseDown: () => setActive(true),
    onMouseUp: () => setActive(false),
    style: {
      display: fullWidth ? 'flex' : 'inline-flex',
      width: fullWidth ? '100%' : 'auto',
      alignItems: 'center',
      justifyContent: 'center',
      gap: s.gap,
      height: s.height,
      padding: s.padding,
      font: '500 ' + s.font + '/1 var(--font-sans)',
      letterSpacing: '0',
      color: disabled ? 'var(--text-muted)' : p.fg,
      background: bg,
      backgroundImage: p.overlay !== 'transparent' ? 'linear-gradient(' + p.overlay + ',' + p.overlay + ')' : 'none',
      border: '1px solid ' + (disabled ? 'var(--border-hairline)' : p.border),
      borderRadius: 'var(--radius-sm)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'background var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out)',
      transform: active && !disabled ? 'translateY(0.5px)' : 'none',
      whiteSpace: 'nowrap',
      userSelect: 'none',
      ...style
    }
  }, rest), iconLeft && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      flex: '0 0 auto'
    }
  }, iconLeft), children, iconRight && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      flex: '0 0 auto'
    }
  }, iconRight));
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Card / Panel — structural surface built from hairline borders, not shadow.
 * Use for grouping content in the chrome (property panels, result summaries).
 * `padded` toggles inner padding; `title`/`eyebrow` render an optional header.
 */
function Card({
  title,
  eyebrow,
  actions,
  padded = true,
  raised = false,
  children,
  style = {},
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      background: raised ? 'var(--surface-raised)' : 'var(--surface-chrome)',
      border: '1px solid var(--border-hairline)',
      borderRadius: 'var(--radius-md)',
      boxShadow: raised ? 'var(--shadow-sm)' : 'none',
      overflow: 'hidden',
      ...style
    }
  }, rest), (title || eyebrow || actions) && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 'var(--space-3)',
      padding: '10px var(--space-4)',
      borderBottom: '1px solid var(--border-hairline)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, eyebrow && /*#__PURE__*/React.createElement("div", {
    style: {
      font: '600 var(--text-11)/1.2 var(--font-sans)',
      letterSpacing: 'var(--tracking-eyebrow)',
      textTransform: 'uppercase',
      color: 'var(--text-muted)',
      marginBottom: title ? 2 : 0
    }
  }, eyebrow), title && /*#__PURE__*/React.createElement("div", {
    style: {
      font: '600 var(--text-14)/1.3 var(--font-sans)',
      color: 'var(--text-primary)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, title)), actions && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-2)',
      flex: '0 0 auto'
    }
  }, actions)), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: padded ? 'var(--space-4)' : 0
    }
  }, children));
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * IconButton — square, icon-only control for ribbons and toolbars.
 * Always pass an `label` for the tooltip/aria. Thin-stroke line icon as child.
 * Variants: ghost (default), solid (active/selected, blueprint), outline.
 */
function IconButton({
  label,
  variant = 'ghost',
  size = 'md',
  active = false,
  disabled = false,
  children,
  style = {},
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const [show, setShow] = React.useState(false);
  const sizes = {
    sm: 26,
    md: 30,
    lg: 34
  };
  const dim = sizes[size] || sizes.md;
  const isSolid = variant === 'solid' || active;
  const bg = disabled ? 'transparent' : isSolid ? 'var(--accent-tint)' : hover ? 'var(--surface-hover)' : 'transparent';
  const fg = disabled ? 'var(--text-muted)' : isSolid ? 'var(--accent)' : 'var(--text-primary)';
  const border = variant === 'outline' ? 'var(--border-strong)' : 'transparent';
  return /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    "aria-label": label,
    disabled: disabled,
    onMouseEnter: () => {
      setHover(true);
      setShow(true);
    },
    onMouseLeave: () => {
      setHover(false);
      setShow(false);
    },
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: dim,
      height: dim,
      color: fg,
      background: bg,
      border: '1px solid ' + border,
      borderRadius: 'var(--radius-sm)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out)',
      padding: 0,
      ...style
    }
  }, rest), children), show && label && /*#__PURE__*/React.createElement("span", {
    role: "tooltip",
    style: {
      position: 'absolute',
      bottom: 'calc(100% + 6px)',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'var(--ink)',
      color: 'var(--text-inverse)',
      font: '500 var(--text-11)/1.2 var(--font-sans)',
      padding: '4px 7px',
      borderRadius: 'var(--radius-sm)',
      whiteSpace: 'nowrap',
      pointerEvents: 'none',
      zIndex: 50,
      boxShadow: 'var(--shadow-popover)'
    }
  }, label));
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Dialog.jsx
try { (() => {
/**
 * Dialog — modal surface for confirmations and focused tasks. 8px radius,
 * single soft shadow, dimmed scrim. Header (title + optional eyebrow),
 * body, and a right-aligned footer action row. Controlled via `open`.
 */
function Dialog({
  open = false,
  title,
  eyebrow,
  onClose,
  footer = null,
  width = 460,
  children
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = e => {
      if (e.key === 'Escape') onClose && onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    role: "presentation",
    onMouseDown: e => {
      if (e.target === e.currentTarget) onClose && onClose();
    },
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(21,24,29,0.32)',
      padding: 'var(--space-6)',
      animation: 'qfade var(--dur-base) var(--ease-out)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    role: "dialog",
    "aria-modal": "true",
    style: {
      width: width,
      maxWidth: '100%',
      maxHeight: '90vh',
      overflow: 'auto',
      background: 'var(--surface-raised)',
      border: '1px solid var(--border-hairline)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-modal)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 'var(--space-4)',
      padding: 'var(--space-4) var(--space-6)',
      borderBottom: '1px solid var(--border-hairline)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, eyebrow && /*#__PURE__*/React.createElement("div", {
    style: {
      font: '600 var(--text-11)/1.2 var(--font-sans)',
      letterSpacing: 'var(--tracking-eyebrow)',
      textTransform: 'uppercase',
      color: 'var(--text-muted)',
      marginBottom: 3
    }
  }, eyebrow), /*#__PURE__*/React.createElement("h2", {
    style: {
      font: '600 var(--text-20)/1.25 var(--font-sans)',
      color: 'var(--text-primary)',
      letterSpacing: 'var(--tracking-tight)'
    }
  }, title)), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": "Close",
    onClick: () => onClose && onClose(),
    style: {
      flex: '0 0 auto',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 28,
      height: 28,
      marginTop: -2,
      marginRight: -6,
      background: 'none',
      border: 'none',
      borderRadius: 'var(--radius-sm)',
      color: 'var(--text-muted)',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.5",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M18 6L6 18M6 6l12 12"
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 'var(--space-6)',
      font: 'var(--text-14)/1.55 var(--font-sans)',
      color: 'var(--text-primary)'
    }
  }, children), footer && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: 'var(--space-2)',
      padding: 'var(--space-3) var(--space-6) var(--space-4)',
      borderTop: '1px solid var(--border-hairline)'
    }
  }, footer)), /*#__PURE__*/React.createElement("style", null, '@keyframes qfade{from{opacity:0}to{opacity:1}}'));
}
Object.assign(__ds_scope, { Dialog });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Dialog.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Toast.jsx
try { (() => {
/**
 * Toast — transient inline notification. Tones map to semantics: info
 * (blueprint), success (pass), warning, error. Leading status icon, title,
 * optional description, optional dismiss. Built as a static element — host it
 * in your own stack/positioner.
 */
function Toast({
  tone = 'info',
  title,
  description = null,
  onDismiss = null,
  style = {}
}) {
  const tones = {
    info: {
      c: 'var(--accent)',
      bg: 'var(--accent-tint)'
    },
    success: {
      c: 'var(--status-pass)',
      bg: 'var(--status-pass-bg)'
    },
    warning: {
      c: 'var(--status-warning)',
      bg: 'var(--status-warning-bg)'
    },
    error: {
      c: 'var(--status-error)',
      bg: 'var(--status-error-bg)'
    }
  };
  const t = tones[tone] || tones.info;
  const icons = {
    info: /*#__PURE__*/React.createElement("path", {
      d: "M12 16v-5M12 8h.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z"
    }),
    success: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M8.5 12.5l2.5 2.5 4.5-5"
    })),
    warning: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M10.3 3.8 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0z"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M12 9v4M12 17h.01"
    })),
    error: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M15 9l-6 6M9 9l6 6"
    }))
  };
  return /*#__PURE__*/React.createElement("div", {
    role: "status",
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 'var(--space-3)',
      width: 360,
      maxWidth: '100%',
      padding: '12px 14px',
      background: 'var(--surface-raised)',
      border: '1px solid var(--border-hairline)',
      borderLeft: '3px solid ' + t.c,
      borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--shadow-popover)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: '0 0 auto',
      color: t.c,
      marginTop: 1
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "18",
    height: "18",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, icons[tone])), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '600 var(--text-13)/1.4 var(--font-sans)',
      color: 'var(--text-primary)'
    }
  }, title), description && /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--text-12)/1.45 var(--font-sans)',
      color: 'var(--text-muted)',
      marginTop: 2
    }
  }, description)), onDismiss && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": "Dismiss",
    onClick: onDismiss,
    style: {
      flex: '0 0 auto',
      display: 'inline-flex',
      width: 22,
      height: 22,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: -1,
      marginRight: -4,
      background: 'none',
      border: 'none',
      borderRadius: 'var(--radius-sm)',
      color: 'var(--text-muted)',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.5",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M18 6L6 18M6 6l12 12"
  }))));
}
Object.assign(__ds_scope, { Toast });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Toast.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Tooltip.jsx
try { (() => {
/**
 * Tooltip — small hover/focus label. Wraps a single child trigger and shows
 * dark micro-label on the chosen side. Use for terse hints; for icon-only
 * buttons prefer IconButton's built-in tooltip.
 */
function Tooltip({
  label,
  side = 'top',
  children
}) {
  const [show, setShow] = React.useState(false);
  const pos = {
    top: {
      bottom: 'calc(100% + 6px)',
      left: '50%',
      transform: 'translateX(-50%)'
    },
    bottom: {
      top: 'calc(100% + 6px)',
      left: '50%',
      transform: 'translateX(-50%)'
    },
    left: {
      right: 'calc(100% + 6px)',
      top: '50%',
      transform: 'translateY(-50%)'
    },
    right: {
      left: 'calc(100% + 6px)',
      top: '50%',
      transform: 'translateY(-50%)'
    }
  };
  return /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'inline-flex'
    },
    onMouseEnter: () => setShow(true),
    onMouseLeave: () => setShow(false),
    onFocus: () => setShow(true),
    onBlur: () => setShow(false)
  }, children, show && /*#__PURE__*/React.createElement("span", {
    role: "tooltip",
    style: {
      position: 'absolute',
      zIndex: 60,
      pointerEvents: 'none',
      background: 'var(--ink)',
      color: 'var(--text-inverse)',
      font: '500 var(--text-11)/1.3 var(--font-sans)',
      padding: '4px 8px',
      borderRadius: 'var(--radius-sm)',
      whiteSpace: 'nowrap',
      boxShadow: 'var(--shadow-popover)',
      ...pos[side]
    }
  }, label));
}
Object.assign(__ds_scope, { Tooltip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Tooltip.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Checkbox — square 4px control with blueprint fill when checked.
 * Pass `label` for an inline label; `indeterminate` for tri-state.
 */
function Checkbox({
  checked = false,
  indeterminate = false,
  disabled = false,
  label = null,
  onChange,
  style = {},
  ...rest
}) {
  const on = checked || indeterminate;
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.55 : 1,
      font: 'var(--text-13) var(--font-sans)',
      color: 'var(--text-primary)',
      userSelect: 'none',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      width: 16,
      height: 16,
      flex: '0 0 auto',
      background: on ? 'var(--accent)' : 'var(--surface-raised)',
      border: '1px solid ' + (on ? 'var(--accent)' : 'var(--border-strong)'),
      borderRadius: 'var(--radius-sm)',
      transition: 'background var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, checked && !indeterminate && /*#__PURE__*/React.createElement("svg", {
    width: "11",
    height: "11",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "#fff",
    strokeWidth: "3",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M5 12l5 5L19 7"
  })), indeterminate && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 2,
      background: '#fff',
      borderRadius: 1
    }
  }), /*#__PURE__*/React.createElement("input", _extends({
    type: "checkbox",
    checked: checked,
    disabled: disabled,
    onChange: onChange
  }, rest, {
    style: {
      position: 'absolute',
      inset: 0,
      margin: 0,
      opacity: 0,
      cursor: 'inherit'
    }
  }))), label && /*#__PURE__*/React.createElement("span", null, label));
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Input — single-line text/number field. Hairline border, 4px radius,
 * 2px blueprint focus ring. Supports `mono` for formula/value entry,
 * `prefix`/`suffix` adornments (e.g. unit labels), and `invalid` state.
 */
function Input({
  size = 'md',
  mono = false,
  invalid = false,
  prefix = null,
  suffix = null,
  disabled = false,
  style = {},
  containerStyle = {},
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const heights = {
    sm: 26,
    md: 30
  };
  const h = heights[size] || heights.md;
  const borderColor = invalid ? 'var(--status-error)' : focus ? 'var(--border-focus)' : 'var(--border-strong)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      height: h,
      width: '100%',
      background: disabled ? 'var(--surface-hover)' : 'var(--surface-raised)',
      border: '1px solid ' + borderColor,
      borderRadius: 'var(--radius-sm)',
      boxShadow: focus ? '0 0 0 2px color-mix(in srgb, ' + (invalid ? 'var(--status-error)' : 'var(--accent)') + ' 28%, transparent)' : 'none',
      transition: 'border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)',
      padding: '0 8px',
      gap: 6,
      ...containerStyle
    }
  }, prefix && /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-muted)',
      font: 'var(--text-12) var(--font-mono)',
      flex: '0 0 auto'
    }
  }, prefix), /*#__PURE__*/React.createElement("input", _extends({
    disabled: disabled,
    onFocus: e => {
      setFocus(true);
      rest.onFocus && rest.onFocus(e);
    },
    onBlur: e => {
      setFocus(false);
      rest.onBlur && rest.onBlur(e);
    }
  }, rest, {
    style: {
      flex: 1,
      minWidth: 0,
      height: '100%',
      border: 'none',
      outline: 'none',
      background: 'transparent',
      color: 'var(--text-primary)',
      font: mono ? 'var(--text-13) var(--font-mono)' : 'var(--text-13) var(--font-sans)',
      padding: 0,
      ...style
    }
  })), suffix && /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-muted)',
      font: '500 var(--text-12) var(--font-mono)',
      flex: '0 0 auto'
    }
  }, suffix));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Select — native dropdown styled to match Quanta inputs. Hairline border,
 * 4px radius, custom chevron. Pass `options` as [{value, label}] or children.
 */
function Select({
  options = null,
  size = 'md',
  invalid = false,
  disabled = false,
  children,
  style = {},
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const heights = {
    sm: 26,
    md: 30
  };
  const h = heights[size] || heights.md;
  const borderColor = invalid ? 'var(--status-error)' : focus ? 'var(--border-focus)' : 'var(--border-strong)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      display: 'inline-flex',
      width: '100%'
    }
  }, /*#__PURE__*/React.createElement("select", _extends({
    disabled: disabled,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false)
  }, rest, {
    style: {
      appearance: 'none',
      WebkitAppearance: 'none',
      width: '100%',
      height: h,
      padding: '0 28px 0 8px',
      font: 'var(--text-13) var(--font-sans)',
      color: 'var(--text-primary)',
      background: disabled ? 'var(--surface-hover)' : 'var(--surface-raised)',
      border: '1px solid ' + borderColor,
      borderRadius: 'var(--radius-sm)',
      boxShadow: focus ? '0 0 0 2px color-mix(in srgb, var(--accent) 28%, transparent)' : 'none',
      transition: 'border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      ...style
    }
  }), options ? options.map(o => /*#__PURE__*/React.createElement("option", {
    key: o.value,
    value: o.value
  }, o.label)) : children), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      right: 8,
      top: '50%',
      transform: 'translateY(-50%)',
      pointerEvents: 'none',
      color: 'var(--text-muted)',
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M6 9l6 6 6-6"
  }))));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Switch — binary toggle for settings (e.g. dark theme, auto-recalc).
 * Track turns blueprint when on. 4px-feel rounded track (the one place a
 * fuller radius is allowed for affordance). Pass `label` for inline text.
 */
function Switch({
  checked = false,
  disabled = false,
  label = null,
  onChange,
  style = {},
  ...rest
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.55 : 1,
      font: 'var(--text-13) var(--font-sans)',
      color: 'var(--text-primary)',
      userSelect: 'none',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      width: 32,
      height: 18,
      flex: '0 0 auto',
      background: checked ? 'var(--accent)' : 'var(--border-strong)',
      borderRadius: 'var(--radius-full)',
      transition: 'background var(--dur-base) var(--ease-out)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 2,
      left: checked ? 16 : 2,
      width: 14,
      height: 14,
      background: '#fff',
      borderRadius: '50%',
      boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
      transition: 'left var(--dur-base) var(--ease-out)'
    }
  }), /*#__PURE__*/React.createElement("input", _extends({
    type: "checkbox",
    role: "switch",
    checked: checked,
    disabled: disabled,
    onChange: onChange
  }, rest, {
    style: {
      position: 'absolute',
      inset: 0,
      margin: 0,
      opacity: 0,
      cursor: 'inherit'
    }
  }))), label && /*#__PURE__*/React.createElement("span", null, label));
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/math/MathParts.jsx
try { (() => {
/* ==========================================================================
   Quanta — textbook math notation primitives.
   Compositional building blocks rendered in the math serif (STIX Two Text).
   These produce true textbook layout (stacked fractions, radicals, sub/sup),
   never code. Used by MathRegion and available directly on the namespace.
   ========================================================================== */

const mathFont = {
  fontFamily: 'var(--font-math)',
  color: 'var(--text-math)'
};

/** Variable / symbol in the math face. Use `i` for italic (default true). */
function Var({
  children,
  italic = true,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      ...mathFont,
      fontStyle: italic ? 'italic' : 'normal',
      ...style
    }
  }, children);
}

/** Subscript: <Sub base="M" sub="Ed" /> → M_Ed */
function Sub({
  base,
  sub,
  italic = true
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      ...mathFont,
      fontStyle: italic ? 'italic' : 'normal',
      whiteSpace: 'nowrap'
    }
  }, base, /*#__PURE__*/React.createElement("sub", {
    style: {
      fontSize: '0.66em',
      fontStyle: 'normal',
      lineHeight: 0
    }
  }, sub));
}

/** Superscript / power: <Sup base="r" sup="2" /> */
function Sup({
  base,
  sup,
  italic = true
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      ...mathFont,
      fontStyle: italic ? 'italic' : 'normal',
      whiteSpace: 'nowrap'
    }
  }, base, /*#__PURE__*/React.createElement("sup", {
    style: {
      fontSize: '0.66em',
      fontStyle: 'normal',
      lineHeight: 0
    }
  }, sup));
}

/** Stacked fraction with a true rule between numerator and denominator. */
function Frac({
  num,
  den,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      flexDirection: 'column',
      alignItems: 'center',
      verticalAlign: 'middle',
      margin: '0 0.18em',
      ...mathFont,
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      padding: '0 0.35em 0.08em',
      lineHeight: 1.05
    }
  }, num), /*#__PURE__*/React.createElement("span", {
    style: {
      width: '100%',
      height: 1,
      background: 'currentColor'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      padding: '0.08em 0.35em 0',
      lineHeight: 1.05
    }
  }, den));
}

/** Radical. `index` for nth-root (optional). */
function Sqrt({
  children,
  index = null,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'stretch',
      ...mathFont,
      whiteSpace: 'nowrap',
      ...style
    }
  }, index != null && /*#__PURE__*/React.createElement("sup", {
    style: {
      fontSize: '0.6em',
      alignSelf: 'flex-start',
      marginRight: '-0.35em',
      marginTop: '0.1em'
    }
  }, index), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '1.15em',
      lineHeight: 1,
      transform: 'translateY(-0.02em)'
    }
  }, "\u221A"), /*#__PURE__*/React.createElement("span", {
    style: {
      borderTop: '1px solid currentColor',
      padding: '0.12em 0.2em 0',
      marginLeft: '-0.06em'
    }
  }, children));
}

/** Operators & symbols rendered upright in the math face. */
function Op({
  children,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      ...mathFont,
      fontStyle: 'normal',
      padding: '0 0.18em',
      ...style
    }
  }, children);
}

/** Unit label — upright, slightly muted, after a thin space. */
function Unit({
  children,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      ...mathFont,
      fontStyle: 'normal',
      marginLeft: '0.28em',
      ...style
    }
  }, children);
}

/** Inline math wrapper that sets the face/size for arbitrary composed content. */
function Math({
  size = 17,
  children,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      ...mathFont,
      fontSize: size,
      lineHeight: 1.1,
      display: 'inline-flex',
      alignItems: 'center',
      flexWrap: 'wrap',
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { Var, Sub, Sup, Frac, Sqrt, Op, Unit, Math });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/math/MathParts.jsx", error: String((e && e.message) || e) }); }

// components/math/MathRegion.jsx
try { (() => {
/**
 * MathRegion — Quanta's signature element. A live calculation cell that
 * toggles between EDIT mode (raw spreadsheet-style formula in Geist Mono) and
 * COMMITTED mode (crisp textbook notation in the math serif), with a
 * highlighted result and unit. Click a committed region to edit; press Enter
 * or blur to commit. The transform is the product's defining moment.
 *
 * The committed right-hand-side expression is passed as `children`, composed
 * from the math primitives (Var, Sub, Frac, Sqrt, …).
 */
function MathRegion({
  name,
  formula = '',
  result = null,
  unit = null,
  status = null,
  note = null,
  selected = false,
  defaultMode = 'committed',
  onCommit = null,
  children,
  style = {}
}) {
  const [mode, setMode] = React.useState(defaultMode);
  const [draft, setDraft] = React.useState(formula);
  const inputRef = React.useRef(null);
  React.useEffect(() => {
    if (mode === 'edit' && inputRef.current) inputRef.current.focus();
  }, [mode]);
  const statusColor = {
    pass: 'var(--status-pass)',
    warning: 'var(--status-warning)',
    error: 'var(--status-error)'
  }[status] || null;
  const statusBg = {
    pass: 'var(--status-pass-bg)',
    warning: 'var(--status-warning-bg)',
    error: 'var(--status-error-bg)'
  }[status] || null;
  const commit = () => {
    setMode('committed');
    onCommit && onCommit(draft);
  };
  const outline = selected ? 'var(--accent)' : 'transparent';
  const bg = selected ? 'var(--surface-selected)' : 'transparent';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'var(--space-2)',
      padding: '6px 10px',
      borderRadius: 'var(--radius-sm)',
      border: '1px solid ' + outline,
      background: bg,
      transition: 'background var(--dur-base) var(--ease-out), border-color var(--dur-base) var(--ease-out)',
      ...style
    }
  }, mode === 'edit' ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '500 var(--text-11)/1 var(--font-sans)',
      letterSpacing: 'var(--tracking-eyebrow)',
      textTransform: 'uppercase',
      color: 'var(--accent)'
    }
  }, "edit"), /*#__PURE__*/React.createElement("input", {
    ref: inputRef,
    value: draft,
    onChange: e => setDraft(e.target.value),
    onKeyDown: e => {
      if (e.key === 'Enter') commit();
      if (e.key === 'Escape') {
        setDraft(formula);
        setMode('committed');
      }
    },
    onBlur: commit,
    spellCheck: false,
    style: {
      font: 'var(--text-14)/1.3 var(--font-mono)',
      color: 'var(--text-primary)',
      background: 'var(--surface-raised)',
      border: '1px solid var(--border-focus)',
      boxShadow: '0 0 0 2px color-mix(in srgb, var(--accent) 28%, transparent)',
      borderRadius: 'var(--radius-sm)',
      padding: '4px 8px',
      minWidth: Math.max(180, (draft.length + 2) * 8.2),
      outline: 'none'
    }
  })) : /*#__PURE__*/React.createElement("div", {
    onClick: () => setMode('edit'),
    title: "Click to edit formula",
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.45em',
      cursor: 'text',
      font: '17px/1.1 var(--font-math)',
      color: 'var(--text-math)'
    }
  }, name && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-math)',
      fontStyle: 'italic',
      whiteSpace: 'nowrap'
    }
  }, name), name && children && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-math)',
      padding: '0 0.1em'
    }
  }, "="), children && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      flexWrap: 'wrap',
      columnGap: '0.1em'
    }
  }, children), result != null && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-math)',
      padding: '0 0.1em'
    }
  }, "="), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'baseline',
      gap: '0.18em',
      padding: '1px 7px',
      borderRadius: 'var(--radius-sm)',
      background: statusBg || 'var(--accent-tint)',
      color: statusColor || 'var(--accent)',
      fontFamily: 'var(--font-math)',
      fontWeight: 600,
      fontStyle: 'normal'
    }
  }, /*#__PURE__*/React.createElement("span", null, result), unit && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '0.82em',
      fontStyle: 'normal'
    }
  }, unit))), status && /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: '0.35em',
      font: '600 var(--text-11)/1 var(--font-sans)',
      letterSpacing: '0.02em',
      color: statusColor,
      fontStyle: 'normal',
      textTransform: 'uppercase'
    }
  }, status === 'pass' ? 'OK' : status === 'warning' ? 'Check' : 'Fail')), note && mode === 'committed' && /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--text-12)/1.3 var(--font-sans)',
      color: 'var(--text-muted)',
      marginLeft: 'var(--space-2)',
      fontStyle: 'italic'
    }
  }, note));
}
Object.assign(__ds_scope, { MathRegion });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/math/MathRegion.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tabs.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Tabs — flat, underline-style segmented navigation. Active tab carries a
 * 2px blueprint underline; hairline rule beneath the row. Controlled via
 * `value` / `onChange`, or uncontrolled with `defaultValue`.
 */
function Tabs({
  items = [],
  value,
  defaultValue,
  onChange,
  style = {},
  ...rest
}) {
  const [internal, setInternal] = React.useState(defaultValue ?? (items[0] && items[0].value));
  const active = value !== undefined ? value : internal;
  const select = v => {
    if (value === undefined) setInternal(v);
    onChange && onChange(v);
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "tablist",
    style: {
      display: 'flex',
      gap: 'var(--space-4)',
      borderBottom: '1px solid var(--border-hairline)',
      ...style
    }
  }, rest), items.map(it => {
    const on = it.value === active;
    return /*#__PURE__*/React.createElement("button", {
      key: it.value,
      role: "tab",
      "aria-selected": on,
      disabled: it.disabled,
      onClick: () => !it.disabled && select(it.value),
      style: {
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 2px',
        font: (on ? '600' : '500') + ' var(--text-13)/1 var(--font-sans)',
        color: it.disabled ? 'var(--text-muted)' : on ? 'var(--text-primary)' : 'var(--text-muted)',
        background: 'none',
        border: 'none',
        cursor: it.disabled ? 'not-allowed' : 'pointer',
        marginBottom: -1,
        borderBottom: '2px solid ' + (on ? 'var(--accent)' : 'transparent'),
        transition: 'color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out)'
      }
    }, it.icon && /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex'
      }
    }, it.icon), it.label, it.badge != null && /*#__PURE__*/React.createElement("span", {
      style: {
        font: '600 var(--text-11)/1 var(--font-sans)',
        color: on ? 'var(--accent)' : 'var(--text-muted)',
        background: on ? 'var(--accent-tint)' : 'var(--chrome)',
        borderRadius: 'var(--radius-sm)',
        padding: '2px 5px'
      }
    }, it.badge));
  }));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tabs.jsx", error: String((e && e.message) || e) }); }

// ui_kits/editor/AppBar.jsx
try { (() => {
// AppBar — top chrome bar: logo, worksheet title + status, primary actions, theme toggle.
function AppBar({
  theme,
  onToggleTheme,
  onShare,
  onRecalc,
  dirty
}) {
  const {
    IconButton,
    Button,
    Badge
  } = window.QuantaDesignSystem_019e2c;
  const Ic = ({
    d
  }) => /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, d);
  return /*#__PURE__*/React.createElement("header", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-4)',
      height: 48,
      padding: '0 var(--space-4)',
      background: 'var(--surface-chrome)',
      borderBottom: '1px solid var(--border-hairline)',
      flex: '0 0 auto'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/quanta-mark.svg",
    alt: "Quanta",
    style: {
      width: 24,
      height: 24
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--text-12) var(--font-sans)',
      color: 'var(--text-muted)'
    }
  }, "Rooftop access \xB7 "), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 var(--text-13) var(--font-sans)',
      color: 'var(--text-primary)',
      whiteSpace: 'nowrap'
    }
  }, "Guardrail post \u2014 base-plate anchor check"), dirty ? /*#__PURE__*/React.createElement(Badge, {
    tone: "warning",
    dot: true
  }, "Unsaved") : /*#__PURE__*/React.createElement(Badge, {
    tone: "neutral"
  }, "Saved")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    label: "Undo"
  }, /*#__PURE__*/React.createElement(Ic, {
    d: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M9 14L4 9l5-5"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M4 9h11a5 5 0 0 1 0 10h-1"
    }))
  })), /*#__PURE__*/React.createElement(IconButton, {
    label: "Redo"
  }, /*#__PURE__*/React.createElement(Ic, {
    d: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M15 14l5-5-5-5"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M20 9H9a5 5 0 0 0 0 10h1"
    }))
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 1,
      height: 22,
      background: 'var(--border-hairline)',
      margin: '0 4px'
    }
  }), /*#__PURE__*/React.createElement(IconButton, {
    label: theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme',
    onClick: onToggleTheme
  }, theme === 'dark' ? /*#__PURE__*/React.createElement(Ic, {
    d: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "4"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
    }))
  }) : /*#__PURE__*/React.createElement(Ic, {
    d: /*#__PURE__*/React.createElement("path", {
      d: "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"
    })
  })), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm",
    onClick: onRecalc,
    iconLeft: /*#__PURE__*/React.createElement(Ic, {
      d: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
        d: "M21 12a9 9 0 1 1-2.64-6.36"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M21 3v5h-5"
      }))
    })
  }, "Recalculate"), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    onClick: onShare,
    iconLeft: /*#__PURE__*/React.createElement(Ic, {
      d: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
        cx: "18",
        cy: "5",
        r: "3"
      }), /*#__PURE__*/React.createElement("circle", {
        cx: "6",
        cy: "12",
        r: "3"
      }), /*#__PURE__*/React.createElement("circle", {
        cx: "18",
        cy: "19",
        r: "3"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"
      }))
    })
  }, "Share")));
}
window.AppBar = AppBar;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/editor/AppBar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/editor/EditorApp.jsx
try { (() => {
// EditorApp — composes the full Quanta worksheet editor; owns shared state.
function EditorApp() {
  const {
    Dialog,
    Button,
    Toast,
    Input,
    Checkbox
  } = window.QuantaDesignSystem_019e2c;
  const [theme, setTheme] = React.useState('light');
  const [activeId, setActiveId] = React.useState('reg-T');
  const [shareOpen, setShareOpen] = React.useState(false);
  const [toast, setToast] = React.useState(null);
  const [dirty, setDirty] = React.useState(true);
  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  const recalc = () => {
    setDirty(false);
    setToast({
      tone: 'success',
      title: 'Worksheet recalculated',
      description: '8 regions updated · 0 errors · η = 0.71 PASS'
    });
    setTimeout(() => setToast(null), 3200);
  };
  const insert = kind => {
    setToast({
      tone: 'info',
      title: 'Inserted ' + kind + ' region',
      description: 'New region added below the selection.'
    });
    setDirty(true);
    setTimeout(() => setToast(null), 2600);
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--surface-paper)'
    }
  }, /*#__PURE__*/React.createElement(AppBar, {
    theme: theme,
    dirty: dirty,
    onToggleTheme: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
    onShare: () => setShareOpen(true),
    onRecalc: recalc
  }), /*#__PURE__*/React.createElement(Ribbon, {
    onInsert: insert
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement(OutlinePanel, {
    activeId: activeId,
    onSelect: setActiveId
  }), /*#__PURE__*/React.createElement(Worksheet, {
    activeId: activeId,
    onSelect: setActiveId
  }), /*#__PURE__*/React.createElement(InspectorPanel, {
    util: 0.71
  })), /*#__PURE__*/React.createElement("footer", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      height: 26,
      flex: '0 0 auto',
      padding: '0 var(--space-4)',
      background: 'var(--surface-chrome)',
      borderTop: '1px solid var(--border-hairline)',
      font: 'var(--text-11) var(--font-mono)',
      color: 'var(--text-muted)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--status-pass)',
      fontWeight: 600
    }
  }, "\u25CF Calculated"), /*#__PURE__*/React.createElement("span", null, "8 regions"), /*#__PURE__*/React.createElement("span", null, "0 errors"), /*#__PURE__*/React.createElement("span", null, "Units: SI"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("span", null, "Ln 24, region T_Ed"), /*#__PURE__*/React.createElement("span", null, "AS 1657:2018")), toast && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      right: 'var(--space-6)',
      bottom: 'calc(var(--space-6) + 26px)',
      zIndex: 200
    }
  }, /*#__PURE__*/React.createElement(Toast, {
    tone: toast.tone,
    title: toast.title,
    description: toast.description,
    onDismiss: () => setToast(null)
  })), /*#__PURE__*/React.createElement(Dialog, {
    open: shareOpen,
    eyebrow: "Worksheet",
    title: "Share worksheet",
    onClose: () => setShareOpen(false),
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      onClick: () => setShareOpen(false)
    }, "Cancel"), /*#__PURE__*/React.createElement(Button, {
      onClick: () => {
        setShareOpen(false);
        setToast({
          tone: 'success',
          title: 'Link copied',
          description: 'Anyone with the link can view this worksheet.'
        });
        setTimeout(() => setToast(null), 2600);
      }
    }, "Copy link & share"))
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '0 0 16px',
      color: 'var(--text-muted)'
    }
  }, "Share a read-only snapshot of this calculation. Viewers see the live results and inputs but can't edit unless you grant access."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement(Input, {
    defaultValue: "https://quanta.app/w/guardrail-anchor-7f3a",
    readOnly: true
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary"
  }, "Copy")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Checkbox, {
    checked: true,
    label: "Include input assumptions",
    onChange: () => {}
  }), /*#__PURE__*/React.createElement(Checkbox, {
    label: "Allow viewers to download PDF",
    onChange: () => {}
  }), /*#__PURE__*/React.createElement(Checkbox, {
    label: "Require sign-in to open",
    onChange: () => {}
  }))));
}
window.EditorApp = EditorApp;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/editor/EditorApp.jsx", error: String((e && e.message) || e) }); }

// ui_kits/editor/InspectorPanel.jsx
try { (() => {
// InspectorPanel — right rail: result summary + region properties.
function InspectorPanel({
  util
}) {
  const {
    Card,
    Badge,
    Switch,
    Select,
    Input
  } = window.QuantaDesignSystem_019e2c;
  const [autoRecalc, setAutoRecalc] = React.useState(true);
  const pct = Math.round(util * 100);
  const utilTone = util > 1 ? 'error' : util > 0.9 ? 'warning' : 'pass';
  const utilColor = util > 1 ? 'var(--status-error)' : util > 0.9 ? 'var(--status-warning)' : 'var(--status-pass)';
  return /*#__PURE__*/React.createElement("aside", {
    style: {
      width: 296,
      flex: '0 0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-3)',
      background: 'var(--surface-chrome)',
      borderLeft: '1px solid var(--border-hairline)',
      padding: 'var(--space-3)',
      overflow: 'auto'
    }
  }, /*#__PURE__*/React.createElement(Card, {
    raised: true,
    eyebrow: "Result",
    title: "Anchor capacity",
    actions: /*#__PURE__*/React.createElement(Badge, {
      tone: utilTone,
      dot: true
    }, util <= 1 ? 'PASS' : 'FAIL')
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 28px/1 var(--font-sans)',
      color: utilColor,
      letterSpacing: '-0.01em'
    }
  }, util.toFixed(2)), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--text-13) var(--font-sans)',
      color: 'var(--text-muted)'
    }
  }, "utilization")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      height: 6,
      borderRadius: 3,
      background: 'var(--rule)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: Math.min(pct, 100) + '%',
      height: '100%',
      background: utilColor,
      transition: 'width var(--dur-slow) var(--ease-out)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      marginTop: 8,
      font: 'var(--text-12) var(--font-mono)',
      color: 'var(--text-muted)'
    }
  }, /*#__PURE__*/React.createElement("span", null, "T_Ed 3.44 kN"), /*#__PURE__*/React.createElement("span", null, "T_Rd 4.82 kN"))), /*#__PURE__*/React.createElement(Card, {
    eyebrow: "Selected region",
    title: "Bolt tension \u2014 T_Ed"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Result format"
  }, /*#__PURE__*/React.createElement(Select, {
    size: "sm",
    defaultValue: "3",
    options: [{
      value: '2',
      label: '2 significant figures'
    }, {
      value: '3',
      label: '3 significant figures'
    }, {
      value: '4',
      label: '4 significant figures'
    }]
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Display unit"
  }, /*#__PURE__*/React.createElement(Select, {
    size: "sm",
    defaultValue: "kN",
    options: [{
      value: 'kN',
      label: 'kN'
    }, {
      value: 'N',
      label: 'N'
    }, {
      value: 'kgf',
      label: 'kgf'
    }]
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Tolerance band (kN)"
  }, /*#__PURE__*/React.createElement(Input, {
    size: "sm",
    mono: true,
    defaultValue: "0.05",
    suffix: "kN"
  })))), /*#__PURE__*/React.createElement(Card, {
    eyebrow: "Worksheet",
    title: "Calculation"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement(Switch, {
    checked: autoRecalc,
    onChange: e => setAutoRecalc(e.target.checked),
    label: "Auto-recalculate"
  }), /*#__PURE__*/React.createElement(Field, {
    label: "Reference standard"
  }, /*#__PURE__*/React.createElement(Select, {
    size: "sm",
    defaultValue: "as1657",
    options: [{
      value: 'as1657',
      label: 'AS 1657:2018'
    }, {
      value: 'en1991',
      label: 'EN 1991-1-1'
    }]
  })))));
}
function Field({
  label,
  children
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'block'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      marginBottom: 5,
      font: '500 var(--text-12)/1 var(--font-sans)',
      color: 'var(--text-muted)'
    }
  }, label), children);
}
window.InspectorPanel = InspectorPanel;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/editor/InspectorPanel.jsx", error: String((e && e.message) || e) }); }

// ui_kits/editor/OutlinePanel.jsx
try { (() => {
// OutlinePanel — left rail: document outline + defined variables.
function OutlinePanel({
  activeId,
  onSelect
}) {
  const {
    Tabs
  } = window.QuantaDesignSystem_019e2c;
  const [tab, setTab] = React.useState('outline');
  const outline = [{
    id: 'sec-inputs',
    label: 'Inputs & assumptions',
    depth: 0
  }, {
    id: 'reg-Fh',
    label: 'Imposed line load',
    depth: 1
  }, {
    id: 'reg-h',
    label: 'Rail height',
    depth: 1
  }, {
    id: 'sec-actions',
    label: 'Design actions',
    depth: 0
  }, {
    id: 'reg-M',
    label: 'Overturning moment',
    depth: 1
  }, {
    id: 'reg-T',
    label: 'Bolt tension',
    depth: 1
  }, {
    id: 'sec-check',
    label: 'Anchor capacity check',
    depth: 0
  }, {
    id: 'reg-eta',
    label: 'Utilization',
    depth: 1
  }];
  const vars = [{
    sym: 'F_h',
    val: '0.75',
    unit: 'kN'
  }, {
    sym: 'h',
    val: '1100',
    unit: 'mm'
  }, {
    sym: 'n',
    val: '2',
    unit: ''
  }, {
    sym: 'd',
    val: '120',
    unit: 'mm'
  }, {
    sym: 'M',
    val: '0.825',
    unit: 'kN·m'
  }, {
    sym: 'T_Ed',
    val: '3.44',
    unit: 'kN'
  }, {
    sym: 'T_Rd',
    val: '4.82',
    unit: 'kN'
  }, {
    sym: 'η',
    val: '0.71',
    unit: ''
  }];
  return /*#__PURE__*/React.createElement("aside", {
    style: {
      width: 248,
      flex: '0 0 auto',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--surface-chrome)',
      borderRight: '1px solid var(--border-hairline)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '8px var(--space-3) 0'
    }
  }, /*#__PURE__*/React.createElement(Tabs, {
    value: tab,
    onChange: setTab,
    items: [{
      value: 'outline',
      label: 'Outline'
    }, {
      value: 'vars',
      label: 'Variables',
      badge: vars.length
    }]
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: 'auto',
      padding: 'var(--space-2)'
    }
  }, tab === 'outline' ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 1
    }
  }, outline.map(o => {
    const on = o.id === activeId;
    const isSec = o.depth === 0;
    return /*#__PURE__*/React.createElement("button", {
      key: o.id,
      onClick: () => onSelect(o.id),
      style: {
        textAlign: 'left',
        border: 'none',
        cursor: 'pointer',
        padding: '5px 8px',
        paddingLeft: 8 + o.depth * 14,
        borderRadius: 'var(--radius-sm)',
        background: on ? 'var(--surface-selected)' : 'transparent',
        color: isSec ? 'var(--text-primary)' : 'var(--text-muted)',
        font: (isSec ? '600 ' : '') + 'var(--text-12)/1.4 var(--font-sans)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }
    }, o.label);
  })) : /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column'
    }
  }, vars.map(v => /*#__PURE__*/React.createElement("div", {
    key: v.sym,
    style: {
      display: 'flex',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: 8,
      padding: '5px 8px',
      borderBottom: '1px solid var(--border-hairline)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'italic var(--text-13) var(--font-math)',
      color: 'var(--text-primary)'
    },
    dangerouslySetInnerHTML: {
      __html: v.sym.replace(/_([A-Za-z]+)/, '<sub style="font-style:normal;font-size:0.7em">$1</sub>')
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--text-12) var(--font-mono)',
      color: 'var(--text-muted)'
    }
  }, v.val, v.unit && /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 4
    }
  }, v.unit)))))));
}
window.OutlinePanel = OutlinePanel;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/editor/OutlinePanel.jsx", error: String((e && e.message) || e) }); }

// ui_kits/editor/Ribbon.jsx
try { (() => {
// Ribbon — insert + format toolbar beneath the app bar. Grouped icon buttons.
function Ribbon({
  onInsert
}) {
  const {
    IconButton,
    Select
  } = window.QuantaDesignSystem_019e2c;
  const Ic = ({
    d
  }) => /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, d);
  const Group = ({
    children
  }) => /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 2
    }
  }, children);
  const Sep = () => /*#__PURE__*/React.createElement("span", {
    style: {
      width: 1,
      height: 20,
      background: 'var(--border-hairline)',
      margin: '0 6px'
    }
  });
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      height: 40,
      padding: '0 var(--space-3)',
      background: 'var(--surface-chrome)',
      borderBottom: '1px solid var(--border-hairline)',
      flex: '0 0 auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 168
    }
  }, /*#__PURE__*/React.createElement(Select, {
    size: "sm",
    defaultValue: "uls",
    options: [{
      value: 'uls',
      label: 'Ultimate (ULS)'
    }, {
      value: 'sls',
      label: 'Serviceability (SLS)'
    }]
  })), /*#__PURE__*/React.createElement(Sep, null), /*#__PURE__*/React.createElement(Group, null, /*#__PURE__*/React.createElement(IconButton, {
    label: "Insert math region",
    onClick: () => onInsert('math')
  }, /*#__PURE__*/React.createElement(Ic, {
    d: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M5 5h14M9 5v6.5a3.5 3.5 0 0 1-7 0"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M14 19l5-5M14 14l5 5"
    }))
  })), /*#__PURE__*/React.createElement(IconButton, {
    label: "Insert text",
    onClick: () => onInsert('text')
  }, /*#__PURE__*/React.createElement(Ic, {
    d: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M4 7V5h16v2M9 19h6M12 5v14"
    }))
  })), /*#__PURE__*/React.createElement(IconButton, {
    label: "Insert table",
    onClick: () => onInsert('table')
  }, /*#__PURE__*/React.createElement(Ic, {
    d: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
      x: "3",
      y: "4",
      width: "18",
      height: "16",
      rx: "1.5"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M3 10h18M3 15h18M9 4v16M15 4v16"
    }))
  })), /*#__PURE__*/React.createElement(IconButton, {
    label: "Insert plot",
    onClick: () => onInsert('plot')
  }, /*#__PURE__*/React.createElement(Ic, {
    d: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M3 3v18h18"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M7 14l3-4 3 2 4-6"
    }))
  })), /*#__PURE__*/React.createElement(IconButton, {
    label: "Insert image",
    onClick: () => onInsert('image')
  }, /*#__PURE__*/React.createElement(Ic, {
    d: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
      x: "3",
      y: "4",
      width: "18",
      height: "16",
      rx: "1.5"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "9",
      cy: "10",
      r: "1.6"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M21 17l-5-5-7 7"
    }))
  }))), /*#__PURE__*/React.createElement(Sep, null), /*#__PURE__*/React.createElement(Group, null, /*#__PURE__*/React.createElement(IconButton, {
    label: "Bold"
  }, /*#__PURE__*/React.createElement(Ic, {
    d: /*#__PURE__*/React.createElement("path", {
      d: "M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z"
    })
  })), /*#__PURE__*/React.createElement(IconButton, {
    label: "Italic"
  }, /*#__PURE__*/React.createElement(Ic, {
    d: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M19 5h-6M14 19H8M15 5L9 19"
    }))
  })), /*#__PURE__*/React.createElement(IconButton, {
    label: "Subscript"
  }, /*#__PURE__*/React.createElement(Ic, {
    d: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M5 6l8 10M13 6L5 16"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M21 20h-4l3.5-3a1.4 1.4 0 0 0-2.4-1"
    }))
  }))), /*#__PURE__*/React.createElement(Sep, null), /*#__PURE__*/React.createElement(Group, null, /*#__PURE__*/React.createElement(IconButton, {
    label: "Align left"
  }, /*#__PURE__*/React.createElement(Ic, {
    d: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M4 6h16M4 12h10M4 18h13"
    }))
  })), /*#__PURE__*/React.createElement(IconButton, {
    label: "Units",
    active: true
  }, /*#__PURE__*/React.createElement(Ic, {
    d: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "9"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M8 12h8M12 8v8"
    }))
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--text-12) var(--font-mono)',
      color: 'var(--text-muted)'
    }
  }, "SI \xB7 mm\xB7kN\xB7MPa"));
}
window.Ribbon = Ribbon;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/editor/Ribbon.jsx", error: String((e && e.message) || e) }); }

// ui_kits/editor/Worksheet.jsx
try { (() => {
// Worksheet — the live-math document canvas. Composes MathRegion + notation.
function Worksheet({
  activeId,
  onSelect
}) {
  const Q = window.QuantaDesignSystem_019e2c;
  const {
    MathRegion,
    Sub,
    Sup,
    Frac,
    Sqrt,
    Op
  } = Q;
  const It = ({
    children
  }) => /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-math)',
      fontStyle: 'italic'
    }
  }, children);
  const Region = ({
    id,
    children
  }) => /*#__PURE__*/React.createElement("div", {
    id: id,
    onClick: () => onSelect(id),
    style: {
      cursor: 'default'
    }
  }, React.cloneElement(children, {
    selected: activeId === id
  }));
  const Section = ({
    id,
    n,
    title
  }) => /*#__PURE__*/React.createElement("div", {
    id: id,
    onClick: () => onSelect(id),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      margin: '28px 0 14px',
      cursor: 'default'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 var(--text-11)/1 var(--font-sans)',
      letterSpacing: 'var(--tracking-eyebrow)',
      textTransform: 'uppercase',
      color: 'var(--text-muted)'
    }
  }, n, " \xB7 ", title), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      height: 1,
      background: 'var(--border-hairline)'
    }
  }));
  const Note = ({
    children
  }) => /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--text-14)/1.6 var(--font-sans)',
      color: 'var(--text-primary)',
      maxWidth: 620,
      margin: '0 0 6px'
    }
  }, children);
  return /*#__PURE__*/React.createElement("main", {
    style: {
      flex: 1,
      overflow: 'auto',
      background: 'var(--surface-paper)'
    },
    className: "q-grid"
  }, /*#__PURE__*/React.createElement("article", {
    style: {
      maxWidth: 760,
      margin: '0 auto',
      padding: '40px 48px 96px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      borderBottom: '1px solid var(--border-hairline)',
      paddingBottom: 18,
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      font: '600 28px/1.2 var(--font-sans)',
      color: 'var(--text-primary)',
      letterSpacing: '-0.01em'
    }
  }, "Guardrail post \u2014 base-plate anchor check"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 24,
      marginTop: 12,
      font: 'var(--text-12) var(--font-mono)',
      color: 'var(--text-muted)'
    }
  }, /*#__PURE__*/React.createElement("span", null, "Ref\xA0\xA0AS\xA01657:2018"), /*#__PURE__*/React.createElement("span", null, "Rev\xA0\xA0B"), /*#__PURE__*/React.createElement("span", null, "By\xA0\xA0J.\xA0Okafor"), /*#__PURE__*/React.createElement("span", null, "2026-06-12"))), /*#__PURE__*/React.createElement(Section, {
    id: "sec-inputs",
    n: "1",
    title: "Inputs & assumptions"
  }), /*#__PURE__*/React.createElement(Note, null, "Rooftop guardrail designed to AS\xA01657. The horizontal imposed line load is resolved to a point load per post at 1.5\xA0m post spacing, applied at the top rail. Two SS316 M12 expansion anchors resist overturning, in tension\u2013compression couple."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement(Region, {
    id: "reg-Fh"
  }, /*#__PURE__*/React.createElement(MathRegion, {
    name: /*#__PURE__*/React.createElement(Sub, {
      base: "F",
      sub: "h"
    }),
    formula: "F_h := 0.75 kN",
    result: "0.75",
    unit: "kN",
    note: "line load \xD7 post spacing"
  })), /*#__PURE__*/React.createElement(Region, {
    id: "reg-h"
  }, /*#__PURE__*/React.createElement(MathRegion, {
    name: /*#__PURE__*/React.createElement(It, null, "h"),
    formula: "h := 1100 mm",
    result: "1100",
    unit: "mm",
    note: "rail height above fixing"
  })), /*#__PURE__*/React.createElement(Region, {
    id: "reg-n"
  }, /*#__PURE__*/React.createElement(MathRegion, {
    name: /*#__PURE__*/React.createElement(It, null, "n"),
    formula: "n := 2",
    result: "2",
    unit: "",
    note: "anchors per post"
  })), /*#__PURE__*/React.createElement(Region, {
    id: "reg-d"
  }, /*#__PURE__*/React.createElement(MathRegion, {
    name: /*#__PURE__*/React.createElement(It, null, "d"),
    formula: "d := 120 mm",
    result: "120",
    unit: "mm",
    note: "bolt lever arm"
  }))), /*#__PURE__*/React.createElement(Section, {
    id: "sec-actions",
    n: "2",
    title: "Design actions"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement(Region, {
    id: "reg-M"
  }, /*#__PURE__*/React.createElement(MathRegion, {
    name: /*#__PURE__*/React.createElement(Sub, {
      base: "M",
      sub: ""
    }),
    formula: "M := F_h * h",
    result: "0.825",
    unit: "kN\xB7m",
    status: "pass",
    note: "overturning at base plate"
  }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement(Sub, {
    base: "F",
    sub: "h"
  }), /*#__PURE__*/React.createElement(Op, null, "\xB7"), /*#__PURE__*/React.createElement(It, null, "h")))), /*#__PURE__*/React.createElement(Region, {
    id: "reg-T"
  }, /*#__PURE__*/React.createElement(MathRegion, {
    name: /*#__PURE__*/React.createElement(Sub, {
      base: "T",
      sub: "Ed"
    }),
    formula: "T_Ed := M / (n * d)",
    result: "3.44",
    unit: "kN",
    status: "pass",
    note: "tension per anchor"
  }, /*#__PURE__*/React.createElement(Frac, {
    num: /*#__PURE__*/React.createElement(It, null, "M"),
    den: /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement(It, null, "n"), /*#__PURE__*/React.createElement(Op, null, "\xB7"), /*#__PURE__*/React.createElement(It, null, "d"))
  })))), /*#__PURE__*/React.createElement(Section, {
    id: "sec-check",
    n: "3",
    title: "Anchor capacity check"
  }), /*#__PURE__*/React.createElement(Note, null, "SS316 M12 expansion anchor in 32\xA0MPa concrete, 80\xA0mm embedment. Characteristic tension capacity reduced for edge distance and stainless material factor per manufacturer ETA."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement(Region, {
    id: "reg-TRd"
  }, /*#__PURE__*/React.createElement(MathRegion, {
    name: /*#__PURE__*/React.createElement(Sub, {
      base: "T",
      sub: "Rd"
    }),
    formula: "T_Rd := 0.7 * N_Rk / gamma_M",
    result: "4.82",
    unit: "kN",
    status: "pass",
    note: "design tension resistance"
  }, /*#__PURE__*/React.createElement(Frac, {
    num: /*#__PURE__*/React.createElement("span", null, "0.7", /*#__PURE__*/React.createElement(Op, null, "\xB7"), /*#__PURE__*/React.createElement(Sub, {
      base: "N",
      sub: "Rk"
    })),
    den: /*#__PURE__*/React.createElement(Sub, {
      base: "\u03B3",
      sub: "M"
    })
  }))), /*#__PURE__*/React.createElement(Region, {
    id: "reg-eta"
  }, /*#__PURE__*/React.createElement(MathRegion, {
    name: /*#__PURE__*/React.createElement(It, null, "\u03B7"),
    formula: "eta := T_Ed / T_Rd",
    result: "0.71",
    unit: "",
    status: "pass",
    note: "\u2264 1.0 \u2014 anchor adequate"
  }, /*#__PURE__*/React.createElement(Frac, {
    num: /*#__PURE__*/React.createElement(Sub, {
      base: "T",
      sub: "Ed"
    }),
    den: /*#__PURE__*/React.createElement(Sub, {
      base: "T",
      sub: "Rd"
    })
  }))))));
}
window.Worksheet = Worksheet;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/editor/Worksheet.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Dialog = __ds_scope.Dialog;

__ds_ns.Toast = __ds_scope.Toast;

__ds_ns.Tooltip = __ds_scope.Tooltip;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.Var = __ds_scope.Var;

__ds_ns.Sub = __ds_scope.Sub;

__ds_ns.Sup = __ds_scope.Sup;

__ds_ns.Frac = __ds_scope.Frac;

__ds_ns.Sqrt = __ds_scope.Sqrt;

__ds_ns.Op = __ds_scope.Op;

__ds_ns.Unit = __ds_scope.Unit;

__ds_ns.Math = __ds_scope.Math;

__ds_ns.MathRegion = __ds_scope.MathRegion;

__ds_ns.Tabs = __ds_scope.Tabs;

})();
