const {
    SlashCommandBuilder,
    EmbedBuilder,
    AttachmentBuilder
} = require('discord.js');
const { logToChannel } = require('../utils/logger'); // Feltételezve, hogy van egy loggered

module.exports = {
    data: new SlashCommandBuilder()
        .setName('proofexch')
        .setDescription('Provide proof of your exchange transaction.')
        .addAttachmentOption(option =>
            option.setName('image')
                .setDescription('Screenshot of the exchange proof.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('type')
                .setDescription('The type of exchange.')
                .setRequired(true))
        .addNumberOption(option =>
            option.setName('amount')
                .setDescription('The amount in euros (e.g., 10).')
                .setRequired(true))
        .addNumberOption(option =>
            option.setName('fee')
                .setDescription('The fee percentage (e.g., 1, 1.15).')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('txid')
                .setDescription('The Transaction ID/Hash.')
                .setRequired(true)),

    async execute(interaction, client) {
        const image = interaction.options.getAttachment('image');
        const type = interaction.options.getString('type');
        const amount = interaction.options.getNumber('amount');
        const fee = interaction.options.getNumber('fee');
        const txid = interaction.options.getString('txid');
        const user = interaction.user;
        const iconURL = "https://media.discordapp.net/attachments/1335175913486286940/1335261630178656439/logo.gif?ex=67c66b0c&is=67c5198c&hm=32bde73b19717a6c1cb143427247e425642486ed1f92a56a9a3389ce0d9817fe&=&width=288&height=288";

        try {
            // Díj összegének kiszámítása
            const feeAmount = (amount * fee) / 100;

            const embed = new EmbedBuilder()
                .setDescription(`# <:exch1:1345162458272104619> Legit **${amount}€** exchange from **${type}**? <:exch1:1345162458272104619>\n ## <:paper:1345158393203134536> Exchange Details <:paper:1345158393203134536>`)
                .setColor('#FF0000')
                .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: '<:paper:1345158393203134536> Transaction ID/Hash <:paper:1345158393203134536>', value: txid, inline: false },
                    { name: '<:calculator:1345158897702408286> Exchange Fees <:calculator:1345158897702408286>', value: `${fee}%`, inline: true },
                    { name: '<:calculator:1345158897702408286> Fee amount in EUR <:calculator:1345158897702408286>', value: `${feeAmount}€`, inline: true}
                )
                .setImage(image.url) // Kép hozzáadása az embedhez
                .setTimestamp()
                .setFooter({ text: '• PandaExch • Proof System', iconURL: iconURL })
                .setAuthor({ name: '• PandaExch • Proof System', iconURL: iconURL });
                
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error executing /proofexch command:', error);
            await interaction.reply({ content: '❌ There was an error processing your proof. Please try again later.', ephemeral: true });
        }
    },
};