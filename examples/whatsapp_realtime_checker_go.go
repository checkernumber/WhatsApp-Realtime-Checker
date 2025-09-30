package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

type WhatsAppRealtimeChecker struct {
	apiKey     string
	baseURL    string
	httpClient *http.Client
}

type WhatsAppResponse struct {
	Status          string           `json:"status"`
	Message         *WhatsAppMessage `json:"message"`
	PricingStrategy string           `json:"pricingStrategy"`
	TransactionID   string           `json:"transactionId"`
}

type WhatsAppMessage struct {
	Number   string `json:"number"`
	WhatsApp string `json:"whatsapp"`
}

type NumberData struct {
	Number   string `json:"number"`
	Country  string `json:"country"`
	Callback string `json:"callback,omitempty"`
}

type CheckResult struct {
	Input        NumberData        `json:"input"`
	Result       *WhatsAppResponse `json:"result,omitempty"`
	ErrorMessage string            `json:"error,omitempty"`
	Success      bool              `json:"success"`
}

type CheckStatistics struct {
	Total       int `json:"total"`
	Successful  int `json:"successful"`
	Failed      int `json:"failed"`
	WhatsAppYes int `json:"whatsappYes"`
	WhatsAppNo  int `json:"whatsappNo"`
}

func NewWhatsAppRealtimeChecker(apiKey string) *WhatsAppRealtimeChecker {
	return &WhatsAppRealtimeChecker{
		apiKey:  apiKey,
		baseURL: "https://api.checknumber.ai/v1/realtime/whatsapp",
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

func (w *WhatsAppRealtimeChecker) CheckNumber(number, country, callback string) (*WhatsAppResponse, error) {
	data := url.Values{}
	data.Set("number", number)
	data.Set("country", strings.ToUpper(country))
	
	if callback != "" {
		data.Set("callback", callback)
	}

	req, err := http.NewRequest("POST", w.baseURL, strings.NewReader(data.Encode()))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %v", err)
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("X-API-Key", w.apiKey)

	resp, err := w.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %v", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("HTTP error %d: %s", resp.StatusCode, string(body))
	}

	var result WhatsAppResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %v", err)
	}

	return &result, nil
}

func (w *WhatsAppRealtimeChecker) CheckMultipleNumbers(numbersData []NumberData, delayMs int) []CheckResult {
	var results []CheckResult
	
	for i, data := range numbersData {
		fmt.Printf("Checking %d/%d: %s (%s)\n", i+1, len(numbersData), data.Number, data.Country)
		
		result, err := w.CheckNumber(data.Number, data.Country, data.Callback)
		
		checkResult := CheckResult{
			Input: data,
		}
		
		if err != nil {
			checkResult.ErrorMessage = err.Error()
			checkResult.Success = false
			fmt.Printf("Error checking %s: %v\n", data.Number, err)
		} else {
			checkResult.Result = result
			checkResult.Success = true
		}
		
		results = append(results, checkResult)
		
		// Add delay between requests
		if delayMs > 0 && i < len(numbersData)-1 {
			time.Sleep(time.Duration(delayMs) * time.Millisecond)
		}
	}
	
	return results
}

func (w *WhatsAppRealtimeChecker) FormatResult(result *WhatsAppResponse) string {
	if result.Status == "OK" && result.Message != nil {
		number := result.Message.Number
		if number == "" {
			number = "Unknown"
		}
		whatsappStatus := result.Message.WhatsApp
		if whatsappStatus == "" {
			whatsappStatus = "Unknown"
		}
		transactionID := result.TransactionID
		if transactionID == "" {
			transactionID = "N/A"
		}
		
		return fmt.Sprintf("Number: %s, WhatsApp: %s, Transaction ID: %s", 
			number, whatsappStatus, transactionID)
	}
	
	resultJSON, _ := json.Marshal(result)
	return fmt.Sprintf("Status: %s, Error: %s", result.Status, string(resultJSON))
}

func (w *WhatsAppRealtimeChecker) GetStatistics(results []CheckResult) CheckStatistics {
	stats := CheckStatistics{
		Total: len(results),
	}
	
	for _, result := range results {
		if result.Success {
			stats.Successful++
			if result.Result != nil && result.Result.Message != nil {
				switch result.Result.Message.WhatsApp {
				case "yes":
					stats.WhatsAppYes++
				case "no":
					stats.WhatsAppNo++
				}
			}
		} else {
			stats.Failed++
		}
	}
	
	return stats
}

// Helper functions
func ValidateCountryCode(country string) bool {
	supportedCountries := []string{"BR", "MX", "NG", "IN", "ID", "US", "CA", "GB", "DE", "FR"}
	country = strings.ToUpper(country)
	
	for _, supported := range supportedCountries {
		if supported == country {
			return true
		}
	}
	return false
}

func ValidatePhoneNumber(number, country string) bool {
	// Remove non-digits
	cleanNumber := ""
	for _, char := range number {
		if char >= '0' && char <= '9' {
			cleanNumber += string(char)
		}
	}
	
	return len(cleanNumber) >= 8 && len(cleanNumber) <= 15
}

func main() {
	apiKey := os.Getenv("WHATSAPP_RT_API_KEY")
	if apiKey == "" {
		apiKey = "YOUR_API_KEY"
	}

	checker := NewWhatsAppRealtimeChecker(apiKey)

	// Single number check
	fmt.Println("=== Single Number Check ===")
	result, err := checker.CheckNumber("628138800001", "ID", "")
	if err != nil {
		log.Printf("Error: %v", err)
	} else {
		fmt.Println("Result:", checker.FormatResult(result))
		resultJSON, _ := json.MarshalIndent(result, "", "  ")
		fmt.Println("Raw Response:", string(resultJSON))
	}

	fmt.Println("\n=== Multiple Numbers Check ===")
	// Multiple numbers check
	numbersToCheck := []NumberData{
		{Number: "628138800001", Country: "ID"},
		{Number: "5511999999999", Country: "BR"},
		{Number: "5215555555555", Country: "MX"},
		{Number: "919876543210", Country: "IN"},
	}

	results := checker.CheckMultipleNumbers(numbersToCheck, 1000)

	fmt.Println("\n=== Results Summary ===")
	for i, result := range results {
		inputData := result.Input
		if result.Success && result.Result != nil {
			formatted := checker.FormatResult(result.Result)
			fmt.Printf("%d. %s\n", i+1, formatted)
		} else {
			fmt.Printf("%d. Error for %s (%s): %s\n", 
				i+1, inputData.Number, inputData.Country, result.ErrorMessage)
		}
	}

	// Statistics
	stats := checker.GetStatistics(results)
	fmt.Println("\n=== Statistics ===")
	fmt.Printf("Total Checks: %d\n", stats.Total)
	fmt.Printf("Successful: %d\n", stats.Successful)
	fmt.Printf("Failed: %d\n", stats.Failed)
	fmt.Printf("WhatsApp Yes: %d\n", stats.WhatsAppYes)
	fmt.Printf("WhatsApp No: %d\n", stats.WhatsAppNo)
}
