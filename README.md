# WhatsApp Realtime Checker API

[![API Status](https://img.shields.io/badge/API-Live-success)](https://api.checknumber.ai/v1/realtime/whatsapp)
[![Language Support](https://img.shields.io/badge/Languages-9-blue)](#code-examples)
[![License](https://img.shields.io/badge/License-MIT-green)](#legal-compliance)

A comprehensive real-time API service to instantly verify WhatsApp account existence by phone numbers with immediate response.

## Table of Contents
- [Features](#features)
- [Getting Started](#getting-started)
- [API Endpoint](#api-endpoint)
- [Request Parameters](#request-parameters)
- [Response Format](#response-format)
- [Status Codes](#status-codes)
- [Code Examples](#code-examples)
- [Requirements](#requirements)
- [Workflow](#workflow)
- [Pricing](#pricing)
- [Support](#support)
- [Legal Compliance](#legal-compliance)

## Features
✅ Real-time phone number verification  
✅ Instant response (no polling required)  
✅ Global phone number support  
✅ Country-specific processing  
✅ Optional callback URL support  
✅ Multiple programming language examples  
✅ RESTful API architecture  
✅ Transaction ID tracking  
✅ Pay-per-request pricing model  

## Getting Started

### Get API Key
1. Contact API provider to obtain your API key
2. Add the API key to your requests via `X-API-Key` header

### Base URL
```
https://api.checknumber.ai/v1/realtime/whatsapp
```

## API Endpoint

### Real-time WhatsApp Check
Check if a phone number is registered with WhatsApp instantly.

**Endpoint**
```
POST https://api.checknumber.ai/v1/realtime/whatsapp
```

**Headers**
```
Content-Type: application/x-www-form-urlencoded
X-API-Key: YOUR_API_KEY
```

**cURL Example**
```bash
curl --location --request POST 'https://api.checknumber.ai/v1/realtime/whatsapp' \
     --header 'Content-Type: application/x-www-form-urlencoded' \
     --header 'X-API-Key: YOUR_API_KEY' \
     --data-urlencode 'number=628138800001&country=ID'
```

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `number` | string | Yes | Phone number to check (without country code prefix) |
| `country` | string | Yes | Country abbreviation (BR, MX, NG, IN, ID, etc.) |
| `callback` | string | No | Callback URL for webhook notifications (strongly recommended) |

### Supported Countries
- **BR** - Brazil
- **MX** - Mexico  
- **NG** - Nigeria
- **IN** - India
- **ID** - Indonesia
- And many more...

## Response Format

### WhatsApp Account Found
```json
{
  "status": "OK",
  "message": {
    "number": "+628138800001",
    "whatsapp": "yes"
  },
  "pricingStrategy": "PAY",
  "transactionId": "tphxc6te38gpcoyk8hkvwc"
}
```

### WhatsApp Account Not Found
```json
{
  "status": "OK",
  "message": {
    "number": "+628138800001",
    "whatsapp": "no"
  },
  "pricingStrategy": "PAY",
  "transactionId": "tphxc6te38gpcoyk8hkvwc"
}
```

### Response Fields
| Field | Description |
|-------|-------------|
| `status` | Response status code |
| `message.number` | Full phone number with country code |
| `message.whatsapp` | WhatsApp status: `"yes"` or `"no"` |
| `pricingStrategy` | Pricing model applied |
| `transactionId` | Unique transaction identifier |

## Status Codes

| Status | Description | Billing |
|--------|-------------|---------|
| `OK` | Request successful, result available | **Charged** |
| `FAIL` | Invalid query or parameters | **Free** |
| `INVALID_INPUT` | Invalid input format | **Free** |
| `RETRY_LATER` | Server error, please retry | **Free** |

## Code Examples

We provide complete, production-ready examples in 9+ programming languages:

### Python Example
```python
import requests

class WhatsAppRealtimeChecker:
    def __init__(self, api_key):
        self.api_key = api_key
        self.base_url = 'https://api.checknumber.ai/v1/realtime/whatsapp'
        self.headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-API-Key': self.api_key
        }
    
    def check_number(self, number, country, callback=None):
        data = {
            'number': number,
            'country': country
        }
        if callback:
            data['callback'] = callback
            
        response = requests.post(self.base_url, headers=self.headers, data=data)
        return response.json()

# Usage
checker = WhatsAppRealtimeChecker('YOUR_API_KEY')
result = checker.check_number('628138800001', 'ID')
print(f"WhatsApp Status: {result['message']['whatsapp']}")
```

### Node.js Example
```javascript
const axios = require('axios');
const qs = require('querystring');

class WhatsAppRealtimeChecker {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://api.checknumber.ai/v1/realtime/whatsapp';
    }
    
    async checkNumber(number, country, callback = null) {
        const data = {
            number: number,
            country: country
        };
        
        if (callback) {
            data.callback = callback;
        }
        
        const response = await axios.post(this.baseUrl, qs.stringify(data), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-API-Key': this.apiKey
            }
        });
        
        return response.data;
    }
}

// Usage
const checker = new WhatsAppRealtimeChecker('YOUR_API_KEY');
checker.checkNumber('628138800001', 'ID').then(result => {
    console.log(`WhatsApp Status: ${result.message.whatsapp}`);
});
```

### Available Languages
- **C#** - Full async/await implementation
- **Go** - Concurrent processing ready
- **Java** - Modern HTTP client usage
- **JavaScript** - Browser compatible
- **Node.js** - Server-side JavaScript
- **PHP** - cURL-based implementation
- **Python** - Requests library with typing
- **Shell** - Bash script with error handling

📁 **[View all examples →](examples/)**

### Complete File List
- `whatsapp_realtime_checker_python.py` - Python implementation
- `whatsapp_realtime_checker_nodejs.js` - Node.js implementation  
- `whatsapp_realtime_checker_go.go` - Go implementation
- `whatsapp_realtime_checker_java.java` - Java implementation
- `whatsapp_realtime_checker_csharp.cs` - C# implementation
- `whatsapp_realtime_checker_javascript.js` - Browser JavaScript
- `whatsapp_realtime_checker_php.php` - PHP implementation
- `whatsapp_realtime_checker_shell.sh` - Shell script

## Requirements

### Input Requirements
- **Phone Number**: Without country code prefix (e.g., `628138800001`)
- **Country Code**: ISO 3166-1 alpha-2 format (e.g., `ID`, `US`, `BR`)
- **Encoding**: UTF-8

### API Limits
- **Authentication**: API key required
- **Rate Limits**: Contact provider for details
- **Response Time**: < 5 seconds typically
- **Real-time Processing**: Immediate response

### Supported Number Formats
- National format without country code: `628138800001`
- Numbers should be valid for the specified country

## Workflow

1. **📞 Single Request** - Send phone number and country code
2. **⚡ Instant Processing** - Real-time verification
3. **📊 Immediate Response** - Get WhatsApp status instantly
4. **💰 Per-Request Billing** - Pay only for successful checks
5. **📝 Transaction Tracking** - Each request gets unique transaction ID

**Typical Response Time**: < 5 seconds

## Pricing

Contact the API provider for current pricing information.

- **Pay-per-request** model
- **Only charged for successful results** (`OK` status)
- **Free for errors** (`FAIL`, `INVALID_INPUT`, `RETRY_LATER`)
- Volume discounts available

## Support

For technical support, enterprise inquiries, or API access:

📧 **Contact**: API Provider Support  
🔗 **Documentation**: This repository  
💬 **Issues**: Create GitHub issue for bugs  
🚀 **Enterprise**: Contact for custom solutions  

### Common Issues
- **API Key Invalid**: Verify your API key is correct
- **Invalid Input**: Check number format and country code
- **Retry Later**: Server temporarily unavailable, try again
- **Country Not Supported**: Contact support for additional countries

## Legal Compliance

This API is intended for **legitimate use cases only**. Users are responsible for:

✅ **Compliance**: Following WhatsApp's Terms of Service  
✅ **Privacy**: Adhering to data privacy laws (GDPR, CCPA, etc.)  
✅ **Consent**: Obtaining proper consent for data processing  
✅ **Purpose**: Using data for legitimate business purposes only  

### Disclaimer
- This service is **not affiliated** with or endorsed by Meta/WhatsApp
- Users must comply with all applicable laws and regulations
- Service is provided "as is" without warranties
- Rate limiting and fair use policies apply

### Ethical Use
- ✅ Account verification for customer service
- ✅ Fraud prevention and security
- ✅ Marketing compliance verification
- ❌ Harassment or stalking
- ❌ Unauthorized contact collection
- ❌ Privacy violations

---

**Last Updated**: October 2024  
**Version**: 1.0.0  
**API Status**: ✅ Active
