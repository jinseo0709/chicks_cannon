export type GameStage = 1 | 2 | 3 | 4;

export type GameScreen = 'home' | 'game' | 'leaderboard';

export interface GameSnapshot {
  screen: GameScreen;
  stage: GameStage;
  score: number;
  ammo: number;
  campaignComplete: boolean;
}
