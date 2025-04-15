// utils/logger.js

const { EmbedBuilder } = require('discord.js');

/**
 * Sends an embed message to the specified log channel.
 * @param {Discord.Client} client - The Discord client.
 * @param {string} channelId - The ID of the log channel.
 * @param {Object} embedData - The data to include in the embed.
 */
const logToChannel = async (client, channelId, embedData) => {
    try {
        const logChannel = await client.channels.fetch(channelId);
        if (logChannel) {
            const embed = new EmbedBuilder()
                .setTitle(embedData.title || 'Log')
                .addFields(embedData.fields || [])
                .setColor(embedData.color || 'Blue')
                .setTimestamp(new Date());

            if (embedData.description) {
                embed.setDescription(embedData.description);
            }

            await logChannel.send({ embeds: [embed] });
        } else {
            console.error(`Log channel not found: ${channelId}`);
        }
    } catch (error) {
        console.error('Error logging to channel:', error);
    }
};

module.exports = {
    logToChannel,
};
