import React, { useEffect, useRef, useState, useCallback } from 'react';
import Phaser from 'phaser';
import MainScene from './scenes/MainScene';
import GameEngine from './core/GameEngine';
import EventBus, { EVENTS } from './events/EventBus';
import EventDebugger from './debug/EventDebugger';

// ----- Shared styles -----
const panelStyle = {
    position: 'fixed', // Cambiado a fixed para asegurar que cubra toda la ventana
    top: 0, left: 0, width: '100vw', height: '100vh',
    backgroundColor: '#0b0b13',
    backgroundImage: 'radial-gradient(circle at center, #1a1a2e 0%, #0b0b13 100%)', // Fondo con degradado
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    fontFamily: '"Courier New", monospace', color: '#fff',
    zIndex: 100,
    overflow: 'hidden'
};

const inputStyle = {
    background: '#111', color: '#00e5ff', 
    border: '2px solid #00e5ff',
    borderRadius: '8px', padding: '12px 20px', fontSize: '18px',
    outline: 'none', width: '280px', textAlign: 'center', 
    letterSpacing: '4px',
    boxShadow: '0 0 15px rgba(0, 229, 255, 0.2)',
    marginBottom: '20px'
};

const btnStyle = (color = '#00e5ff') => ({
    padding: '14px 40px', fontSize: '16px', fontWeight: 'bold',
    backgroundColor: 'rgba(0, 229, 255, 0.05)', color,
    border: `2px solid ${color}`, borderRadius: '10px',
    cursor: 'pointer', letterSpacing: '3px', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    minWidth: '240px',
    textTransform: 'uppercase',
    boxShadow: `0 4px 15px ${color}44`,
    display: 'flex', alignItems: 'center', justifyContent: 'center'
});

// ===== LOBBY SCREEN (shown before joining) =====
const LobbyScreen = ({ onHost, onJoin, onSolo, error }) => {
    const [roomInput, setRoomInput] = useState('');

    return (
        <div style={panelStyle}>
            <h1 style={{ fontSize: '36px', color: '#ff007f', marginBottom: '8px', letterSpacing: '4px' }}>
                EL AFTER
            </h1>
            <p style={{ color: '#888', marginBottom: '40px', fontSize: '13px' }}>DEL CONURBANO</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
                {/* SOLO */}
                <button style={btnStyle('#ffae00')} onClick={onSolo}>
                    ⚔️ JUGAR SOLO
                </button>

                <div style={{ color: '#333', margin: '8px 0', letterSpacing: '6px', fontSize: '11px' }}>── MULTIJUGADOR ──</div>

                {/* HOST */}
                <button style={btnStyle('#00e5ff')} onClick={onHost}>
                    🎮 CREAR SALA
                </button>

                <div style={{ color: '#555', margin: '4px 0' }}>─ o ─</div>

                {/* JOIN */}
                <input
                    style={inputStyle}
                    placeholder="CÓDIGO DE SALA"
                    value={roomInput}
                    onChange={e => setRoomInput(e.target.value.toUpperCase())}
                    maxLength={6}
                />
                <button
                    style={btnStyle('#ff007f')}
                    onClick={() => onJoin(roomInput)}
                    disabled={roomInput.length < 4}
                >
                    🔗 UNIRSE
                </button>
            </div>

            {error && (
                <p style={{ color: '#ff003c', marginTop: '24px', fontSize: '14px' }}>{error}</p>
            )}
        </div>
    );
};

