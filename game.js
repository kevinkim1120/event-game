// game.js - Hanwha Life Event Game Portal Logic

// Game State
let currentScreen = 'lobby-screen';
let gameMode = '5vs5'; // '5vs5' or '1vs1'
let menNames = ['김민준', '이현우', '박지훈', '최도윤', '정하준'];
let womenNames = ['이서연', '김지우', '박윤서', '최하은', '정수아'];
let menFloors = ['20', '30', '40', '50', '60'];
let womenFloors = ['40', '60', '20', '50', '30'];

let isPlaying = false;
let fireworksActive = false;
let fireworksParticles = [];
let fireworkSpawners = [];
let animationTimer = null;

// Sound Effects Synthesizer using Web Audio API (Lazy initialization for absolute safety)
let audioCtx = null;

function playSound(type) {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return; // Silent exit if not supported
    
    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;

    if (type === 'click') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.1);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    } 
    else if (type === 'match') {
      // Cute retro couple matched melody: low beep then high beep
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(330, now); // E4
      osc1.frequency.setValueAtTime(440, now + 0.15); // A4
      osc1.frequency.setValueAtTime(660, now + 0.3); // E5
      gain1.gain.setValueAtTime(0.15, now);
      gain1.gain.linearRampToValueAtTime(0.01, now + 0.5);
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.5);
    } 
    else if (type === 'launch') {
      // Low whoosh for firework launch
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(80, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.5);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.5);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.5);
    }
    else if (type === 'explode') {
      // Low noise thud for explosion
      const bufferSize = audioCtx.sampleRate * 0.4;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;
      
      // Lowpass filter to make it thud
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, now);
      filter.frequency.exponentialRampToValueAtTime(10, now + 0.4);

      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);
      noise.start(now);
    }
    else if (type === 'success') {
      // Beautiful chord for final celebration
      const notes = [261.63, 329.63, 392.00, 523.25]; // C chord
      notes.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);
        gain.gain.setValueAtTime(0.08, now + idx * 0.1);
        gain.gain.linearRampToValueAtTime(0.001, now + idx * 0.1 + 0.6);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.6);
      });
    }
    else if (type === 'fail') {
      // Disappointment slide down tone
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now); // A3
      osc.frequency.linearRampToValueAtTime(110, now + 0.5); // A2
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.5);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.5);
    }
  } catch (e) {
    console.warn("Web Audio API is not supported or blocked in this browser:", e);
  }
}

// Navigation & Tab control
window.switchScreen = function(screenId) {
  playSound('click');
  
  // Hide all screens
  document.querySelectorAll('.screen').forEach(scr => {
    scr.classList.remove('active');
  });
  
  // Show target screen
  const target = document.getElementById(screenId);
  if (target) {
    target.classList.add('active');
    currentScreen = screenId;
    
    if (screenId === 'game-63-gondola') {
      initGondolaGame();
    } else if (screenId === 'game-movie-hero') {
      startQuizGame();
    } else if (screenId === 'game-hanwha-quiz') {
      startHanwhaQuiz();
    } else {
      stopFireworksLoop();
      stopQuizTimer();
    }
  }
}

// Initialization of the Gondola game UI & grid windows
function initGondolaGame() {
  generateWindows();
  renderRosters();
  renderGondolas();
  resetGameUIState();
  initFireworksCanvas();
}

// 63 Building Windows Generator
function generateWindows() {
  const grid = document.querySelector('.windows-grid');
  grid.innerHTML = '';
  const totalWindows = 48; // 4 columns x 12 rows
  
  for (let i = 0; i < totalWindows; i++) {
    const win = document.createElement('div');
    win.className = 'window-item';
    // Random initial glowing state
    if (Math.random() > 0.6) {
      win.classList.add('glow');
    }
    grid.appendChild(win);
  }

  // Periodic blinking effect for windows
  if (window.windowBlinkerInterval) clearInterval(window.windowBlinkerInterval);
  window.windowBlinkerInterval = setInterval(() => {
    const windows = document.querySelectorAll('.window-item');
    if (windows.length === 0) return;
    
    // Pick 3 random windows to toggle
    for (let j = 0; j < 3; j++) {
      const idx = Math.floor(Math.random() * windows.length);
      windows[idx].classList.toggle('glow');
    }
  }, 1000);
}

// Game Mode Switcher
window.changeGameMode = function(mode) {
  playSound('click');
  gameMode = mode;
  
  // Toggle Visibility of Matching Option
  const matchOptionGroup = document.getElementById('match-option-group');
  if (matchOptionGroup) {
    if (gameMode === '1vs1') {
      matchOptionGroup.style.opacity = '0.3';
      matchOptionGroup.style.pointerEvents = 'none';
    } else {
      matchOptionGroup.style.opacity = '1';
      matchOptionGroup.style.pointerEvents = 'auto';
    }
  }

  // Reset floors configuration based on mode
  const uniqueFloors = ['20', '30', '40', '50', '60'];
  if (gameMode === '5vs5') {
    menFloors = [...uniqueFloors];
    womenFloors = ['40', '60', '20', '50', '30'];
  } else {
    // For 1vs1, set default selections (can be same or different)
    menFloors[0] = '30';
    womenFloors[0] = '30';
  }
  
  renderRosters();
  renderGondolas();
  resetGameUIState();
}

// Render Setup Panels on left and right
function renderRosters() {
  const menList = document.getElementById('men-list');
  const womenList = document.getElementById('women-list');
  
  menList.innerHTML = '';
  womenList.innerHTML = '';
  
  const floors = ['20', '30', '40', '50', '60'];
  
  // Populating Men
  for (let i = 0; i < 5; i++) {
    const isDisabled = (gameMode === '1vs1' && i > 0);
    const card = document.createElement('div');
    card.className = `participant-item male-theme ${isDisabled ? 'disabled-slot' : ''}`;
    card.dataset.index = i;
    card.innerHTML = `
      <div class="p-header">
        <span class="p-num">#0${i + 1}</span>
        <input type="text" class="p-name-input" value="${menNames[i]}" ${isDisabled ? 'disabled' : ''} onchange="updateName('male', ${i}, this.value)">
      </div>
      <div class="p-floor-select">
        <span>선택 층:</span>
        <select class="floor-dropdown" ${isDisabled ? 'disabled' : ''} onchange="updateFloor('male', ${i}, this.value)">
          ${floors.map(f => `<option value="${f}" ${menFloors[i] === f ? 'selected' : ''}>${f}F</option>`).join('')}
        </select>
      </div>
    `;
    menList.appendChild(card);
  }
  
  // Populating Women
  for (let i = 0; i < 5; i++) {
    const isDisabled = (gameMode === '1vs1' && i > 0);
    const card = document.createElement('div');
    card.className = `participant-item female-theme ${isDisabled ? 'disabled-slot' : ''}`;
    card.dataset.index = i;
    card.innerHTML = `
      <div class="p-header">
        <span class="p-num">#0${i + 1}</span>
        <input type="text" class="p-name-input" value="${womenNames[i]}" ${isDisabled ? 'disabled' : ''} onchange="updateName('female', ${i}, this.value)">
      </div>
      <div class="p-floor-select">
        <span>선택 층:</span>
        <select class="floor-dropdown" ${isDisabled ? 'disabled' : ''} onchange="updateFloor('female', ${i}, this.value)">
          ${floors.map(f => `<option value="${f}" ${womenFloors[i] === f ? 'selected' : ''}>${f}F</option>`).join('')}
        </select>
      </div>
    `;
    womenList.appendChild(card);
  }
}

