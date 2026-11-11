(() => {
  const panel = document.querySelector('#mcp-presets');
  const camera = document.querySelector('#mcp-camera');
  if (!panel || !camera) return;

  const scene = panel.querySelector('canvas');
  const art = scene.getContext('2d');
  const slider = panel.querySelector('input');
  const presets = {
    storm: { palette: 'storm', density: .75, speed: .30, brightness: .52 },
    calm: { palette: 'calm', density: .36, speed: .40, brightness: .78 }
  };
  let state = { ...presets.calm };
  let phase = 0;
  let visible = true;
  let lastFrame = 0;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const points = Array.from({ length: 210 }, (_, i) => ({
    x: (i * .618034 % 1) * scene.width,
    y: (i * .414214 % 1) * scene.height,
    size: 1 + (i % 5) * .28
  }));
  function drawScene() {
    const cool = state.palette === 'storm';
    const background = art.createLinearGradient(0, 0, 0, scene.height);
    background.addColorStop(0, cool ? '#091626' : '#2e1c1a');
    background.addColorStop(1, cool ? '#1c4054' : '#554032');
    art.fillStyle = background;
    art.fillRect(0, 0, scene.width, scene.height);
    art.fillStyle = cool ? '#9eeaff' : '#ffd7aa';
    art.globalAlpha = state.brightness;
    for (const point of points.slice(0, Math.round(24 + state.density * 186))) {
      const x = (point.x + phase) % scene.width;
      const y = point.y + Math.sin(x / 68 + phase / 80) * 22;
      art.beginPath();
      art.arc(x, y, point.size, 0, Math.PI * 2);
      art.fill();
    }
    art.globalAlpha = 1;
    // Apply exposure to the whole composition, including the background.
    art.fillStyle = '#000';
    art.globalAlpha = (1 - state.brightness) * .88;
    art.fillRect(0, 0, scene.width, scene.height);
    art.globalAlpha = 1;
  }
  function showState() {
    slider.value = state.speed;
    panel.querySelector('output').textContent = JSON.stringify(state);
    drawScene();
  }
  panel.querySelectorAll('[data-preset]').forEach(button => button.addEventListener('click', () => {
    const preset = button.dataset.preset;
    state = preset === 'bright'
      ? { ...state, brightness: Number(Math.min(1, state.brightness + .2).toFixed(2)) }
      : { ...presets[preset] };
    showState();
    panel.querySelector('[role="status"]').textContent = preset === 'bright'
      ? (state.brightness === 1 ? 'Яркость 100%, достигнут максимум.' : `Яркость повышена до ${Math.round(state.brightness * 100)}%.`)
      : `Выбран пресет «${button.textContent.trim()}».`;
  }));
  slider.addEventListener('input', () => {
    state.speed = Number(slider.value);
    showState();
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(scene);
  }
  function animate(now) {
    const elapsed = Math.min(50, now - lastFrame);
    lastFrame = now;
    if (visible) {
      phase = (phase + elapsed * state.speed * .18) % (scene.width * 100);
      drawScene();
    }
    requestAnimationFrame(animate);
  }
  showState();
  if (!reducedMotion) requestAnimationFrame(animate);

  const preview = camera.querySelector('canvas');
  const display = preview.getContext('2d');
  const input = document.createElement('canvas');
  input.width = preview.width / 2;
  input.height = preview.height;
  const source = input.getContext('2d', { willReadFrequently: true });
  const mask = display.createImageData(input.width, input.height);
  const threshold = camera.querySelector('input');
  const status = camera.querySelector('output');
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  let timer;
  let previous;
  let request = 0;
  function stop() {
    request++;
    clearInterval(timer);
    video.pause();
    video.srcObject?.getTracks().forEach(track => track.stop());
    video.srcObject = null;
    previous = null;
    display.clearRect(0, 0, preview.width, preview.height);
    status.textContent = 'Демонстрация остановлена.';
  }
  function drawSample(time) {
    const light = Math.floor(time / 3) % 2 === 0;
    source.fillStyle = light ? '#394859' : '#202934';
    source.fillRect(0, 0, input.width, input.height);
    source.fillStyle = light ? '#65788b' : '#344351';
    source.fillRect(20, 22, 77, 109);
    source.fillStyle = light ? '#b7dceb' : '#668b99';
    source.beginPath();
    source.arc(162 + Math.sin(time * 1.7) * 97, 103, 25, 0, Math.PI * 2);
    source.fill();
  }
  function drawVideo() {
    const scale = Math.max(input.width / video.videoWidth, input.height / video.videoHeight);
    const width = video.videoWidth * scale;
    const height = video.videoHeight * scale;
    source.drawImage(video, (input.width - width) / 2, (input.height - height) / 2, width, height);
  }
  function analyze(mode) {
    if (mode === 'camera' && video.readyState < 2) return;
    if (mode === 'sample') drawSample(performance.now() / 1000);
    else drawVideo();
    const frame = source.getImageData(0, 0, input.width, input.height);
    const limit = Number(threshold.value);
    const gray = new Uint8Array(input.width * input.height);
    for (let i = 0; i < gray.length; i++) {
      const pixel = i * 4;
      gray[i] = .2126 * frame.data[pixel] + .7152 * frame.data[pixel + 1] + .0722 * frame.data[pixel + 2];
      const active = previous && Math.abs(gray[i] - previous[i]) > limit;
      mask.data[pixel] = active ? 89 : 12;
      mask.data[pixel + 1] = active ? 226 : 17;
      mask.data[pixel + 2] = active ? 194 : 20;
      mask.data[pixel + 3] = 255;
    }
    previous = gray;
    display.putImageData(frame, 0, 0);
    display.putImageData(mask, input.width, 0);
  }
  camera.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', async () => {
    stop();
    const mode = button.dataset.mode;
    const activeRequest = request;
    if (mode === 'stop') return;
    if (mode === 'camera') {
      status.textContent = 'Ожидаем разрешение на камеру.';
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640 }, audio: false });
        if (request !== activeRequest) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        video.srcObject = stream;
        await video.play();
      } catch {
        if (request === activeRequest) {
          stop();
          status.textContent = 'Камера недоступна. Можно запустить учебный клип.';
        }
        return;
      }
    }
    if (request !== activeRequest) return;
    status.textContent = mode === 'camera' ? 'Камера включена.' : 'Идёт учебный клип.';
    analyze(mode);
    timer = setInterval(() => analyze(mode), 67);
  }));
  window.addEventListener('pagehide', stop);
})();
