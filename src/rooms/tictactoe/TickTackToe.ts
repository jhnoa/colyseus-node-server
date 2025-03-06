import http from 'http';
import { Client, Room } from 'colyseus';

import { AuthData, Player, TickTackToeState } from './TickTackToeState';

export class TickTackToe extends Room<TickTackToeState> {
  maxClients: number = 2;
  state = new TickTackToeState();
  // (optional) Validate client auth token before joining/creating the room
  static async onAuth(token: string, request: http.IncomingMessage) {
    let authData = new AuthData();
    authData.name = token;
    return authData;
  }

  // When room is initialized
  onCreate(options: any) {
    this.onMessage('input', (client, message) => {
      if (this.state.players.size === 1) {
        client.send('error', 'Wait for 2nd player');
        return;
      }
      if (this.state.turn !== client.sessionId) {
        client.send('error', 'Not your turn');
        return;
      }
      let sanitized = String(message).trim();
      if (sanitized.length !== 1) {
        client.send('error', 'Input should be 1 character long');
        return;
      }
      let index = parseInt(sanitized, 10);
      let error = this.setToe(
        index,
        this.state.players.get(client.sessionId).character,
      );
      if (error) {
        client.send('error', error);
        return;
      }
      let [win, winningIndexes] = this.winCheck();
      if (win) {
        this.broadcast('win', {
          player: client.sessionId,
          indexes: winningIndexes.join(','),
        });
        this.state.gameOver = true;
        this.disconnect();
      }

      this.state.turn = this.state.players
        .keys()
        .reduce((prev, cur) => (cur === this.state.turn ? prev : cur), '');
    });
  }

  // When client successfully join the room
  onJoin(client: Client, options: any, auth: AuthData) {
    if (this.state.players.has(client.sessionId)) {
      console.log('Double Login');
    } else {
      let player: Player = new Player();
      player.name = `Player - ${options.name}`;
      player.character = this.state.players.size ? 'X' : 'O';
      this.state.players.set(client.sessionId, player);
      if (this.state.players.size == 1) {
        this.state.turn = client.sessionId;
      }
      if (this.state.players.size == 2) {
        this.lock();
      }
    }
  }

  // When a client leaves the room
  onLeave(client: Client, consented: boolean) {
    if (!this.state.gameOver) {
      let player = this.state.players
        .keys()
        .reduce((prev, cur) => (cur === client.sessionId ? prev : cur), '');
      this.broadcast('win-by-concede', { player });
      this.disconnect();
    }
  }

  // Cleanup callback, called after there are no more clients in the room. (see `autoDispose`)
  onDispose() {}
  private setToe(index: number, character: string) {
    if (index < 0 || index >= 9) {
      return 'Out of bound';
    }
    let char = this.state.tiles.at(index);
    if (char !== '-') {
      return 'Filled plot';
    }
    this.state.tiles =
      this.state.tiles.substring(0, index) +
      character +
      this.state.tiles.substring(index + character.length);
  }
  private readonly winToCheck: [number, number, number][] = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  private winCheck(): [true, [number, number, number]] | [false, undefined] {
    let winIndex = this.winToCheck
      .map((indexes) => {
        let list = indexes.map((index) => this.state.tiles.at(index));
        console.log(list);
        return list[0] === list[1] && list[1] === list[2] && list[2] !== '-';
      })
      .reduce((prev, cur, index) => (prev === -1 && cur ? index : prev), -1);
    console.log(
      this.winToCheck.map((indexes) => {
        let list = indexes.map((index) => this.state.tiles.at(index));
        return list[0] === list[1] && list[1] === list[2] && list[2] !== '-';
      }),
    );
    if (winIndex !== -1) return [true, this.winToCheck[winIndex]];

    return [false, undefined];
  }
}
