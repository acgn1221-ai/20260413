let seaweeds = [];
let rocks = [];
let bubbles = [];
let fishes = [];

function setup() {
  let cnv = createCanvas(windowWidth, windowHeight);
  // 讓 p5 canvas 不會阻擋滑鼠事件，以便操作後方的 iframe
  cnv.style('pointer-events', 'none');
  // 設定 Canvas 為固定定位，確保它覆蓋在最上層
  cnv.style('position', 'fixed');
  cnv.style('top', '0');
  cnv.style('left', '0');
  cnv.style('z-index', '1');

  // 建立 iframe 並設定其樣式
  let iframe = createElement('iframe');
  iframe.attribute('src', 'https://www.et.tku.edu.tw/');
  iframe.style('position', 'absolute');
  iframe.style('top', '0');
  iframe.style('left', '0');
  iframe.style('width', '100%');
  iframe.style('height', '100%');
  iframe.style('border', 'none');
  iframe.style('z-index', '0'); // iframe 在 canvas 後方 (z-index 0 < 1)
  
  // 隨機生成 30 到 45 根水草
  let numSeaweeds = int(random(30, 46)); 
  for (let i = 0; i < numSeaweeds; i++) {
    // 平均分佈在畫面寬度上，並加入隨機擾動
    let x = (width / numSeaweeds) * i + random(width / numSeaweeds);
    
    // 產生一個深度係數 z (0~1)，0代表遠，1代表近
    let z = random(0, 1);
    
    let y = height; // 水草貼齊畫面底部
    let h = map(z, 0, 1, height * 0.2, height * 0.6); // 遠處較矮，近處較高
    let w = map(z, 0, 1, 20, 60); // 遠處較細，近處較粗

    seaweeds.push(new Seaweed(x, y, h, w));
  }
  // 依照 y 座標排序，讓遠處(y較小)先畫，近處(y較大)後畫，形成遮擋關係
  // 因為 y 固定為 height，改用寬度 w (代表遠近) 來排序，細的(遠)先畫
  seaweeds.sort((a, b) => a.w - b.w);

  // 生成一些岩石在底部
  for (let i = 0; i < 20; i++) {
    rocks.push(new Rock(random(width), height));
  }

  // 生成小魚 (增加數量以顯示群聚效果)
  for (let i = 0; i < 40; i++) {
    fishes.push(new Fish(random(width), random(height)));
  }
}

