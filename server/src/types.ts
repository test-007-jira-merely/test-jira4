export interface Shape {
    id: string;
    type: 'rectangle';
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
}

export type Message =
    | { event: 'shape-create', payload: Shape }
    | { event: 'shape-update', payload: Shape }
    | { event: 'cursor-update', payload: { userId?: string; x: number; y: number } }
    | { event: 'state-snapshot', payload: { shapes: Shape[] } }
    | { event: 'cursor-remove', payload: { userId: string } };
