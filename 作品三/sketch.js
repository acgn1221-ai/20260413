let gameState = "START"; // START, PLAY, LEVEL_UP, WIN, GAME_OVER
let targetDate;
let gridSize = 40;
let bombs = []; // 儲存多個炸彈物件 {pos, found}
let bombsToFind = 1;
let foundCount = 0;
let difficulty = "EASY"; // EASY, NORMAL, HARD
let currentLevel = 1;
let maxLevels = 5;
let animationTimer = 0;
let gameDuration = 90 * 1000; // 1分30秒 (毫秒)
let hitRadius = 30; // 點擊判斷半徑
let hintRadius = 200; // 游標偵測提示半徑
let scansAvailable = 0; // 道具數量
let scanEndTime = 0; // 掃描結束時間
let clocksAvailable = 0; // 時鐘道具數量
let clockFlashTimer = 0; // 時鐘特效計時
let gameStartTime = 0; // 遊戲開始總計時
let leaderboardSaved = false; // 防止重複寫入排行榜

function setup() {
  createCanvas(windowWidth, windowHeight);
  noCursor(); // 隱藏原生滑鼠游標
}

function initLevel(level) {
  currentLevel = level;
  foundCount = 0;
  if (level === 1) {
    gameStartTime = millis();
    leaderboardSaved = false;
  }
  
  bombs = [];
  
  // 根據難度決定數量
  if (difficulty === "NORMAL") bombsToFind = 2;
  else if (difficulty === "HARD") bombsToFind = 3;
  else bombsToFind = 1;

  let cols = floor(width / gridSize);
  let rows = floor(height / gridSize);

  for (let i = 0; i < bombsToFind; i++) {
    bombs.push({
      pos: createVector((floor(random(cols)) * gridSize) + gridSize / 2, (floor(random(rows)) * gridSize) + gridSize / 2),
      found: false
    });
  }

  // 增加難度：隨關卡增加，時間縮短 (90s -> 20s)、偵測範圍縮小、提示範圍縮小
  let levelDuration = map(level, 1, maxLevels, 90000, 20000); 
  targetDate = new Date().getTime() + levelDuration;
  hitRadius = map(level, 1, maxLevels, 40, 15);
  hintRadius = map(level, 1, maxLevels, 300, 80);
}

function draw() {
  background(15, 23, 42); // 深色背景

  drawGrid();

  if (gameState === "START") {
    drawStartScreen();
  } else if (gameState === "PLAY") {
    drawGameScreen();
  } else if (gameState === "LEVEL_UP") {
    drawLevelUpScreen();
  } else if (gameState === "WIN") {
    drawWinScreen();
  } else if (gameState === "GAME_OVER") {
    drawGameOverScreen();
  }

  drawCustomCursor();

  // 繪製時鐘閃爍特效
  if (millis() < clockFlashTimer + 500) {
    let alpha = map(millis() - clockFlashTimer, 0, 500, 200, 0);
    fill(252, 211, 77, alpha); // 金色閃光
    rect(0, 0, width, height);
  }
}

function drawGrid() {
  stroke(255, 255, 255, 30); // 淺白色透明線條
  for (let x = 0; x <= width; x += gridSize) {
    line(x, 0, x, height);
  }
  for (let y = 0; y <= height; y += gridSize) {
    line(0, y, width, y);
  }
}

function drawStartScreen() {
  textAlign(CENTER, CENTER);
  fill(255);
  textSize(32);
  text("「來尋找遺失的寶藏吧」", width / 2, height / 2 - 120);

  textSize(24);
  // 繪製難度選擇按鈕效果
  fill(difficulty === "EASY" ? color(34, 197, 94) : 150);
  text("[ 簡單 ]", width / 2 - 120, height / 2 - 40);
  fill(difficulty === "NORMAL" ? color(252, 211, 77) : 150);
  text("[ 普通 ]", width / 2, height / 2 - 40);
  fill(difficulty === "HARD" ? color(239, 68, 68) : 150);
  text("[ 困難 ]", width / 2 + 120, height / 2 - 40);

  // 改為按下 ENTER 的文字提示
  let pulse = sin(millis() * 0.01) * 5;
  fill(255);
  textSize(20);
  text("點選難度後 按下 ENTER 開始遊戲", width / 2, height / 2 + 50 + pulse);
}

