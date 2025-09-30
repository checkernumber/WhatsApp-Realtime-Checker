#!/bin/bash

# WhatsApp Realtime Checker Shell Script
# Requires: curl, jq

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Configuration
API_KEY="${WHATSAPP_RT_API_KEY:-YOUR_API_KEY}"
BASE_URL="https://api.checknumber.ai/v1/realtime/whatsapp"
TIMEOUT=30

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

log_result() {
    echo -e "${CYAN}[RESULT]${NC} $1"
}

# Check dependencies
check_dependencies() {
    local missing_deps=()
    
    if ! command -v curl &> /dev/null; then
        missing_deps+=("curl")
    fi
    
    if ! command -v jq &> /dev/null; then
        missing_deps+=("jq")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        log_error "Missing required dependencies: ${missing_deps[*]}"
        log_error "Please install them and try again."
        exit 1
    fi
}

# Validate API key
validate_api_key() {
    if [ "$API_KEY" = "YOUR_API_KEY" ] || [ -z "$API_KEY" ]; then
        log_error "Please set a valid API key in WHATSAPP_RT_API_KEY environment variable"
        exit 1
    fi
}

# Validate country code
validate_country_code() {
    local country="$1"
    local supported_countries=("BR" "MX" "NG" "IN" "ID" "US" "CA" "GB" "DE" "FR")
    
    country=$(echo "$country" | tr '[:lower:]' '[:upper:]')
    
    for supported in "${supported_countries[@]}"; do
        if [ "$country" = "$supported" ]; then
            return 0
        fi
    done
    
    return 1
}

# Validate phone number
validate_phone_number() {
    local number="$1"
    # Remove non-digits
    local clean_number="${number//[^0-9]/}"
    local length=${#clean_number}
    
    if [ "$length" -ge 8 ] && [ "$length" -le 15 ]; then
        return 0
    else
        return 1
    fi
}

# Check single number
check_number() {
    local number="$1"
    local country="$2"
    local callback="${3:-}"
    
    # Validate inputs
    if ! validate_phone_number "$number"; then
        log_error "Invalid phone number format: $number"
        return 1
    fi
    
    if ! validate_country_code "$country"; then
        log_error "Unsupported country code: $country"
        return 1
    fi
    
    local data="number=${number}&country=${country^^}"
    if [ -n "$callback" ]; then
        data="${data}&callback=${callback}"
    fi
    
    log_info "Checking number: $number ($country)"
    
    local response
    response=$(curl -s --max-time "$TIMEOUT" \
        --location "$BASE_URL" \
        --header "Content-Type: application/x-www-form-urlencoded" \
        --header "X-API-Key: $API_KEY" \
        --data "$data" \
        --write-out "\nHTTP_STATUS:%{http_code}")
    
    local http_status
    http_status=$(echo "$response" | tail -n1 | cut -d: -f2)
    local json_response
    json_response=$(echo "$response" | sed '$d')
    
    if [ "$http_status" -ne 200 ]; then
        log_error "HTTP error: $http_status"
        echo "$json_response" | jq -r '.' 2>/dev/null || echo "$json_response"
        return 1
    fi
    
    echo "$json_response"
}

# Format result for display
format_result() {
    local result="$1"
    
    local status
    status=$(echo "$result" | jq -r '.status // "Unknown"')
    
    if [ "$status" = "OK" ]; then
        local number
        number=$(echo "$result" | jq -r '.message.number // "Unknown"')
        local whatsapp_status
        whatsapp_status=$(echo "$result" | jq -r '.message.whatsapp // "Unknown"')
        local transaction_id
        transaction_id=$(echo "$result" | jq -r '.transactionId // "N/A"')
        
        echo "Number: $number, WhatsApp: $whatsapp_status, Transaction ID: $transaction_id"
    else
        echo "Status: $status, Error: $result"
    fi
}

# Check multiple numbers from file
check_multiple_from_file() {
    local file_path="$1"
    local delay="${2:-1}"
    
    if [ ! -f "$file_path" ]; then
        log_error "File not found: $file_path"
        return 1
    fi
    
    local total_lines
    total_lines=$(wc -l < "$file_path")
    local success_count=0
    local error_count=0
    local whatsapp_yes=0
    local whatsapp_no=0
    local line_num=0
    
    log_info "Processing $total_lines lines from: $file_path"
    
    while IFS=',' read -r number country callback || [ -n "$number" ]; do
        ((line_num++))
        
        # Skip empty lines or lines starting with #
        if [[ -z "$number" || "$number" =~ ^[[:space:]]*# ]]; then
            continue
        fi
        
        # Trim whitespace
        number=$(echo "$number" | tr -d '[:space:]')
        country=$(echo "$country" | tr -d '[:space:]')
        callback=$(echo "$callback" | tr -d '[:space:]')
        
        echo
        log_info "Processing line $line_num/$total_lines"
        
        if check_result=$(check_number "$number" "$country" "$callback"); then
            formatted=$(format_result "$check_result")
            log_result "$formatted"
            
            ((success_count++))
            
            # Count WhatsApp status
            whatsapp_status=$(echo "$check_result" | jq -r '.message.whatsapp // "unknown"')
            case "$whatsapp_status" in
                "yes") ((whatsapp_yes++)) ;;
                "no") ((whatsapp_no++)) ;;
            esac
        else
            ((error_count++))
        fi
        
        # Add delay between requests
        if [ "$delay" -gt 0 ] && [ $line_num -lt $total_lines ]; then
            sleep "$delay"
        fi
        
    done < "$file_path"
    
    # Display statistics
    echo
    log_success "Processing completed!"
    echo "=== Statistics ==="
    echo "Total Lines: $total_lines"
    echo "Successful: $success_count"
    echo "Failed: $error_count"
    echo "WhatsApp Yes: $whatsapp_yes"
    echo "WhatsApp No: $whatsapp_no"
}

# Interactive mode
interactive_mode() {
    echo "WhatsApp Realtime Checker - Interactive Mode"
    echo "==========================================="
    echo
    
    while true; do
        echo "1. Check single number"
        echo "2. Check multiple numbers from file"
        echo "3. Exit"
        
        read -p "Choose an option (1-3): " choice
        
        case "$choice" in
            1)
                echo
                read -p "Enter phone number: " number
                read -p "Enter country code (e.g., ID, BR, MX): " country
                read -p "Enter callback URL (optional): " callback
                
                if check_result=$(check_number "$number" "$country" "$callback"); then
                    echo
                    formatted=$(format_result "$check_result")
                    log_result "$formatted"
                    echo
                    echo "Raw Response:"
                    echo "$check_result" | jq '.'
                fi
                ;;
                
            2)
                echo
                read -p "Enter path to CSV file (number,country,callback): " file_path
                read -p "Enter delay between requests (seconds) [1]: " delay
                delay=${delay:-1}
                
                echo
                check_multiple_from_file "$file_path" "$delay"
                ;;
                
            3)
                log_success "Goodbye!"
                exit 0
                ;;
                
            *)
                log_error "Invalid choice. Please enter 1, 2, or 3."
                ;;
        esac
        
        echo
        read -p "Press Enter to continue..."
        echo
    done
}

