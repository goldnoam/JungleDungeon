
import { TileType, Position } from '../types';

export const generateMaze = (size: number): TileType[][] => {
  const maze: TileType[][] = Array(size).fill(null).map(() => Array(size).fill(TileType.WALL));

  const walk = (x: number, y: number) => {
    maze[y][x] = TileType.PATH;

    const dirs = [
      [0, 2], [0, -2], [2, 0], [-2, 0]
    ].sort(() => Math.random() - 0.5);

    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;

      if (nx > 0 && nx < size - 1 && ny > 0 && ny < size - 1 && maze[ny][nx] === TileType.WALL) {
        maze[y + dy / 2][x + dx / 2] = TileType.PATH;
        walk(nx, ny);
      }
    }
  };

  walk(1, 1);
  
  // Ensure exit is reachable and open
  maze[size - 2][size - 2] = TileType.TREASURE;
  maze[size - 3][size - 2] = TileType.PATH;
  maze[size - 2][size - 3] = TileType.PATH;

  return maze;
};

export const getRandomPathPosition = (maze: TileType[][], excludePos: Position): Position => {
  const paths: Position[] = [];
  maze.forEach((row, y) => {
    row.forEach((tile, x) => {
      if (tile === TileType.PATH && (x !== excludePos.x || y !== excludePos.y)) {
        paths.push({ x, y });
      }
    });
  });
  return paths[Math.floor(Math.random() * paths.length)];
};
