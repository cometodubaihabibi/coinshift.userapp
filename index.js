// main.js

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { 
    Client, 
    Collection, 
    EmbedBuilder, 
    GatewayIntentBits, 
    Partials, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    InteractionType 
} = require('discord.js');

// Initialize Discord Client with necessary intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, // Required for slash commands
        GatewayIntentBits.DirectMessages,
    ],
    partials: [Partials.Channel], // Enables handling of DMs and partial channels
});

// Initialize Collection for slash commands
client.commands = new Collection();

// Path to the commands directory
const commandsPath = path.join(__dirname, 'commands');

// Read all command files
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

// Load each slash command
for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    // Ensure the command has required properties
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
    } else {
        console.warn(`The command at ${filePath} is missing "data" or "execute" property.`);
    }
}

// When the client is ready
client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    let logChannel = client.channels.cache.get(process.env.LOG_CHANNEL);

    if (!logChannel) {
        try {
            logChannel = await client.channels.fetch(process.env.LOG_CHANNEL);
        } catch (error) {
            console.error('Error fetching the log channel:', error);
        }
    }

    if (logChannel && logChannel.isTextBased()) {
        const embed = new EmbedBuilder()
            .setTitle('Bot Online')
            .setDescription(`MOVE WALLET V2 is now online as ${client.user.tag}!`)
            .setColor('Green')
            .setTimestamp();
        logChannel.send({ embeds: [embed] });

        // If you have other startup functions, initialize them here
    } else {
        console.warn('Log channel not found or is not a text-based channel. Please check the LOG_CHANNEL ID in .env.');
    }
});

// Event: Handling Slash Commands and Button Interactions
client.on('interactionCreate', async interaction => {
    if (interaction.type === InteractionType.ApplicationCommand) {
        // Handling Slash Commands
        const command = client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }

        try {
            // Execute the command
            await command.execute(interaction, client);

            // Log Command Execution
            let logChannel = client.channels.cache.get(process.env.LOG_CHANNEL);

            if (!logChannel) {
                try {
                    logChannel = await client.channels.fetch(process.env.LOG_CHANNEL);
                } catch (error) {
                    console.error('Error fetching the log channel for logging commands:', error);
                }
            }

            if (logChannel && logChannel.isTextBased()) {
                const embed = new EmbedBuilder()
                    .setTitle('📄 Command Executed')
                    .addFields(
                        { name: 'User', value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
                        { name: 'Command', value: `/${interaction.commandName}`, inline: true },
                        { name: 'Channel', value: `${interaction.guild ? interaction.guild.name : 'DM'}`, inline: true }
                    )
                    .setColor('Blue')
                    .setTimestamp();
                logChannel.send({ embeds: [embed] });
            }
        } catch (error) {
            console.error(`Error executing ${interaction.commandName}:`, error);

            // Determine Reply Type
            const reply = interaction.replied || interaction.deferred
                ? { content: '❌ There was an error executing that command!', ephemeral: true }
                : { content: '❌ There was an error executing that command!', ephemeral: true };

            try {
                await interaction.reply(reply);
            } catch (replyError) {
                console.error('Error sending error reply to user:', replyError);
            }

            // Log the Error
            let logChannel = client.channels.cache.get(process.env.LOG_CHANNEL);

            if (!logChannel) {
                try {
                    logChannel = await client.channels.fetch(process.env.LOG_CHANNEL);
                } catch (error) {
                    console.error('Error fetching the log channel for logging errors:', error);
                }
            }

            if (logChannel && logChannel.isTextBased()) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ Command Execution Error')
                    .addFields(
                        { name: 'User', value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
                        { name: 'Command', value: `/${interaction.commandName}`, inline: true },
                        { name: 'Error', value: `${error.message}`, inline: true }
                    )
                    .setColor('Red')
                    .setTimestamp();
                logChannel.send({ embeds: [embed] });
            }
        }
    } else if (interaction.isButton()) {
        // Handling Button Interactions
        if (interaction.customId === 'copy_vouch_format') { // Existing button
            // Retrieve the original embed message
            const embed = interaction.message.embeds[0];
            if (!embed) {
                await interaction.reply({ content: '❌ No embed found to copy.', ephemeral: true });
                return;
            }

            // Extract the vouch format field
            const vouchFormatField = embed.fields.find(field => field.name.includes('Vouch Format'));

            if (!vouchFormatField) {
                await interaction.reply({ content: '❌ Vouch format not found in the embed.', ephemeral: true });
                return;
            }

            // Extract the vouch format text without the code block
            const vouchFormatMatch = vouchFormatField.value.match(/```([\s\S]*?)```/);
            const vouchFormat = vouchFormatMatch ? vouchFormatMatch[1].trim() : 'Vouch format not found.';

            // Send the vouch format to the user ephemerally
            await interaction.reply({ content: vouchFormat, ephemeral: true });
        }

        if (interaction.customId === 'copy_vouch_format_exch') { // New button for vouchexch
            // Retrieve the original embed message
            const embed = interaction.message.embeds[0];
            if (!embed) {
                await interaction.reply({ content: '❌ No embed found to copy.', ephemeral: true });
                return;
            }

            // Extract the vouch format field
            const vouchFormatField = embed.fields.find(field => field.name.includes('Vouch Format'));

            if (!vouchFormatField) {
                await interaction.reply({ content: '❌ Vouch format not found in the embed.', ephemeral: true });
                return;
            }

            // Extract the vouch format text without the code block
            const vouchFormatMatch = vouchFormatField.value.match(/```([\s\S]*?)```/);
            const vouchFormat = vouchFormatMatch ? vouchFormatMatch[1].trim() : 'Vouch format not found.';

            // Send the vouch format to the user ephemerally
            await interaction.reply({ content: vouchFormat, ephemeral: true });
        }
    }
});

// Log in to Discord
client.login(process.env.TOKEN);
