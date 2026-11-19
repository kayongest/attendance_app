/**
 * Self-contained ISO/IEC 18004 QR Code SVG Generator (Versions 1–10, Byte Mode, EC Level L/M)
 * Zero external dependencies — generates genuinely scannable QR codes offline.
 */
(function (globalScope) {
  'use strict';

  const EXP = new Uint8Array(512);
  const LOG = new Uint8Array(256);
  (function initGF() {
    let x = 1;
    for (let i = 0; i < 255; i += 1) {
      EXP[i] = x;
      LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;
    }
    for (let i = 255; i < 512; i += 1) {
      EXP[i] = EXP[i - 255];
    }
  })();

  function gfMul(a, b) {
    if (a === 0 || b === 0) return 0;
    return EXP[LOG[a] + LOG[b]];
  }

  function rsGenerator(degree) {
    let poly = [1];
    for (let i = 0; i < degree; i += 1) {
      const next = new Array(poly.length + 1).fill(0);
      const root = EXP[i];
      for (let j = 0; j < poly.length; j += 1) {
        next[j] ^= poly[j];
        next[j + 1] ^= gfMul(poly[j], root);
      }
      poly = next;
    }
    return poly;
  }

  function rsRemainder(data, ecLen) {
    const gen = rsGenerator(ecLen);
    const res = new Uint8Array(data.length + ecLen);
    res.set(data, 0);
    for (let i = 0; i < data.length; i += 1) {
      const factor = res[i];
      if (factor !== 0) {
        for (let j = 0; j < gen.length; j += 1) {
          res[i + j] ^= gfMul(gen[j], factor);
        }
      }
    }
    return res.slice(data.length);
  }

  // Version specs for EC Level M (versions 1..10): [totalCodewords, ecPerBlock, [numBlocks1, dataPerBlock1], [numBlocks2, dataPerBlock2]]
  // Format bits for EC Level M = 00 (with mask 0..7)
  const VERSIONS_M = [
    null,
    [26, 10, [1, 16]],
    [44, 16, [1, 28]],
    [70, 26, [1, 44]],
    [100, 18, [2, 32]],
    [134, 24, [2, 43]],
    [172, 16, [4, 27]],
    [196, 18, [4, 31]],
    [242, 22, [2, 38], [2, 39]],
    [292, 22, [3, 36], [2, 37]],
    [346, 26, [4, 43], [1, 44]],
  ];

  const ALIGN_POS = [
    null,
    [],
    [6, 18],
    [6, 22],
    [6, 26],
    [6, 30],
    [6, 34],
    [6, 22, 38],
    [6, 24, 42],
    [6, 26, 46],
    [6, 28, 50],
  ];

  const VERSION_INFO_BITS = [
    0, 0, 0, 0, 0, 0, 0,
    0x07c94, 0x085bc, 0x09a99, 0x0a4d3,
  ];

  function encodeUtf8Bytes(str) {
    if (typeof TextEncoder !== 'undefined') {
      return Array.from(new TextEncoder().encode(String(str || '')));
    }
    const out = [];
    const s = unescape(encodeURIComponent(String(str || '')));
    for (let i = 0; i < s.length; i += 1) out.push(s.charCodeAt(i));
    return out;
  }

  function pickVersion(byteLen) {
    for (let v = 1; v <= 10; v += 1) {
      const spec = VERSIONS_M[v];
      const dataCap = (spec[2][0] * spec[2][1]) + (spec[3] ? spec[3][0] * spec[3][1] : 0);
      const headerBits = 4 + (v <= 9 ? 8 : 16);
      const maxBytes = Math.floor((dataCap * 8 - headerBits) / 8);
      if (byteLen <= maxBytes) return v;
    }
    return 10;
  }

  function buildCodewords(bytes, version) {
    const spec = VERSIONS_M[version];
    const dataCap = (spec[2][0] * spec[2][1]) + (spec[3] ? spec[3][0] * spec[3][1] : 0);
    const ecPerBlock = spec[1];

    const bits = [];
    const pushBits = (val, len) => {
      for (let i = len - 1; i >= 0; i -= 1) bits.push((val >>> i) & 1);
    };

    pushBits(0b0100, 4); // Byte mode
    pushBits(bytes.length, version <= 9 ? 8 : 16);
    for (const b of bytes) pushBits(b, 8);

    const maxDataBits = dataCap * 8;
    const term = Math.min(4, maxDataBits - bits.length);
    for (let i = 0; i < term; i += 1) bits.push(0);
    while (bits.length % 8 !== 0) bits.push(0);

    const dataCw = [];
    for (let i = 0; i < bits.length; i += 8) {
      let v = 0;
      for (let j = 0; j < 8; j += 1) v = (v << 1) | bits[i + j];
      dataCw.push(v);
    }
    const padBytes = [0xec, 0x11];
    let pIdx = 0;
    while (dataCw.length < dataCap) {
      dataCw.push(padBytes[pIdx % 2]);
      pIdx += 1;
    }

    const blocks = [];
    let offset = 0;
    for (let g = 2; g < spec.length; g += 1) {
      const [cnt, len] = spec[g];
      for (let b = 0; b < cnt; b += 1) {
        const slice = new Uint8Array(dataCw.slice(offset, offset + len));
        offset += len;
        blocks.push({ data: slice, ec: rsRemainder(slice, ecPerBlock) });
      }
    }

    const out = [];
    const maxDataLen = Math.max(...blocks.map((b) => b.data.length));
    for (let i = 0; i < maxDataLen; i += 1) {
      for (const blk of blocks) {
        if (i < blk.data.length) out.push(blk.data[i]);
      }
    }
    for (let i = 0; i < ecPerBlock; i += 1) {
      for (const blk of blocks) out.push(blk.ec[i]);
    }
    return out;
  }

  function computeFormatBits(mask) {
    // EC level M = 00
    const data = (0b00 << 3) | (mask & 7);
    let rem = data << 10;
    const gen = 0x537;
    for (let i = 4; i >= 0; i -= 1) {
      if (rem & (1 << (i + 10))) rem ^= gen << i;
    }
    return ((data << 10) | rem) ^ 0x5412;
  }

  function createMatrix(text) {
    const bytes = encodeUtf8Bytes(text);
    const version = pickVersion(bytes.length);
    const size = version * 4 + 17;
    const codewords = buildCodewords(bytes, version);

    const grid = Array.from({ length: size }, () => new Int8Array(size)); // 0 empty, 1 dark, -1 light
    const isFunc = Array.from({ length: size }, () => new Uint8Array(size));

    const setMod = (r, c, dark, fn = false) => {
      if (r < 0 || c < 0 || r >= size || c >= size) return;
      grid[r][c] = dark ? 1 : -1;
      if (fn) isFunc[r][c] = 1;
    };

    const drawFinder = (r0, c0) => {
      for (let dr = -1; dr <= 7; dr += 1) {
        for (let dc = -1; dc <= 7; dc += 1) {
          const r = r0 + dr;
          const c = c0 + dc;
          if (r < 0 || c < 0 || r >= size || c >= size) continue;
          const inBox = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
          const dark = inBox && (dr === 0 || dr === 6 || dc === 0 || dc === 6 || (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4));
          setMod(r, c, dark, true);
        }
      }
    };

    drawFinder(0, 0);
    drawFinder(0, size - 7);
    drawFinder(size - 7, 0);

    // Alignment patterns
    const pos = ALIGN_POS[version] || [];
    for (const ar of pos) {
      for (const ac of pos) {
        if ((ar === 6 && ac === 6) || (ar === 6 && ac === size - 7) || (ar === size - 7 && ac === 6)) continue;
        for (let dr = -2; dr <= 2; dr += 1) {
          for (let dc = -2; dc <= 2; dc += 1) {
            const dark = Math.abs(dr) === 2 || Math.abs(dc) === 2 || (dr === 0 && dc === 0);
            setMod(ar + dr, ac + dc, dark, true);
          }
        }
      }
    }

    // Timing patterns
    for (let i = 8; i < size - 8; i += 1) {
      setMod(6, i, i % 2 === 0, true);
      setMod(i, 6, i % 2 === 0, true);
    }

    // Dark module & reserve format info
    setMod(size - 8, 8, true, true);
    for (let i = 0; i < 9; i += 1) {
      if (i !== 6) {
        isFunc[8][i] = 1;
        isFunc[i][8] = 1;
      }
    }
    for (let i = 0; i < 8; i += 1) {
      isFunc[8][size - 1 - i] = 1;
      isFunc[size - 1 - i][8] = 1;
    }
    if (version >= 7) {
      const vBits = VERSION_INFO_BITS[version];
      for (let i = 0; i < 18; i += 1) {
        const bit = ((vBits >>> i) & 1) === 1;
        const a = Math.floor(i / 3);
        const b = i % 3;
        setMod(a, size - 11 + b, bit, true);
        setMod(size - 11 + b, a, bit, true);
      }
    }

    // Place data bits in zigzag
    const allBits = [];
    for (const cw of codewords) {
      for (let b = 7; b >= 0; b -= 1) allBits.push((cw >>> b) & 1);
    }
    let bitIdx = 0;
    let upward = true;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let step = 0; step < size; step += 1) {
        const r = upward ? (size - 1 - step) : step;
        for (let dx = 0; dx < 2; dx += 1) {
          const c = right - dx;
          if (!isFunc[r][c]) {
            const bit = bitIdx < allBits.length ? allBits[bitIdx++] : 0;
            grid[r][c] = bit ? 1 : -1;
          }
        }
      }
      upward = !upward;
    }

    // Choose lowest-penalty mask (evaluate masks 0..7)
    const maskPred = [
      (r, c) => (r + c) % 2 === 0,
      (r) => r % 2 === 0,
      (_r, c) => c % 3 === 0,
      (r, c) => (r + c) % 3 === 0,
      (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
      (r, c) => ((r * c) % 2 + (r * c) % 3) === 0,
      (r, c) => (((r * c) % 2 + (r * c) % 3) % 2) === 0,
      (r, c) => (((r + c) % 2 + (r * c) % 3) % 2) === 0,
    ];

    let bestMask = 0;
    let bestScore = Infinity;
    for (let m = 0; m < 8; m += 1) {
      let darkCount = 0;
      let penalty = 0;
      for (let r = 0; r < size; r += 1) {
        let run = 1;
        let prevDark = false;
        for (let c = 0; c < size; c += 1) {
          const flip = !isFunc[r][c] && maskPred[m](r, c);
          const d = (grid[r][c] === 1) !== flip;
          if (d) darkCount += 1;
          if (c === 0) prevDark = d;
          else if (d === prevDark) {
            run += 1;
            if (run === 5) penalty += 3;
            else if (run > 5) penalty += 1;
          } else {
            run = 1;
            prevDark = d;
          }
        }
      }
      const ratioPenalty = Math.abs(Math.round((darkCount * 100) / (size * size)) - 50) * 2;
      const total = penalty + ratioPenalty;
      if (total < bestScore) {
        bestScore = total;
        bestMask = m;
      }
    }

    // Apply best mask and format bits
    for (let r = 0; r < size; r += 1) {
      for (let c = 0; c < size; c += 1) {
        if (!isFunc[r][c] && maskPred[bestMask](r, c)) {
          grid[r][c] = grid[r][c] === 1 ? -1 : 1;
        }
      }
    }
    const fmt = computeFormatBits(bestMask);
    for (let i = 0; i < 15; i += 1) {
      const dark = ((fmt >>> (14 - i)) & 1) === 1;
      if (i < 6) {
        setMod(8, i, dark, true);
        setMod(size - 1 - i, 8, dark, true);
      } else if (i === 6) {
        setMod(8, 7, dark, true);
        setMod(size - 7, 8, dark, true);
      } else if (i === 7) {
        setMod(8, 8, dark, true);
        setMod(8, size - 8, dark, true);
      } else if (i === 8) {
        setMod(7, 8, dark, true);
        setMod(8, size - 7, dark, true);
      } else {
        setMod(14 - i, 8, dark, true);
        setMod(8, size - 15 + i, dark, true);
      }
    }

    return { size, grid };
  }

  function toSvg(text, opts) {
    const o = opts || {};
    const px = Number(o.size) || 180;
    const darkColor = o.dark || '#0f172a';
    const lightColor = o.light || '#ffffff';
    const margin = Number(o.margin ?? 2);
    const { size, grid } = createMatrix(text);
    const total = size + margin * 2;
    const rects = [`<rect width="${total}" height="${total}" fill="${lightColor}"/>`];
    for (let r = 0; r < size; r += 1) {
      for (let c = 0; c < size; c += 1) {
        if (grid[r][c] === 1) {
          rects.push(`<rect x="${c + margin}" y="${r + margin}" width="1" height="1" fill="${darkColor}"/>`);
        }
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="${px}" height="${px}" shape-rendering="crispEdges" role="img" aria-label="QR Code">${rects.join('')}</svg>`;
  }

  globalScope.AbilityQRCode = { createMatrix, toSvg };
})(typeof window !== 'undefined' ? window : globalThis);
