import { useState, useCallback, useEffect, useRef } from 'react';
import type { Cell, Puzzle, PlacedWord } from './types';
import { generatePuzzle } from './puzzleGenerator';

const GRID_SIZE = 15;

export function App() {
  const [puzzle, setPuzzle] = useState<Puzzle>(() => generatePuzzle());
  const [grid, setGrid] = useState<Cell[][]>(puzzle.grid);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [direction, setDirection] = useState<'across' | 'down'>('across');
  const [, setSelectedClue] = useState<number | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [showCongrats, setShowCongrats] = useState(false);
  const [solutionInput, setSolutionInput] = useState('');
  const [solutionCorrect, setSolutionCorrect] = useState<boolean | null>(null);
  const [hintsLetterUsed, setHintsLetterUsed] = useState(0);
  const [hintsWordUsed, setHintsWordUsed] = useState(0);
  const MAX_LETTER_HINTS = 3;
  const MAX_WORD_HINTS = 1;
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('crossword-dark-mode');
      if (stored !== null) return stored === 'true';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });
  const cellRefs = useRef<(HTMLInputElement | null)[][]>(
    Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null))
  );

  // Dark mode effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('crossword-dark-mode', String(darkMode));
  }, [darkMode]);

  // Timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRunning && !isComplete) {
      interval = setInterval(() => setTimer(t => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, isComplete]);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Check if puzzle is complete
  const checkComplete = useCallback((g: Cell[][]) => {
    let allFilled = true;
    let allCorrect = true;
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (!g[r][c].isBlack) {
          if (g[r][c].userInput === '') allFilled = false;
          if (g[r][c].userInput.toUpperCase() !== g[r][c].letter) allCorrect = false;
        }
      }
    }
    if (allFilled && allCorrect) {
      setIsComplete(true);
      setIsRunning(false);
      setShowCongrats(true);
    }
  }, []);

  const getActiveClue = useCallback((): PlacedWord | null => {
    if (!selectedCell) return null;
    const cell = grid[selectedCell.row][selectedCell.col];
    const clueNum = direction === 'across' ? cell.acrossClue : cell.downClue;
    if (clueNum === null) {
      const altNum = direction === 'across' ? cell.downClue : cell.acrossClue;
      if (altNum !== null) {
        return puzzle.placedWords.find(
          pw => pw.number === altNum && pw.direction === (direction === 'across' ? 'down' : 'across')
        ) || null;
      }
      return null;
    }
    return puzzle.placedWords.find(pw => pw.number === clueNum && pw.direction === direction) || null;
  }, [selectedCell, direction, grid, puzzle]);

  const getClueCells = useCallback((clue: PlacedWord): { row: number; col: number }[] => {
    const cells: { row: number; col: number }[] = [];
    for (let i = 0; i < clue.word.length; i++) {
      if (clue.direction === 'across') {
        cells.push({ row: clue.row, col: clue.col + i });
      } else {
        cells.push({ row: clue.row + i, col: clue.col });
      }
    }
    return cells;
  }, []);

  const handleCellClick = useCallback((row: number, col: number) => {
    const cell = grid[row][col];
    if (cell.isBlack) return;

    if (selectedCell && selectedCell.row === row && selectedCell.col === col) {
      setDirection(d => {
        const newDir = d === 'across' ? 'down' : 'across';
        const clueNum = newDir === 'across' ? cell.acrossClue : cell.downClue;
        if (clueNum !== null) return newDir;
        return d;
      });
    } else {
      setSelectedCell({ row, col });
      const hasAcross = cell.acrossClue !== null;
      const hasDown = cell.downClue !== null;
      if (hasAcross && !hasDown) setDirection('across');
      else if (!hasAcross && hasDown) setDirection('down');
    }

    cellRefs.current[row][col]?.focus();
  }, [selectedCell, grid]);

  const moveToNextCell = useCallback((row: number, col: number, dir: 'across' | 'down') => {
    let nr = row;
    let nc = col;
    if (dir === 'across') nc++;
    else nr++;

    if (nr < GRID_SIZE && nc < GRID_SIZE && !grid[nr][nc].isBlack) {
      setSelectedCell({ row: nr, col: nc });
      cellRefs.current[nr][nc]?.focus();
    }
  }, [grid]);

  const moveToPrevCell = useCallback((row: number, col: number, dir: 'across' | 'down') => {
    let nr = row;
    let nc = col;
    if (dir === 'across') nc--;
    else nr--;

    if (nr >= 0 && nc >= 0 && !grid[nr][nc].isBlack) {
      setSelectedCell({ row: nr, col: nc });
      cellRefs.current[nr][nc]?.focus();
    }
  }, [grid]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, row: number, col: number) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const activeClue = getActiveClue();
      if (activeClue) {
        const clues = puzzle.placedWords.filter(pw => pw.direction === direction);
        const idx = clues.findIndex(c => c.number === activeClue.number);
        const nextIdx = (idx + (e.shiftKey ? -1 : 1) + clues.length) % clues.length;
        const nextClue = clues[nextIdx];
        setSelectedCell({ row: nextClue.row, col: nextClue.col });
        setSelectedClue(nextClue.number);
        cellRefs.current[nextClue.row][nextClue.col]?.focus();
      }
      return;
    }

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setDirection('across');
      moveToNextCell(row, col, 'across');
      return;
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setDirection('across');
      moveToPrevCell(row, col, 'across');
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setDirection('down');
      moveToNextCell(row, col, 'down');
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setDirection('down');
      moveToPrevCell(row, col, 'down');
      return;
    }

    if (e.key === 'Backspace') {
      e.preventDefault();
      const newGrid = grid.map(r => r.map(c => ({ ...c })));
      if (newGrid[row][col].userInput === '') {
        moveToPrevCell(row, col, direction);
        let pr = row, pc = col;
        if (direction === 'across') pc--;
        else pr--;
        if (pr >= 0 && pc >= 0 && !newGrid[pr][pc].isBlack) {
          newGrid[pr][pc].userInput = '';
          newGrid[pr][pc].checked = false;
          newGrid[pr][pc].isCorrect = null;
        }
      } else {
        newGrid[row][col].userInput = '';
        newGrid[row][col].checked = false;
        newGrid[row][col].isCorrect = null;
      }
      setGrid(newGrid);
      return;
    }

    if (e.key === 'Delete') {
      e.preventDefault();
      const newGrid = grid.map(r => r.map(c => ({ ...c })));
      newGrid[row][col].userInput = '';
      newGrid[row][col].checked = false;
      newGrid[row][col].isCorrect = null;
      setGrid(newGrid);
      return;
    }

    if (/^[a-zA-ZäöüÄÖÜß]$/.test(e.key)) {
      e.preventDefault();
      const letter = e.key.toUpperCase();
      const newGrid = grid.map(r => r.map(c => ({ ...c })));
      newGrid[row][col].userInput = letter;
      newGrid[row][col].checked = false;
      newGrid[row][col].isCorrect = null;
      setGrid(newGrid);
      moveToNextCell(row, col, direction);
      checkComplete(newGrid);
    }
  }, [grid, direction, moveToNextCell, moveToPrevCell, getActiveClue, puzzle, checkComplete]);

  const handleClueClick = useCallback((clue: PlacedWord) => {
    setSelectedCell({ row: clue.row, col: clue.col });
    setDirection(clue.direction);
    setSelectedClue(clue.number);
    cellRefs.current[clue.row][clue.col]?.focus();
  }, []);

  const revealCell = useCallback(() => {
    if (!selectedCell) return;
    if (hintsLetterUsed >= MAX_LETTER_HINTS) return;
    const cell = grid[selectedCell.row][selectedCell.col];
    if (cell.isBlack || cell.revealed || cell.userInput.toUpperCase() === cell.letter) return;
    const newGrid = grid.map(r => r.map(c => ({ ...c })));
    const targetCell = newGrid[selectedCell.row][selectedCell.col];
    targetCell.userInput = targetCell.letter;
    targetCell.revealed = true;
    targetCell.checked = true;
    targetCell.isCorrect = true;
    setGrid(newGrid);
    setHintsLetterUsed(prev => prev + 1);
    checkComplete(newGrid);
  }, [selectedCell, grid, checkComplete, hintsLetterUsed]);

  const revealWord = useCallback(() => {
    if (hintsWordUsed >= MAX_WORD_HINTS) return;
    const activeClue = getActiveClue();
    if (!activeClue) return;
    const newGrid = grid.map(r => r.map(c => ({ ...c })));
    const cells = getClueCells(activeClue);
    for (const { row, col } of cells) {
      newGrid[row][col].userInput = newGrid[row][col].letter;
      newGrid[row][col].revealed = true;
      newGrid[row][col].checked = true;
      newGrid[row][col].isCorrect = true;
    }
    setGrid(newGrid);
    setHintsWordUsed(prev => prev + 1);
    checkComplete(newGrid);
  }, [getActiveClue, grid, getClueCells, checkComplete, hintsWordUsed]);

  const revealAll = useCallback(() => {
    const newGrid = grid.map(r => r.map(c => ({ ...c })));
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (!newGrid[r][c].isBlack) {
          newGrid[r][c].userInput = newGrid[r][c].letter;
          newGrid[r][c].revealed = true;
          newGrid[r][c].checked = true;
          newGrid[r][c].isCorrect = true;
        }
      }
    }
    setGrid(newGrid);
    setShowSolution(true);
    setIsComplete(true);
    setIsRunning(false);
  }, [grid]);

  const checkPuzzle = useCallback(() => {
    const newGrid = grid.map(r => r.map(c => ({ ...c })));
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (!newGrid[r][c].isBlack && newGrid[r][c].userInput !== '') {
          newGrid[r][c].checked = true;
          newGrid[r][c].isCorrect =
            newGrid[r][c].userInput.toUpperCase() === newGrid[r][c].letter;
        }
      }
    }
    setGrid(newGrid);
  }, [grid]);

  const clearPuzzle = useCallback(() => {
    const newGrid = grid.map(r => r.map(c => ({
      ...c,
      userInput: c.revealed ? c.userInput : '',
      checked: c.revealed ? c.checked : false,
      isCorrect: c.revealed ? c.isCorrect : null,
    })));
    setGrid(newGrid);
  }, [grid]);

  const clearErrors = useCallback(() => {
    const newGrid = grid.map(r => r.map(c => ({ ...c })));
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (newGrid[r][c].checked && newGrid[r][c].isCorrect === false) {
          newGrid[r][c].userInput = '';
          newGrid[r][c].checked = false;
          newGrid[r][c].isCorrect = null;
        }
      }
    }
    setGrid(newGrid);
  }, [grid]);

  const newPuzzle = useCallback(() => {
    const p = generatePuzzle();
    setPuzzle(p);
    setGrid(p.grid);
    setSelectedCell(null);
    setSelectedClue(null);
    setDirection('across');
    setShowSolution(false);
    setIsComplete(false);
    setTimer(0);
    setIsRunning(true);
    setShowCongrats(false);
    setSolutionInput('');
    setSolutionCorrect(null);
    setHintsLetterUsed(0);
    setHintsWordUsed(0);
  }, []);

  const checkSolutionWord = useCallback(() => {
    if (solutionInput.toUpperCase() === puzzle.solutionWord) {
      setSolutionCorrect(true);
    } else {
      setSolutionCorrect(false);
    }
  }, [solutionInput, puzzle.solutionWord]);

  const activeClue = getActiveClue();
  const activeCells = activeClue ? getClueCells(activeClue) : [];
  const activeCellSet = new Set(activeCells.map(c => `${c.row}-${c.col}`));

  const acrossClues = puzzle.placedWords
    .filter(pw => pw.direction === 'across')
    .sort((a, b) => a.number - b.number);
  const downClues = puzzle.placedWords
    .filter(pw => pw.direction === 'down')
    .sort((a, b) => a.number - b.number);

  const totalCells = grid.flat().filter(c => !c.isBlack).length;
  const filledCells = grid.flat().filter(c => !c.isBlack && c.userInput !== '').length;
  const progressPercent = totalCells > 0 ? Math.round((filledCells / totalCells) * 100) : 0;

  const solutionLetters = puzzle.solutionCells.map(sc => {
    const cell = grid[sc.row][sc.col];
    return cell.userInput || '_';
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-950 dark:to-indigo-950 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-indigo-100 dark:border-indigo-900/50 sticky top-0 z-50 transition-colors duration-300">
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-indigo-900/50">
              <span className="text-white text-xl font-bold">✦</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Kreuzworträtsel</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">15×15 Rätsel</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Dark Mode Toggle */}
            <button
              onClick={() => setDarkMode(d => !d)}
              className="relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:focus:ring-indigo-600"
              style={{
                background: darkMode
                  ? 'linear-gradient(135deg, #1e1b4b, #312e81)'
                  : 'linear-gradient(135deg, #93c5fd, #60a5fa)',
              }}
              aria-label="Dark Mode umschalten"
              title={darkMode ? 'Zum hellen Modus wechseln' : 'Zum dunklen Modus wechseln'}
            >
              <div
                className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center text-sm transition-all duration-300 ${
                  darkMode ? 'left-7.5' : 'left-0.5'
                }`}
                style={{ left: darkMode ? '30px' : '2px' }}
              >
                {darkMode ? '🌙' : '☀️'}
              </div>
            </button>

            <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/40 px-3 py-1.5 rounded-lg">
              <span className="text-indigo-600 dark:text-indigo-400 text-sm">⏱</span>
              <span className="font-mono text-sm font-semibold text-indigo-700 dark:text-indigo-300">{formatTime(timer)}</span>
            </div>
            <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/40 px-3 py-1.5 rounded-lg">
              <span className="text-purple-600 dark:text-purple-400 text-sm">📊</span>
              <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">{progressPercent}%</span>
            </div>
            <button
              onClick={() => setIsRunning(r => !r)}
              className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
            >
              {isRunning ? '⏸ Pause' : '▶ Weiter'}
            </button>
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <div className="max-w-[1400px] mx-auto px-4 py-3">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={newPuzzle}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg text-sm font-medium hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md shadow-indigo-200 dark:shadow-indigo-900/50"
          >
            🔄 Neues Rätsel
          </button>
          <button
            onClick={checkPuzzle}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
          >
            ✓ Prüfen
          </button>
          <button
            onClick={clearErrors}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
          >
            🧹 Fehler löschen
          </button>
          <button
            onClick={revealCell}
            disabled={hintsLetterUsed >= MAX_LETTER_HINTS}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-1.5 ${
              hintsLetterUsed >= MAX_LETTER_HINTS
                ? 'bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            💡 Buchstabe
            <span className={`inline-flex items-center justify-center text-xs font-bold rounded-full w-5 h-5 ${
              hintsLetterUsed >= MAX_LETTER_HINTS
                ? 'bg-red-100 dark:bg-red-900/40 text-red-400 dark:text-red-500'
                : 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
            }`}>
              {MAX_LETTER_HINTS - hintsLetterUsed}
            </span>
          </button>
          <button
            onClick={revealWord}
            disabled={hintsWordUsed >= MAX_WORD_HINTS}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-1.5 ${
              hintsWordUsed >= MAX_WORD_HINTS
                ? 'bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            📖 Wort
            <span className={`inline-flex items-center justify-center text-xs font-bold rounded-full w-5 h-5 ${
              hintsWordUsed >= MAX_WORD_HINTS
                ? 'bg-red-100 dark:bg-red-900/40 text-red-400 dark:text-red-500'
                : 'bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400'
            }`}>
              {MAX_WORD_HINTS - hintsWordUsed}
            </span>
          </button>
          <button
            onClick={revealAll}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400 rounded-lg text-sm font-medium hover:bg-orange-50 dark:hover:bg-orange-900/30 transition-colors shadow-sm"
          >
            👁 Lösung
          </button>
          <button
            onClick={clearPuzzle}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors shadow-sm"
          >
            🗑 Löschen
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-[1400px] mx-auto px-4 pb-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Grid */}
          <div className="flex-shrink-0">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl shadow-indigo-100/50 dark:shadow-black/30 p-4 border border-indigo-100 dark:border-indigo-900/50 transition-colors duration-300">
              <div
                className="grid gap-0 border-2 border-gray-800 dark:border-gray-300"
                style={{
                  gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
                  width: `${GRID_SIZE * 38}px`,
                }}
              >
                {grid.map((row, r) =>
                  row.map((cell, c) => {
                    const isSelected = selectedCell?.row === r && selectedCell?.col === c;
                    const isHighlighted = activeCellSet.has(`${r}-${c}`);

                    let bgClass = '';
                    if (cell.isBlack) {
                      bgClass = 'bg-gray-800 dark:bg-gray-950';
                    } else if (isSelected) {
                      bgClass = 'bg-indigo-200 dark:bg-indigo-700 z-10 ring-2 ring-indigo-500 dark:ring-indigo-400';
                    } else if (cell.checked && cell.isCorrect === false) {
                      bgClass = 'bg-red-50 dark:bg-red-900/40';
                    } else if (cell.revealed) {
                      bgClass = 'bg-green-50 dark:bg-green-900/30';
                    } else if (isHighlighted) {
                      bgClass = 'bg-indigo-50 dark:bg-indigo-900/40';
                    } else {
                      bgClass = 'bg-white dark:bg-gray-800';
                    }

                    let textClass = '';
                    if (cell.revealed) {
                      textClass = 'text-green-600 dark:text-green-400 italic';
                    } else if (cell.checked && cell.isCorrect === false) {
                      textClass = 'text-red-600 dark:text-red-400';
                    } else if (cell.checked && cell.isCorrect === true) {
                      textClass = 'text-green-700 dark:text-green-400';
                    } else {
                      textClass = 'text-gray-800 dark:text-gray-100';
                    }

                    return (
                      <div
                        key={`${r}-${c}`}
                        className={`
                          relative w-[38px] h-[38px] border border-gray-300 dark:border-gray-600
                          ${bgClass}
                          ${!cell.isBlack ? 'cursor-pointer' : ''}
                          ${cell.isSolutionCell ? 'border-b-2 border-b-amber-500 dark:border-b-amber-400' : ''}
                        `}
                        onClick={() => handleCellClick(r, c)}
                      >
                        {/* Number */}
                        {cell.number && (
                          <span className="absolute top-0 left-0.5 text-[8px] font-bold text-gray-600 dark:text-gray-400 leading-none select-none z-20">
                            {cell.number}
                          </span>
                        )}
                        {/* Solution index circle */}
                        {cell.isSolutionCell && cell.solutionIndex !== null && (
                          <span className="absolute bottom-0 right-0.5 text-[7px] font-bold text-amber-600 dark:text-amber-400 leading-none select-none z-20 bg-amber-100 dark:bg-amber-900/60 rounded-full w-3 h-3 flex items-center justify-center">
                            {cell.solutionIndex + 1}
                          </span>
                        )}
                        {/* Input */}
                        {!cell.isBlack && (
                          <input
                            ref={el => { cellRefs.current[r][c] = el; }}
                            type="text"
                            value={cell.userInput}
                            readOnly
                            className={`
                              w-full h-full text-center font-bold text-lg uppercase bg-transparent
                              outline-none cursor-pointer select-none caret-transparent
                              ${textClass}
                            `}
                            onKeyDown={(e) => handleKeyDown(e, r, c)}
                            onFocus={() => {
                              setSelectedCell({ row: r, col: c });
                            }}
                            tabIndex={cell.isBlack ? -1 : 0}
                            autoComplete="off"
                            aria-label={`Zelle ${r + 1}, ${c + 1}`}
                          />
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Solution word section */}
              <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800/50 transition-colors duration-300">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-amber-600 dark:text-amber-400 font-bold text-sm">⭐ Lösungswort</span>
                  <span className="text-xs text-amber-500 dark:text-amber-500/70">({puzzle.solutionWord.length} Buchstaben)</span>
                </div>
                <div className="flex gap-1 mb-2">
                  {solutionLetters.map((letter, i) => (
                    <div
                      key={i}
                      className={`
                        w-9 h-9 flex items-center justify-center border-2 rounded-lg font-bold text-lg
                        ${letter !== '_'
                          ? 'border-amber-400 dark:border-amber-600 bg-amber-100 dark:bg-amber-800/40 text-amber-800 dark:text-amber-200'
                          : 'border-amber-200 dark:border-amber-800/40 bg-white dark:bg-gray-800 text-gray-300 dark:text-gray-600'
                        }
                      `}
                    >
                      {letter}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={solutionInput}
                    onChange={(e) => {
                      setSolutionInput(e.target.value.toUpperCase());
                      setSolutionCorrect(null);
                    }}
                    placeholder="Lösungswort eingeben..."
                    className="flex-1 px-3 py-1.5 text-sm border border-amber-200 dark:border-amber-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-600 uppercase transition-colors"
                    maxLength={puzzle.solutionWord.length}
                  />
                  <button
                    onClick={checkSolutionWord}
                    className="px-3 py-1.5 bg-amber-500 dark:bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-600 dark:hover:bg-amber-700 transition-colors"
                  >
                    Prüfen
                  </button>
                </div>
                {solutionCorrect === true && (
                  <div className="mt-2 text-green-600 dark:text-green-400 text-sm font-semibold flex items-center gap-1">
                    🎉 Richtig! Das Lösungswort ist <span className="text-green-800 dark:text-green-300">{puzzle.solutionWord}</span>!
                  </div>
                )}
                {solutionCorrect === false && (
                  <div className="mt-2 text-red-500 dark:text-red-400 text-sm font-semibold">
                    ❌ Leider falsch. Versuche es nochmal!
                  </div>
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-3 bg-white dark:bg-gray-800 rounded-xl shadow-md p-3 border border-indigo-100 dark:border-indigo-900/50 transition-colors duration-300">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Fortschritt</span>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{filledCells}/{totalCells} Felder</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Clues */}
          <div className="flex-1 min-w-0">
            {/* Active clue display */}
            {activeClue && (
              <div className="mb-4 p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl border border-indigo-200 dark:border-indigo-800/50 transition-colors duration-300">
                <span className="text-xs font-bold text-indigo-500 dark:text-indigo-400 uppercase">
                  {activeClue.direction === 'across' ? 'Waagerecht' : 'Senkrecht'} {activeClue.number}
                </span>
                <p className="text-sm font-medium text-indigo-900 dark:text-indigo-200 mt-0.5">{activeClue.clue}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Across */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 border border-indigo-100 dark:border-indigo-900/50 transition-colors duration-300">
                <h3 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 bg-indigo-100 dark:bg-indigo-900/50 rounded-md flex items-center justify-center text-xs">→</span>
                  Waagerecht
                </h3>
                <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
                  {acrossClues.map(clue => {
                    const isActive = activeClue?.number === clue.number && activeClue?.direction === 'across';
                    const clueCells = getClueCells(clue);
                    const isWordComplete = clueCells.every(
                      cc => grid[cc.row][cc.col].userInput.toUpperCase() === grid[cc.row][cc.col].letter
                    );
                    return (
                      <div
                        key={`a-${clue.number}`}
                        className={`
                          px-3 py-2 rounded-lg cursor-pointer transition-all text-sm
                          ${isActive
                            ? 'bg-indigo-100 dark:bg-indigo-900/50 border border-indigo-300 dark:border-indigo-700'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 border border-transparent'
                          }
                          ${isWordComplete ? 'opacity-60' : ''}
                        `}
                        onClick={() => handleClueClick(clue)}
                      >
                        <span className="font-bold text-indigo-600 dark:text-indigo-400 mr-2">{clue.number}.</span>
                        <span className={`${isWordComplete ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'}`}>
                          {clue.clue}
                        </span>
                        {isWordComplete && <span className="ml-1 text-green-500 dark:text-green-400">✓</span>}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Down */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 border border-indigo-100 dark:border-indigo-900/50 transition-colors duration-300">
                <h3 className="text-sm font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 bg-purple-100 dark:bg-purple-900/50 rounded-md flex items-center justify-center text-xs">↓</span>
                  Senkrecht
                </h3>
                <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
                  {downClues.map(clue => {
                    const isActive = activeClue?.number === clue.number && activeClue?.direction === 'down';
                    const clueCells = getClueCells(clue);
                    const isWordComplete = clueCells.every(
                      cc => grid[cc.row][cc.col].userInput.toUpperCase() === grid[cc.row][cc.col].letter
                    );
                    return (
                      <div
                        key={`d-${clue.number}`}
                        className={`
                          px-3 py-2 rounded-lg cursor-pointer transition-all text-sm
                          ${isActive
                            ? 'bg-purple-100 dark:bg-purple-900/50 border border-purple-300 dark:border-purple-700'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 border border-transparent'
                          }
                          ${isWordComplete ? 'opacity-60' : ''}
                        `}
                        onClick={() => handleClueClick(clue)}
                      >
                        <span className="font-bold text-purple-600 dark:text-purple-400 mr-2">{clue.number}.</span>
                        <span className={`${isWordComplete ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'}`}>
                          {clue.clue}
                        </span>
                        {isWordComplete && <span className="ml-1 text-green-500 dark:text-green-400">✓</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Keyboard hints */}
            <div className="mt-4 bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 border border-gray-100 dark:border-gray-700 transition-colors duration-300">
              <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Tastatursteuerung</h3>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-300 font-mono">←→↑↓</kbd>
                  <span>Navigation</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-300 font-mono">Tab</kbd>
                  <span>Nächste Frage</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-300 font-mono">⌫</kbd>
                  <span>Löschen & zurück</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-300 font-mono">Klick</kbd>
                  <span>Richtung wechseln</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Congratulations modal */}
      {showCongrats && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-8 text-center transform animate-bounce-in border border-gray-200 dark:border-gray-700">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Glückwunsch!</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Du hast das Kreuzworträtsel in <span className="font-bold text-indigo-600 dark:text-indigo-400">{formatTime(timer)}</span> gelöst!
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Versuche jetzt noch das Lösungswort zu finden!
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowCongrats(false)}
                className="px-6 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Schließen
              </button>
              <button
                onClick={newPuzzle}
                className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-indigo-900/50"
              >
                Neues Rätsel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Solution revealed overlay */}
      {showSolution && !showCongrats && (
        <div className="fixed bottom-4 right-4 z-40 bg-orange-100 dark:bg-orange-900/40 border border-orange-300 dark:border-orange-700 rounded-xl p-3 shadow-lg">
          <p className="text-sm text-orange-700 dark:text-orange-300 font-medium">
            🔓 Lösung wurde aufgedeckt
          </p>
          <p className="text-xs text-orange-500 dark:text-orange-400 mt-1">
            Lösungswort: <span className="font-bold">{puzzle.solutionWord}</span>
          </p>
        </div>
      )}
    </div>
  );
}
