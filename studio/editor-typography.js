/* Keep short Russian prepositions with the following word. */
(() => {
  const words = 'в|во|к|ко|с|со|у|о|об|обо|на|по|из|от|до|за|для|при|без|над|под|про';
  const within = new RegExp('(^|[\\s(\\[«„“])(' + words + ')([ \\t]+)(?=\\S)', 'giu');
  const ending = new RegExp('(?:^|[\\s(\\[«„“])(' + words + ')([ \\t]*)$', 'iu');
  const ignored = 'script,style,pre,code,kbd,samp,textarea,input,select,svg,math,[data-no-typography]';
  const blockSelector = 'p,h1,h2,h3,h4,h5,h6,li,figcaption,blockquote,td,th,div,section,article,nav,button';
  function keepPrepositions(text) {
    return text.replace(within, (_, before, word) => before + word + '\u00a0');
  }
  function eligible(node) {
    const el = node.parentElement;
    if (!el || el.closest(ignored)) return false;
    const editable = el.closest('[contenteditable="true"]');
    return !editable || !(editable === document.activeElement || editable.contains(document.activeElement));
  }
  function applyTypography(root = document.body) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!eligible(node)) continue;
      const value = keepPrepositions(node.data);
      if (value !== node.data) node.data = value;
      nodes.push(node);
    }
    for (let i = 0; i < nodes.length - 1; i++) {
      const left = nodes[i], right = nodes[i + 1];
      const match = left.data.match(ending);
      if (!match || !right.data || left.parentElement.closest(blockSelector) !== right.parentElement.closest(blockSelector)) continue;
      const range = document.createRange();
      range.setStartAfter(left); range.setEndBefore(right);
      if (range.cloneContents().querySelector('br')) continue;
      if (match[2] && /^\S/.test(right.data)) {
        left.data = left.data.replace(/[ \t]+$/, '\u00a0');
      } else if (/^[ \t]+\S/.test(right.data)) {
        right.data = right.data.replace(/^[ \t]+/, '\u00a0');
      } else if (/^[ \t]+$/.test(right.data) && nodes[i + 2] &&
          right.parentElement.closest(blockSelector) === nodes[i + 2].parentElement.closest(blockSelector)) {
        right.data = '\u00a0';
      }
    }
  }
  window.CourseDesign = window.CourseDesign || {};
  Object.assign(window.CourseDesign, { keepPrepositions, applyTypography });
  let queued = false;
  const observer = new MutationObserver(() => schedule());
  function observe() { observer.observe(document.body, { subtree:true, childList:true, characterData:true }); }
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false; observer.disconnect();
      applyTypography(); observe();
    });
  }
  applyTypography(); observe();
  document.addEventListener('focusout', schedule);
})();

