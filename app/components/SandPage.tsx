"use client";

import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type Cell = {
  x: number;
  y: number;
};

const GRID_COLS = 15;
const GRID_ROWS = 13;
const START_CELL: Cell = { x: 7, y: 11 };
const GATE_CELL: Cell = { x: 7, y: 3 };
const MOVE_DELAY = 150;

const castleCells = new Set(
  [
    [4, 1],
    [6, 1],
    [8, 1],
    [10, 1],
    [4, 2],
    [5, 2],
    [9, 2],
    [10, 2],
    [4, 3],
    [5, 3],
    [6, 3],
    [8, 3],
    [9, 3],
    [10, 3],
    [4, 4],
    [5, 4],
    [6, 4],
    [7, 4],
    [8, 4],
    [9, 4],
    [10, 4],
    [4, 5],
    [5, 5],
    [9, 5],
    [10, 5],
    [4, 6],
    [5, 6],
    [9, 6],
    [10, 6],
    [4, 7],
    [5, 7],
    [9, 7],
    [10, 7],
    [4, 8],
    [5, 8],
    [6, 8],
    [8, 8],
    [9, 8],
    [10, 8],
  ].map(([x, y]) => `${x}:${y}`),
);

const cellKey = ({ x, y }: Cell) => `${x}:${y}`;

const clampMove = (cell: Cell, dx: number, dy: number) => {
  const next = {
    x: Math.max(0, Math.min(GRID_COLS - 1, cell.x + dx)),
    y: Math.max(0, Math.min(GRID_ROWS - 1, cell.y + dy)),
  };

  if (castleCells.has(cellKey(next))) return cell;
  return next;
};

const directionFromInput = (input: Cell) => {
  if (Math.abs(input.x) < 0.28 && Math.abs(input.y) < 0.28) return { x: 0, y: 0 };
  if (Math.abs(input.x) > Math.abs(input.y)) return { x: Math.sign(input.x), y: 0 };
  return { x: 0, y: Math.sign(input.y) };
};

