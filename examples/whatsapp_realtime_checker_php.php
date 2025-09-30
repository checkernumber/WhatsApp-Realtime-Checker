<?php

class WhatsAppRealtimeChecker
{
    private string $apiKey;
    private string $baseUrl;
    private array $curlOptions;

    public function __construct(string $apiKey)
    {
        $this->apiKey = $apiKey;
        $this->baseUrl = 'https://api.checknumber.ai/v1/realtime/whatsapp';
        $this->curlOptions = [
            CURLOPT_TIMEOUT => 30,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/x-www-form-urlencoded',
                'X-API-Key: ' . $this->apiKey
            ]
        ];
    }

    public function checkNumber(string $number, string $country, ?string $callback = null): array
    {
        $postData = [
            'number' => $number,
            'country' => strtoupper($country)
        ];

        if ($callback !== null) {
            $postData['callback'] = $callback;
        }

        $curl = curl_init();

        $options = $this->curlOptions + [
            CURLOPT_URL => $this->baseUrl,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => http_build_query($postData)
        ];

        curl_setopt_array($curl, $options);

        $response = curl_exec($curl);
        $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        $error = curl_error($curl);

        curl_close($curl);

        if ($error) {
            throw new RuntimeException("cURL error: $error");
        }

        if ($httpCode !== 200) {
            throw new RuntimeException("HTTP error: $httpCode, Response: $response");
        }

        $decoded = json_decode($response, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new RuntimeException("JSON decode error: " . json_last_error_msg());
        }

        return $decoded;
    }

    public function checkMultipleNumbers(array $numbersData, int $delayMs = 1000): array
    {
        $results = [];
        $total = count($numbersData);

        foreach ($numbersData as $index => $data) {
            $number = $data['number'];
            $country = $data['country'];
            $callback = $data['callback'] ?? null;

            echo "Checking " . ($index + 1) . "/$total: $number ($country)\n";

            try {
                $result = $this->checkNumber($number, $country, $callback);
                $results[] = [
                    'input' => $data,
                    'result' => $result,
                    'success' => true
                ];
            } catch (Exception $e) {
                $results[] = [
                    'input' => $data,
                    'result' => ['error' => $e->getMessage()],
                    'success' => false
                ];
                echo "Error checking $number: " . $e->getMessage() . "\n";
            }

            // Add delay between requests
            if ($delayMs > 0 && $index < $total - 1) {
                usleep($delayMs * 1000); // Convert to microseconds
            }
        }

        return $results;
    }

    public function formatResult(array $result): string
    {
        if ($result['status'] === 'OK' && isset($result['message'])) {
            $message = $result['message'];
            $number = $message['number'] ?? 'Unknown';
            $whatsappStatus = $message['whatsapp'] ?? 'Unknown';
            $transactionId = $result['transactionId'] ?? 'N/A';

            return "Number: $number, WhatsApp: $whatsappStatus, Transaction ID: $transactionId";
        } else {
            $status = $result['status'] ?? 'Unknown';
            $error = json_encode($result);
            return "Status: $status, Error: $error";
        }
    }

    public function getStatistics(array $results): array
    {
        $total = count($results);
        $successful = 0;
        $whatsappYes = 0;
        $whatsappNo = 0;

        foreach ($results as $result) {
            if ($result['success']) {
                $successful++;
                if (isset($result['result']['message']['whatsapp'])) {
                    $whatsappStatus = $result['result']['message']['whatsapp'];
                    if ($whatsappStatus === 'yes') {
                        $whatsappYes++;
                    } elseif ($whatsappStatus === 'no') {
                        $whatsappNo++;
                    }
                }
            }
        }

        return [
            'total' => $total,
            'successful' => $successful,
            'failed' => $total - $successful,
            'whatsappYes' => $whatsappYes,
            'whatsappNo' => $whatsappNo
        ];
    }
}

// Helper functions
function validateCountryCode(string $country): bool
{
    $supportedCountries = ['BR', 'MX', 'NG', 'IN', 'ID', 'US', 'CA', 'GB', 'DE', 'FR'];
    return in_array(strtoupper($country), $supportedCountries, true);
}

function validatePhoneNumber(string $number, string $country): bool
{
    $cleanNumber = preg_replace('/\D/', '', $number);
    $length = strlen($cleanNumber);
    return $length >= 8 && $length <= 15;
}

