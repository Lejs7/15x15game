import type { Cell, PlacedWord, Puzzle } from './types';
import { wordPool, solutionWords } from './wordPool';

const GRID_SIZE = 15;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function createEmptyGrid(): string[][] {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => '')
  );
}

/**
 * Tracks which word "owns" each cell and in which direction.
 * Key: "row-col", Value: set of directions ('across' | 'down')
 */
type OccupiedMap = Map<string, Set<'across' | 'down'>>;

function getOccupied(placed: PlacedWord[]): OccupiedMap {
  const map: OccupiedMap = new Map();
  for (const pw of placed) {
    for (let i = 0; i < pw.word.length; i++) {
      const r = pw.direction === 'across' ? pw.row : pw.row + i;
      const c = pw.direction === 'across' ? pw.col + i : pw.col;
      const key = `${r}-${c}`;
      if (!map.has(key)) map.set(key, new Set());
      map.get(key)!.add(pw.direction);
    }
  }
  return map;
}

function canPlaceWord(
  grid: string[][],
  word: string,
  row: number,
  col: number,
  direction: 'across' | 'down',
  placed: PlacedWord[],
  occupied: OccupiedMap
): boolean {
  const len = word.length;
  const isAcross = direction === 'across';

  // Check bounds
  if (isAcross && col + len > GRID_SIZE) return false;
  if (!isAcross && row + len > GRID_SIZE) return false;

  // Check the cell BEFORE the word (must be empty or border)
  // This prevents words from extending existing words in the same direction
  if (isAcross) {
    if (col > 0 && grid[row][col - 1] !== '') return false;
  } else {
    if (row > 0 && grid[row - 1][col] !== '') return false;
  }

  // Check the cell AFTER the word (must be empty or border)
  if (isAcross) {
    if (col + len < GRID_SIZE && grid[row][col + len] !== '') return false;
  } else {
    if (row + len < GRID_SIZE && grid[row + len][col] !== '') return false;
  }

  let intersectionCount = 0;

  for (let i = 0; i < len; i++) {
    const r = isAcross ? row : row + i;
    const c = isAcross ? col + i : col;
    const cellKey = `${r}-${c}`;
    const existing = grid[r][c];

    if (existing !== '') {
      // Cell is already occupied
      // 1. The letter must match
      if (existing !== word[i]) return false;

      // 2. The cell must be occupied by a word in the OTHER direction only
      //    (two words in the same direction cannot share a cell)
      const dirs = occupied.get(cellKey);
      if (dirs && dirs.has(direction)) return false;

      // 3. It must be occupied by a word in the perpendicular direction
      //    This is a valid crossing
      const otherDir = isAcross ? 'down' : 'across';
      if (!dirs || !dirs.has(otherDir)) return false;

      intersectionCount++;
    } else {
      // Cell is empty — check that we don't create illegal adjacency
      // We must not place a letter next to an existing letter in the
      // parallel direction (that would merge words side-by-side)

      if (isAcross) {
        // Check above
        if (r > 0 && grid[r - 1][c] !== '') {
          // This is only OK if that cell above is part of a DOWN word that
          // will cross through (r, c). But since (r,c) is empty, no down word
          // goes through it yet. So this adjacency is illegal.
          return false;
        }
        // Check below
        if (r < GRID_SIZE - 1 && grid[r + 1][c] !== '') {
          return false;
        }
      } else {
        // Check left
        if (c > 0 && grid[r][c - 1] !== '') {
          return false;
        }
        // Check right
        if (c < GRID_SIZE - 1 && grid[r][c + 1] !== '') {
          return false;
        }
      }
    }
  }

  // Must have at least one intersection (except for the first word)
  if (placed.length > 0 && intersectionCount === 0) return false;

  return true;
}

function placeWord(grid: string[][], word: string, row: number, col: number, direction: 'across' | 'down') {
  for (let i = 0; i < word.length; i++) {
    if (direction === 'across') {
      grid[row][col + i] = word[i];
    } else {
      grid[row + i][col] = word[i];
    }
  }
}

