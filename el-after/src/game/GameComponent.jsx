import React, { useCallback, useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import MainScene from './scenes/MainScene';
import GameEngine from './core/GameEngine';
import EventBus, { EVENTS, MessagePriority } from './events/EventBus';
import EventDebugger from './debug/EventDebugger';
import WEAPON_LOADOUT from './data/weapons';

const panelStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: '#0b0b13',
    backgroundImage: 'radial-gradient(circle at center, #1a1a2e 0%, #0b0b13 100%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: '"Courier New", monospace',
    color: '#fff',
    zIndex: 100,
    overflow: 'hidden'
};

const inputStyle = {
    background: '#111',
    color: '#00e5ff',
    border: '2px solid #00e5ff',
    borderRadius: '8px',
    padding: '12px 20px',
    fontSize: '18px',
    outline: 'none',
    width: '280px',
    textAlign: 'center',
    letterSpacing: '4px',
    boxShadow: '0 0 15px rgba(0, 229, 255, 0.2)',
    marginBottom: '20px'
};

const btnStyle = (color = '#00e5ff') => ({
    padding: '14px 40px',
    fontSize: '16px',
    fontWeight: 'bold',
    backgroundColor: 'rgba(0, 229, 255, 0.05)',
    color,
    border: `2px solid ${color}`,
    borderRadius: '10px',
    cursor: 'pointer',
    letterSpacing: '3px',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    minWidth: '240px',
    textTransform: 'uppercase',
    boxShadow: `0 4px 15px ${color}44`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
});

const LobbyScreen = ({ onHost, onJoin, onSolo, error }) => {
    const [roomInput, setRoomInput] = useState('');

    return (
        <div style={panelStyle}>
            <h1 style={{ fontSize: '36px', color: '#ff007f', marginBottom: '8px', letterSpacing: '4px' }}>
                EL AFTER
            </h1>
            <p style={{ color: '#888', marginBottom: '40px', fontSize: '13px' }}>DEL CONURBANO</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
                <button style={btnStyle('#ffae00')} onClick={onSolo}>
                    JUGAR SOLO
                </button>

                <div style={{ color: '#333', margin: '8px 0', letterSpacing: '6px', fontSize: '11px' }}>
                    MULTIJUGADOR
                </div>

                <button style={btnStyle('#00e5ff')} onClick={onHost}>
                    CREAR SALA
                </button>

                <div style={{ color: '#555', margin: '4px 0' }}>o</div>

                <input
                    style={inputStyle}
                    placeholder="CODIGO DE SALA"
                    value={roomInput}
                    onChange={(event) => setRoomInput(event.target.value.toUpperCase())}
                    maxLength={6}
                />
                <button
                    style={btnStyle('#ff007f')}
                    onClick={() => onJoin(roomInput)}
                    disabled={roomInput.length < 4}
                >
                    UNIRSE
                </button>
            </div>

            {error && (
                <p style={{ color: '#ff003c', marginTop: '24px', fontSize: '14px' }}>{error}</p>
            )}
        </div>
    );
};

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
            <h2 style={{ color: '#00e5ff', marginBottom: '8px', letterSpacing: '3px', fontSize: '28px' }}>
                SALA CREADA
            </h2>
            <p style={{ color: '#888', fontSize: '14px', marginBottom: '32px' }}>
                Codigo de acceso para tus amigos
            </p>

            <div style={{
                fontSize: '48px',
                fontWeight: 'bold',
                letterSpacing: '15px',
                color: '#fff',
                background: '#000',
                padding: '20px 40px',
                border: '2px solid #ff007f',
                borderRadius: '12px',
                marginBottom: '40px',
                boxShadow: '0 0 20px rgba(255, 0, 127, 0.4)',
                textShadow: '0 0 10px rgba(255, 255, 255, 0.5)'
            }}>
                {roomId}
            </div>

            <div style={{ marginBottom: '40px', width: '320px' }}>
                <p style={{ color: '#00e5ff', fontSize: '13px', fontWeight: 'bold', marginBottom: '16px', letterSpacing: '2px' }}>
                    JUGADORES CONECTADOS ({players.length}/4)
                </p>
                {players.map((pid, index) => (
                    <div key={pid} style={{
                        padding: '12px 20px',
                        marginBottom: '10px',
                        borderRadius: '8px',
                        background: 'rgba(0, 229, 255, 0.05)',
                        border: `1px solid ${['#00e5ff', '#39ff14', '#ff6ec7', '#ffae00'][index]}44`,
                        color: ['#00e5ff', '#39ff14', '#ff6ec7', '#ffae00'][index],
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        fontSize: '15px',
                        fontWeight: '500'
                    }}>
                        <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: ['#00e5ff', '#39ff14', '#ff6ec7', '#ffae00'][index],
                            boxShadow: `0 0 8px ${['#00e5ff', '#39ff14', '#ff6ec7', '#ffae00'][index]}`
                        }} />
                        <span>{pid === players[0] ? `${pid} (host)` : pid}</span>
                    </div>
                ))}
                {Array.from({ length: 4 - players.length }).map((_, index) => (
                    <div key={index} style={{
                        padding: '12px 20px',
                        marginBottom: '10px',
                        borderRadius: '8px',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px dashed #333',
                        color: '#444',
                        fontSize: '14px'
                    }}>
                        Esperando jugador...
                    </div>
                ))}
            </div>

            <button style={btnStyle('#39ff14')} onClick={onStart} disabled={players.length < 2}>
                {players.length < 2 ? 'ESPERANDO JUGADORES...' : 'EMPEZAR PARTIDA'}
            </button>

            {players.length < 2 && (
                <p style={{ color: '#555', fontSize: '12px', marginTop: '16px', fontStyle: 'italic' }}>
                    Se necesitan al menos 2 personas para jugar
                </p>
            )}
        </div>
    </div>
);

