// Browser-compatible JavaScript for WhatsApp Realtime checking

class WhatsAppRealtimeChecker {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://api.checknumber.ai/v1/realtime/whatsapp';
    }

    // Check single phone number
    async checkNumber(number, country, callback = null) {
        const data = new URLSearchParams();
        data.append('number', number);
        data.append('country', country.toUpperCase());
        
        if (callback) {
            data.append('callback', callback);
        }

        try {
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-API-Key': this.apiKey
                },
                body: data.toString()
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error checking number:', error);
            throw error;
        }
    }

    // Check multiple numbers with delay
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
                
                // Add delay between requests
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

// HTML UI Creation
function createUI() {
    const htmlTemplate = `
    <div style="padding: 20px; font-family: Arial, sans-serif; max-width: 800px;">
        <h2>WhatsApp Realtime Checker</h2>
        
        <div style="margin-bottom: 20px;">
            <label for="api-key">API Key:</label><br>
            <input type="text" id="api-key" placeholder="YOUR_API_KEY" style="width: 300px; padding: 5px;">
        </div>
        
        <div style="margin-bottom: 20px;">
            <h3>Single Number Check</h3>
            <label for="single-number">Phone Number:</label><br>
            <input type="text" id="single-number" placeholder="628138800001" style="width: 200px; padding: 5px;">
            
            <label for="single-country" style="margin-left: 10px;">Country:</label><br>
            <select id="single-country" style="padding: 5px;">
                <option value="ID">Indonesia (ID)</option>
                <option value="BR">Brazil (BR)</option>
                <option value="MX">Mexico (MX)</option>
                <option value="IN">India (IN)</option>
                <option value="NG">Nigeria (NG)</option>
                <option value="US">United States (US)</option>
                <option value="GB">United Kingdom (GB)</option>
            </select>
            
            <br><br>
            <button onclick="checkSingleNumber()">Check WhatsApp</button>
        </div>
        
        <div style="margin-bottom: 20px;">
            <h3>Bulk Check</h3>
            <label for="bulk-numbers">Phone Numbers (one per line with country code):</label><br>
            <textarea id="bulk-numbers" rows="8" cols="50" placeholder="628138800001,ID
5511999999999,BR
5215555555555,MX
919876543210,IN"></textarea>
            
            <br><br>
            <label for="delay-input">Delay between requests (ms):</label>
            <input type="number" id="delay-input" value="1000" style="width: 80px; padding: 5px;">
            
            <br><br>
            <button onclick="checkBulkNumbers()">Check Multiple Numbers</button>
        </div>
        
        <div id="status" style="margin-top: 20px; padding: 10px; background-color: #f0f0f0; border-radius: 5px;">
            Ready to check WhatsApp numbers...
        </div>
        
        <div id="results" style="margin-top: 20px; padding: 10px; background-color: #f9f9f9; border-radius: 5px; display: none;">
            <h3>Results</h3>
            <div id="results-content"></div>
        </div>
        
        <div style="margin-top: 20px; font-size: 12px; color: #666;">
            <p><strong>Supported Countries:</strong></p>
            <ul>
                <li><strong>ID</strong> - Indonesia</li>
                <li><strong>BR</strong> - Brazil</li>
                <li><strong>MX</strong> - Mexico</li>
                <li><strong>IN</strong> - India</li>
                <li><strong>NG</strong> - Nigeria</li>
                <li><strong>US</strong> - United States</li>
                <li><strong>GB</strong> - United Kingdom</li>
            </ul>
            <p><strong>Response Values:</strong></p>
            <ul>
                <li><strong>yes</strong> - WhatsApp account found</li>
                <li><strong>no</strong> - No WhatsApp account</li>
            </ul>
        </div>
    </div>
    `;
    
    document.body.innerHTML = htmlTemplate;
}

