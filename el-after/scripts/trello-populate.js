import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const { TRELLO_API_KEY, TRELLO_TOKEN, TRELLO_BOARD_ID } = process.env;
const BASE_URL = 'https://api.trello.com/1';
const AUTH = `key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}`;

async function trelloFetch(path, options = {}) {
  const sep = path.includes('?') ? '&' : '?';
  const response = await fetch(`${BASE_URL}${path}${sep}${AUTH}`, options);
  if (!response.ok) throw new Error(`Trello Error (${response.status}): ${await response.text()}`);
  return response.json();
}

async function getLists() {
  return trelloFetch(`/boards/${TRELLO_BOARD_ID}/lists`);
}

async function getCards(listId) {
  return trelloFetch(`/lists/${listId}/cards`);
}

async function createList(name) {
  return trelloFetch(`/boards/${TRELLO_BOARD_ID}/lists?name=${encodeURIComponent(name)}&pos=bottom`, { method: 'POST' });
}

async function ensureList(name, lists) {
  const existing = lists.find(l => l.name === name && !l.closed);
  if (existing) return existing;
  console.log(`  + Creando lista: ${name}`);
  return createList(name);
}

async function createCard(listId, name, desc) {
  return trelloFetch(`/cards?idList=${listId}&name=${encodeURIComponent(name)}&desc=${encodeURIComponent(desc)}`, { method: 'POST' });
}

async function archiveCard(cardId) {
  return trelloFetch(`/cards/${cardId}?closed=true`, { method: 'PUT' });
}

// ============================================================
// TASKS CLASSIFIED BY PROJECT ANALYSIS
// ============================================================