function findBestPlacement(
  grid: string[][],
  word: string,
  placed: PlacedWord[],
  occupied: OccupiedMap
): { row: number; col: number; direction: 'across' | 'down'; score: number } | null {
  let best: { row: number; col: number; direction: 'across' | 'down'; score: number } | null = null;

  const directions: ('across' | 'down')[] = ['across', 'down'];

  for (const dir of directions) {
    const isAcross = dir === 'across';
    const maxR = isAcross ? GRID_SIZE : GRID_SIZE - word.length;
    const maxC = isAcross ? GRID_SIZE - word.length : GRID_SIZE;

    for (let r = 0; r <= maxR - (isAcross ? 1 : 0); r++) {
      for (let c = 0; c <= maxC - (isAcross ? 0 : 1); c++) {
        if (canPlaceWord(grid, word, r, c, dir, placed, occupied)) {
          let score = 0;
          // Count intersections
          for (let i = 0; i < word.length; i++) {
            const cr = isAcross ? r : r + i;
            const cc = isAcross ? c + i : c;
            if (grid[cr][cc] === word[i] && grid[cr][cc] !== '') score += 10;
          }
          // Prefer central placement
          const centerR = isAcross ? r : r + word.length / 2;
          const centerC = isAcross ? c + word.length / 2 : c;
          score -= (Math.abs(centerR - 7) + Math.abs(centerC - 7)) * 0.5;

          if (!best || score > best.score) {
            best = { row: r, col: c, direction: dir, score };
          }
        }
      }
    }
  }

  return best;
}

