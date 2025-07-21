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
            dangerSquare: -1,
            clickedSquares: [],
            playerNames: {}
        };
        
        socket.join(roomId);
        players[socket.id] = {
            room: roomId,
            name: data.playerName
        };
        
        rooms[roomId].playerNames[socket.id] = data.playerName;
        io.to(roomId).emit('roomCreated', { roomId, host: socket.id, boardSize: rooms[roomId].boardSize });
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

        socket.join(roomId);
        players[socket.id] = {
            room: roomId,
            name: data.playerName
        };
        
        rooms[roomId].players.push(socket.id);
        rooms[roomId].playerNames[socket.id] = data.playerName;
        
        io.to(roomId).emit('playerJoined', { 
            playerId: socket.id, 
            playerName: data.playerName,
            players: rooms[roomId].players.map(id => ({
                id,
                name: rooms[roomId].playerNames[id]
            }))
        });
    });

    socket.on('startGame', (data) => {
        const roomId = players[socket.id]?.room;
        if (!roomId || rooms[roomId].host !== socket.id) return;

        rooms[roomId].gameState = 'choosing';
        rooms[roomId].boardSize = data.boardSize;
        io.to(roomId).emit('gameStarted', { boardSize: data.boardSize });
    });

    socket.on('selectDangerSquare', (data) => {
        const roomId = players[socket.id]?.room;
        if (!roomId || rooms[roomId].gameState !== 'choosing') return;

        rooms[roomId].dangerSquare = data.squareIndex;
        rooms[roomId].gameState = 'playing';
        io.to(roomId).emit('dangerSquareSelected', { 
            dangerSquare: data.squareIndex,
            boardSize: rooms[roomId].boardSize
        });
    });

    socket.on('squareClicked', (data) => {
        const roomId = players[socket.id]?.room;
        if (!roomId || rooms[roomId].gameState !== 'playing') return;

        const room = rooms[roomId];
        const playerName = room.playerNames[socket.id];

        if (data.squareIndex === room.dangerSquare) {
            // Player hit the danger square
            room.gameState = 'finished';
            io.to(roomId).emit('gameOver', {
                loser: socket.id,
                loserName: playerName,
                clickedSquares: room.clickedSquares
            });
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
                    io.to(roomId).emit('squareClicked', {
                        playerId: socket.id,
                        playerName: playerName,
                        squareIndex: data.squareIndex,
                        clickedCount: room.clickedSquares.length
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
        
        io.to(roomId).emit('gameRestarted');
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        const roomId = players[socket.id]?.room;
        if (!roomId) return;

        if (rooms[roomId]) {
            rooms[roomId].players = rooms[roomId].players.filter(id => id !== socket.id);
            delete rooms[roomId].playerNames[socket.id];

            if (rooms[roomId].players.length === 0) {
                delete rooms[roomId];
            } else if (rooms[roomId].host === socket.id) {
                // Assign new host
                rooms[roomId].host = rooms[roomId].players[0];
                io.to(roomId).emit('newHost', { hostId: rooms[roomId].host });
            }

            io.to(roomId).emit('playerLeft', { 
                playerId: socket.id,
                players: rooms[roomId].players.map(id => ({
                    id,
                    name: rooms[roomId].playerNames[id]
                }))
            });
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