/* Quanta — density toggle. Plain JS (no Babel). Sets [data-density] on <html>,
   persists the choice, and injects a small Comfortable/Compact switch.
   Default is Compact. */
(function () {
  var KEY = 'quanta-density';
  var stored = null;
  try { stored = localStorage.getItem(KEY); } catch (e) {}
  if (stored !== 'comfortable' && stored !== 'compact') stored = 'compact';
  document.documentElement.setAttribute('data-density', stored);

  function build() {
    if (document.getElementById('q-density-toggle')) return;
    if (!document.body) { return setTimeout(build, 30); }

    var wrap = document.createElement('div');
    wrap.id = 'q-density-toggle';
    wrap.setAttribute('role', 'group');
    wrap.setAttribute('aria-label', 'Display density');
    wrap.style.cssText = [
      'position:fixed', 'left:14px', 'bottom:14px', 'z-index:2147483000',
      'display:inline-flex', 'align-items:center', 'gap:2px', 'padding:3px',
      'background:var(--surface-raised,#fff)',
      'border:1px solid var(--border-hairline,#E2E5EA)',
      'border-radius:8px',
      'box-shadow:var(--shadow-popover,0 4px 12px rgba(21,24,29,.10))',
      'font-family:var(--font-sans,system-ui,sans-serif)'
    ].join(';');

    // little density glyph
    var icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('width', '15'); icon.setAttribute('height', '15');
    icon.setAttribute('viewBox', '0 0 24 24'); icon.setAttribute('fill', 'none');
    icon.setAttribute('stroke', 'currentColor'); icon.setAttribute('stroke-width', '1.5');
    icon.setAttribute('stroke-linecap', 'round');
    icon.innerHTML = '<path d="M4 6h16M4 12h16M4 18h16"/>';
    icon.style.cssText = 'color:var(--text-muted,#5B6470);margin:0 4px 0 5px;flex:0 0 auto';
    wrap.appendChild(icon);

    var opts = [['compact', 'Compact'], ['comfortable', 'Comfortable']];
    opts.forEach(function (o) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = o[1];
      b.setAttribute('aria-pressed', 'false');
      b.style.cssText = 'border:none;cursor:pointer;border-radius:5px;padding:5px 10px;font:500 11.5px/1 var(--font-sans,system-ui,sans-serif);background:transparent;color:var(--text-muted,#5B6470)';
      b.__paint = function () {
        var on = document.documentElement.getAttribute('data-density') === o[0];
        b.style.background = on ? 'var(--accent-tint,#E8F0FC)' : 'transparent';
        b.style.color = on ? 'var(--accent,#1F5FBF)' : 'var(--text-muted,#5B6470)';
        b.style.fontWeight = on ? '600' : '500';
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      };
      b.addEventListener('click', function () {
        document.documentElement.setAttribute('data-density', o[0]);
        try { localStorage.setItem(KEY, o[0]); } catch (e) {}
        wrap.__paint();
      });
      wrap.appendChild(b);
    });
    wrap.__paint = function () {
      Array.prototype.forEach.call(wrap.querySelectorAll('button'), function (c) { if (c.__paint) c.__paint(); });
    };
    document.body.appendChild(wrap);
    wrap.__paint();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