export default function SandPage() {
  const [show, setShow] = useState(false);
  const [blockCell, setBlockCell] = useState<Cell>(START_CELL);
  const [trailCells, setTrailCells] = useState<string[]>([]);
  const [joystickPosition, setJoystickPosition] = useState({ x: 0, y: 0 });
  const [gateOpen, setGateOpen] = useState(false);
  const [contactReady, setContactReady] = useState(false);
  const joystickPointerIdRef = useRef<number | null>(null);
  const moveInputRef = useRef<Cell>({ x: 0, y: 0 });
  const lastMoveRef = useRef(0);
  const roomRef = useRef<HTMLDivElement>(null);

  const moveBlock = useCallback((dx: number, dy: number) => {
    if (gateOpen) return;
    setBlockCell((cell) => {
      const next = clampMove(cell, dx, dy);
      if (next.x !== cell.x || next.y !== cell.y) {
        const nextKey = cellKey(cell);
        setTrailCells((trail) => [
          ...trail.filter((key) => key !== nextKey),
          nextKey,
        ].slice(-18));
      }
      if (next.x === GATE_CELL.x && next.y === GATE_CELL.y) {
        setGateOpen(true);
      }
      return next;
    });
  }, [gateOpen]);

  const updateJoystick = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const radius = Math.max(rect.width, rect.height) * 0.36;
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const length = Math.hypot(dx, dy);
    const clamp = length > radius ? radius / length : 1;
    const x = (dx * clamp) / radius;
    const y = (dy * clamp) / radius;
    setJoystickPosition({ x, y });
    moveInputRef.current = directionFromInput({ x, y });
  };

  const releaseJoystick = (event?: ReactPointerEvent<HTMLDivElement>) => {
    if (event && joystickPointerIdRef.current !== null) {
      event.currentTarget.releasePointerCapture(joystickPointerIdRef.current);
    }
    joystickPointerIdRef.current = null;
    setJoystickPosition({ x: 0, y: 0 });
    moveInputRef.current = { x: 0, y: 0 };
  };

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || window.innerWidth < 768) return;
    let targetX = 0, targetY = 0, currentX = 0, currentY = 0, frame = 0;
    const onMouseMove = (e: MouseEvent) => {
      targetX = (e.clientX / window.innerWidth - 0.5) * 2;
      targetY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const tick = () => {
      frame = requestAnimationFrame(tick);
      currentX += (targetX - currentX) * 0.04;
      currentY += (targetY - currentY) * 0.04;
      roomRef.current?.style.setProperty("--grid-x", (currentX * 24).toFixed(2));
      roomRef.current?.style.setProperty("--grid-y", (currentY * 24).toFixed(2));
    };
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    frame = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (!gateOpen) return;
    const t = setTimeout(() => setContactReady(true), 420);
    return () => clearTimeout(t);
  }, [gateOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowUp" || event.key === "w" || event.key === "W") {
        event.preventDefault();
        moveBlock(0, -1);
      }
      if (event.key === "ArrowDown" || event.key === "s" || event.key === "S") {
        event.preventDefault();
        moveBlock(0, 1);
      }
      if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") {
        event.preventDefault();
        moveBlock(-1, 0);
      }
      if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") {
        event.preventDefault();
        moveBlock(1, 0);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [gateOpen, moveBlock]);

  useEffect(() => {
    let frame = 0;
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      const input = moveInputRef.current;
      if ((input.x !== 0 || input.y !== 0) && now - lastMoveRef.current > MOVE_DELAY) {
        lastMoveRef.current = now;
        moveBlock(input.x, input.y);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [gateOpen, moveBlock]);

  const cells = Array.from({ length: GRID_COLS * GRID_ROWS }, (_, index) => {
    const x = index % GRID_COLS;
    const y = Math.floor(index / GRID_COLS);
    const key = `${x}:${y}`;
    const isCastle = castleCells.has(key);
    const isGate = x === GATE_CELL.x && y === GATE_CELL.y;
    const isBlock = x === blockCell.x && y === blockCell.y;
    const isTrail = trailCells.includes(key);

    return (
      <span
        key={key}
        className={[
          "sand-field-cell",
          isTrail ? "sand-field-cell-trail" : "",
          isCastle ? "sand-field-cell-castle" : "",
          isGate ? "sand-field-cell-gate" : "",
          isBlock ? "sand-field-cell-block" : "",
        ].join(" ")}
        aria-hidden="true"
      />
    );
  });

  return (
    <div
      ref={roomRef}
      className="sand-kingdom-room"
      style={{ opacity: show ? 1 : 0 }}
    >
      <div className="sand-kingdom-grid" aria-hidden="true" />

      <main className="sand-field-stage" aria-label="Sand kingdom gate field">
        <div className="sand-field-label">
          <span>sand kingdom</span>
          <strong>{gateOpen ? "gate open" : "move block to gate"}</strong>
        </div>

        <div
          className="sand-field-board"
          style={{
            gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
            gridTemplateRows: `repeat(${GRID_ROWS}, 1fr)`,
          }}
        >
          {cells}
        </div>

        <div className="sand-field-readout">
          <span>BLOCK {String(blockCell.x).padStart(2, "0")}:{String(blockCell.y).padStart(2, "0")}</span>
          <span>GATE {String(GATE_CELL.x).padStart(2, "0")}:{String(GATE_CELL.y).padStart(2, "0")}</span>
        </div>
      </main>

      {!gateOpen && (
        <section className="sand-joystick-panel" aria-label="Sand field joystick">
          <span>move axis</span>
          <div
            className="sand-joystick"
            onPointerDown={(event) => {
              joystickPointerIdRef.current = event.pointerId;
              event.currentTarget.setPointerCapture(event.pointerId);
              updateJoystick(event);
            }}
            onPointerMove={(event) => {
              if (joystickPointerIdRef.current === event.pointerId) {
                updateJoystick(event);
              }
            }}
            onPointerUp={releaseJoystick}
            onPointerCancel={releaseJoystick}
          >
            <span className="sand-joystick-cross sand-joystick-cross-x" />
            <span className="sand-joystick-cross sand-joystick-cross-y" />
            <span
              className="sand-joystick-thumb"
              style={{
                transform: `translate(calc(-50% + ${joystickPosition.x * 38}px), calc(-50% + ${joystickPosition.y * 38}px))`,
              }}
            />
          </div>
          <span>wasd / arrows</span>
        </section>
      )}

      {contactReady && (
        <a
          className="sand-contact-card"
          href="mailto:thecyberfoolz@gmail.com"
          aria-label="Email thecyberfoolz@gmail.com"
        >
          <span className="sand-contact-label">
            <span className="sand-contact-label-default">gate confirmed</span>
            <span className="sand-contact-label-reveal">unlocked</span>
          </span>
          <strong className="sand-contact-title" aria-hidden="true">
            <span className="sand-contact-title-default">MAKE_CONTACT</span>
            <span className="sand-contact-title-reveal">EMAIL</span>
          </strong>
          <span className="sr-only">Email</span>
        </a>
      )}
    </div>
  );
}
