#define _WIN32_WINNT 0x0600
#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <wininet.h>
#include <ole2.h>           // For OleInitialize
#include <string>
#include <iostream>
#include <sstream>
#include <iomanip>
#include <cstring>
#include <process.h>       // For _beginthreadex
#include <conio.h>         // For _getch()
#include <time.h>          // For time functions

#pragma comment(lib, "wininet.lib")
#pragma comment(lib, "user32.lib")
#pragma comment(lib, "ole32.lib")
#pragma comment(lib, "oleaut32.lib")

using namespace std;

// Global variables
string lastClipboard = "";
bool ignoreNextUpdate = false;
bool updatingFromServer = false;  // Flag to track server updates
CRITICAL_SECTION cs;  // Critical section for thread safety
bool running = true;  // Global flag to control threads
const char* SERVER = "localhost";
const int PORT = 3000;
const char* API_PATH = "/api/clipboard";

// Debug logging
void debugLog(const string& message) {
    time_t now;
    time(&now);
    tm* now_tm = localtime(&now);
    
    char time_str[20];
    strftime(time_str, sizeof(time_str), "%H:%M:%S", now_tm);
    cout << "[" << time_str << "] " << message << endl;
}

// Clipboard functions
string getClipboardText() {
    if (!OpenClipboard(nullptr)) {
        debugLog("Error: Failed to open clipboard");
        return "";
    }
    
    EnterCriticalSection(&cs);
    
    if (!IsClipboardFormatAvailable(CF_TEXT)) {
        CloseClipboard();
        return "";
    }
    
    HANDLE hData = GetClipboardData(CF_TEXT);
    if (!hData) {
        CloseClipboard();
        return "";
    }
    
    char* pszText = static_cast<char*>(GlobalLock(hData));
    if (!pszText) {
        CloseClipboard();
        return "";
    }
    
    string text(pszText);
    GlobalUnlock(hData);
    CloseClipboard();
    return text;
}

void setClipboardText(const string& text) {
    debugLog("\n=== Starting setClipboardText ===");
    debugLog("Original text length: " + to_string(text.length()));
    
    if (text.empty()) {
        debugLog("Error: Empty text provided");
        return;
    }

    // Clean up the text - remove any null terminators or special characters
    string cleanText;
    for (char c : text) {
        if (c != '\0' && c != '\r') {
            cleanText += c;
        }
    }
    
    // Ensure the string is not empty after cleaning
    if (cleanText.empty()) {
        debugLog("Error: Text is empty after cleaning");
        return;
    }
    
    debugLog("Cleaned text length: " + to_string(cleanText.length()));

    // Initialize COM
    if (FAILED(OleInitialize(NULL))) {
        debugLog("Error: OleInitialize failed");
        return;
    }

    // Try to open the clipboard (with retry logic)
    int attempts = 0;
    const int maxAttempts = 5;
    bool clipboardOpened = false;
    
    while (attempts < maxAttempts && !(clipboardOpened = OpenClipboard(NULL))) {
        DWORD error = GetLastError();
        debugLog("Attempt " + to_string(attempts + 1) + " - Failed to open clipboard. Error: " + to_string(error));
        Sleep(100); // Wait 100ms before retrying
        attempts++;
    }
    
    if (!clipboardOpened) {
        debugLog("Error: Failed to open clipboard after " + to_string(maxAttempts) + " attempts");
        OleUninitialize();
        return;
    }
    debugLog("1. Opened clipboard successfully");

    // Empty the clipboard
    if (!EmptyClipboard()) {
        DWORD error = GetLastError();
        debugLog("Error: Failed to empty clipboard. Error: " + to_string(error));
        CloseClipboard();
        OleUninitialize();
        return;
    }
    debugLog("2. Emptied clipboard");

    // Allocate global memory for the text
    size_t bufferSize = cleanText.length() + 1; // +1 for null terminator
    HGLOBAL hMem = GlobalAlloc(GMEM_MOVEABLE | GMEM_ZEROINIT, bufferSize);
    if (!hMem) {
        debugLog("Error: Failed to allocate memory. Error: " + to_string(GetLastError()));
        CloseClipboard();
        OleUninitialize();
        return;
    }
    debugLog("3. Allocated " + to_string(bufferSize) + " bytes of memory");

    // Lock the memory and copy the text
    char* pMem = static_cast<char*>(GlobalLock(hMem));
    if (!pMem) {
        debugLog("Error: Failed to lock memory. Error: " + to_string(GetLastError()));
        GlobalFree(hMem);
        CloseClipboard();
        OleUninitialize();
        return;
    }
    
    // Copy the cleaned text to the global memory
    strncpy(pMem, cleanText.c_str(), cleanText.length());
    pMem[cleanText.length()] = '\0'; // Ensure null termination
    
    GlobalUnlock(hMem);
    debugLog("4. Copied text to memory");

    // Set the clipboard data
    if (!SetClipboardData(CF_TEXT, hMem)) {
        DWORD error = GetLastError();
        debugLog("Error: Failed to set clipboard data. Error: " + to_string(error));
        GlobalFree(hMem);
    } else {
        debugLog("5. Successfully set clipboard data");
        // The system now owns the memory, don't free it
        
        // Verify the clipboard content
        if (IsClipboardFormatAvailable(CF_TEXT)) {
            HANDLE hData = GetClipboardData(CF_TEXT);
            if (hData) {
                char* pData = static_cast<char*>(GlobalLock(hData));
                if (pData) {
                    debugLog("6. Clipboard verification - Content length: " + to_string(strlen(pData)));
                    debugLog("First 50 chars: " + string(pData).substr(0, 50));
                    GlobalUnlock(hData);
                }
            }
        }
    }

    // Clean up
    CloseClipboard();
    OleUninitialize();
    debugLog("=== Clipboard update completed ===");
}