function drawGameScreen() {
  // 1. 倒數計時邏輯
  let now = new Date().getTime();
  let distance = targetDate - now;
  let timerText = "00:00";

  if (distance > 0) {
    let minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    let seconds = Math.floor((distance % (1000 * 60)) / 1000);
    timerText = nf(minutes, 2) + ":" + nf(seconds, 2);
  } else {
    gameState = "GAME_OVER";
  }

  // 顯示當前關卡
  textAlign(LEFT, TOP);
  fill(255, 200);
  textSize(20);
  text("LEVEL: " + currentLevel + " / " + maxLevels, 20, 20);

  // 顯示道具資訊
  fill(168, 85, 247);
  text("道具：透視 (按 S 使用) x " + scansAvailable, 20, 50);

  // 顯示時鐘道具資訊
  fill(251, 191, 36);
  text("道具：時鐘 (按 T 使用) x " + clocksAvailable, 20, 80);

  // 3. 右上角顯示目前尋獲顆數
  textAlign(RIGHT, TOP);
  fill(255);
  textSize(24);
  text("FOUND: " + foundCount + " / " + bombsToFind, width - 20, 20);
  
  drawActiveScans();

  // 2. 繪製倒數文字 (加入豐富的動態縮放)
  let pulse = sin(millis() * 0.005) * 5; // 微小的脈動效果
  textAlign(CENTER, CENTER);
  fill(56, 189, 248); // 水藍色
  textSize(width * 0.1 + pulse); 
  textStyle(BOLD);
  text(timerText, width / 2, height / 2);
}

function drawActiveScans() {
  if (millis() < scanEndTime) {
    for (let b of bombs) {
      if (!b.found) {
        fill(239, 68, 68, 150);
        noStroke();
        ellipse(b.pos.x, b.pos.y, 40, 40);
      }
    }
  }
}

function drawLevelUpScreen() {
  let s = map(millis() - animationTimer, 0, 2000, 0, 1);
  textAlign(CENTER, CENTER);
  fill(252, 211, 77, (1 - s) * 255); // 閃爍金黃色
  textSize(100 * s);
  text("LEVEL COMPLETE!", width / 2, height / 2);
  
  if (millis() - animationTimer > 2000) {
    gameState = "PLAY";
    scansAvailable++; // 獎勵道具
    clocksAvailable++; // 獎勵道具
    initLevel(currentLevel + 1);
  }
}

function drawWinScreen() {
  let totalTime = (millis() - gameStartTime) / 1000;
  let title = "";
  if (difficulty === "EASY") title = "初級收藏家";
  else if (difficulty === "NORMAL") title = "資深探險家";
  else if (difficulty === "HARD") title = "傳奇尋寶王";

  // 儲存至排行榜 (僅執行一次)
  if (!leaderboardSaved) {
    let records = getItem("treasureLeaderboard") || [];
    records.push({
      diff: difficulty,
      time: totalTime.toFixed(2),
      title: title,
      date: new Date().toLocaleDateString()
    });
    records.sort((a, b) => a.time - b.time); // 按時間排序 (越快越好)
    records = records.slice(0, 5); // 只取前五名
    storeItem("treasureLeaderboard", records);
    leaderboardSaved = true;
  }

  textAlign(CENTER, CENTER);
  fill(34, 197, 94);
  textSize(48);
  text("恭喜！你找到了所有寶藏！", width / 2, height / 2 - 180);

  fill(252, 211, 77);
  textSize(32);
  text("稱號：" + title + " (耗時: " + totalTime.toFixed(2) + "s)", width / 2, height / 2 - 130);

  // 繪製排行榜
  fill(255, 200);
  textSize(24);
  text("--- 全球歷史排行榜 (TOP 5) ---", width / 2, height / 2 - 60);
  
  let records = getItem("treasureLeaderboard") || [];
  textSize(20);
  textAlign(LEFT, CENTER);
  for (let i = 0; i < records.length; i++) {
    let r = records[i];
    fill(i === 0 ? color(252, 211, 77) : 255); // 第一名用金色
    text(`${i + 1}. ${r.diff} - ${r.time}s [${r.title}]`, width / 2 - 150, height / 2 - 20 + (i * 30));
  }

  textAlign(CENTER, CENTER);
  fill(255);
  text("點擊任何地方重新開始", width / 2, height / 2 + 80);
}

