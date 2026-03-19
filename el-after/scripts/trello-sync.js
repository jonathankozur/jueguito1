import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const { TRELLO_API_KEY, TRELLO_TOKEN, TRELLO_BOARD_ID } = process.env;

if (!TRELLO_API_KEY || !TRELLO_TOKEN || !TRELLO_BOARD_ID) {
  console.error('Error: TRELLO_API_KEY, TRELLO_TOKEN, and TRELLO_BOARD_ID must be set in .env');
  process.exit(1);
}

const BASE_URL = 'https://api.trello.com/1';
const AUTH_PARAMS = `key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}`;

async function trelloFetch(path, options = {}) {
  const url = `${BASE_URL}${path}${path.includes('?') ? '&' : '?'}${AUTH_PARAMS}`;
  const response = await fetch(url, options);
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Trello API Error (${response.status}): ${errorBody}`);
  }
  return response.json();
}

async function getLists() {
  return trelloFetch(`/boards/${TRELLO_BOARD_ID}/lists`);
}

async function createList(name) {
  return trelloFetch(`/boards/${TRELLO_BOARD_ID}/lists?name=${encodeURIComponent(name)}`, { method: 'POST' });
}

async function ensureList(name) {
  const lists = await getLists();
  const list = lists.find(l => l.name === name);
  if (list) return list;
  console.log(`Creating list: ${name}`);
  return createList(name);
}

async function createCard(listId, name, desc = '') {
  return trelloFetch(`/cards?idList=${listId}&name=${encodeURIComponent(name)}&desc=${encodeURIComponent(desc)}`, { method: 'POST' });
}

async function main() {
  try {
    console.log('--- Trello Sync Start ---');
    
    // Ensure basic lists exist
    const todoList = await ensureList('To Do');
    const doingList = await ensureList('Doing');
    const doneList = await ensureList('Done');

    console.log('Lists ready.');

    const args = process.argv.slice(2);
    if (args.includes('--test')) {
      console.log('Test mode: Creating a welcome card...');
      await createCard(todoList.id, '¡Bienvenido al Tablero!', 'Esta tarjeta fue creada automáticamente por el asistente de IA.');
      console.log('Success! Check your Trello board.');
    }

    console.log('--- Trello Sync Finished ---');
  } catch (err) {
    console.error('Fatal Error:', err.message);
  }
}

main();
