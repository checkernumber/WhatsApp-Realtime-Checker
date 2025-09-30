using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading.Tasks;
using System.Text;
using System.Text.Json;
using System.Threading;

public class WhatsAppRealtimeChecker
{
    private readonly string apiKey;
    private readonly string baseUrl;
    private readonly HttpClient httpClient;

    public WhatsAppRealtimeChecker(string apiKey)
    {
        this.apiKey = apiKey;
        this.baseUrl = "https://api.checknumber.ai/v1/realtime/whatsapp";
        this.httpClient = new HttpClient();
        this.httpClient.DefaultRequestHeaders.Add("X-API-Key", apiKey);
        this.httpClient.Timeout = TimeSpan.FromSeconds(30);
    }

    public async Task<WhatsAppResponse> CheckNumberAsync(string number, string country, string callback = null)
    {
        var parameters = new List<KeyValuePair<string, string>>
        {
            new KeyValuePair<string, string>("number", number),
            new KeyValuePair<string, string>("country", country.ToUpper())
        };

        if (!string.IsNullOrEmpty(callback))
        {
            parameters.Add(new KeyValuePair<string, string>("callback", callback));
        }

        var formContent = new FormUrlEncodedContent(parameters);

        try
        {
            var response = await httpClient.PostAsync(baseUrl, formContent);
            response.EnsureSuccessStatusCode();
            
            var json = await response.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<WhatsAppResponse>(json, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });
        }
        catch (HttpRequestException ex)
        {
            throw new Exception($"Request failed: {ex.Message}");
        }
        catch (JsonException ex)
        {
            throw new Exception($"JSON parsing error: {ex.Message}");
        }
    }

    public async Task<List<CheckResult>> CheckMultipleNumbersAsync(
        List<NumberData> numbersData, 
        int delayMilliseconds = 1000)
    {
        var results = new List<CheckResult>();
        
        for (int i = 0; i < numbersData.Count; i++)
        {
            var data = numbersData[i];
            
            try
            {
                Console.WriteLine($"Checking {i + 1}/{numbersData.Count}: {data.Number} ({data.Country})");
                
                var result = await CheckNumberAsync(data.Number, data.Country, data.Callback);
                results.Add(new CheckResult
                {
                    Input = data,
                    Result = result,
                    Success = true
                });
                
                // Add delay between requests
                if (delayMilliseconds > 0 && i < numbersData.Count - 1)
                {
                    await Task.Delay(delayMilliseconds);
                }
            }
            catch (Exception ex)
            {
                results.Add(new CheckResult
                {
                    Input = data,
                    ErrorMessage = ex.Message,
                    Success = false
                });
                Console.WriteLine($"Error checking {data.Number}: {ex.Message}");
            }
        }
        
        return results;
    }

    public string FormatResult(WhatsAppResponse result)
    {
        if (result.Status == "OK" && result.Message != null)
        {
            var number = result.Message.Number ?? "Unknown";
            var whatsappStatus = result.Message.WhatsApp ?? "Unknown";
            var transactionId = result.TransactionId ?? "N/A";
            
            return $"Number: {number}, WhatsApp: {whatsappStatus}, Transaction ID: {transactionId}";
        }
        else
        {
            return $"Status: {result.Status ?? "Unknown"}, Error: {JsonSerializer.Serialize(result)}";
        }
    }

    public CheckStatistics GetStatistics(List<CheckResult> results)
    {
        var successful = 0;
        var whatsappYes = 0;
        var whatsappNo = 0;

        foreach (var result in results)
        {
            if (result.Success)
            {
                successful++;
                if (result.Result?.Message?.WhatsApp == "yes")
                    whatsappYes++;
                else if (result.Result?.Message?.WhatsApp == "no")
                    whatsappNo++;
            }
        }

        return new CheckStatistics
        {
            Total = results.Count,
            Successful = successful,
            Failed = results.Count - successful,
            WhatsAppYes = whatsappYes,
            WhatsAppNo = whatsappNo
        };
    }

    public void Dispose()
    {
        httpClient?.Dispose();
    }
}

