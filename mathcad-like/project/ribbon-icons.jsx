/* Quanta ribbon spec — icon set (Lucide-style, 1.5px). window.QRibIcons.<name>(size) */
window.QRibIcons = (function () {
  const e = React.createElement;
  const wrap = (ch, s) => e('svg', { width: s, height: s, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' }, ch);
  const P = (...ds) => (s = 18) => wrap(ds.map((d, i) => e('path', { key: i, d })), s);
  const N = (nodes) => (s = 18) => wrap(nodes, s);
  const c = (cx, cy, r, k) => e('circle', { key: k, cx, cy, r });
  const rect = (x, y, w, h, rx, k) => e('rect', { key: k, x, y, width: w, height: h, rx });
  const ln = (x1, y1, x2, y2, k) => e('line', { key: k, x1, y1, x2, y2 });
  const p = (d, k) => e('path', { key: k, d });

  return {
    // clipboard
    cut: N([c(6, 6, 2.3, 1), c(6, 18, 2.3, 2), p('M7.9 7.5 19 18', 3), p('M7.9 16.5 19 6', 4)]),
    copy: N([rect(9, 9, 11, 11, 1.6, 1), p('M5 15V6a1.2 1.2 0 0 1 1.2-1.2H15', 2)]),
    paste: N([rect(8, 4, 8, 4, 1, 1), p('M8 6H6.2A1.2 1.2 0 0 0 5 7.2v12.6A1.2 1.2 0 0 0 6.2 21h11.6a1.2 1.2 0 0 0 1.2-1.2V7.2A1.2 1.2 0 0 0 17.8 6H16', 2)]),
    // regions
    text: N([p('M5 6.5V5h14v1.5', 1), p('M12 5v14', 2), p('M9.5 19h5', 3)]),
    table: N([rect(4, 5, 16, 14, 1.6, 1), p('M4 10h16M4 14.5h16M9.5 5v14M14.5 5v14', 2)]),
    image: N([rect(4, 5, 16, 14, 1.6, 1), c(9, 10, 1.4, 2), p('M5 17.5l4.2-4 3 2.6 3.3-3.3L19 16', 3)]),
    area: P('M8 4H5.5A1.5 1.5 0 0 0 4 5.5v13A1.5 1.5 0 0 0 5.5 20H8', 'M16 4h2.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H16'),
    control: N([p('M4 8h7M17 8h3', 1), c(13, 8, 2.2, 2), p('M4 16h3M13 16h7', 3), c(9, 16, 2.2, 4)]),
    sketch: P('M4 20l1-4L16 5a1.4 1.4 0 0 1 2 0l1 1a1.4 1.4 0 0 1 0 2L8 19z', 'M14 7l3 3'),
    solve: P('M9 4H6.5A1.5 1.5 0 0 0 5 5.5v3A2.2 2.2 0 0 1 2.8 10.7 2.2 2.2 0 0 1 5 12.9v3A1.5 1.5 0 0 0 6.5 17.4H9', 'M15 4h2.5A1.5 1.5 0 0 1 19 5.5v3a2.2 2.2 0 0 0 2.2 2.2A2.2 2.2 0 0 0 19 12.9v3a1.5 1.5 0 0 1-1.5 1.5H15'),
    include: N([rect(4, 4, 16, 16, 1.6, 1), p('M12 8v8M8 12h8', 2)]),
    link: P('M9.5 14.5 14.5 9.5', 'M11 7l1-1a3.5 3.5 0 0 1 5 5l-1 1', 'M13 17l-1 1a3.5 3.5 0 0 1-5-5l1-1'),
    plot: P('M4 4v16h16', 'M7 15.5l3.2-4.2 3 2.2 4.3-6'),
    polar: N([c(12, 12, 8, 1), c(12, 12, 4, 2), ln(12, 4, 12, 20, 3), ln(4, 12, 20, 12, 4), p('M12 12 17.5 7', 5)]),
    contour: N([c(12, 12, 8, 1), c(12, 12, 5, 2), c(12, 12, 2, 3)]),
    plot3d: P('M12 3 21 8v8l-9 5-9-5V8z', 'M12 3v8M12 11l9-3M12 11l-9-3'),
    chart: P('M5 20V10', 'M10 20V5', 'M15 20v-7', 'M20 20v-11'),
    // math format
    fmt: P('M5 7h14', 'M5 12h9', 'M5 17h12', 'M17 14l2 2 3-3.5'),
    units: N([rect(3, 8, 18, 8, 1.4, 1), p('M7.5 8v3.5M11.5 8v5M15.5 8v3.5', 2)]),
    steps: P('M8 6h12M8 12h12M8 18h8', 'M4 6h.01M4 12h.01M4 18h.01'),
    find: N([c(11, 11, 7, 1), p('m20 20-3.2-3.2', 2)]),
    sigma: null, // use glyph
    // math tab
    palette: N([p('M12 3a9 9 0 1 0 0 18 2 2 0 0 0 2-2 1.8 1.8 0 0 1 1.8-1.8H18a3 3 0 0 0 3-3c0-4.8-4-8.2-9-8.2z', 1), c(7.5, 11.5, 1, 2), c(12, 8, 1, 3), c(16.5, 11.5, 1, 4)]),
    vectorize: P('M4 6h12', 'M4 6l0 0', 'M16 4l2 2-2 2', 'M5 12h13', 'M5 18h10'),
    label: N([p('M4 4h7l9 9-7 7-9-9z', 1), c(8, 8, 1.2, 2)]),
    // functions
    fx: P('M14.5 5.2A2.4 2.4 0 0 0 10 6.4V9', 'M7.5 12.5h6', 'M13.5 19c-2 .2-3-1-3-3.2V8'),
    // matrices
    matrix: N([p('M6 4H4v16h2', 1), p('M18 4h2v16h-2', 2), c(9.5, 9, 0.9, 3), c(14.5, 9, 0.9, 4), c(9.5, 15, 0.9, 5), c(14.5, 15, 0.9, 6)]),
    transpose: P('M5 5h8v8', 'M5 5l14 14', 'M19 19h-6'),
    inverse: P('M7 5h4a4 4 0 0 1 0 8H7zM7 13l5 6', 'M16 5h2M17 5v6'),
    determinant: N([p('M7 4H5v16h2M17 4h2v16h-2', 1), p('M9.5 15 14.5 9', 2)]),
    identity: N([p('M6 4H4v16h2M18 4h2v16h-2', 1), p('M9 9h6M12 9v6M9 15h6', 2)]),
    augment: N([rect(3.5, 6, 7, 12, 1, 1), p('M14 6v12', 2), rect(15.5, 6, 5, 12, 1, 3)]),
    indexing: N([p('M6 4H4v16h2M18 4h2v16h-2', 1), p('M10.5 13.5 13 16', 2), p('M13 13.5 10.5 16', 3)]),
    // format
    fontsize: P('M3 16V7M3 7l3.5 9M3 7l-3.5 9 M2 16h2', 'M13 16V9M13 9l3 7M13 9l-3 7M11 16h2'),
    bold: P('M7 5h6.5a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z'),
    italic: P('M11 5h6M7 19h6M14 5l-4 14'),
    underline: P('M7 5v6a5 5 0 0 0 10 0V5', 'M5 20h14'),
    color: N([p('M12 3 6 15a6 6 0 0 0 12 0z', 1)]),
    alignLeft: P('M4 6h16M4 10h10M4 14h16M4 18h10'),
    alignCenter: P('M4 6h16M7 10h10M4 14h16M7 18h10'),
    alignRight: P('M4 6h16M10 10h10M4 14h16M10 18h10'),
    indentR: P('M4 6h16', 'M11 12h9', 'M4 18h16', 'M4 9.5 7 12l-3 2.5'),
    indentL: P('M4 6h16', 'M11 12h9', 'M4 18h16', 'M7 9.5 4 12l3 2.5'),
    spanCols: P('M3 6v12M21 6v12', 'M7.5 12h9', 'M10 9l-2.5 3 2.5 3M14 9l2.5 3-2.5 3'),
    border: N([rect(4, 4, 16, 16, 1.5, 1)]),
    condfmt: N([p('M4 5h16v4H4z', 1), p('M4 12h16M4 16h16', 2), c(18, 14, 0, 3)]),
    // document
    pagesetup: N([rect(5, 3, 14, 18, 1.5, 1), p('M9 3v18M9 8h10M9 13h10', 2)]),
    columns: P('M4 5v14M12 5v14M20 5v14'),
    header: N([rect(4, 4, 16, 16, 1.5, 1), p('M4 9h16', 2)]),
    margins: N([rect(4, 4, 16, 16, 1, 1), rect(7.5, 7.5, 9, 9, 0.5, 2)]),
    gridlines: P('M4 9h16M4 15h16M9 4v16M15 4v16'),
    toc: P('M5 6h2M10 6h9M5 12h2M10 12h9M5 18h2M10 18h9'),
    gotopage: N([rect(5, 3, 14, 18, 1.5, 1), p('M9 12h6M13 9l3 3-3 3', 2)]),
    frameToggle: N([rect(4, 4, 16, 16, 1.5, 1), p('M4 4l3 3M20 4l-3 3M4 20l3-3M20 20l-3-3', 2)]),
    // calculate
    refresh: P('M20.5 11A8.5 8.5 0 1 0 18 17.5', 'M20.5 5.5V11H15'),
    refreshHere: P('M20 11A8 8 0 1 0 18 16.5', 'M20 6v5h-5', 'M9 12l2 2 4-4'),
    thread: N([c(6, 6, 2, 1), c(6, 18, 2, 2), c(18, 12, 2, 3), p('M8 6h6a2 2 0 0 1 2 2v2M8 18h6a2 2 0 0 0 2-2v-2', 4)]),
    algo: N([c(12, 12, 3, 1), p('M12 2.5v3M12 18.5v3M4.5 4.5l2.1 2.1M17.4 17.4l2.1 2.1M2.5 12h3M18.5 12h3M4.5 19.5l2.1-2.1M17.4 6.6l2.1-2.1', 2)]),
    // review
    comment: P('M5 5h14a1.2 1.2 0 0 1 1.2 1.2v8.4A1.2 1.2 0 0 1 19 15.8H9.5L5.5 19.5V6.2A1.2 1.2 0 0 1 6.7 5z'),
    commentPlus: P('M5 5h14a1.2 1.2 0 0 1 1.2 1.2v8.4A1.2 1.2 0 0 1 19 15.8H9.5L5.5 19.5V6.2A1.2 1.2 0 0 1 6.7 5z', 'M12 8v5M9.5 10.5h5'),
    track: P('M4 18l1-4L16 3a1.4 1.4 0 0 1 2 0l1 1a1.4 1.4 0 0 1 0 2L8 17z', 'M5 21h14'),
    compare: N([rect(3, 5, 7, 14, 1, 1), rect(14, 5, 7, 14, 1, 2), p('M12 3v18', 3)]),
    spell: P('M4 16l3-9 3 9M5 13h4', 'M14 16l2-2 5 5'),
    protect: N([rect(5, 10.5, 14, 9.5, 1.6, 1), p('M8 10.5V8a4 4 0 0 1 8 0v2.5', 2)]),
    redefine: N([c(12, 12, 9, 1), p('M12 8v4.5M12 16h.01', 2)]),
    // generic / misc
    chevD: P('m6 9 6 6 6-6'),
    chevU: P('m6 14.5 6-6 6 6'),
    chevR: P('m9.5 6 6 6-6 6'),
    more: N([c(5, 12, 1.4, 1), c(12, 12, 1.4, 2), c(19, 12, 1.4, 3)]),
    mathEq: null,
  };
})();
