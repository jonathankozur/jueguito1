import { useState } from 'react';
import GameComponent from './game/GameComponent';
import './index.css';

function App() {
    const [isPlaying, setIsPlaying] = useState(false);

    return (
        <div className="app-container">
            {!isPlaying ? (
                <div className="main-menu">
                    <h1 className="title-neon">El After del Conurbano</h1>
                    <p className="subtitle">MVP v0.1 - La Pista de Baile</p>
                    <button className="btn-play" onClick={() => setIsPlaying(true)}>
                        [ ENTRAR AL BOLICHE ]
                    </button>
                </div>
            ) : (
                <GameComponent onExit={() => setIsPlaying(false)} />
            )}
        </div>
    );
}

export default App;