// Data classes
public class WhatsAppResponse
{
    public string Status { get; set; } = string.Empty;
    public WhatsAppMessage? Message { get; set; }
    public string PricingStrategy { get; set; } = string.Empty;
    public string TransactionId { get; set; } = string.Empty;
}

public class WhatsAppMessage
{
    public string Number { get; set; } = string.Empty;
    public string WhatsApp { get; set; } = string.Empty;
}

public class NumberData
{
    public string Number { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    public string? Callback { get; set; }
}

public class CheckResult
{
    public NumberData Input { get; set; } = new NumberData();
    public WhatsAppResponse? Result { get; set; }
    public string? ErrorMessage { get; set; }
    public bool Success { get; set; }
}

public class CheckStatistics
{
    public int Total { get; set; }
    public int Successful { get; set; }
    public int Failed { get; set; }
    public int WhatsAppYes { get; set; }
    public int WhatsAppNo { get; set; }
}

// Helper methods
public static class WhatsAppHelper
{
    private static readonly string[] SupportedCountries = 
    {
        "BR", "MX", "NG", "IN", "ID", "US", "CA", "GB", "DE", "FR"
    };

    public static bool ValidateCountryCode(string country)
    {
        return Array.Exists(SupportedCountries, c => 
            c.Equals(country, StringComparison.OrdinalIgnoreCase));
    }

    public static bool ValidatePhoneNumber(string number, string country)
    {
        var cleanNumber = System.Text.RegularExpressions.Regex.Replace(number, @"\D", "");
        return cleanNumber.Length >= 8 && cleanNumber.Length <= 15;
    }
}

class Program
{
    static async Task Main(string[] args)
    {
        var apiKey = Environment.GetEnvironmentVariable("WHATSAPP_RT_API_KEY") ?? "YOUR_API_KEY";
        var checker = new WhatsAppRealtimeChecker(apiKey);

        try
        {
            // Single number check
            Console.WriteLine("=== Single Number Check ===");
            var result = await checker.CheckNumberAsync("628138800001", "ID");
            Console.WriteLine("Result: " + checker.FormatResult(result));
            Console.WriteLine("Raw Response: " + JsonSerializer.Serialize(result, new JsonSerializerOptions 
            { 
                WriteIndented = true 
            }));

            Console.WriteLine("\n=== Multiple Numbers Check ===");
            // Multiple numbers check
            var numbersToCheck = new List<NumberData>
            {
                new NumberData { Number = "628138800001", Country = "ID" },
                new NumberData { Number = "5511999999999", Country = "BR" },
                new NumberData { Number = "5215555555555", Country = "MX" },
                new NumberData { Number = "919876543210", Country = "IN" },
            };

            var results = await checker.CheckMultipleNumbersAsync(numbersToCheck, 1000);

            Console.WriteLine("\n=== Results Summary ===");
            for (int i = 0; i < results.Count; i++)
            {
                var checkResult = results[i];
                var inputData = checkResult.Input;
                
                if (checkResult.Success && checkResult.Result != null)
                {
                    var formatted = checker.FormatResult(checkResult.Result);
                    Console.WriteLine($"{i + 1}. {formatted}");
                }
                else
                {
                    Console.WriteLine($"{i + 1}. Error for {inputData.Number} ({inputData.Country}): {checkResult.ErrorMessage}");
                }
            }

            // Statistics
            var stats = checker.GetStatistics(results);
            Console.WriteLine("\n=== Statistics ===");
            Console.WriteLine($"Total Checks: {stats.Total}");
            Console.WriteLine($"Successful: {stats.Successful}");
            Console.WriteLine($"Failed: {stats.Failed}");
            Console.WriteLine($"WhatsApp Yes: {stats.WhatsAppYes}");
            Console.WriteLine($"WhatsApp No: {stats.WhatsAppNo}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error: {ex.Message}");
            Environment.Exit(1);
        }
        finally
        {
            checker.Dispose();
        }
    }
}
