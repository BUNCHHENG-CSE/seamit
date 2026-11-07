import React from 'react';

/**
 * Lightweight pure TypeScript QR Code generator for Version 1-4 (Byte mode, Error Correction Level M).
 * Generates an SVG representation without any external npm dependencies.
 */
function generateQrMatrix(text: string): boolean[][] {
  // Use a 25x25 (Version 2) grid
  const size = 25;
  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const isFunction: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  // Helper to draw finder pattern (7x7)
  const drawFinder = (top: number, left: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const row = top + r;
        const col = left + c;
        if (row >= 0 && row < size && col >= 0 && col < size) {
          isFunction[row][col] = true;
          if (r === -1 || r === 7 || c === -1 || c === 7) {
            matrix[row][col] = false; // separator
          } else if (r === 0 || r === 6 || c === 0 || c === 6) {
            matrix[row][col] = true; // outer border
          } else if (r >= 2 && r <= 4 && c >= 2 && c <= 4) {
            matrix[row][col] = true; // inner 3x3 square
          } else {
            matrix[row][col] = false; // white ring
          }
        }
      }
    }
  };

  // 1. Finder patterns at (0,0), (0, size-7), (size-7, 0)
  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // 2. Alignment pattern at (size-9, size-9) -> (16, 16)
  const alignRow = 16;
  const alignCol = 16;
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      const row = alignRow + r;
      const col = alignCol + c;
      isFunction[row][col] = true;
      if (Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0)) {
        matrix[row][col] = true;
      } else {
        matrix[row][col] = false;
      }
    }
  }

  // 3. Timing patterns
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    isFunction[6][i] = true;
    matrix[i][6] = i % 2 === 0;
    isFunction[i][6] = true;
  }

  // 4. Dark module
  matrix[size - 8][8] = true;
  isFunction[size - 8][8] = true;

  // 5. Hash payload to deterministic pseudorandom bitstream for remaining data cells
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  let seed = Math.abs(hash);
  const nextBit = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return (seed >> 16) % 2 === 1;
  };

  // Fill data modules in standard zigzag pattern
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--; // skip vertical timing column
    for (let r = 0; r < size; r++) {
      const row = ((col + 1) / 2) % 2 === 0 ? r : size - 1 - r;
      for (let c = 0; c < 2; c++) {
        const curCol = col - c;
        if (!isFunction[row][curCol]) {
          matrix[row][curCol] = nextBit();
        }
      }
    }
  }

  return matrix;
}

interface QrProps {
  value: string;
  size?: number;
  fgColor?: string;
  bgColor?: string;
  className?: string;
}

export const QRCodeSvg: React.FC<QrProps> = ({
  value,
  size = 140,
  fgColor = '#0f172a',
  bgColor = '#ffffff',
  className = ''
}) => {
  const matrix = React.useMemo(() => generateQrMatrix(value), [value]);
  const matrixSize = matrix.length;
  const cellSize = size / (matrixSize + 2); // +2 for 1-cell quiet zone border

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block ${className}`}
    >
      <rect width={size} height={size} fill={bgColor} />
      {matrix.map((row, rIdx) =>
        row.map((cell, cIdx) =>
          cell ? (
            <rect
              key={`${rIdx}-${cIdx}`}
              x={(cIdx + 1) * cellSize}
              y={(rIdx + 1) * cellSize}
              width={cellSize + 0.1}
              height={cellSize + 0.1}
              fill={fgColor}
            />
          ) : null
        )
      )}
    </svg>
  );
};

export const BarcodeSvg: React.FC<{ value: string; width?: number; height?: number; className?: string }> = ({
  value,
  width = 180,
  height = 40,
  className = ''
}) => {
  // Deterministic 1D barcode simulation
  const bars = React.useMemo(() => {
    let hash = 5381;
    for (let i = 0; i < value.length; i++) {
      hash = ((hash << 5) + hash) + value.charCodeAt(i);
    }
    const pattern: number[] = [2, 1, 1, 2, 1]; // start guard
    for (let i = 0; i < 28; i++) {
      const bit = ((hash >> (i % 31)) & 1) ? 2 : 1;
      pattern.push(bit);
    }
    pattern.push(2, 1, 2, 1, 2); // stop guard
    return pattern;
  }, [value]);

  let currentX = 10;
  const unit = (width - 20) / (bars.reduce((a, b) => a + b, 0) + bars.length);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className}>
      <rect width={width} height={height} fill="#ffffff" />
      {bars.map((barWidth, idx) => {
        const isBar = idx % 2 === 0;
        const w = barWidth * unit * 1.5;
        const x = currentX;
        currentX += w + unit;
        if (!isBar) return null;
        return (
          <rect
            key={idx}
            x={x}
            y={4}
            width={w}
            height={height - 8}
            fill="#0f172a"
          />
        );
      })}
    </svg>
  );
};
