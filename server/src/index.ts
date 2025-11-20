import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { Message } from './types';
import * as state from './state';

const wss = new WebSocketServer({ port: 8080 });
const clients = new Map<string, WebSocket>();

function broadcast(message: Message, senderId: string) {
    const outboundMessage = JSON.stringify(message);
    for (const [id, client] of clients.entries()) {
        if (id !== senderId && client.readyState === WebSocket.OPEN) {
            client.send(outboundMessage);
        }
    }
}

wss.on('connection', (ws) => {
    const userId = uuidv4();
    clients.set(userId, ws);
    console.log(`Client ${userId} connected`);

    const snapshotMessage: Message = {
        event: 'state-snapshot',
        payload: { shapes: state.getShapesAsArray() }
    };
    ws.send(JSON.stringify(snapshotMessage));

    ws.on('message', (rawMessage) => {
        try {
            const message: Message = JSON.parse(rawMessage.toString());

            switch (message.event) {
                case 'shape-create':
                case 'shape-update':
                    state.addOrUpdateShape(message.payload);
                    broadcast(message, userId);
                    break;
                
                case 'cursor-update': {
                    // The payload from the client does not need a userId. The server assigns it.
                    state.updateCursor(userId, { x: message.payload.x, y: message.payload.y });
                    
                    const cursorMessage: Message = {
                        event: 'cursor-update',
                        payload: {
                            userId: userId,
                            x: message.payload.x,
                            y: message.payload.y
                        }
                    };
                    broadcast(cursorMessage, userId);
                    break;
                }
            }
        } catch (error) {
            console.error('Failed to parse message or invalid message structure', error);
        }
    });

    ws.on('close', () => {
        console.log(`Client ${userId} disconnected`);
        clients.delete(userId);
        state.removeCursor(userId);

        const removeCursorMessage: Message = {
            event: 'cursor-remove',
            payload: { userId }
        };
        
        // Broadcast to all remaining clients that this user has left.
        const outboundMessage = JSON.stringify(removeCursorMessage);
        for (const client of clients.values()) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(outboundMessage);
            }
        }
    });

    ws.on('error', (error) => {
        console.error(`Error with client ${userId}:`, error);
        ws.close();
    });
});

console.log('WebSocket server started on port 8080');
