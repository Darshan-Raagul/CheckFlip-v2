require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://check-flip-v2.vercel.app",
      "https://www.checkflip.in"
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB!'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

const RED_DECK = [
  { id: 'r_king', name: 'Red King', value: 13, img: '/cards/k1_red.png' },
  { id: 'r_pawn', name: 'Red Pawn', value: 4, img: '/cards/p1_red.png' } 
];

const BLACK_DECK = [
  { id: 'b_king', name: 'Black King', value: 13, img: '/cards/k1_black.png' },
  { id: 'b_pawn', name: 'Black Pawn', value: 4, img: '/cards/p1_black.png' } 
];

const gameSchema = new mongoose.Schema({
    roomId: { type: String, unique: true },
    gameMode: { type: String, default: 'online' }, 
    status: { type: String, default: 'waiting' }, 
    board: Array,
    turn: String,
    phase: String,
    players: Object,
    winner: String,
    consecutiveSkips: { type: Object, default: { red: 0, black: 0 } }, 
    turnStartTime: Number,
    inactivityCounter: { type: Number, default: 0 },
    cardPicks: { type: Object, default: { red: false, black: false } },
    fatePlayers: { type: Object, default: { red: false, black: false } }
});
const Game = mongoose.model('Game', gameSchema);

const arenaLoadTracker = {}; 
const playerSockets = {}; 
const roomDirectory = {}; 

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function generateArmy(color) {
    let allCards = [];
    allCards.push({ id: `k1_${color}`, type: 'king', color });
    allCards.push({ id: `k2_${color}`, type: 'king', color });
    allCards.push({ id: `m1_${color}`, type: 'medic', color }); 
    allCards.push({ id: `m2_${color}`, type: 'medic', color }); 
    allCards.push({ id: `n1_${color}`, type: 'knight', color });
    allCards.push({ id: `n2_${color}`, type: 'knight', color });
    allCards.push({ id: `b1_${color}`, type: 'bishop', color });
    allCards.push({ id: `b2_${color}`, type: 'bishop', color });
    allCards.push({ id: `r1_${color}`, type: 'rook', color });
    allCards.push({ id: `r2_${color}`, type: 'rook', color });
    allCards.push({ id: `q1_${color}`, type: 'queen', color });
    allCards.push({ id: `q2_${color}`, type: 'queen', color });
    
    for(let i = 0; i < 16; i++) {
        allCards.push({ id: `p${i}_${color}`, type: 'pawn', color, direction: color === 'black' ? 'up' : 'down' });
    }
    
    const kings = allCards.filter(c => c.type === 'king');
    const commoners = allCards.filter(c => c.type !== 'king');
    const shuffledCommoners = shuffle(commoners);
    
    const boardUnits = shuffledCommoners.slice(0, 8);
    const deckUnits = shuffle([...shuffledCommoners.slice(8), ...kings]);
    
    return { boardUnits, deckUnits };
}

function getFreshGameState() {
    const redArmy = generateArmy('red');
    const blackArmy = generateArmy('black');
    const board = Array(4).fill(null).map(() => Array(4).fill(null));

    let redIndex = 0;
    for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 4; c++) {
            let piece = redArmy.boardUnits[redIndex++];
            if (piece.type === 'medic') { 
                piece.internalLifespan = 3.0; 
                piece.lifespan = 3; 
            }
            board[r][c] = piece;
        }
    }

    let blackIndex = 0;
    for (let r = 2; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
            let piece = blackArmy.boardUnits[blackIndex++];
            if (piece.type === 'medic') { 
                piece.internalLifespan = 3.0; 
                piece.lifespan = 3; 
            }
            board[r][c] = piece;
        }
    }

    return {
        board: board,
        turn: Math.random() < 0.5 ? 'red' : 'black', 
        phase: 'idle',
        players: {
          red: { deck: redArmy.deckUnits, hand: null, graveyard: [], kingsAlive: 2 },
          black: { deck: blackArmy.deckUnits, hand: null, graveyard: [], kingsAlive: 2 }
        },
        winner: null,
        consecutiveSkips: { red: 0, black: 0 },
        inactivityCounter: 0,
        turnStartTime: null,
        cardPicks: { red: false, black: false },
        fatePlayers: { red: false, black: false } 
    };
}

