import { useCallback } from 'react';

interface MobileKeyboardProps {
  onKeyPress: (key: string) => void;
  onDelete: () => void;
  onToggleDirection: () => void;
  onClose: () => void;
  direction: 'across' | 'down';
  darkMode: boolean;
}

const ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Z', 'U', 'I', 'O', 'P', 'Ü'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ö', 'Ä'],
  ['Y', 'X', 'C', 'V', 'B', 'N', 'M'],
];

export function MobileKeyboard({ onKeyPress, onDelete, onToggleDirection, onClose, direction, darkMode }: MobileKeyboardProps) {
  const handleKey = useCallback((key: string) => {
    onKeyPress(key);
  }, [onKeyPress]);

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-[100] pb-[env(safe-area-inset-bottom)] animate-slide-up ${
        darkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-100 border-gray-300'
      } border-t-2 shadow-[0_-4px_20px_rgba(0,0,0,0.2)]`}
    >
      {/* Top bar with direction toggle and close */}
      <div className={`flex items-center justify-between px-3 py-2 ${
        darkMode ? 'bg-gray-800/80' : 'bg-white/80'
      } border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <button
          onClick={onToggleDirection}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all active:scale-95 ${
            darkMode
              ? 'bg-indigo-600 text-white active:bg-indigo-700'
              : 'bg-indigo-500 text-white active:bg-indigo-600'
          }`}
        >
          {direction === 'across' ? '→ Waagerecht' : '↓ Senkrecht'}
        </button>
        <button
          onClick={onClose}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all active:scale-95 ${
            darkMode
              ? 'bg-gray-700 text-gray-300 active:bg-gray-600'
              : 'bg-gray-200 text-gray-600 active:bg-gray-300'
          }`}
        >
          ✕ Schließen
        </button>
      </div>

      {/* Keyboard rows */}
      <div className="px-1 py-2 space-y-1.5">
        {ROWS.map((row, rowIndex) => (
          <div key={rowIndex} className="flex justify-center gap-1">
            {/* Backspace on last row left */}
            {rowIndex === 2 && (
              <button
                onClick={onDelete}
                className={`flex items-center justify-center rounded-lg text-lg font-bold transition-all active:scale-90 ${
                  darkMode
                    ? 'bg-red-700 text-white active:bg-red-600'
                    : 'bg-red-500 text-white active:bg-red-600'
                }`}
                style={{ minWidth: '52px', height: '48px' }}
              >
                ⌫
              </button>
            )}
            {row.map((key) => (
              <button
                key={key}
                onClick={() => handleKey(key)}
                className={`flex items-center justify-center rounded-lg text-base font-bold transition-all active:scale-90 ${
                  darkMode
                    ? 'bg-gray-700 text-gray-100 active:bg-indigo-600 shadow-[0_2px_0_0_rgba(0,0,0,0.5)]'
                    : 'bg-white text-gray-800 active:bg-indigo-400 active:text-white shadow-[0_2px_0_0_rgba(0,0,0,0.15)]'
                }`}
                style={{ minWidth: '30px', flex: '1 1 0', maxWidth: '42px', height: '48px' }}
              >
                {key}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