function drawGameOverScreen() {
  textAlign(CENTER, CENTER);
  fill(239, 68, 68);
  textSize(60);
  text("時間到！任務失敗", width / 2, height / 2);
  textSize(20);
  fill(255);
  text("點擊任何地方重試", width / 2, height / 2 + 80);
}

function drawCustomCursor() {
  // 若遊戲尚未啟動（炸彈位置未定義），繪製基本游標並返回
  if (bombs.length === 0) {
    fill(56, 189, 248);
    noStroke();
    ellipse(mouseX, mouseY, 12, 12);
    return;
  }

  // 尋找最近且尚未被發現的炸彈
  let minD = Infinity;
  for (let b of bombs) {
    if (!b.found) {
      let d = dist(mouseX, mouseY, b.pos.x, b.pos.y);
      if (d < minD) minD = d;
    }
  }

  let d = minD;
  
  // 難度越高，hintRadius 越小，表示需要更靠近才能看到顏色變化
  let cursorSize = map(d, 0, hintRadius, 60, 12, true);
  let colorTransition = map(d, 0, hintRadius, 0, 1, true);
  let cursorColor = lerpColor(color(239, 68, 68), color(56, 189, 248), colorTransition);

  fill(cursorColor);
  noStroke();
  ellipse(mouseX, mouseY, cursorSize, cursorSize);
  
  // 增加發光效果
  if (d < hintRadius) {
    fill(239, 68, 68, 50);
    ellipse(mouseX, mouseY, cursorSize * 1.5, cursorSize * 1.5);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function keyPressed() {
  if (gameState === "START" && keyCode === ENTER) {
    scansAvailable = 0;
    clocksAvailable = 0;
    gameState = "PLAY";
    initLevel(1);
  }

  if (gameState === "PLAY") {
    if (key === 's' || key === 'S') {
      if (scansAvailable > 0 && millis() > scanEndTime) {
        scansAvailable--;
        scanEndTime = millis() + 1500; // 透視持續 1.5 秒
      }
    } else if (key === 't' || key === 'T') {
      if (clocksAvailable > 0) {
        clocksAvailable--;
        targetDate += 15 * 1000; // 增加 15 秒 (15000 毫秒)
        clockFlashTimer = millis(); // 啟動特效
      }
    }
  }
}

function mousePressed() {
  if (gameState === "START") {
    // 簡單難度點擊區域
    if (mouseY > height / 2 - 60 && mouseY < height / 2 - 20) {
      if (mouseX > width / 2 - 160 && mouseX < width / 2 - 80) difficulty = "EASY";
      if (mouseX > width / 2 - 40 && mouseX < width / 2 + 40) difficulty = "NORMAL";
      if (mouseX > width / 2 + 80 && mouseX < width / 2 + 160) difficulty = "HARD";
    }
  } else if (gameState === "PLAY") {
    // 判斷是否點中任何尚未被發現的炸彈
    for (let b of bombs) {
      if (!b.found) {
        let d = dist(mouseX, mouseY, b.pos.x, b.pos.y);
        if (d < hitRadius) {
          b.found = true;
          foundCount++;
          
          // 檢查是否該關卡所有炸彈都找到了
          if (foundCount >= bombsToFind) {
            if (currentLevel < maxLevels) {
              gameState = "LEVEL_UP";
              animationTimer = millis();
            } else {
              gameState = "WIN";
            }
          }
          break; // 每次點擊只觸發一顆
        }
      }
    }
  } else if (gameState === "WIN" || gameState === "GAME_OVER") {
    gameState = "START";
  }
}
