import { Shape } from './types';

interface BoardState {
    shapes: Map<string, Shape>;
    cursors: Map<string, { x: number; y: number }>;
}

const boardState: BoardState = {
    shapes: new Map(),
    cursors: new Map(),
};

export function addOrUpdateShape(shape: Shape) {
    boardState.shapes.set(shape.id, shape);
}

export function removeShape(id: string) {
    boardState.shapes.delete(id);
}

export function updateCursor(userId: string, position: { x: number; y: number }) {
    boardState.cursors.set(userId, position);
}

export function removeCursor(userId: string) {
    boardState.cursors.delete(userId);
}

export function getShapesAsArray(): Shape[] {
    return Array.from(boardState.shapes.values());
}
