let gameState = "WAIT_TO_START";
let upperPoints = [];
let lowerPoints = [];
let trackGap = 80;
let difficulty = "NORMAL";
let level = 1;
let lives = 3;
const MAX_LEVELS = 3;
let timer = 0;
let startFrame = 0;
let ballSize = 15;
let particles = [];
let shakeAmount = 0;
let impactShake = 0; // 新增碰撞衝擊震動
let fireworks = [];
let obstacles = []; // 新增障礙物陣列

const SETTINGS = {
  EASY: { gap: 100, noise: 0.05, ball: 10 },
  NORMAL: { gap: 75, noise: 0.1, ball: 15 },
  HARD: { gap: 50, noise: 0.2, ball: 20 }
};

function setup() {
  createCanvas(windowWidth, windowHeight);
  initLevel();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  initLevel();
  gameState = "WAIT_TO_START";
}

function draw() {
  background(30);

  // 全域震動邏輯 (包含原本的速度抖動與碰撞震動)
  push();
  let currentShake = impactShake;
  if (gameState === "PLAYING") {
    let speed = dist(mouseX, mouseY, pmouseX, pmouseY);
    shakeAmount = map(speed, 10, 60, 0, 5, true);
    currentShake += shakeAmount;
  }
  if (currentShake > 0) translate(random(-currentShake, currentShake), random(-currentShake, currentShake));
  if (impactShake > 0) impactShake *= 0.85; // 震動衰減

  drawNeonBackground();
  drawProgressBar();

  if (gameState === "WAIT_TO_START") {
    drawTrack();
    drawStartButton();
    drawDifficultyButtons();
    drawStatus(); // 讓玩家在開始前也能看到目前的生命與關卡
  } else if (gameState === "PLAYING") {
    updateTimer();
    drawTrack();

    drawObstacles(); // 繪製並更新障礙物
    // 產生並更新粒子尾巴
    particles.push({ x: mouseX, y: mouseY, alpha: 255, size: ballSize });
    updateAndDrawParticles();

    drawBall();
    checkCollision();
    checkWin();
    drawEndButton();
    drawStatus();
  } else if (gameState === "GAMEOVER") {
    showEndScreen("GAME OVER");
  } else if (gameState === "WIN") {
    updateAndDrawFireworks();
    showEndScreen(level >= MAX_LEVELS ? "VICTORY" : "LEVEL CLEAR");
  }
  pop(); // 結束震動範圍
}

function initLevel() {
  let baseGap = SETTINGS[difficulty].gap;
  trackGap = max(30, baseGap - (level - 1) * 5);
  // 重置計時器（每關/每次嘗試重新計算）
  timer = 0;
  
  ballSize = SETTINGS[difficulty].ball;
  particles = []; // 切換關卡或重置時清空粒子
  upperPoints = [];
  lowerPoints = [];
  let segments = 50;
  let trackWidth = width;
  let noiseScale = SETTINGS[difficulty].noise;

  for (let i = 0; i <= segments; i++) {
    let x = (trackWidth / segments) * i;
    let n = noise(i * noiseScale, level * 10);
    let base_y = n * (height - trackGap * 2) + trackGap;

    if (i < 5) base_y = height / 2; // 起始區塊平整化
    if (i > segments - 5) base_y = height / 2; // 終點區塊平整化，確保對準結束鍵

    upperPoints.push(createVector(x, base_y - trackGap / 2));
    lowerPoints.push(createVector(x, base_y + trackGap / 2));
  }

  // 初始化障礙物
  obstacles = [];
  let numObs = difficulty === "HARD" ? 6 : (difficulty === "NORMAL" ? 3 : 1);
  numObs *= level; // 隨關卡增加數量
  for (let i = 0; i < numObs; i++) {
    let x = random(width * 0.2, width * 0.8);
    let idx = floor(map(x, 0, width, 0, segments));
    let midY = (upperPoints[idx].y + lowerPoints[idx].y) / 2;
    obstacles.push({
      x: x,
      y: midY,
      size: random(15, 25),
      speed: difficulty === "EASY" ? 0 : random(1, 3),
      angle: random(TWO_PI) // 用於上下移動
    });
  }
}

