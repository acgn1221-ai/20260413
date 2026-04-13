let grasses = [];
let fishes = [];
let bubbles = [];
let particles = [];
let ambientBubbles = [];
let corals = [];
let rocks = [];
let jellyfishes = [];
let bgImg;

// 定義每週作業的專屬連結
const assignmentUrls = [
  "https://acgn1221-ai.github.io/20260323/",
  "https://acgn1221-ai.github.io/20260330-2/",
  "https://acgn1221-ai.github.io/20260404/"
];

// 作品對應的描述
const assignmentDescs = [
  "作品一: 網頁裝飾",
  "作品二: 電流急急棒",
  "作品三: 地雷"
];

function preload() {
  // 載入背景圖片 (請確保目錄下有 background.jpg)
  // 加入回呼函式，若讀取失敗則將 bgImg 設為 null，確保 draw() 的判斷式能運作
  bgImg = loadImage('background.jpg', 
    () => console.log("背景圖片載入成功"), 
    () => {
      console.warn("找不到 background.jpg，自動切換為動態漸層背景。");
      bgImg = null;
    }
  );
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  
  // 初始化 30 株海草
  for (let i = 0; i < 30; i++) {
    grasses.push(new SeaGrass(random(width), height, random(100, 200)));
  }

  // 初始化 15 個珊瑚
  for (let i = 0; i < 15; i++) {
    corals.push(new Coral(random(width), height));
  }

  // 初始化 20 個岩石
  for (let i = 0; i < 20; i++) {
    rocks.push(new Rock(random(width), height));
  }

  // 初始化水母
  for (let i = 0; i < 5; i++) {
    jellyfishes.push(new Jellyfish());
  }

  // 初始化三條魚，體型加大並由小到大 (1-3週)
  for (let i = 0; i < 3; i++) {
    let size = map(i, 0, 2, 1.5, 3.0); 
    fishes.push(new Fish(random(width), random(height * 0.3, height * 0.8), size, i + 1));
  }

  // 初始化三個氣泡對應 1-3 週
  for (let i = 0; i < 3; i++) {
    bubbles.push(new WeekBubble(i + 1));
  }

  // 初始化環境背景小氣泡
  for (let i = 0; i < 50; i++) {
    ambientBubbles.push(new AmbientBubble());
  }
}

function draw() {
  // 使用背景圖片
  if (bgImg) {
    image(bgImg, 0, 0, width, height);
  } else {
    drawUnderwaterBackground();
  }

  // 顯示背景小氣泡
  for (let ab of ambientBubbles) {
    ab.update();
    ab.display();
  }

  // 顯示岩石
  for (let r of rocks) {
    r.display();
  }

  // 更新與顯示水母
  for (let j of jellyfishes) {
    j.update();
    j.display();
  }

  // 顯示珊瑚
  for (let c of corals) {
    c.display();
  }

  // 更新與顯示海草
  for (let g of grasses) {
    g.sway();
    g.display();
  }

  // 更新與顯示魚群
  for (let f of fishes) {
    f.move();
    f.display();
  }

  // 更新與顯示氣泡
  for (let b of bubbles) {
    b.float();
    b.display();
  }

  // 更新與顯示粒子特效
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    particles[i].display();
    if (particles[i].isDead()) {
      particles.splice(i, 1);
    }
  }
}

function drawUnderwaterBackground() {
  let c1 = color(30, 80, 150); // 淺藍
  let c2 = color(10, 30, 60);  // 深藍
  for (let y = 0; y < height; y++) {
    let inter = map(y, 0, height, 0, 1);
    let c = lerpColor(c1, c2, inter);
    stroke(c);
    line(0, y, width, y);
  }
}

// --- 海草類別 ---
class SeaGrass {
  constructor(x, y, h) {
    this.x = x;
    this.y = y;
    this.h = h;
    this.offset = random(1000);
  }
  
  sway() {
    // 基本擺動
    this.baseAngle = map(noise(this.offset + frameCount * 0.01), 0, 1, -PI/16, PI/16);
    
    // 滑鼠物理排斥：計算滑鼠與草根部的距離
    let d = dist(mouseX, mouseY, this.x, this.y);
    this.repelX = 0;
    if (d < 150) {
      this.repelX = map(d, 0, 150, (this.x - mouseX) * 0.8, 0);
    }
  }
  
