const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} = require('discord.js');
const { logToChannel } = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('vouchexch')
        .setDescription('Vouch for your own exchange transaction.')
        .setIntegrationTypes(0, 1)
        .setContexts(0, 1, 2)
        .addStringOption(option =>
            option.setName('type')
                .setDescription('The type of exchange.')
                .setRequired(true)
        )
        .addNumberOption(option =>
            option.setName('amount')
                .setDescription('The amount involved in the exchange (e.g., 10.5).')
                .setRequired(true)
        )
        .addNumberOption(option =>
            option.setName('fee')
                .setDescription('The fee percentage for the exchange (e.g., 1, 1.15).')
                .setRequired(true)
        )    
        .addStringOption(option =>
            option.setName('server_vouch')
                .setDescription('Select the server for vouch.')
                .setRequired(true)
                .addChoices(
                    { name: 'Heaven', value: 'HEAVEN' },
                    { name: 'Panda', value: 'Panda' },
                    { name: 'Pandadev', value: 'Pandadev' },
                    { name: 'ScammerAlert', value: 'scammeralert' }
                )
        )
        .addBooleanOption(option => 
            option.setName('tosbreak')
                .setDescription('Indicates if the transaction broke TOS (true/false).')
                .setRequired(true)
        ),

    async execute(interaction, client) {
        const user = interaction.user;
        const type = interaction.options.getString('type');
        const amount = interaction.options.getNumber('amount');
        const fee = interaction.options.getNumber('fee');
        const serverVouch = interaction.options.getString('server_vouch');
        const tosBreak = interaction.options.getBoolean('tosbreak');

        let vouchChannelId;
        let vouchGuildId;

        if (serverVouch === 'HEAVEN') {
            vouchGuildId = '1343383424739836027';
            vouchChannelId = '1345765383935754330';
        } else if (serverVouch === 'scammeralert') {
            vouchGuildId = '888721743601094678';
            vouchChannelId = '1022658564176748614';
        } else if (serverVouch === 'Pandadev') {
            vouchGuildId = '1346514295483138110';
            vouchChannelId = '1346550695720910921';
        } else if (serverVouch === 'Panda') {
            vouchGuildId = '1263909352004124789';
            vouchChannelId = '1335175948886216704';
        }

        const vouchFormat = tosBreak
            ? `+rep <@${user.id}> LEGIT EXCHANGE • [${amount}€] ${type} • TY (${fee}% Fee • Due to TOS Break)`
            : `+rep <@${user.id}> LEGIT EXCHANGE • [${amount}€] ${type} • TY (${fee}% Fee)`;

        try {
            const embed = new EmbedBuilder()
                .setTitle('<:exch1:1345162458272104619> Exchange Vouch')
                .setDescription('# Vouch Created for: `Exchange`')
                .setColor('#FF0000')
                .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: '<:exch1:1345162458272104619> Vouching User (Exchanger)', value: `<@${user.id}> (${user.tag})`, inline: true },
                    { name: '<:exch1:1345162458272104619> Exchange Type', value: type, inline: true },
                    { name: '<:calculator:1345158897702408286> Fee', value: `${fee}%`, inline: true },
                    { name: '<:money:1345157423345701018> Amount', value: `${amount}€`, inline: true },
                    { name: '🔗 Vouch Channel', value: `<#${vouchChannelId}>`, inline: true },
                    { name: '📋 Vouch Format', value: `\`\`\`${vouchFormat}\`\`\``, inline: false }
                )
                .setTimestamp()
                .setFooter({ text: 'PandaExch | Exchange Vouch' });

            const copyButton = new ButtonBuilder()
                .setCustomId('copy_vouch_format_exch')
                .setLabel('📋 Copy Vouch Format')
                .setStyle(ButtonStyle.Primary);

            const viewChannelButton = new ButtonBuilder()
                .setLabel('🔗 View Vouch Channel')
                .setURL(`https://discord.com/channels/${vouchGuildId}/${vouchChannelId}`)
                .setStyle(ButtonStyle.Link);

            const row = new ActionRowBuilder()
                .addComponents(copyButton, viewChannelButton);

            await interaction.reply({ embeds: [embed], components: [row], ephemeral: false });
        } catch (error) {
            console.error('Error executing /vouchexch command:', error);
            await interaction.reply({ content: '❌ There was an error processing your vouch. Please try again later.', ephemeral: true });
        }
    },
};
