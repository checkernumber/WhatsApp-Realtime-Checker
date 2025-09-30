import java.io.*;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.*;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;
import com.google.gson.Gson;
import com.google.gson.annotations.SerializedName;

public class WhatsAppRealtimeChecker {
    private final String apiKey;
    private final String baseUrl;
    private final HttpClient httpClient;
    private final Gson gson;

    public WhatsAppRealtimeChecker(String apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = "https://api.checknumber.ai/v1/realtime/whatsapp";
        this.httpClient = HttpClient.newBuilder()
                .timeout(Duration.ofSeconds(30))
                .build();
        this.gson = new Gson();
    }

    public CompletableFuture<WhatsAppResponse> checkNumber(String number, String country, String callback) {
        try {
            Map<String, String> params = new HashMap<>();
            params.put("number", number);
            params.put("country", country.toUpperCase());
            
            if (callback != null && !callback.isEmpty()) {
                params.put("callback", callback);
            }

            String formData = params.entrySet().stream()
                    .map(entry -> {
                        try {
                            return URLEncoder.encode(entry.getKey(), "UTF-8") + "=" + 
                                   URLEncoder.encode(entry.getValue(), "UTF-8");
                        } catch (UnsupportedEncodingException e) {
                            throw new RuntimeException(e);
                        }
                    })
                    .collect(Collectors.joining("&"));

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl))
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .header("X-API-Key", apiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(formData))
                    .build();