// ===== WAITING ROOM (host created, waiting for players) =====
const WaitingRoom = ({ roomId, players, onStart }) => (
    <div style={panelStyle}>
        <div style={{
            background: 'rgba(20, 20, 35, 0.8)',
            padding: '40px',
            borderRadius: '20px',
            border: '1px solid rgba(255, 0, 127, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            boxShadow: '0 0 30px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(10px)'
        }}>
            <h2 style={{ color: '#00e5ff', marginBottom: '8px', letterSpacing: '3px', fontSize: '28px' }}>SALA CREADA</h2>
            <p style={{ color: '#888', fontSize: '14px', marginBottom: '32px' }}>Código de acceso para tus amigos</p>
            
            <div style={{
                fontSize: '48px', fontWeight: 'bold', letterSpacing: '15px',
                color: '#fff', background: '#000', padding: '20px 40px',
                border: '2px solid #ff007f', borderRadius: '12px', marginBottom: '40px',
                boxShadow: '0 0 20px rgba(255, 0, 127, 0.4)',
                textShadow: '0 0 10px rgba(255, 255, 255, 0.5)'
            }}>
                {roomId}
            </div>

            <div style={{ marginBottom: '40px', width: '320px' }}>
                <p style={{ color: '#00e5ff', fontSize: '13px', fontWeight: 'bold', marginBottom: '16px', letterSpacing: '2px' }}>
                    JUGADORES CONECTADOS ({players.length}/4)
                </p>
                {players.map((pid, i) => (
                    <div key={pid} style={{
                        padding: '12px 20px', marginBottom: '10px', borderRadius: '8px',
                        background: 'rgba(0, 229, 255, 0.05)', 
                        border: `1px solid ${['#00e5ff','#39ff14','#ff6ec7','#ffae00'][i]}44`,
                        color: ['#00e5ff','#39ff14','#ff6ec7','#ffae00'][i],
                        display: 'flex', alignItems: 'center', gap: '12px',
                        fontSize: '15px', fontWeight: '500'
                    }}>
                        <div style={{ 
                            width: '8px', height: '8px', borderRadius: '50%', 
                            background: ['#00e5ff','#39ff14','#ff6ec7','#ffae00'][i],
                            boxShadow: `0 0 8px ${['#00e5ff','#39ff14','#ff6ec7','#ffae00'][i]}`
                        }} />
                        <span>{pid === players[0] ? `${pid} (host)` : pid}</span>
                    </div>
                ))}
                {Array.from({ length: 4 - players.length }).map((_, i) => (
                    <div key={i} style={{
                        padding: '12px 20px', marginBottom: '10px', borderRadius: '8px',
                        background: 'rgba(255,255,255,0.02)', border: '1px dashed #333', color: '#444',
                        fontSize: '14px'
                    }}>
                        — Esperando jugador…
                    </div>
                ))}
            </div>

            <button style={btnStyle('#39ff14')} onClick={onStart}
                disabled={players.length < 2}>
                {players.length < 2 ? 'ESPERANDO JUGADORES…' : '▶ EMPEZAR PARTIDA'}
            </button>
            
            {players.length < 2 && (
                <p style={{ color: '#555', fontSize: '12px', marginTop: '16px', fontStyle: 'italic' }}>
                    Se necesitan al menos 2 personas para jugar
                </p>
            )}
        </div>
    </div>
);

