import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import MainScene from './scenes/MainScene';
import GameEngine from './core/GameEngine';
import EventBus, { EVENTS } from './events/EventBus';
import EventDebugger from './debug/EventDebugger';

const GameComponent = ({ onExit }) => {
    const gameRef = useRef(null);
    const [activeEngine, setActiveEngine] = useState(null);
    const [playerHp, setPlayerHp] = useState({ current: 100, max: 100 });
    const [isGameOver, setIsGameOver] = useState(false);

    useEffect(() => {
        const config = {
            type: Phaser.AUTO,
            parent: 'phaser-container',
            width: window.innerWidth,
            height: window.innerHeight,
            physics: {
                default: 'arcade',
                arcade: {
                    debug: false,
                },
            },
            scene: [MainScene],
            backgroundColor: '#111116',
            pixelArt: true, // Ideal para estética pixel art saturada
        };

        const game = new Phaser.Game(config);
        gameRef.current = game;

        // --- 1. INSTANCIACIÓN DEL ENGINE LÓGICO ---
        // React NO gestiona el loop ni las simulaciones, solo enciende el auto y lo apaga al desmontar
        const engine = new GameEngine();
        engine.start();
        setActiveEngine(engine);

        // Manejar redimensionamiento de ventana
        const handleResize = () => {
            game.scale.resize(window.innerWidth, window.innerHeight);
        };
        // Escuchar cambios de HP del jugador para actualizar la UI nativa (React)
        // El evento lo dispara el propio Player cuando recibe daño, enviando currentHp y maxHp exactos.
        const onPlayerHpChanged = (msg) => {
            setPlayerHp({
                current: msg.float1,
                max: msg.float2
            });
        };

        const onGameOver = () => {
            setIsGameOver(true);
        };

        EventBus.subscribe(EVENTS.PLAYER_HP_CHANGED, onPlayerHpChanged);
        EventBus.subscribe(EVENTS.GAME_OVER, onGameOver);

        return () => {
            window.removeEventListener('resize', handleResize);
            EventBus.unsubscribe(EVENTS.PLAYER_HP_CHANGED, onPlayerHpChanged);
            EventBus.unsubscribe(EVENTS.GAME_OVER, onGameOver);

            // Apagamos Motor Lógico
            engine.stop();

            // Apagamos Renderizador Visual (Phaser/WebGL)
            if (gameRef.current) {
                gameRef.current.destroy(true);
                gameRef.current = null;
            }

            // Limpiamos la memoria central para evitar leaks si se vuelve a montar el componente
            EventBus.resetAll();
        };
    }, []);

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <div id="phaser-container" />
            <EventDebugger gameEngine={activeEngine} />
            
            {/* Player UI Dashboard */}
            <div style={{
                position: 'absolute', bottom: 20, left: 20, zIndex: 10,
                background: 'rgba(0,0,0,0.8)', padding: '10px 20px',
                border: '2px solid #00e5ff', borderRadius: '8px',
                color: '#fff', fontFamily: 'monospace', minWidth: '200px'
            }}>
                <div style={{ marginBottom: '5px', fontSize: '14px', color: '#00e5ff' }}>EL PIBE</div>
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

            {/* Game Over Screen */}
            {isGameOver && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(100, 0, 0, 0.7)',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    zIndex: 50
                }}>
                    <h1 style={{ color: '#fff', fontSize: '48px', marginBottom: '20px', textShadow: '2px 2px 4px #000' }}>
                        ¡TE DEJARON PINCHADO!
                    </h1>
                    <button
                        onClick={() => window.location.reload()} // For the MVP, hard refresh to clean memory and restart
                        style={{
                            padding: '15px 30px', fontSize: '20px', fontWeight: 'bold',
                            backgroundColor: '#ff003c', color: 'white', border: 'none',
                            borderRadius: '8px', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.5)'
                        }}>
                        VOLVER AL AFTER
                    </button>
                </div>
            )}

            <button
                style={{
                    position: 'absolute', top: 10, left: 10, zIndex: 10,
                    background: 'rgba(0,0,0,0.5)', color: '#fff', border: '1px solid #ff007f',
                    cursor: 'pointer', padding: '5px 10px'
                }}
                onClick={onExit}
            >
                Volver al Boliche
            </button>
        </div>
    );
};

export default GameComponent;
