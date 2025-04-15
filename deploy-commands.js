// deploy-commands.js

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

// Destructure environment variables
const { CLIENT_ID, GUILD_ID, TOKEN } = process.env;

// Validate essential environment variables
if (!CLIENT_ID) {
    console.error('Error: Missing CLIENT_ID in .env');
    process.exit(1);
}

if (!TOKEN) {
    console.error('Error: Missing TOKEN in .env');
    process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(TOKEN);

// Path to commands directory
const commandsPath = path.join(__dirname, 'commands');

// Read all command files
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

// Array to hold command data
const commands = [];

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
    } else {
        console.warn(`The command at ${filePath} is missing "data" or "execute" property.`);
    }
}

// Deploy commands
(async () => {
    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);

        if (GUILD_ID) {
            // Deploy guild-specific commands
            await rest.put(
                Routes.applicationCommands(CLIENT_ID, GUILD_ID),
                { body: commands },
            );
            console.log(`Successfully reloaded ${commands.length} guild (/) commands for Guild ID: ${GUILD_ID}.`);
        } else {
            // Deploy global commands
            await rest.put(
                Routes.applicationCommands(CLIENT_ID),
                { body: commands },
            );
            console.log(`Successfully reloaded ${commands.length} global (/) commands.`);
        }
    } catch (error) {
        console.error('Error deploying commands:', error);
    }
})();