// Render the gondolas on the tracks (docked at the bottom initially)
function renderGondolas() {
  const menContainer = document.getElementById('men-gondolas-container');
  const womenContainer = document.getElementById('women-gondolas-container');
  
  menContainer.innerHTML = '';
  womenContainer.innerHTML = '';
  
  // Men Gondolas
  for (let i = 0; i < 5; i++) {
    const gondola = document.createElement('div');
    gondola.className = 'gondola male-gondola';
    gondola.id = `male-gondola-${i}`;
    // Position side-by-side horizontally using offset
    gondola.style.left = `${-20 + (i * 9)}px`;
    // Docked at bottom (100% of building height)
    gondola.style.top = '93%'; 
    if (gameMode === '1vs1' && i > 0) {
      gondola.style.display = 'none';
    }
    gondola.innerHTML = `
      <div class="gondola-nametag">${menNames[i]}</div>
      <div class="gondola-window">
        <span class="gondola-avatar">👦🏻</span>
      </div>
    `;
    menContainer.appendChild(gondola);
  }
  
  // Women Gondolas
  for (let i = 0; i < 5; i++) {
    const gondola = document.createElement('div');
    gondola.className = 'gondola female-gondola';
    gondola.id = `female-gondola-${i}`;
    // Position side-by-side horizontally using offset
    gondola.style.right = `${-20 + (i * 9)}px`;
    // Docked at bottom
    gondola.style.top = '93%'; 
    if (gameMode === '1vs1' && i > 0) {
      gondola.style.display = 'none';
    }
    gondola.innerHTML = `
      <div class="gondola-nametag">${womenNames[i]}</div>
      <div class="gondola-window">
        <span class="gondola-avatar">👧🏻</span>
      </div>
    `;
    womenContainer.appendChild(gondola);
  }
}

// Sync names from UI input fields
window.updateName = function(gender, index, value) {
  const trimmed = value.trim() || (gender === 'male' ? `남자0${index + 1}` : `여자0${index + 1}`);
  if (gender === 'male') {
    menNames[index] = trimmed;
    const tag = document.querySelector(`#male-gondola-${index} .gondola-nametag`);
    if (tag) tag.textContent = trimmed;
  } else {
    womenNames[index] = trimmed;
    const tag = document.querySelector(`#female-gondola-${index} .gondola-nametag`);
    if (tag) tag.textContent = trimmed;
  }
}

// Sync floors from UI dropdowns (enforcing unique selection in 5vs5 mode)
window.updateFloor = function(gender, index, value) {
  playSound('click');
  const floorsArray = (gender === 'male') ? menFloors : womenFloors;
  const previousValue = floorsArray[index];
  
  if (gameMode === '5vs5') {
    // Find the participant index who has this target floor and swap their floor
    const conflictingIndex = floorsArray.findIndex((f, idx) => idx !== index && f === value);
    if (conflictingIndex !== -1) {
      floorsArray[conflictingIndex] = previousValue;
    }
  }
  
  floorsArray[index] = value;
  
  // Re-render setup panel to show updated dropdown values
  renderRosters();
}

// Reset UI Interactive State
function resetGameUIState() {
  isPlaying = false;
  
  // Reset buttons
  const btn = document.getElementById('btn-start-game');
  btn.disabled = false;
  btn.textContent = '⚡ 매칭 시작!';
  btn.classList.remove('results-ready');
  
  document.getElementById('btn-reset-game').disabled = true;
  
  // Enable side inputs and selectors (ignoring disabled slots in 1vs1 mode)
  document.querySelectorAll('.participant-item:not(.disabled-slot) .p-name-input, .participant-item:not(.disabled-slot) .floor-dropdown').forEach(el => {
    el.disabled = false;
  });
  
  // Reset Camera Zoom Effect
  const container = document.querySelector('.building-container');
  if (container) {
    container.classList.remove('camera-zoom-out');
  }

  // Remove animation and positioning offsets on gondolas
  for (let i = 0; i < 5; i++) {
    const mGon = document.getElementById(`male-gondola-${i}`);
    if (mGon) {
      mGon.style.top = '93%';
      mGon.style.transform = 'none';
      mGon.style.left = `${-20 + (i * 9)}px`;
    }
    const wGon = document.getElementById(`female-gondola-${i}`);
    if (wGon) {
      wGon.style.top = '93%';
      wGon.style.transform = 'none';
      wGon.style.right = `${-20 + (i * 9)}px`;
    }
  }

  // Clear existing hearts
  document.querySelectorAll('.floating-heart').forEach(h => h.remove());
}

// Reset Game
window.resetGame = function() {
  playSound('click');
  resetGameUIState();
  stopFireworksLoop();
}