const initialWeaponState = {
    slot: 1,
    name: 'Los Punos',
    family: 'combo_melee'
};

const initialChargeState = {
    active: false,
    ratio: 0,
    slot: 0
};

const initialRunStats = {
    runTimeSeconds: 0,
    score: 0,
    kills: 0,
    killsByType: {},
    level: 1,
    xp: 0,
    nextLevelXp: 80,
    activeBuffs: [],
    dashState: {
        ready: true,
        cooldownMs: 0,
        activeMs: 0
    },
    playerStats: {
        maxHp: 100,
        speedMultiplier: 1,
        attackSpeedMultiplier: 1,
        damageMultiplier: 1,
        armor: 0,
        regenPerSecond: 0
    }
};

const initialLevelUpState = {
    active: false,
    level: 1,
    choices: []
};

const buildWeaponLevels = () => Object.fromEntries(
    WEAPON_LOADOUT.map((weapon) => [weapon.id, weapon.level || 1])
);

const GameComponent = ({ onExit }) => {
    const gameRef = useRef(null);
    const engineRef = useRef(null);

    const [screen, setScreen] = useState('lobby');
    const [roomId, setRoomId] = useState(null);
    const [players, setPlayers] = useState([]);
    const [localPlayerId, setLocalPlayerId] = useState(null);
    const [playerHp, setPlayerHp] = useState({ current: 100, max: 100 });
    const [endResult, setEndResult] = useState(null);
    const [lobbyError, setLobbyError] = useState(null);
    const [currentWave, setCurrentWave] = useState(0);
    const [currentWeapon, setCurrentWeapon] = useState(initialWeaponState);
    const [attackCharge, setAttackCharge] = useState(initialChargeState);
    const [isPaused, setIsPaused] = useState(false);
    const [runStats, setRunStats] = useState(initialRunStats);
    const [levelUpState, setLevelUpState] = useState(initialLevelUpState);
    const [weaponLevels, setWeaponLevels] = useState(buildWeaponLevels);

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
            pixelArt: true
        };

        const game = new Phaser.Game(config);
        gameRef.current = game;

        game.registry.set('localPlayerId', myPlayerId);
        game.registry.set('inputMode', engine.mode === 'client' ? 'remote' : 'local');
        game.registry.set('isPaused', false);

        if (engine.mode === 'client' && engine.networkClient) {
            game.registry.set('networkClient', engine.networkClient);
        }

        const onPlayerHpChanged = (msg) => {
            if (msg.senderId === myPlayerId) {
                setPlayerHp({ current: msg.float1, max: msg.float2 });
            }
        };

        const onPlayerDied = (msg) => {
            if (msg.senderId === myPlayerId) {
                if (gameRef.current) gameRef.current.registry.set('isPaused', false);
                setIsPaused(false);
                setLevelUpState(initialLevelUpState);
                setEndResult('died');
            }
        };

        const onPlayerWon = (msg) => {
            if (msg.senderId === myPlayerId) {
                if (gameRef.current) gameRef.current.registry.set('isPaused', false);
                setIsPaused(false);
                setLevelUpState(initialLevelUpState);
                setEndResult('won');
            }
        };

        const onGameOver = () => {
            if (gameRef.current) gameRef.current.registry.set('isPaused', false);
            setIsPaused(false);
            setLevelUpState(initialLevelUpState);
            setEndResult((previous) => previous || 'gameover');
        };

        const onWeaponChanged = (msg) => {
            if (msg.senderId === myPlayerId) {
                setCurrentWeapon({
                    slot: msg.int1,
                    name: msg.string1,
                    family: msg.object1?.family || 'unknown'
                });
                setWeaponLevels((previous) => ({
                    ...previous,
                    [msg.object1?.id]: msg.object1?.level || 1
                }));
            }
        };

        const onChargeUpdated = (msg) => {
            if (msg.senderId === myPlayerId) {
                setAttackCharge({
                    active: msg.object1?.active || false,
                    ratio: msg.float1 || 0,
                    slot: msg.int1 || 0
                });
            }
        };

        const onWaveChanged = (msg) => {
            setCurrentWave(msg.int1);
        };

        const onRunStatsUpdated = (msg) => {
            if (msg.senderId === myPlayerId) {
                setRunStats({
                    ...initialRunStats,
                    ...msg.object1
                });
            }
        };

        const onLevelUpReady = (msg) => {
            if (msg.senderId !== myPlayerId) return;

            setLevelUpState({
                active: true,
                level: msg.int1 || msg.object1?.level || 1,
                choices: msg.object1?.choices || []
            });

            if (engineRef.current?.mode === 'solo') {
                engineRef.current.pause();
                if (gameRef.current) {
                    gameRef.current.registry.set('isPaused', true);
                }
            }
        };

        const onLevelUpResolved = (msg) => {
            if (msg.senderId === myPlayerId) {
                setLevelUpState(initialLevelUpState);
            }
        };

        EventBus.subscribe(EVENTS.PLAYER_HP_CHANGED, onPlayerHpChanged);
        EventBus.subscribe(EVENTS.PLAYER_DIED, onPlayerDied);
        EventBus.subscribe(EVENTS.PLAYER_WON, onPlayerWon);
        EventBus.subscribe(EVENTS.GAME_OVER, onGameOver);
        EventBus.subscribe(EVENTS.PLAYER_WEAPON_CHANGED, onWeaponChanged);
        EventBus.subscribe(EVENTS.ATTACK_CHARGE_UPDATED, onChargeUpdated);
        EventBus.subscribe(EVENTS.WAVE_CHANGED, onWaveChanged);
        EventBus.subscribe(EVENTS.RUN_STATS_UPDATED, onRunStatsUpdated);
        EventBus.subscribe(EVENTS.LEVEL_UP_READY, onLevelUpReady);
        EventBus.subscribe(EVENTS.LEVEL_UP_RESOLVED, onLevelUpResolved);
    }, []);

    const togglePause = useCallback(() => {
        const engine = engineRef.current;
        if (!engine || engine.mode !== 'solo' || screen !== 'playing' || endResult || levelUpState.active) return;

        const nextPaused = !isPaused;
        if (nextPaused) {
            engine.pause();
        } else {
            engine.resume();
        }

        if (gameRef.current) {
            gameRef.current.registry.set('isPaused', nextPaused);
        }

        setIsPaused(nextPaused);
    }, [endResult, isPaused, levelUpState.active, screen]);

    const handleLevelChoice = useCallback((choiceId) => {
        if (!choiceId || !levelUpState.active) return;

        const engine = engineRef.current;

        EventBus.enqueueCommand(EVENTS.LEVEL_UP_CHOICE_REQUEST, MessagePriority.CRITICAL, {
            senderId: localPlayerId,
            string1: choiceId
        });

        if (engine?.mode === 'solo') {
            engine.step();

            if (!isPaused && !endResult) {
                engine.resume();
                if (gameRef.current) {
                    gameRef.current.registry.set('isPaused', false);
                }
            }
        }
    }, [endResult, isPaused, levelUpState.active, localPlayerId]);

    const handleHost = useCallback(async () => {
        setLobbyError(null);

        try {
            const engine = new GameEngine({ mode: 'host' });
            engineRef.current = engine;

            await engine.start();
            const rid = engine.roomId;
            const myId = engine.networkHost.playerId;

            engine.networkHost.onPlayerJoined = (pid) => {
                setPlayers((previous) => [...previous, pid]);
            };
            engine.networkHost.onPlayerLeft = (pid) => {
                setPlayers((previous) => previous.filter((playerId) => playerId !== pid));
            };

            setRoomId(rid);
            setLocalPlayerId(myId);
            setPlayers([myId]);
            setScreen('waiting');
        } catch (error) {
            console.error(error);
            setLobbyError('No se pudo conectar al servidor. Esta corriendo SignalingServer?');
        }
    }, []);

    const handleJoin = useCallback(async (inputRoomId) => {
        setLobbyError(null);
        if (!inputRoomId || inputRoomId.length < 4) {
            setLobbyError('Ingresa un codigo de sala valido.');
            return;
        }

        try {
            const engine = new GameEngine({ mode: 'client', roomId: inputRoomId });
            engineRef.current = engine;

            const myId = await engine.start();
            setCurrentWave(0);
            setCurrentWeapon(initialWeaponState);
            setAttackCharge(initialChargeState);
            setRunStats(initialRunStats);
            setLevelUpState(initialLevelUpState);
            setPlayerHp({ current: 100, max: 100 });
            setWeaponLevels(buildWeaponLevels());
            setIsPaused(false);
            setEndResult(null);
            setLocalPlayerId(myId || 'client');
            setRoomId(inputRoomId);
            setScreen('playing');
            startPhaserGame(engine, myId);
        } catch (error) {
            console.error(error);
            setLobbyError(`No se pudo unir a la sala "${inputRoomId}".`);
        }
    }, [startPhaserGame]);

    const handleSolo = useCallback(() => {
        setLobbyError(null);
        const engine = new GameEngine({ mode: 'solo' });
        engineRef.current = engine;

        engine.start().then(() => {
            setCurrentWave(0);
            setCurrentWeapon(initialWeaponState);
            setAttackCharge(initialChargeState);
            setRunStats(initialRunStats);
            setLevelUpState(initialLevelUpState);
            setPlayerHp({ current: 100, max: 100 });
            setWeaponLevels(buildWeaponLevels());
            setIsPaused(false);
            setEndResult(null);
            setLocalPlayerId('player_1');
            setScreen('playing');
            startPhaserGame(engine, 'player_1');
        });
    }, [startPhaserGame]);

    const handleStart = useCallback(() => {
        setCurrentWave(0);
        setCurrentWeapon(initialWeaponState);
        setAttackCharge(initialChargeState);
        setRunStats(initialRunStats);
        setLevelUpState(initialLevelUpState);
        setPlayerHp({ current: 100, max: 100 });
        setWeaponLevels(buildWeaponLevels());
        setIsPaused(false);
        setEndResult(null);
        setScreen('playing');
        startPhaserGame(engineRef.current, localPlayerId);
    }, [localPlayerId, startPhaserGame]);

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

    useEffect(() => {
        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                togglePause();
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [togglePause]);

    useEffect(() => {
        if (!levelUpState.active) return undefined;

        const onChoiceHotkey = (event) => {
            const keyNumber = Number.parseInt(event.key, 10);
            if (!Number.isInteger(keyNumber) || keyNumber < 1 || keyNumber > levelUpState.choices.length) {
                return;
            }

            event.preventDefault();
            handleLevelChoice(levelUpState.choices[keyNumber - 1]?.id);
        };

        window.addEventListener('keydown', onChoiceHotkey);
        return () => window.removeEventListener('keydown', onChoiceHotkey);
    }, [handleLevelChoice, levelUpState]);

    const formatHpValue = (value) => Math.max(0, Math.round(value || 0));
    const currentHpDisplay = formatHpValue(playerHp.current);
    const maxHpDisplay = formatHpValue(playerHp.max);
    const formattedRunTime = `${String(Math.floor(runStats.runTimeSeconds / 60)).padStart(2, '0')}:${String(runStats.runTimeSeconds % 60).padStart(2, '0')}`;
    const dashLabel = runStats.dashState.activeMs > 0
        ? 'esquivando'
        : (runStats.dashState.ready ? 'listo' : `${(runStats.dashState.cooldownMs / 1000).toFixed(1)} s`);
    const killEntries = Object.entries(runStats.killsByType || {});
    const playerStatSnapshot = runStats.playerStats || initialRunStats.playerStats;
    const formatNumber = (value, decimals = 0) => Number.isFinite(value) ? value.toFixed(decimals) : '0';
    const formatPercentChange = (value) => `${value >= 0 ? '+' : ''}${value.toFixed(0)}%`;
    const statsDisplay = [
        {
            label: 'Vel',
            value: formatPercentChange((playerStatSnapshot.speedMultiplier - 1) * 100)
        },
        {
            label: 'Cad',
            value: formatPercentChange((playerStatSnapshot.attackSpeedMultiplier - 1) * 100)
        },
        {
            label: 'Daño',
            value: formatPercentChange((playerStatSnapshot.damageMultiplier - 1) * 100)
        },
        {
            label: 'Armadura',
            value: `${formatNumber(playerStatSnapshot.armor, 0)}`
        },
        {
            label: 'Reg',
            value: `${formatNumber(playerStatSnapshot.regenPerSecond, 1)}/s`
        },
        {
            label: 'Vida máx',
            value: `${Math.round(playerStatSnapshot.maxHp)} HP`
        }
    ];

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <div id="phaser-container" style={{ display: screen === 'playing' ? 'block' : 'none' }} />

            {screen === 'lobby' && (
                <LobbyScreen onHost={handleHost} onJoin={handleJoin} onSolo={handleSolo} error={lobbyError} />
            )}

            {screen === 'waiting' && (
                <WaitingRoom roomId={roomId} players={players} onStart={handleStart} />
            )}

            {screen === 'playing' && (
                <>
                    <EventDebugger gameEngine={engineRef.current} />

                    {!endResult && (
                        <div style={{
                            position: 'absolute',
                            bottom: 20,
                            left: 20,
                            zIndex: 10,
                            background: 'rgba(0,0,0,0.8)',
                            padding: '10px 20px',
                            border: '2px solid #00e5ff',
                            borderRadius: '8px',
                            color: '#fff',
                            fontFamily: 'monospace',
                            minWidth: '240px'
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
                                {currentHpDisplay} / {maxHpDisplay} HP
                            </div>
                            <div style={{ marginTop: '8px', fontSize: '12px', color: '#ffae00' }}>
                                Arma [{currentWeapon.slot}]: {currentWeapon.name}
                            </div>
                            <div style={{ marginTop: '6px', fontSize: '12px', color: '#74d3ff' }}>
                                Dash [ESPACIO]: {dashLabel}
                            </div>
                            <div style={{ marginTop: '10px', display: 'grid', gap: '4px', fontSize: '11px' }}>
                                {WEAPON_LOADOUT.map((weapon) => (
                                    <div
                                        key={weapon.id}
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            color: currentWeapon.slot === weapon.slot ? '#ffffff' : weapon.selectable ? '#888' : '#555'
                                        }}
                                    >
                                        <span>[{weapon.slot}] {weapon.name} · Lv {weaponLevels[weapon.id] ?? 1}</span>
                                        <span>{weapon.selectable ? 'lista' : 'reservado'}</span>
                                    </div>
                                ))}
                            </div>
                            {attackCharge.active && attackCharge.slot === 4 && (
                                <div style={{ marginTop: '10px' }}>
                                    <div style={{ fontSize: '11px', color: '#ff6ec7', marginBottom: '4px' }}>
                                        Casteando botella
                                    </div>
                                    <div style={{ width: '100%', height: '10px', background: '#26112a', border: '1px solid #6a2b70' }}>
                                        <div style={{
                                            width: `${Math.round(attackCharge.ratio * 100)}%`,
                                            height: '100%',
                                            background: 'linear-gradient(90deg, #ff6ec7 0%, #ffae00 100%)',
                                            transition: 'width 0.08s linear'
                                        }} />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {!endResult && (
                        <div style={{
                            position: 'absolute',
                            top: 20,
                            left: 20,
                            zIndex: 10,
                            background: 'rgba(0,0,0,0.75)',
                            padding: '10px 16px',
                            border: '2px solid #ff007f',
                            borderRadius: '8px',
                            color: '#fff',
                            fontFamily: 'monospace'
                        }}>
                            <div style={{ color: '#ff007f', fontSize: '12px', marginBottom: '4px' }}>
                                HORA DEL AFTER
                            </div>
                            <div style={{ fontSize: '20px', letterSpacing: '2px' }}>
                                OLA {Math.max(1, currentWave)}
                            </div>
                            {engineRef.current?.mode === 'solo' && (
                                <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>
                                    ESC para {isPaused ? 'reanudar' : 'pausar'}
                                </div>
                            )}
                        </div>
                    )}

                    {!endResult && (
                        <div style={{
                            position: 'absolute',
                            top: 20,
                            right: 20,
                            zIndex: 10,
                            width: '280px',
                            background: 'rgba(0,0,0,0.82)',
                            padding: '12px 16px',
                            border: '2px solid #39ff14',
                            borderRadius: '10px',
                            color: '#fff',
                            fontFamily: 'monospace',
                            boxShadow: '0 0 18px rgba(57, 255, 20, 0.12)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#39ff14', fontSize: '12px' }}>
                                <span>RUN EN CURSO</span>
                                <span>{formattedRunTime}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '12px' }}>
                                <div>Puntos</div>
                                <div style={{ textAlign: 'right', color: '#ffae00' }}>{runStats.score}</div>
                                <div>Bajas</div>
                                <div style={{ textAlign: 'right', color: '#ff6ec7' }}>{runStats.kills}</div>
                                <div>Nivel</div>
                                <div style={{ textAlign: 'right', color: '#74d3ff' }}>{runStats.level}</div>
                            </div>

                            <div style={{ marginTop: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#9bdcff', marginBottom: '4px' }}>
                                    <span>Experiencia</span>
                                    <span>{runStats.xp} / {runStats.nextLevelXp}</span>
                                </div>
                                <div style={{ width: '100%', height: '10px', background: '#15202d', border: '1px solid #2f4c66' }}>
                                    <div style={{
                                        width: `${Math.max(0, Math.min(100, (runStats.xp / Math.max(1, runStats.nextLevelXp)) * 100))}%`,
                                        height: '100%',
                                        background: 'linear-gradient(90deg, #74d3ff 0%, #39ff14 100%)',
                                        transition: 'width 0.15s ease-out'
                                    }} />
                                </div>
                            </div>

                            <div style={{ marginTop: '10px', fontSize: '11px', color: '#bfbfbf' }}>
                                Dash: <span style={{ color: runStats.dashState.ready ? '#39ff14' : (runStats.dashState.activeMs > 0 ? '#74d3ff' : '#ffae00') }}>{dashLabel}</span>
                            </div>

                            {killEntries.length > 0 && (
                                <div style={{ marginTop: '10px', display: 'grid', gap: '4px', fontSize: '11px' }}>
                                    {killEntries.map(([enemyType, amount]) => (
                                        <div key={enemyType} style={{ display: 'flex', justifyContent: 'space-between', color: '#d7d7d7' }}>
                                            <span>{enemyType === 'bouncer' ? 'Patovas' : 'Fisuras'}</span>
                                            <span>{amount}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {runStats.activeBuffs.length === 0 && (
                                    <div style={{ fontSize: '10px', color: '#666' }}>Sin bebidas activas</div>
                                )}
                                {runStats.activeBuffs.map((buff) => (
                                    <div
                                        key={buff.id}
                                        style={{
                                            border: `1px solid #${buff.color.toString(16).padStart(6, '0')}`,
                                            color: '#fff',
                                            background: 'rgba(255,255,255,0.04)',
                                            borderRadius: '999px',
                                            padding: '4px 8px',
                                            fontSize: '10px'
                                        }}
                                    >
                                        {buff.name} {(buff.remainingMs / 1000).toFixed(1)}s
                                    </div>
                                ))}
                            </div>
                            <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                                <div style={{ fontSize: '11px', color: '#9bdcff', marginBottom: '6px' }}>Stats actuales</div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '6px', fontSize: '11px', color: '#d3d3d3' }}>
                                    {statsDisplay.map((stat) => (
                                        <div key={stat.label} style={{ padding: '6px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}>
                                            <div style={{ fontSize: '9px', color: '#8f97ac' }}>{stat.label}</div>
                                            <div style={{ fontSize: '13px', color: '#fff' }}>{stat.value}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {roomId && (
                        <div style={{
                            position: 'absolute',
                            top: 318,
                            right: 20,
                            zIndex: 10,
                            background: 'rgba(0,0,0,0.7)',
                            padding: '4px 12px',
                            border: '1px solid #ff007f',
                            borderRadius: '6px',
                            color: '#ff007f',
                            fontFamily: 'monospace',
                            fontSize: '12px'
                        }}>
                            SALA: {roomId}
                        </div>
                    )}

                    {levelUpState.active && !endResult && (
                        <div style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            width: '100vw',
                            height: '100vh',
                            background: 'rgba(5, 7, 18, 0.84)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 47,
                            backdropFilter: 'blur(10px)'
                        }}>
                            <div style={{
                                width: 'min(960px, calc(100vw - 48px))',
                                border: '2px solid #39ff14',
                                background: 'rgba(10, 14, 26, 0.94)',
                                borderRadius: '18px',
                                padding: '26px',
                                boxShadow: '0 0 28px rgba(57, 255, 20, 0.12)'
                            }}>
                                <div style={{ color: '#39ff14', fontSize: '13px', letterSpacing: '4px', fontFamily: 'monospace', marginBottom: '8px' }}>
                                    SUBIDA DE NIVEL
                                </div>
                                <div style={{ color: '#fff', fontSize: '30px', fontFamily: 'monospace', marginBottom: '8px' }}>
                                    Nivel {levelUpState.level}
                                </div>
                                <div style={{ color: '#8f97ac', fontSize: '13px', fontFamily: 'monospace', marginBottom: '20px' }}>
                                    Elegi una mejora para seguir sobreviviendo. Tambien podes usar 1, 2 o 3.
                                </div>

                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                                    gap: '14px'
                                }}>
                                    {levelUpState.choices.map((choice, index) => (
                                        <button
                                            key={choice.id}
                                            onClick={() => handleLevelChoice(choice.id)}
                                            style={{
                                                textAlign: 'left',
                                                border: '1px solid rgba(116, 211, 255, 0.4)',
                                                background: 'linear-gradient(180deg, rgba(18, 26, 42, 0.95) 0%, rgba(10, 13, 24, 0.98) 100%)',
                                                borderRadius: '14px',
                                                padding: '16px',
                                                color: '#fff',
                                                cursor: 'pointer',
                                                fontFamily: 'monospace',
                                                boxShadow: '0 0 18px rgba(116, 211, 255, 0.08)'
                                            }}
                                        >
                                            <div style={{ color: '#74d3ff', fontSize: '11px', marginBottom: '8px' }}>
                                                OPCION {index + 1}
                                            </div>
                                            <div style={{ fontSize: '18px', marginBottom: '8px' }}>
                                                {choice.title}
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#aeb7c9', lineHeight: 1.45 }}>
                                                {choice.description}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {endResult === 'won' && (
                        <div style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            width: '100vw',
                            height: '100vh',
                            background: 'radial-gradient(circle, rgba(0,80,0,0.85) 0%, rgba(0,30,0,0.95) 100%)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 50,
                            animation: 'fadeIn 0.5s ease'
                        }}>
                            <h1 style={{
                                color: '#39ff14',
                                fontSize: '52px',
                                marginBottom: '12px',
                                textShadow: '0 0 20px #39ff14, 0 0 40px #39ff14',
                                letterSpacing: '6px',
                                fontFamily: 'monospace'
                            }}>
                                GANASTE
                            </h1>
                            <p style={{ color: '#aaffaa', fontSize: '18px', marginBottom: '40px', fontFamily: 'monospace' }}>
                                Ultimo en pie en el After
                            </p>
                            <button onClick={() => window.location.reload()} style={{
                                ...btnStyle('#39ff14'),
                                padding: '16px 40px',
                                fontSize: '18px',
                                boxShadow: '0 0 30px rgba(57, 255, 20, 0.4)'
                            }}>
                                VOLVER AL LOBBY
                            </button>
                        </div>
                    )}

                    {endResult === 'died' && (
                        <div style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            width: '100vw',
                            height: '100vh',
                            background: 'radial-gradient(circle, rgba(100,0,0,0.85) 0%, rgba(30,0,0,0.95) 100%)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 50,
                            animation: 'fadeIn 0.5s ease'
                        }}>
                            <h1 style={{
                                color: '#ff003c',
                                fontSize: '48px',
                                marginBottom: '12px',
                                textShadow: '0 0 20px #ff003c',
                                letterSpacing: '4px',
                                fontFamily: 'monospace'
                            }}>
                                TE DEJARON PINCHADO
                            </h1>
                            <p style={{ color: '#ff9999', fontSize: '16px', marginBottom: '40px', fontFamily: 'monospace' }}>
                                Alguien te bailo encima...
                            </p>
                            <button onClick={() => window.location.reload()} style={{
                                ...btnStyle('#ff003c'),
                                padding: '16px 40px',
                                fontSize: '18px'
                            }}>
                                VOLVER AL AFTER
                            </button>
                        </div>
                    )}

                    {endResult === 'gameover' && (
                        <div style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            width: '100vw',
                            height: '100vh',
                            background: 'rgba(0, 0, 0, 0.85)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 50
                        }}>
                            <h1 style={{
                                color: '#fff',
                                fontSize: '48px',
                                marginBottom: '20px',
                                textShadow: '2px 2px 4px #000'
                            }}>
                                TE DEJARON PINCHADO
                            </h1>
                            <button onClick={() => window.location.reload()} style={{
                                ...btnStyle('#ff003c'),
                                padding: '16px 40px',
                                fontSize: '18px'
                            }}>
                                VOLVER AL AFTER
                            </button>
                        </div>
                    )}

                    {isPaused && !endResult && (
                        <div style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            width: '100vw',
                            height: '100vh',
                            background: 'rgba(3, 5, 12, 0.78)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 45,
                            backdropFilter: 'blur(8px)'
                        }}>
                            <div style={{
                                border: '2px solid #00e5ff',
                                background: 'rgba(5, 10, 20, 0.9)',
                                padding: '28px 36px',
                                borderRadius: '16px',
                                textAlign: 'center',
                                fontFamily: 'monospace',
                                boxShadow: '0 0 24px rgba(0, 229, 255, 0.2)'
                            }}>
                                <div style={{ color: '#00e5ff', fontSize: '14px', letterSpacing: '4px', marginBottom: '12px' }}>
                                    PAUSA
                                </div>
                                <div style={{ color: '#fff', fontSize: '30px', marginBottom: '10px' }}>
                                    Baja un cambio
                                </div>
                                <div style={{ color: '#888', fontSize: '13px' }}>
                                    Toca ESC para volver al quilombo
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            <button
                style={{
                    position: 'absolute',
                    top: 10,
                    left: 10,
                    zIndex: 110,
                    background: 'rgba(0,0,0,0.5)',
                    color: '#fff',
                    border: '1px solid #ff007f',
                    cursor: 'pointer',
                    padding: '5px 10px'
                }}
                onClick={onExit}
            >
                Volver al Boliche
            </button>
        </div>
    );
};

export default GameComponent;
