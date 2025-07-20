# Deploying Your Online Danger Square Game

This guide will help you deploy your multiplayer Danger Square Game to GitHub and make it playable online.

## 1. GitHub Repository Setup

You've already initialized a Git repository locally. To push it to GitHub:

1. Create a new repository on GitHub:
   - Go to [GitHub](https://github.com) and sign in
   - Click the "+" icon in the top-right corner and select "New repository"
   - Name your repository (e.g., "danger-square-game")
   - Add a description (optional)
   - Choose whether to make it public or private
   - Click "Create repository"

2. Connect your local repository to GitHub:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/danger-square-game.git
   git branch -M main
   git push -u origin main
   ```
   (Replace `YOUR_USERNAME` with your GitHub username)

## 2. Deploy to a Hosting Service

For a Node.js application like this, you have several deployment options:

### Option 1: Deploy to Heroku

1. Create a [Heroku](https://heroku.com) account if you don't have one
2. Install the [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli)
3. Login to Heroku: `heroku login`
4. Create a new Heroku app: `heroku create your-game-name`
5. Push to Heroku: `git push heroku main`

### Option 2: Deploy to Render

1. Create a [Render](https://render.com) account
2. Connect your GitHub repository
3. Create a new Web Service
4. Select your repository
5. Configure as a Node.js app with `npm start` as the start command

### Option 3: Deploy to Railway

1. Create a [Railway](https://railway.app) account
2. Connect your GitHub repository
3. Create a new project and select your repository
4. Railway will automatically detect your Node.js app and deploy it

## 3. Share Your Game

Once deployed, you'll get a URL where your game is hosted (e.g., `https://your-game-name.herokuapp.com`).

Share this URL with friends to play your game online!

## Playing the Game

1. One player creates a session and gets a unique session ID
2. They share this session ID with other players
3. Other players join using this session ID
4. The host starts the game and selects a danger square
5. Players take turns clicking squares, trying to avoid the danger square

Enjoy your online multiplayer game!