  display() {
    push();
    translate(this.x, this.y);
    stroke(50, 150, 100, 200);
    strokeWeight(4);
    noFill();
    beginShape();
    for (let i = 0; i < 10; i++) {
      let segmentY = map(i, 0, 10, 0, -this.h);
      let segmentX = sin(i * 0.5 + frameCount * 0.02) * (i * 2) + (i/10 * this.repelX);
      vertex(segmentX, segmentY);
    }
    endShape();
    pop();
  }
}

// --- 奇幻魚群類別 (使用 Vertex) ---
class Fish {
  constructor(x, y, size, weekNum) {
    this.pos = createVector(x, y);
    this.vel = createVector(random(-1.5, -0.5), random(-0.2, 0.2));
    this.color = color(random(200, 255), random(150, 200), random(100), 255);
    this.size = size;
    this.week = weekNum;
    this.wiggleOffset = random(1000);
    this.isHovered = false;
  }

  move() {
    // 偵測滑鼠是否在魚身上
    let d = dist(mouseX, mouseY, this.pos.x, this.pos.y);
    this.isHovered = d < 40 * this.size;

    // 如果滑鼠沒在身上，才移動
    if (!this.isHovered) {
      this.pos.add(this.vel);
      if (this.pos.x < -100) this.pos.x = width + 100;
      
      // 隨機吐泡泡特效 (每隔幾秒)
      if (frameCount % 120 === 0 && random() < 0.4) {
        ambientBubbles.push(new AmbientBubble(this.pos.x, this.pos.y));
      }
    }
  }

  display() {
    push();
    translate(this.pos.x, this.pos.y);
    scale(this.size);
    if (this.vel.x > 0) scale(-1, 1);

    // 顯示作品名稱
    fill(255, 200);
    textAlign(CENTER);
    textSize(8);
    text("作品 " + this.week, 30, 25);

    fill(this.color);
    noStroke();
    // 繪製圓潤魚身
    ellipse(30, 0, 60, 35);

    // 魚尾動畫：利用 sin 產生擺動
    let tailWiggle = sin(frameCount * 0.15 + this.wiggleOffset) * 8;
    beginShape();
    vertex(60, 0);
    vertex(80, -15 + tailWiggle);
    vertex(75, 0);
    vertex(80, 15 + tailWiggle);
    endShape();
    pop();

    // 懸停時出現的小資訊框
    if (this.isHovered) {
      this.drawSpeechBubble();
    }
  }

  drawSpeechBubble() {
    let txt = assignmentDescs[this.week - 1];
    push();
    // 回到畫布坐標系
    resetMatrix(); 
    let bw = textWidth(txt) + 30;
    let bh = 35;
    let bx = mouseX + 15;
    let by = mouseY - bh - 20;

    // 畫對話框背景
    fill(255, 240);
    stroke(this.color);
    strokeWeight(2);
    rect(bx, by, bw, bh, 10);

    // 畫對話框小箭頭
    triangle(bx + 10, by + bh, bx + 20, by + bh, bx + 10, by + bh + 10);

    // 畫文字
    fill(50);
    noStroke();
    textSize(14);
    textAlign(CENTER, CENTER);
    text(txt, bx + bw/2, by + bh/2);
    pop();
  }

  clicked() {
    let d = dist(mouseX, mouseY, this.pos.x, this.pos.y);
    if (d < 40 * this.size) { // 根據體型判定點擊範圍
      let url = assignmentUrls[this.week - 1]; // 取得對應週次的 URL
      select('#assignment-frame').attribute('src', url);
      select('#iframe-container').style('display', 'block');
      spawnParticles(this.pos.x, this.pos.y, this.color);
    }
  }
}

// --- 週次氣泡類別 (Iframe 控制) ---
class WeekBubble {
  constructor(weekNum) {
    this.week = weekNum;
    this.pos = createVector(random(width), random(height, height * 1.5));
    this.speed = random(1, 3);
    this.baseR = 40; // 基礎半徑
  }

  float() {
    this.pos.y -= this.speed;
    // 當氣泡超出畫面頂部，重新回到下方
    if (this.pos.y < -50) this.pos.y = height + 50;
  }

  display() {
    // 根據 Y 座標動態計算半徑：由下往上越來越小 (從 40 變到 10)
    this.currentR = map(this.pos.y, height, 0, this.baseR, 10);
    this.currentR = max(this.currentR, 5); // 確保不會小到看不見

    fill(255, 255, 255, 100);
    stroke(255);
    circle(this.pos.x, this.pos.y, this.currentR * 2);
  }

  clicked() {
    let d = dist(mouseX, mouseY, this.pos.x, this.pos.y);
    if (d < this.currentR) {
      let url = assignmentUrls[this.week - 1]; // 取得對應週次的 URL
      select('#assignment-frame').attribute('src', url);
      select('#iframe-container').style('display', 'block');
      spawnParticles(this.pos.x, this.pos.y, color(255, 255, 255, 150));
    }
  }
}