// Helper to shuffle array
function shuffleArray(arr) {
  const newArr = [...arr];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

// Randomize floors
window.randomizeAll = function() {
  playSound('click');
  if (isPlaying) return;
  
  const floors = ['20', '30', '40', '50', '60'];
  
  if (gameMode === '5vs5') {
    menFloors = shuffleArray(floors);
    womenFloors = shuffleArray(floors);
  } else {
    // For 1vs1, randomize only index 0 (active pair)
    menFloors[0] = floors[Math.floor(Math.random() * floors.length)];
    womenFloors[0] = floors[Math.floor(Math.random() * floors.length)];
  }
  
  // Rerender lists
  renderRosters();
}

// Start Game Matching sequence
window.startGame = async function() {
  const btn = document.getElementById('btn-start-game');
  if (btn.classList.contains('results-ready')) {
    playSound('click');
    presentResults(calculateMatches());
    return;
  }

  playSound('click');
  if (isPlaying) return;
  
  isPlaying = true;
  
  // Disable console and inputs
  document.getElementById('btn-start-game').disabled = true;
  document.getElementById('btn-reset-game').disabled = true;
  document.querySelectorAll('.p-name-input, .floor-dropdown').forEach(el => {
    el.disabled = true;
  });
  
  // Step 1: Raise Gondolas to their selected floors
  // Map floor values to vertical top coordinates
  const floorTops = {
    '60': '22%',
    '50': '40%',
    '40': '58%',
    '30': '76%',
    '20': '94%'
  };
  
  const limit = (gameMode === '5vs5') ? 5 : 1;
  
  // Move men gondolas
  for (let i = 0; i < limit; i++) {
    const targetFloor = menFloors[i];
    const mGon = document.getElementById(`male-gondola-${i}`);
    if (mGon) {
      mGon.style.top = floorTops[targetFloor];
    }
  }
  
  // Move women gondolas
  for (let i = 0; i < limit; i++) {
    const targetFloor = womenFloors[i];
    const wGon = document.getElementById(`female-gondola-${i}`);
    if (wGon) {
      wGon.style.top = floorTops[targetFloor];
    }
  }
  
  // Wait for vertical transition to finish (2.5 seconds)
  await sleep(2600);
  
  // Step 2: Group and calculate matches
  const matchesByFloor = calculateMatches();
  
  let hasMatches = false;
  Object.keys(matchesByFloor).forEach(f => {
    if (matchesByFloor[f].length > 0) hasMatches = true;
  });

  // Pull back camera (Zoom Out) if we have matches!
  if (hasMatches) {
    const container = document.querySelector('.building-container');
    if (container) {
      container.classList.add('camera-zoom-out');
    }
    // Wait for zoom-out transition to settle slightly before explosion triggers
    await sleep(1000);
  }
  
  // Get matching option
  const matchOption = document.querySelector('input[name="match-option"]:checked').value;
  
  // Activate Fireworks Canvas
  startFireworksLoop();
  
  if (gameMode === '5vs5') {
    if (matchOption === 'sequential') {
      // Match them floor by floor (Sequential Effect)
      const activeFloors = ['20', '30', '40', '50', '60'];
      for (const floor of activeFloors) {
        const matchGroup = matchesByFloor[floor];
        if (matchGroup && matchGroup.length > 0) {
          for (const match of matchGroup) {
            // Slide them horizontally to meet in the center
            slideGondolasToCenter(match.manIdx, match.womanIdx);
            playSound('match');
            
            // Spawn hearts & launch fireworks
            spawnHeart(floor);
            triggerFireworkLaunch(floor);
            
            await sleep(2000); // Wait for match sequence to showcase
          }
        }
      }
    } else {
      // Match them all at once (Simultaneous Effect)
      Object.keys(matchesByFloor).forEach(floor => {
        const matchGroup = matchesByFloor[floor];
        if (matchGroup && matchGroup.length > 0) {
          matchGroup.forEach(match => {
            slideGondolasToCenter(match.manIdx, match.womanIdx);
            spawnHeart(floor);
            triggerFireworkLaunch(floor);
          });
        }
      });
      
      playSound('match');
      await sleep(2500);
    }
  } else {
    // 1vs1 Mode
    if (hasMatches) {
      const match = matchesByFloor[menFloors[0]][0];
      slideGondolasToCenter(match.manIdx, match.womanIdx);
      playSound('match');
      
      spawnHeart(match.floor);
      triggerFireworkLaunch(match.floor);
      await sleep(2500);
    } else {
      // Fail sound for no match
      playSound('fail');
      await sleep(1500);
    }
  }
  
  // Step 3: Finish matching animation and prepare result button
  btn.textContent = '결과 확인 📊';
  btn.disabled = false;
  btn.classList.add('results-ready');
  
  // Enable reset button
  document.getElementById('btn-reset-game').disabled = false;
}

// Calculate match pairs
function calculateMatches() {
  const matchesByFloor = {
    '20': [], '30': [], '40': [], '50': [], '60': []
  };
  
  // Group men and women index by their floor selections
  const menByFloor = { '20': [], '30': [], '40': [], '50': [], '60': [] };
  const womenByFloor = { '20': [], '30': [], '40': [], '50': [], '60': [] };
  
  const limit = (gameMode === '5vs5') ? 5 : 1;
  
  for (let i = 0; i < limit; i++) {
    menByFloor[menFloors[i]].push(i);
    womenByFloor[womenFloors[i]].push(i);
  }
  
  // Match them up
  const floors = ['20', '30', '40', '50', '60'];
  floors.forEach(floor => {
    const menIdxs = menByFloor[floor];
    const womenIdxs = womenByFloor[floor];
    const matchCount = Math.min(menIdxs.length, womenIdxs.length);
    
    for (let k = 0; k < matchCount; k++) {
      matchesByFloor[floor].push({
        floor: floor,
        manIdx: menIdxs[k],
        womanIdx: womenIdxs[k],
        manName: menNames[menIdxs[k]],
        womanName: womenNames[womenIdxs[k]]
      });
    }
  });
  
  return matchesByFloor;
}

// Slide matching gondolas to meet in the center (smoothly transitioning via transform)
function slideGondolasToCenter(manIdx, womanIdx) {
  const mGon = document.getElementById(`male-gondola-${manIdx}`);
  const wGon = document.getElementById(`female-gondola-${womanIdx}`);
  
  if (mGon) {
    // Original left is -20 + manIdx * 9. Target is 82px.
    const originalOffset = -20 + (manIdx * 9);
    const translateVal = 82 - originalOffset;
    mGon.style.transform = `translateX(${translateVal}px)`;
  }
  if (wGon) {
    // Original right is -20 + womanIdx * 9. Target is 82px.
    const originalOffset = -20 + (womanIdx * 9);
    const translateVal = 82 - originalOffset;
    wGon.style.transform = `translateX(-${translateVal}px)`;
  }
}

// Spawn a heart element at the center of the matching floor
function spawnHeart(floor) {
  const spot = document.getElementById(`spot-${floor}`);
  if (!spot) return;
  
  const heart = document.createElement('div');
  heart.className = 'floating-heart';
  heart.textContent = '❤️';
  spot.appendChild(heart);
}

// Present Result Modal
function presentResults(matchesByFloor) {
  const modalMatchedList = document.getElementById('modal-matched-list');
  const modalUnmatchedList = document.getElementById('modal-unmatched-list');
  
  modalMatchedList.innerHTML = '';
  modalUnmatchedList.innerHTML = '';
  
  let totalMatches = 0;
  const matchedMen = new Set();
  const matchedWomen = new Set();
  
  // Render matched couples
  const floors = ['60', '50', '40', '30', '20'];
  floors.forEach((floor, idx) => {
    const couples = matchesByFloor[floor] || [];
    couples.forEach(couple => {
      totalMatches++;
      matchedMen.add(couple.manIdx);
      matchedWomen.add(couple.womanIdx);
      
      const row = document.createElement('div');
      row.className = 'couple-match-row';
      row.style.animationDelay = `${idx * 0.15}s`;
      row.innerHTML = `
        <div class="match-person male">👦🏻 ${couple.manName}</div>
        <div class="match-heart">❤️</div>
        <div class="match-person female">👧🏻 ${couple.womanName}</div>
        <span class="match-floor-badge">${couple.floor}층</span>
      `;
      modalMatchedList.appendChild(row);
    });
  });
  
  // Text header customization based on mode
  const modalTitle = document.querySelector('.modal-header h3');
  const bannerEmoji = document.querySelector('.celebration-banner .pixel-heart');
  const bannerHeader = document.querySelector('.celebration-banner h2');
  const bannerDesc = document.querySelector('.celebration-banner p');

  if (gameMode === '1vs1') {
    modalTitle.textContent = '🎉 1대1 매칭 결과 발표 🎉';
    if (totalMatches > 0) {
      bannerEmoji.textContent = '❤️';
      bannerEmoji.className = 'pixel-heart animate-beat';
      bannerHeader.textContent = '매칭 성공!';
      bannerDesc.textContent = '축하합니다! 운명처럼 같은 층에서 만나 서로 데이트를 시작합니다.';
      playSound('success');
    } else {
      bannerEmoji.textContent = '💔';
      bannerEmoji.className = 'pixel-heart';
      bannerHeader.textContent = '매칭 실패...';
      bannerDesc.textContent = '아쉽게도 서로 다른 층을 선택하셨습니다. 다시 매칭해 보세요!';
    }
  } else {
    modalTitle.textContent = '🎉 5대5 커플 매칭 결과 발표 🎉';
    bannerEmoji.textContent = '❤️';
    bannerEmoji.className = 'pixel-heart animate-beat';
    bannerHeader.textContent = '축하합니다!';
    bannerDesc.textContent = '63빌딩 로맨틱 매칭에 성공한 커플들입니다.';
    if (totalMatches > 0) {
      playSound('success');
    }
  }

  if (totalMatches === 0 && gameMode === '5vs5') {
    modalMatchedList.innerHTML = `
      <div style="text-align: center; color: #94A3B8; padding: 20px 0; font-family: var(--font-lobby);">
        매칭된 커플이 없습니다. 다시 도전해 보세요! 😢
      </div>
    `;
  }
  
  // Render unmatched participants (only relevant in 5vs5 mode, since in 1vs1 it's just success/fail)
  if (gameMode === '5vs5') {
    const unmatchedMenNames = [];
    const unmatchedWomenNames = [];
    
    for (let i = 0; i < 5; i++) {
      if (!matchedMen.has(i)) unmatchedMenNames.push(menNames[i]);
      if (!matchedWomen.has(i)) unmatchedWomenNames.push(womenNames[i]);
    }
    
    if (unmatchedMenNames.length > 0 || unmatchedWomenNames.length > 0) {
      let unmatchedHTML = `<h4 class="unmatched-title">솔로 참가자 내역</h4>`;
      if (unmatchedMenNames.length > 0) {
        unmatchedHTML += `<div class="unmatched-names">남자: ${unmatchedMenNames.join(', ')}</div>`;
      }
      if (unmatchedWomenNames.length > 0) {
        unmatchedHTML += `<div class="unmatched-names">여자: ${unmatchedWomenNames.join(', ')}</div>`;
      }
      modalUnmatchedList.innerHTML = unmatchedHTML;
    }
  } else {
    // In 1vs1, show the actual choice details if failed
    if (totalMatches === 0) {
      modalUnmatchedList.innerHTML = `
        <div style="display: flex; justify-content: space-around; align-items: center; background: rgba(255,255,255,0.05); padding: 15px; border-radius: 10px; font-family: var(--font-lobby);">
          <div style="color: #93C5FD;">👦🏻 ${menNames[0]} (${menFloors[0]}층)</div>
          <div style="color: #64748B;">vs</div>
          <div style="color: #F472B6;">👧🏻 ${womenNames[0]} (${womenFloors[0]}층)</div>
        </div>
      `;
    }
  }
  
  // Show Modal
  document.getElementById('result-modal').classList.add('active');
}

window.closeModal = function() {
  playSound('click');
  document.getElementById('result-modal').classList.remove('active');
}

// Utility: Sleep/Delay helper
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


// --- FIREWORKS CANVAS ENGINE ---
let canvas, ctx;

function initFireworksCanvas() {
  canvas = document.getElementById('fireworks-canvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
}

function startFireworksLoop() {
  if (fireworksActive) return;
  fireworksActive = true;
  fireworksParticles = [];
  fireworkSpawners = [];
  requestAnimationFrame(fireworkLoop);
}

function stopFireworksLoop() {
  fireworksActive = false;
  fireworksParticles = [];
  fireworkSpawners = [];
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

// Launch a rocket firework from base rising to target Y height
function triggerFireworkLaunch(floor) {
  if (!canvas) return;
  
  const rectHeight = canvas.height;
  const rectWidth = canvas.width;
  
  // Center of building X coord is in the middle of canvas
  const targetX = rectWidth / 2;
  
  // In zoomed-out state, the sky area is at the top of the canvas
  // We can target the explosions to occur in the top 35% of the canvas
  const targetY = rectHeight * (0.05 + Math.random() * 0.28);
  
  // Spawn a launcher rocket rising from bottom to targetY
  const startX = rectWidth * (0.35 + Math.random() * 0.3); // Spawn around base of 63 building
  const startY = rectHeight * 0.95;
  
  playSound('launch');
  
  fireworkSpawners.push({
    x: startX,
    y: startY,
    targetX: targetX + (Math.random() * 120 - 60), // Explode near center of the building
    targetY: targetY, // Explode in the sky!
    speed: 5 + Math.random() * 3,
    color: '#FF6600', // Launcher color (orange)
    trail: []
  });
}

// Generate the explosion particles
function createExplosion(x, y) {
  playSound('explode');
  
  const particleCount = 60 + Math.floor(Math.random() * 40);
  
  // Color theme palettes: Hanwha orange, pink/red for love, gold for 63
  const palettes = [
    ['#FF6600', '#FF8C33', '#FFB380', '#FFE5D4'], // Hanwha Orange
    ['#EC4899', '#F472B6', '#F9A8D4', '#FDF2F8'], // Pink/Rose
    ['#EAB308', '#FACC15', '#FEF08A', '#FFFDF0'], // Gold/Yellow
    ['#3B82F6', '#60A5FA', '#93C5FD', '#EFF6FF']  // Blue (Men representation)
  ];
  
  const colors = palettes[Math.floor(Math.random() * palettes.length)];
  
  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * 4.5;
    
    fireworksParticles.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      alpha: 1,
      decay: 0.015 + Math.random() * 0.02,
      gravity: 0.08,
      friction: 0.96,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 2 + Math.random() * 2.5
    });
  }
}

