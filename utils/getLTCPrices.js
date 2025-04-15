// utils/getLTCPrices.js

const axios = require('axios');

/**
 * Fetches the current Litecoin (LTC) prices in USD and EUR,
 * including the 24-hour percentage change.
 *
 * @param {number} retries - Number of retry attempts in case of failure (default: 3).
 * @param {number} delay - Delay between retries in milliseconds (default: 30000 ms).
 * @returns {Object} An object containing LTC prices and 24-hour change.
 * @throws {Error} Throws an error if fetching prices fails after retries.
 */
async function getLTCPrices(retries = 3, delay = 30000) {
    try {
        const response = await axios.get('https://min-api.cryptocompare.com/data/pricemulti', {
            params: {
                fsyms: 'LTC', // From symbol: Litecoin
                tsyms: 'USD,EUR', // To symbols: USD and EUR
                api_key: '17e6aaa926298c9779e1e01bdeedc1d33f3b8006c7d137fcfc910a5412220ed5', // Replace with your CryptoCompare API key
            },
        });

        const priceData = response.data.LTC;
        const priceUsd = priceData.USD;
        const priceEur = priceData.EUR;

        // Fetch the 24-hour percentage change for both USD and EUR
        const historyResponse = await axios.get('https://min-api.cryptocompare.com/data/histoday', {
            params: {
                fsym: 'LTC',
                tsym: 'USD',
                limit: 2, // To get the last two data points (current and the day before)
                api_key: '17e6aaa926298c9779e1e01bdeedc1d33f3b8006c7d137fcfc910a5412220ed5', // Same API key
            },
        });

        const previousPrice = historyResponse.data.Data[1].close;
        const priceChangePercentage24h = (((priceUsd - previousPrice) / previousPrice) * 100).toFixed(2);

        // Return all the gathered price data in a single object
        return {
            priceUsd,
            priceEur,
            priceChangePercentage24h,
        };
    } catch (error) {
        // Check if the error is rate-limiting (status code 429)
        if (error.response && error.response.status === 429 && retries > 0) {
            console.warn(`Rate limit hit. Retrying in ${delay / 1000} seconds...`);
            await new Promise(resolve => setTimeout(resolve, delay)); // Wait before retrying

            // Double the delay for the next retry (up to 2 minutes)
            const nextDelay = Math.min(delay * 2, 120000);
            return getLTCPrices(retries - 1, nextDelay);
        } else {
            // Log the error if retries are exhausted or it's another error
            console.error('Error fetching LTC prices:', error.message);
            throw new Error('Failed to fetch Litecoin price.');
        }
    }
}

module.exports = {
    getLTCPrices,
};
