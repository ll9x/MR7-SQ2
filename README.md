# Online Danger Square Game

A multiplayer online game where players take turns clicking on squares while trying to avoid the hidden danger square.

## Game Rules

1. One player creates a game session and selects the number of squares for the board
2. The host selects one square as the "danger square"
3. Players take turns clicking on squares
4. If a player clicks on the danger square, they lose
5. If all safe squares are clicked without hitting the danger square, the last player to click wins

## Features

- Create or join game sessions with unique session IDs
- Real-time multiplayer gameplay using Socket.IO
- Customizable board size
- Mobile-friendly responsive design

## Technologies Used

- Node.js
- Express.js
- Socket.IO
- HTML5
- CSS3
- JavaScript

## Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the server:
   ```
   npm start
   ```
4. Open your browser and navigate to `http://localhost:3000`

## Deployment

The game can be deployed to platforms like Heroku, Vercel, or Netlify.

## License

MIT
