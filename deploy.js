/**
 * Deployment helper script for Online Danger Square Game
 * 
 * This script helps prepare your game for deployment to various platforms
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Check if Procfile exists (for Heroku deployment)
const procfilePath = path.join(__dirname, 'Procfile');
if (!fs.existsSync(procfilePath)) {
  console.log('Creating Procfile for Heroku deployment...');
  fs.writeFileSync(procfilePath, 'web: node game.js');
  console.log('✅ Procfile created');
}

// Check if engines is specified in package.json (for Node.js version)
const packageJsonPath = path.join(__dirname, 'package.json');
const packageJson = require(packageJsonPath);

if (!packageJson.engines) {
  console.log('Adding Node.js engine version to package.json...');
  packageJson.engines = {
    "node": "16.x"
  };
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log('✅ Node.js engine version added to package.json');
}

// Check for .env file and create if it doesn't exist
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.log('Creating .env file with default configuration...');
  fs.writeFileSync(envPath, 'PORT=3000\n');
  console.log('✅ .env file created');
}

// Check if .gitignore includes .env
const gitignorePath = path.join(__dirname, '.gitignore');
if (fs.existsSync(gitignorePath)) {
  const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
  if (!gitignoreContent.includes('.env')) {
    console.log('Adding .env to .gitignore...');
    fs.appendFileSync(gitignorePath, '\n# Environment variables\n.env\n');
    console.log('✅ .env added to .gitignore');
  }
}

console.log('\n🎮 Online Danger Square Game is ready for deployment!');
console.log('\nDeployment options:');
console.log('1. GitHub: Push your code to GitHub using the commands in DEPLOYMENT.md');
console.log('2. Heroku: Deploy using "heroku create" and "git push heroku main"');
console.log('3. Render/Railway: Connect your GitHub repository to these platforms');
console.log('\nSee DEPLOYMENT.md for detailed instructions.');