// Main Firework Drawing Loop
function fireworkLoop() {
  if (!fireworksActive || !canvas || !ctx) return;
  
  // Fade overlay to create trailing effect
  ctx.fillStyle = 'rgba(11, 15, 25, 0.25)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Update & Draw Rockets/Spawners
  for (let i = fireworkSpawners.length - 1; i >= 0; i--) {
    const r = fireworkSpawners[i];
    
    // Calculate angle towards target
    const dx = r.targetX - r.x;
    const dy = r.targetY - r.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist < 8) {
      // Reached destination -> EXPLODE!
      createExplosion(r.x, r.y);
      fireworkSpawners.splice(i, 1);
      continue;
    }
    
    // Move rocket
    const angle = Math.atan2(dy, dx);
    r.x += Math.cos(angle) * r.speed;
    r.y += Math.sin(angle) * r.speed;
    
    // Draw rocket trail
    r.trail.push({ x: r.x, y: r.y });
    if (r.trail.length > 8) r.trail.shift();
    
    ctx.beginPath();
    ctx.strokeStyle = r.color;
    ctx.lineWidth = 2.5;
    for (let k = 0; k < r.trail.length; k++) {
      const pt = r.trail[k];
      if (k === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    }
    ctx.stroke();
    
    // Draw rocket head (sparkle)
    ctx.beginPath();
    ctx.arc(r.x, r.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
  }
  
  // Update & Draw Explosion Particles
  for (let i = fireworksParticles.length - 1; i >= 0; i--) {
    const p = fireworksParticles[i];
    
    // Physics
    p.vx *= p.friction;
    p.vy *= p.friction;
    p.vy += p.gravity;
    
    p.x += p.vx;
    p.y += p.vy;
    p.alpha -= p.decay;
    
    if (p.alpha <= 0) {
      fireworksParticles.splice(i, 1);
      continue;
    }
    
    // Draw particle
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.shadowBlur = 6;
    ctx.shadowColor = p.color;
    ctx.fill();
    ctx.restore();
  }
  
  // Keep loop active
  requestAnimationFrame(fireworkLoop);
}

// ==========================================================================
// GAME 2: GUESS THE MOVIE HERO (무비 히어로 맞추기) LOGIC
// ==========================================================================

const MOVIE_HERO_QUIZ = [
  {
    idx: 1,
    id: "batman",
    answer: "배트맨",
    aliases: ["batman", "배트맨"],
    hintsCount: 3,
    hints: [
      "movie/1_1.jpeg",
      "movie/1_2.jpg",
      "movie/1-3.jpeg"
    ],
    hintNames: [
      "발 킬머\n(아이스맨 역 - 《탑건》)",
      "마이클 키튼\n(리건 톰슨 역 - 《버드맨》)",
      "크리스찬 베일\n(존 프레스턴 역 - 《이퀄리브리엄》)"
    ],
    answerImg: "movie/1_ans.jpeg"
  },
  {
    idx: 2,
    id: "joker",
    answer: "조커",
    aliases: ["joker", "조커"],
    hintsCount: 3,
    hints: [
      "movie/2_1.jpeg",
      "movie/2_2.jpeg",
      "movie/2_3.jpeg"
    ],
    hintNames: [
      "호아킨 피닉스\n(코모두스 역 - 《글래디에이터》)",
      "히스 레저\n(에니스 델마 역 - 《브로크백 마운틴》)",
      "잭 니콜슨\n(맥머피 역 - 《뻐꾸기 둥지 위로 날아간 새》)"
    ],
    answerImg: "movie/2_ans.jpeg"
  },
  {
    idx: 3,
    id: "spiderman",
    answer: "스파이더맨",
    aliases: ["spiderman", "스파이더맨"],
    hintsCount: 3,
    hints: [
      "movie/3_1.jpeg",
      "movie/3_2.jpeg",
      "movie/3_3.jpeg"
    ],
    hintNames: [
      "앤드류 가필드\n(데스몬드 도스 역 - 《핵소 고지》)",
      "토비 맥과이어\n(닉 캐러웨이 역 - 《위대한 개츠비》)",
      "톰 홀랜드\n(네이선 드레이크 역 - 《언차티드》)"
    ],
    answerImg: "movie/3_ans.jpeg"
  },
  {
    idx: 4,
    id: "catwoman",
    answer: "캣우먼",
    aliases: ["catwoman", "캣우먼", "켓우먼"],
    hintsCount: 3,
    hints: [
      "movie/4_1.jpeg",
      "movie/4_2.jpeg",
      "movie/4_3.jpeg"
    ],
    hintNames: [
      "미셸 파이퍼\n(엘비라 행콕 역 - 《스카페이스》)",
      "할리 베리\n(레티샤 머스그로브 역 - 《몬스터 볼》)",
      "앤 해서웨이\n(앤디 삭스 역 - 《악마는 프라다는 입는다》)"
    ],
    answerImg: "movie/4_ans.jpeg"
  },
  {
    idx: 5,
    id: "superman",
    answer: "슈퍼맨",
    aliases: ["superman", "슈퍼맨"],
    hintsCount: 3,
    hints: [
      "movie/5_1.jpeg",
      "movie/5_2.jpeg",
      "movie/5_3.jpeg"
    ],
    hintNames: [
      "브랜든 라우스\n(레이 팔머 역 - 《레전드 오브 투모로우》)",
      "크리스토퍼 리브\n(리차드 콜리어 역 - 《사랑의 은하수》)",
      "헨리 카빌\n(게롤트 역 - 《위쳐》)"
    ],
    answerImg: "movie/5_ans.jpeg"
  },
  {
    idx: 6,
    id: "hulk",
    answer: "헐크",
    aliases: ["hulk", "헐크"],
    hintsCount: 3,
    hints: [
      "movie/6_1.jpeg",
      "movie/6_2.jpeg",
      "movie/6_3.jpeg"
    ],
    hintNames: [
      "에릭 바나\n(핵토르 역 - 《트로이》)",
      "에드워드 노튼\n(나레이터 역 - 《파이트 클럽》)",
      "마크 러팔로\n(댄 멀리건 역 - 《비긴 어게인》)"
    ],
    answerImg: "movie/6_ans.jpeg"
  },
  {
    idx: 7,
    id: "jeangrey",
    answer: "진 그레이",
    aliases: ["jeangrey", "진그레이", "진 그레이"],
    hintsCount: 3,
    hints: [
      "movie/7_1.jpeg",
      "movie/7_2.jpeg",
      "movie/7_3.jpeg"
    ],
    hintNames: [
      "팜케 얀센\n(레노어 역 - 《테이큰》)",
      "소피 터너\n(산사 스타크 역 - 《왕좌의 게임》)",
      "세이디 싱크\n(맥스 메이필드 역 - 《기묘한 이야기》)"
    ],
    answerImg: "movie/7_ans.jpeg"
  },
  {
    idx: 8,
    id: "penguin",
    answer: "펭귄",
    aliases: ["penguin", "펭귄", "펭귄맨"],
    hintsCount: 2,
    hints: [
      "movie/8_1.jpeg",
      "movie/8_2.jpeg"
    ],
    hintNames: [
      "대니 드비토\n(에이모스 콜드웰 역 - 《빅 피쉬》)",
      "콜린 파렐\n(레이 역 - 《킬러들의 도시》)"
    ],
    answerImg: "movie/8_ans.jpeg"
  },
  {
    idx: 9,
    id: "punisher",
    answer: "퍼니셔",
    aliases: ["punisher", "퍼니셔"],
    hintsCount: 3,
    hints: [
      "movie/9_1.jpeg",
      "movie/9_2.jpeg",
      "movie/9_3.jpeg"
    ],
    hintNames: [
      "돌프 룬드그렌\n(이반 드라고 역 - 《록키 4》)",
      "토마스 제인\n(카터 블레이크 역 - 《딥 블루 씨》)",
      "존 번탈\n(셰인 월시 역 - 《워킹 데드》)"
    ],
    answerImg: "movie/9_ans.jpeg"
  },
  {
    idx: 10,
    id: "lexluthor",
    answer: "렉스 루터",
    aliases: ["lexluthor", "렉스루터", "렉스 루터"],
    hintsCount: 3,
    hints: [
      "movie/10_1.jpeg",
      "movie/10_2.jpeg",
      "movie/10_3.jpeg"
    ],
    hintNames: [
      "진 해크만\n(목사 프랭크 스콧 역 - 《포세이돈 어드벤처》)",
      "니콜라스 홀트\n(눅스 역 - 《매드맥스: 분노의 도로》)",
      "제시 아이젠버그\n(마크 저커버그 역 - 《소셜 네트워크》)"
    ],
    answerImg: "movie/10_ans.jpeg"
  },
  {
    idx: 11,
    id: "twoface",
    answer: "투페이스",
    aliases: ["twoface", "투페이스"],
    hintsCount: 3,
    hints: [
      "movie/11_1.jpeg",
      "movie/11_2.jpeg",
      "movie/11_3.jpeg"
    ],
    hintNames: [
      "토미 리 존스\n(에이전트 K 역 - 《맨 인 블랙》)",
      "아론 에크하트\n(닉 네일러 역 - 《흡연 감사합니다》)",
      "니콜라스 다고스토\n(하비 덴트 역 - 《미드 고담》)"
    ],
    answerImg: "movie/11_ans.jpeg"
  },
  {
    idx: 12,
    id: "mystique",
    answer: "미스틱",
    aliases: ["mystique", "미스틱"],
    hintsCount: 3,
    hints: [
      "movie/12_1.jpeg",
      "movie/12_2.jpeg",
      "movie/12_3.jpeg"
    ],
    hintNames: [
      "레베카 로메인\n(실사 영화 모델 역)",
      "제니퍼 로렌스\n(캣니스 에버딘 역 - 《헝거 게임》)",
      "모건 릴리\n(줄리아 베이커 역 - 《플립》)"
    ],
    answerImg: "movie/12_ans.jpeg"
  },
  {
    idx: 13,
    id: "professorx",
    answer: "프로페서 X",
    aliases: [
      "professorx", "charlesxavier", "xavier",
      "프로페서x", "프로페서 x", "프로페서엑스", "프로페서 엑스",
      "자비에", "자비에교수", "자비에 교수", "찰스자비에", "찰스 자비에"
    ],
    hintsCount: 2,
    hints: [
      "movie/13_2.jpeg",
      "movie/13_1.jpeg"
    ],
    hintNames: [
      "제임스 맥어보이\n(데니스 역 - 《23 아이덴티티》)",
      "패트릭 스튜어트\n(장 뤽 피카드 역 - 《스타트렉》)"
    ],
    answerImg: "movie/13_ans.jpeg"
  },
  {
    idx: 14,
    id: "ghostrider",
    answer: "고스트 라이더",
    aliases: ["ghostrider", "고스트라이더", "고스트 라이더"],
    hintsCount: 2,
    hints: [
      "movie/14_1.jpeg",
      "movie/14_2.jpeg"
    ],
    hintNames: [
      "니콜라스 케이지\n(벤 게이츠 역 - 《내셔널 트레져》)",
      "라이언 고슬링\n(세바스찬 역 - 《라라랜드》)"
    ],
    answerImg: "movie/14_ans.jpeg"
  },
  {
    idx: 15,
    id: "odysseus",
    answer: "오디세우스",
    aliases: ["odysseus", "오디세우스"],
    hintsCount: 2,
    hints: [
      "movie/15_1.jpeg",
      "movie/15_2.jpeg"
    ],
    hintNames: [
      "숀 빈\n(보로미르 역 - 《반지의 제왕》)",
      "맷 데이먼\n(마크 와트니 역 - 《마션》)"
    ],
    answerImg: "movie/15_ans.jpg"
  }
];

let quizScore = 0;
let quizCurrentIndex = 0;
let quizQuestions = [];
let quizTimerVal = 5;
let quizTimerInterval = null;
let currentStepState = 0; // 0: Hint 1, 1: Hint 2, 2: Hint 3, 3: Answer Reveal
let isQuizActive = false;

// Skip management states
let isCountingDown = false;
let activeTimerCallback = null;

// Start Quiz Session
window.startQuizGame = function() {
  quizScore = 0;
  quizCurrentIndex = 0;
  isQuizActive = true;
  
  // Reset score board display
  document.getElementById('quiz-score').textContent = '0';
  
  // Use exact sequential order (no shuffle, play all 15 questions)
  quizQuestions = MOVIE_HERO_QUIZ;
  
  // Update UI round progress
  document.getElementById('quiz-progress').textContent = '1/15';
  document.getElementById('quiz-result-modal').classList.remove('active');
  
  // Render right-side answer board rows
  const historyList = document.getElementById('quiz-history-list');
  historyList.innerHTML = '';
  quizQuestions.forEach((q, idx) => {
    const div = document.createElement('div');
    div.className = 'history-item';
    div.id = `history-item-${idx}`;
    div.innerHTML = `
      <span class="history-num">${idx + 1}.</span>
      <span class="history-val" id="history-val-${idx}">🔒 대기 중</span>
    `;
    historyList.appendChild(div);
  });
  
  loadQuizQuestion();
}

// Load a specific question
function loadQuizQuestion() {
  if (quizTimerInterval) clearInterval(quizTimerInterval);
  isCountingDown = false;
  activeTimerCallback = null;
  
  const q = quizQuestions[quizCurrentIndex];
  
  // Progress indicators
  document.getElementById('quiz-progress').textContent = `${quizCurrentIndex + 1}/15`;
  
  // Clear and enable text input fields
  const inputEl = document.getElementById('quiz-answer-input');
  inputEl.value = '';
  inputEl.disabled = false;
  inputEl.placeholder = "히어로의 이름을 입력하세요";
  document.getElementById('quiz-submit-btn').disabled = false;
  
  // Bind Enter keypress listener
  inputEl.onkeydown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      checkTypedAnswer();
    }
  };
  
  // Highlight active round in history board
  for (let i = 0; i < quizQuestions.length; i++) {
    const item = document.getElementById(`history-item-${i}`);
    if (item) item.classList.remove('active-round');
  }
  const currentItem = document.getElementById(`history-item-${quizCurrentIndex}`);
  if (currentItem) currentItem.classList.add('active-round');
  
  // Reset Clue cards UI
  for (let i = 0; i < 3; i++) {
    const card = document.getElementById(`clue-card-${i}`);
    card.className = 'clue-card locked';
    
    const overlay = document.getElementById(`clue-overlay-${i}`);
    if (overlay) {
      overlay.style.opacity = '1';
      overlay.textContent = `🔒 ${i + 1}단계`;
    }
    
    const img = document.getElementById(`clue-img-${i}`);
    img.src = '';
    
    const actorEl = document.getElementById(`clue-actor-${i}`);
    if (actorEl) actorEl.textContent = '';
  }
  
  // Bind database values
  for (let i = 0; i < q.hintsCount; i++) {
    const img = document.getElementById(`clue-img-${i}`);
    img.src = q.hints[i];
    
    const actorEl = document.getElementById(`clue-actor-${i}`);
    if (actorEl) {
      actorEl.innerHTML = q.hintNames[i].replace(/\n/g, '<br>');
    }
  }
  
  // Handle 2-hint questions (N/A fallback)
  if (q.hintsCount === 2) {
    const card2 = document.getElementById('clue-card-2');
    card2.classList.add('na-clue');
    const overlay2 = document.getElementById('clue-overlay-2');
    if (overlay2) overlay2.textContent = '🔒 제공하지 않음';
  }
  
  // Set starting state
  currentStepState = 0; // Hint 1 active
  
  // Activate Hint 1 Card front visual & zoom it
  const card0 = document.getElementById('clue-card-0');
  card0.classList.remove('locked');
  card0.classList.add('active-reveal', 'zoomed');
  const overlay0 = document.getElementById('clue-overlay-0');
  if (overlay0) overlay0.style.opacity = '0';
  
  // Start 5-second countdown for Hint 1
  startQuizTimer(5, () => {
    // Shrink & flip Card 0
    card0.classList.remove('zoomed');
    card0.classList.add('flipped');
    
    // Enable Proceed button
    const btn = document.getElementById('quiz-proceed-btn');
    btn.disabled = false;
    btn.textContent = "2단계 힌트 보기 ➡️";
  });
}