const DONE_TASKS = [
  {
    name: 'âœ… Arquitectura ECS con EventBus',
    desc: 'Implementado sistema de Comandos/Eventos/Render con prioridades (CRITICAL, HIGH, NORMAL). Desacopla lÃ³gica de presentaciÃ³n.',
  },
  {
    name: 'âœ… Modo Solo (single player)',
    desc: 'GameEngine.mode=solo funciona end-to-end: simulaciÃ³n + input local + renderer Phaser.',
  },
  {
    name: 'âœ… Sistema de Combate: Melee Circular',
    desc: 'CombatSystem: melee_circular aplica daÃ±o en radio completo. Con knockback basado en fuerza/endurance.',
  },
  {
    name: 'âœ… Sistema de Combate: Melee Frontal',
    desc: 'CombatSystem: melee_frontal usa cono de 60Â° (Math.PI/3). El Enemy usa este tipo.',
  },
  {
    name: 'âœ… Sistema de Combate: Proyectiles (distance)',
    desc: 'handleDistance: simulaciÃ³n paso a paso con pÃ©rdida de fuerza al impactar entidades y materiales.',
  },
  {
    name: 'âœ… Sistema de Combate: Arrojadizas (throwable)',
    desc: 'handleThrowable: trayectoria con colisiÃ³n contra paredes "high". ExplosiÃ³n en Ã¡rea al caer.',
  },
  {
    name: 'âœ… Inventario del jugador con 5 armas',
    desc: 'Los PuÃ±os, Cuchillo, El Chumbo, Botella Rota, Molotov. Cambio por tecla 1-5 o scroll del mouse.',
  },
  {
    name: 'âœ… IA bÃ¡sica de enemigos (Fodder)',
    desc: 'EnemyEntity: chase hacia el jugador mÃ¡s cercano, gira siempre hacia el target, ataca al llegar a rango.',
  },
  {
    name: 'âœ… EnemySpawnerSystem (modo solo)',
    desc: 'Spawn circular aleatorio alrededor del jugador. Habilitado en mode=solo, deshabilitado en multiplayer.',
  },
  {
    name: 'âœ… Render: Sprites por color por jugador',
    desc: 'MainScene genera texturas dinÃ¡micas por slot (Cyan, Verde, Rosa, Amber). HP bar para enemigos.',
  },
  {
    name: 'âœ… Render: Efectos visuales de ataque',
    desc: 'Arco/cono animado para melee, bala + tween para distancia, explosiÃ³n + correcciÃ³n en vuelo para arrojadiza.',
  },
  {
    name: 'âœ… Lobby UI (Solo / Host / Join)',
    desc: 'LobbyScreen con botones estilizados. WaitingRoom con lista de jugadores. Input de cÃ³digo de sala.',
  },
  {
    name: 'âœ… Pantalla Game Over / Victoria / Muerte (PvP)',
    desc: 'GameComponent muestra 3 overlays: gameover (solo), died (PvP), won (Ãºltimo en pie).',
  },
  {
    name: 'âœ… Multiplayer: NetworkHost (WebSocket relay)',
    desc: 'Crea sala en SignalingServer, brodcast WORLD_STATE cada tick, reenvÃ­a eventos de combate a clientes.',
  },
  {
    name: 'âœ… Multiplayer: NetworkClient',
    desc: 'Se conecta a la sala, aplica WORLD_STATE del host al renderer, envÃ­a inputs locales al host.',
  },
  {
    name: 'âœ… Multiplayer: Sala de espera y sincronizaciÃ³n de jugadores',
    desc: 'SYNC_PLAYERS al unirse, onUiReady construye el nivel con todos los jugadores conectados.',
  },
  {
    name: 'âœ… Camera: Group camera para mÃºltiples jugadores',
    desc: 'En modo multiplayer, la cÃ¡mara sigue el centroide de todos los jugadores con lerp.',
  },
  {
    name: 'âœ… Deploy en GitHub Pages + Servidor Signaling en Render',
    desc: 'El juego tiene CI/CD a GitHub Pages. El signaling server corre en Render.',
  },
  {
    name: 'âœ… Unit Tests: EventBus y PlayerEntity (Vitest)',
    desc: 'Tests en vitest con JSDOM. CombatSystem.test.js y Player.test.js implementados.',
  },
  {
    name: 'Ã¢Å“â€¦ Colisiones con obstÃƒÂ¡culos en gameplay',
    desc: 'GameSimulation ya resuelve circle-vs-AABB contra StaticObstacleEntity y corrige posiciones fuera del mapa.',
  },
  {
    name: 'Ã¢Å“â€¦ Knockback bloqueado por paredes',
    desc: 'CombatSystem ahora recorta el empuje y evita que enemigos/jugadores atraviesen obstÃƒÂ¡culos por fuerza excesiva.',
  },
  {
    name: 'Ã¢Å“â€¦ Arena jugable del after',
    desc: 'LevelBuilder reemplaza el stub de 3 obstÃƒÂ¡culos por una arena simple con carriles, coberturas y zonas abiertas.',
  },
  {
    name: 'Ã¢Å“â€¦ Sistema de oleadas base',
    desc: 'EnemySpawnerSystem arranca automÃƒÂ¡ticamente en modo solo, emite WAVE_CHANGED y escala spawnDelay/maxAlive por ola.',
  },
  {
    name: 'Ã¢Å“â€¦ HUD de arma activa y nÃƒÂºmero de ola',
    desc: 'GameComponent escucha PLAYER_WEAPON_CHANGED y WAVE_CHANGED para mostrar el estado actual del run.',
  },
  {
    name: 'Ã¢Å“â€¦ Pausa en singleplayer',
    desc: 'ESC pausa/reanuda el GameEngine en modo solo y muestra overlay dedicado sin romper el renderer.',
  },
  {
    name: 'Ã¢Å“â€¦ Nuevo arquetipo enemigo: Bouncer',
    desc: 'EnemyEntity soporta un tanque bÃƒÂ¡sico de mayor vida/rango que empieza a aparecer en olas avanzadas.',
  },
  {
    name: 'Ã¢Å“â€¦ Tests de colisiÃƒÂ³n, oleadas y HUD',
    desc: 'Se agregaron pruebas para GameSimulation, EnemySpawnerSystem, EnemyEntity y eventos de arma activa.',
  },
];

const DOING_TASKS = [
  {
    name: '[DOING] Balance de oleadas del modo solo',
    desc: 'Ajustar spawnDelay, cantidad maxima de enemigos y mezcla entre fodder/bouncer para que el run sea tenso sin romper la lectura.',
  },
  {
    name: '[DOING] Sanitizar .env y corregir signaling URL',
    desc: 'Rotar secretos expuestos y cambiar VITE_SIGNALING_URL a ws:// o wss:// antes de retomar trabajo multiplayer.',
  },
  {
    name: '[DOING] Score simple local',
    desc: 'Agregar kills, tiempo sobrevivido y resumen local al terminar el run, sin leaderboard todavia.',
  },
];