            return httpClient.sendAsync(request, HttpResponse.BodyHandlers.ofString())
                    .thenApply(response -> {
                        if (response.statusCode() != 200) {
                            throw new RuntimeException("HTTP error: " + response.statusCode() + 
                                                     ", body: " + response.body());
                        }
                        return gson.fromJson(response.body(), WhatsAppResponse.class);
                    });

        } catch (Exception e) {
            return CompletableFuture.failedFuture(e);
        }
    }

    public CompletableFuture<WhatsAppResponse> checkNumber(String number, String country) {
        return checkNumber(number, country, null);
    }

    public CompletableFuture<List<CheckResult>> checkMultipleNumbers(
            List<NumberData> numbersData, 
            int delayMilliseconds) {
        
        return CompletableFuture.supplyAsync(() -> {
            List<CheckResult> results = new ArrayList<>();
            
            for (int i = 0; i < numbersData.size(); i++) {
                NumberData data = numbersData.get(i);
                
                try {
                    System.out.printf("Checking %d/%d: %s (%s)%n", 
                                    i + 1, numbersData.size(), data.number, data.country);
                    
                    WhatsAppResponse result = checkNumber(data.number, data.country, data.callback).get();
                    results.add(new CheckResult(data, result, null, true));
                    
                    // Add delay between requests
                    if (delayMilliseconds > 0 && i < numbersData.size() - 1) {
                        Thread.sleep(delayMilliseconds);
                    }
                    
                } catch (Exception e) {
                    results.add(new CheckResult(data, null, e.getMessage(), false));
                    System.out.printf("Error checking %s: %s%n", data.number, e.getMessage());
                }
            }
            
            return results;
        });
    }

    public String formatResult(WhatsAppResponse result) {
        if ("OK".equals(result.status) && result.message != null) {
            String number = result.message.number != null ? result.message.number : "Unknown";
            String whatsappStatus = result.message.whatsapp != null ? result.message.whatsapp : "Unknown";
            String transactionId = result.transactionId != null ? result.transactionId : "N/A";
            
            return String.format("Number: %s, WhatsApp: %s, Transaction ID: %s", 
                               number, whatsappStatus, transactionId);
        } else {
            return String.format("Status: %s, Error: %s", 
                               result.status != null ? result.status : "Unknown", 
                               gson.toJson(result));
        }
    }

    public CheckStatistics getStatistics(List<CheckResult> results) {
        int successful = 0;
        int whatsappYes = 0;
        int whatsappNo = 0;

        for (CheckResult result : results) {
            if (result.success) {
                successful++;
                if (result.result != null && result.result.message != null) {
                    if ("yes".equals(result.result.message.whatsapp)) {
                        whatsappYes++;
                    } else if ("no".equals(result.result.message.whatsapp)) {
                        whatsappNo++;
                    }
                }
            }
        }

        return new CheckStatistics(
            results.size(), 
            successful, 
            results.size() - successful, 
            whatsappYes, 
            whatsappNo
        );
    }

    // Data classes
    public static class WhatsAppResponse {
        public String status;
        public WhatsAppMessage message;
        @SerializedName("pricingStrategy")
        public String pricingStrategy;
        @SerializedName("transactionId")
        public String transactionId;
    }

    public static class WhatsAppMessage {
        public String number;
        public String whatsapp;
    }

    public static class NumberData {
        public String number;
        public String country;
        public String callback;

        public NumberData(String number, String country) {
            this.number = number;
            this.country = country;
        }

        public NumberData(String number, String country, String callback) {
            this.number = number;
            this.country = country;
            this.callback = callback;
        }
    }

    public static class CheckResult {
        public NumberData input;
        public WhatsAppResponse result;
        public String errorMessage;
        public boolean success;

        public CheckResult(NumberData input, WhatsAppResponse result, String errorMessage, boolean success) {
            this.input = input;
            this.result = result;
            this.errorMessage = errorMessage;
            this.success = success;
        }
    }

    public static class CheckStatistics {
        public int total;
        public int successful;
        public int failed;
        public int whatsappYes;
        public int whatsappNo;

        public CheckStatistics(int total, int successful, int failed, int whatsappYes, int whatsappNo) {
            this.total = total;
            this.successful = successful;
            this.failed = failed;
            this.whatsappYes = whatsappYes;
            this.whatsappNo = whatsappNo;
        }
    }

    // Helper methods
    public static boolean validateCountryCode(String country) {
        String[] supportedCountries = {"BR", "MX", "NG", "IN", "ID", "US", "CA", "GB", "DE", "FR"};
        return Arrays.stream(supportedCountries)
                .anyMatch(c -> c.equalsIgnoreCase(country));
    }

    public static boolean validatePhoneNumber(String number, String country) {
        String cleanNumber = number.replaceAll("\\D", "");
        return cleanNumber.length() >= 8 && cleanNumber.length() <= 15;
    }

    public static void main(String[] args) {
        String apiKey = System.getenv("WHATSAPP_RT_API_KEY");
        if (apiKey == null) {
            apiKey = "YOUR_API_KEY";
        }

        WhatsAppRealtimeChecker checker = new WhatsAppRealtimeChecker(apiKey);

        try {
            // Single number check
            System.out.println("=== Single Number Check ===");
            WhatsAppResponse result = checker.checkNumber("628138800001", "ID").get();
            System.out.println("Result: " + checker.formatResult(result));
            System.out.println("Raw Response: " + checker.gson.toJson(result));

            System.out.println("\n=== Multiple Numbers Check ===");
            // Multiple numbers check
            List<NumberData> numbersToCheck = Arrays.asList(
                new NumberData("628138800001", "ID"),
                new NumberData("5511999999999", "BR"),
                new NumberData("5215555555555", "MX"),
                new NumberData("919876543210", "IN")
            );

            List<CheckResult> results = checker.checkMultipleNumbers(numbersToCheck, 1000).get();

            System.out.println("\n=== Results Summary ===");
            for (int i = 0; i < results.size(); i++) {
                CheckResult checkResult = results.get(i);
                NumberData inputData = checkResult.input;
                
                if (checkResult.success && checkResult.result != null) {
                    String formatted = checker.formatResult(checkResult.result);
                    System.out.printf("%d. %s%n", i + 1, formatted);
                } else {
                    System.out.printf("%d. Error for %s (%s): %s%n", 
                                    i + 1, inputData.number, inputData.country, checkResult.errorMessage);
                }
            }

            // Statistics
            CheckStatistics stats = checker.getStatistics(results);
            System.out.println("\n=== Statistics ===");
            System.out.println("Total Checks: " + stats.total);
            System.out.println("Successful: " + stats.successful);
            System.out.println("Failed: " + stats.failed);
            System.out.println("WhatsApp Yes: " + stats.whatsappYes);
            System.out.println("WhatsApp No: " + stats.whatsappNo);

        } catch (Exception e) {
            System.err.println("Error: " + e.getMessage());
            System.exit(1);
        }
    }
}