// Timer countdown manager
function startQuizTimer(durationSeconds, callback) {
  if (quizTimerInterval) clearInterval(quizTimerInterval);
  
  const timerBar = document.getElementById('quiz-timer-bar');
  const timerText = document.getElementById('quiz-timer-seconds');
  const btn = document.getElementById('quiz-proceed-btn');
  
  // Keep button enabled so user can skip!
  isCountingDown = true;
  activeTimerCallback = callback;
  btn.disabled = false;
  btn.textContent = "⏳ 분석 스킵 ⏭️";
  
  let timeRemaining = durationSeconds;
  timerBar.style.width = '100%';
  timerText.textContent = Math.ceil(timeRemaining);
  
  // Timer bar styling
  timerBar.style.background = 'linear-gradient(to right, #06B6D4, #3B82F6)';
  timerBar.style.boxShadow = '0 0 8px rgba(6, 182, 212, 0.6)';
  
  quizTimerInterval = setInterval(() => {
    timeRemaining -= 0.1;
    if (timeRemaining < 0) timeRemaining = 0;
    
    timerBar.style.width = `${(timeRemaining / durationSeconds) * 100}%`;
    timerText.textContent = Math.ceil(timeRemaining);
    
    if (timeRemaining <= 0) {
      clearInterval(quizTimerInterval);
      quizTimerInterval = null;
      isCountingDown = false;
      callback();
    }
  }, 100);
}

