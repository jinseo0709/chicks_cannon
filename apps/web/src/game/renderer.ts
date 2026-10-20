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
    this.drawGround();
    snapshot.entities.forEach((entity) => this.drawEntityShadow(entity));
    this.drawProp('nest', WORLD.nest.x, WORLD.nest.y, 180, 110);
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
    const palettes = {
      1: ['#76b8df', '#f4c590'],
      2: ['#647f9c', '#d5a995'],
      3: ['#e98a68', '#f4c28b'],
      4: ['#645c91', '#e8a778'],
    } satisfies Record<GameSnapshot['stage'], [string, string]>;
    ctx.save();
    const sky = ctx.createLinearGradient(0, 0, 0, WORLD.height);
    sky.addColorStop(0, palettes[stage][0]);
    sky.addColorStop(0.72, palettes[stage][1]);
    sky.addColorStop(1, '#dfb28a');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    this.drawSunGlow(sceneTime);
    this.drawFarLayer(stage, sceneTime);
    this.drawMidLayer(stage, sceneTime);
    this.drawNearLayer(sceneTime);
    this.drawAnimatedParticles(stage, sceneTime);
    ctx.restore();
  }

  private drawSunGlow(sceneTime: number): void {
    const ctx = this.context;
    const x = 1000 + Math.sin(sceneTime / 18000) * 12;
    const y = 168;
    ctx.save();
    ctx.shadowColor = 'rgba(255, 220, 151, .72)';
    ctx.shadowBlur = 34;
    const glow = ctx.createRadialGradient(x, y, 10, x, y, 150);
    glow.addColorStop(0, 'rgba(255, 241, 191, .92)');
    glow.addColorStop(0.48, 'rgba(255, 205, 139, .5)');
    glow.addColorStop(1, 'rgba(255, 191, 135, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, 150, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255, 225, 166, .92)';
    ctx.beginPath();
    ctx.arc(x, y, 68, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawFarLayer(stage: GameSnapshot['stage'], sceneTime: number): void {
    const ctx = this.context;
    const drift = (sceneTime * 0.08) % WORLD.width;
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = stage === 4 ? '#4b526d' : '#657984';
    const buildings = [
      { x: 24, w: 118, h: 112 }, { x: 168, w: 164, h: 176 }, { x: 365, w: 122, h: 136 },
      { x: 520, w: 194, h: 204 }, { x: 748, w: 126, h: 147 }, { x: 905, w: 176, h: 188 },
      { x: 1110, w: 142, h: 126 },
    ];
    for (const building of buildings) {
      const x = ((building.x - drift + WORLD.width * 2) % WORLD.width) - 25;
      const top = 470 - building.h;
      ctx.fillRect(x, top, building.w, building.h);
      ctx.fillStyle = 'rgba(255, 221, 163, .38)';
      for (let row = 0; row < Math.floor(building.h / 34); row += 1) {
        for (let col = 0; col < Math.floor(building.w / 30); col += 1) {
          ctx.fillRect(x + 12 + col * 30, top + 18 + row * 34, 7, 10);
        }
      }
      ctx.fillStyle = stage === 4 ? '#4b526d' : '#657984';
    }
    const haze = ctx.createLinearGradient(0, 370, 0, 535);
    haze.addColorStop(0, 'rgba(255, 230, 193, 0)');
    haze.addColorStop(1, 'rgba(255, 226, 187, .52)');
    ctx.fillStyle = haze;
    ctx.fillRect(0, 370, WORLD.width, 165);
    ctx.restore();
  }

  private drawMidLayer(stage: GameSnapshot['stage'], sceneTime: number): void {
    const ctx = this.context;
    const drift = (sceneTime * 0.22) % 180;
    ctx.save();
    ctx.fillStyle = stage === 4 ? '#545568' : '#77766f';
    ctx.fillRect(-drift, 520, WORLD.width + 180, 118);
    ctx.fillStyle = stage === 4 ? '#444858' : '#646860';
    for (let x = -drift; x < WORLD.width + 140; x += 220) {
      ctx.fillRect(x + 34, 430, 58, 90);
      ctx.fillRect(x + 26, 420, 74, 12);
    }
    // Chimneys and fixed-seed smoke puffs.
    for (const [chimneyIndex, x] of [280, 862].entries()) {
      ctx.fillStyle = '#705648';
      ctx.fillRect(x, 378, 22, 72);
      ctx.fillStyle = '#4b4140';
      ctx.fillRect(x - 4, 375, 30, 8);
      for (let puff = 0; puff < 3; puff += 1) {
        const phase = ((sceneTime / 1250 + puff * 0.34 + chimneyIndex * 0.27) % 1);
        const px = x + 10 + Math.sin(phase * Math.PI * 2 + puff) * (5 + phase * 8);
        const py = 366 - phase * 58 - puff * 7;
        ctx.globalAlpha = 0.23 * (1 - phase);
        ctx.fillStyle = '#f7eee1';
        ctx.beginPath();
        ctx.arc(px, py, 7 + phase * 9, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    // Rooftop water tank.
    ctx.fillStyle = '#687981';
    ctx.fillRect(700, 386, 76, 48);
    ctx.beginPath();
    ctx.ellipse(738, 386, 38, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#899a99';
    ctx.fillRect(707, 433, 7, 44);
    ctx.fillRect(762, 433, 7, 44);
    // Laundry line and cloth.
    ctx.strokeStyle = 'rgba(55, 58, 58, .72)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(930, 410);
    ctx.quadraticCurveTo(1010, 426, 1090, 407);
    ctx.stroke();
    for (const [index, color] of ['#d98b69', '#e9d4a2', '#8eb7b0'].entries()) {
      const x = 953 + index * 42;
      ctx.fillStyle = color;
      ctx.fillRect(x, 414 + index * 3, 25, 32);
      ctx.fillStyle = 'rgba(255,255,255,.42)';
      ctx.fillRect(x + 4, 417 + index * 3, 4, 25);
    }
    ctx.restore();
  }

  private drawNearLayer(sceneTime: number): void {
    const ctx = this.context;
    const drift = (sceneTime * 0.45) % 54;
    ctx.save();
    const rust = ctx.createLinearGradient(0, 536, 0, 594);
    rust.addColorStop(0, '#a85d3a');
    rust.addColorStop(0.42, '#46534f');
    rust.addColorStop(1, '#303d3d');
    ctx.fillStyle = rust;
    for (const y of [542, 582, 622]) ctx.fillRect(0, y, WORLD.width, 9);
    ctx.fillRect(0, 542, 8, 96);
    for (let x = -drift; x < WORLD.width; x += 54) {
      ctx.fillStyle = '#46534f';
      ctx.fillRect(x, 542, 7, 96);
      ctx.fillStyle = '#c17b52';
      ctx.beginPath();
      ctx.arc(x + 3.5, 546.5, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + 3.5, 586.5, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawAnimatedParticles(stage: GameSnapshot['stage'], sceneTime: number): void {
    const ctx = this.context;
    ctx.save();
    // Three distant birds glide on deterministic, looping paths.
    ctx.strokeStyle = stage === 4 ? 'rgba(61, 53, 75, .62)' : 'rgba(67, 75, 73, .58)';
    ctx.lineWidth = 2.5;
    for (let index = 0; index < 3; index += 1) {
      const x = ((150 + index * 360 + sceneTime * (0.018 + index * 0.003)) % (WORLD.width + 90)) - 45;
      const y = 210 + index * 38 + Math.sin(sceneTime / 900 + index * 2) * 9;
      ctx.beginPath();
      ctx.moveTo(x - 10, y);
      ctx.quadraticCurveTo(x - 4, y - 7, x, y);
      ctx.quadraticCurveTo(x + 5, y - 7, x + 11, y - 1);
      ctx.stroke();
    }
    // Dust and rooftop glints use fixed index-based seeds, never frame randomness.
    for (let index = 0; index < 8; index += 1) {
      const phase = (sceneTime / (3200 + index * 170) + index * 0.137) % 1;
      const x = (index * 173 + Math.sin(phase * Math.PI * 2 + index) * 24 + WORLD.width) % WORLD.width;
      const y = 345 + ((index * 47 + phase * 125) % 145);
      ctx.globalAlpha = 0.12 + 0.22 * (0.5 + 0.5 * Math.sin(phase * Math.PI * 2));
      ctx.fillStyle = '#fff4d4';
      ctx.beginPath();
      ctx.arc(x, y, 1.5 + (index % 3) * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let index = 0; index < 6; index += 1) {
      const x = 80 + index * 212;
      const y = 318 + Math.sin(sceneTime / 460 + index * 1.8) * 17;
      const alpha = 0.24 + 0.45 * (0.5 + 0.5 * Math.sin(sceneTime / 330 + index * 2));
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#fff1c5';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x - 4, y);
      ctx.lineTo(x + 4, y);
      ctx.moveTo(x, y - 4);
      ctx.lineTo(x, y + 4);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawGround(): void {
    const ctx = this.context;
    ctx.fillStyle = '#8d6848';
    ctx.fillRect(0, 692, WORLD.width, 28);
    ctx.fillStyle = '#6e995c';
    ctx.fillRect(0, 682, WORLD.width, 12);
    ctx.fillStyle = 'rgba(56, 70, 66, .16)';
    ctx.fillRect(0, 692, WORLD.width, 4);
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
      ctx.strokeStyle = '#714627';
      ctx.lineWidth = 13;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - 20, y + height / 2);
      ctx.lineTo(x - 12, y - height / 2);
      ctx.quadraticCurveTo(x, y - height / 2 - 12, x + 15, y - height / 2);
      ctx.lineTo(x + 25, y + height / 2);
      ctx.stroke();
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
    ctx.save();
    ctx.translate(entity.x, entity.y);
    ctx.rotate(entity.angle);
    if (entity.kind === 'block') this.drawBlock(entity);
    else if (entity.kind === 'shutter') this.drawShutter(entity);
    else if (entity.kind === 'trampoline') this.drawTrampoline(entity);
    else if (entity.kind === 'boulder') this.drawBoulder(entity);
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
    const width = entity.width ?? 24;
    const height = entity.height ?? 24;
    const material = entity.material ?? 'wood';
    const config = BLOCK_CONFIG[material];
    const gradient = ctx.createLinearGradient(-width / 2, -height / 2, width / 2, height / 2);
    if (material === 'wood') {
      gradient.addColorStop(0, '#f3c77a');
      gradient.addColorStop(0.3, config.fill);
      gradient.addColorStop(0.76, '#9d4a20');
      gradient.addColorStop(1, '#67341f');
    } else if (material === 'stone') {
      gradient.addColorStop(0, '#35434c');
      gradient.addColorStop(0.28, '#aab5b5');
      gradient.addColorStop(0.55, '#71818a');
      gradient.addColorStop(0.82, '#bdc6c2');
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