function drawTrack() {
  push();
  noFill();
  
  // 設定基礎顏色與發光顏色
  let baseColor = color("#ffd60a");
  let alertColor = color("#ffc300");
  let finalColor = baseColor;
  let glowIntensity = 10;

  // 當遊戲進行中，計算滑鼠與軌道邊緣的距離來動態改變顏色與發光強度
  if (gameState === "PLAYING") {
    let segmentWidth = width / (upperPoints.length - 1);
    let idx = floor(mouseX / segmentWidth);
    if (idx >= 0 && idx < upperPoints.length - 1) {
      let amt = (mouseX % segmentWidth) / segmentWidth;
      let uY = lerp(upperPoints[idx].y, upperPoints[idx+1].y, amt);
      let lY = lerp(lowerPoints[idx].y, lowerPoints[idx+1].y, amt);
      let distToEdge = min(abs(mouseY - uY), abs(mouseY - lY));
      
      // 當距離小於 40px 時開始變色，15px 時完全變成警示色
      let factor = map(distToEdge, 40, 15, 0, 1, true);
      finalColor = lerpColor(baseColor, alertColor, factor);
      glowIntensity = map(distToEdge, 40, 15, 10, 25, true);
    }
  }

  stroke(finalColor);
  strokeWeight(3);
  
  // 加入動態發光特效 (Canvas Shadow API)
  drawingContext.shadowBlur = glowIntensity;
  drawingContext.shadowColor = finalColor;

  // 畫上邊界
  beginShape();
  if (upperPoints.length > 0) curveVertex(upperPoints[0].x, upperPoints[0].y); // 控制點
  for (let p of upperPoints) {
    curveVertex(p.x, p.y);
  }
  if (upperPoints.length > 0) curveVertex(upperPoints[upperPoints.length-1].x, upperPoints[upperPoints.length-1].y); // 控制點
  endShape();

  // 畫下邊界
  beginShape();
  if (lowerPoints.length > 0) curveVertex(lowerPoints[0].x, lowerPoints[0].y); // 控制點
  for (let p of lowerPoints) {
    curveVertex(p.x, p.y);
  }
  if (lowerPoints.length > 0) curveVertex(lowerPoints[lowerPoints.length-1].x, lowerPoints[lowerPoints.length-1].y); // 控制點
  endShape();

  // --- 新增：軌道中間的虛線 ---
  drawingContext.shadowBlur = 0; // 虛線不需要強烈發光
  stroke(255, 255, 255, 150);
  strokeWeight(1);
  drawingContext.setLineDash([10, 15]); // 設定虛線樣式 [長度, 間隔]
  beginShape();
  if (upperPoints.length > 0) {
    let m0 = (upperPoints[0].y + lowerPoints[0].y) / 2;
    curveVertex(upperPoints[0].x, m0);
    for (let i = 0; i < upperPoints.length; i++) {
      let midY = (upperPoints[i].y + lowerPoints[i].y) / 2;
      curveVertex(upperPoints[i].x, midY);
    }
    let last = upperPoints.length - 1;
    curveVertex(upperPoints[last].x, (upperPoints[last].y + lowerPoints[last].y) / 2);
  }
  endShape();
  drawingContext.setLineDash([]); // 重置，不影響其他繪圖
  pop();
}

function drawObstacles() {
  push();
  for (let obs of obstacles) {
    // 如果不是 EASY 模式，障礙物會動態上下漂移
    if (gameState === "PLAYING" && obs.speed > 0) {
      obs.y += sin(frameCount * 0.05 + obs.angle) * obs.speed;
    }
    
    // 繪製紅色發光障礙物
    fill("#ef233c");
    noStroke();
    drawingContext.shadowBlur = 15;
    drawingContext.shadowColor = color("#ef233c");
    ellipse(obs.x, obs.y, obs.size);
    
    // 內圈裝飾
    fill(255, 100);
    ellipse(obs.x, obs.y, obs.size * 0.4);
  }
  pop();
}

function drawStartButton() {
  stroke("#fdf0d5");
  strokeWeight(2);
  fill(0, 255, 100);
  rect(0, height / 2 - 25, 80, 50, 0, 5, 5, 0); 
  fill("#ffc2d1");
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(20);
  text("START", 40, height / 2);
}

function drawDifficultyButtons() {
  textAlign(LEFT, TOP);
  fill(255);
  textSize(16);
  text("DIFFICULTY:", 10, 50);
  let diffs = ["EASY", "NORMAL", "HARD"];
  for (let i = 0; i < diffs.length; i++) {
    let x = 10 + i * 85;
    let y = 75; // Matches mousePressed logic
    stroke("#fdf0d5");
    strokeWeight(2);
    fill(difficulty === diffs[i] ? 255 : 50);
    rect(x, y, 80, 35, 5);
    noStroke();
    fill("#ffc2d1");
    textAlign(CENTER, CENTER);
    textSize(20);
    text(diffs[i], x + 40, y + 17);
  }
}

