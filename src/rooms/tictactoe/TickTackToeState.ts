import { MapSchema, Schema, type, view } from '@colyseus/schema';

export class AuthData {
  name: string;
}
export class Player extends Schema {
  @type('string') name: string;
  @type('string') character: 'X' | 'O';
}
export class TickTackToeState extends Schema {
  @type('string') tiles = '---------';
  @type({ map: Player }) players = new MapSchema<Player>();
  @type('string') turn: string;
  @view(1) @type('boolean') gameOver: boolean = false;
}
