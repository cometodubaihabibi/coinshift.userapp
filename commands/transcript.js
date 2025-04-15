// commands/transcript.js

const { 
    SlashCommandBuilder, 
    AttachmentBuilder, 
    EmbedBuilder, 
    ChannelType, 
    PermissionsBitField 
} = require('discord.js');
const { createTranscript } = require('discord-html-transcripts');
const fs = require('fs').promises; // Use promises version for async/await

module.exports = {
    data: new SlashCommandBuilder()
        .setName('transcript')
        .setDescription('Generate a transcript of all messages in this channel.')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to send the transcript to via DM.')
                .setRequired(false)
        ),

    /**
     * Executes the /transcript command.
     *
     * @param {CommandInteraction} interaction - The interaction object.
     * @param {Client} client - The Discord client.
     */
    async execute(interaction, client) {
        const executor = interaction.user; // The user executing the command
        const targetUser = interaction.options.getUser('user') || null;
        const isDM = interaction.channel.type === ChannelType.DM;

        try {
            const channel = interaction.channel;
            const channelName = isDM ? 'Direct Message' : `#${channel.name}`;
            const channelId = channel.id;

            // Optional: Restrict command usage to specific roles or permissions
            /*
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
                return interaction.reply({ 
                    content: '❌ You do not have permission to use this command.', 
                    ephemeral: true 
                });
            }
            */

            // Acknowledge the command with an ephemeral response
            await interaction.reply({ 
                content: '🔍 Generating transcript, please wait...', 
                ephemeral: true 
            });

            // Fetch all messages in the channel
            let allMessages = [];
            let lastMessageId;
            const MAX_MESSAGES = 5000; // Adjusted to 5,000 to prevent excessive load

            while (true) {
                const options = { limit: 100 };
                if (lastMessageId) {
                    options.before = lastMessageId;
                }

                const messages = await channel.messages.fetch(options);
                if (messages.size === 0) break;

                allMessages = allMessages.concat(Array.from(messages.values()));
                lastMessageId = messages.last().id;

                // Prevent fetching more than Discord's message limit
                if (allMessages.length >= MAX_MESSAGES) {
                    allMessages = allMessages.slice(0, MAX_MESSAGES);
                    break;
                }

                // Optional: Add a delay to prevent rate limiting
                await new Promise(resolve => setTimeout(resolve, 500)); // 0.5 second delay
            }

            // Reverse to get chronological order
            allMessages = allMessages.reverse();

            // Create the transcript using discord-html-transcripts
            let transcriptAttachment;
            try {
                transcriptAttachment = await createTranscript(channel, {
                    messages: allMessages,
                    // Remove or adjust returnBuffer based on your library version
                    // It seems the function now returns an AttachmentBuilder directly
                    // You can customize the transcript further with additional options if needed
                    // Example options:
                    // returnBuffer: false, // Not needed if it returns AttachmentBuilder
                    // fileName: `transcript-${channelId}-${Date.now()}.html`,
                });
            } catch (transcriptError) {
                console.error('Error creating transcript:', transcriptError);
                throw new Error('Transcript generation failed.');
            }

            // Verify that transcriptAttachment is an AttachmentBuilder
            if (!(transcriptAttachment instanceof AttachmentBuilder)) {
                console.error('Transcript is not an AttachmentBuilder. Received:', typeof transcriptAttachment, transcriptAttachment);
                throw new Error('Transcript generation failed.');
            }

            // Check Transcript File Size (8MB limit for standard accounts)
            const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB
            // Access the buffer from the attachment
            const transcriptBuffer = transcriptAttachment.attachment;

            // If using discord.js v14, the attachment might be a Buffer or a ReadableStream
            // Ensure it's a Buffer for size checking
            if (Buffer.isBuffer(transcriptBuffer)) {
                if (transcriptBuffer.length > MAX_FILE_SIZE) {
                    await interaction.followUp({ 
                        content: '❌ The generated transcript exceeds the 8MB file size limit. Please narrow down the channel messages or contact support.', 
                        ephemeral: true 
                    });
                    return;
                }
            } else {
                // If it's not a Buffer, attempt to handle accordingly
                console.warn('Transcript attachment is not a Buffer. Unable to verify file size.');
                // Optionally, proceed or handle differently
            }

            // Prepare Embed for Logs Channel
            const logEmbed = new EmbedBuilder()
                .setTitle('📝 Transcript Generated')
                .setColor('#FF0000') // Red color as per requirement
                .addFields(
                    { name: '<:alhub_star2:1345161373063319645> Executor', value: `<@${executor.id}> (${executor.tag})`, inline: false },
                    { name: '<:alhub_star2:1345161373063319645> Number of Messages', value: `${allMessages.length}`, inline: false },
                    { name: '<:alhub_star2:1345161373063319645> User Transcript Sent To', value: targetUser ? `<@${targetUser.id}> (${targetUser.tag})` : 'None', inline: false },
                    { name: '<:alhub_star2:1345161373063319645> Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
                    { name: '<:alhub_star2:1345161373063319645> Channel', value: `${channelName} (${channelId})`, inline: false },
                )
                .setTimestamp();

            // Prepare Embed for DMs
            const dmEmbed = new EmbedBuilder()
                .setTitle('📝 Transcript Generated')
                .setColor('#0099ff') // Blue color for DMs for distinction
                .addFields(
                    { name: '<:alhub_star2:1345161373063319645> Channel', value: `${channelName} (${channelId})`, inline: false },
                    { name: '<:alhub_star2:1345161373063319645> Number of Messages', value: `${allMessages.length}`, inline: false },
                    { name: '<:alhub_star2:1345161373063319645> Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
                    { name: '<:alhub_star2:1345161373063319645> Requested By', value: `<@${executor.id}> (${executor.tag})`, inline: false },
                )
                .setTimestamp();

            // Fetch the transcript channel from environment variables
            const transcriptChannelId = process.env.TRANSCRIPT_CHANNEL;
            if (!transcriptChannelId) {
                console.error('TRANSCRIPT_CHANNEL is not defined in .env.');
                await interaction.followUp({ 
                    content: '❌ TRANSCRIPT_CHANNEL is not configured. Please contact the administrator.', 
                    ephemeral: true 
                });
                return;
            }

            const transcriptChannel = await client.channels.fetch(transcriptChannelId).catch(err => {
                console.error('Error fetching TRANSCRIPT_CHANNEL:', err);
                return null;
            });

            if (!transcriptChannel || !transcriptChannel.isTextBased()) {
                await interaction.followUp({ 
                    content: '❌ Log channel not found or is not a text channel. Please contact the administrator.', 
                    ephemeral: true 
                });
                return;
            }

            // Send the transcript to the logs channel
            await transcriptChannel.send({ embeds: [logEmbed], files: [transcriptAttachment] });

            // Send the transcript to the executor via DM with embed
            try {
                await executor.send({
                    embeds: [dmEmbed],
                    files: [transcriptAttachment],
                });
            } catch (dmError) {
                console.error(`Failed to send DM to executor ${executor.tag}:`, dmError);
                await interaction.followUp({ 
                    content: '⚠️ I was unable to send you a DM with the transcript. Please check your DM settings.', 
                    ephemeral: true 
                });
            }

            // If a target user is specified, send the transcript to them via DM with embed
            if (targetUser) {
                try {
                    await targetUser.send({
                        embeds: [dmEmbed],
                        files: [transcriptAttachment],
                    });
                } catch (dmError) {
                    console.error(`Failed to send DM to target user ${targetUser.tag}:`, dmError);
                    await interaction.followUp({ 
                        content: `⚠️ I was unable to send a DM to <@${targetUser.id}>. Please check their DM settings.`, 
                        ephemeral: true 
                    });
                }
            }

            // Confirm to the user
            await interaction.followUp({ 
                content: '✅ Transcript has been sent to the logs channel and your DMs.' + (targetUser ? ` Also sent to <@${targetUser.id}>.` : ''), 
                ephemeral: true 
            });

        } catch (error) {
            console.error('Error executing /transcript command:', error);
            await interaction.followUp({ 
                content: '❌ An error occurred while generating the transcript. Please try again later.', 
                ephemeral: true 
            });
        }
    },
};