// Usage example
function main(): void
{
    $apiKey = $_ENV['WHATSAPP_RT_API_KEY'] ?? 'YOUR_API_KEY';
    $checker = new WhatsAppRealtimeChecker($apiKey);

    try {
        // Single number check
        echo "=== Single Number Check ===\n";
        $result = $checker->checkNumber('628138800001', 'ID');
        echo "Result: " . $checker->formatResult($result) . "\n";
        echo "Raw Response: " . json_encode($result, JSON_PRETTY_PRINT) . "\n";

        echo "\n=== Multiple Numbers Check ===\n";
        // Multiple numbers check
        $numbersToCheck = [
            ['number' => '628138800001', 'country' => 'ID'],
            ['number' => '5511999999999', 'country' => 'BR'],
            ['number' => '5215555555555', 'country' => 'MX'],
            ['number' => '919876543210', 'country' => 'IN'],
        ];

        $results = $checker->checkMultipleNumbers($numbersToCheck, 1000);

        echo "\n=== Results Summary ===\n";
        foreach ($results as $index => $result) {
            $inputData = $result['input'];
            $itemNumber = $index + 1;

            if ($result['success']) {
                $formatted = $checker->formatResult($result['result']);
                echo "$itemNumber. $formatted\n";
            } else {
                $number = $inputData['number'];
                $country = $inputData['country'];
                $error = $result['result']['error'];
                echo "$itemNumber. Error for $number ($country): $error\n";
            }
        }

        // Statistics
        $stats = $checker->getStatistics($results);
        echo "\n=== Statistics ===\n";
        echo "Total Checks: {$stats['total']}\n";
        echo "Successful: {$stats['successful']}\n";
        echo "Failed: {$stats['failed']}\n";
        echo "WhatsApp Yes: {$stats['whatsappYes']}\n";
        echo "WhatsApp No: {$stats['whatsappNo']}\n";

    } catch (Exception $e) {
        echo "Error: " . $e->getMessage() . "\n";
        exit(1);
    }
}

// Interactive CLI function
function interactiveCLI(): void
{
    echo "WhatsApp Realtime Checker - Interactive Mode\n";
    echo "===========================================\n\n";

    $apiKey = readline("Enter your API key: ");
    if (empty($apiKey)) {
        echo "API key is required!\n";
        exit(1);
    }

    $checker = new WhatsAppRealtimeChecker($apiKey);

    while (true) {
        echo "\n1. Check single number\n";
        echo "2. Check multiple numbers\n";
        echo "3. Exit\n";
        $choice = readline("Choose an option (1-3): ");

        switch ($choice) {
            case '1':
                $number = readline("Enter phone number: ");
                $country = strtoupper(readline("Enter country code (e.g., ID, BR, MX): "));

                if (!validateCountryCode($country)) {
                    echo "Unsupported country code: $country\n";
                    break;
                }

                if (!validatePhoneNumber($number, $country)) {
                    echo "Invalid phone number format: $number\n";
                    break;
                }

                try {
                    $result = $checker->checkNumber($number, $country);
                    echo "Result: " . $checker->formatResult($result) . "\n";
                } catch (Exception $e) {
                    echo "Error: " . $e->getMessage() . "\n";
                }
                break;

            case '2':
                echo "Enter phone numbers in format: number,country (one per line)\n";
                echo "Press Enter twice when done:\n";

                $numbersData = [];
                while (true) {
                    $line = readline("");
                    if (empty($line)) break;

                    $parts = array_map('trim', explode(',', $line));
                    if (count($parts) >= 2) {
                        $numbersData[] = [
                            'number' => $parts[0],
                            'country' => $parts[1]
                        ];
                    }
                }

                if (empty($numbersData)) {
                    echo "No valid numbers entered.\n";
                    break;
                }

                try {
                    $results = $checker->checkMultipleNumbers($numbersData, 1000);
                    $stats = $checker->getStatistics($results);

                    echo "\nResults Summary:\n";
                    foreach ($results as $index => $result) {
                        $itemNumber = $index + 1;
                        if ($result['success']) {
                            echo "$itemNumber. " . $checker->formatResult($result['result']) . "\n";
                        } else {
                            $inputData = $result['input'];
                            echo "$itemNumber. Error for {$inputData['number']} ({$inputData['country']}): {$result['result']['error']}\n";
                        }
                    }

                    echo "\nStatistics:\n";
                    echo "Total: {$stats['total']}, Successful: {$stats['successful']}, Failed: {$stats['failed']}\n";
                    echo "WhatsApp Yes: {$stats['whatsappYes']}, WhatsApp No: {$stats['whatsappNo']}\n";

                } catch (Exception $e) {
                    echo "Error: " . $e->getMessage() . "\n";
                }
                break;

            case '3':
                echo "Goodbye!\n";
                exit(0);

            default:
                echo "Invalid choice. Please enter 1, 2, or 3.\n";
        }
    }
}

// Run based on command line arguments
if (php_sapi_name() === 'cli') {
    if ($argc > 1 && $argv[1] === '--interactive') {
        interactiveCLI();
    } else {
        main();
    }
}

?>
