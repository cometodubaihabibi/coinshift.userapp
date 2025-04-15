// commands/math.js

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('math')
        .setDescription('Solve a mathematical expression.')
        .setIntegrationTypes(0, 1)
        .setContexts(0, 1, 2)
        .addStringOption(option =>
            option.setName('solve')
                .setDescription('The mathematical expression to solve.')
                .setRequired(true)
        ),

    /**
     * Processes the mathematical expression by handling operators and percentages.
     *
     * @param {string} eqn - The raw mathematical expression.
     * @returns {string} - The processed expression ready for evaluation.
     * @throws {Error} - If the expression contains invalid characters.
     */
    processEquation(eqn) {
        // Replace 'x' with '*' for multiplication
        eqn = eqn.replace(/x/g, '*');

        // Handle 'a + b%' => 'a * (1 + b / 100)'
        eqn = eqn.replace(/(\d+(\.\d+)?)\s*\+\s*(\d+(\.\d+)?)%/g, '($1 * (1 + $3 / 100))');

        // Handle 'a - b%' => 'a * (1 - b / 100)'
        eqn = eqn.replace(/(\d+(\.\d+)?)\s*-\s*(\d+(\.\d+)?)%/g, '($1 * (1 - $3 / 100))');

        // Handle 'a * b%' => 'a * (b / 100)'
        eqn = eqn.replace(/(\d+(\.\d+)?)\s*\*\s*(\d+(\.\d+)?)%/g, '($1 * ($3 / 100))');

        // Handle 'a / b%' => 'a / ($3 / 100)'
        eqn = eqn.replace(/(\d+(\.\d+)?)\s*\/\s*(\d+(\.\d+)?)%/g, '($1 / ($3 / 100))');

        // Optionally, handle standalone percentages like '50%' => '(50 / 100)'
        eqn = eqn.replace(/(\d+(\.\d+)?)%/g, '($1 / 100)');

        return eqn;
    },

    /**
     * Safely evaluates the mathematical expression.
     *
     * @param {string} eqn - The processed mathematical expression.
     * @returns {number} - The result of the evaluation.
     * @throws {Error} - If the expression is invalid or cannot be evaluated.
     */
    evaluateExpression(eqn) {
        // Validate the expression to contain only allowed characters
        if (!/^[0-9+\-*/().\s]+$/.test(eqn)) {
            throw new Error('Invalid characters in the expression.');
        }

        // Evaluate the expression using the Function constructor
        // This is safer than eval but still should be used cautiously
        // Only after ensuring the expression contains allowed characters
        // Note: This does not handle all edge cases and is for basic expressions
        const result = Function(`"use strict"; return (${eqn})`)();

        if (isNaN(result) || !isFinite(result)) {
            throw new Error('The expression could not be evaluated to a finite number.');
        }

        return result;
    },

    /**
     * Executes the math command.
     *
     * @param {Interaction} interaction - The interaction that triggered the command.
     * @param {Client} client - The Discord client.
     */
    async execute(interaction, client) {
        const expression = interaction.options.getString('solve');

        try {
            const processedExpression = this.processEquation(expression);
            const result = this.evaluateExpression(processedExpression);

            const embed = new EmbedBuilder()
                .setTitle('<:calculator:1345158897702408286> Calculator V2.0 <:calculator:1345158897702408286>')
                .addFields(
                    { name: 'Expression', value: `\`${expression}\``, inline: false },
                    { name: 'Result', value: `\`${result}\``, inline: false }
                )
                .setColor("#FF0000")
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error(`Math Command Error: ${error.message}`);

            const embed = new EmbedBuilder()
                .setTitle('❌ Error')
                .setDescription(error.message)
                .setColor('Red')
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    },
};
