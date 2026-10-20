import { BLOCK_CONFIG, WORLD } from './constants';
import { SvgAssetCache } from './asset-cache';
import type { GameEntityView, GameSnapshot, Point } from './types';

export class GameCanvasRenderer {
  private readonly context: CanvasRenderingContext2D;
  private cssWidth: number = WORLD.width;
  private cssHeight: number = WORLD.height;
  private dpr = 1;
  private scale = 1;
  private offsetX = 0;
  private offsetY = 0;
  private disposed = false;

  constructor(private readonly canvas: HTMLCanvasElement, private readonly assets: SvgAssetCache) {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('2D canvas context is unavailable');
    this.context = context;
  }

  resize(cssWidth: number, cssHeight: number, devicePixelRatio: number): void {
    this.cssWidth = Math.max(1, cssWidth);
    this.cssHeight = Math.max(1, cssHeight);
    this.dpr = Math.max(1, devicePixelRatio || 1);
    this.scale = Math.min(this.cssWidth / WORLD.width, this.cssHeight / WORLD.height);
    this.offsetX = (this.cssWidth - WORLD.width * this.scale) / 2;
    this.offsetY = (this.cssHeight - WORLD.height * this.scale) / 2;
    this.canvas.width = Math.round(this.cssWidth * this.dpr);
    this.canvas.height = Math.round(this.cssHeight * this.dpr);
  }