// Check typed answer submission
window.checkTypedAnswer = function() {
  const inputEl = document.getElementById('quiz-answer-input');
  const typed = cleanString(inputEl.value);
  if (!typed) return;
  
  const q = quizQuestions[quizCurrentIndex];
  
  // Construct clean aliases list
  const correctAliases = [cleanString(q.answer)];
  if (q.aliases) {
    q.aliases.forEach(alias => {
      correctAliases.push(cleanString(alias));
    });
  }
  
  const isCorrect = correctAliases.includes(typed);
  
  if (isCorrect) {
    playSound('success');
    
    // Determine points earned based on hint level at submission time
    let points = 0;
    if (currentStepState === 0) {
      points = 100;
    } else if (currentStepState === 1) {
      points = 70;
    } else if (currentStepState === 2) {
      points = 30;
    }
    
    quizScore += points;
    document.getElementById('quiz-score').textContent = quizScore;
    
    // Stop analysis countdown
    if (quizTimerInterval) clearInterval(quizTimerInterval);
    quizTimerInterval = null;
    isCountingDown = false;
    
    // Un-blur all clues
    for (let i = 0; i < q.hintsCount; i++) {
      const card = document.getElementById(`clue-card-${i}`);
      card.classList.remove('locked', 'zoomed');
      card.classList.add('active-reveal');
      const overlay = document.getElementById(`clue-overlay-${i}`);
      if (overlay) overlay.style.opacity = '0';
    }
    
    // Lock input fields
    inputEl.disabled = true;
    document.getElementById('quiz-submit-btn').disabled = true;
    
    // Show correct splash overlay
    currentStepState = 3;
    const overlay = document.getElementById('feedback-overlay');
    const icon = document.getElementById('feedback-icon');
    const text = document.getElementById('feedback-text');
    const nameShowcase = document.getElementById('showcase-character-name');
    const imgShowcase = document.getElementById('feedback-answer-img');
    
    overlay.className = 'feedback-overlay active correct';
    icon.textContent = '⭕';
    text.textContent = `정답입니다! (+${points}점)`;
    
    nameShowcase.textContent = q.answer;
    imgShowcase.src = q.answerImg;
    
    // Fill right-side history board
    const historyItem = document.getElementById(`history-item-${quizCurrentIndex}`);
    if (historyItem) {
      historyItem.classList.remove('active-round');
      historyItem.classList.add('revealed');
    }
    const historyVal = document.getElementById(`history-val-${quizCurrentIndex}`);
    if (historyVal) {
      historyVal.textContent = `${q.answer} (+${points}점)`;
    }
    
    // Set proceed button to advance
    const btn = document.getElementById('quiz-proceed-btn');
    btn.disabled = false;
    btn.textContent = "다음 문제 ➡️";
  } else {
    playSound('fail');
    
    // Shake input field to indicate error
    inputEl.classList.remove('shake-error');
    void inputEl.offsetWidth; // trigger reflow
    inputEl.classList.add('shake-error');
    
    inputEl.value = '';
    
    setTimeout(() => {
      inputEl.classList.remove('shake-error');
    }, 500);
  }
}