function drawEndButton() {
  stroke("#fdf0d5");
  strokeWeight(2);
  fill(255, 50, 50);
  // Positioned at the end of the track
  rect(width - 80, height / 2 - 25, 80, 50, 5, 0, 0, 5); 
  fill("#ffc2d1");
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(20);
  text("END", width - 40, height / 2);
}

function drawBall() {
  fill("#adc178");
  stroke(255);
  strokeWeight(2);
  ellipse(mouseX, mouseY, ballSize);
}

function drawStatus() {
  fill(255);
  noStroke();
  textAlign(RIGHT, TOP);
  textSize(20);
  let heartStr = "";
  for(let i=0; i<lives; i++) heartStr += "❤️";
  text(`${heartStr} | LEVEL: ${level}/${MAX_LEVELS} | MODE: ${difficulty} | TIME: ${timer.toFixed(1)}s`, width - 20, 20);
}

function updateTimer() {
  // Increment timer by elapsed seconds per frame
  timer += 1/60;
}

function showEndScreen(msg) {
  let isWinAll = (gameState === "WIN" && level >= MAX_LEVELS);
  fill(gameState === "GAMEOVER" ? color(255, 0, 0) : color(0, 255, 0));
  textAlign(CENTER);
  textSize(48);
  
  let displayMsg = msg;
  if (isWinAll) {
    let title = difficulty === "HARD" ? "【電競傳說】" : (difficulty === "NORMAL" ? "【資深電工】" : "【避雷新手】");
    displayMsg = "恭喜通關！\n稱號：" + title;
  } else if (gameState === "WIN") {
    displayMsg = `LEVEL ${level} CLEAR!`;
  }
  
  // 將稱號位置調高，避免重疊
  text(displayMsg, width / 2, height / 2 - 120);
  
  // 顯示過關花費時間
  if (gameState === "WIN") {
    fill("#ffd60a");
    textSize(24);
    text(`Time Spent: ${timer.toFixed(1)}s`, width / 2, height / 2 - 20);
  }

  textSize(20);
  fill(255);
  let subText = isWinAll ? "You are the master of electricity!" : (gameState === "GAMEOVER" ? "Try again to beat the track" : "Ready for the next challenge?");
  text(subText, width / 2, height / 2 + 20);
  
  // 按鈕顏色設定
  stroke("#fdf0d5");
  strokeWeight(2);
  fill(0, 255, 100);
  
  // 中間的主按鈕 (下一關 或 重新開始)
  let btnLabel = (gameState === "WIN" && level < MAX_LEVELS) ? "NEXT LEVEL" : "RESTART";
  rect(width / 2 - 80, height / 2 + 60, 160, 50, 5);
  
  noStroke();
  fill("#ffc2d1");
  textSize(20);
  text(btnLabel, width / 2, height / 2 + 85);

  drawDifficultyButtons();
}

function mousePressed() {
  // Start Button Click (at track entrance)
  if (mouseX > 0 && mouseX < 80 && mouseY > height / 2 - 25 && mouseY < height / 2 + 25) {
    gameState = "PLAYING";
    initLevel();
  }
  // End Screen Button Click
  if ((gameState === "GAMEOVER" || gameState === "WIN") && 
      mouseX > width/2 - 80 && mouseX < width/2 + 80 && mouseY > height/2 + 60 && mouseY < height/2 + 110) {
    
    if (gameState === "WIN" && level < MAX_LEVELS) {
      // 下一關
      level++;
      lives++;
      initLevel();
      gameState = "WAIT_TO_START"; // 改為等待狀態，玩家需點擊 START 才開始
    } else {
      // 重新開始
      level = 1;
      lives = 3;
      gameState = "WAIT_TO_START";
      initLevel();
    }
    fireworks = []; // 清空煙火
  }
  // End Button Manual Exit
  if (gameState === "PLAYING" && mouseX > width - 80 && mouseY > height/2 - 25 && mouseY < height/2 + 25) {
    gameState = "WAIT_TO_START";
  }
  // Difficulty Toggle
  if (gameState !== "PLAYING") {
    let diffs = ["EASY", "NORMAL", "HARD"];
    for (let i = 0; i < diffs.length; i++) {
      let x = 10 + i * 85;
      if (mouseX > x && mouseX < x + 80 && mouseY > 75 && mouseY < 110) {
        difficulty = diffs[i];
        initLevel();
      }
    }
  }
}

