const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, 'public')));

// Store active game sessions
let rooms = {};
let players = {};

io.on('connection', (socket) => {
    console.log('New user connected:', socket.id);

    // Create a new game session
    socket.on('createSession', (data) => {
        const sessionId = generateSessionId();
        const boardSize = parseInt(data.boardSize);
        
        rooms[sessionId] = {
            host: socket.id,
            players: [socket.id],
            gameState: 'waiting',
            boardSize: boardSize,
            dangerSquare: -1,
            clickedSquares: [],
            playerNames: {}
        };
        
        socket.join(sessionId);
        players[socket.id] = {
            room: sessionId,
            name: data.playerName
        };
        
        rooms[sessionId].playerNames[socket.id] = data.playerName;
        
        // Send session created confirmation with the unique session ID
        io.to(sessionId).emit('sessionCreated', { 
            sessionId, 
            host: socket.id,
            boardSize: boardSize
        });
    });

    // Join an existing game session
    socket.on('joinSession', (data) => {
        const sessionId = data.sessionId;
        if (!rooms[sessionId]) {
            socket.emit('error', { message: 'Session not found' });
            return;
        }

        if (rooms[sessionId].gameState !== 'waiting') {
            socket.emit('error', { message: 'Game already started' });
            return;
        }

        socket.join(sessionId);
        players[socket.id] = {
            room: sessionId,
            name: data.playerName
        };
        
        rooms[sessionId].players.push(socket.id);
        rooms[sessionId].playerNames[socket.id] = data.playerName;
        
        io.to(sessionId).emit('playerJoined', { 
            playerId: socket.id, 
            playerName: data.playerName,
            players: rooms[sessionId].players.map(id => ({
                id,
                name: rooms[sessionId].playerNames[id]
            }))
        });
    });

    // Start the game after all players have joined
    socket.on('startGame', (data) => {
        const sessionId = players[socket.id]?.room;
        if (!sessionId || rooms[sessionId].host !== socket.id) return;

        rooms[sessionId].gameState = 'choosing';
        io.to(sessionId).emit('gameStarted', { 
            boardSize: rooms[sessionId].boardSize 
        });
    });

    // Select the danger square
    socket.on('selectDangerSquare', (data) => {
        const sessionId = players[socket.id]?.room;
        if (!sessionId || rooms[sessionId].gameState !== 'choosing') return;

        rooms[sessionId].dangerSquare = data.squareIndex;
        rooms[sessionId].gameState = 'playing';
        io.to(sessionId).emit('dangerSquareSelected', { 
            dangerSquare: data.squareIndex,
            boardSize: rooms[sessionId].boardSize
        });
    });

    // Handle square clicks during gameplay
    socket.on('squareClicked', (data) => {
        const sessionId = players[socket.id]?.room;
        if (!sessionId || rooms[sessionId].gameState !== 'playing') return;

        const room = rooms[sessionId];
        const playerName = room.playerNames[socket.id];

        if (data.squareIndex === room.dangerSquare) {
            // Player hit the danger square
            room.gameState = 'finished';
            io.to(sessionId).emit('gameOver', {
                loser: socket.id,
                loserName: playerName,
                dangerSquare: room.dangerSquare,
                clickedSquares: room.clickedSquares
            });
        } else {
            // Safe square clicked
            if (!room.clickedSquares.includes(data.squareIndex)) {
                room.clickedSquares.push(data.squareIndex);
                
                // Check if all safe squares are clicked
                if (room.clickedSquares.length === room.boardSize - 1) {
                    room.gameState = 'finished';
                    io.to(sessionId).emit('gameWon', {
                        winner: socket.id,
                        winnerName: playerName,
                        clickedSquares: room.clickedSquares
                    });
                } else {
                    io.to(sessionId).emit('squareClicked', {
                        playerId: socket.id,
                        playerName: playerName,
                        squareIndex: data.squareIndex,
                        clickedCount: room.clickedSquares.length
                    });
                }
            }
        }
    });

    // Restart the game
    socket.on('restartGame', () => {
        const sessionId = players[socket.id]?.room;
        if (!sessionId || rooms[sessionId].host !== socket.id) return;

        rooms[sessionId].gameState = 'waiting';
        rooms[sessionId].dangerSquare = -1;
        rooms[sessionId].clickedSquares = [];
        
        io.to(sessionId).emit('gameRestarted');
    });

    // Check if a session exists
    socket.on('checkSession', (data) => {
        const sessionId = data.sessionId;
        if (rooms[sessionId] && rooms[sessionId].gameState === 'waiting') {
            socket.emit('sessionExists', { exists: true });
        } else {
            socket.emit('sessionExists', { exists: false });
        }
    });

    // Handle player disconnection
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        const sessionId = players[socket.id]?.room;
        if (!sessionId) return;

        if (rooms[sessionId]) {
            rooms[sessionId].players = rooms[sessionId].players.filter(id => id !== socket.id);
            delete rooms[sessionId].playerNames[socket.id];

            if (rooms[sessionId].players.length === 0) {
                delete rooms[sessionId];
            } else if (rooms[sessionId].host === socket.id) {
                // Assign new host
                rooms[sessionId].host = rooms[sessionId].players[0];
                io.to(sessionId).emit('newHost', { hostId: rooms[sessionId].host });
            }

            io.to(sessionId).emit('playerLeft', { 
                playerId: socket.id,
                players: rooms[sessionId].players.map(id => ({
                    id,
                    name: rooms[sessionId].playerNames[id]
                }))
            });
        }

        delete players[socket.id];
    });

    // Leave room/session
    socket.on('leaveSession', () => {
        const sessionId = players[socket.id]?.room;
        if (!sessionId) return;

        socket.leave(sessionId);
        
        if (rooms[sessionId]) {
            rooms[sessionId].players = rooms[sessionId].players.filter(id => id !== socket.id);
            delete rooms[sessionId].playerNames[socket.id];

            if (rooms[sessionId].players.length === 0) {
                delete rooms[sessionId];
            } else if (rooms[sessionId].host === socket.id) {
                // Assign new host
                rooms[sessionId].host = rooms[sessionId].players[0];
                io.to(sessionId).emit('newHost', { hostId: rooms[sessionId].host });
            }

            io.to(sessionId).emit('playerLeft', { 
                playerId: socket.id,
                players: rooms[sessionId].players.map(id => ({
                    id,
                    name: rooms[sessionId].playerNames[id]
                }))
            });
        }

        delete players[socket.id];
    });
});

// Generate a unique session ID
function generateSessionId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});