// --- 環境背景氣泡 ---
class AmbientBubble {
  constructor(x, y) {
    if (x !== undefined && y !== undefined) {
      this.pos = createVector(x, y);
      this.vel = createVector(random(-0.5, 0.5), random(-1, -3));
      this.size = random(2, 6);
    } else {
      this.reset();
    }
  }
  reset() {
    this.pos = createVector(random(width), random(height, height * 2));
    this.vel = createVector(0, random(-0.5, -2));
    this.size = random(1, 5);
  }
  update() {
    this.pos.add(this.vel);
    if (this.pos.y < -10) this.reset();
  }
  display() {
    noStroke();
    fill(255, 255, 255, 50);
    circle(this.pos.x, this.pos.y, this.size);
  }
}

// --- 底部珊瑚類別 ---
class Coral {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.color = color(random(200, 255), random(100, 150), random(100, 150), 200);
    this.h = random(30, 60);
  }
  display() {
    push();
    translate(this.x, this.y);
    stroke(this.color);
    strokeWeight(6);
    // 繪製簡單的分叉珊瑚
    for(let i=0; i<3; i++) {
      rotate(PI/6);
      line(0, 0, 0, -this.h * (1 - i*0.2));
      push();
      translate(0, -this.h * 0.5);
      rotate(PI/4);
      line(0, 0, 0, -this.h * 0.3);
      pop();
    }
    pop();
  }
}

// --- 新增：水母類別 ---
class Jellyfish {
  constructor() {
    this.pos = createVector(random(width), random(height));
    this.vel = createVector(random(-0.3, 0.3), random(-0.2, -0.6));
    this.size = random(30, 50);
  }
  update() {
    this.pos.add(this.vel);
    if (this.pos.y < -100) this.pos.y = height + 100;
    if (this.pos.x < -100) this.pos.x = width + 100;
    if (this.pos.x > width + 100) this.pos.x = -100;
  }
  display() {
    let pulse = sin(frameCount * 0.05) * 5;
    push();
    translate(this.pos.x, this.pos.y);
    fill(255, 150, 255, 100);
    noStroke();
    arc(0, 0, this.size + pulse, this.size, PI, TWO_PI); // 頭部
    stroke(255, 150, 255, 80);
    for (let i = -2; i <= 2; i++) { // 觸手
      let tx = i * 8;
      line(tx, 0, tx + sin(frameCount * 0.1 + i) * 10, this.size);
    }
    pop();
  }
}

// --- 底部岩石類別 ---
class Rock {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = random(20, 50);
    this.points = [];
    this.moss = []; // 儲存青苔位置
    for (let i = 0; i < 6; i++) {
      let angle = TWO_PI / 6 * i;
      let r = this.size * random(0.8, 1.2);
      let p = createVector(cos(angle) * r, sin(angle) * r * 0.6);
      this.points.push(p);
      // 50% 機率在頂部長青苔
      if (p.y < 0 && random() < 0.5) {
        this.moss.push({pos: p, s: random(5, 12)});
      }
    }
  }
  display() {
    push();
    translate(this.x, this.y);
    fill(100, 100, 110);
    noStroke();
    // 畫岩石
    beginShape();
    for (let p of this.points) {
      vertex(p.x, p.y);
    }
    endShape(CLOSE);
    // 畫青苔/海葵
    fill(50, 180, 50, 180);
    for (let m of this.moss) {
      ellipse(m.pos.x, m.pos.y, m.s, m.s * 0.6);
    }
    pop();
  }
}

// --- 粒子效果類別 ---
class Particle {
  constructor(x, y, col) {
    this.pos = createVector(x, y);
    this.vel = p5.Vector.random2D().mult(random(2, 6));
    this.lifespan = 255;
    this.color = col;
  }

  update() {
    this.pos.add(this.vel);
    this.lifespan -= 10;
  }

  display() {
    noStroke();
    fill(red(this.color), green(this.color), blue(this.color), this.lifespan);
    circle(this.pos.x, this.pos.y, random(3, 8));
  }

  isDead() {
    return this.lifespan < 0;
  }
}

function spawnParticles(x, y, col) {
  for (let i = 0; i < 15; i++) {
    particles.push(new Particle(x, y, col));
  }
}

function mousePressed() {
  for (let b of bubbles) {
    b.clicked();
  }
  for (let f of fishes) {
    f.clicked();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
