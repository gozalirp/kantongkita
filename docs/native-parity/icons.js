/* Exact SVG renderer from public/js/util.js U.icon. Local snapshot for an isolated mockup; no app/store code loaded. */
window.webIcon = function (name) {
    const shapes = {
      edit:'M16 3l5 5-12 12H4v-5z M14 5l5 5', trash:'M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7',
      download:'M12 3v12 M7 10l5 5 5-5 M4 17v4h16v-4', upload:'M12 16V4 M7 9l5-5 5 5 M4 17v4h16v-4',
      lock:'M6 10h12v11H6z M8 10V7a4 4 0 0 1 8 0v3 M12 14v3', cloud:'M6 18a5 5 0 0 1-1-10 7 7 0 0 1 13-1 5 5 0 0 1 0 11z',
      refresh:'M4 9a8 8 0 0 1 13-5l3 3 M20 3v4h-4 M20 15a8 8 0 0 1-13 5l-3-3 M4 21v-4h4',
      wallet:'M3 6h17v15H3z M3 6l13-3v3 M15 11h6v5h-6z', tag:'M3 3h8l10 10-8 8L3 11z M7 7h.01',
      target:'M21 12a9 9 0 1 1-9-9 M17 12a5 5 0 1 1-5-5 M12 12l9-9',
      user:'M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M4 21v-2a8 8 0 0 1 16 0v2',
      folder:'M3 5h7l2 3h9v13H3z', receipt:'M5 3h14v18l-3-2-4 2-4-2-3 2z M8 7h8 M8 11h8 M8 15h5',
      chart:'M4 3v18h17 M8 16v-5 M13 16V7 M18 16V4', search:'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14 M15 15l6 6',
      calendar:'M4 5h16v16H4z M8 3v4 M16 3v4 M4 10h16', info:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 11v6 M12 7h.01',
      alert:'M12 3l10 18H2z M12 9v5 M12 17h.01', check:'M4 12l5 5L20 6', plus:'M12 5v14 M5 12h14', minus:'M5 12h14',
      home:'M3 11l9-8 9 8 M5 10v11h14V10 M9 21v-7h6v7', briefcase:'M3 7h18v14H3z M8 7V3h8v4 M3 12h18 M12 10v5',
      clock:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 7v5l3 2', heart:'M12 21L3 12a5 5 0 0 1 9-7 5 5 0 0 1 9 7z',
      cart:'M2 3h3l3 13h11l3-9H6 M9 21h.01 M18 21h.01', car:'M3 16V9l3-5h12l3 5v7z M3 10h18 M6 16v4 M18 16v4 M7 13h.01 M17 13h.01',
      book:'M12 5Q6 1 2 4v16q4-3 10 0 6-3 10 0V4q-4-3-10 1v15', food:'M4 3v6q0 3 3 3V3 M7 12v9 M18 3q-5 6 0 9v9 M18 3v9',
      settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1z', grid:'M4 6h16 M4 12h16 M4 18h16', gift:'M3 8h18v4H3z M5 12v9h14v-9 M12 8v13 M12 8C9 8 6 6.5 6 4.5A2.5 2.5 0 0 1 11 4.1L12 8c1-3.9 6-3.9 6-1.5C18 6.6 15 8 12 8', arrow:'M12 4v16 M6 14l6 6 6-6',
      chevron:'M9 5l7 7-7 7', close:'M6 6l12 12 M18 6L6 18', eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6', pause:'M9 5v14 M15 5v14', play:'M8 5l11 7-11 7z'
    };
    return '<svg class="ui-icon' + (name === 'wallet' ? ' ui-icon-money' : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + (shapes[name] || shapes.tag) + '"/></svg>';
  };
