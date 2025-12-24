#pragma once

#include "esphome/core/component.h"
#include "esphome/core/automation.h"
#include "esphome/components/web_server_base/web_server_base.h"

#if defined(USE_ESP32) && !defined(USE_ESP_IDF)
#include <HTTPClient.h>
#endif

namespace esphome {
namespace custom_web_handler {

enum EndpointType {
  ENDPOINT_TEXT,
  ENDPOINT_FILE,
  ENDPOINT_URL,
};

struct Endpoint {
  std::string path;
  std::string content_type;
  EndpointType type;
  std::string content;  // For TEXT and URL
  const uint8_t *file_data;  // For FILE
  size_t file_size;  // For FILE
};

class CustomWebHandler : public Component, public AsyncWebHandler {
 public:
  void setup() override;
  float get_setup_priority() const override { return setup_priority::WIFI - 1.0f; }
  
  void add_text_endpoint(const std::string &path, const std::string &content_type, const std::string &text);
  void add_file_endpoint(const std::string &path, const std::string &content_type, const uint8_t *data, size_t size);
  void add_url_endpoint(const std::string &path, const std::string &content_type, const std::string &url);
  
  bool canHandle(AsyncWebServerRequest *request) const override;
  void handleRequest(AsyncWebServerRequest *request) override;
#ifndef USE_ESP_IDF
  bool isRequestHandlerTrivial() override { return false; }
#endif

 protected:
  std::vector<Endpoint> endpoints_;
  
  void handle_text_endpoint(AsyncWebServerRequest *request, const Endpoint &endpoint);
  void handle_file_endpoint(AsyncWebServerRequest *request, const Endpoint &endpoint);
  void handle_url_endpoint(AsyncWebServerRequest *request, const Endpoint &endpoint);
};

}  // namespace custom_web_handler
}  // namespace esphome
