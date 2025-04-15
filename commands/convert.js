// commands/convert.js

const { 
    SlashCommandBuilder, 
    EmbedBuilder 
} = require('discord.js');
const { logToChannel } = require('../utils/logger');
const { getLTCPrices } = require('../utils/getLTCPrices');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('convert')
        .setDescription('Convert amounts between USD, EUR, and LTC.')
        .setIntegrationTypes(0, 1)
        .setContexts(0, 1, 2)
        .addStringOption(option => 
            option.setName('amount')
                .setDescription('The amount to convert (e.g., 50$, 50€, 50)')
                .setRequired(true)
        ),

    // Prefix command properties
    prefix: {
        name: 'convert',
        description: 'Convert amounts between USD, EUR, and LTC.',
    },

    /**
     * Executes the /convert slash command.
     *
     * @param {CommandInteraction} interaction - The interaction object.
     * @param {Client} client - The Discord client.
     * @param {Object} userData - The loaded user data from userdata.json.
     * @param {Function} saveUserData - Function to save user data.
     */
    async execute(interaction, client, userData, saveUserData) {
        const invokerId = interaction.user.id;
        const amountInput = interaction.options.getString('amount').trim();

        try {
            // Fetch the latest price data
            const { priceUsd, priceEur } = await getLTCPrices();

            let amount, currency, conversionResult;

            // Regular expressions to detect currency symbols
            const usdRegex = /^(\d+(\.\d+)?)\$$/;
            const eurRegex = /^(\d+(\.\d+)?)€$/;
            const ltcRegex = /^(\d+(\.\d+)?)$/;

            if (usdRegex.test(amountInput)) {
                // Case 1: Amount is in USD
                const match = amountInput.match(usdRegex);
                amount = parseFloat(match[1]);

                const ltcValue = (amount / priceUsd).toFixed(8);
                const eurValue = (amount * (priceEur / priceUsd)).toFixed(2);

                conversionResult = `
<:ltc:1345155343151530054> <:arrow:1345155563410952364> **${ltcValue} LTC**\n<:usd:1345155845834674196> <:arrow:1345155563410952364> **$${amount} USD** • Converting USD ⬍\n<:euro:1345156278082732124> <:arrow:1345155563410952364> **€${eurValue} EUR**.
                `;
            } else if (eurRegex.test(amountInput)) {
                // Case 2: Amount is in EUR
                const match = amountInput.match(eurRegex);
                amount = parseFloat(match[1]);

                const ltcValue = (amount / priceEur).toFixed(8);
                const usdValue = (amount * (priceUsd / priceEur)).toFixed(2);

                conversionResult = `
<:ltc:1345155343151530054> <:arrow:1345155563410952364> **${ltcValue} LTC**\n<:usd:1345155845834674196> <:arrow:1345155563410952364> **$${usdValue} USD**\n<:euro:1345156278082732124> <:arrow:1345155563410952364> **€${amount} EUR** • Converting EUR ⬆.
                `;
            } else if (ltcRegex.test(amountInput)) {
                // Case 3: Amount is in LTC
                amount = parseFloat(amountInput);

                const usdValue = (amount * priceUsd).toFixed(2);
                const eurValue = (amount * priceEur).toFixed(2);

                conversionResult = `
<:ltc:1345155343151530054> <:arrow:1345155563410952364> **${amount} LTC** • Converting Litecoin ⬇\n<:usd:1345155845834674196> <:arrow:1345155563410952364> **$${usdValue} USD**\n<:euro:1345156278082732124> <:arrow:1345155563410952364> **€${eurValue} EUR**.
                `;
            } else {
                // Invalid format
                await interaction.reply({ 
                    content: '❌ Invalid format. Please use `50$`, `50€`, or `50` (for LTC).', 
                    ephemeral: true 
                });
                return;
            }

            // Create an embedded message with a visually appealing UI
            const embed = new EmbedBuilder()
                .setTitle('<:exch:1345156803989868626> Currency Conversion <:exch:1345156803989868626>')
                .setDescription(conversionResult)
                .setColor('#ff0000') // Light Purple color
                .setFooter({ text: '• PandaExch • Conversion', iconURL: 'https://media.discordapp.net/attachments/1284965350789746790/1321912086678343690/logo.gif?ex=6789fcd1&is=6788ab51&hm=04d52c0647ed8ee7f2b4e9405b2a3f48375a499b900a2aa4aa77ffdaa055b71f&=' })
                .setTimestamp();

            // Send the response as an embedded message
            await interaction.reply({ embeds: [embed] });

            // Log the command usage
            try {
                await logToChannel(client, process.env.LOG_CHANNEL, {
                    title: 'Convert Command Used',
                    fields: [
                        { name: 'User', value: `<@${invokerId}> (${interaction.user.tag})`, inline: true },
                        { name: 'Input Amount', value: `${amountInput}`, inline: true },
                        { name: 'Converted Amount', value: `${conversionResult.trim()}`, inline: false },
                    ],
                    color: 'Blue',
                });
            } catch (err) {
                console.error('Error logging convert command:', err);
            }

        } catch (error) {
            console.error('Error during currency conversion:', error);
            await interaction.reply({ content: '❌ An error occurred while converting the currency. Please try again later.', ephemeral: true });
        }
    },
};
