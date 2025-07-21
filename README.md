# Online Danger Square Game

A simple multiplayer game where players take turns clicking on squares while trying to avoid the hidden danger square.

## Features

- Create game rooms with custom board sizes
- Join existing rooms using unique room codes
- Real-time multiplayer gameplay using Socket.IO
- Simple and intuitive user interface

## How to Play

1. **Create a Room**: Enter your name and select the number of squares for the game board
2. **Share the Room Code**: Send the unique room code to friends who want to join
3. **Join a Room**: Enter your name and the room code to join an existing game
4. **Game Rules**:
   - The host selects one square as the "danger square"
   - Players take turns clicking on squares
   - If a player clicks on the danger square, they lose
   - If all safe squares are clicked without hitting the danger square, the last player wins

## Technologies Used

- Node.js
- Express.js
- Socket.IO
- HTML/CSS/JavaScript

## Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Start the server: `npm start`
4. Open your browser and navigate to `http://localhost:3000`

## Deployment

This game can be deployed to platforms like Heroku, Vercel, or any other Node.js hosting service.
