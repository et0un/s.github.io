(() => {
  const known = ['Inter', 'Roboto', 'Open Sans', 'Noto Sans', 'Noto Serif', 'Montserrat', 'Source Sans 3', 'PT Sans', 'PT Serif', 'JetBrains Mono'];
  const validFont = value => typeof value === 'string' && /^[a-zA-Z][a-zA-Z0-9 ]{0,70}$/.test(value);
  const weightsFor = font => ['PT Sans','PT Serif'].includes(font) ? [400,700] : [300,400,500,600,700,800];
  const loaded = new Set();
  function loadFont(font) {
    if (!validFont(font) || loaded.has(font)) return;
    loaded.add(font);
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    // Request actual regular, bold and italic faces through Google Fonts CSS API.
    const family = encodeURIComponent(font).replace(/%20/g, '+');
    const tuples = [0,1].flatMap(italic => weightsFor(font).map(weight => `${italic},${weight}`)).join(';');
    link.href = `https://fonts.googleapis.com/css2?family=${family}${known.includes(font) ? ':ital,wght@' + tuples : ''}&display=swap`;
    document.head.append(link);
    if (!known.includes(font)) {
      // A custom family may have no italic or bold face. Its regular face must still load.
      const variants = document.createElement('link'); variants.rel = 'stylesheet';
      variants.href = `https://fonts.googleapis.com/css2?family=${family}:ital,wght@0,400;0,700;1,400;1,700&display=swap`;
      document.head.append(variants);
    }
  }
  function applyFont(font) {
    if (!validFont(font)) return;
    loadFont(font);
    document.documentElement.style.setProperty('--course-font', `"${font}"`);
  }
  window.CourseDesign = { known, validFont, weightsFor, loadFont, applyFont };
  applyFont(window.COURSE_DESIGN?.font || 'Inter');
  function loadInlineFonts(root) {
    root.querySelectorAll('[data-course-font]').forEach(el => loadFont(el.dataset.courseFont));
  }
  loadInlineFonts(document);
  window.CourseDesign.loadInlineFonts = loadInlineFonts;
})();

/* Shared code blocks, loaded locally for lectures, resources and Studio. */
(() => {
  if (document.querySelector('script[data-course-code-loader]')) return;
  const source = document.currentScript?.src || document.querySelector('script[src*="course-design.js"]')?.src;
  if (!source) return;
  const base = new URL('.', source);
  const css = document.createElement('link'); css.rel = 'stylesheet';
  css.href = new URL('code-blocks.css?v=1', base).href; document.head.append(css);
  const loadRuntime = () => {
    const script = document.createElement('script'); script.dataset.courseCodeLoader = 'runtime';
    script.src = new URL('code-blocks.js?v=1', base).href; document.head.append(script);
  };
  window.Prism = window.Prism || {}; window.Prism.manual = true; window.Prism.disableWorkerMessageHandler = true;
  const script = document.createElement('script'); script.dataset.courseCodeLoader = 'prism';
  script.src = new URL('assets/vendor/prism.js?v=1', base).href;
  script.onload = loadRuntime; script.onerror = loadRuntime; document.head.append(script);
})();