// Proceed slideshow quiz stages manually (or manual Answer Reveal)
window.proceedQuizFlow = function() {
  const q = quizQuestions[quizCurrentIndex];
  
  // Skip countdown if button is clicked during timer analysis
  if (isCountingDown && activeTimerCallback) {
    if (quizTimerInterval) clearInterval(quizTimerInterval);
    quizTimerInterval = null;
    isCountingDown = false;
    
    // Force immediate flip/complete
    activeTimerCallback();
    return;
  }
  
  if (currentStepState === 0) {
    // Move from Hint 1 to Hint 2
    currentStepState = 1;
    
    const card1 = document.getElementById('clue-card-1');
    card1.classList.remove('locked');
    card1.classList.add('active-reveal', 'zoomed');
    const overlay1 = document.getElementById('clue-overlay-1');
    if (overlay1) overlay1.style.opacity = '0';
    
    startQuizTimer(5, () => {
      // Shrink & flip Hint 2 Card
      card1.classList.remove('zoomed');
      card1.classList.add('flipped');
      
      const btn = document.getElementById('quiz-proceed-btn');
      btn.disabled = false;
      if (q.hintsCount === 3) {
        btn.textContent = "3단계 힌트 보기 ➡️";
      } else {
        btn.textContent = "정답 확인 👁️";
      }
    });
  }
  else if (currentStepState === 1) {
    if (q.hintsCount === 3) {
      // Move from Hint 2 to Hint 3
      currentStepState = 2;
      
      const card2 = document.getElementById('clue-card-2');
      card2.classList.remove('locked');
      card2.classList.add('active-reveal', 'zoomed');
      const overlay2 = document.getElementById('clue-overlay-2');
      if (overlay2) overlay2.style.opacity = '0';
      
      startQuizTimer(5, () => {
        // Shrink & flip Hint 3 Card
        card2.classList.remove('zoomed');
        card2.classList.add('flipped');
        
        const btn = document.getElementById('quiz-proceed-btn');
        btn.disabled = false;
        btn.textContent = "정답 확인 👁️";
      });
    } else {
      // Proceed directly to answer reveal (0 points earned)
      revealAnswerShowcase();
    }
  }
  else if (currentStepState === 2) {
    // Proceed to answer reveal (0 points earned)
    revealAnswerShowcase();
  }
  else if (currentStepState === 3) {
    // Advance to next question or end
    const overlay = document.getElementById('feedback-overlay');
    overlay.className = 'feedback-overlay'; // hide overlay
    
    quizCurrentIndex++;
    if (quizCurrentIndex < quizQuestions.length) {
      loadQuizQuestion();
    } else {
      endQuizGame();
    }
  }
}

// Reveal answer screen overlay (called when user manually gives up to 0 points)
function revealAnswerShowcase() {
  playSound('success');
  currentStepState = 3;
  
  const q = quizQuestions[quizCurrentIndex];
  
  // Un-blur all clues
  for (let i = 0; i < q.hintsCount; i++) {
    const card = document.getElementById(`clue-card-${i}`);
    card.classList.remove('locked', 'zoomed');
    card.classList.add('active-reveal');
    const overlay = document.getElementById(`clue-overlay-${i}`);
    if (overlay) overlay.style.opacity = '0';
  }
  
  // Disable input fields
  document.getElementById('quiz-answer-input').disabled = true;
  document.getElementById('quiz-submit-btn').disabled = true;
  
  // Render feedback showcase modal content
  const overlay = document.getElementById('feedback-overlay');
  const icon = document.getElementById('feedback-icon');
  const text = document.getElementById('feedback-text');
  const nameShowcase = document.getElementById('showcase-character-name');
  const imgShowcase = document.getElementById('feedback-answer-img');
  
  overlay.className = 'feedback-overlay active correct';
  icon.textContent = '⭕';
  text.textContent = '분석 완료! 정답 공개 (0점)';
  
  nameShowcase.textContent = q.answer;
  imgShowcase.src = q.answerImg;
  
  // Fill correct answer on the right-side board (0 points)
  const historyItem = document.getElementById(`history-item-${quizCurrentIndex}`);
  if (historyItem) {
    historyItem.classList.remove('active-round');
    historyItem.classList.add('revealed');
  }
  const historyVal = document.getElementById(`history-val-${quizCurrentIndex}`);
  if (historyVal) {
    historyVal.textContent = `${q.answer} (+0점)`;
  }
  
  // Set proceed button to advance question
  const btn = document.getElementById('quiz-proceed-btn');
  btn.disabled = false;
  btn.textContent = "다음 문제 ➡️";
}

// End Quiz session, display summary ticket
function endQuizGame() {
  isQuizActive = false;
  
  // Update final score display on ticket
  document.getElementById('ticket-score').textContent = quizScore;
  
  // Determine cinema title rank
  let title = '히어로 입문자 👶';
  if (quizScore >= 1200) {
    title = '마블/DC 대마스터 👑';
  } else if (quizScore >= 800) {
    title = '히어로 전문가 🦸‍♂️';
  } else if (quizScore >= 400) {
    title = '일반 무비 팬 🎬';
  }
  
  document.getElementById('ticket-rank').textContent = title;
  document.getElementById('quiz-result-modal').classList.add('active');
}

// Restart button on modal
window.restartQuiz = function() {
  playSound('click');
  startQuizGame();
}

// Clean string helper for flexible answer matching
function cleanString(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/[\s,\.\-\_\(\)\[\]]+/g, '');
}

// ==========================================================================
// GAME 3: THE FACES OF HANWHA (한화 인물 퀴즈) LOGIC
// ==========================================================================

const HANWHA_QUIZ = [
  {
    idx: 1,
    subject: "[창업주] 현암 김종희 선대회장",
    content: "6.25 전쟁 직후 화약 국산화를 이뤄내며 한화그룹의 뼈대를 세운 창업주가 기업 경영에서 최고로 여긴 가치는?",
    circlesHint: "OOOO",
    answer: "사업보국",
    aliases: ["사업보국"],
    img: "person/1_p.jpeg"
  },
  {
    idx: 2,
    subject: "[현 회장] 김승연 회장",
    content: "제2의 창업과 신성장 동력 발굴을 이끄는 김승연 회장님의 대표적인 경영 철학과 상생 슬로건은?",
    circlesHint: "OO, OOOO",
    answer: "신의, 함께멀리",
    aliases: ["신의함께멀리", "신의,함께멀리", "신의 함께 멀리", "신의, 함께 멀리", "신의 함께멀리"],
    img: "person/2_p.jpeg"
  },
  {
    idx: 3,
    subject: "[핵심 임원] 김연배 전 부회장",
    content: "2004년 모든 책임을 홀로 짊어지며 \"다시 태어나도 같은 길을 가겠습니다\"라고 남긴 일화에서 증명된 한화인의 절대적 DNA는?",
    circlesHint: "OOOOO",
    answer: "신용과의리",
    aliases: ["신용과 의리", "신용과의리"],
    img: "person/3_p.jpg"
  },
  {
    idx: 4,
    subject: "[글로벌 거장 1] 디자이너 카림 라시드 (Karim Rashid)",
    content: "세계적인 산업 디자이너인 그가 한화의 'Trust, Respect, Innovation'을 담아 세 개의 원으로 디자인한 공식 브랜드 심볼은?",
    circlesHint: "OOOOO",
    answer: "트라이써클",
    aliases: ["트라이써클", "트라이서클", "tricircle", "트라이 써클"],
    img: "person/4_p.jpeg"
  },
  {
    idx: 5,
    subject: "[글로벌 거장 2] 건축가 안도 타다오 (Ando Tadao)",
    content: "세계적 건축 거장 안도 타다오가 '도전, 헌신, 정도'의 인재상을 키워내기 위해 자연과 조화롭게 설계한 경기도 가평의 이 연수원 이름은?",
    circlesHint: "OOOOOOO",
    answer: "한화인재경영원",
    aliases: ["한화인재경영원", "인재경영원", "한화 인재 경영원", "한화 인재경영원"],
    img: "person/5_p.jpeg"
  },
  {
    idx: 6,
    subject: "[미래 혁신] 김동원 부회장",
    content: "한화생명의 글로벌 진출과 AI·디지털 혁신 비전을 이끄는 김동원 부회장이 주도하여 런칭한, \"고객의 삶에 가치를 더하는\" 한화금융 공동 브랜드는?",
    circlesHint: "OOOOOO",
    answer: "라이프플러스",
    aliases: ["lifeplus", "라이프플러스", "라이프 플러스"],
    img: "person/6_p.jpg"
  }
];

let hanwhaScore = 0;
let hanwhaCurrentIndex = 0;
let hanwhaQuestions = [];
let hanwhaState = 0; // 0: Question active, 1: Answer revealed
let isHanwhaDescRevealed = false;

