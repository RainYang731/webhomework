(() => {
  const board = document.querySelector('#board');
  const timerDisplay = document.querySelector('#timer');
  const scoreDisplay = document.querySelector('#score');
  const startButton = document.querySelector('#start-button');
  const nameInput = document.querySelector('#player-name');
  const hint = document.querySelector('#game-hint');
  const footerMessage = document.querySelector('#footer-message');
  const rankButton = document.querySelector('#ranking-button');
  const rankingModal = document.querySelector('#ranking-modal');
  const resultModal = document.querySelector('#result-modal');
  const leaderList = document.querySelector('#leader-list');
  const emptyBoard = document.querySelector('#empty-board');

  const LEADERBOARD_KEY = 'moonguard.leaderboard.v1';
  const PLAYER_KEY = 'moonguard.player.v1';
  const ZOMBIE_IMAGE = './assets/zombie.svg';
  const COLUMNS = 4;
  const ROWS = 7;
  const GAME_DURATION = 60_000;
  const CLEAR_DELAY = 85;
  let pieces = [];
  let score = 0;
  let running = false;
  let settling = false;
  let endTime = 0;
  let frameId = 0;
  let nextPieceId = 0;

  function newPiece(row, column, effect = '') {
    return { id: ++nextPieceId, row, column, effect };
  }

  function fillBoard() {
    pieces = [];
    for (let row = 0; row < ROWS; row += 1) {
      for (let column = 0; column < COLUMNS; column += 1) {
        pieces.push(newPiece(row, column));
      }
    }
    renderBoard();
  }

  function renderBoard() {
    const fragment = document.createDocumentFragment();
    const ordered = [...pieces].sort((a, b) => a.row - b.row || a.column - b.column);
    for (const piece of ordered) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `piece${piece.effect ? ` ${piece.effect}` : ''}`;
      button.dataset.pieceId = String(piece.id);
      button.style.gridRow = String(piece.row + 1);
      button.style.gridColumn = String(piece.column + 1);
      button.disabled = !running || settling;
      button.setAttribute('aria-label', '月宮殭屍，點擊消除得 1 分');
      const image = document.createElement('img');
      image.src = ZOMBIE_IMAGE;
      image.alt = '';
      image.draggable = false;
      button.append(image);
      fragment.append(button);
    }
    board.replaceChildren(fragment);
  }

  function readScores() {
    try {
      const saved = JSON.parse(localStorage.getItem(LEADERBOARD_KEY) || '[]');
      return Array.isArray(saved)
        ? saved.filter((entry) => entry && typeof entry.name === 'string' && Number.isFinite(entry.score))
        : [];
    } catch {
      return [];
    }
  }

  function sortedScores(scores = readScores()) {
    return scores.sort((a, b) => b.score - a.score || a.date - b.date).slice(0, 10);
  }

  function renderRanking() {
    const scores = sortedScores();
    leaderList.replaceChildren();
    emptyBoard.hidden = scores.length > 0;
    for (const [index, entry] of scores.entries()) {
      const row = document.createElement('div');
      row.className = 'leader-row';
      const rank = document.createElement('span');
      rank.className = 'rank-number';
      rank.textContent = String(index + 1).padStart(2, '0');
      const player = document.createElement('span');
      player.className = 'leader-player';
      player.textContent = entry.name;
      const points = document.createElement('span');
      points.className = 'leader-score';
      points.append(document.createTextNode(String(entry.score)));
      const unit = document.createElement('small');
      unit.textContent = '分';
      points.append(unit);
      row.append(rank, player, points);
      leaderList.append(row);
    }
  }

  function openOverlay(element) {
    element.hidden = false;
    const closeButton = element.querySelector('.close-button');
    (closeButton || element.querySelector('.start-button'))?.focus();
  }

  function closeOverlay(element) {
    element.hidden = true;
  }

  function hitPiece(pieceId, button) {
    if (!running || settling) return;
    const hit = pieces.find((piece) => piece.id === pieceId);
    if (!hit) return;

    settling = true;
    score += 1;
    scoreDisplay.textContent = String(score);
    button.classList.add('is-clearing');
    for (const pieceButton of board.querySelectorAll('.piece')) pieceButton.disabled = true;

    window.setTimeout(() => {
      const fallingIds = new Set();
      pieces = pieces.filter((piece) => piece.id !== hit.id);
      for (const piece of pieces) {
        if (piece.column === hit.column && piece.row < hit.row) {
          piece.row += 1;
          piece.effect = 'is-falling';
          fallingIds.add(piece.id);
        } else {
          piece.effect = '';
        }
      }

      // Refill the top cell so the 4 × 7 board stays full after every hit.
      pieces.push(newPiece(0, hit.column, 'is-new'));
      settling = false;
      renderBoard();
      window.setTimeout(() => {
        pieces.forEach((piece) => { piece.effect = ''; });
        for (const pieceButton of board.querySelectorAll('.is-falling, .is-new')) {
          pieceButton.classList.remove('is-falling', 'is-new');
        }
      }, 150);
    }, CLEAR_DELAY);
  }

  function finishGame() {
    if (!running) return;
    running = false;
    cancelAnimationFrame(frameId);
    timerDisplay.textContent = '0';
    startButton.disabled = false;
    startButton.innerHTML = '再玩一次 <b>↗</b>';
    rankButton.disabled = false;
    hint.textContent = '時間到！點擊「再玩一次」重新挑戰';
    footerMessage.textContent = '看看本機排行榜上的名次';
    renderBoard();

    const name = (nameInput.value.trim() || '月兔隊員').slice(0, 12);
    const previous = readScores();
    const entry = score > 0 ? { name, score, date: Date.now() } : null;
    let saved = false;
    if (entry) {
      const updated = sortedScores([...previous, entry]);
      try {
        localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(updated));
        saved = true;
      } catch {
        footerMessage.textContent = '瀏覽器無法保存這次分數';
      }
    }
    renderRanking();
    const finalScores = entry ? sortedScores([...previous, entry]) : sortedScores(previous);
    const rank = saved ? finalScores.findIndex((row) => row === entry) + 1 : 0;
    document.querySelector('#final-score').textContent = String(score);
    document.querySelector('#result-caption').textContent = score
      ? `做得好，${name}！圖片掉落得又快又準。`
      : '再試一次，點掉圖片就能得分。';
    document.querySelector('#result-rank').textContent = rank > 0
      ? `本機排行榜第 ${rank} 名`
      : score > 0 ? '這次沒有進入本機前 10 名。' : '';
    openOverlay(resultModal);
  }

  function updateTimer() {
    if (!running) return;
    const remaining = endTime - Date.now();
    timerDisplay.textContent = String(Math.max(0, Math.ceil(remaining / 1000)));
    if (remaining <= 0) {
      finishGame();
      return;
    }
    frameId = requestAnimationFrame(updateTimer);
  }

  function startGame() {
    closeOverlay(resultModal);
    closeOverlay(rankingModal);
    score = 0;
    scoreDisplay.textContent = '0';
    timerDisplay.textContent = '60';
    running = true;
    settling = false;
    fillBoard();
    endTime = Date.now() + GAME_DURATION;
    startButton.disabled = true;
    startButton.innerHTML = '遊戲進行中 <b>●</b>';
    rankButton.disabled = true;
    hint.textContent = '點掉圖片，上方圖片會快速落下';
    footerMessage.textContent = '每點掉一張圖片得 1 分';
    frameId = requestAnimationFrame(updateTimer);
  }

  board.addEventListener('click', (event) => {
    const button = event.target.closest('.piece');
    if (!button || button.disabled) return;
    hitPiece(Number(button.dataset.pieceId), button);
  });

  startButton.addEventListener('click', startGame);
  document.querySelector('#again-button').addEventListener('click', startGame);
  rankButton.addEventListener('click', () => {
    renderRanking();
    openOverlay(rankingModal);
  });
  document.addEventListener('click', (event) => {
    const close = event.target.closest('[data-close]');
    if (!close) return;
    if (close.dataset.close === 'ranking') closeOverlay(rankingModal);
    if (close.dataset.close === 'result') closeOverlay(resultModal);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    closeOverlay(rankingModal);
    closeOverlay(resultModal);
  });

  try {
    nameInput.value = localStorage.getItem(PLAYER_KEY) || '';
    nameInput.addEventListener('input', () => {
      try { localStorage.setItem(PLAYER_KEY, nameInput.value.slice(0, 12)); } catch { /* optional convenience */ }
    });
  } catch { /* the game works without local storage */ }

  fillBoard();
  renderRanking();
})();