const TODO_TASKS = [
  // --- GAMEPLAY ---
  {
    name: '[TODO] Pickups basicos del run',
    desc: 'Agregar 1-2 pickups simples (curacion y/o buff temporal) para enriquecer la progresion sin abrir sistemas grandes.',
  },
  {
    name: '[TODO] Segundo arquetipo enemigo de rango',
    desc: 'Cuando el loop solo este balanceado, sumar un enemy tipo dealer o equivalente para forzar reposicionamiento.',
  },
  {
    name: '[TODO] Score + resumen final del run',
    desc: 'Cerrar el loop solo con una pantalla de resultados local. Mantener fuera el leaderboard hasta el milestone multiplayer.',
  },
  // --- VISUAL / AUDIO ---
  {
    name: 'Sprites reales (pixel art)',
    desc: 'Reemplazar los rectangulos de colores por sprites de pixel art adecuados al ambiente after del conurbano. Spritesheets con animacion de caminata y ataque.',
  },
  {
    name: 'Tilemap del nivel',
    desc: 'Usar Tiled + Phaser Tilemap para reemplazar el fondo plano. Piso de boliche, paredes de ladrillo, etc.',
  },
  {
    name: 'Sistema de sonido',
    desc: 'Agregar efectos de golpe, disparo, muerte y musica de fondo cuando el loop base este cerrado.',
  },
  {
    name: 'Animaciones de dano y muerte',
    desc: 'Flash rojo al recibir dano y animacion de caida al morir, una vez consolidada la lectura del combate.',
  },
  // --- MULTIPLAYER ---
  {
    name: '[TODO] EnemySpawner en multiplayer',
    desc: 'Reactivar las olas en host y sincronizar spawns autoritativos solo cuando la base de red vuelva a ser prioridad.',
  },
  {
    name: '[TODO] Reconexion de cliente',
    desc: 'Agregar retry con backoff exponencial y manejo de reconexion al lobby/partida.',
  },
  {
    name: '[TODO] Latency compensation / interpolacion',
    desc: 'Agregar lerp o reconciliacion cuando el multiplayer vuelva al frente.',
  },
  // --- TECH / CALIDAD ---
  {
    name: '[TODO] Scoreboard / leaderboard multiplayer',
    desc: 'Mantener separado del score local para no mezclar UI de prototipo con features de red.',
  },
  {
    name: 'Configuracion de debug en runtime',
    desc: 'Mejorar EventDebugger con panel colapsable, filtros y grafico de fps cuando termine el MVP solo.',
  },
];
// ============================================================

async function main() {
  console.log('\nðŸ” Obteniendo listas del tablero...');
  const allLists = await getLists();

  // Archive the welcome card if present + clean placeholder lists
  for (const list of allLists) {
    const cards = await getCards(list.id);
    for (const card of cards) {
      if (card.name === 'Â¡Bienvenido al Tablero!') {
        await archiveCard(card.id);
        console.log('  â™»ï¸  Archivada tarjeta de bienvenida.');
      }
    }
  }

  const doneList  = await ensureList('âœ… Done',   allLists);
  const doingList = await ensureList('ðŸ”§ Doing',  allLists);
  const todoList  = await ensureList('ðŸ“‹ To Do',  allLists);

  // Rename generic lists if they exist
  const genericDone  = allLists.find(l => l.name === 'Done');
  const genericDoing = allLists.find(l => l.name === 'Doing');
  const genericTodo  = allLists.find(l => l.name === 'To Do');

  async function renameList(id, name) {
    return trelloFetch(`/lists/${id}?name=${encodeURIComponent(name)}`, { method: 'PUT' });
  }

  if (genericDone && genericDone.id !== doneList.id) await renameList(genericDone.id, 'âœ… Done (old)');
  if (genericDoing && genericDoing.id !== doingList.id) await renameList(genericDoing.id, 'ðŸ”§ Doing (old)');
  if (genericTodo && genericTodo.id !== todoList.id) await renameList(genericTodo.id, 'ðŸ“‹ To Do (old)');

  console.log('\nðŸ“‹ Creando tarjetas en To Do...');
  for (const task of TODO_TASKS) {
    await createCard(todoList.id, task.name, task.desc);
    console.log(`  + ${task.name}`);
  }

  console.log('\nðŸ”§ Creando tarjetas en Doing...');
  for (const task of DOING_TASKS) {
    await createCard(doingList.id, task.name, task.desc);
    console.log(`  + ${task.name}`);
  }

  console.log('\nâœ… Creando tarjetas en Done...');
  for (const task of DONE_TASKS) {
    await createCard(doneList.id, task.name, task.desc);
    console.log(`  + ${task.name}`);
  }

  console.log('\nðŸŽ‰ Â¡Tablero poblado con Ã©xito!');
  console.log(`   ðŸ‘‰ https://trello.com/b/${TRELLO_BOARD_ID}`);
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});

