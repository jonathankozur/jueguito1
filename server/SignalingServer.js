/**
 * SignalingServer.js
 * 
 * Servidor WebSocket ligero para gestionar Rooms de multijugador.
 * El Host crea una sala, los Clientes se unen con el Room ID.
 * Este servidor actúa como relay puro: no corre ninguna lógica de juego.
 * 
 * Uso:
 *   node SignalingServer.js
 *
 * Puerto por defecto: 3001
 */

import { WebSocketServer } from 'ws';

const PORT = process.env.PORT || 3001;
const wss = new WebSocketServer({ port: PORT });

// rooms: Map<roomId, { hostWs, clients: Map<playerId, ws> }>
const rooms = new Map();

let connectionIdCounter = 1;

function generateRoomId() {
    // Short 6-char alphanumeric ID like "A3F9K1"
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

wss.on('connection', (ws) => {
    ws.connectionId = connectionIdCounter++;
    ws.roomId = null;
    ws.playerId = null;
    ws.isHost = false;

    console.log(`[SignalingServer] Client connected: conn#${ws.connectionId}`);

    ws.on('message', (raw) => {
        let msg;
        try {
            msg = JSON.parse(raw);
        } catch (e) {
            console.error('[SignalingServer] Invalid JSON received:', raw);
            return;
        }

        switch (msg.type) {
            case 'CREATE_ROOM':
                handleCreateRoom(ws, msg);
                break;
            case 'JOIN_ROOM':
                handleJoinRoom(ws, msg);
                break;
            case 'RELAY':
                handleRelay(ws, msg);
                break;
            case 'PLAYER_READY':
                handlePlayerReady(ws, msg);
                break;
            default:
                console.warn(`[SignalingServer] Unknown message type: ${msg.type}`);
        }
    });

    ws.on('close', () => {
        handleDisconnect(ws);
    });

    ws.on('error', (err) => {
        console.error(`[SignalingServer] Error on conn#${ws.connectionId}:`, err.message);
    });
});

/**
 * El host crea una nueva room vacía.
 * Responde con { type: 'ROOM_CREATED', roomId, playerId: 'player_1' }
 */
function handleCreateRoom(ws, msg) {
    const roomId = generateRoomId();
    const playerId = 'player_1';

    rooms.set(roomId, {
        hostWs: ws,
        clients: new Map([[playerId, ws]])
    });

    ws.roomId = roomId;
    ws.playerId = playerId;
    ws.isHost = true;

    console.log(`[SignalingServer] Room created: ${roomId} by conn#${ws.connectionId}`);

    ws.send(JSON.stringify({
        type: 'ROOM_CREATED',
        roomId,
        playerId,
        maxPlayers: 4
    }));
}

/**
 * Un cliente se une a una room existente.
 * Responde con { type: 'ROOM_JOINED', roomId, playerId, existingPlayers: [] }
 * Notifica al host con { type: 'PLAYER_JOINED', playerId }
 */
function handleJoinRoom(ws, msg) {
    const { roomId } = msg;
    const room = rooms.get(roomId);

    if (!room) {
        ws.send(JSON.stringify({ type: 'ERROR', message: `Room '${roomId}' not found` }));
        return;
    }

    const currentPlayers = room.clients.size;
    if (currentPlayers >= 4) {
        ws.send(JSON.stringify({ type: 'ERROR', message: 'Room is full (4/4)' }));
        return;
    }

    const playerId = `player_${currentPlayers + 1}`;
    room.clients.set(playerId, ws);

    ws.roomId = roomId;
    ws.playerId = playerId;
    ws.isHost = false;

    console.log(`[SignalingServer] Player ${playerId} joined room ${roomId}`);

    // Inform the new client
    ws.send(JSON.stringify({
        type: 'ROOM_JOINED',
        roomId,
        playerId,
        existingPlayers: [...room.clients.keys()]
    }));

    // Notify host and all existing clients that a new player joined
    broadcast(room, {
        type: 'PLAYER_JOINED',
        playerId
    }, ws); // exclude the new player itself
}

/**
 * Relay genérico: reenvía el payload a todos los demás miembros de la room.
 * Si msg.to está especificado, lo envía solo a ese playerId.
 * msg: { type: 'RELAY', to?: 'player_2', payload: { ... } }
 */
function handleRelay(ws, msg) {
    const room = rooms.get(ws.roomId);
    if (!room) return;

    const wrappedPayload = {
        ...msg.payload,
        from: ws.playerId
    };

    if (msg.to) {
        // Unicast
        const targetWs = room.clients.get(msg.to);
        if (targetWs && targetWs.readyState === 1) {
            targetWs.send(JSON.stringify(wrappedPayload));
        }
    } else {
        // Broadcast to everyone except sender
        broadcast(room, wrappedPayload, ws);
    }
}

/**
 * Un jugador indica que está listo (UI cargada).
 * Cuando todos los jugadores están listos, el host recibe START_GAME.
 */
function handlePlayerReady(ws, msg) {
    const room = rooms.get(ws.roomId);
    if (!room) return;

    if (!room.readyPlayers) room.readyPlayers = new Set();
    room.readyPlayers.add(ws.playerId);

    console.log(`[SignalingServer] ${ws.playerId} is ready in room ${ws.roomId}. (${room.readyPlayers.size}/${room.clients.size})`);

    // Notify everyone about who's ready
    broadcast(room, {
        type: 'PLAYER_READY',
        playerId: ws.playerId,
        readyCount: room.readyPlayers.size,
        totalPlayers: room.clients.size
    });
}

/**
 * Gestiona la desconexión de un jugador.
 */
function handleDisconnect(ws) {
    console.log(`[SignalingServer] conn#${ws.connectionId} disconnected (playerId: ${ws.playerId}, room: ${ws.roomId})`);

    if (!ws.roomId || !ws.playerId) return;

    const room = rooms.get(ws.roomId);
    if (!room) return;

    room.clients.delete(ws.playerId);

    if (room.clients.size === 0) {
        rooms.delete(ws.roomId);
        console.log(`[SignalingServer] Room ${ws.roomId} deleted (empty)`);
        return;
    }

    // Notify remaining players
    broadcast(room, {
        type: 'PLAYER_LEFT',
        playerId: ws.playerId
    });

    // If the host left, promote next player
    if (ws.isHost && room.clients.size > 0) {
        const [newHostId, newHostWs] = room.clients.entries().next().value;
        room.hostWs = newHostWs;
        newHostWs.isHost = true;
        console.log(`[SignalingServer] Host transferred to ${newHostId} in room ${ws.roomId}`);
        newHostWs.send(JSON.stringify({ type: 'YOU_ARE_NOW_HOST', roomId: ws.roomId }));
    }
}

/**
 * Envía un mensaje a todos los miembros de la room, opcionalmente excluyendo uno.
 */
function broadcast(room, payload, excludeWs = null) {
    const raw = JSON.stringify(payload);
    for (const [, clientWs] of room.clients.entries()) {
        if (clientWs !== excludeWs && clientWs.readyState === 1) {
            clientWs.send(raw);
        }
    }
}

console.log(`[SignalingServer] Running on ws://localhost:${PORT}`);
console.log('[SignalingServer] Waiting for connections...');