// HTTP functions
string httpRequest(const char* method, const char* path, const string& body = "") {
    string fullUrl = string("http://") + SERVER + ":" + to_string(PORT) + path;
    debugLog(string("HTTP ") + method + " request to: " + fullUrl);
    HINTERNET hInternet = nullptr;
    HINTERNET hConnect = nullptr;
    HINTERNET hRequest = nullptr;
    string response;

    try {
        // Initialize WinINet with proxy detection
        hInternet = InternetOpenA("ClipboardSync/1.0", 
                                  INTERNET_OPEN_TYPE_PRECONFIG,  // Use system proxy settings
                                  NULL, NULL, 0);
        if (!hInternet) {
            debugLog("Error: InternetOpen failed");
            return "";
        }

        // Connect to server
        hConnect = InternetConnectA(hInternet, SERVER, PORT, 
                                    NULL, NULL, INTERNET_SERVICE_HTTP, 0, 0);
        if (!hConnect) {
            debugLog("Error: InternetConnect failed");
            InternetCloseHandle(hInternet);
            return "";
        }

        // Create request
        const char* acceptTypes[] = {"application/json", NULL};
        hRequest = HttpOpenRequestA(hConnect, method, path, 
                                    "HTTP/1.1", NULL, acceptTypes, 
                                    INTERNET_FLAG_RELOAD | INTERNET_FLAG_NO_CACHE_WRITE, 0);
        if (!hRequest) {
            debugLog("Error: HttpOpenRequest failed");
            InternetCloseHandle(hConnect);
            InternetCloseHandle(hInternet);
            return "";
        }

        // Send request
        BOOL bResults = TRUE;
        if (strcmp(method, "POST") == 0) {
            // For POST requests, send the body
            const char* headers = "Content-Type: application/json";
            bResults = HttpSendRequestA(hRequest, headers, strlen(headers),
                                      (LPVOID)body.c_str(), body.length());
        } else {
            // For GET requests, just send the request
            const char* headers = "Content-Type: application/json";
            bResults = HttpSendRequestA(hRequest, headers, strlen(headers), NULL, 0);
        }

        if (bResults) {
            // Read response
            char buffer[4096];
            DWORD bytesRead;
            DWORD totalRead = 0;
            while (InternetReadFile(hRequest, buffer, sizeof(buffer) - 1, &bytesRead) && 
                   bytesRead > 0) {
                buffer[bytesRead] = 0;
                response.append(buffer, bytesRead);
                totalRead += bytesRead;
            }
            debugLog("Received response, length: " + to_string(totalRead));
        } else {
            DWORD error = GetLastError();
            debugLog("HTTP request failed with error: " + to_string(error));
        }

        // Clean up
        InternetCloseHandle(hRequest);
        InternetCloseHandle(hConnect);
        InternetCloseHandle(hInternet);

        return response;
    } catch (const exception& e) {
        debugLog("HTTP Error: " + string(e.what()));
    }

    return "";
}