function evaluateWinCondition(game) {
    if (game.winner) return;
    let redAlive = false;
    let blackAlive = false;

    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
            const piece = game.board[r][c];
            if (piece && piece !== 'BLOCKED') {
                if (piece.color === 'red') redAlive = true;
                if (piece.color === 'black') blackAlive = true;
            }
        }
    }

    if (!redAlive) game.winner = 'black';
    else if (!blackAlive) game.winner = 'red';
    
    if (game.players.red.kingsAlive <= 0) game.winner = 'black';
    else if (game.players.black.kingsAlive <= 0) game.winner = 'red';
}

function processTurnSwitch(game, isSkip = false) {
    if (!isSkip) {
        game.consecutiveSkips[game.turn] = 0;
        game.inactivityCounter = 0; 
    }

    const nextPlayer = game.turn === 'red' ? 'black' : 'red';
    game.turn = nextPlayer;
    game.phase = 'idle';
    game.turnStartTime = Date.now(); 

    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
            const piece = game.board[r][c];
            if (piece && piece.type === 'medic') {
                if (piece.internalLifespan === undefined) piece.internalLifespan = 3.0; 
                piece.internalLifespan -= 0.5;
                piece.lifespan = Math.ceil(piece.internalLifespan); 
                if (piece.internalLifespan <= 0) game.board[r][c] = null; 
            }
        }
    }
    evaluateWinCondition(game);
}

function isValidMove(board, piece, from, to) {
    const targetSquare = board[to.row][to.col];
    if (targetSquare === 'BLOCKED') return false; 
    if (targetSquare && targetSquare.color === piece.color) return false; 
    if (targetSquare && targetSquare.type === 'medic') return false; 

    const rowDiff = to.row - from.row;
    const colDiff = to.col - from.col;
    const absRowDiff = Math.abs(rowDiff);
    const absColDiff = Math.abs(colDiff);

    const isPathClear = (rDir, cDir) => {
        let r = from.row + rDir;
        let c = from.col + cDir;
        while (r !== to.row || c !== to.col) {
            if (board[r][c] !== null) return false; 
            r += rDir;
            c += cDir;
        }
        return true;
    };

    switch (piece.type) {
        case 'king': return absRowDiff <= 1 && absColDiff <= 1;
        case 'knight': return ((absRowDiff === 2 && absColDiff === 1) || (absRowDiff === 1 && absColDiff === 2));
        case 'rook': if (from.row !== to.row && from.col !== to.col) return false; return isPathClear(Math.sign(rowDiff), Math.sign(colDiff));
        case 'bishop': if (absRowDiff !== absColDiff) return false; return isPathClear(Math.sign(rowDiff), Math.sign(colDiff));
        case 'queen': if (from.row !== to.row && from.col !== to.col && absRowDiff !== absColDiff) return false; return isPathClear(Math.sign(rowDiff), Math.sign(colDiff));
        case 'pawn':
            const forward = piece.direction === 'up' ? -1 : 1;
            if (colDiff === 0 && rowDiff === forward) return targetSquare === null;
            if (absColDiff === 1 && rowDiff === forward) return targetSquare !== null && targetSquare !== 'BLOCKED';
            return false;
        default: return false;
    }
}

