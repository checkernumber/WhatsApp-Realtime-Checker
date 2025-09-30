#!/usr/bin/env python3

import requests
import json
import os
import time
from typing import Dict, List, Optional, Union

class WhatsAppRealtimeChecker:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = 'https://api.checknumber.ai/v1/realtime/whatsapp'
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-API-Key': self.api_key
        })
        self.session.timeout = 30
    
    def check_number(self, number: str, country: str, callback: Optional[str] = None) -> Dict:
        """Check if a phone number is registered with WhatsApp"""
        data = {
            'number': number,
            'country': country.upper()
        }
        
        if callback:
            data['callback'] = callback
        
        try:
            response = self.session.post(self.base_url, data=data)
            response.raise_for_status()
            return response.json()
        
        except requests.exceptions.RequestException as e:
            raise Exception(f"Request failed: {e}")
        except json.JSONDecodeError as e:
            raise Exception(f"JSON decode error: {e}")
    
    def check_multiple_numbers(self, numbers_data: List[Dict[str, str]], delay: float = 1.0) -> List[Dict]:
        """Check multiple phone numbers with optional delay between requests"""
        results = []
        
        for i, data in enumerate(numbers_data):
            try:
                number = data['number']
                country = data['country']
                callback = data.get('callback')
                
                print(f"Checking {i+1}/{len(numbers_data)}: {number} ({country})")
                
                result = self.check_number(number, country, callback)
                results.append({
                    'input': data,
                    'result': result,
                    'success': True
                })
                
                # Add delay between requests to avoid rate limiting
                if delay > 0 and i < len(numbers_data) - 1:
                    time.sleep(delay)
                    
            except Exception as e:
                results.append({
                    'input': data,
                    'result': {'error': str(e)},
                    'success': False
                })
                print(f"Error checking {data.get('number', 'unknown')}: {e}")
        
        return results
    
    def format_result(self, result: Dict) -> str:
        """Format result for display"""
        if result.get('status') == 'OK':
            message = result.get('message', {})
            number = message.get('number', 'Unknown')
            whatsapp_status = message.get('whatsapp', 'Unknown')
            transaction_id = result.get('transactionId', 'N/A')
            
            return f"Number: {number}, WhatsApp: {whatsapp_status}, Transaction ID: {transaction_id}"
        else:
            return f"Status: {result.get('status', 'Unknown')}, Error: {result}"
    
    def close(self):
        """Close the session"""
        self.session.close()

def main():
    """Main function demonstrating usage"""
    api_key = os.environ.get('WHATSAPP_RT_API_KEY', 'YOUR_API_KEY')
    checker = WhatsAppRealtimeChecker(api_key)
    
    try:
        # Single number check
        print("=== Single Number Check ===")
        result = checker.check_number('628138800001', 'ID')
        print("Result:", checker.format_result(result))
        print("Raw Response:", json.dumps(result, indent=2))
        
        print("\n=== Multiple Numbers Check ===")
        # Multiple numbers check
        numbers_to_check = [
            {'number': '628138800001', 'country': 'ID'},
            {'number': '5511999999999', 'country': 'BR'},
            {'number': '5215555555555', 'country': 'MX'},
            {'number': '919876543210', 'country': 'IN'},
        ]
        
        results = checker.check_multiple_numbers(numbers_to_check, delay=1.0)
        
        print("\n=== Results Summary ===")
        for i, result in enumerate(results, 1):
            input_data = result['input']
            if result['success']:
                formatted = checker.format_result(result['result'])
                print(f"{i}. {formatted}")
            else:
                print(f"{i}. Error for {input_data['number']} ({input_data['country']}): {result['result']['error']}")
        
        # Statistics
        successful_checks = sum(1 for r in results if r['success'])
        whatsapp_yes = sum(1 for r in results if r['success'] and r['result']['message']['whatsapp'] == 'yes')
        whatsapp_no = sum(1 for r in results if r['success'] and r['result']['message']['whatsapp'] == 'no')
        
        print(f"\n=== Statistics ===")
        print(f"Total Checks: {len(results)}")
        print(f"Successful: {successful_checks}")
        print(f"Failed: {len(results) - successful_checks}")
        print(f"WhatsApp Yes: {whatsapp_yes}")
        print(f"WhatsApp No: {whatsapp_no}")
        
    except Exception as e:
        print(f"Error: {e}")
        exit(1)
    
    finally:
        checker.close()

if __name__ == '__main__':
    main()
