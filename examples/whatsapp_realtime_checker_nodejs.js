const axios = require('axios');
const qs = require('querystring');

class WhatsAppRealtimeChecker {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://api.checknumber.ai/v1/realtime/whatsapp';
        
        // Create axios instance with default headers
        this.client = axios.create({
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-API-Key': this.apiKey
            },
            timeout: 30000
        });
    }

    // Check single phone number
    async checkNumber(number, country, callback = null) {
        try {
            const data = {
                number: number,
                country: country.toUpperCase()
            };
            
            if (callback) {
                data.callback = callback;
            }
            
            const response = await this.client.post(this.baseUrl, qs.stringify(data));
            return response.data;
            
        } catch (error) {
            if (error.response) {
                throw new Error(`HTTP error! status: ${error.response.status}, message: ${JSON.stringify(error.response.data)}`);
            }
            throw error;
        }
    }

    // Check multiple phone numbers with delay
    async checkMultipleNumbers(numbersData, delay = 1000) {
        const results = [];
        
        for (let i = 0; i < numbersData.length; i++) {
            const data = numbersData[i];
            
            try {
                console.log(`Checking ${i + 1}/${numbersData.length}: ${data.number} (${data.country})`);
                
                const result = await this.checkNumber(data.number, data.country, data.callback);
                results.push({
                    input: data,
                    result: result,
                    success: true
                });
                
                // Add delay between requests to avoid rate limiting
                if (delay > 0 && i < numbersData.length - 1) {
                    await this.sleep(delay);
                }
                
            } catch (error) {
                results.push({
                    input: data,
                    result: { error: error.message },
                    success: false
                });
                console.error(`Error checking ${data.number}: ${error.message}`);
            }
        }
        
        return results;
    }

    // Format result for display
    formatResult(result) {
        if (result.status === 'OK') {
            const message = result.message || {};
            const number = message.number || 'Unknown';
            const whatsappStatus = message.whatsapp || 'Unknown';
            const transactionId = result.transactionId || 'N/A';
            
            return `Number: ${number}, WhatsApp: ${whatsappStatus}, Transaction ID: ${transactionId}`;
        } else {
            return `Status: ${result.status || 'Unknown'}, Error: ${JSON.stringify(result)}`;
        }
    }

    // Helper function to sleep
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Get statistics from results
    getStatistics(results) {
        const successful = results.filter(r => r.success).length;
        const failed = results.length - successful;
        const whatsappYes = results.filter(r => 
            r.success && r.result.message && r.result.message.whatsapp === 'yes'
        ).length;
        const whatsappNo = results.filter(r => 
            r.success && r.result.message && r.result.message.whatsapp === 'no'
        ).length;

        return {
            total: results.length,
            successful,
            failed,
            whatsappYes,
            whatsappNo
        };
    }
}

// Usage Example
async function main() {
    const apiKey = process.env.WHATSAPP_RT_API_KEY || 'YOUR_API_KEY';
    const checker = new WhatsAppRealtimeChecker(apiKey);

    try {
        // Single number check
        console.log('=== Single Number Check ===');
        const result = await checker.checkNumber('628138800001', 'ID');
        console.log('Result:', checker.formatResult(result));
        console.log('Raw Response:', JSON.stringify(result, null, 2));

        console.log('\n=== Multiple Numbers Check ===');
        // Multiple numbers check
        const numbersToCheck = [
            { number: '628138800001', country: 'ID' },
            { number: '5511999999999', country: 'BR' },
            { number: '5215555555555', country: 'MX' },
            { number: '919876543210', country: 'IN' },
        ];

        const results = await checker.checkMultipleNumbers(numbersToCheck, 1000);

        console.log('\n=== Results Summary ===');
        results.forEach((result, i) => {
            const inputData = result.input;
            if (result.success) {
                const formatted = checker.formatResult(result.result);
                console.log(`${i + 1}. ${formatted}`);
            } else {
                console.log(`${i + 1}. Error for ${inputData.number} (${inputData.country}): ${result.result.error}`);
            }
        });

        // Statistics
        const stats = checker.getStatistics(results);
        console.log('\n=== Statistics ===');
        console.log(`Total Checks: ${stats.total}`);
        console.log(`Successful: ${stats.successful}`);
        console.log(`Failed: ${stats.failed}`);
        console.log(`WhatsApp Yes: ${stats.whatsappYes}`);
        console.log(`WhatsApp No: ${stats.whatsappNo}`);

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

// Country code validation helper
function validateCountryCode(country) {
    const supportedCountries = ['BR', 'MX', 'NG', 'IN', 'ID', 'US', 'CA', 'GB', 'DE', 'FR'];
    return supportedCountries.includes(country.toUpperCase());
}

// Number validation helper
function validatePhoneNumber(number, country) {
    // Basic validation - should be digits only and reasonable length
    const cleanNumber = number.replace(/\D/g, '');
    
    if (cleanNumber.length < 8 || cleanNumber.length > 15) {
        return false;
    }
    
    // Country-specific validation could be added here
    return true;
}

// Export classes and functions
module.exports = {
    WhatsAppRealtimeChecker,
    validateCountryCode,
    validatePhoneNumber
};

// Run if called directly
if (require.main === module) {
    main();
}
