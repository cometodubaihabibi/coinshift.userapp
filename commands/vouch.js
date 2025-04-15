// commands/vouch.js

const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} = require('discord.js');
// Remove logToChannel import if not used; uncomment if needed
const { logToChannel } = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('vouch')
        .setDescription('Vouch for purchasing a product.')
        .setIntegrationTypes(0, 1)
        .setContexts(0, 1, 2)
        .addStringOption(option =>
            option.setName('product')
                .setDescription('The product you purchased (e.g., Minecraft).')
                .setRequired(true)
        )
        .addNumberOption(option => // Changed from addIntegerOption to addNumberOption
            option.setName('amount')
                .setDescription('The amount spent (e.g., 10.50).') // Updated description to indicate decimals
                .setRequired(true)
                .setMinValue(0.01) // Optional: Set a minimum value if desired
        )
        .addStringOption(option =>
            option.setName('payment')
                .setDescription('Payment Method: LTC or PayPal.')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('server')
                .setDescription('Select the server.')
                .setRequired(true)
                .addChoices(
                    { name: 'Heaven', value: 'Heaven' },
                    { name: 'Panda', value: 'Panda' },
                    { name: 'Pandadev', value: 'Pandadev' },                    
                    { name: 'ScammerAlert', value: 'scammeralert' }
                )
        ),

    /**
     * Executes the /vouch command.
     *
     * @param {CommandInteraction} interaction - The interaction object.
     * @param {Client} client - The Discord client.
     */
    async execute(interaction, client) {
        const user = interaction.user; // The user executing the command
        const product = interaction.options.getString('product');
        const amount = interaction.options.getNumber('amount'); // Changed from getInteger to getNumber
        const paymentMethod = interaction.options.getString('payment');
        const server = interaction.options.getString('server');

        // Determine the vouch channel and guild based on the selected server
        let vouchChannelId;
        let vouchGuildId;

        if (server === 'Heaven') {
            vouchGuildId = '1343383424739836027'; // Heaven Guild ID
            vouchChannelId = '1345765383935754330'; // Heaven Channel ID
        } else if (server === 'scammeralert') {
            vouchGuildId = '888721743601094678'; // Panda Guild ID
            vouchChannelId = '1022658564176748614'; // Panda Channel ID
        } else if (server === 'Pandadev') {
            vouchGuildId = '1346514295483138110'; // Panda Guild ID
            vouchChannelId = '1346550695720910921'; // Panda Channel ID
        } else if (server === 'Panda') {
            vouchGuildId = '1263909352004124789'; // Panda Guild ID
            vouchChannelId = '1335175948886216704'; // Panda Channel ID
        }

        // Format the amount to two decimal places
        const formattedAmount = amount.toFixed(2);

        // Construct the vouch format with € appended
        const vouchFormat = `+rep <@${user.id}> BOUGHT • ${product} [${formattedAmount}€] • ${paymentMethod} • TY`;

        try {
            // Create the embed
            const embed = new EmbedBuilder()
                .setTitle('🛒 PandaExch | Product Vouch')
                .setColor('#FF0000')
                .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: '<:vlogo:1345158574732607528> Seller', value: `<@${user.id}> (${user.tag})`, inline: true },
                    { name: '<:stock:1345162085780160523> Product', value: product, inline: true },
                    { name: '<:paper:1345158393203134536> Payment Method', value: paymentMethod, inline: true },
                    { name: '<:money:1345157423345701018> Price', value: `${formattedAmount}€`, inline: true },
                    { name: '🔗 Vouch Channel', value: `<#${vouchChannelId}>`, inline: true },
                    { name: '📋 Vouch Format', value: `\`\`\`${vouchFormat}\`\`\``, inline: false },
                    { name: '<:pepelove:1345162242236223618> Message From Panda:', value: `Thank you for buying from me! Means aloot!`, inline: false },
                )
                .setTimestamp()
                .setFooter({ text: 'PandaExch | Product Vouch' });

            // Create the "Copy Vouch Format" button
            const copyButton = new ButtonBuilder()
                .setCustomId('copy_vouch_format')
                .setLabel('📋 Copy Vouch Format')
                .setStyle(ButtonStyle.Primary);

            // Create the "View Vouch Channel" button
            const viewChannelButton = new ButtonBuilder()
                .setLabel('🔗 View Vouch Channel')
                .setURL(`https://discord.com/channels/${vouchGuildId}/${vouchChannelId}`)
                .setStyle(ButtonStyle.Link);

            const row = new ActionRowBuilder()
                .addComponents(copyButton, viewChannelButton);

            // Send the embed with the buttons
            await interaction.reply({ embeds: [embed], components: [row], ephemeral: false });

            // Optional: Log the vouch exchange if logToChannel is used
            await logToChannel(client, process.env.LOG_CHANNEL, {
                title: 'Product Vouched',
                fields: [
                    { name: 'User', value: `<@${user.id}> (${user.tag})`, inline: true },
                    { name: 'Product', value: product, inline: true },
                    { name: 'Amount', value: `${formattedAmount}€`, inline: true },
                    { name: 'Payment Method', value: paymentMethod, inline: true },
                    { name: 'Server', value: server, inline: true },
                ],
                color: 'Green',
            });

        } catch (error) {
            console.error('Error executing /vouch command:', error);
            // Check if the interaction has already been replied to
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: '❌ There was an error processing your vouch. Please try again later.', ephemeral: true });
            } else {
                await interaction.reply({ content: '❌ There was an error processing your vouch. Please try again later.', ephemeral: true });
            }
        }
    },
};
