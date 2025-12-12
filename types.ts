export interface Point {
  x: number;
  y: number;
}

export interface StringEntity {
  id: number;
  x: number; // Base x position
  y1: number; // Top y
  y2: number; // Bottom y
  vibration: number; // Current vibration amplitude
  velocity: number; // Vibration velocity
  frequency: number; // Audio frequency
  color: string;
  isHeld: boolean; // If currently grabbed by user
  controlPoint: Point; // For bezier curve when held/woven
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

export interface WeaveNode {
  id: string;
  x: number;
  y: number;
  connections: string[]; // IDs of connected nodes
}

export enum InteractionMode {
  PLAY = 'PLAY',
  WEAVE = 'WEAVE',
}

export interface InterpretationResult {
  title: string;
  poem: string;
}
