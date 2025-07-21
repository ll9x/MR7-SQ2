const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, 'public')));

// Game state storage
let rooms = {};
let players = {};

io.on('connection', (socket) => {
    console.log('New user connected:', socket.id);

    socket.on('createRoom', (data) => {
        const roomId = generateRoomId();
        rooms[roomId] = {
            host: socket.id,
            players: [socket.id],
            gameState: 'waiting',
            boardSize: data.boardSize || 9, // Default to 9 if not specified
            maxPlayers: data.maxPlayers || 4, // Default to 4 if not specified
            dangerSquare: -1,
            clickedSquares: [],
            playerNames: {},
            activePlayers: [socket.id], // Players still in the game
            eliminatedPlayers: [], // Players eliminated in order
            currentTurn: 0 // Index of the player whose turn it is
        };
        
        socket.join(roomId);
        players[socket.id] = {
            room: roomId,
            name: data.playerName
        };
        
        rooms[roomId].playerNames[socket.id] = data.playerName;
        io.to(roomId).emit('roomCreated', { 
            roomId, 
            host: socket.id, 
            boardSize: rooms[roomId].boardSize,
            maxPlayers: rooms[roomId].maxPlayers
        });
    });

    socket.on('joinRoom', (data) => {
        const roomId = data.roomId;
        if (!rooms[roomId]) {
            socket.emit('error', { message: 'Room not found' });
            return;
        }

        if (rooms[roomId].gameState !== 'waiting') {
            socket.emit('error', { message: 'Game already started' });
            return;
        }
        
        // Check if room is full
        if (rooms[roomId].players.length >= rooms[roomId].maxPlayers) {
            socket.emit('error', { message: 'Room is full' });
            return;
        }

        socket.join(roomId);
        players[socket.id] = {
            room: roomId,
            name: data.playerName
        };
        
        rooms[roomId].players.push(socket.id);
        rooms[roomId].activePlayers.push(socket.id);
        rooms[roomId].playerNames[socket.id] = data.playerName;
        
        io.to(roomId).emit('playerJoined', { 
            playerId: socket.id, 
            playerName: data.playerName,
            players: rooms[roomId].players.map(id => ({
                id,
                name: rooms[roomId].playerNames[id]
            })),
            maxPlayers: rooms[roomId].maxPlayers
        });
    });

    socket.on('startGame', (data) => {
        const roomId = players[socket.id]?.room;
        if (!roomId || rooms[roomId].host !== socket.id) return;

        // Select a random danger square
        const boardSize = rooms[roomId].boardSize;
        const randomDangerSquare = Math.floor(Math.random() * boardSize);
        
        rooms[roomId].gameState = 'playing';
        rooms[roomId].dangerSquare = randomDangerSquare;
        
        // Set the first player's turn
        rooms[roomId].currentTurn = 0;
        const currentPlayerId = rooms[roomId].activePlayers[rooms[roomId].currentTurn];
        
        io.to(roomId).emit('gameStarted', { 
            boardSize: boardSize,
            currentPlayerId: currentPlayerId,
            currentPlayerName: rooms[roomId].playerNames[currentPlayerId],
            players: rooms[roomId].players.map(id => ({
                id,
                name: rooms[roomId].playerNames[id],
                status: 'active'
            })),
            activePlayers: rooms[roomId].activePlayers,
            eliminatedPlayers: []
        });
    });

    // This event is no longer needed as danger square is selected randomly
    socket.on('dangerSquareSelected', (data) => {
        // Keeping this for backward compatibility, but it's not used anymore
    });

    socket.on('squareClicked', (data) => {
        const roomId = players[socket.id]?.room;
        if (!roomId || rooms[roomId].gameState !== 'playing') return;

        const room = rooms[roomId];
        const playerName = room.playerNames[socket.id];
        
        // Check if it's this player's turn
        const currentPlayerId = room.activePlayers[room.currentTurn];
        if (socket.id !== currentPlayerId) {
            socket.emit('error', { message: 'Not your turn' });
            return;
        }

        const squareIndex = data.squareIndex;
        // Check if clicked square is the danger square
        if (squareIndex === rooms[roomId].dangerSquare) {
            // Get current player index before elimination
            const currentPlayerIndex = rooms[roomId].activePlayers.indexOf(socket.id);
            
            // Add player to eliminated list with elimination order
            rooms[roomId].eliminatedPlayers.push({
                id: socket.id,
                name: rooms[roomId].playerNames[socket.id],
                eliminationOrder: rooms[roomId].eliminatedPlayers.length + 1,
                squareIndex: squareIndex
            });
            
            // Player is eliminated
            rooms[roomId].activePlayers = rooms[roomId].activePlayers.filter(id => id !== socket.id);
            
            // Check if game is over (only one player left or no players left)
            if (rooms[roomId].activePlayers.length <= 1) {
                rooms[roomId].gameState = 'finished';
                if (rooms[roomId].activePlayers.length === 1) {
                    const winnerId = rooms[roomId].activePlayers[0];
                    const winnerName = rooms[roomId].playerNames[winnerId];
                    io.to(roomId).emit('gameWon', {
                        winner: winnerId,
                        winnerName: winnerName,
                        loser: socket.id,
                        loserName: rooms[roomId].playerNames[socket.id],
                        lastPlayerStanding: true,
                        squareIndex: squareIndex, // Include the danger square index
                        eliminatedPlayers: rooms[roomId].eliminatedPlayers,
                        finalRanking: [...rooms[roomId].eliminatedPlayers.reverse(), {
                            id: winnerId,
                            name: winnerName,
                            status: 'winner'
                        }]
                    });
                } else {
                    // All players eliminated (shouldn't happen in normal gameplay)
                    io.to(roomId).emit('gameOver', { 
                        message: 'All players eliminated!',
                        eliminatedPlayers: rooms[roomId].eliminatedPlayers
                    });
                }
                return;
            }
            
            // Adjust current turn if necessary
            if (rooms[roomId].currentTurn >= rooms[roomId].activePlayers.length) {
                rooms[roomId].currentTurn = 0;
            }
            rooms[roomId].currentTurn = rooms[roomId].currentTurn % rooms[roomId].activePlayers.length;
            const nextPlayerId = rooms[roomId].activePlayers[rooms[roomId].currentTurn];
            
            io.to(roomId).emit('playerEliminated', {
                eliminatedId: socket.id,
                eliminatedName: rooms[roomId].playerNames[socket.id],
                squareIndex: squareIndex,
                nextPlayerId: nextPlayerId,
                nextPlayerName: rooms[roomId].playerNames[nextPlayerId],
                remainingPlayers: rooms[roomId].activePlayers.length,
                eliminatedPlayers: rooms[roomId].eliminatedPlayers,
                activePlayers: rooms[roomId].activePlayers,
                eliminationOrder: rooms[roomId].eliminatedPlayers.length
            });
            return;
        } else {
            // Safe square clicked
            if (!room.clickedSquares.includes(data.squareIndex)) {
                room.clickedSquares.push(data.squareIndex);
                
                // Check if all safe squares are clicked
                if (room.clickedSquares.length === room.boardSize - 1) {
                    room.gameState = 'finished';
                    io.to(roomId).emit('gameWon', {
                        winner: socket.id,
                        winnerName: playerName,
                        clickedSquares: room.clickedSquares
                    });
                } else {
                    // Move to next player's turn
                    room.currentTurn = (room.currentTurn + 1) % room.activePlayers.length;
                    const nextPlayerId = room.activePlayers[room.currentTurn];
                    
                    io.to(roomId).emit('squareClicked', {
                        playerId: socket.id,
                        playerName: playerName,
                        squareIndex: data.squareIndex,
                        clickedCount: room.clickedSquares.length,
                        nextPlayerId: nextPlayerId,
                        nextPlayerName: room.playerNames[nextPlayerId]
                    });
                }
            }
        }
    });

    socket.on('restartGame', () => {
        const roomId = players[socket.id]?.room;
        if (!roomId || rooms[roomId].host !== socket.id) return;

        rooms[roomId].gameState = 'waiting';
        rooms[roomId].dangerSquare = -1;
        rooms[roomId].clickedSquares = [];
        rooms[roomId].activePlayers = [...rooms[roomId].players]; // Reset active players
        rooms[roomId].eliminatedPlayers = []; // Reset eliminated players
        rooms[roomId].currentTurn = 0;
        
        io.to(roomId).emit('gameRestarted');
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        const roomId = players[socket.id]?.room;
        if (!roomId) return;

        if (rooms[roomId]) {
            rooms[roomId].players = rooms[roomId].players.filter(id => id !== socket.id);
            
            // Also remove from active players if game is in progress
            if (rooms[roomId].activePlayers) {
                rooms[roomId].activePlayers = rooms[roomId].activePlayers.filter(id => id !== socket.id);
            }
            
            delete rooms[roomId].playerNames[socket.id];

            if (rooms[roomId].players.length === 0) {
                delete rooms[roomId];
            } else if (rooms[roomId].host === socket.id) {
                // Assign new host
                rooms[roomId].host = rooms[roomId].players[0];
                io.to(roomId).emit('newHost', { hostId: rooms[roomId].host });
            }

            // Only emit playerLeft if the room still exists
            if (rooms[roomId]) {
                io.to(roomId).emit('playerLeft', { 
                    playerId: socket.id,
                    players: rooms[roomId].players.map(id => ({
                        id,
                        name: rooms[roomId].playerNames[id]
                    }))
                });
            }
        }

        delete players[socket.id];
    });
});

function generateRoomId() {
    // Generate a more memorable 6-character code (uppercase letters and numbers)
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});