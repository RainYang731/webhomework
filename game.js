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
  const resultLeaderList = document.querySelector('#result-leader-list');
  const resultEmptyBoard = document.querySelector('#result-empty-board');

  const LEADERBOARD_KEY = 'moonguard.leaderboard.v1';
  const PLAYER_KEY = 'moonguard.player.v1';
  const MOONCAKE_IMAGE = './assets/mooncake.svg';
  const COLUMNS = 4;
  const ROWS = 7;
  const GAME_DURATION = 60_000;
  const CLEAR_DELAY = 0;
  const DROP_DURATION = 50;
  let rowColumns = [];
  let score = 0;
  let running = false;
  let settling = false;
  let penaltyActive = false;
  let endTime = 0;
  let frameId = 0;

  function randomColumn() {
    return Math.floor(Math.random() * COLUMNS);
  }

  function fillBoard() {
    // Exactly one mooncake is assigned to each horizontal row.
    rowColumns = Array.from({ length: ROWS }, randomColumn);
    renderBoard();
  }

  function setBoardDisabled() {
    for (const cell of board.querySelectorAll('.board-cell')) {
      cell.disabled = !running || settling || penaltyActive;
    }
  }

  function renderBoard({ fallingRows = new Set(), freshTop = false } = {}) {
    const fragment = document.createDocumentFragment();
    for (let row = 0; row < ROWS; row += 1) {
      for (let column = 0; column < COLUMNS; column += 1) {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'board-cell';
        cell.dataset.row = String(row);
        cell.dataset.column = String(column);
        cell.style.gridRow = String(row + 1);
        cell.style.gridColumn = String(column + 1);
        const hasMooncake = rowColumns[row] === column;
        cell.disabled = !running || settling || penaltyActive;
        cell.setAttribute('aria-label', hasMooncake
          ? `第 ${row + 1} 排的月餅`
          : `第 ${row + 1} 排第 ${column + 1} 格，空格`);

        if (hasMooncake) {
          cell.classList.add('has-mooncake');
          const image = document.createElement('img');
          image.className = 'mooncake-image';
          if (fallingRows.has(row)) image.classList.add('is-falling');
          if (freshTop && row === 0) image.classList.add('is-new');
          if (penaltyActive && row === ROWS - 1) image.classList.add('is-warning');
          image.src = MOONCAKE_IMAGE;
          image.alt = '';
          image.draggable = false;
          cell.append(image);
        }
        fragment.append(cell);
      }
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

  function renderRankingInto(list, emptyMessage) {
    const scores = sortedScores();
    list.replaceChildren();
    emptyMessage.hidden = scores.length > 0;
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
      list.append(row);
    }
  }

  function renderRanking() {
    renderRankingInto(leaderList, emptyBoard);
    renderRankingInto(resultLeaderList, resultEmptyBoard);
  }

  function openOverlay(element) {
    element.hidden = false;
    const closeButton = element.querySelector('.close-button');
    (closeButton || element.querySelector('.start-button'))?.focus();
  }

  function closeOverlay(element) {
    element.hidden = true;
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

    const name = (nameInput.value.trim() || '月餅食客').slice(0, 12);
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
      ? `做得好，${name}！月餅吃得很俐落。`
      : '再試一次，吃到月餅就能得分。';
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
    penaltyActive = false;
    endTime = Date.now() + GAME_DURATION;
    fillBoard();
    startButton.disabled = true;
    startButton.innerHTML = '遊戲進行中 <b>●</b>';
    rankButton.disabled = true;
    hint.textContent = '點最底排月餅所在直欄的任意一格即可吃掉';
    footerMessage.textContent = '每吃掉一塊月餅得 1 分';
    frameId = requestAnimationFrame(updateTimer);
  }

  function wrongTap() {
    if (!running || settling || penaltyActive) return;
    penaltyActive = true;
    footerMessage.textContent = '點錯了！1 秒內不能操作';
    hint.textContent = '冷卻中：最底排月餅閃爍';
    renderBoard();
    window.setTimeout(() => {
      penaltyActive = false;
      if (running) {
        footerMessage.textContent = '每吃掉一塊月餅得 1 分';
        hint.textContent = '點最底排月餅所在直欄的任意一格即可吃掉';
      }
      setBoardDisabled();
      const bottomMooncake = board.querySelector(`.board-cell[data-row="${ROWS - 1}"] .mooncake-image`);
      bottomMooncake?.classList.remove('is-warning');
    }, 1000);
  }

  function hitColumn(column) {
    if (!running || settling || penaltyActive) return;
    // Find the lowest mooncake on the board, then compare only its column with the tap.
    let row = ROWS - 1;
    while (row >= 0 && !Number.isInteger(rowColumns[row])) row -= 1;
    const bottomMooncakeColumn = rowColumns[row];
    if (row < 0 || column !== bottomMooncakeColumn) {
      wrongTap();
      return;
    }
    const cell = board.querySelector(`.board-cell[data-row="${row}"][data-column="${bottomMooncakeColumn}"]`);
    if (!cell) return;

    score += 1;
    scoreDisplay.textContent = String(score);
    settling = true;
    cell.classList.add('is-hit');
    setBoardDisabled();

    window.setTimeout(() => {
      const previousRows = [...rowColumns];
      for (let dropRow = row; dropRow > 0; dropRow -= 1) {
        rowColumns[dropRow] = previousRows[dropRow - 1];
      }
      // A fresh mooncake chooses one of the four top positions after every hit.
      rowColumns[0] = randomColumn();
      const fallingRows = new Set(Array.from({ length: row }, (_, index) => index + 1));
      renderBoard({ fallingRows, freshTop: true });

      window.setTimeout(() => {
        settling = false;
        setBoardDisabled();
        for (const image of board.querySelectorAll('.is-falling, .is-new')) {
          image.classList.remove('is-falling', 'is-new');
        }
      }, DROP_DURATION);
    }, CLEAR_DELAY);
  }

  board.addEventListener('click', (event) => {
    const cell = event.target.closest('.board-cell');
    if (!cell || cell.disabled) return;
    // Use the clicked left-to-right lane only; a tap's row does not affect the result.
    hitColumn(Number(cell.dataset.column));
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
