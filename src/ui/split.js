// Text splitting for masked reveals. Screen readers keep reading the original
// sentence: the element gets an aria-label and the split pieces are hidden.

export function splitWords(el) {
  const label = el.textContent.replace(/\s+/g, ' ').trim();
  const words = [];
  const walk = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const parts = child.textContent.split(/(\s+)/);
        const frag = document.createDocumentFragment();
        parts.forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.append(' '); return; }
          const w = document.createElement('span');
          w.className = 'w';
          const inner = document.createElement('span');
          inner.className = 'w__in';
          inner.textContent = part;
          w.append(inner);
          frag.append(w);
          words.push(inner);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        walk(child);
      }
    });
  };
  walk(el);
  el.setAttribute('aria-label', label);
  [...el.children].forEach((c) => c.setAttribute('aria-hidden', 'true'));
  return words;
}

export function splitChars(el) {
  const text = el.textContent;
  el.textContent = '';
  return [...text].map((c) => {
    const s = document.createElement('span');
    s.className = 'ch';
    s.textContent = c;
    el.append(s);
    return s;
  });
}