export function generatePuzzle(): Puzzle {
  const solutionWord = solutionWords[Math.floor(Math.random() * solutionWords.length)];

  let bestPlaced: PlacedWord[] = [];
  let bestGrid: string[][] = createEmptyGrid();

  // Try multiple times to get a good puzzle
  for (let attempt = 0; attempt < 8; attempt++) {
    const grid = createEmptyGrid();
    const placed: PlacedWord[] = [];
    const shuffled = shuffle(wordPool).filter(w => w.word.length <= GRID_SIZE);

    // Place first word in center horizontally
    if (shuffled.length > 0) {
      const first = shuffled[0];
      const startCol = Math.floor((GRID_SIZE - first.word.length) / 2);
      const startRow = Math.floor(GRID_SIZE / 2);
      placeWord(grid, first.word, startRow, startCol, 'across');
      placed.push({
        word: first.word,
        clue: first.clue,
        row: startRow,
        col: startCol,
        direction: 'across',
        number: 0,
      });
    }

    for (let i = 1; i < shuffled.length && placed.length < 28; i++) {
      const entry = shuffled[i];
      const occupied = getOccupied(placed);
      const placement = findBestPlacement(grid, entry.word, placed, occupied);
      if (placement && placement.score > 0) {
        placeWord(grid, entry.word, placement.row, placement.col, placement.direction);
        placed.push({
          word: entry.word,
          clue: entry.clue,
          row: placement.row,
          col: placement.col,
          direction: placement.direction,
          number: 0,
        });
      }
    }

    if (placed.length > bestPlaced.length) {
      bestPlaced = placed;
      bestGrid = grid.map(r => [...r]);
    }
  }

  // Number the clues
  const numberMap = new Map<string, number>();
  let num = 1;

  // Sort placed words by position (top-to-bottom, left-to-right)
  bestPlaced.sort((a, b) => {
    if (a.row !== b.row) return a.row - b.row;
    return a.col - b.col;
  });

  for (const pw of bestPlaced) {
    const key = `${pw.row}-${pw.col}`;
    if (!numberMap.has(key)) {
      numberMap.set(key, num++);
    }
    pw.number = numberMap.get(key)!;
  }

  // Build cell grid
  const cellGrid: Cell[][] = Array.from({ length: GRID_SIZE }, (_, r) =>
    Array.from({ length: GRID_SIZE }, (_, c) => ({
      letter: bestGrid[r][c],
      userInput: '',
      isBlack: bestGrid[r][c] === '',
      number: null,
      acrossClue: null,
      downClue: null,
      isSolutionCell: false,
      solutionIndex: null,
      revealed: false,
      checked: false,
      isCorrect: null,
    }))
  );

  // Set numbers and clue references
  for (const pw of bestPlaced) {
    const cell = cellGrid[pw.row][pw.col];
    // A cell can have a number from across or down — use the smallest
    if (cell.number === null || pw.number < cell.number) {
      cell.number = pw.number;
    }
    if (pw.direction === 'across') {
      for (let i = 0; i < pw.word.length; i++) {
        cellGrid[pw.row][pw.col + i].acrossClue = pw.number;
      }
    } else {
      for (let i = 0; i < pw.word.length; i++) {
        cellGrid[pw.row + i][pw.col].downClue = pw.number;
      }
    }
  }

  // Assign solution word cells — max 1 solution letter per word!
  // Build a mapping: for each cell, which word indices does it belong to?
  const cellToWords = new Map<string, number[]>();
  for (let wi = 0; wi < bestPlaced.length; wi++) {
    const pw = bestPlaced[wi];
    for (let i = 0; i < pw.word.length; i++) {
      const r = pw.direction === 'across' ? pw.row : pw.row + i;
      const c = pw.direction === 'across' ? pw.col + i : pw.col;
      const key = `${r}-${c}`;
      if (!cellToWords.has(key)) cellToWords.set(key, []);
      cellToWords.get(key)!.push(wi);
    }
  }

  const letterCells: { row: number; col: number }[] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (!cellGrid[r][c].isBlack) {
        letterCells.push({ row: r, col: c });
      }
    }
  }

  const solutionCells: { row: number; col: number; index: number }[] = [];
  const usedCells = new Set<string>();
  const usedWords = new Set<number>(); // Track words that already have a solution letter

  for (let i = 0; i < solutionWord.length; i++) {
    const letter = solutionWord[i];
    const candidates = shuffle(letterCells).filter(lc => {
      if (cellGrid[lc.row][lc.col].letter !== letter) return false;
      if (usedCells.has(`${lc.row}-${lc.col}`)) return false;

      // Check that NONE of the words this cell belongs to already have a solution letter
      const wordIndices = cellToWords.get(`${lc.row}-${lc.col}`) || [];
      for (const wi of wordIndices) {
        if (usedWords.has(wi)) return false;
      }
      return true;
    });

    if (candidates.length > 0) {
      const chosen = candidates[0];
      solutionCells.push({ row: chosen.row, col: chosen.col, index: i });
      usedCells.add(`${chosen.row}-${chosen.col}`);
      cellGrid[chosen.row][chosen.col].isSolutionCell = true;
      cellGrid[chosen.row][chosen.col].solutionIndex = i;

      // Mark all words of this cell as used
      const wordIndices = cellToWords.get(`${chosen.row}-${chosen.col}`) || [];
      for (const wi of wordIndices) {
        usedWords.add(wi);
      }
    } else {
      // Fallback: allow reusing a word, but still prefer cells where at least
      // one word direction is unused
      const fallbackCandidates = shuffle(letterCells).filter(lc => {
        if (cellGrid[lc.row][lc.col].letter !== letter) return false;
        if (usedCells.has(`${lc.row}-${lc.col}`)) return false;
        return true;
      });

      if (fallbackCandidates.length > 0) {
        const chosen = fallbackCandidates[0];
        solutionCells.push({ row: chosen.row, col: chosen.col, index: i });
        usedCells.add(`${chosen.row}-${chosen.col}`);
        cellGrid[chosen.row][chosen.col].isSolutionCell = true;
        cellGrid[chosen.row][chosen.col].solutionIndex = i;

        const wordIndices = cellToWords.get(`${chosen.row}-${chosen.col}`) || [];
        for (const wi of wordIndices) {
          usedWords.add(wi);
        }
      } else {
        // Last resort: pick any unused cell
        const anyCell = letterCells.find(lc => !usedCells.has(`${lc.row}-${lc.col}`));
        if (anyCell) {
          solutionCells.push({ row: anyCell.row, col: anyCell.col, index: i });
          usedCells.add(`${anyCell.row}-${anyCell.col}`);
          cellGrid[anyCell.row][anyCell.col].isSolutionCell = true;
          cellGrid[anyCell.row][anyCell.col].solutionIndex = i;
          cellGrid[anyCell.row][anyCell.col].letter = letter;
        }
      }
    }
  }

  return {
    grid: cellGrid,
    placedWords: bestPlaced,
    solutionWord,
    solutionCells,
  };
}
