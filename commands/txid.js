// commands/txid.js

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');
const { getLTCPrices } = require('../utils/getLTCPrices');
// Removed logToChannel import if not used; uncomment if needed
const { logToChannel } = require('../utils/logger');

// Ensure you have your Tatum API Key stored securely, e.g., in a .env file
const TATUM_API = process.env.TATUM_API;
if (!TATUM_API) {
    console.error('Error: TATUM_API is not defined in environment variables.');
    process.exit(1);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('txid')
        .setDescription('Retrieve transaction details of a Litecoin (LTC) transaction.')
        .setIntegrationTypes(0, 1)
        .setContexts(0, 1, 2)
        .addStringOption(option =>
            option.setName('txid')
                .setDescription('The transaction ID of the Litecoin transaction.')
                .setRequired(true)
        ),

    /**
     * Executes the /txid command.
     *
     * @param {Interaction} interaction - The interaction that triggered the command.
     * @param {Client} client - The Discord client.
     */
    async execute(interaction, client) {
        const txId = interaction.options.getString('txid').trim();

        // Basic validation of txId (64-character hexadecimal)
        const txIdRegex = /^[A-Fa-f0-9]{64}$/;
        if (!txId || !txIdRegex.test(txId)) {
            await interaction.reply({ content: '❌ Please provide a valid 64-character hexadecimal transaction ID.', ephemeral: true });
            return;
        }

        try {
            // Fetch transaction details from Tatum API
            const response = await axios.get(`https://api.tatum.io/v3/litecoin/transaction/${txId}`, {
                headers: {
                    'accept': 'application/json',
                    'x-api-key': TATUM_API,
                },
            });

            const data = response.data;

            // Calculate total amount from outputs
            const totalAmount = data.outputs.reduce((acc, output) => acc + parseFloat(output.value), 0).toFixed(8);

            // Fetch current LTC prices
            const prices = await getLTCPrices();
            const valueInEUR = (totalAmount * prices.priceEur).toFixed(2); // Corrected property access

            // Convert UNIX timestamp to readable date
            const createdAt = data.time ? new Date(data.time * 1000).toLocaleString() : 'N/A';

            // Determine transaction status
            const confirmations = data.blockNumber ? '<:ss_yes:1340424491398070282> Confirmed' : '<:ss_no:1340424541872328745> Pending';

            // Process outputs
            const outputs = data.outputs.map(output => ({
                address: output.address,
                amount: parseFloat(output.value).toFixed(8),
                valueEUR: (parseFloat(output.value) * prices.priceEur).toFixed(2), // Corrected property access
            }));

            // Construct explorer link (BlockCypher or another LTC explorer)
            const explorerLink = `https://live.blockcypher.com/ltc/tx/${txId}`;

            // Create the embed for the transaction details
            const embed = new EmbedBuilder()
                .setTitle(`🔍 Transaction Details: ${txId}`)
                .setColor('#FF0000') // Orange color
                .addFields(
                    { name: 'Total Amount', value: `${totalAmount} <:ltc:1345155343151530054>`, inline: true },
                    { name: 'Approximate Value', value: `€${valueInEUR} <:euro:1345156278082732124>`, inline: true },
                    { name: 'Created At', value: createdAt, inline: true },
                    { name: 'Status', value: confirmations, inline: true }
                )
                .setTimestamp();

            // Handle outputs
            if (outputs.length <= 4) {
                const outputsText = outputs.map((output, index) =>
                    `**Output [${index + 1}]:**\n**Address:** ${output.address}\n**Value Received:** ${output.amount} <:ltc:1345155343151530054> ≈ €${output.valueEUR} <:euro:1345156278082732124>`
                ).join('\n\n');

                embed.addFields({ name: 'Outputs', value: outputsText });
            } else {
                embed.addFields({ name: 'Outputs', value: 'There are too many outputs to display here. Please view the transaction on the explorer.' });
            }

            // Create the "View on Explorer" button
            const explorerButton = new ButtonBuilder()
                .setLabel('View on Explorer')
                .setURL(explorerLink)
                .setStyle(ButtonStyle.Link);

            const row = new ActionRowBuilder()
                .addComponents(explorerButton);

            // Send the embed with the button
            await interaction.reply({ embeds: [embed], components: [row] });

            // Optional: Log the command execution if logToChannel is defined and used

            await logToChannel(client, process.env.LOG_CHANNEL, {
                title: 'Transaction Details Requested',
                fields: [
                    { name: 'User', value: `<@${interaction.user.id}> (${interaction.user.tag})`, inline: true },
                    { name: 'Transaction ID', value: txId, inline: false },
                ],
                color: 'Blue',
            });

        } catch (error) {
            console.error('Error executing /txid command:', error);

            if (error.response && error.response.status === 404) {
                await interaction.reply({ content: '❌ Transaction not found. Please ensure the TXID is correct.', ephemeral: true });
            } else if (error.response && error.response.status === 429) {
                await interaction.reply({ content: '❌ Rate limit exceeded. Please try again later.', ephemeral: true });
            } else {
                await interaction.reply({ content: `❌ Failed to fetch transaction details. ${error.message}`, ephemeral: true });
            }
        }
    },
};