  render(snapshot: GameSnapshot, sceneTime: number): void {
    if (this.disposed) return;
    const ctx = this.context;
    ctx.save();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.cssWidth, this.cssHeight);
    ctx.fillStyle = '#344653';
    ctx.fillRect(0, 0, this.cssWidth, this.cssHeight);
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);
    this.drawBackground(snapshot.stage, sceneTime);

    ctx.save();
    const shake = snapshot.state === 'LOST' || snapshot.state === 'WON' ? Math.sin(sceneTime / 24) * 2 : 0;
    ctx.translate(shake, 0);
    this.drawGround(snapshot.stage);
    snapshot.entities.forEach((entity) => this.drawEntityShadow(entity));
    this.drawProp('nest', WORLD.nest.x, WORLD.nest.y, 130, 80);
    this.drawSlingshotBase(WORLD.cannon.x, WORLD.cannon.y + 20);
    this.drawProp('slingshot', WORLD.cannon.x, WORLD.cannon.y + 20, 78, 136);
    this.drawAimGuide(snapshot);
    this.drawLoadedChick(snapshot);
    snapshot.entities.forEach((entity) => this.drawEntity(entity, snapshot.stage, sceneTime));
    ctx.restore();
    ctx.restore();
  }

  dispose(): void {
    this.disposed = true;
  }

  private drawBackground(stage: GameSnapshot['stage'], sceneTime: number): void {
    const ctx = this.context;
    ctx.save();
    switch (stage) {
      case 1: this.drawChapterOneBackground(); break;
      case 2: this.drawChapterTwoBackground(); break;
      case 3: this.drawChapterThreeBackground(); break;
      case 4: this.drawChapterFourBackground(sceneTime); break;
    }
    ctx.restore();
  }

  private drawChapterOneBackground(): void {
    const ctx = this.context;
    const sky = ctx.createLinearGradient(0, 0, 0, 470);
    sky.addColorStop(0, '#a0d8ef');
    sky.addColorStop(1, '#e0f4ff');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    this.drawCloud(160, 150, 1.1);
    this.drawCloud(545, 105, 0.78);
    this.drawCloud(1010, 180, 1.25);

    ctx.fillStyle = '#be5144';
    ctx.fillRect(0, 430, WORLD.width, 235);
    ctx.fillStyle = '#d36a55';
    for (let row = 0; row < 6; row += 1) {
      const offset = row % 2 === 0 ? 0 : 34;
      for (let x = -34 + offset; x < WORLD.width; x += 68) {
        ctx.fillRect(x + 3, 438 + row * 37, 58, 27);
        ctx.fillStyle = 'rgba(255, 202, 142, .2)';
        ctx.fillRect(x + 5, 440 + row * 37, 54, 3);
        ctx.fillStyle = '#d36a55';
      }
    }
    ctx.fillStyle = '#8e3e3b';
    for (const x of [95, 1180]) {
      ctx.fillRect(x - 8, 215, 16, 290);
      ctx.fillRect(x - 24, 215, 48, 14);
      ctx.fillStyle = '#e18a62';
      ctx.fillRect(x - 5, 226, 4, 260);
      ctx.fillStyle = '#8e3e3b';
    }
    ctx.strokeStyle = '#465567';
    ctx.lineWidth = 4;
    for (const y of [247, 265, 283]) {
      ctx.beginPath();
      ctx.moveTo(95, y);
      ctx.quadraticCurveTo(640, y + 22, 1180, y);
      ctx.stroke();
    }
    ctx.fillStyle = '#f7df9b';
    ctx.beginPath();
    ctx.arc(1070, 125, 50, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawChapterTwoBackground(): void {
    const ctx = this.context;
    const sky = ctx.createLinearGradient(0, 0, 0, 670);
    sky.addColorStop(0, '#ff7e5f');
    sky.addColorStop(0.58, '#feb47b');
    sky.addColorStop(1, '#ffeccc');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    ctx.fillStyle = 'rgba(255, 235, 189, .82)';
    ctx.beginPath();
    ctx.arc(1010, 170, 64, 0, Math.PI * 2);
    ctx.fill();

    const buildings = [
      { x: 15, y: 298, w: 172, h: 265 }, { x: 205, y: 365, w: 142, h: 198 },
      { x: 366, y: 250, w: 195, h: 313 }, { x: 585, y: 335, w: 164, h: 228 },
      { x: 772, y: 276, w: 184, h: 287 }, { x: 976, y: 345, w: 128, h: 218 },
      { x: 1124, y: 230, w: 146, h: 333 },
    ];
    ctx.fillStyle = '#70516c';
    for (const [index, building] of buildings.entries()) {
      ctx.fillRect(building.x, building.y, building.w, building.h);
      ctx.fillStyle = '#9a6780';
      ctx.fillRect(building.x - 4, building.y, building.w + 8, 8);
      for (let row = 0; row < 5; row += 1) {
        for (let col = 0; col < Math.floor(building.w / 34); col += 1) {
          ctx.fillStyle = (row + col + index) % 3 === 0 ? '#ffe7a3' : '#f1b876';
          ctx.fillRect(building.x + 14 + col * 34, building.y + 22 + row * 42, 11, 16);
        }
      }
      ctx.fillStyle = '#70516c';
    }
    // Fixed rooftop water tank and laundry line.
    ctx.fillStyle = '#416e7c';
    ctx.fillRect(690, 320, 82, 51);
    ctx.beginPath();
    ctx.ellipse(731, 320, 41, 12, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(700, 370, 8, 53);
    ctx.fillRect(754, 370, 8, 53);
    ctx.strokeStyle = '#584761';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(835, 318);
    ctx.quadraticCurveTo(960, 350, 1090, 316);
    ctx.stroke();
    for (const [index, color] of ['#f06d67', '#ffe3a1', '#8bd0c0'].entries()) {
      const x = 858 + index * 48;
      ctx.fillStyle = color;
      ctx.fillRect(x, 328 + index * 2, 29, 43);
      ctx.fillStyle = 'rgba(255,255,255,.48)';
      ctx.fillRect(x + 4, 331 + index * 2, 4, 35);
    }
  }

  private drawChapterThreeBackground(): void {
    const ctx = this.context;
    const sky = ctx.createLinearGradient(0, 0, 0, WORLD.height);
    sky.addColorStop(0, '#2b1055');
    sky.addColorStop(1, '#7597de');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    const moonGlow = ctx.createRadialGradient(1000, 170, 22, 1000, 170, 140);
    moonGlow.addColorStop(0, 'rgba(221, 235, 255, .9)');
    moonGlow.addColorStop(0.45, 'rgba(170, 194, 255, .38)');
    moonGlow.addColorStop(1, 'rgba(154, 174, 255, 0)');
    ctx.fillStyle = moonGlow;
    ctx.beginPath();
    ctx.arc(1000, 170, 140, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e0e9ff';
    ctx.beginPath();
    ctx.arc(1000, 170, 58, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#45356f';
    ctx.fillRect(0, 455, WORLD.width, 225);
    ctx.fillStyle = '#64458a';
    for (let x = 0; x < WORLD.width; x += 190) {
      ctx.fillRect(x + 24, 356 + (x % 3) * 16, 98, 110);
      ctx.fillRect(x + 14, 346 + (x % 3) * 16, 118, 14);
    }
    ctx.fillStyle = '#392d5f';
    ctx.fillRect(265, 290, 43, 166);
    ctx.fillRect(260, 280, 53, 14);
    ctx.fillRect(845, 330, 38, 126);
    ctx.fillRect(840, 320, 48, 14);
    this.drawGear(435, 365, 62, 12);
    this.drawGear(1090, 395, 46, 10);
    ctx.strokeStyle = '#47c3d0';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, 456);
    ctx.lineTo(WORLD.width, 456);
    ctx.stroke();
  }

  private drawChapterFourBackground(sceneTime: number): void {
    const ctx = this.context;
    const sky = ctx.createLinearGradient(0, 0, 0, WORLD.height);
    sky.addColorStop(0, '#f6d365');
    sky.addColorStop(0.62, '#fda085');
    sky.addColorStop(1, '#d8f0b0');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    ctx.fillStyle = '#fff0af';
    ctx.beginPath();
    ctx.arc(1055, 142, 58, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineWidth = 22;
    for (const [index, color] of ['#ed6e62', '#f6c85f', '#72bf9b', '#7198d5'].entries()) {
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.arc(650, 470, 182 - index * 21, Math.PI, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = '#92cf8b';
    ctx.beginPath();
    ctx.ellipse(330, 670, 530, 155, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#69b982';
    ctx.beginPath();
    ctx.ellipse(1000, 682, 490, 142, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    this.drawFestivalParticles(sceneTime);
  }

  private drawCloud(x: number, y: number, scale: number): void {
    const ctx = this.context;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,.88)';
    ctx.beginPath();
    ctx.ellipse(x, y, 53 * scale, 22 * scale, 0, 0, Math.PI * 2);
    ctx.ellipse(x - 27 * scale, y - 8 * scale, 26 * scale, 24 * scale, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 4 * scale, y - 17 * scale, 31 * scale, 30 * scale, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 34 * scale, y - 7 * scale, 24 * scale, 22 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawGear(x: number, y: number, radius: number, teeth: number): void {
    const ctx = this.context;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#db7b58';
    ctx.strokeStyle = '#f5b474';
    ctx.lineWidth = 5;
    ctx.beginPath();
    for (let tooth = 0; tooth < teeth * 2; tooth += 1) {
      const angle = (tooth * Math.PI) / teeth;
      const r = tooth % 2 === 0 ? radius : radius * 0.76;
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      if (tooth === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#48336f';
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawFestivalParticles(sceneTime: number): void {
    const ctx = this.context;
    ctx.save();
    for (let index = 0; index < 14; index += 1) {
      const cycle = (sceneTime / (4200 + index * 170) + index * 0.137) % 1;
      const x = (82 + index * 89 + Math.sin(sceneTime / 1150 + index * 1.7) * 18) % WORLD.width;
      const y = 285 + ((index * 41 + cycle * 215) % 300);
      ctx.globalAlpha = 0.55 + Math.sin(cycle * Math.PI) * 0.35;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.sin(cycle * Math.PI * 2 + index) * 0.65);
      if (index < 8) {
        ctx.fillStyle = ['#fff4a6', '#fff9d6', '#fbd1a5'][index % 3];
        ctx.beginPath();
        ctx.ellipse(0, 0, 4 + (index % 3), 2.5 + (index % 2), 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.strokeStyle = index % 2 === 0 ? '#fff4d6' : '#e9b96b';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(-3, -8);
        ctx.quadraticCurveTo(6, 0, 0, 9);
        ctx.moveTo(0, 8);
        ctx.lineTo(0, -7);
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
  }

  private drawGround(stage: GameSnapshot['stage']): void {
    const ctx = this.context;
    ctx.save();
    if (stage === 1) {
      ctx.fillStyle = '#444b55';
      ctx.fillRect(0, 682, WORLD.width, 38);
      ctx.fillStyle = '#8b9297';
      ctx.fillRect(0, 682, WORLD.width, 5);
      ctx.fillStyle = '#f6d16b';
      for (let x = 36; x < WORLD.width; x += 180) ctx.fillRect(x, 703, 78, 5);
    } else if (stage === 2) {
      ctx.fillStyle = '#47a9a2';
      ctx.fillRect(0, 682, WORLD.width, 38);
      ctx.fillStyle = '#f58b72';
      ctx.fillRect(0, 682, WORLD.width, 6);
      ctx.fillStyle = 'rgba(255,235,195,.72)';
      for (let x = 35; x < WORLD.width; x += 220) ctx.fillRect(x, 695, 95, 4);
    } else if (stage === 3) {
      ctx.fillStyle = '#47356f';
      ctx.fillRect(0, 682, WORLD.width, 38);
      ctx.fillStyle = '#38b6c8';
      ctx.fillRect(0, 682, WORLD.width, 5);
      ctx.strokeStyle = 'rgba(192,170,255,.72)';
      ctx.lineWidth = 2;
      for (let x = 40; x < WORLD.width; x += 145) {
        ctx.beginPath();
        ctx.arc(x, 695, 3, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = '#6cb879';
      ctx.fillRect(0, 682, WORLD.width, 38);
      ctx.fillStyle = '#b8df89';
      ctx.fillRect(0, 682, WORLD.width, 7);
      ctx.fillStyle = '#b77a54';
      ctx.fillRect(0, 708, WORLD.width, 12);
    }
    ctx.restore();
  }

  private drawProp(id: 'nest' | 'slingshot', x: number, y: number, width: number, height: number): void {
    const ctx = this.context;
    const image = this.assets.get(id);
    if (image) {
      ctx.drawImage(image, x - width / 2, y - height / 2, width, height);
    } else if (id === 'nest') {
      ctx.fillStyle = '#b5814e';
      ctx.beginPath();
      ctx.ellipse(x, y, width / 2, height / 3, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.strokeStyle = '#40271c';
      ctx.lineWidth = 24;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - 20, y + height / 2);
      ctx.lineTo(x - 12, y - height / 2);
      ctx.quadraticCurveTo(x, y - height / 2 - 12, x + 15, y - height / 2);
      ctx.lineTo(x + 25, y + height / 2);
      ctx.stroke();
      ctx.fillStyle = '#c86648';
      ctx.strokeStyle = '#713b32';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(x, y - height / 2 + 3, 15, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  private drawSlingshotBase(x: number, y: number): void {
    const ctx = this.context;
    ctx.fillStyle = '#8b532f';
    ctx.beginPath();
    ctx.ellipse(x, y + 57, 35, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#b8e276';
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + side * 27, y + 55);
      ctx.quadraticCurveTo(x + side * 35, y + 39, x + side * 38, y + 54);
      ctx.quadraticCurveTo(x + side * 34, y + 61, x + side * 27, y + 55);
      ctx.fill();
    }
  }

  private drawAimGuide(snapshot: GameSnapshot): void {
    if (!snapshot.aimPosition) return;
    const ctx = this.context;
    const dx = WORLD.cannon.x - snapshot.aimPosition.x;
    const dy = WORLD.cannon.y - snapshot.aimPosition.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 15) return;
    const power = (Math.min(distance, WORLD.maxDrag) / WORLD.maxDrag) *
      (snapshot.stage === 4 ? 31 : snapshot.stage === 3 ? 28 : 26);
    const angle = Math.atan2(dy, dx);
    const vx = Math.cos(angle) * power;
    const vy = Math.sin(angle) * power;
    const ctxPoint = (point: Point) => point;
    ctx.save();
    ctx.setLineDash([3, 11]);
    ctx.fillStyle = 'rgba(255,255,255,.84)';
    for (let frame = 3; frame <= 55; frame += 5) {
      const point = ctxPoint({
        x: WORLD.cannon.x + vx * frame,
        y: WORLD.cannon.y + vy * frame + 0.5 * WORLD.gravityY * frame * frame,
      });
      if (point.x < 0 || point.x > WORLD.width || point.y > WORLD.height) break;
      ctx.beginPath();
      ctx.arc(point.x, point.y, Math.max(2, 5 - frame / 18), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(255,255,255,.82)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(WORLD.cannon.x, WORLD.cannon.y);
    ctx.lineTo(snapshot.aimPosition.x, snapshot.aimPosition.y);
    ctx.stroke();
    ctx.restore();
  }

  private drawLoadedChick(snapshot: GameSnapshot): void {
    if (snapshot.state !== 'AIMING' || snapshot.ammo <= 0) return;
    const position = snapshot.aimPosition ?? WORLD.cannon;
    this.drawSprite({
      id: -1,
      kind: 'chick',
      x: position.x,
      y: position.y,
      radius: snapshot.form.radius,
      angle: 0,
      alive: true,
    }, snapshot.stage);
  }

  private drawEntityShadow(entity: GameEntityView): void {
    if (!entity.alive || !['cat', 'block', 'chick', 'egg', 'boulder'].includes(entity.kind)) return;
    const ctx = this.context;
    const width = entity.width ?? (entity.radius ?? 24) * 2;
    const height = entity.height ?? (entity.radius ?? 24) * 2;
    const shadowY = Math.min(WORLD.height - 8, entity.y + height * 0.5 + 7);
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.ellipse(entity.x + 5, shadowY, Math.max(9, width * 0.45), Math.max(4, Math.min(14, height * 0.12)), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawEntity(entity: GameEntityView, stage: GameSnapshot['stage'], nowMs: number): void {
    if (!entity.alive) return;
    const ctx = this.context;
    if (entity.kind === 'fan') {
      this.drawFan(entity, nowMs);
      return;
    }
    if (entity.kind === 'cat' || entity.kind === 'egg' || entity.kind === 'chick') {
      this.drawSprite(entity, stage);
      return;
    }
    if (entity.kind === 'shutter') this.drawShutterSupport(entity);
    ctx.save();
    ctx.translate(entity.x, entity.y);
    ctx.rotate(entity.angle);
    if (entity.kind === 'block') this.drawBlock(entity);
    else if (entity.kind === 'shutter') this.drawShutter(entity);
    else if (entity.kind === 'trampoline') this.drawTrampoline(entity);
    else if (entity.kind === 'boulder') this.drawBoulder(entity);
    ctx.restore();
  }

  private drawShutterSupport(entity: GameEntityView): void {
    const ctx = this.context;
    const beamY = 170;
    const beamWidth = 100;
    const top = entity.y - (entity.height ?? 140) / 2;
    ctx.save();
    ctx.fillStyle = '#28667a';
    ctx.strokeStyle = '#123e58';
    ctx.lineWidth = 3;
    ctx.fillRect(entity.x - beamWidth / 2, beamY, beamWidth, 16);
    ctx.strokeRect(entity.x - beamWidth / 2, beamY, beamWidth, 16);
    for (const side of [-1, 1]) {
      ctx.fillRect(entity.x + side * 39 - 5, beamY + 16, 10, 12);
      ctx.beginPath();
      ctx.arc(entity.x + side * 39, beamY + 8, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#f5d17b';
      ctx.fill();
    }
    ctx.strokeStyle = '#596c78';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(entity.x, beamY + 16);
    ctx.lineTo(entity.x, beamY + 22);
    ctx.stroke();
    ctx.fillStyle = '#f2b84b';
    ctx.strokeStyle = '#7d542b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(entity.x, beamY + 30, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#586671';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(entity.x, beamY + 39);
    ctx.lineTo(entity.x, top);
    ctx.stroke();
    ctx.restore();
  }

  private drawSprite(entity: GameEntityView, stage: GameSnapshot['stage']): void {
    const ctx = this.context;
    const radius = entity.radius ?? 24;
    const width = radius * 2.8;
    const height = radius * 2.8;
    let id: Parameters<SvgAssetCache['get']>[0];
    if (entity.kind === 'chick') id = `chick-${stage}`;
    else if (entity.kind === 'egg') id = 'egg';
    else id = entity.boss ? 'cat-boss' : entity.shield ? 'cat-shield' : 'cat-normal';
    const image = this.assets.get(id);
    ctx.save();
    ctx.translate(entity.x, entity.y);
    ctx.rotate(entity.angle);
    if (image) {
      ctx.drawImage(image, -width / 2, -height / 2, width, height);
    } else {
      ctx.fillStyle = entity.kind === 'chick' ? '#f4c84f' : entity.kind === 'egg' ? '#f8f3e6' : '#817a7d';
      ctx.strokeStyle = '#4b4039';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#342a27';
      ctx.beginPath();
      ctx.arc(-radius * 0.35, -radius * 0.12, Math.max(2, radius * 0.12), 0, Math.PI * 2);
      ctx.arc(radius * 0.35, -radius * 0.12, Math.max(2, radius * 0.12), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawBlock(entity: GameEntityView): void {
    const ctx = this.context;
    const baseWidth = entity.width ?? 24;
    const baseHeight = entity.height ?? 24;
    const width = baseWidth + Math.min(8, baseWidth * 0.12);
    const height = baseHeight + Math.min(6, baseHeight * 0.08);
    const material = entity.material ?? 'wood';
    const config = BLOCK_CONFIG[material];
    const gradient = ctx.createLinearGradient(-width / 2, -height / 2, width / 2, height / 2);
    if (material === 'wood') {
      gradient.addColorStop(0, '#ffe0a0');
      gradient.addColorStop(0.3, config.fill);
      gradient.addColorStop(0.76, '#9d4a20');
      gradient.addColorStop(1, '#67341f');
    } else if (material === 'stone') {
      gradient.addColorStop(0, '#164e68');
      gradient.addColorStop(0.28, '#b9edf1');
      gradient.addColorStop(0.55, '#469bb8');
      gradient.addColorStop(0.82, '#d8fbf2');
      gradient.addColorStop(1, config.stroke);
    } else {
      gradient.addColorStop(0, config.fill);
      gradient.addColorStop(1, config.stroke);
    }
    ctx.fillStyle = gradient;
    ctx.strokeStyle = config.stroke;
    ctx.lineWidth = 4;
    ctx.shadowColor = 'rgba(37, 35, 31, .24)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.roundRect(-width / 2, -height / 2, width, height, 4);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    if (material === 'wood') {
      ctx.save();
      ctx.beginPath();
      ctx.rect(-width / 2 + 2, -height / 2 + 2, width - 4, height - 4);
      ctx.clip();
      ctx.strokeStyle = 'rgba(255, 231, 178, .55)';
      ctx.lineWidth = Math.max(1, Math.min(2.5, width * 0.06));
      ctx.beginPath();
      for (let index = -1; index <= 1; index += 1) {
        const y = index * height * 0.24;
        ctx.moveTo(-width / 2 - 3, y);
        ctx.bezierCurveTo(-width * 0.18, y - 3, width * 0.12, y + 4, width / 2 + 3, y - 1);
      }
      ctx.stroke();
      ctx.strokeStyle = 'rgba(88, 43, 23, .52)';
      ctx.lineWidth = Math.max(1, Math.min(2.5, width * 0.055));
      ctx.beginPath();
      ctx.ellipse(-width * 0.16, height * 0.1, Math.max(2.5, Math.min(6, width * 0.16)), Math.max(4, Math.min(11, height * 0.12)), -0.25, 0, Math.PI * 2);
      ctx.ellipse(-width * 0.16, height * 0.1, Math.max(1, Math.min(3, width * 0.08)), Math.max(2, Math.min(6, height * 0.06)), -0.25, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = 'rgba(255, 239, 196, .9)';
      ctx.lineWidth = Math.max(1.5, Math.min(3, width * 0.08));
      ctx.beginPath();
      ctx.moveTo(-width / 2 + 4, -height / 2 + 2);
      ctx.lineTo(width / 2 - 4, -height / 2 + 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(65, 31, 19, .58)';
      ctx.lineWidth = Math.max(2, Math.min(4, height * 0.04));
      ctx.beginPath();
      ctx.moveTo(-width / 2 + 3, height / 2 - 2);
      ctx.lineTo(width / 2 - 3, height / 2 - 2);
      ctx.stroke();
    } else if (material === 'stone') {
      ctx.save();
      ctx.strokeStyle = 'rgba(235, 241, 235, .5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-width / 2 + 4, -height / 2 + 3);
      ctx.lineTo(width / 2 - 4, -height / 2 + 3);
      ctx.moveTo(-width / 2 + 3, -height / 2 + 4);
      ctx.lineTo(-width / 2 + 3, height / 2 - 4);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(25, 34, 40, .55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-width / 2 + 3, height / 2 - 3);
      ctx.lineTo(width / 2 - 3, height / 2 - 3);
      ctx.moveTo(width / 2 - 3, -height / 2 + 3);
      ctx.lineTo(width / 2 - 3, height / 2 - 3);
      ctx.stroke();
      const boltRadius = Math.max(2, Math.min(4, Math.min(width, height) * 0.12));
      for (const bx of [-1, 1]) {
        for (const by of [-1, 1]) {
          const boltX = bx * (width / 2 - boltRadius - 3);
          const boltY = by * (height / 2 - boltRadius - 3);
          const bolt = ctx.createRadialGradient(boltX - 1, boltY - 1, 0, boltX, boltY, boltRadius * 1.5);
          bolt.addColorStop(0, '#f4f2df');
          bolt.addColorStop(0.4, '#87949a');
          bolt.addColorStop(1, '#34434c');
          ctx.fillStyle = bolt;
          ctx.beginPath();
          ctx.arc(boltX, boltY, boltRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    } else if (material === 'glass') {
      ctx.fillStyle = 'rgba(255,255,255,.48)';
      ctx.fillRect(-width / 2 + 4, -height / 2 + 4, Math.max(2, width * 0.18), height - 8);
    } else if (material === 'tnt') {
      ctx.fillStyle = '#fff3d0';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('TNT', 0, 0);
    }
  }

  private drawShutter(entity: GameEntityView): void {
    const ctx = this.context;
    const width = entity.width ?? 24;
    const height = entity.height ?? 140;
    const metal = ctx.createLinearGradient(-width / 2, 0, width / 2, 0);
    metal.addColorStop(0, '#26343d');
    metal.addColorStop(0.32, '#b6c1c1');
    metal.addColorStop(0.65, '#596b74');
    metal.addColorStop(1, '#d2d5cd');
    ctx.fillStyle = metal;
    ctx.strokeStyle = '#d7e1e7';
    ctx.lineWidth = 3;
    ctx.fillRect(-width / 2, -height / 2, width, height);
    ctx.strokeRect(-width / 2, -height / 2, width, height);
    ctx.strokeStyle = 'rgba(255,255,255,.6)';
    for (let y = -height / 2 + 12; y < height / 2; y += 24) {
      ctx.beginPath();
      ctx.moveTo(-width / 2 + 4, y);
      ctx.lineTo(width / 2 - 4, y);
      ctx.stroke();
    }
    for (const y of [-height / 2 + 8, height / 2 - 8]) {
      for (const x of [-width / 2 + 7, width / 2 - 7]) {
        ctx.fillStyle = '#d1d2c6';
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private drawTrampoline(entity: GameEntityView): void {
    const ctx = this.context;
    ctx.fillStyle = '#ee7e73';
    ctx.strokeStyle = '#80423e';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(-((entity.width ?? 110) / 2), -((entity.height ?? 25) / 2), entity.width ?? 110, entity.height ?? 25, 12);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#ffe3ac';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-28, 0);
    ctx.lineTo(-12, -6);
    ctx.lineTo(5, 0);
    ctx.lineTo(20, -6);
    ctx.stroke();
  }

  private drawBoulder(entity: GameEntityView): void {
    const ctx = this.context;
    const radius = entity.radius ?? 28;
    ctx.fillStyle = '#747b7b';
    ctx.strokeStyle = '#40484a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(245,241,217,.42)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-radius * 0.5, -radius * 0.35);
    ctx.lineTo(-radius * 0.1, -radius * 0.05);
    ctx.lineTo(-radius * 0.22, radius * 0.42);
    ctx.moveTo(radius * 0.42, -radius * 0.15);
    ctx.lineTo(radius * 0.1, radius * 0.12);
    ctx.stroke();
  }

  private drawFan(entity: GameEntityView, nowMs: number): void {
    const ctx = this.context;
    ctx.save();
    ctx.fillStyle = 'rgba(134, 220, 235, .12)';
    ctx.fillRect(entity.x - (entity.width ?? 0) / 2, entity.y - (entity.height ?? 0) / 2, entity.width ?? 0, entity.height ?? 0);
    ctx.strokeStyle = 'rgba(226,250,255,.5)';
    ctx.setLineDash([9, 13]);
    ctx.lineWidth = 3;
    const offset = (nowMs / 35) % 22;
    for (let y = entity.y - (entity.height ?? 0) / 2 + offset; y < entity.y + (entity.height ?? 0) / 2; y += 28) {
      ctx.beginPath();
      ctx.moveTo(entity.x - (entity.width ?? 0) / 2, y);
      ctx.lineTo(entity.x + (entity.width ?? 0) / 2, y - 18);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();
  }
}
