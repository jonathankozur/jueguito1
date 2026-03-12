import { useState, useEffect } from 'react';
import EventBus, { MessageCategory, MessagePriority } from '../events/EventBus';
import './EventDebugger.css';

const CategoryNames = {
    [MessageCategory.COMMAND]: 'COMMAND',
    [MessageCategory.EVENT]: 'EVENT',
    [MessageCategory.RENDER]: 'RENDER'
};

const PriorityNames = {
    [MessagePriority.CRITICAL]: 'CRITICAL',
    [MessagePriority.HIGH]: 'HIGH',
    [MessagePriority.NORMAL]: 'NORMAL',
    [MessagePriority.LOW]: 'LOW'
};

export default function EventDebugger({ gameEngine }) {
    const [history, setHistory] = useState([]);
    const [poolSize, setPoolSize] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [isAttached, setIsAttached] = useState(false);
    const [filters, setFilters] = useState({ COMMAND: true, EVENT: true, RENDER: true });
    
    // We poll the EventBus every 100ms so we don't trigger React renders 60 times a second
    useEffect(() => {
        let interval;
        if (isAttached) {
            EventBus.setDebugMode(true);
            interval = setInterval(() => {
                let currentHistory = [...EventBus.getDebugHistory()];
                
                if (gameEngine && gameEngine.isPaused) {
                    // Prepend pending queue to the history so user can see the future
                    const pendingQueue = EventBus.getDebugQueue();
                    currentHistory = currentHistory.concat(pendingQueue);
                }

                setHistory(currentHistory);
                setPoolSize(EventBus.getPoolSize());
                if (gameEngine) setIsPaused(gameEngine.isPaused);
            }, 100);
        } else {
            EventBus.setDebugMode(false);
        }

        return () => {
            clearInterval(interval);
            EventBus.setDebugMode(false);
        };
    }, [isAttached, gameEngine]);

    const handleTogglePause = () => {
        if (!gameEngine) return;
        if (isPaused) {
            gameEngine.resume();
        } else {
            gameEngine.pause();
        }
        setIsPaused(!isPaused);
    };

    const handleStep = () => {
        if (!gameEngine || !isPaused) return;
        gameEngine.step();
        // Force immediate UI update on step
        setHistory([...EventBus.getDebugHistory()]);
    };

    const toggleFilter = (categoryName) => {
        setFilters(prev => ({ ...prev, [categoryName]: !prev[categoryName] }));
    };

    if (!isAttached) {
        return (
            <button className="debugger-toggle" onClick={() => setIsAttached(true)}>
                Bug
            </button>
        );
    }

    return (
        <div className="event-debugger-panel">
            <div className="debugger-header">
                <h3>MessageBus Monitor</h3>
                <button onClick={() => setIsAttached(false)}>X</button>
            </div>
            
            <div className="debugger-stats">
                <span>Pool: {poolSize} / 10000</span>
            </div>

            <div className="debugger-controls">
                <button 
                    className={`btn-pause ${isPaused ? 'active' : ''}`}
                    onClick={handleTogglePause}
                >
                    {isPaused ? '▶ Resume' : '⏸ Pause Engine'}
                </button>
                <button 
                    disabled={!isPaused} 
                    onClick={handleStep}
                >
                    ⏭ Step (1 Frame)
                </button>
            </div>

            <div className="debugger-filters">
                <label className="filter-command">
                    <input type="checkbox" checked={filters.COMMAND} onChange={() => toggleFilter('COMMAND')} /> Cmd
                </label>
                <label className="filter-event">
                    <input type="checkbox" checked={filters.EVENT} onChange={() => toggleFilter('EVENT')} /> Evt
                </label>
                <label className="filter-render">
                    <input type="checkbox" checked={filters.RENDER} onChange={() => toggleFilter('RENDER')} /> Rndr
                </label>
            </div>

            <div className="debugger-log">
                <table>
                    <thead>
                        <tr>
                            <th title="Frame Number">Frame</th>
                            <th title="Command, Event or Render">Type</th>
                            <th title="Message Unique ID">Msg ID</th>
                            <th title="Entity that sent the message">Sender ID</th>
                            <th title="Target Entity (if Command) / Data Payload">Action / Target</th>
                            <th title="Was it dispatched successfully?">✓</th>
                        </tr>
                    </thead>
                    <tbody>
                        {history
                            .filter(msg => filters[CategoryNames[msg.category]])
                            .slice().reverse().map((msg, idx) => (
                            <tr 
                                key={`${msg.id}-${idx}`} 
                                className={`row-${CategoryNames[msg.category].toLowerCase()} ${!msg.dispatched ? 'row-pending' : ''}`}
                            >
                                <td>{msg.frame}</td>
                                <td>{CategoryNames[msg.category][0]}</td>
                                <td>{msg.id}</td>
                                <td>{msg.senderId || '-'}</td>
                                <td>
                                    <span className="highlight-type">
                                        {msg.type === 1 ? 'INPUT_MOVE' : 
                                         msg.type === 2 ? 'INPUT_AIM' : 
                                         msg.type === 3 ? 'PLAYER_STATE_UPDATED' :
                                         msg.type === 4 ? 'ENTITY_CREATED' : msg.type}
                                    </span>
                                    {msg.string1 && ` (${msg.string1})`}
                                    {msg.targetId ? ` -> [T:${msg.targetId}]` : ''}
                                </td>
                                <td>{msg.dispatched ? '✅' : '⏳'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
