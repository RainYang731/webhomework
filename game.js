(() => {
  const arena = document.querySelector('#arena');
  const timerDisplay = document.querySelector('#timer');
  const scoreDisplay = document.querySelector('#score');
  const bestDisplay = document.querySelector('#best-score');
  const startButton = document.querySelector('#start-button');
  const nameInput = document.querySelector('#player-name');
  const statusPill = document.querySelector('#status-pill');
  const statusText = document.querySelector('#status-text');
  const gameHeading = document.querySelector('#game-heading');
  const arenaHint = document.querySelector('#arena-hint');
  const hitMessage = document.querySelector('#hit-message');
  const leaderboard = document.querySelector('#leader-list');
  const emptyBoard = document.querySelector('#empty-board');
  const imageInput = document.querySelector('#zombie-image');
  const imagePreview = document.querySelector('#upload-preview');
  const uploadLabel = document.querySelector('#upload-label');
  const toast = document.querySelector('#toast');
  const resultModal = document.querySelector('#result-modal');

  const BOARD_KEY = 'moonguard.leaderboard.v1';
  const NAME_KEY = 'moonguard.player.v1';
  const ROUND_MS = 60_000;
  const COLUMNS = 4;
  const ROWS = 7;
  let score = 0;
  let running = false;
  let endsAt = 0;
  let lastStep = 0;
  let lastSpawn = 0;
  let animationFrame = 0;
  let targetSequence = 0;
  let targets = [];
  let toastTimeout;
  let uploadedImageUrl = '';

  function readLeaderboard() {
    try {
      const value = JSON.parse(localStorage.getItem(BOARD_KEY) || '[]');
      return Array.isArray(value) ? value.filter((row) => row && typeof row.name === 'string' && Number.isFinite(row.score)) : [];
    } catch {
      return [];
    }
  }

  function getPersonalBest() {
    return readLeaderboard().reduce((best, row) => Math.max(best, row.score), 0);
  }

  function renderLeaderboard() {
    const rows = readLeaderboard().sort((a, b) => b.score - a.score || a.date - b.date).slice(0, 10);
    leaderboard.replaceChildren();
    emptyBoard.hidden = rows.length > 0;
    rows.forEach((row, index) => {
      const item = document.createElement('div');
      item.className = 'leader-row';
      const rank = document.createElement('span');
      rank.className = 'rank-number';
      rank.textContent = String(index + 1).padStart(2, '0');
      const player = document.createElement('span');
      player.className = 'leader-player';
      player.textContent = row.name;
      const points = document.createElement('span');
      points.className = 'leader-score';
      points.append(document.createTextNode(String(row.score)));
      const unit = document.createElement('small');
      unit.textContent = '分';
      points.append(unit);
      item.append(rank, player, points);
      leaderboard.append(item);
    });
    bestDisplay.textContent = String(getPersonalBest()).padStart(2, '0');
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toast.classList.remove('visible'), 3500);
  }

  function renderArena() {
    const fragment = document.createDocumentFragment();
    for (let row = 0; row < ROWS; row += 1) {
      for (let column = 0; column < COLUMNS; column += 1) {
        const cell = document.createElement('div');
        cell.className = 'arena-cell';
        cell.dataset.row = String(row);
        cell.dataset.column = String(column);
        const target = targets.find((item) => item.row === row && item.column === column);
        if (target) {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'target';
          button.dataset.targetId = String(target.id);
          button.setAttribute('aria-label', `擊退第 ${row + 1} 列的殭屍，得 1 分`);
          const art = document.createElement('span');
          art.className = 'target-art';
          if (uploadedImageUrl) {
            const image = document.createElement('img');
            image.className = 'custom-zombie';
            image.src = uploadedImageUrl;
            image.alt = '';
            art.append(image);
          } else {
            const blob = document.createElement('span');
            blob.className = 'default-zombie';
            blob.innerHTML = '<i class="zombie-eye"></i><i class="zombie-mouth"></i>';
            art.append(blob);
          }
          button.append(art);
          cell.append(button);
        }
        fragment.append(cell);
      }
    }
    arena.replaceChildren(fragment);
  }

  function formatTime(milliseconds) {
    const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
    return `00:${String(seconds).padStart(2, '0')}`;
  }

  function addTarget() {
    const openColumns = Array.from({ length: COLUMNS }, (_, column) => column)
      .filter((column) => !targets.some((target) => target.column === column && target.row === 0));
    if (openColumns.length === 0) return;
    const column = openColumns[Math.floor(Math.random() * openColumns.length)];
    targets.push({ id: ++targetSequence, column, row: 0 });
  }

  function moveTargets() {
    const occupied = new Set(targets.map((target) => `${target.column}:${target.row}`));
    const moving = [...targets].sort((a, b) => b.row - a.row);
    for (const target of moving) {
      occupied.delete(`${target.column}:${target.row}`);
      if (target.row === ROWS - 1) {
        targets = targets.filter((item) => item.id !== target.id);
      } else {
        const nextCell = `${target.column}:${target.row + 1}`;
        if (!occupied.has(nextCell)) target.row += 1;
        occupied.add(`${target.column}:${target.row}`);
      }
    }
  }

  function gameLoop(now) {
    if (!running) return;
    const remaining = endsAt - Date.now();
    timerDisplay.textContent = formatTime(remaining);
    if (remaining <= 0) {
      finishGame();
      return;
    }
    if (now - lastStep >= 540) {
      moveTargets();
      lastStep = now;
      renderArena();
    }
    if (now - lastSpawn >= 820) {
      addTarget();
      lastSpawn = now;
      renderArena();
    }
    animationFrame = requestAnimationFrame(gameLoop);
  }

  function startGame() {
    if (running) return;
    resultModal.hidden = true;
    score = 0;
    targets = [];
    scoreDisplay.textContent = '00';
    timerDisplay.textContent = '01:00';
    running = true;
    endsAt = Date.now() + ROUND_MS;
    lastStep = performance.now();
    lastSpawn = lastStep - 650;
    statusPill.classList.add('playing');
    statusText.textContent = '任務中';
    gameHeading.textContent = '守住月宮，出擊！';
    arenaHint.textContent = '點擊殭屍趕走牠們';
    hitMessage.textContent = '每擊中一隻 +1 分';
    startButton.disabled = true;
    startButton.querySelector('span:first-child').textContent = '任務進行中';
    renderArena();
    animationFrame = requestAnimationFrame(gameLoop);
  }

  function finishGame() {
    if (!running) return;
    running = false;
    cancelAnimationFrame(animationFrame);
    targets = [];
    renderArena();
    timerDisplay.textContent = '00:00';
    statusPill.classList.remove('playing');
    statusText.textContent = '任務完成';
    gameHeading.textContent = '月宮暫時安全了';
    arenaHint.textContent = '任務完成';
    hitMessage.textContent = '辛苦了，守衛隊員';
    startButton.disabled = false;
    startButton.querySelector('span:first-child').textContent = '再玩一次';

    const name = (nameInput.value.trim() || '月兔隊員').slice(0, 12);
    const rows = readLeaderboard();
    const resultEntry = score > 0 ? { name, score, date: Date.now() } : null;
    let stored = false;
    if (score > 0) {
      rows.push(resultEntry);
      rows.sort((a, b) => b.score - a.score || a.date - b.date);
      try {
        localStorage.setItem(BOARD_KEY, JSON.stringify(rows.slice(0, 10)));
        stored = true;
      } catch {
        showToast('瀏覽器儲存空間不足，這次分數未能保存。');
      }
    }
    renderLeaderboard();
    const savedRows = rows.slice(0, 10);
    const rank = stored && resultEntry && savedRows.includes(resultEntry)
      ? savedRows.findIndex((row) => row === resultEntry) + 1
      : 0;
    document.querySelector('#final-score').textContent = String(score);
    document.querySelector('#result-caption').textContent = score ? `太棒了，${name}！月宮守衛任務完成` : '再試一次，讓月宮守衛隊拿下第一分！';
    document.querySelector('#result-rank').textContent = rank
      ? `本機排行榜第 ${rank} 名`
      : score ? '再多拿幾分就能進入前 10 名！' : '';
    resultModal.hidden = false;
    document.querySelector('#again-button').focus();
  }

  arena.addEventListener('click', (event) => {
    const button = event.target.closest('.target');
    if (!running || !button) return;
    const targetId = Number(button.dataset.targetId);
    const target = targets.find((item) => item.id === targetId);
    if (!target) return;
    const bounds = button.getBoundingClientRect();
    const sparkle = document.createElement('span');
    sparkle.className = 'confetti';
    sparkle.textContent = '✦ +1';
    sparkle.style.left = `${bounds.left + bounds.width / 2 - 12}px`;
    sparkle.style.top = `${bounds.top + 4}px`;
    document.body.append(sparkle);
    setTimeout(() => sparkle.remove(), 750);
    targets = targets.filter((item) => item.id !== targetId);
    score += 1;
    scoreDisplay.textContent = String(score).padStart(2, '0');
    renderArena();
  });

  startButton.addEventListener('click', startGame);
  document.querySelector('#again-button').addEventListener('click', () => {
    resultModal.hidden = true;
    startGame();
  });
  resultModal.addEventListener('click', (event) => {
    if (event.target.dataset.close === 'true') resultModal.hidden = true;
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !resultModal.hidden) resultModal.hidden = true;
  });

  function openImageDb() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) return reject(new Error('IndexedDB unavailable'));
      const request = indexedDB.open('moonguard-images', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('settings');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function saveUploadedImage(file) {
    const db = await openImageDb();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction('settings', 'readwrite');
      transaction.objectStore('settings').put(file, 'zombie-image');
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
  }

  async function loadUploadedImage() {
    try {
      const db = await openImageDb();
      const file = await new Promise((resolve, reject) => {
        const request = db.transaction('settings').objectStore('settings').get('zombie-image');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      db.close();
      if (file instanceof Blob) setUploadedImage(file);
    } catch {
      // The default illustrated target remains available if browser storage is unavailable.
    }
  }

  function setUploadedImage(file) {
    if (uploadedImageUrl) URL.revokeObjectURL(uploadedImageUrl);
    uploadedImageUrl = URL.createObjectURL(file);
    imagePreview.replaceChildren();
    const preview = document.createElement('img');
    preview.src = uploadedImageUrl;
    preview.alt = '';
    imagePreview.append(preview);
    uploadLabel.textContent = file.name || '自訂圖片已套用';
    renderArena();
  }

  imageInput.addEventListener('change', async () => {
    const [file] = imageInput.files || [];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('請選擇圖片檔案。');
      imageInput.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('圖片請小於 5 MB，方便在手機上保存。');
      imageInput.value = '';
      return;
    }
    try {
      await saveUploadedImage(file);
      setUploadedImage(file);
      showToast('自訂殭屍圖片已保存到這台裝置。');
    } catch {
      setUploadedImage(file);
      showToast('圖片已套用，但瀏覽器無法保存；重新載入後需要再上傳。');
    }
    imageInput.value = '';
  });

  try {
    nameInput.value = localStorage.getItem(NAME_KEY) || '';
    nameInput.addEventListener('input', () => {
      try { localStorage.setItem(NAME_KEY, nameInput.value.slice(0, 12)); } catch { /* optional convenience */ }
    });
  } catch { /* the game still works without browser storage */ }

  renderArena();
  renderLeaderboard();
  loadUploadedImage();
})();
