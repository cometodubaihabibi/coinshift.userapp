const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ComponentType, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle 
} = require('discord.js');
const axios = require('axios');
const { getLTCPrices } = require('../utils/getLTCPrices');
const { logToChannel } = require('../utils/logger');

const TATUM_API = process.env.TATUM_API;
if (!TATUM_API) {
    console.error('Error: TATUM_API is not defined in environment variables.');
    process.exit(1);
}

// A global map to hold pending TXID verifications (keyed by a unique id)
const pendingTxVerifications = new Map();

// The URL used for the footer avatar
const footerIconURL = "https://media.discordapp.net/attachments/1335175913486286940/1335261630178656439/logo.gif?ex=67b2a48c&is=67b1530c&hm=3c27d6d4aca3630b880e59981ae1af2aa6cecd06cbce94d66de54228cc20bfe3&=&width=320&height=320";

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ltc')
        .setDescription('Provide your LTC wallet address and amount.')
        .setIntegrationTypes(0, 1)
        .setContexts(0, 1, 2)
        .addStringOption(option =>
            option.setName('address')
                .setDescription('Select your LTC wallet address.')
                .setRequired(true)
                .addChoices(
                    { name: 'Exodus Wallet Address', value: 'LNgWu8hQYUdzP7AQyF25rBkbmxf3ePczCi' },
                    { name: 'My CB LTC Address', value: 'M92oiPEJLXhmhMZm1rRFyTQDthKFHnxG4K' }    
                )
        )
        .addNumberOption(option =>
            option.setName('amount')
                .setDescription('The amount in Euros (€) to send.')
                .setRequired(true)
        ),

    async execute(interaction, client) {
        const amount = interaction.options.getNumber('amount');
        const selectedAddress = interaction.options.getString('address');

        if (amount <= 0) {
            await interaction.reply({ content: '❌ Please provide a valid amount greater than 0.', ephemeral: true });
            return;
        }

        // Fetch current LTC prices using your utility
        let prices;
        try {
            prices = await getLTCPrices();
        } catch (error) {
            console.error('Failed to fetch LTC prices:', error);
            await interaction.reply({ content: '❌ Failed to fetch LTC prices. Please try again later.', ephemeral: true });
            return;
        }

        // Calculate the LTC amount based on the provided EUR amount
        const ltcAmount = (amount / prices.priceEur).toFixed(6);

        // Build the LTC embed in the requested style with the footer avatar
        const ltcEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('<:CutePanda:1345157133855097003> Panda\'s Litecoin Address <:CutePanda:1345157133855097003>')
            .setDescription(`## <:admins:1345157239756820490> Instructions <:admins:1345157239756820490>
> <:admins:1345157239756820490> • When sending the payment make sure to provide an **uncropped** screenshot of payment from wallet.
> <:admins:1345157239756820490> • Click on the **Provide TransactionID** and paste the Transaction/Blockchain link there.`)
            .addFields(
                { name: '<:ltc:1345155343151530054> • LTC Address', value: '```LNgWu8hQYUdzP7AQyF25rBkbmxf3ePczCi```', inline: false },
                { name: '<:money:1345157423345701018> • Payment Amount', value: `**EUR:** ${amount}€\n**LTC:** ${ltcAmount} LTC`, inline: false },
                { name: '<:warn2:1345157615294087290> Note <:warn2:1345157615294087290>', value: '> <:warn2:1345157615294087290> • Do not pay more than the amount given, if you pay more, i wont refund the extra amount you paid, ill considare that as a gift.', inline: false }
            )
            .setFooter({ text: ' ', iconURL: footerIconURL })
            .setTimestamp();

        // Create buttons (using static custom IDs so anyone can interact)
        const copyAddressButton = new ButtonBuilder()
            .setCustomId('copy_address')
            .setLabel('📋 Copy Address')
            .setStyle(ButtonStyle.Primary);

        const copyAmountButton = new ButtonBuilder()
            .setCustomId('copy_amount')
            .setLabel('📋 Copy Amount')
            .setStyle(ButtonStyle.Secondary);
        
        const provideTransactionIdButton = new ButtonBuilder()
            .setCustomId('provide_transaction')
            .setLabel('📋 Provide TransactionID')
            .setStyle(ButtonStyle.Success);

        const buttonRow = new ActionRowBuilder().addComponents(copyAddressButton, copyAmountButton, provideTransactionIdButton);

        await interaction.reply({ embeds: [ltcEmbed], components: [buttonRow], ephemeral: false });

        const replyMessage = await interaction.fetchReply();
        const collector = replyMessage.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        collector.on('collect', async (buttonInteraction) => {
            if (buttonInteraction.customId === 'copy_address') {
                await buttonInteraction.reply({ content: 'LNgWu8hQYUdzP7AQyF25rBkbmxf3ePczCi', ephemeral: true });
            } else if (buttonInteraction.customId === 'copy_amount') {
                await buttonInteraction.reply({ content: `${ltcAmount} LTC`, ephemeral: true });
            } else if (buttonInteraction.customId === 'provide_transaction') {
                // Generate a unique ID for this TXID verification session
                const uniqueId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
                // Store expected payment details for later comparison
                pendingTxVerifications.set(uniqueId, {
                    selectedAddress,
                    expectedLTC: parseFloat(ltcAmount),
                    expectedEUR: amount,
                    prices
                });

                const modal = new ModalBuilder()
                    .setCustomId(`transaction_modal_${uniqueId}`)
                    .setTitle('Provide TransactionID')
                    .addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('transaction_id')
                                .setLabel('TXID or blockchain URL')
                                .setStyle(TextInputStyle.Short)
                                .setRequired(true)
                        )
                    );
                await buttonInteraction.showModal(modal);

                // Wait for modal submission using a one-time listener on the client
                try {
                    const modalInteraction = await new Promise((resolve, reject) => {
                        const handler = (i) => {
                            if (i.isModalSubmit() && i.customId === `transaction_modal_${uniqueId}`) {
                                client.removeListener('interactionCreate', handler);
                                resolve(i);
                            }
                        };
                        client.on('interactionCreate', handler);
                        setTimeout(() => {
                            client.removeListener('interactionCreate', handler);
                            reject(new Error('Timed out waiting for modal submission'));
                        }, 300000); // 5 minutes
                    });

                    // Process modal submission
                    let txId = modalInteraction.fields.getTextInputValue('transaction_id').trim();
                    const txIdRegex = /^[A-Fa-f0-9]{64}$/;
                    if (!txIdRegex.test(txId)) {
                        // Attempt to extract a valid txid from the input (for example, if it's a blockchain URL)
                        const extracted = txId.match(/[A-Fa-f0-9]{64}/);
                        if (extracted) {
                            txId = extracted[0];
                        } else {
                            await modalInteraction.reply({ content: '❌ Please provide a valid 64-character hexadecimal Transaction ID or a valid blockchain URL.', ephemeral: true });
                            return;
                        }
                    }

                    // Retrieve and remove the pending data
                    const pendingData = pendingTxVerifications.get(uniqueId);
                    pendingTxVerifications.delete(uniqueId);
                    if (!pendingData) {
                        await modalInteraction.reply({ content: '❌ No pending payment information found for this transaction.', ephemeral: true });
                        return;
                    }

                    // Fetch transaction details from Tatum API
                    const response = await axios.get(`https://api.tatum.io/v3/litecoin/transaction/${txId}`, {
                        headers: {
                            'accept': 'application/json',
                            'x-api-key': TATUM_API,
                        },
                    });
                    const data = response.data;

                    // Compute the creation time, if available
                    const createdAt = data.time ? new Date(data.time * 1000).toLocaleString() : 'N/A';

                    // Filter outputs for the provided address and sum total received (in LTC)
                    const matchingOutputs = data.outputs.filter(output => output.address === pendingData.selectedAddress);
                    const totalReceived = matchingOutputs.reduce((acc, output) => acc + parseFloat(output.value), 0);

                    // If nothing was received, send a minimal embed stating so.
                    if (totalReceived <= 0) {
                        const transactionEmbed = new EmbedBuilder()
                            .setColor('#FF0000')
                            .setTitle('<:ss_no:1345158159907688549> TransactionID Submited <:ss_no:1345158159907688549>')
                            .addFields(
                                { name: '<:paper:1345158393203134536> • Transaction ID', value: txId, inline: false },
                                { name: '<:paper:1345158393203134536> • Total Received', value: 'Didnt receive anything from the provided TransactionID. Please send the correct TXID.', inline: false }
                            )
                            .setFooter({ text: ' ', iconURL: footerIconURL })
                            .setTimestamp();
                        return modalInteraction.reply({ embeds: [transactionEmbed] });
                    }

                    const totalReceivedFixed = totalReceived.toFixed(8);
                    // Calculate equivalent EUR value using the stored LTC price
                    const totalReceivedEUR = (totalReceived * pendingData.prices.priceEur).toFixed(2);

                    // Determine payment status by comparing expected vs. received amounts
                    const expectedLTC = pendingData.expectedLTC;
                    let paymentStatus = '';
                    let additionalField = null;
                    if (Math.abs(totalReceived - expectedLTC) < 0.000001) {
                        paymentStatus = 'Perfectly Paid <:ss_yes:1345158125774438400>';
                    } else if (totalReceived > expectedLTC) {
                        paymentStatus = 'OverPaid <:ss_yes:1345158125774438400>';
                    } else if (totalReceived < expectedLTC) {
                        paymentStatus = 'Less Paid <:ss_no:1345158159907688549>';
                        const requiredLTC = (expectedLTC - totalReceived).toFixed(6);
                        const requiredEUR = (requiredLTC * pendingData.prices.priceEur).toFixed(2);
                        additionalField = { name: 'Send More', value: `Additional required: ${requiredLTC} LTC (≈ €${requiredEUR})`, inline: false };
                    }

                    // Build the TXID verification embed with additional details and footer avatar
                    const transactionEmbed = new EmbedBuilder()
                        .setColor('#00FF00')
                        .setTitle('<:vlogo:1345158574732607528> TransactionID Received <:vlogo:1345158574732607528>')
                        .addFields(
                            { name: '<:paper:1345158393203134536> • Transaction ID', value: txId, inline: false },
                            { name: '<:ltc:1345155343151530054> • LTC Address', value: pendingData.selectedAddress, inline: false },
                            { name: '<:paper:1345158393203134536> • Total Received', value: `${totalReceivedFixed} LTC (≈ €${totalReceivedEUR})`, inline: false },
                            { name: '<:TG_NewsEmoji_004:1345158724079063160> • Created At', value: createdAt, inline: true },
                            { name: '<:admins:1345157239756820490> • Payment Status', value: paymentStatus, inline: true }
                        )
                        .setFooter({ text: ' ', iconURL: footerIconURL })
                        .setTimestamp();

                    if (additionalField) {
                        transactionEmbed.addFields(additionalField);
                    }

                    await modalInteraction.reply({ embeds: [transactionEmbed] });

                    // Optional: Log the transaction details
                    await logToChannel(client, process.env.LOG_CHANNEL, {
                        title: 'Transaction Details Verified',
                        fields: [
                            { name: 'Transaction ID', value: txId, inline: false },
                            { name: 'Address', value: pendingData.selectedAddress, inline: false },
                            { name: 'Total Received', value: `${totalReceivedFixed} LTC (≈ €${totalReceivedEUR})`, inline: false },
                            { name: 'Payment Status', value: paymentStatus, inline: false },
                        ],
                        color: 'Blue',
                    });

                } catch (error) {
                    console.error('Error waiting for modal submission:', error);
                    await buttonInteraction.followUp({ content: '❌ Timed out waiting for transaction submission.', ephemeral: true });
                }
            }
        });
    },
};