# Create sample CSV file
create_sample_file() {
    local sample_file="sample_numbers.csv"
    
    cat > "$sample_file" << EOF
# WhatsApp Realtime Checker - Sample Numbers
# Format: number,country,callback
# Lines starting with # are ignored
628138800001,ID,
5511999999999,BR,
5215555555555,MX,
919876543210,IN,
EOF
    
    log_success "Created sample file: $sample_file"
    echo "Edit this file with your phone numbers and run:"
    echo "$0 -f $sample_file"
}

# Usage function
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -n, --number NUMBER     Phone number to check"
    echo "  -c, --country COUNTRY   Country code (BR, MX, NG, IN, ID, etc.)"
    echo "  -b, --callback URL      Optional callback URL"
    echo "  -f, --file FILE         Check numbers from CSV file"
    echo "  -d, --delay SECONDS     Delay between requests (default: 1)"
    echo "  -k, --api-key KEY       Set API key (or use WHATSAPP_RT_API_KEY env var)"
    echo "  -i, --interactive       Run in interactive mode"
    echo "  -s, --sample           Create sample CSV file"
    echo "  -h, --help             Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  WHATSAPP_RT_API_KEY    Your API key for the WhatsApp realtime service"
    echo ""
    echo "Examples:"
    echo "  $0 -n 628138800001 -c ID                    # Check single number"
    echo "  $0 -f numbers.csv -d 2                      # Check from file with 2s delay"
    echo "  $0 -i                                       # Interactive mode"
    echo "  $0 -s                                       # Create sample file"
    echo "  WHATSAPP_RT_API_KEY=your_key $0 -n 628138800001 -c ID"
    echo ""
    echo "CSV File Format:"
    echo "  number,country,callback"
    echo "  628138800001,ID,"
    echo "  5511999999999,BR,https://example.com/callback"
    echo ""
    echo "Supported Countries:"
    echo "  BR (Brazil), MX (Mexico), NG (Nigeria), IN (India), ID (Indonesia),"
    echo "  US (United States), CA (Canada), GB (United Kingdom), DE (Germany), FR (France)"
}

# Main function for single check
main_single_check() {
    local number="$1"
    local country="$2"
    local callback="${3:-}"
    
    log_info "WhatsApp Realtime Checker - Single Check"
    
    check_dependencies
    validate_api_key
    
    if check_result=$(check_number "$number" "$country" "$callback"); then
        echo
        formatted=$(format_result "$check_result")
        log_result "$formatted"
        echo
        log_info "Raw Response:"
        echo "$check_result" | jq '.'
        log_success "Check completed successfully!"
    else
        exit 1
    fi
}

# Main function for file check
main_file_check() {
    local file_path="$1"
    local delay="${2:-1}"
    
    log_info "WhatsApp Realtime Checker - File Processing"
    
    check_dependencies
    validate_api_key
    
    check_multiple_from_file "$file_path" "$delay"
}

# Parse command line arguments
parse_args() {
    local number=""
    local country=""
    local callback=""
    local file_path=""
    local delay="1"
    local interactive=false
    local create_sample=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            -n|--number)
                number="$2"
                shift 2
                ;;
            -c|--country)
                country="$2"
                shift 2
                ;;
            -b|--callback)
                callback="$2"
                shift 2
                ;;
            -f|--file)
                file_path="$2"
                shift 2
                ;;
            -d|--delay)
                delay="$2"
                shift 2
                ;;
            -k|--api-key)
                API_KEY="$2"
                shift 2
                ;;
            -i|--interactive)
                interactive=true
                shift
                ;;
            -s|--sample)
                create_sample=true
                shift
                ;;
            -h|--help)
                usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                usage
                exit 1
                ;;
        esac
    done
    
    # Determine action
    if [ "$create_sample" = true ]; then
        create_sample_file
    elif [ "$interactive" = true ]; then
        check_dependencies
        validate_api_key
        interactive_mode
    elif [ -n "$file_path" ]; then
        main_file_check "$file_path" "$delay"
    elif [ -n "$number" ] && [ -n "$country" ]; then
        main_single_check "$number" "$country" "$callback"
    else
        log_error "Missing required parameters"
        echo
        usage
        exit 1
    fi
}

# Script entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    if [ $# -eq 0 ]; then
        usage
        exit 1
    else
        parse_args "$@"
    fi
fi
