export interface WordEntry {
  word: string;
  clue: string;
  category: string;
}

export interface PlacedWord {
  word: string;
  clue: string;
  row: number;
  col: number;
  direction: 'across' | 'down';
  number: number;
}

export interface Cell {
  letter: string;
  userInput: string;
  isBlack: boolean;
  number: number | null;
  acrossClue: number | null;
  downClue: number | null;
  isSolutionCell: boolean;
  solutionIndex: number | null;
  revealed: boolean;
  checked: boolean;
  isCorrect: boolean | null;
}

export interface Puzzle {
  grid: Cell[][];
  placedWords: PlacedWord[];
  solutionWord: string;
  solutionCells: { row: number; col: number; index: number }[];
}