// Check single number
async function checkSingleNumber() {
    const apiKey = document.getElementById('api-key').value;
    const number = document.getElementById('single-number').value;
    const country = document.getElementById('single-country').value;
    const statusDiv = document.getElementById('status');
    const resultsDiv = document.getElementById('results');
    const resultsContent = document.getElementById('results-content');
    
    if (!apiKey) {
        statusDiv.innerHTML = '<span style="color: red;">Please enter your API key</span>';
        return;
    }
    
    if (!number) {
        statusDiv.innerHTML = '<span style="color: red;">Please enter a phone number</span>';
        return;
    }
    
    const checker = new WhatsAppRealtimeChecker(apiKey);
    
    try {
        statusDiv.innerHTML = 'Checking number...';
        resultsDiv.style.display = 'none';
        
        const result = await checker.checkNumber(number, country);
        
        statusDiv.innerHTML = '<span style="color: green;">Check completed!</span>';
        
        resultsContent.innerHTML = `
            <h4>Single Check Result:</h4>
            <p><strong>Input:</strong> ${number} (${country})</p>
            <p><strong>Result:</strong> ${checker.formatResult(result)}</p>
            <details>
                <summary>Raw Response</summary>
                <pre style="background: #f0f0f0; padding: 10px; border-radius: 3px; font-size: 12px; overflow-x: auto;">${JSON.stringify(result, null, 2)}</pre>
            </details>
        `;
        
        resultsDiv.style.display = 'block';
        
    } catch (error) {
        statusDiv.innerHTML = `<span style="color: red;">Error: ${error.message}</span>`;
    }
}

// Check bulk numbers
async function checkBulkNumbers() {
    const apiKey = document.getElementById('api-key').value;
    const bulkText = document.getElementById('bulk-numbers').value;
    const delay = parseInt(document.getElementById('delay-input').value) || 1000;
    const statusDiv = document.getElementById('status');
    const resultsDiv = document.getElementById('results');
    const resultsContent = document.getElementById('results-content');
    
    if (!apiKey) {
        statusDiv.innerHTML = '<span style="color: red;">Please enter your API key</span>';
        return;
    }
    
    if (!bulkText.trim()) {
        statusDiv.innerHTML = '<span style="color: red;">Please enter phone numbers</span>';
        return;
    }
    
    // Parse bulk numbers
    const lines = bulkText.trim().split('\n');
    const numbersData = [];
    
    for (const line of lines) {
        const parts = line.split(',');
        if (parts.length >= 2) {
            numbersData.push({
                number: parts[0].trim(),
                country: parts[1].trim()
            });
        }
    }
    
    if (numbersData.length === 0) {
        statusDiv.innerHTML = '<span style="color: red;">No valid number,country pairs found</span>';
        return;
    }
    
    const checker = new WhatsAppRealtimeChecker(apiKey);
    
    try {
        statusDiv.innerHTML = `Checking ${numbersData.length} numbers...`;
        resultsDiv.style.display = 'none';
        
        const results = await checker.checkMultipleNumbers(numbersData, delay);
        const stats = checker.getStatistics(results);
        
        statusDiv.innerHTML = '<span style="color: green;">Bulk check completed!</span>';
        
        let resultsHtml = `
            <h4>Bulk Check Results:</h4>
            <div style="margin-bottom: 15px;">
                <strong>Statistics:</strong>
                Total: ${stats.total}, 
                Successful: ${stats.successful}, 
                Failed: ${stats.failed}, 
                WhatsApp Yes: ${stats.whatsappYes}, 
                WhatsApp No: ${stats.whatsappNo}
            </div>
            <div style="max-height: 400px; overflow-y: auto;">
        `;
        
        results.forEach((result, i) => {
            const inputData = result.input;
            if (result.success) {
                const formatted = checker.formatResult(result.result);
                resultsHtml += `<p>${i + 1}. ${formatted}</p>`;
            } else {
                resultsHtml += `<p style="color: red;">${i + 1}. Error for ${inputData.number} (${inputData.country}): ${result.result.error}</p>`;
            }
        });
        
        resultsHtml += '</div>';
        resultsContent.innerHTML = resultsHtml;
        
        resultsDiv.style.display = 'block';
        
    } catch (error) {
        statusDiv.innerHTML = `<span style="color: red;">Error: ${error.message}</span>`;
    }
}

// Helper functions
function validateCountryCode(country) {
    const supportedCountries = ['BR', 'MX', 'NG', 'IN', 'ID', 'US', 'CA', 'GB', 'DE', 'FR'];
    return supportedCountries.includes(country.toUpperCase());
}

function validatePhoneNumber(number, country) {
    const cleanNumber = number.replace(/\D/g, '');
    return cleanNumber.length >= 8 && cleanNumber.length <= 15;
}

// Initialize UI when DOM is loaded
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', createUI);
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        WhatsAppRealtimeChecker, 
        validateCountryCode, 
        validatePhoneNumber 
    };
}