// Simple JSON unescape
string unescapeJsonString(const string& input) {
    string output;
    for (size_t i = 0; i < input.length(); i++) {
        if (input[i] == '\\' && i + 1 < input.length()) {
            if (input[i+1] == 'n') { output += '\n'; i++; }
            else if (input[i+1] == 'r') { output += '\r'; i++; }
            else if (input[i+1] == 't') { output += '\t'; i++; }
            else if (input[i+1] == '"') { output += '"'; i++; }
            else if (input[i+1] == '\\') { output += '\\'; i++; }
            else { output += input[i]; }
        } else {
            output += input[i];
        }
    }
    return output;
}

// Thread function to monitor local clipboard changes
unsigned __stdcall clipboardThread(void* param) {
    (void)param;
    while (running) {
        string current = getClipboardText();
        
        // Only proceed if we have content and it's different from last sent
        if (!current.empty() && current != lastClipboard) {
            // Escape JSON special characters
            string escaped;
            for (char c : current) {
                if (c == '"') escaped += "\\\"";
                else if (c == '\\') escaped += "\\\\";
                else if (c == '\n') escaped += "\\n";
                else if (c == '\r') escaped += "\\r";
                else escaped += c;
            }
            
            // Only send if this isn't a server update
            if (!updatingFromServer) {
                debugLog("Local change detected, sending to server...");
                string json = "{\"content\":\"" + escaped + "\"}";
                string response = httpRequest("POST", API_PATH, json);
                
                if (!response.empty()) {
                    lastClipboard = current;
                    debugLog("Successfully updated server");
                } else {
                    debugLog("Failed to update server");
                }
            }
        }
        
        Sleep(100); // Check every 100ms
    }
    return 0;
}

// Server polling thread
unsigned __stdcall serverThread(void* param) {
    (void)param;
    while (running) {
        try {
            string response = httpRequest("GET", API_PATH);
            if (response.empty() || response == "{}") {
                Sleep(1000);
                continue;
            }
            
            // Simple JSON parsing
            debugLog("Server response: " + response);
            size_t content_pos = response.find("content\":\"");
            if (content_pos == string::npos) {
                debugLog("Invalid server response format - missing content field");
                Sleep(1000);
                continue;
            }
            
            size_t start = content_pos + 10; // Length of "content\":\""
            size_t end = response.find('"', start); // Find the closing quote
            
            if (end == string::npos) {
                debugLog("Invalid content format - missing closing quote");
                Sleep(1000);
                continue;
            }
            
            string content = response.substr(start, end - start);
            debugLog("Extracted content before unescape: " + content);
            content = unescapeJsonString(content);
            debugLog("After unescaping: " + content);
            
            if (!content.empty() && content != lastClipboard) {
                debugLog("Server has new content, updating clipboard...");
                updatingFromServer = true;
                
                // Update clipboard
                setClipboardText(content);
                lastClipboard = content;
                
                updatingFromServer = false;
                debugLog("Clipboard updated from server");
            }
        } catch (const exception& e) {
            debugLog(string("Server error: ") + e.what());
        }
        
        Sleep(1000); // Check every second
    }
}

int main() {
    debugLog("Clipboard Sync Client Started");
    
    // Initialize critical section
    InitializeCriticalSection(&cs);
    
    // Initialize COM for clipboard operations
    if (FAILED(CoInitializeEx(NULL, COINIT_APARTMENTTHREADED | COINIT_DISABLE_OLE1DDE))) {
        debugLog("Error: Failed to initialize COM");
        return 1;
    }
    
    // Create threads
    HANDLE hThreads[2];
    hThreads[0] = (HANDLE)_beginthreadex(NULL, 0, &clipboardThread, NULL, 0, NULL);
    hThreads[1] = (HANDLE)_beginthreadex(NULL, 0, &serverThread, NULL, 0, NULL);
    
    if (!hThreads[0] || !hThreads[1]) {
        debugLog("Error: Failed to create threads");
        return 1;
    }
    
    // Wait for a key press to exit
    debugLog("Press any key to exit...");
    _getch();
    
    // Signal threads to exit
    running = false;
    
    // Wait for threads to finish
    WaitForMultipleObjects(2, hThreads, TRUE, INFINITE);
    
    // Cleanup
    CloseHandle(hThreads[0]);
    CloseHandle(hThreads[1]);
    DeleteCriticalSection(&cs);
    CoUninitialize();
    
    debugLog("Clipboard Sync Client Exiting...");
    return 0;
}