io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);

    // --- BULLETPROOF DISCONNECT HANDLER ---
    socket.on('disconnect', async () => {
        const info = playerSockets[socket.id];
        if (info) {
            console.log(`Player ${info.color} left room ${info.roomId} unexpectedly.`);
            let game = await Game.findOne({ roomId: info.roomId });
            
            // If the game was active (not finished, not already abandoned), kill it.
            if (game && game.gameMode !== 'local' && !game.winner && game.status !== 'abandoned') {
                game.status = 'abandoned';
                await game.save();
                io.to(info.roomId).emit('gameStateUpdate', game); 
            }
            
            // Clean up the memory directories
            if (roomDirectory[info.roomId]) {
                if (roomDirectory[info.roomId].black === socket.id) roomDirectory[info.roomId].black = null;
                if (roomDirectory[info.roomId].red === socket.id) roomDirectory[info.roomId].red = null;
            }
            delete playerSockets[socket.id];
        }
    });

    // --- BULLETPROOF LEAVE MATCH HANDLER (Intentional exits) ---
    socket.on('leaveMatch', async ({ roomId }) => {
        let game = await Game.findOne({ roomId });
        if (game && game.gameMode !== 'local' && !game.winner && game.status !== 'abandoned') {
            game.status = 'abandoned';
            await game.save();
            io.to(roomId).emit('gameStateUpdate', game);
        }
        
        socket.leave(roomId);
        if (roomDirectory[roomId]) {
            if (roomDirectory[roomId].black === socket.id) roomDirectory[roomId].black = null;
            if (roomDirectory[roomId].red === socket.id) roomDirectory[roomId].red = null;
        }
        delete playerSockets[socket.id];
    });

    socket.on('createLocalGame', async () => {
        const roomId = 'LOCAL_' + Math.random().toString(36).substring(2, 6).toUpperCase(); 
        let gameDoc = new Game({ roomId, gameMode: 'local', status: 'playing', ...getFreshGameState() });
        gameDoc.turnStartTime = Date.now();
        await gameDoc.save();
        
        socket.join(roomId); 
        socket.emit('gameJoined', roomId);
        socket.emit('arenaReady');
        io.to(roomId).emit('gameStateUpdate', gameDoc);
    });

    socket.on('createGame', async () => {
        const roomId = Math.random().toString(36).substring(2, 6).toUpperCase(); 
        let gameDoc = new Game({ roomId, gameMode: 'online', status: 'waiting', ...getFreshGameState() });
        await gameDoc.save();
        
        // Strict assignment: Host is ALWAYS Black.
        playerSockets[socket.id] = { roomId, color: 'black' };
        roomDirectory[roomId] = { black: socket.id, red: null };
        
        socket.join(roomId); 
        socket.emit('assignColor', 'black'); 
        socket.emit('gameJoined', roomId);
        io.to(roomId).emit('gameStateUpdate', gameDoc);
    });

    socket.on('joinGame', async (roomId) => {
        roomId = roomId.toUpperCase();
        let gameDoc = await Game.findOne({ roomId });
        
        if (!gameDoc) return socket.emit('errorMsg', 'Room not found!');
        
        // --- STRICT SECURITY CHECKS ---
        if (gameDoc.status === 'abandoned') {
            return socket.emit('errorMsg', 'This room was abandoned by the host.');
        }
        if (gameDoc.status !== 'waiting') {
            return socket.emit('errorMsg', 'This room is already full or the game has started!');
        }
        if (roomDirectory[roomId] && roomDirectory[roomId].red !== null) {
            return socket.emit('errorMsg', 'Room is full! Another player is already playing the host.');
        }

        // Strict assignment: Joiner is ALWAYS Red.
        playerSockets[socket.id] = { roomId, color: 'red' };
        if (!roomDirectory[roomId]) roomDirectory[roomId] = { black: null, red: null }; // Fallback
        roomDirectory[roomId].red = socket.id;

        socket.join(roomId); 
        socket.emit('assignColor', 'red'); 
        socket.emit('gameJoined', roomId);
        io.to(roomId).emit('gameStateUpdate', gameDoc);
    });

    socket.on('enterFateScreen', async ({ roomId, playerColor }) => {
        let game = await Game.findOne({ roomId });
        
        // If the other player abandoned while we were loading, stop immediately
        if (!game || game.status === 'abandoned') {
             return io.to(roomId).emit('gameStateUpdate', game); 
        }
        if (game.status !== 'waiting') return;

        if (!game.fatePlayers) game.fatePlayers = { red: false, black: false };
        game.fatePlayers[playerColor] = true;
        game.markModified('fatePlayers');

        if (game.fatePlayers.red && game.fatePlayers.black) {
            game.status = 'coin_flip';
        }

        await game.save();
        io.to(roomId).emit('gameStateUpdate', game);
    });

    socket.on('drawCardPick', async ({ roomId, playerColor }) => {
        let game = await Game.findOne({ roomId });
        if (!game || game.status !== 'coin_flip') return;

        if (!game.cardPicks) game.cardPicks = { red: false, black: false };
        game.cardPicks[playerColor] = true;
        
        game.markModified('cardPicks');
        await game.save();

        io.to(roomId).emit('gameStateUpdate', game);

        if (game.cardPicks.red && game.cardPicks.black) {
            const redCard = RED_DECK[Math.floor(Math.random() * RED_DECK.length)];
            const blackCard = BLACK_DECK[Math.floor(Math.random() * BLACK_DECK.length)];
            let winnerColor = '';
            let isTie = false;

            if (redCard.value > blackCard.value) winnerColor = 'red';
            else if (blackCard.value > redCard.value) winnerColor = 'black';
            else { isTie = true; winnerColor = 'black'; }

            game.turn = winnerColor;
            await game.save();
            setTimeout(() => io.to(roomId).emit('triggerSpin', { redCard, blackCard, winnerColor, isTie }), 500); 
        }
    });

    socket.on('requestSync', async ({ roomId }) => {
        let game = await Game.findOne({ roomId });
        if (game) socket.emit('gameStateUpdate', game);
    });

    socket.on('arenaLoaded', async ({ roomId, playerColor }) => {
        if (!arenaLoadTracker[roomId]) arenaLoadTracker[roomId] = { red: false, black: false, started: false };
        arenaLoadTracker[roomId][playerColor] = true;

        if (arenaLoadTracker[roomId].red && arenaLoadTracker[roomId].black && !arenaLoadTracker[roomId].started) {
            arenaLoadTracker[roomId].started = true;
            let game = await Game.findOne({ roomId });
            if (game && game.status !== 'abandoned') {
                game.status = 'playing';
                game.turnStartTime = Date.now(); 
                await Game.updateOne({ _id: game._id }, game);
                io.to(roomId).emit('gameStateUpdate', game); 
            }
            io.to(roomId).emit('arenaReady'); 
        }
    });

    socket.on('skipTurn', async ({ roomId }) => {
        let game = await Game.findOne({ roomId });
        if (!game || game.status !== 'playing' || game.winner) return;

        if (Date.now() - game.turnStartTime < 5000) return;

        if (game.phase === 'holding_drawn_card') {
            game.players[game.turn].deck.push(game.players[game.turn].hand);
            game.players[game.turn].deck = shuffle(game.players[game.turn].deck);
            game.players[game.turn].hand = null;
        }

        if (game.gameMode === 'local') {
            processTurnSwitch(game, true);
        } else {
            game.consecutiveSkips[game.turn] = (game.consecutiveSkips[game.turn] || 0) + 1;
            if (game.consecutiveSkips[game.turn] >= 3) {
                game.status = 'abandoned'; 
                await Game.updateOne({ _id: game._id }, game);
                io.to(roomId).emit('gameStateUpdate', game);
                return; 
            } else {
                processTurnSwitch(game, true); 
            }
        }

        await Game.updateOne({ _id: game._id }, game);
        io.to(roomId).emit('gameStateUpdate', game);
    });

    socket.on('resumeGame', async ({ roomId }) => {
        let game = await Game.findOne({ roomId });
        if (game && game.status === 'paused') {
            game.status = 'playing';
            game.inactivityCounter = 0; 
            game.turnStartTime = Date.now(); 
            await Game.updateOne({ _id: game._id }, game);
            io.to(roomId).emit('gameStateUpdate', game);
        }
    });

    socket.on('drawCard', async ({ roomId, playerColor }) => {
        let game = await Game.findOne({ roomId });
        if (game.status !== 'playing') return;
        const actingColor = game.gameMode === 'local' ? game.turn : playerColor;
        if (game.turn === actingColor && game.phase === 'idle') {
            if (game.players[actingColor].deck.length > 0) {
                game.players[actingColor].hand = game.players[actingColor].deck.pop();
                game.phase = 'holding_drawn_card';
                await Game.updateOne({ _id: game._id }, game);
                io.to(roomId).emit('gameStateUpdate', game); 
            }
        }
    });

    socket.on('cancelDraw', async ({ roomId, playerColor }) => {
        let game = await Game.findOne({ roomId });
        if (!game || game.status !== 'playing') return;
        const actingColor = game.gameMode === 'local' ? game.turn : playerColor;
        if (game.turn === actingColor && game.phase === 'holding_drawn_card') {
            const cardToReturn = game.players[actingColor].hand;
            if (cardToReturn) {
                game.players[actingColor].deck.push(cardToReturn); 
                game.players[actingColor].deck = shuffle(game.players[actingColor].deck);
                game.players[actingColor].hand = null;             
                game.phase = 'idle';                               
                await Game.updateOne({ _id: game._id }, game);
                io.to(roomId).emit('gameStateUpdate', game);
            }
        }
    });

    socket.on('deployCard', async ({ roomId, row, col, playerColor, pawnDirection }) => {
        let game = await Game.findOne({ roomId });
        if (game.status !== 'playing') return;
        const actingColor = game.gameMode === 'local' ? game.turn : playerColor;
        if (game.turn === actingColor && game.phase === 'holding_drawn_card') {
            if (game.board[row][col] === null) {
                const cardToDeploy = game.players[actingColor].hand;
                if (cardToDeploy.type === 'medic') { 
                    cardToDeploy.internalLifespan = 2.5; 
                    cardToDeploy.lifespan = 3; 
                }
                if (cardToDeploy.type === 'pawn') {
                    cardToDeploy.direction = pawnDirection;
                    const r = Number(row);
                    if ((cardToDeploy.direction === 'up' && r === 0) || (cardToDeploy.direction === 'down' && r === 3)) {
                        game.board[row][col] = 'BLOCKED'; 
                    } else game.board[row][col] = cardToDeploy; 
                } else game.board[row][col] = cardToDeploy;
                
                game.players[actingColor].hand = null;
                evaluateWinCondition(game);
                if (!game.winner) processTurnSwitch(game, false); 
                await Game.updateOne({ _id: game._id }, game);
                io.to(roomId).emit('gameStateUpdate', game);
            }
        }
    });

    socket.on('revivePiece', async ({ roomId, medicLocation, graveyardIndex, playerColor }) => {
        let game = await Game.findOne({ roomId });
        if (game.status !== 'playing') return;
        const actingColor = game.gameMode === 'local' ? game.turn : playerColor;
        if (game.turn !== actingColor) return;
        const medic = game.board[medicLocation.row][medicLocation.col];
        const graveyard = game.players[actingColor].graveyard;

        if (medic && medic.type === 'medic' && medic.color === actingColor) {
            if (graveyard[graveyardIndex]) {
                const revivedPiece = graveyard.splice(graveyardIndex, 1)[0]; 
                game.board[medicLocation.row][medicLocation.col] = revivedPiece;
                evaluateWinCondition(game);
                if (!game.winner) processTurnSwitch(game, false);
                await Game.updateOne({ _id: game._id }, game);
                io.to(roomId).emit('gameStateUpdate', game);
            }
        }
    });

    socket.on('movePiece', async ({ roomId, from, to, playerColor }) => {
        let game = await Game.findOne({ roomId });
        if (game.status !== 'playing') return;
        const actingColor = game.gameMode === 'local' ? game.turn : playerColor;
        if (game.turn !== actingColor || game.phase !== 'idle') return;
        const piece = game.board[from.row][from.col];
        if (!piece || piece.color !== actingColor) return;

        if (isValidMove(game.board, piece, from, to)) {
            const targetSquare = game.board[to.row][to.col];
            if (targetSquare && targetSquare !== 'BLOCKED') {
               const enemyColor = actingColor === 'red' ? 'black' : 'red';
               game.players[enemyColor].graveyard.push(targetSquare);
               if (targetSquare.type === 'king') game.players[enemyColor].kingsAlive -= 1;
            }
            game.board[to.row][to.col] = piece;
            game.board[from.row][from.col] = null;
            if (piece.type === 'pawn') {
                const r = Number(to.row);
                if ((piece.direction === 'up' && r === 0) || (piece.direction === 'down' && r === 3)) game.board[to.row][to.col] = 'BLOCKED';
            }
            evaluateWinCondition(game);
            if (!game.winner) processTurnSwitch(game, false);
            await Game.updateOne({ _id: game._id }, game);
            io.to(roomId).emit('gameStateUpdate', game);
        }
    });

    socket.on('returnToLobby', ({ roomId }) => {
        socket.to(roomId).emit('forceLobbyReturn'); 
    });
});

server.listen(3001, () => {
  console.log('Multiplayer server running on port 3001');
});