// ===== MAIN GAME COMPONENT =====
const GameComponent = ({ onExit }) => {
    const gameRef = useRef(null);
    const engineRef = useRef(null);

    // UI States
    const [screen, setScreen] = useState('lobby'); // 'lobby' | 'waiting' | 'playing'
    const [roomId, setRoomId] = useState(null);
    const [players, setPlayers] = useState([]);
    const [localPlayerId, setLocalPlayerId] = useState(null);
    const [playerHp, setPlayerHp] = useState({ current: 100, max: 100 });
    const [endResult, setEndResult] = useState(null); // null | 'died' | 'won' | 'gameover'
    const [lobbyError, setLobbyError] = useState(null);

    const startPhaserGame = useCallback((engine, myPlayerId) => {
        if (gameRef.current) return;

        const config = {
            type: Phaser.AUTO,
            parent: 'phaser-container',
            width: window.innerWidth,
            height: window.innerHeight,
            physics: { default: 'arcade', arcade: { debug: false } },
            scene: [MainScene],
            backgroundColor: '#111116',
            pixelArt: true,
        };

        const game = new Phaser.Game(config);
        gameRef.current = game;

        game.registry.set('localPlayerId', myPlayerId);
        game.registry.set('inputMode', engine.mode === 'client' ? 'remote' : 'local');
        if (engine.mode === 'client' && engine.networkClient) {
            game.registry.set('networkClient', engine.networkClient);
        }

        const onPlayerHpChanged = (msg) => {
            if (msg.senderId === myPlayerId) {
                setPlayerHp({ current: msg.float1, max: msg.float2 });
            }
        };

        // Per-player death: only show game over if THIS player died
        const onPlayerDied = (msg) => {
            if (msg.senderId === myPlayerId) {
                setEndResult('died');
            }
        };

        // Victory: last one standing
        const onPlayerWon = (msg) => {
            if (msg.senderId === myPlayerId) {
                setEndResult('won');
            } else {
                // This player isn't the winner → they already got 'died'
                // or they're spectating
            }
        };

        // Solo mode game over
        const onGameOver = () => {
            setEndResult(prev => prev || 'gameover');
        };

        EventBus.subscribe(EVENTS.PLAYER_HP_CHANGED, onPlayerHpChanged);
        EventBus.subscribe(EVENTS.PLAYER_DIED, onPlayerDied);
        EventBus.subscribe(EVENTS.PLAYER_WON, onPlayerWon);
        EventBus.subscribe(EVENTS.GAME_OVER, onGameOver);
    }, []);

    const handleHost = useCallback(async () => {
        setLobbyError(null);
        try {
            const engine = new GameEngine({ mode: 'host' });
            engineRef.current = engine;

            await engine.start();
            const rid = engine.roomId;
            const myId = engine.networkHost.playerId;

            engine.networkHost.onPlayerJoined = (pid) => {
                setPlayers(prev => [...prev, pid]);
            };
            engine.networkHost.onPlayerLeft = (pid) => {
                setPlayers(prev => prev.filter(p => p !== pid));
            };

            setRoomId(rid);
            setLocalPlayerId(myId);
            setPlayers([myId]);
            setScreen('waiting');
        } catch (err) {
            console.error(err);
            setLobbyError('No se pudo conectar al servidor. ¿Está corriendo SignalingServer?');
        }
    }, [startPhaserGame]);

    const handleJoin = useCallback(async (inputRoomId) => {
        setLobbyError(null);
        if (!inputRoomId || inputRoomId.length < 4) {
            setLobbyError('Ingresá un código de sala válido.');
            return;
        }
        try {
            const engine = new GameEngine({ mode: 'client', roomId: inputRoomId });
            engineRef.current = engine;

            const myId = await engine.start();
            setLocalPlayerId(myId || 'client');
            setRoomId(inputRoomId);
            setScreen('playing');
            // Clients go directly to game — host controls when the match starts
            startPhaserGame(engine, myId);
        } catch (err) {
            console.error(err);
            setLobbyError(`No se pudo unir a la sala "${inputRoomId}".`);
        }
    }, [startPhaserGame]);

    const handleSolo = useCallback(() => {
        setLobbyError(null);
        const engine = new GameEngine({ mode: 'solo' });
        engineRef.current = engine;
        engine.start().then(() => {
            // Enable enemy spawner for solo mode
            if (engine.simulation && engine.simulation.enemySpawner) {
                engine.simulation.enemySpawner.enabled = true;
            }
            setLocalPlayerId('player_1');
            setScreen('playing');
            startPhaserGame(engine, 'player_1');
        });
    }, [startPhaserGame]);

    const handleStart = useCallback(() => {
        setScreen('playing');
        startPhaserGame(engineRef.current, localPlayerId);
    }, [localPlayerId, startPhaserGame]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (engineRef.current) {
                engineRef.current.stop();
                engineRef.current = null;
            }
            if (gameRef.current) {
                gameRef.current.destroy(true);
                gameRef.current = null;
            }
            EventBus.resetAll();
        };
    }, []);

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            {/* PHASER container — always in DOM, but invisible until playing */}
            <div id="phaser-container" style={{ display: screen === 'playing' ? 'block' : 'none' }} />

            {/* ---- SCREENS ---- */}
            {screen === 'lobby' && (
                <LobbyScreen onHost={handleHost} onJoin={handleJoin} onSolo={handleSolo} error={lobbyError} />
            )}
            {screen === 'waiting' && (
                <WaitingRoom roomId={roomId} players={players} onStart={handleStart} />
            )}

            {/* ---- IN-GAME UI (only when playing) ---- */}
            {screen === 'playing' && (
                <>
                    <EventDebugger gameEngine={engineRef.current} />

                    {/* Player HP bar */}
                    {!endResult && (
                        <div style={{
                            position: 'absolute', bottom: 20, left: 20, zIndex: 10,
                            background: 'rgba(0,0,0,0.8)', padding: '10px 20px',
                            border: '2px solid #00e5ff', borderRadius: '8px',
                            color: '#fff', fontFamily: 'monospace', minWidth: '200px'
                        }}>
                            <div style={{ marginBottom: '5px', fontSize: '14px', color: '#00e5ff' }}>
                                {localPlayerId ?? 'JUGADOR'}
                            </div>
                            <div style={{ width: '100%', height: '15px', background: '#333', border: '1px solid #555' }}>
                                <div style={{
                                    width: `${(playerHp.current / playerHp.max) * 100}%`,
                                    height: '100%',
                                    background: playerHp.current > 30 ? '#00ffaa' : '#ff003c',
                                    transition: 'width 0.2s ease-out'
                                }} />
                            </div>
                            <div style={{ textAlign: 'right', fontSize: '12px', marginTop: '2px' }}>
                                {playerHp.current} / {playerHp.max} HP
                            </div>
                        </div>
                    )}

                    {/* Room badge */}
                    {roomId && (
                        <div style={{
                            position: 'absolute', top: 10, right: 50, zIndex: 10,
                            background: 'rgba(0,0,0,0.7)', padding: '4px 12px',
                            border: '1px solid #ff007f', borderRadius: '6px',
                            color: '#ff007f', fontFamily: 'monospace', fontSize: '12px'
                        }}>
                            SALA: {roomId}
                        </div>
                    )}

                    {/* ===== VICTORY SCREEN ===== */}
                    {endResult === 'won' && (
                        <div style={{
                            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                            background: 'radial-gradient(circle, rgba(0,80,0,0.85) 0%, rgba(0,30,0,0.95) 100%)',
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center', zIndex: 50,
                            animation: 'fadeIn 0.5s ease'
                        }}>
                            <div style={{ fontSize: '72px', marginBottom: '16px' }}>🏆</div>
                            <h1 style={{
                                color: '#39ff14', fontSize: '52px', marginBottom: '12px',
                                textShadow: '0 0 20px #39ff14, 0 0 40px #39ff14',
                                letterSpacing: '6px', fontFamily: 'monospace'
                            }}>
                                ¡GANASTE!
                            </h1>
                            <p style={{ color: '#aaffaa', fontSize: '18px', marginBottom: '40px', fontFamily: 'monospace' }}>
                                Último en pie en el After
                            </p>
                            <button onClick={() => window.location.reload()} style={{
                                ...btnStyle('#39ff14'),
                                padding: '16px 40px', fontSize: '18px',
                                boxShadow: '0 0 30px rgba(57, 255, 20, 0.4)'
                            }}>
                                VOLVER AL LOBBY
                            </button>
                        </div>
                    )}

                    {/* ===== DEATH SCREEN (PvP) ===== */}
                    {endResult === 'died' && (
                        <div style={{
                            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                            background: 'radial-gradient(circle, rgba(100,0,0,0.85) 0%, rgba(30,0,0,0.95) 100%)',
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center', zIndex: 50,
                            animation: 'fadeIn 0.5s ease'
                        }}>
                            <div style={{ fontSize: '72px', marginBottom: '16px' }}>💀</div>
                            <h1 style={{
                                color: '#ff003c', fontSize: '48px', marginBottom: '12px',
                                textShadow: '0 0 20px #ff003c',
                                letterSpacing: '4px', fontFamily: 'monospace'
                            }}>
                                ¡TE DEJARON PINCHADO!
                            </h1>
                            <p style={{ color: '#ff9999', fontSize: '16px', marginBottom: '40px', fontFamily: 'monospace' }}>
                                Alguien te bailó encima…
                            </p>
                            <button onClick={() => window.location.reload()} style={{
                                ...btnStyle('#ff003c'),
                                padding: '16px 40px', fontSize: '18px'
                            }}>
                                VOLVER AL AFTER
                            </button>
                        </div>
                    )}

                    {/* ===== GAME OVER (solo mode) ===== */}
                    {endResult === 'gameover' && (
                        <div style={{
                            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                            background: 'rgba(0, 0, 0, 0.85)',
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center', zIndex: 50
                        }}>
                            <h1 style={{
                                color: '#fff', fontSize: '48px', marginBottom: '20px',
                                textShadow: '2px 2px 4px #000'
                            }}>
                                ¡TE DEJARON PINCHADO!
                            </h1>
                            <button onClick={() => window.location.reload()} style={{
                                ...btnStyle('#ff003c'),
                                padding: '16px 40px', fontSize: '18px'
                            }}>
                                VOLVER AL AFTER
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* Exit button always visible */}
            <button style={{
                position: 'absolute', top: 10, left: 10, zIndex: 110,
                background: 'rgba(0,0,0,0.5)', color: '#fff',
                border: '1px solid #ff007f', cursor: 'pointer', padding: '5px 10px'
            }} onClick={onExit}>
                Volver al Boliche
            </button>
        </div>
    );
};

export default GameComponent;
