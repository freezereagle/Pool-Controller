#include "custom_web_handler.h"
#include "esphome/core/log.h"
#include "esphome/core/application.h"

namespace esphome {
namespace custom_web_handler {

static const char *const TAG = "custom_web_handler";

void CustomWebHandler::setup() {
  auto *base = web_server_base::global_web_server_base;
  if (base == nullptr) {
    ESP_LOGE(TAG, "WebServerBase not found");
    this->mark_failed();
    return;
  }
  
  base->add_handler(this);
  ESP_LOGI(TAG, "Custom web handler registered with %d endpoints", this->endpoints_.size());
}

void CustomWebHandler::add_text_endpoint(const std::string &path, const std::string &content_type, const std::string &text) {
  Endpoint ep;
  ep.path = path;
  ep.content_type = content_type;
  ep.type = ENDPOINT_TEXT;
  ep.content = text;
  ep.file_data = nullptr;
  ep.file_size = 0;
  this->endpoints_.push_back(ep);
  ESP_LOGCONFIG(TAG, "Added text endpoint: %s", path.c_str());
}

void CustomWebHandler::add_file_endpoint(const std::string &path, const std::string &content_type, const uint8_t *data, size_t size) {
  Endpoint ep;
  ep.path = path;
  ep.content_type = content_type;
  ep.type = ENDPOINT_FILE;
  ep.file_data = data;
  ep.file_size = size;
  this->endpoints_.push_back(ep);
  ESP_LOGCONFIG(TAG, "Added file endpoint: %s (%d bytes)", path.c_str(), size);
}

void CustomWebHandler::add_url_endpoint(const std::string &path, const std::string &content_type, const std::string &url) {
  Endpoint ep;
  ep.path = path;
  ep.content_type = content_type;
  ep.type = ENDPOINT_URL;
  ep.content = url;
  ep.file_data = nullptr;
  ep.file_size = 0;
  this->endpoints_.push_back(ep);
  ESP_LOGCONFIG(TAG, "Added URL endpoint: %s -> %s", path.c_str(), url.c_str());
}

bool CustomWebHandler::canHandle(AsyncWebServerRequest *request) const {
  if (request->method() != HTTP_GET)
    return false;
  
  std::string url = request->url().c_str();
  
  for (const auto &endpoint : this->endpoints_) {
    if (url == endpoint.path) {
      return true;
    }
  }
  
  return false;
}

void CustomWebHandler::handleRequest(AsyncWebServerRequest *request) {
  std::string url = request->url().c_str();
  
  for (const auto &endpoint : this->endpoints_) {
    if (url == endpoint.path) {
      switch (endpoint.type) {
        case ENDPOINT_TEXT:
          this->handle_text_endpoint(request, endpoint);
          break;
        case ENDPOINT_FILE:
          this->handle_file_endpoint(request, endpoint);
          break;
        case ENDPOINT_URL:
          this->handle_url_endpoint(request, endpoint);
          break;
      }
      return;
    }
  }
  
  request->send(404, "text/plain", "Not Found");
}

void CustomWebHandler::handle_text_endpoint(AsyncWebServerRequest *request, const Endpoint &endpoint) {
  request->send(200, endpoint.content_type.c_str(), endpoint.content.c_str());
}

void CustomWebHandler::handle_file_endpoint(AsyncWebServerRequest *request, const Endpoint &endpoint) {
#ifndef USE_ESP8266
  AsyncWebServerResponse *response = request->beginResponse(
      200, endpoint.content_type.c_str(), endpoint.file_data, endpoint.file_size);
#else
  AsyncWebServerResponse *response = request->beginResponse_P(
      200, endpoint.content_type.c_str(), endpoint.file_data, endpoint.file_size);
#endif
  request->send(response);
}

void CustomWebHandler::handle_url_endpoint(AsyncWebServerRequest *request, const Endpoint &endpoint) {
#if defined(USE_ESP32) && !defined(USE_ESP_IDF)
  HTTPClient http;
  http.begin(endpoint.content.c_str());
  
  int httpCode = http.GET();
  
  if (httpCode > 0) {
    if (httpCode == HTTP_CODE_OK) {
      String payload = http.getString();
      request->send(200, endpoint.content_type.c_str(), payload.c_str());
    } else {
      request->send(httpCode, "text/plain", "HTTP Error");
    }
  } else {
    ESP_LOGE(TAG, "HTTP GET failed: %s", http.errorToString(httpCode).c_str());
    request->send(500, "text/plain", "Failed to fetch URL");
  }
  
  http.end();
#else
  request->send(501, "text/plain", "URL endpoints not supported on ESP-IDF or ESP8266");
#endif
}

}  // namespace custom_web_handler
}  // namespace esphome