function drawNeonBackground() {
  push();
  // 使用要求的紅色 (#ef233c) 霓虹線條，帶有發光感
  let neonColor = color("#ef233c");
  let glowIntensity = 12;

  // 當只剩一顆心時，產生紅色閃爍警示
  if (lives === 1 && floor(frameCount / 20) % 2 === 0) {
    neonColor = color(255, 0, 0);
    glowIntensity = 25;
  }

  stroke(red(neonColor), green(neonColor), blue(neonColor), 50); // 設定半透明度
  strokeWeight(1);
  drawingContext.shadowBlur = glowIntensity; // 動態發光程度
  drawingContext.shadowColor = neonColor;
  
  let spacing = 100; // 網格間距
  // 繪製垂直線
  for (let x = 0; x <= width; x += spacing) {
    line(x, 0, x, height);
  }
  // 繪製水平線
  for (let y = 0; y <= height; y += spacing) {
    line(0, y, width, y);
  }
  pop();
}

function drawProgressBar() {
  let barW = 300;
  let barH = 15;
  let x = width / 2 - barW / 2;
  let y = 10;
  
  let isCritical = (lives === 1 && floor(frameCount / 20) % 2 === 0);
  let barStroke = isCritical ? color(255, 0, 0) : color("#fdf0d5");
  let barFill = isCritical ? color(255, 50, 50) : color("#ffd60a");

  // 外框
  stroke(barStroke);
  strokeWeight(2);
  noFill();
  rect(x, y, barW, barH, 8);
  
  // 進度計算 (基於滑鼠 X 軸)
  let p = map(mouseX, 0, width, 0, 1, true);
  noStroke();
  fill(barFill);
  rect(x + 3, y + 3, (barW - 6) * p, barH - 6, 5);
}

function triggerHit() {
  lives -= 1;
  impactShake = 25;
  if (lives <= 0) {
    gameState = "GAMEOVER";
  } else {
    gameState = "WAIT_TO_START"; // 扣血後進入等待點擊開始狀態
  }
}

function checkCollision() {
  let segmentWidth = width / (upperPoints.length - 1);
  let idx = floor(mouseX / segmentWidth);
  
  if (idx >= 0 && idx < upperPoints.length - 1) {
    let amt = (mouseX % segmentWidth) / segmentWidth;
    let upperY = lerp(upperPoints[idx].y, upperPoints[idx+1].y, amt);
    let lowerY = lerp(lowerPoints[idx].y, lowerPoints[idx+1].y, amt);

    // Dynamic collision based on ball size
    if (mouseY - ballSize/2 <= upperY || mouseY + ballSize/2 >= lowerY) {
      triggerHit();
      return; // 避免同一幀觸發多次
    }
  }

  // 檢查障礙物碰撞
  for (let obs of obstacles) {
    let d = dist(mouseX, mouseY, obs.x, obs.y);
    if (d < (ballSize / 2 + obs.size / 2)) {
      triggerHit();
      break;
    }
  }
}

function checkWin() {
  // Win when ball touches the End button area
  if (gameState === "PLAYING" && mouseX > width - 80 && mouseY > height/2 - 25 && mouseY < height/2 + 25) {
    gameState = "WIN";
  }
}

function updateAndDrawFireworks() {
  // 隨機產生煙火發射
  if (frameCount % 15 === 0) {
    let x = random(width * 0.2, width * 0.8);
    let y = random(height * 0.2, height * 0.5);
    let colors = ["#ffd60a", "#ef233c", "#adc178", "#ffc2d1"];
    let col = color(random(colors));
    for (let i = 0; i < 30; i++) {
      fireworks.push({
        x: x,
        y: y,
        vx: random(-5, 5),
        vy: random(-5, 5),
        alpha: 255,
        col: col
      });
    }
  }

  // 更新與繪製煙火粒子
  push();
  for (let i = fireworks.length - 1; i >= 0; i--) {
    let f = fireworks[i];
    f.x += f.vx;
    f.y += f.vy;
    f.vy += 0.1; // 重力
    f.alpha -= 4;
    if (f.alpha <= 0) {
      fireworks.splice(i, 1);
    } else {
      f.col.setAlpha(f.alpha);
      fill(f.col);
      noStroke();
      circle(f.x, f.y, 4);
    }
  }
  pop();
}

function updateAndDrawParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.alpha -= 10; // 粒子淡出速度
    if (p.alpha <= 0) {
      particles.splice(i, 1);
    } else {
      push();
      let c = color("#adc178");
      c.setAlpha(p.alpha);
      fill(c);
      noStroke();
      // 粒子發光特效
      drawingContext.shadowBlur = 10;
      drawingContext.shadowColor = c;
      circle(p.x, p.y, p.size * 0.8);
      pop();
    }
  }
}
