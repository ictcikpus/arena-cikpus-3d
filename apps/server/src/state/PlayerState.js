import { Schema, type, MapSchema } from '@colyseus/schema';

export class PlayerState extends Schema {
  constructor() {
    super();
    this.name = 'Player';
    this.team = 'blue';
    this.heroClass = 'guardian';
    this.x = 0;
    this.z = 15;
    this.rotation = Math.PI;
    this.hp = 1000;
    this.maxHp = 1000;
    this.mana = 300;
    this.maxMana = 300;
  }
}
type('string')(PlayerState.prototype, 'name');
type('string')(PlayerState.prototype, 'team');
type('string')(PlayerState.prototype, 'heroClass');
type('number')(PlayerState.prototype, 'x');
type('number')(PlayerState.prototype, 'z');
type('number')(PlayerState.prototype, 'rotation');
type('number')(PlayerState.prototype, 'hp');
type('number')(PlayerState.prototype, 'maxHp');
type('number')(PlayerState.prototype, 'mana');
type('number')(PlayerState.prototype, 'maxMana');

export class BattleState extends Schema {
  constructor() {
    super();
    this.players = new MapSchema();
    this.blueScore = 0;
    this.redScore = 0;
  }
}
type({ map: PlayerState })(BattleState.prototype, 'players');
type('number')(BattleState.prototype, 'blueScore');
type('number')(BattleState.prototype, 'redScore');
