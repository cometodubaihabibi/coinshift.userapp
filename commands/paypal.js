const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ComponentType 
} = require('discord.js');
const { logToChannel } = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('paypal')
        .setDescription('Provide your PayPal information.')
        .setIntegrationTypes(0, 1)
        .setContexts(0, 1, 2)
        .addNumberOption(option =>
            option.setName('amount')
                .setDescription('The amount in Euros to send (e.g., 10, 10.5).')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('mail')
                .setDescription('Select your PayPal email.')
                .setRequired(true)
                .addChoices(
                    { name: 'Coinbase - march_03_dezsanferenc@freemail.hu', value: 'march_03_dezsanferenc@freemail.hu' },
                    { name: 'Backup Account [1] - march_04_dezsanferenc@freemail.hu', value: 'march_04_dezsanferenc@freemail.hu' }
                )
        )
        .addStringOption(option =>
            option.setName('payment')
                .setDescription('Select your payment method.')
                .setRequired(true)
                .addChoices(
                    { name: 'Card/Bank', value: 'card' },
                    { name: 'Balance', value: 'balance' }
                )
        ),

    async execute(interaction, client) {
        const userId = interaction.user.id;
        const userTag = interaction.user.tag;
        const amount = interaction.options.getNumber('amount');
        const selectedMail = interaction.options.getString('mail');
        const paymentMethod = interaction.options.getString('payment');

        // Validate the amount
        if (amount <= 0) {
            await interaction.reply({ content: '❌ Please provide a valid amount greater than 0.', ephemeral: true });
            return;
        }
        const cardTos = `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
        > <:support:1345159564013862922> • Send payment as **Friends and Family** • F&F. (No refund will be given if you send it as Goods and Services)
        > <:support:1345159564013862922> • No notes. (No refound if you add a note.)
        > <:support:1345159564013862922> • Send **EURO** only.
        > <:support:1345159564013862922> • Pay with using **Card/Bank**. (Since you chose card payment)
        > <:support:1345159564013862922> • After payment is sent, provide an **\`uncropped\`** screenshot of the summary in PayPal App/Browser PayPal.
        ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
        > <:admins:1345157239756820490> • If my PayPal account becomes **__locked or limited__** following your payment, you will be required to wait until the issue is resolved. If the problem can't be fixed, refunds **__will not be available.__**
        > <:admins:1345157239756820490> • **__I'm not__** going to pay any extra fees set by crypto wallets or PayPal.
        > <:admins:1345157239756820490> • Payments that are sent without prior approval will be considered as a **__gift__**.
        > <:admins:1345157239756820490> • **IF** the deal is done with a **__MiddleMan__** and after sending my funds, the client's money gets locked on the PayPal account, we get our funds back, and the client will have to wait till the account will be unlocked (if it will be).
        > <:admins:1345157239756820490> • **IF** my discord account gets t3rm€d after your payment or around that time, you'll have to contact me within 48 hours either in new profile or in telegram. If you won't contact within 48 hours, no refound will be given.
         ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬       
        > <:icons_announce:1345159930948227134> • If you break my **\`Terms Of Service\`** such as adding a note to your payment or anything listed above, **__no exchange/refund__** is available.
        > <:warn2:1345157615294087290> • I have every right to add an extra **\`+25%\`** fee or keep the money if you break my Terms Of Service.
        > <:warn2:1345157615294087290> • If we have a PayPal To Crypto deal and if the crypto value goes down in, you will receive less crypto based on how much it went down.
        ## <:warn2:1345157615294087290> When you are sending me the payment, you are automatically accepting my Terms Of Service.`;
        
        const balanceTos = `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
        > <:support:1345159564013862922> • Send payment as **Friends and Family** • F&F. (No refund will be given if you send it as Goods and Services)
        > <:support:1345159564013862922> • No notes. (No refound if you add a note.)
        > <:support:1345159564013862922> • Send **EURO** only.
        > <:support:1345159564013862922> • Pay with **BALANCE** (**If you are paying with a card, let me know before payment is done or no exchange/refund will be given.**)
        > <:support:1345159564013862922> • After payment is sent, provide an **\`uncropped\`** screenshot of the summary in PayPal App/Browser PayPal.
        ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
        > <:admins:1345157239756820490> • If my PayPal account becomes **__locked or limited__** following your payment, you will be required to wait until the issue is resolved. If the problem can't be fixed, refunds **__will not be available.__**
        > <:admins:1345157239756820490> • **__I'm not__** going to pay any extra fees set by crypto wallets or PayPal.
        > <:admins:1345157239756820490> • Payments that are sent without prior approval will be considered as a **__gift__**.
        > <:admins:1345157239756820490> • **IF** the deal is done with a **__MiddleMan__** and after sending my funds, the client's money gets locked on the PayPal account, we get our funds back, and the client will have to wait till the account will be unlocked (if it will be).
        > <:admins:1345157239756820490> • **IF** my discord account gets t3rm€d after your payment or around that time, you'll have to contact me within 48 hours either in new profile or in telegram. If you won't contact within 48 hours, no refound will be given.
         ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬       
        > <:icons_announce:1345159930948227134> • If you break my **\`Terms Of Service\`** such as adding a note to your payment or anything listed above, **__no exchange/refund__** is available.
        > <:warn2:1345157615294087290> • I have every right to add an extra **\`+25%\`** fee or keep the money if you break my Terms Of Service.
        > <:warn2:1345157615294087290> • If we have a PayPal To Crypto deal and if the crypto value goes down in, you will receive less crypto based on how much it went down.
        ## <:warn2:1345157615294087290> When you are sending me the payment, you are automatically accepting my Terms Of Service.`;

        
        let tosDescription;
if (paymentMethod === 'card') {
    tosDescription = cardTos;
} else {
    tosDescription = balanceTos;
}



        // Create the TOS Embed
        const tosEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('<:paypa:1345160499230277682> Terms Of Service • TOS <:paypa:1345160499230277682>')
            .setDescription(tosDescription)
            .setThumbnail("https://media.discordapp.net/attachments/1335175913486286940/1335261630178656439/logo.gif?ex=67c31f4c&is=67c1cdcc&hm=4cf6b59eb7c9aa7c3cdcbbe458592749edb218680942a560016b711451aa3499&=&width=288&height=288")
            .setTimestamp();

        const acceptButton = new ButtonBuilder()
            .setCustomId(`accept_paypal_tos_${userId}`)
            .setLabel('Accept my TOS')
            .setStyle(ButtonStyle.Success);

        const tosRow = new ActionRowBuilder()
            .addComponents(acceptButton);

        // Send the TOS Embed
        await interaction.reply({ embeds: [tosEmbed], components: [tosRow], ephemeral: false });

        // Fetch the reply message to set up a collector
        const replyMessage = await interaction.fetchReply();

        const collector = replyMessage.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
        });

        collector.on('collect', async (buttonInteraction) => {
            const { customId, user: buttonUser } = buttonInteraction;


            // Handle Accept Button
            if (customId === `accept_paypal_tos_${userId}`) {
                // Disable the Accept button after it's clicked
                const disabledAcceptButton = new ButtonBuilder()
                    .setCustomId(`accept_paypal_tos_disabled_${userId}`)
                    .setLabel('TOS Accepted')
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(true);

                const disabledTosRow = new ActionRowBuilder()
                    .addComponents(disabledAcceptButton);

                // Update the original ToS message to disable the Accept button
                await buttonInteraction.update({ components: [disabledTosRow] });

                // Prepare the PayPal Information Embed
                const paypalInfoEmbed = new EmbedBuilder()
                    .setColor('#00FF00') // Green color for success
                    .setTitle(`<:excl:1345160925560307833> Your PayPal Information <:excl:1345160925560307833>`)
                    .setDescription('By proceeding, you agree to my Terms of Service. If you haven\'t read them, please scroll up and read them.')
                    .addFields(
                        { name: '<:money:1345157423345701018> • Amount', value: `${amount}€`, inline: true },
                        { name: '<:paper:1345158393203134536> • PayPal Email', value: `${selectedMail}`, inline: true },
                        { name: '<:warn2:1345157615294087290> • Instructions', value: '> <:warn2:1345157615294087290> • Follow my Terms Of Service \n> <:warn2:1345157615294087290> • Send the payment **correctly**, if you fail in the payment no refound will be given.\n> <:warn2:1345157615294087290> • Once payment is sent, provide **uncropped** screenshot of summary from PayPal App.\n > <:warn2:1345157615294087290> • Be patient as Im human too.', inline: false }
                    )
                    .setTimestamp();

                // Send the PayPal Information Embed as a follow-up message
                await interaction.followUp({ embeds: [paypalInfoEmbed], ephemeral: false });
                await interaction.followUp(`${selectedMail}`)

                // Optionally, stop the collector to prevent further interactions
                collector.stop();
            }
        });

        collector.on('end', collected => {
            // console.log(`Collected ${collected.size} interactions for /paypal command.`);
        });

        // Log the paypal command usage
        try {
            await logToChannel(client, process.env.LOG_CHANNEL, {
                title: 'PayPal Command Used',
                fields: [
                    { name: 'User', value: `<@${userId}> (${userTag})`, inline: true },
                    { name: 'Amount', value: `${amount}€`, inline: true },
                    { name: 'PayPal Email', value: `${selectedMail}`, inline: true },
                ],
                color: 'Blue',
            });
        } catch (err) {
            console.error('❌ Error logging paypal command:', err);
        }
    },
};
