import { Room } from '@colyseus/core';
import { BattleState, PlayerState } from '../state/PlayerState.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const HERO_STATS = {
  guardian: { hp: 1200, mana: 300 },
  arcanist: { hp: 850, mana: 480 },
  ranger: { hp: 950, mana: 340 },
};

export class BattleRoom extends Room {
  maxClients = 10;

  onCreate(options = {}) {
    this.setState(new BattleState());
    this.roomMode = String(options.mode || 'classic');
    this.lastAttack = new Map();
    this.cooldowns = new Map();
    this.setMetadata({ mode: this.roomMode, privateRoom: Boolean(options.private) });

    this.onMessage('move', (client, input) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || !input) return;
      const x = Number(input.x), z = Number(input.z), rotation = Number(input.rotation);
      if (!Number.isFinite(x) || !Number.isFinite(z)) return;
      const targetX = clamp(x, -30, 30);
      const targetZ = clamp(z, -31, 31);
      const dx = targetX - player.x, dz = targetZ - player.z;
      const distance = Math.hypot(dx, dz);
      const maxStep = 0.92;
      if (distance > maxStep) {
        player.x += dx / distance * maxStep;
        player.z += dz / distance * maxStep;
      } else {
        player.x = targetX;
        player.z = targetZ;
      }
      if (Number.isFinite(rotation)) player.rotation = rotation;
    });

    this.onMessage('attack', (client) => {
      const attacker = this.state.players.get(client.sessionId);
      if (!attacker) return;
      const now = Date.now();
      if (now - (this.lastAttack.get(client.sessionId) || 0) < 560) return;
      this.lastAttack.set(client.sessionId, now);
      const target = this.findTarget(attacker, 5.8);
      if (!target) {
        this.broadcast('combat', { type: 'miss', attacker: attacker.name });
        return;
      }
      this.damagePlayer(attacker, target, 105, 'attack');
    });

    this.onMessage('skill', (client, input) => {
      const player = this.state.players.get(client.sessionId);
      const key = String(input?.key || '').toLowerCase();
      if (!player || !['q', 'e', 'r'].includes(key)) return;
      const now = Date.now();
      const playerCooldowns = this.cooldowns.get(client.sessionId) || {};
      if ((playerCooldowns[key] || 0) > now) {
        client.send('combat', { type: 'cooldown', key });
        return;
      }
      const costs = { q: 0, e: 65, r: 50 };
      const durations = { q: 4800, e: 7200, r: 11500 };
      if (player.mana < costs[key]) {
        client.send('combat', { type: 'no-mana', key });
        return;
      }
      player.mana -= costs[key];
      playerCooldowns[key] = now + durations[key];
      this.cooldowns.set(client.sessionId, playerCooldowns);
      if (key === 'q') {
        const rotation = Number.isFinite(Number(input.rotation)) ? Number(input.rotation) : player.rotation;
        player.rotation = rotation;
        player.x = clamp(player.x + Math.sin(rotation) * 4.1, -30, 30);
        player.z = clamp(player.z + Math.cos(rotation) * 4.1, -31, 31);
      } else if (key === 'e') {
        const victims = Array.from(this.state.players.values()).filter(other => other.team !== player.team && Math.hypot(other.x - player.x, other.z - player.z) <= 7.5);
        for (const target of victims) this.damagePlayer(player, target, 180, 'arcane');
      } else if (key === 'r') {
        player.hp = Math.min(player.maxHp, player.hp + 260);
        player.mana = Math.min(player.maxMana, player.mana + 10);
      }
      this.broadcast('combat', { type: 'skill', key, attacker: player.name, x: player.x, z: player.z });
    });
  }

  findTarget(attacker, range) {
    let nearest = null;
    let distance = range;
    for (const candidate of this.state.players.values()) {
      if (candidate === attacker || candidate.team === attacker.team || candidate.hp <= 0) continue;
      const d = Math.hypot(candidate.x - attacker.x, candidate.z - attacker.z);
      if (d < distance) { nearest = candidate; distance = d; }
    }
    return nearest;
  }

  damagePlayer(attacker, target, amount, kind) {
    target.hp = Math.max(0, target.hp - amount);
    let killed = false;
    if (target.hp <= 0) {
      killed = true;
      if (attacker.team === 'blue') this.state.blueScore += 1;
      else this.state.redScore += 1;
      this.broadcast('combat', { type: 'kill', attacker: attacker.name, target: target.name, targetSessionId: this.findSessionId(target), team: attacker.team, score: { blue: this.state.blueScore, red: this.state.redScore } });
      const targetId = this.findSessionId(target);
      this.clock.setTimeout(() => {
        const player = this.state.players.get(targetId);
        if (!player) return;
        player.hp = player.maxHp;
        player.mana = player.maxMana;
        player.x = (Math.random() - 0.5) * 4;
        player.z = player.team === 'blue' ? 25 : -25;
      }, 1800);
    } else {
      this.broadcast('combat', { type: 'hit', kind, attacker: attacker.name, target: target.name, targetSessionId: this.findSessionId(target), damage: amount, hp: target.hp });
    }
  }

  findSessionId(target) {
    for (const [sessionId, player] of this.state.players) if (player === target) return sessionId;
    return '';
  }

  onJoin(client, options = {}) {
    const members = Array.from(this.state.players.values());
    const blue = members.filter(p => p.team === 'blue').length;
    const red = members.filter(p => p.team === 'red').length;
    const player = new PlayerState();
    const heroClass = ['guardian', 'arcanist', 'ranger'].includes(options.heroClass) ? options.heroClass : 'guardian';
    const stats = HERO_STATS[heroClass];
    player.name = String(options.name || 'Player').replace(/[<>]/g, '').slice(0, 20) || 'Player';
    player.heroClass = heroClass;
    player.team = blue <= red ? 'blue' : 'red';
    player.maxHp = stats.hp; player.hp = stats.hp;
    player.maxMana = stats.mana; player.mana = stats.mana;
    player.x = (Math.random() - 0.5) * 4;
    player.z = player.team === 'blue' ? 25 : -25;
    player.rotation = player.team === 'blue' ? Math.PI : 0;
    this.state.players.set(client.sessionId, player);
    this.broadcast('system', { type: 'join', name: player.name, team: player.team, count: this.clients.length });
  }

  onLeave(client) {
    const player = this.state.players.get(client.sessionId);
    if (player) this.broadcast('system', { type: 'leave', name: player.name, count: this.clients.length - 1 });
    this.state.players.delete(client.sessionId);
    this.lastAttack.delete(client.sessionId);
    this.cooldowns.delete(client.sessionId);
  }
}
