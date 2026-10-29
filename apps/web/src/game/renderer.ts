import { BLOCK_CONFIG, CHICK_FORMS, WORLD } from './constants';
import { STAGES } from './stages';
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
  private previousCats = new Map<number, { hp: number; x: number; y: number }>();
  private catImpactEffects: { id: number; x: number; y: number; startMs: number; label: 'POW!' | 'CRASH!' }[] = [];
  private catShakeUntilMs = 0;
  private catShakeStrength = 0;
  private lastBoss: GameEntityView | null = null;

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
    this.updateCatImpacts(snapshot, sceneTime);
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
    const endShake = snapshot.state === 'LOST' || snapshot.state === 'WON' ? Math.sin(sceneTime / 24) * 2 : 0;
    const hitProgress = Math.max(0, this.catShakeUntilMs - sceneTime);
    const hitShake = hitProgress > 0 ? this.catShakeStrength * (hitProgress / 110) : 0;
    const bossHitProgress = Math.max(0, (snapshot.bossHitRemainingMs ?? 0) / 200);
    const bossShake = snapshot.stage === 6 && bossHitProgress > 0 ? Math.sin(sceneTime / 7) * 10 * bossHitProgress : 0;
    ctx.translate(endShake + Math.sin(sceneTime / 9) * hitShake + bossShake,
      Math.cos(sceneTime / 11) * hitShake * 0.42 + Math.cos(sceneTime / 8) * bossShake * 0.55);
    this.drawGround(snapshot.stage);
    this.drawSlickZones(snapshot.slickZones, sceneTime);
    snapshot.entities.forEach((entity) => this.drawEntityShadow(entity));
    this.drawProp('nest', WORLD.nest.x, WORLD.nest.y, 130, 80);
    ctx.save();
    ctx.translate(WORLD.cannon.x, WORLD.cannon.y);
    ctx.scale(1.15, 1.15);
    ctx.translate(-WORLD.cannon.x, -WORLD.cannon.y);
    this.drawSlingshotBase(WORLD.cannon.x, WORLD.cannon.y + 20);
    this.drawSlingshotBand(snapshot, false);
    this.drawProp('slingshot', WORLD.cannon.x, WORLD.cannon.y + 20, 90, 156);
    ctx.restore();
    this.drawAimCancelZone(snapshot);
    this.drawAimGuide(snapshot);
    this.drawLoadedChick(snapshot, sceneTime);
    this.drawSlingshotBand(snapshot, true);
    snapshot.entities.forEach((entity) => this.drawEntity(entity, snapshot.stage, sceneTime));
    this.drawStructuralLinks(snapshot.entities);
    this.drawBossAura(snapshot, sceneTime);
    this.drawBossShockwave(snapshot, sceneTime);
    this.drawCatImpactEffects(sceneTime);
    if (snapshot.state === 'AIMING' && snapshot.ammo > 0) this.drawAttackRouteMarkers(snapshot.stage, sceneTime);
    this.drawScorePopups(snapshot.scorePopups ?? []);
    this.drawBossDamagePopups(snapshot);
    this.drawBossHitVignette(snapshot, bossHitProgress);
    this.drawBossVictory(snapshot, sceneTime);
    this.drawBossConfetti(snapshot, sceneTime);
    this.drawAimKeyboardTip(snapshot);
    ctx.restore();
    ctx.restore();
  }

  dispose(): void {
    this.disposed = true;
    this.previousCats.clear();
    this.catImpactEffects = [];
    this.lastBoss = null;
  }

  private updateCatImpacts(snapshot: GameSnapshot, nowMs: number): void {
    const currentCats = new Map<number, { hp: number; x: number; y: number }>();
    for (const entity of snapshot.entities) {
      if (entity.kind !== 'cat' || entity.hp === undefined) continue;
      if (entity.boss) this.lastBoss = { ...entity };
      currentCats.set(entity.id, { hp: entity.hp, x: entity.x, y: entity.y });
      const previous = this.previousCats.get(entity.id);
      if (previous && entity.hp < previous.hp) {
        const damage = previous.hp - entity.hp;
        this.catImpactEffects.push({
          id: entity.id,
          x: entity.x,
          y: entity.y,
          startMs: nowMs,
          label: damage >= 12 ? 'CRASH!' : 'POW!',
        });
        this.catShakeUntilMs = nowMs + 110;
        this.catShakeStrength = Math.min(3.2, 1.15 + damage * 0.055);
      }
    }
    if (snapshot.state === 'FLYING' || snapshot.state === 'RESOLVING') {
      for (const [id, previous] of this.previousCats) {
        if (currentCats.has(id)) continue;
        this.catImpactEffects.push({ id, x: previous.x, y: previous.y, startMs: nowMs, label: 'CRASH!' });
        this.catShakeUntilMs = nowMs + 110;
        this.catShakeStrength = 3.2;
      }
    }
    this.previousCats = currentCats;
    this.catImpactEffects = this.catImpactEffects.filter((effect) => nowMs - effect.startMs < 760);
  }

  private drawBossAura(snapshot: GameSnapshot, nowMs: number): void {
    if (snapshot.stage !== 6 || (snapshot.bossHp ?? 0) <= 0 || (snapshot.bossHp ?? 0) > (snapshot.bossMaxHp ?? 500) / 2) return;
    const boss = snapshot.entities.find((entity) => entity.kind === 'cat' && entity.boss);
    if (!boss) return;
    const ctx = this.context;
    ctx.save();
    for (let index = 0; index < 18; index += 1) {
      const phase = nowMs / 280 + index * (Math.PI * 2 / 18);
      const radius = 78 + 15 * Math.sin(phase * 1.7);
      const x = boss.x + Math.cos(phase) * radius;
      const y = boss.y + Math.sin(phase) * radius * 0.68;
      const size = 2.5 + (Math.sin(phase * 2.3) + 1) * 2;
      ctx.globalAlpha = 0.48 + (Math.sin(phase) + 1) * 0.24;
      ctx.fillStyle = index % 3 === 0 ? '#ffe777' : '#ff654e';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawBossShockwave(snapshot: GameSnapshot, nowMs: number): void {
    const remaining = snapshot.bossShockwaveRemainingMs ?? 0;
    if (snapshot.stage !== 6 || remaining <= 0) return;
    const boss = snapshot.entities.find((entity) => entity.kind === 'cat' && entity.boss) ?? this.lastBoss;
    if (!boss) return;
    const progress = 1 - remaining / 900;
    const ctx = this.context;
    ctx.save();
    ctx.globalAlpha = Math.max(0, (1 - progress) * 0.72);
    ctx.strokeStyle = '#ffb34f';
    ctx.shadowColor = '#ff563d';
    ctx.shadowBlur = 18;
    ctx.lineWidth = 7 - progress * 3;
    ctx.beginPath();
    ctx.arc(boss.x, boss.y, 45 + progress * 390, Math.PI * 0.62, Math.PI * 1.38);
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(boss.x, boss.y, 62 + progress * 390, Math.PI * 0.62, Math.PI * 1.38);
    ctx.stroke();
    ctx.restore();
  }

  private drawBossDamagePopups(snapshot: GameSnapshot): void {
    const ctx = this.context;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const popup of snapshot.bossDamagePopups ?? []) {
      const progress = 1 - Math.min(1, popup.remainingMs / 1050);
      ctx.globalAlpha = Math.min(1, popup.remainingMs / 220);
      ctx.font = '1000 32px "Jua", sans-serif';
      ctx.lineWidth = 8;
      ctx.strokeStyle = '#531c1c';
      ctx.strokeText(`-${popup.damage}`, popup.x, popup.y - progress * 52);
      ctx.fillStyle = '#ff514a';
      ctx.fillText(`-${popup.damage}`, popup.x, popup.y - progress * 52);
    }
    ctx.restore();
  }

  private drawBossHitVignette(snapshot: GameSnapshot, progress: number): void {
    if (snapshot.stage !== 6 || progress <= 0) return;
    const ctx = this.context;
    const gradient = ctx.createRadialGradient(WORLD.width / 2, WORLD.height / 2, 130, WORLD.width / 2, WORLD.height / 2, 720);
    gradient.addColorStop(0, 'rgba(230, 35, 38, 0)');
    gradient.addColorStop(0.62, 'rgba(230, 35, 38, 0.02)');
    gradient.addColorStop(1, `rgba(205, 21, 35, ${0.62 * progress})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  }

  private drawBossVictory(snapshot: GameSnapshot, nowMs: number): void {
    if (snapshot.stage !== 6 || snapshot.state !== 'WON' || !this.lastBoss) return;
    const elapsed = snapshot.winElapsedMs ?? 0;
    const progress = Math.min(1, elapsed / 2200);
    const alpha = Math.max(0, 1 - Math.max(0, progress - 0.68) / 0.32);
    this.context.save();
    this.context.globalAlpha = alpha;
    this.drawSprite({ ...this.lastBoss, x: this.lastBoss.x + progress * 500, y: this.lastBoss.y - progress * 520,
      angle: this.lastBoss.angle + progress * Math.PI * 10, alive: true }, 6, nowMs);
    this.context.restore();
  }

  private drawBossConfetti(snapshot: GameSnapshot, nowMs: number): void {
    if (snapshot.stage !== 6 || snapshot.state !== 'WON' || (snapshot.winElapsedMs ?? 0) >= 2600) return;
    const ctx = this.context;
    ctx.save();
    for (let index = 0; index < 110; index += 1) {
      const phase = nowMs / 430 + index * 1.73;
      const x = ((index * 127 + Math.sin(phase) * 32) % WORLD.width + WORLD.width) % WORLD.width;
      const y = ((nowMs * (0.07 + (index % 5) * 0.012) + index * 67) % (WORLD.height + 50)) - 25;
      const size = 3 + (index % 4);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(phase);
      ctx.fillStyle = ['#ffe66d', '#ffc247', '#fff2ae', '#f6a93c'][index % 4];
      ctx.shadowColor = '#ffce56';
      ctx.shadowBlur = index % 3 === 0 ? 10 : 3;
      if (index % 4 === 0) {
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff7ca';
        ctx.beginPath();
        ctx.arc(size * 1.35, 0, size * 0.72, 0, Math.PI * 2);
        ctx.arc(-size * 1.35, 0, size * 0.72, 0, Math.PI * 2);
        ctx.arc(0, size * 1.35, size * 0.72, 0, Math.PI * 2);
        ctx.arc(0, -size * 1.35, size * 0.72, 0, Math.PI * 2);
        ctx.fill();
      } else ctx.fillRect(-size / 2, -size / 2, size, size * 1.8);
      ctx.restore();
    }
    ctx.restore();
  }

  private drawCatImpactEffects(nowMs: number): void {
    const ctx = this.context;
    for (const effect of this.catImpactEffects) {
      const age = nowMs - effect.startMs;
      const progress = Math.max(0, Math.min(1, age / 620));
      const alpha = Math.max(0, 1 - progress);
      const scale = 0.75 + Math.min(0.32, age / 240);
      ctx.save();
      ctx.globalAlpha = alpha;
      for (let index = 0; index < 8; index += 1) {
        const angle = (Math.PI * 2 * index) / 8 + effect.id * 0.31;
        const inner = 17 + progress * 15;
        const outer = inner + 7 + (index % 3) * 3;
        ctx.strokeStyle = index % 2 ? '#ff9e28' : '#fff05c';
        ctx.lineWidth = index % 3 === 0 ? 4 : 2.5;
        ctx.beginPath();
        ctx.moveTo(effect.x + Math.cos(angle) * inner, effect.y + Math.sin(angle) * inner);
        ctx.lineTo(effect.x + Math.cos(angle) * outer, effect.y + Math.sin(angle) * outer);
        ctx.stroke();
      }
      for (let index = 0; index < 4; index += 1) {
        const angle = (Math.PI * 2 * index) / 4 + effect.id;
        ctx.fillStyle = 'rgba(219, 190, 145, 0.72)';
        ctx.beginPath();
        ctx.ellipse(effect.x + Math.cos(angle) * (12 + progress * 26), effect.y + 12 + Math.sin(angle) * 10,
          5 + progress * 5, 3 + progress * 2, angle, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.translate(effect.x, effect.y - 31 - progress * 36);
      ctx.scale(scale, scale);
      ctx.rotate(Math.sin(effect.id) * 0.06);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '1000 25px "Jua", sans-serif';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 10;
      ctx.strokeStyle = '#fff7df';
      ctx.strokeText(effect.label, 0, 0);
      ctx.lineWidth = 6;
      ctx.strokeStyle = effect.label === 'CRASH!' ? '#76234d' : '#135383';
      ctx.strokeText(effect.label, 0, 0);
      ctx.fillStyle = effect.label === 'CRASH!' ? '#ff4f9a' : '#39dfff';
      ctx.fillText(effect.label, 0, 0);
      ctx.restore();
    }
  }

  private drawAimKeyboardTip(snapshot: GameSnapshot): void {
    if (snapshot.state !== 'AIMING' || snapshot.ammo <= 0) return;
    const ctx = this.context;
    const x = 18;
    const y = WORLD.cannon.y - 96;
    const width = 242;
    const height = 26;
    ctx.save();
    ctx.fillStyle = 'rgba(69, 43, 27, .68)';
    ctx.strokeStyle = 'rgba(243, 210, 140, .72)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 10);
    ctx.fill();
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 12px "Jua", sans-serif';
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(38, 24, 16, .75)';
    ctx.strokeText('Space 스킬 · W/S 파워 미세 조절', x + width / 2, y + height / 2 + 1);
    ctx.fillStyle = '#fff0c6';
    ctx.fillText('Space 스킬 · W/S 파워 미세 조절', x + width / 2, y + height / 2 + 1);
    ctx.restore();
  }

  private drawSlickZones(zones: GameSnapshot['slickZones'], sceneTime: number): void {
    const ctx = this.context;
    ctx.save();
    for (const zone of zones) {
      ctx.fillStyle = 'rgba(255, 217, 76, .65)';
      ctx.beginPath();
      ctx.ellipse(zone.x, 669, zone.width / 2, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 250, 191, .85)';
      for (let index = 0; index < 4; index += 1) {
        ctx.beginPath();
        ctx.ellipse(zone.x - 60 + index * 38, 667 + Math.sin(sceneTime / 350 + index), 7, 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  private drawBackground(stage: GameSnapshot['stage'], sceneTime: number): void {
    const ctx = this.context;
    ctx.save();
    const image = this.assets.get(`background-${stage}`);
    if (image) {
      ctx.drawImage(image, 0, 0, WORLD.width, WORLD.height);
      if (stage === 6) this.drawFestivalParticles(sceneTime);
      ctx.restore();
      return;
    }
    switch (STAGES[stage].theme) {
      case 'alley-day':
      case 'wall-afternoon': this.drawChapterOneBackground(); break;
      case 'rooftop-sunset': this.drawChapterTwoBackground(); break;
      case 'clock-twilight':
      case 'factory-night': this.drawChapterThreeBackground(); break;
      case 'meadow-gold': this.drawChapterFourBackground(sceneTime); break;
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
    const theme = STAGES[stage].theme;
    if (theme === 'alley-day' || theme === 'wall-afternoon') {
      const ground = ctx.createLinearGradient(0, 664, 0, WORLD.height);
      ground.addColorStop(0, 'rgba(233, 174, 91, .08)');
      ground.addColorStop(0.18, 'rgba(176, 105, 48, .72)');
      ground.addColorStop(1, 'rgba(91, 61, 36, .82)');
      ctx.fillStyle = ground;
      ctx.fillRect(0, 664, WORLD.width, 56);
      ctx.fillStyle = 'rgba(255, 229, 151, .82)';
      ctx.fillRect(0, 664, WORLD.width, 4);
    } else if (theme === 'rooftop-sunset') {
      const roof = ctx.createLinearGradient(0, 664, 0, WORLD.height);
      roof.addColorStop(0, 'rgba(87, 195, 184, .16)');
      roof.addColorStop(0.2, 'rgba(35, 135, 140, .76)');
      roof.addColorStop(1, 'rgba(21, 80, 99, .9)');
      ctx.fillStyle = roof;
      ctx.fillRect(0, 664, WORLD.width, 56);
      ctx.fillStyle = 'rgba(255, 190, 117, .9)';
      ctx.fillRect(0, 664, WORLD.width, 4);
    } else if (theme === 'clock-twilight' || theme === 'factory-night') {
      const floor = ctx.createLinearGradient(0, 664, 0, WORLD.height);
      floor.addColorStop(0, 'rgba(96, 78, 118, .12)');
      floor.addColorStop(0.2, theme === 'factory-night' ? 'rgba(27, 66, 101, .86)' : 'rgba(90, 57, 78, .82)');
      floor.addColorStop(1, 'rgba(40, 28, 45, .94)');
      ctx.fillStyle = floor;
      ctx.fillRect(0, 664, WORLD.width, 56);
      ctx.fillStyle = 'rgba(242, 184, 87, .88)';
      ctx.fillRect(0, 664, WORLD.width, 4);
    } else {
      const meadow = ctx.createLinearGradient(0, 664, 0, WORLD.height);
      meadow.addColorStop(0, 'rgba(170, 220, 102, .12)');
      meadow.addColorStop(0.2, 'rgba(95, 160, 75, .8)');
      meadow.addColorStop(1, 'rgba(73, 111, 54, .9)');
      ctx.fillStyle = meadow;
      ctx.fillRect(0, 664, WORLD.width, 56);
      ctx.fillStyle = 'rgba(222, 239, 137, .92)';
      ctx.fillRect(0, 664, WORLD.width, 4);
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
    if (distance < WORLD.cancelDragRadius) return;
    const power = (Math.min(distance, WORLD.maxDrag) / WORLD.maxDrag) * snapshot.form.launchPower * 1.2;
    const angle = Math.atan2(dy, dx);
    let vx = Math.cos(angle) * power;
    let vy = Math.sin(angle) * power;
    let x = WORLD.cannon.x;
    let y = WORLD.cannon.y;
    const ctxPoint = (point: Point) => point;
    ctx.save();
    const strength = Math.min(1, distance / WORLD.maxDrag);
    const maxFrame = 42 + Math.round(strength * 54);
    const trajectory: Point[] = [];
    const frameStep = 0.65;
    const deltaTimeSquared = (1000 / 60) ** 2;
    const megaScale = snapshot.megaNext ? 1.8 : 1;
    const mass = Math.PI * (snapshot.form.radius * megaScale) ** 2 * snapshot.form.density * (snapshot.megaNext ? 3.5 : 1);
    const fans = STAGES[snapshot.stage].spawns.filter((spawn) => spawn.kind === 'fan');
    for (let frame = 0; frame <= maxFrame; frame += frameStep) {
      for (const fan of fans) {
        const withinFan = Math.abs(x - fan.x) <= (fan.w ?? 0) / 2 && Math.abs(y - fan.y) <= (fan.h ?? 0) / 2;
        if (!withinFan) continue;
        vx += (fan.forceX ?? 0) / mass * deltaTimeSquared * frameStep;
        vy += (fan.forceY ?? 0) / mass * deltaTimeSquared * frameStep;
      }
      vy += 0.001 * WORLD.gravityY * deltaTimeSquared * frameStep;
      x += vx * frameStep;
      y += vy * frameStep;
      const point = { x, y };
      if (point.x < 0 || point.x > WORLD.width || point.y > WORLD.height || point.y < 0) break;
      trajectory.push(point);
    }
    const end = trajectory[trajectory.length - 1];
    if (trajectory.length < 2 || !end) {
      ctx.restore();
      return;
    }

    // Individual neon beads follow the physics prediction without a connecting ribbon.
    const step = strength > 0.72 ? 2 : 3;
    for (let frame = 0; frame < trajectory.length; frame += step) {
      const point = ctxPoint(trajectory[frame]);
      ctx.beginPath();
      ctx.arc(point.x, point.y, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(74, 255, 145, .14)';
      ctx.shadowColor = 'rgba(74, 255, 145, .52)';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(point.x, point.y, 2.6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(126, 255, 174, .86)';
      ctx.shadowColor = 'rgba(104, 255, 158, .72)';
      ctx.shadowBlur = 5;
      ctx.fill();
    }
    ctx.restore();
  }

  private drawAimCancelZone(snapshot: GameSnapshot): void {
    if (!snapshot.aimPosition || snapshot.state !== 'AIMING') return;
    const ctx = this.context;
    const distance = Math.hypot(snapshot.aimPosition.x - WORLD.cannon.x, snapshot.aimPosition.y - WORLD.cannon.y);
    const inside = distance < WORLD.cancelDragRadius;
    const radius = WORLD.cancelDragRadius;
    ctx.save();
    ctx.fillStyle = inside ? 'rgba(113, 201, 116, .32)' : 'rgba(255, 235, 159, .18)';
    ctx.strokeStyle = inside ? '#74cf79' : '#fff1a6';
    ctx.lineWidth = inside ? 4 : 3;
    ctx.setLineDash([7, 5]);
    ctx.shadowColor = inside ? 'rgba(61, 160, 75, .8)' : 'rgba(70, 43, 22, .75)';
    ctx.shadowBlur = 9;
    ctx.beginPath();
    ctx.arc(WORLD.cannon.x, WORLD.cannon.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;
    const label = inside ? '취소 구역' : '여기 놓으면 취소';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const labelWidth = ctx.measureText(label).width + 18;
    ctx.fillStyle = 'rgba(77, 52, 31, .9)';
    ctx.beginPath();
    ctx.roundRect(WORLD.cannon.x - labelWidth / 2, WORLD.cannon.y - radius - 28, labelWidth, 23, 11);
    ctx.fill();
    ctx.fillStyle = '#fff7d7';
    ctx.fillText(label, WORLD.cannon.x, WORLD.cannon.y - radius - 16);
    ctx.restore();
  }

  private drawAttackRouteMarkers(stage: GameSnapshot['stage'], sceneTime: number): void {
    const ctx = this.context;
    const pulse = 0.82 + Math.sin(sceneTime / 260) * 0.08;
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    STAGES[stage].attackRoutes.forEach((route, index) => {
      const markerY = route.target.y - 28;
      ctx.strokeStyle = 'rgba(255, 246, 207, .9)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(route.target.x, markerY + 13);
      ctx.lineTo(route.target.x, route.target.y - 7);
      ctx.stroke();
      ctx.fillStyle = index === 0 ? '#f3c35d' : '#8cc9b0';
      ctx.strokeStyle = '#fff2cc';
      ctx.lineWidth = 3;
      ctx.shadowColor = 'rgba(42, 30, 17, .55)';
      ctx.shadowBlur = 5;
      ctx.beginPath();
      ctx.arc(route.target.x, markerY, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#4a321d';
      ctx.fillText(String(index + 1), route.target.x, markerY + 1);
    });
    ctx.restore();
  }

  private drawLoadedChick(snapshot: GameSnapshot, nowMs: number): void {
    if (snapshot.state !== 'AIMING' || snapshot.ammo <= 0) return;
    const position = snapshot.aimPosition ?? WORLD.cannon;
    this.drawSprite({
      id: -1,
      kind: 'chick',
      x: position.x,
      y: position.y,
      radius: snapshot.form.radius * 1.15 * (snapshot.megaNext ? 1.8 : 1),
      angle: 0,
      alive: true,
    }, snapshot.stage, nowMs);
  }

  private drawSlingshotBand(snapshot: GameSnapshot, front: boolean): void {
    const ctx = this.context;
    const center = { x: WORLD.cannon.x, y: WORLD.cannon.y };
    const pouch = snapshot.state === 'AIMING' && snapshot.ammo > 0 ? (snapshot.aimPosition ?? center) : center;
    const distance = Math.hypot(center.x - pouch.x, center.y - pouch.y);
    const strength = Math.min(1, distance / WORLD.maxDrag);
    const anchor = front
      ? { x: WORLD.cannon.x + 26.45, y: WORLD.cannon.y - 48.3 }
      : { x: WORLD.cannon.x - 26.45, y: WORLD.cannon.y - 48.3 };
    ctx.save();
    ctx.strokeStyle = front ? '#7a261f' : '#4f1717';
    ctx.lineWidth = 6.5 - strength * 1.5;
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(53, 24, 18, .4)';
    ctx.shadowBlur = 3;
    ctx.beginPath();
    ctx.moveTo(anchor.x, anchor.y);
    ctx.lineTo(pouch.x, pouch.y);
    ctx.stroke();
    if (front && snapshot.state === 'AIMING' && snapshot.ammo > 0) {
      const radius = snapshot.form.radius * 1.15;
      ctx.strokeStyle = '#9b3e2c';
      ctx.lineWidth = Math.max(7, radius * 0.42);
      ctx.beginPath();
      ctx.arc(pouch.x, pouch.y + radius * 0.08, radius * 0.62, 0.12 * Math.PI, 0.88 * Math.PI);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawEntityShadow(entity: GameEntityView): void {
    if (!entity.alive || !['cat', 'block', 'chick', 'egg', 'boulder'].includes(entity.kind)) return;
    const ctx = this.context;
    const width = entity.width ?? (entity.radius ?? 24) * 2;
    const height = entity.height ?? (entity.radius ?? 24) * 2;
    const shadowY = Math.min(WORLD.height - 8, entity.y + height * 0.5 + 7);
    const groundedStone = entity.kind === 'block' && entity.material === 'stone' && entity.y + height / 2 >= WORLD.height - 95;
    ctx.save();
    ctx.fillStyle = groundedStone ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.25)';
    if (groundedStone) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 12;
    }
    ctx.beginPath();
    ctx.ellipse(entity.x + 5, shadowY, Math.max(groundedStone ? 18 : 9, width * (groundedStone ? 0.8 : 0.45)), Math.max(4, Math.min(groundedStone ? 10 : 14, height * 0.12)), 0, 0, Math.PI * 2);
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
      this.drawSprite(entity, stage, nowMs);
      if (entity.kind === 'cat') this.drawCatHitFace(entity, nowMs);
      return;
    }
    if (entity.kind === 'shutter') this.drawShutterSupport(entity);
    if (entity.kind === 'chandelier') this.drawChandelierSupport(entity);
    ctx.save();
    ctx.translate(entity.x, entity.y);
    ctx.rotate(entity.angle);
    if (entity.kind === 'block') this.drawBlock(entity);
    else if (entity.kind === 'shutter') this.drawShutter(entity);
    else if (entity.kind === 'tire') this.drawRoundProp('tire', entity.radius ?? 40);
    else if (entity.kind === 'gear') this.drawRoundProp('gear', entity.radius ?? 44);
    else if (entity.kind === 'chandelier') this.drawChandelier(entity);
    else if (entity.kind === 'trampoline') this.drawTrampoline(entity);
    else if (entity.kind === 'boulder') this.drawBoulder(entity);
    else if (entity.kind === 'seesaw') this.drawSeesaw(entity);
    if (entity.kind === 'block' && entity.slick) {
      ctx.strokeStyle = 'rgba(255, 239, 139, .9)';
      ctx.lineWidth = 3;
      ctx.strokeRect(-(entity.width ?? 24) / 2, -(entity.height ?? 24) / 2, entity.width ?? 24, entity.height ?? 24);
    }
    ctx.restore();
  }

  private drawCatHitFace(entity: GameEntityView, nowMs: number): void {
    const impact = [...this.catImpactEffects].reverse().find((effect) => effect.id === entity.id);
    if (!impact || nowMs - impact.startMs > 185) return;
    const age = nowMs - impact.startMs;
    const alpha = 1 - age / 185;
    const radius = entity.radius ?? 24;
    const eyeOffset = radius * 0.31;
    const eyeY = entity.y - radius * 0.12;
    const crossRadius = Math.max(4, radius * 0.19);
    const ctx = this.context;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#442d27';
    ctx.lineWidth = Math.max(2.5, radius * 0.13);
    ctx.lineCap = 'round';
    for (const x of [entity.x - eyeOffset, entity.x + eyeOffset]) {
      ctx.beginPath();
      ctx.moveTo(x - crossRadius, eyeY - crossRadius);
      ctx.lineTo(x + crossRadius, eyeY + crossRadius);
      ctx.moveTo(x + crossRadius, eyeY - crossRadius);
      ctx.lineTo(x - crossRadius, eyeY + crossRadius);
      ctx.stroke();
    }
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

  private drawSprite(entity: GameEntityView, stage: GameSnapshot['stage'], nowMs: number): void {
    const ctx = this.context;
    const radius = entity.radius ?? 24;
    const scale = entity.kind === 'cat' ? (entity.boss ? 3.6 : 3.25) : entity.kind === 'chick' ? 3.2 : 3;
    const width = radius * scale;
    const height = radius * scale;
    let id: Parameters<SvgAssetCache['get']>[0];
    const blinkPhase = (nowMs / 1000 + Math.abs(entity.id) * 0.37) % 4.2;
    const blinking = entity.kind === 'chick' && CHICK_FORMS[stage].assetVariant === 1 && blinkPhase > 4.02;
    if (entity.kind === 'chick') id = blinking ? 'chick-1-blink' : `chick-${CHICK_FORMS[stage].assetVariant}`;
    else if (entity.kind === 'egg') id = 'egg';
    else id = entity.boss ? 'cat-boss' : entity.shield ? 'cat-shield' : 'cat-normal';
    const image = this.assets.get(id);
    const resting = Math.abs(entity.angle) < 0.12 && (entity.kind === 'cat' || entity.id === -1);
    const idleOffset = resting ? Math.sin(nowMs / 360 + entity.id) * 2 : 0;
    const breathe = resting ? 1 + Math.sin(nowMs / 520 + entity.id * 0.4) * 0.018 : 1;
    ctx.save();
    ctx.translate(entity.x, entity.y + idleOffset);
    ctx.rotate(entity.angle);
    ctx.scale(1 / breathe, breathe);
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

  private drawScorePopups(popups: readonly NonNullable<GameSnapshot['scorePopups']>[number][]): void {
    const ctx = this.context;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const popup of popups) {
      const progress = 1 - Math.min(1, popup.remainingMs / 1100);
      const y = popup.y - progress * 52;
      ctx.globalAlpha = Math.min(1, popup.remainingMs / 280);
      ctx.font = '900 30px "Jua", sans-serif';
      ctx.lineWidth = 7;
      ctx.strokeStyle = 'rgba(70, 43, 21, .78)';
      ctx.strokeText(`+${popup.value}`, popup.x, y);
      ctx.fillStyle = '#fff36e';
      ctx.fillText(`+${popup.value}`, popup.x, y);
      if (popup.label) {
        ctx.font = '800 13px "Jua", sans-serif';
        ctx.lineWidth = 4;
        ctx.strokeText(popup.label, popup.x, y + 24);
        ctx.fillStyle = '#fffaf0';
        ctx.fillText(popup.label, popup.x, y + 24);
      }
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
    const sprite = this.assets.get(`block-${material}`);
    if (sprite) {
      const displayWidth = Math.max(width, Math.min(58, height * 0.46 + 12));
      const displayHeight = Math.max(height, Math.min(46, width * 0.26 + 12));
      ctx.save();
      ctx.shadowColor = 'rgba(37, 35, 31, .28)';
      ctx.shadowBlur = 8;
      ctx.drawImage(sprite, -displayWidth / 2, -displayHeight / 2, displayWidth, displayHeight);
      ctx.restore();
      this.drawBlockDamage(entity, width, height);
      return;
    }
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
    } else if (material === 'steel') {
      gradient.addColorStop(0, '#e9f3f2');
      gradient.addColorStop(0.22, '#b2c2c8');
      gradient.addColorStop(0.5, '#687e8c');
      gradient.addColorStop(0.78, '#aab9bf');
      gradient.addColorStop(1, '#435561');
    } else if (material === 'rubber') {
      gradient.addColorStop(0, '#f59aaa');
      gradient.addColorStop(0.45, '#cb5b72');
      gradient.addColorStop(1, '#6b2944');
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
    } else if (material === 'steel') {
      ctx.strokeStyle = 'rgba(247, 255, 255, .72)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-width * 0.35, -height * 0.2);
      ctx.lineTo(width * 0.35, -height * 0.2);
      ctx.moveTo(-width * 0.35, height * 0.2);
      ctx.lineTo(width * 0.35, height * 0.2);
      ctx.stroke();
      for (const x of [-width * 0.38, width * 0.38]) {
        ctx.fillStyle = '#263b49';
        ctx.beginPath();
        ctx.arc(x, 0, Math.max(2, Math.min(4, height * 0.12)), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (material === 'rubber') {
      ctx.strokeStyle = 'rgba(255, 217, 225, .62)';
      ctx.lineWidth = Math.max(2, Math.min(5, width * 0.08));
      for (const x of [-width * 0.25, 0, width * 0.25]) {
        ctx.beginPath();
        ctx.moveTo(x - 5, -height * 0.38);
        ctx.lineTo(x + 5, height * 0.38);
        ctx.stroke();
      }
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
    this.drawBlockDamage(entity, width, height);
  }

  private drawBlockDamage(entity: GameEntityView, width: number, height: number): void {
    const hp = entity.hp;
    const maxHp = entity.maxHp;
    if (entity.material === 'tnt' || hp === undefined || maxHp === undefined || maxHp <= 0) return;
    const damageRatio = 1 - Math.max(0, Math.min(1, hp / maxHp));
    const tier = damageRatio >= 0.72 ? 3 : damageRatio >= 0.48 ? 2 : damageRatio >= 0.24 ? 1 : 0;
    if (tier === 0) return;

    const ctx = this.context;
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    ctx.save();
    ctx.beginPath();
    ctx.rect(-halfWidth + 2, -halfHeight + 2, width - 4, height - 4);
    ctx.clip();

    if (entity.material === 'wood') {
      const seed = Math.abs(entity.id) % 7;
      const originX = (seed / 14 - 0.22) * width;
      const originY = (seed % 3 - 1) * height * 0.08;
      ctx.strokeStyle = 'rgba(70, 30, 19, .9)';
      ctx.lineWidth = Math.max(1.5, Math.min(3, Math.min(width, height) * 0.045));
      ctx.beginPath();
      ctx.moveTo(originX, originY);
      ctx.lineTo(originX - width * 0.08, originY - height * 0.16);
      ctx.lineTo(originX - width * 0.2, originY - height * 0.25);
      ctx.moveTo(originX, originY);
      ctx.lineTo(originX + width * 0.09, originY + height * 0.12);
      if (tier >= 2) {
        ctx.lineTo(originX + width * 0.21, originY + height * 0.18);
        ctx.moveTo(originX - width * 0.08, originY - height * 0.16);
        ctx.lineTo(originX - width * 0.04, originY - height * 0.3);
      }
      if (tier >= 3) {
        ctx.moveTo(originX + width * 0.09, originY + height * 0.12);
        ctx.lineTo(originX + width * 0.04, originY + height * 0.28);
      }
      ctx.stroke();
    } else if (entity.material === 'glass') {
      const rays = tier === 1 ? 4 : tier === 2 ? 7 : 10;
      const reach = Math.min(halfWidth, halfHeight) * (tier === 1 ? 0.55 : tier === 2 ? 0.78 : 0.94);
      ctx.strokeStyle = 'rgba(235, 255, 255, .95)';
      ctx.lineWidth = Math.max(1, Math.min(2, Math.min(width, height) * 0.035));
      ctx.beginPath();
      for (let ray = 0; ray < rays; ray += 1) {
        const angle = (Math.PI * 2 * ray) / rays + (Math.abs(entity.id) % 5) * 0.11;
        const endX = Math.max(-halfWidth + 4, Math.min(halfWidth - 4, Math.cos(angle) * reach));
        const endY = Math.max(-halfHeight + 4, Math.min(halfHeight - 4, Math.sin(angle) * reach));
        ctx.moveTo(0, 0);
        ctx.lineTo(endX, endY);
        if (tier >= 2) {
          const branchX = endX * 0.72 - Math.sin(angle) * Math.min(halfWidth, halfHeight) * 0.18;
          const branchY = endY * 0.72 + Math.cos(angle) * Math.min(halfWidth, halfHeight) * 0.18;
          ctx.moveTo(endX * 0.72, endY * 0.72);
          ctx.lineTo(Math.max(-halfWidth + 4, Math.min(halfWidth - 4, branchX)), Math.max(-halfHeight + 4, Math.min(halfHeight - 4, branchY)));
        }
      }
      ctx.stroke();
      ctx.fillStyle = 'rgba(235, 255, 255, .9)';
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(2, Math.min(4, Math.min(width, height) * 0.07)), 0, Math.PI * 2);
      ctx.fill();
    } else if (entity.material === 'stone') {
      const corners = tier === 1 ? [0] : tier === 2 ? [0, 2] : [0, 1, 2, 3];
      const chip = Math.min(width, height) * (tier === 1 ? 0.12 : tier === 2 ? 0.18 : 0.23);
      ctx.fillStyle = 'rgba(25, 42, 49, .72)';
      for (const corner of corners) {
        const left = corner === 0 || corner === 3;
        const top = corner === 0 || corner === 1;
        const x = left ? -halfWidth + 2 : halfWidth - 2;
        const y = top ? -halfHeight + 2 : halfHeight - 2;
        const dx = left ? chip : -chip;
        const dy = top ? chip : -chip;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + dx, y);
        ctx.lineTo(x, y + dy);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(222, 241, 238, .88)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x + dx, y);
        ctx.lineTo(x, y + dy);
        ctx.stroke();
      }
    } else if (entity.material === 'steel') {
      ctx.strokeStyle = 'rgba(39, 54, 67, .88)';
      ctx.lineWidth = Math.max(2, Math.min(4, width * 0.035));
      ctx.beginPath();
      ctx.moveTo(-halfWidth * 0.45, -halfHeight * 0.2);
      ctx.lineTo(-halfWidth * 0.12, -halfHeight * 0.05);
      ctx.lineTo(halfWidth * 0.05, halfHeight * 0.18);
      ctx.lineTo(halfWidth * 0.42, halfHeight * 0.1);
      if (tier >= 2) {
        ctx.moveTo(-halfWidth * 0.12, -halfHeight * 0.05);
        ctx.lineTo(-halfWidth * 0.3, halfHeight * 0.36);
        ctx.lineTo(halfWidth * 0.05, halfHeight * 0.18);
      }
      ctx.stroke();
      ctx.fillStyle = 'rgba(226, 241, 242, .9)';
      ctx.beginPath();
      ctx.ellipse(halfWidth * 0.08, -halfHeight * 0.02, halfWidth * 0.18 * tier, halfHeight * 0.11 * tier, -0.25, 0, Math.PI * 2);
      ctx.fill();
    } else if (entity.material === 'rubber') {
      ctx.strokeStyle = 'rgba(74, 25, 48, .86)';
      ctx.lineWidth = Math.max(2, Math.min(4, width * 0.04));
      ctx.beginPath();
      ctx.moveTo(-halfWidth * 0.45, -halfHeight * 0.12);
      ctx.quadraticCurveTo(-halfWidth * 0.08, -halfHeight * 0.38, halfWidth * 0.1, 0);
      ctx.lineTo(halfWidth * 0.42, halfHeight * 0.28);
      if (tier >= 2) {
        ctx.moveTo(halfWidth * 0.1, 0);
        ctx.lineTo(-halfWidth * 0.05, halfHeight * 0.42);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawShutter(entity: GameEntityView): void {
    const ctx = this.context;
    const width = entity.width ?? 24;
    const height = entity.height ?? 140;
    const sprite = this.assets.get('shutter');
    if (sprite) {
      const displayWidth = Math.max(58, width * 2.6);
      ctx.drawImage(sprite, -displayWidth / 2, -height / 2, displayWidth, height);
      return;
    }
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
    const sprite = this.assets.get('block-stone');
    if (sprite) {
      ctx.drawImage(sprite, -radius, -radius, radius * 2, radius * 2);
      return;
    }
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

  private drawSeesaw(entity: GameEntityView): void {
    const ctx = this.context;
    const width = entity.width ?? 180;
    const height = entity.height ?? 14;
    ctx.fillStyle = '#79502e';
    ctx.strokeStyle = '#3d2b20';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, height * 0.35);
    ctx.lineTo(-17, height + 22);
    ctx.lineTo(17, height + 22);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#dca45a';
    ctx.strokeStyle = '#714327';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(-width / 2, -height / 2, width, height, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#f4d193';
    ctx.fillRect(-width / 2 + 8, -height / 2 + 2, width - 16, 2);
    for (const x of [-width / 2 + 14, width / 2 - 14]) {
      ctx.fillStyle = '#4f6470';
      ctx.beginPath();
      ctx.arc(x, 0, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawStructuralLinks(entities: readonly GameEntityView[]): void {
    const blocks = entities.filter((entity) => entity.alive && entity.kind === 'block');
    const links: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
    for (let i = 0; i < blocks.length && links.length < 22; i++) {
      const a = blocks[i];
      const aw = (a.width ?? 24) / 2;
      const ah = (a.height ?? 24) / 2;
      for (let j = i + 1; j < blocks.length && links.length < 22; j++) {
        const b = blocks[j];
        const bw = (b.width ?? 24) / 2;
        const bh = (b.height ?? 24) / 2;
        const dy = Math.abs(a.y - b.y);
        const dx = Math.abs(a.x - b.x);
        if (dy < 18 && dx > Math.max(aw, bw) && dx - aw - bw >= -5 && dx - aw - bw <= 36) {
          const direction = Math.sign(b.x - a.x);
          links.push({ x1: a.x + direction * aw, y1: (a.y + b.y) / 2, x2: b.x - direction * bw, y2: (a.y + b.y) / 2 });
        } else if (dx < 18 && dy > Math.max(ah, bh) && dy - ah - bh >= -5 && dy - ah - bh <= 28) {
          const direction = Math.sign(b.y - a.y);
          links.push({ x1: (a.x + b.x) / 2, y1: a.y + direction * ah, x2: (a.x + b.x) / 2, y2: b.y - direction * bh });
        }
      }
    }
    const ctx = this.context;
    ctx.save();
    ctx.lineCap = 'round';
    for (const link of links) {
      const horizontal = Math.abs(link.x2 - link.x1) >= Math.abs(link.y2 - link.y1);
      if (horizontal) {
        ctx.strokeStyle = 'rgba(53, 37, 27, .8)';
        ctx.lineWidth = 10;
        ctx.beginPath(); ctx.moveTo(link.x1, link.y1); ctx.lineTo(link.x2, link.y2); ctx.stroke();
        ctx.strokeStyle = '#b77b43';
        ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(link.x1, link.y1); ctx.lineTo(link.x2, link.y2); ctx.stroke();
        ctx.strokeStyle = 'rgba(255, 220, 157, .8)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(link.x1, link.y1 - 2); ctx.lineTo(link.x2, link.y2 - 2); ctx.stroke();
      } else {
        ctx.strokeStyle = '#394b54';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(link.x1, link.y1); ctx.lineTo(link.x2, link.y2); ctx.stroke();
        const length = Math.abs(link.y2 - link.y1);
        for (let t = 6; t < length; t += 11) {
          const y = link.y1 + Math.sign(link.y2 - link.y1) * t;
          ctx.strokeStyle = '#c1c8bd';
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.ellipse(link.x1, y, 3.5, 5, 0, 0, Math.PI * 2); ctx.stroke();
        }
      }
      for (const [x, y] of [[link.x1, link.y1], [link.x2, link.y2]]) {
        ctx.fillStyle = '#e6bd79';
        ctx.beginPath(); ctx.arc(x, y, 3.2, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#68452d'; ctx.lineWidth = 1.3; ctx.stroke();
      }
    }
    ctx.restore();
  }

  private drawFan(entity: GameEntityView, nowMs: number): void {
    const ctx = this.context;
    ctx.save();
    const width = entity.width ?? 220;
    const height = entity.height ?? 460;
    const bottom = entity.y + height / 2 - 66;
    const top = entity.y - height / 2 + 20;
    const pulse = 0.72 + Math.sin(nowMs / 430) * 0.12;
    ctx.lineCap = 'round';
    for (const lane of [-1, 0, 1]) {
      const startX = entity.x + lane * width * 0.2;
      const endX = entity.x + lane * width * 0.34;
      ctx.beginPath();
      ctx.moveTo(startX, bottom);
      ctx.bezierCurveTo(startX - lane * width * 0.1, bottom - height * 0.28,
        endX + lane * width * 0.14, top + height * 0.28, endX, top);
      ctx.strokeStyle = `rgba(142, 232, 247, ${0.16 * pulse})`;
      ctx.lineWidth = lane === 0 ? 30 : 22;
      ctx.stroke();
      ctx.strokeStyle = `rgba(225, 250, 255, ${0.45 * pulse})`;
      ctx.lineWidth = lane === 0 ? 3 : 2;
      ctx.stroke();
    }
    for (let i = 0; i < 20; i++) {
      const t = (nowMs * 0.00022 + i * 0.173) % 1;
      const y = bottom - t * (bottom - top);
      const sway = Math.sin(nowMs * 0.0014 + i * 2.1) * width * 0.06;
      const spread = (0.15 + t * 0.34) * width;
      const x = entity.x + sway + Math.sin(i * 4.7) * spread;
      const radius = 1.8 + ((i * 7) % 4) * 0.55;
      ctx.fillStyle = `rgba(231, 251, 255, ${0.28 + (1 - t) * 0.42})`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    const sprite = this.assets.get('fan');
    if (sprite) {
      const size = Math.min(104, Math.max(74, width * 0.72));
      ctx.drawImage(sprite, entity.x - size / 2, entity.y + height / 2 - size, size, size);
    }
    ctx.restore();
  }

  private drawRoundProp(id: 'tire' | 'gear', radius: number): void {
    const image = this.assets.get(id);
    if (image) {
      const size = radius * 2.2;
      this.context.drawImage(image, -size / 2, -size / 2, size, size);
      return;
    }
    this.context.fillStyle = id === 'gear' ? '#d79a3f' : '#403b39';
    this.context.beginPath();
    this.context.arc(0, 0, radius, 0, Math.PI * 2);
    this.context.fill();
  }

  private drawChandelier(entity: GameEntityView): void {
    const image = this.assets.get('chandelier');
    const width = Math.max(112, (entity.width ?? 100) * 1.25);
    const height = Math.max(76, (entity.height ?? 36) * 2.3);
    if (image) {
      this.context.drawImage(image, -width / 2, -height / 2, width, height);
      return;
    }
    this.context.fillStyle = '#d79a3f';
    this.context.fillRect(-width / 2, -height / 4, width, height / 2);
  }

  private drawChandelierSupport(entity: GameEntityView): void {
    if (entity.attached === false) return;
    const anchor = entity.anchor ?? { x: entity.x, y: 175 };
    const ctx = this.context;
    ctx.save();
    ctx.strokeStyle = '#6a4a2d';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(anchor.x, anchor.y);
    ctx.lineTo(entity.x, entity.y - Math.max(34, (entity.height ?? 36) * 0.85));
    ctx.stroke();
    ctx.fillStyle = '#d79a3f';
    ctx.beginPath();
    ctx.arc(anchor.x, anchor.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