function draw() {
  // 設定半透明背景，讓後方的 iframe 網站可見
  clear();
  background(65, 90, 119, 255 * 0.2);

  // 1. 繪製水草 (畫在岩石後面)
  for (let s of seaweeds) {
    s.display();
  }

  // 2. 繪製岩石 (畫在水草上面，形成前景遮擋)
  for (let r of rocks) {
    r.display();
  }

  // 繪製小魚
  for (let f of fishes) {
    f.flock(fishes);
    f.update();
    f.display();
  }

  // 3. 氣泡效果 (隨機從岩石或水草位置產生)
  if (random() < 0.3) {
    let x = random(width);
    if (random() < 0.5 && rocks.length > 0) {
      let r = random(rocks); // 從岩石產生
      x = r.x + random(-30, 30);
    } else if (seaweeds.length > 0) {
      let s = random(seaweeds); // 從水草產生
      x = s.x + random(-20, 20);
    }
    bubbles.push(new Bubble(x, height));
  }

  // 更新並繪製所有氣泡
  for (let i = bubbles.length - 1; i >= 0; i--) {
    bubbles[i].update();
    bubbles[i].display();
    if (bubbles[i].isFinished()) {
      bubbles.splice(i, 1);
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

class Seaweed {
  constructor(x, y, h, w) {
    this.x = x;
    this.y = y; // 根部 Y 座標
    this.h = h;
    this.w = w; // 底部寬度
    this.noiseOffset = random(1000); // 隨機偏移，讓每根擺動不同步
    
    // 屬性：搖晃頻率 (每根水草擺動速度不同)
    this.swayFreq = random(0.005, 0.02);

    // 屬性：顏色 (產生隨機微調的漸層色盤)
    this.colors = [];
    let baseHexs = ['#132a13', '#31572c', '#4f772d', '#90a955', '#ecf39e'];
    for (let hex of baseHexs) {
      let c = color(hex);
      let r = constrain(red(c) + random(-20, 20), 0, 255);
      let g = constrain(green(c) + random(-20, 20), 0, 255);
      let b = constrain(blue(c) + random(-20, 20), 0, 255);
      this.colors.push(`rgb(${int(r)}, ${int(g)}, ${int(b)})`);
    }
  }

  // 計算偏移量：包含波動與滑鼠互動
  getXOff(y) {
    let progress = map(y, 0, this.h, 0, 1);
    // 加入 noiseOffset 讓波動錯開，並使用專屬的 swayFreq
    let wave = map(noise(frameCount * this.swayFreq + y * 0.005 + this.noiseOffset), 0, 1, -80, 80);
    
    // 互動：滑鼠靠近時產生推力
    let d = dist(mouseX, mouseY, this.x, this.y - y); // 距離計算改為相對於 this.y
    let push = 0;
    if (d < 300) { // 感應範圍
      let force = map(d, 0, 300, 150, 0); // 越近推力越強
      push = (mouseX > this.x) ? -force : force; // 反向推開
    }
    return (wave + push) * progress;
  }

  display() {
    // 設定線性漸層 (從底部往上)：132a13 -> 31572c -> 4f772d -> 90a955 -> ecf39e
    let gradient = drawingContext.createLinearGradient(0, this.y, 0, this.y - this.h);
    gradient.addColorStop(0.0, this.colors[0]);
    gradient.addColorStop(0.25, this.colors[1]);
    gradient.addColorStop(0.50, this.colors[2]);
    gradient.addColorStop(0.75, this.colors[3]);
    gradient.addColorStop(1.0, this.colors[4]);
    drawingContext.fillStyle = gradient; 
    noStroke();

    beginShape();
    // 1. 底部左側錨點
    curveVertex(this.x - this.w, this.y); 
    curveVertex(this.x - this.w, this.y);

    // 2. 左側線條
    for (let y = 0; y <= this.h; y += 15) {
      let yPos = this.y - y;
      let progress = map(y, 0, this.h, 0, 1);
      let xOff = this.getXOff(y);
      let w = map(progress, 0, 1, this.w, this.w * 0.5); // 寬度隨高度變化
      curveVertex(this.x + xOff - w, yPos);
    }

    // 3. 頂部圓弧控制點
    let topXOff = this.getXOff(this.h);
    curveVertex(this.x + topXOff, this.y - this.h - 40); 

    // 4. 右側線條
    for (let y = this.h; y >= 0; y -= 15) {
      let yPos = this.y - y;
      let progress = map(y, 0, this.h, 0, 1);
      let xOff = this.getXOff(y);
      let w = map(progress, 0, 1, this.w, this.w * 0.5);
      curveVertex(this.x + xOff + w, yPos);
    }

    // 5. 底部右側錨點
    curveVertex(this.x + this.w, this.y);
    curveVertex(this.x + this.w, this.y);
    endShape(CLOSE);

    // --- 加入紋理 (Texture) ---
    // 1. 中間的葉脈
    noFill();
    stroke(255, 40); 
    strokeWeight(3);
    beginShape();
    curveVertex(this.x, this.y); 
    for (let y = 0; y <= this.h; y += 15) {
      let xOff = this.getXOff(y);
      curveVertex(this.x + xOff, this.y - y);
    }
    curveVertex(this.x + topXOff, this.y - this.h - 40);
    endShape();

    // 2. 隨機斑點
    noStroke();
    fill(0, 40);
    for (let y = 20; y < this.h; y += 25) {
      let progress = map(y, 0, this.h, 0, 1);
      let xOff = this.getXOff(y);
      let w = map(progress, 0, 1, this.w, this.w * 0.5);
      circle(this.x + xOff - w * 0.5, this.y - y, map(progress, 0, 1, 12, 4));
      circle(this.x + xOff + w * 0.4, this.y - y - 12, map(progress, 0, 1, 8, 3));
    }
  }
}

class Rock {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = random(40, 90);
    this.h = random(20, 60);
    // 深灰藍色調，配合背景
    this.c = color(random(40, 60), random(50, 70), random(60, 80)); 
    this.seed = random(1000);
  }

  display() {
    fill(this.c);
    noStroke();
    
    // 1. 岩石主體
    beginShape();
    for (let a = 0; a <= 180; a += 20) {
      let rad = radians(a);
      let n = noise(this.seed + rad * 3); // 增加噪聲頻率讓岩石表面更粗糙
      let r = map(n, 0, 1, 0.7, 1.3);
      let x = this.x + cos(rad) * this.w * r;
      let y = this.y - sin(rad) * this.h * r;
      vertex(x, y);
    }
    endShape(CLOSE);
  }
}

class Bubble {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.baseSize = random(4, 8);
    this.speed = random(1, 3);
  }
  update() {
    this.y -= this.speed;
    this.x += random(-1, 1);
  }
  display() {
    let d = map(this.y, height, 0, this.baseSize, this.baseSize * 2.5);
    let a = map(this.y, height, 0, 200, 0);
    stroke(255, a);
    strokeWeight(1);
    noFill();
    circle(this.x, this.y, d);
  }
  isFinished() {
    return this.y < -50;
  }
}

class Fish {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.vel = p5.Vector.random2D(); // 隨機速度向量
    this.vel.setMag(random(2, 4));
    this.acc = createVector();
    this.maxForce = 0.2; // 最大轉向力
    this.maxSpeed = 4; // 最大速度

    this.size = random(15, 25);
    this.col = color(random(200, 255), random(100, 200), random(50, 100));
  }

  flock(boids) {
    let align = this.align(boids);
    let cohesion = this.cohesion(boids);
    let separation = this.separation(boids);

    align.mult(1.0);
    cohesion.mult(1.0);
    separation.mult(1.5); // 分離力權重較高，避免重疊

    this.applyForce(align);
    this.applyForce(cohesion);
    this.applyForce(separation);
  }

  applyForce(force) {
    this.acc.add(force);
  }

  // 對齊：轉向平均速度方向
  align(boids) {
    let perceptionRadius = 50;
    let steering = createVector();
    let total = 0;
    for (let other of boids) {
      let d = dist(this.pos.x, this.pos.y, other.pos.x, other.pos.y);
      if (other != this && d < perceptionRadius) {
        steering.add(other.vel);
        total++;
      }
    }
    if (total > 0) {
      steering.div(total);
      steering.setMag(this.maxSpeed);
      steering.sub(this.vel);
      steering.limit(this.maxForce);
    }
    return steering;
  }

  // 凝聚：轉向平均位置
  cohesion(boids) {
    let perceptionRadius = 50;
    let steering = createVector();
    let total = 0;
    for (let other of boids) {
      let d = dist(this.pos.x, this.pos.y, other.pos.x, other.pos.y);
      if (other != this && d < perceptionRadius) {
        steering.add(other.pos);
        total++;
      }
    }
    if (total > 0) {
      steering.div(total);
      steering.sub(this.pos);
      steering.setMag(this.maxSpeed);
      steering.sub(this.vel);
      steering.limit(this.maxForce);
    }
    return steering;
  }

  // 分離：避開擁擠
  separation(boids) {
    let perceptionRadius = 50;
    let steering = createVector();
    let total = 0;
    for (let other of boids) {
      let d = dist(this.pos.x, this.pos.y, other.pos.x, other.pos.y);
      if (other != this && d < perceptionRadius) {
        let diff = p5.Vector.sub(this.pos, other.pos);
        diff.div(d * d); // 距離越近排斥越大
        steering.add(diff);
        total++;
      }
    }
    if (total > 0) {
      steering.div(total);
      steering.setMag(this.maxSpeed);
      steering.sub(this.vel);
      steering.limit(this.maxForce);
    }
    return steering;
  }

  update() {
    this.pos.add(this.vel);
    this.vel.add(this.acc);
    this.vel.limit(this.maxSpeed);
    this.acc.mult(0);

    // 邊界環繞
    if (this.pos.x > width) this.pos.x = 0;
    else if (this.pos.x < 0) this.pos.x = width;
    if (this.pos.y > height) this.pos.y = 0;
    else if (this.pos.y < 0) this.pos.y = height;
  }
  display() {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.vel.heading()); // 旋轉魚身以朝向移動方向
    fill(this.col);
    noStroke();
    ellipse(0, 0, this.size * 1.5, this.size); // 魚身
    triangle(-this.size * 0.5, 0, -this.size, -this.size * 0.4, -this.size, this.size * 0.4); // 魚尾
    pop();
  }
}