// Start Hanwha Quiz Session
window.startHanwhaQuiz = function() {
  hanwhaScore = 0;
  hanwhaCurrentIndex = 0;
  hanwhaQuestions = HANWHA_QUIZ;
  isHanwhaDescRevealed = false;
  
  document.getElementById('hanwha-score').textContent = '0';
  document.getElementById('hanwha-progress').textContent = '1/6';
  document.getElementById('hanwha-result-modal').classList.remove('active');
  document.getElementById('hanwha-feedback-overlay').classList.remove('active');
  
  // Render right-side answer board rows (6 items)
  const historyList = document.getElementById('hanwha-history-list');
  historyList.innerHTML = '';
  hanwhaQuestions.forEach((q, idx) => {
    const div = document.createElement('div');
    div.className = 'history-item';
    div.id = `hanwha-history-item-${idx}`;
    div.innerHTML = `
      <span class="history-num">${idx + 1}.</span>
      <span class="history-val" id="hanwha-history-val-${idx}">🔒 대기 중</span>
    `;
    historyList.appendChild(div);
  });
  
  loadHanwhaQuestion();
}

// Load a specific Hanwha question
function loadHanwhaQuestion() {
  const q = hanwhaQuestions[hanwhaCurrentIndex];
  
  // Progress indicators
  document.getElementById('hanwha-progress').textContent = `${hanwhaCurrentIndex + 1}/6`;
  
  // Clear and enable input fields
  const inputEl = document.getElementById('hanwha-answer-input');
  inputEl.value = '';
  inputEl.disabled = false;
  inputEl.placeholder = "정답을 입력하세요";
  document.getElementById('hanwha-submit-btn').disabled = false;
  
  // Bind Enter keypress listener
  inputEl.onkeydown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      checkHanwhaAnswer();
    }
  };
  
  // Highlight active round in history board
  for (let i = 0; i < hanwhaQuestions.length; i++) {
    const item = document.getElementById(`hanwha-history-item-${i}`);
    if (item) item.classList.remove('active-round');
  }
  const currentItem = document.getElementById(`hanwha-history-item-${hanwhaCurrentIndex}`);
  if (currentItem) currentItem.classList.add('active-round');
  
  // Hide actual subject/name behind the "맞춰보세요" placeholder initially
  document.getElementById('hanwha-subject-label').textContent = "맞춰보세요";
  document.getElementById('hanwha-quiz-img').src = q.img;
  
  // Set description text content (hidden initially)
  document.getElementById('hanwha-question-content').textContent = q.content;
  document.getElementById('hanwha-circles-text').textContent = q.circlesHint;
  
  // Reset description reveal state
  isHanwhaDescRevealed = false;
  document.getElementById('hanwha-hint-trigger-box').style.display = 'block';
  document.getElementById('hanwha-question-content').classList.add('hidden-desc');
  
  hanwhaState = 0;
  
  // Reset proceed button text
  const btn = document.getElementById('hanwha-proceed-btn');
  btn.disabled = false;
  btn.textContent = "정답 확인 👁️";
}

// Click handler to reveal consonant / description text hint
window.revealHanwhaDescription = function() {
  if (isHanwhaDescRevealed) return;
  playSound('click');
  isHanwhaDescRevealed = true;
  
  const q = hanwhaQuestions[hanwhaCurrentIndex];
  
  // Strip category prefix inside brackets, e.g. [창업주]
  const cleanSubject = q.subject.replace(/\[.*?\]\s*/, '');
  
  // Reveal actual subject/name and hide trigger, showing description
  document.getElementById('hanwha-subject-label').textContent = cleanSubject;
  document.getElementById('hanwha-hint-trigger-box').style.display = 'none';
  document.getElementById('hanwha-question-content').classList.remove('hidden-desc');
}

// Check typed answer submission for Hanwha quiz
window.checkHanwhaAnswer = function() {
  const inputEl = document.getElementById('hanwha-answer-input');
  const typed = cleanString(inputEl.value);
  if (!typed) return;
  
  const q = hanwhaQuestions[hanwhaCurrentIndex];
  
  // Construct clean aliases list
  const correctAliases = [cleanString(q.answer)];
  if (q.aliases) {
    q.aliases.forEach(alias => {
      correctAliases.push(cleanString(alias));
    });
  }
  
  const isCorrect = correctAliases.includes(typed);
  
  if (isCorrect) {
    // 100 points for correct guess
    revealHanwhaAnswer(true, 100);
  } else {
    playSound('fail');
    
    // Shake input field to indicate error
    inputEl.classList.remove('shake-error');
    void inputEl.offsetWidth; // trigger reflow
    inputEl.classList.add('shake-error');
    
    inputEl.value = '';
    
    setTimeout(() => {
      inputEl.classList.remove('shake-error');
    }, 500);
  }
}

// Process presentation stage progression (Skip or Next)
window.proceedHanwhaFlow = function() {
  if (hanwhaState === 0) {
    // Reveal answer with 0 points (user skipped/gave up)
    revealHanwhaAnswer(false, 0);
  } else if (hanwhaState === 1) {
    // Close overlay, advance to next question
    document.getElementById('hanwha-feedback-overlay').classList.remove('active');
    
    hanwhaCurrentIndex++;
    if (hanwhaCurrentIndex < hanwhaQuestions.length) {
      loadHanwhaQuestion();
    } else {
      endHanwhaGame();
    }
  }
}

// Reveal correct answer state
function revealHanwhaAnswer(isCorrect, points) {
  if (isCorrect) {
    playSound('success');
  } else {
    playSound('success'); // plays normal chime for showing correct answer
  }
  
  hanwhaState = 1;
  const q = hanwhaQuestions[hanwhaCurrentIndex];
  
  // Update scores
  hanwhaScore += points;
  document.getElementById('hanwha-score').textContent = hanwhaScore;
  
  // Disable inputs
  document.getElementById('hanwha-answer-input').disabled = true;
  document.getElementById('hanwha-submit-btn').disabled = true;
  
  // Strip category prefix inside brackets, e.g. [창업주]
  const cleanSubject = q.subject.replace(/\[.*?\]\s*/, '');
  
  // Make sure subject and explanation text are fully revealed in background
  document.getElementById('hanwha-subject-label').textContent = cleanSubject;
  document.getElementById('hanwha-hint-trigger-box').style.display = 'none';
  document.getElementById('hanwha-question-content').classList.remove('hidden-desc');
  
  // Open overlay
  const overlay = document.getElementById('hanwha-feedback-overlay');
  const icon = document.getElementById('hanwha-feedback-icon');
  const text = document.getElementById('hanwha-feedback-text');
  const nameShowcase = document.getElementById('hanwha-showcase-name');
  const imgShowcase = document.getElementById('hanwha-feedback-answer-img');
  
  overlay.className = 'feedback-overlay active correct';
  icon.textContent = isCorrect ? '⭕' : '👁️';
  text.textContent = isCorrect ? `정답입니다! (+${points}점)` : `정답을 공개합니다! (0점)`;
  
  nameShowcase.textContent = q.answer;
  imgShowcase.src = q.img;
  
  // Fill right-side board
  const historyItem = document.getElementById(`hanwha-history-item-${hanwhaCurrentIndex}`);
  if (historyItem) {
    historyItem.classList.remove('active-round');
    historyItem.classList.add('revealed');
  }
  const historyVal = document.getElementById(`hanwha-history-val-${hanwhaCurrentIndex}`);
  if (historyVal) {
    historyVal.textContent = `${q.answer} (+${points}점)`;
  }
  
  // Change proceed button text
  const btn = document.getElementById('hanwha-proceed-btn');
  btn.disabled = false;
  btn.textContent = "다음 문제 ➡️";
}

// End Game summary display
function endHanwhaGame() {
  document.getElementById('hanwha-ticket-score').textContent = hanwhaScore;
  
  let title = '한화 새내기 🌱';
  if (hanwhaScore >= 500) {
    title = '한화의 심장 🧡';
  } else if (hanwhaScore >= 300) {
    title = '한화 매니아 🦁';
  }
  
  document.getElementById('hanwha-ticket-rank').textContent = title;
  document.getElementById('hanwha-result-modal').classList.add('active');
}

// Restart button on modal
window.restartHanwhaQuiz = function() {
  playSound('click');
  startHanwhaQuiz();
}

// Auto-init on script load
document.addEventListener('DOMContentLoaded', () => {
  // Let the lobby card load correctly, trigger grid setup
});
