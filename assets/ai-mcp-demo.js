(() => {
  const camera = document.querySelector('#mcp-camera');
  if (!camera) return;

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
