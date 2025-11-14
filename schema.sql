-- ================================================================
-- Database Schema for Document Form Application
-- MySQL Database Schema
-- ================================================================

-- Force UTF-8 encoding for all operations
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET CHARACTER SET utf8mb4;

-- Create database (run manually if needed)
-- CREATE DATABASE IF NOT EXISTS document_form CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE document_form;

-- ================================================================
-- Table: endpoints
-- Stores API endpoints (method + URL)
-- ================================================================
CREATE TABLE IF NOT EXISTS endpoints (
  id INT AUTO_INCREMENT PRIMARY KEY,
  metodo VARCHAR(10) NOT NULL COMMENT 'HTTP method: GET, POST, PUT, PATCH, DELETE',
  url VARCHAR(2048) NOT NULL COMMENT 'Full URL of the endpoint',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_metodo (metodo),
  INDEX idx_url (url(255)),
  UNIQUE KEY unique_endpoint (metodo, url(255))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================
-- Table: response_fields
-- Stores extracted fields from API responses
-- ================================================================
CREATE TABLE IF NOT EXISTS response_fields (
  id INT AUTO_INCREMENT PRIMARY KEY,
  metodo VARCHAR(10) NOT NULL COMMENT 'HTTP method',
  url VARCHAR(2048) NOT NULL COMMENT 'API URL',
  endpoint VARCHAR(512) NOT NULL COMMENT 'Endpoint path',
  campo VARCHAR(512) NOT NULL COMMENT 'Field path (e.g., data.user.name)',
  detalhes TEXT NOT NULL COMMENT 'Field details: [type] e.g.: value',
  tipo VARCHAR(50) NOT NULL DEFAULT 'Response' COMMENT 'Field type: Body, Query Params, Response',
  title VARCHAR(255) DEFAULT NULL COMMENT 'Optional title/description',
  descricao TEXT DEFAULT NULL COMMENT 'AI-generated description',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_metodo_endpoint (metodo, endpoint(255)),
  INDEX idx_descricao_null (descricao(1)),
  INDEX idx_campo (campo(255))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================
-- Table: request_groups
-- Stores groups of API requests (e.g., Postman collections)
-- ================================================================
CREATE TABLE IF NOT EXISTS request_groups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE COMMENT 'Group name (collection name)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================
-- Table: group_requests
-- Stores individual requests within groups
-- ================================================================
CREATE TABLE IF NOT EXISTS group_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL COMMENT 'FK to request_groups',
  endpoint_id INT NOT NULL COMMENT 'FK to endpoints',
  body TEXT DEFAULT NULL COMMENT 'Request body (JSON)',
  title VARCHAR(255) DEFAULT NULL COMMENT 'Request title',
  order_index INT NOT NULL DEFAULT 0 COMMENT 'Order within the group',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES request_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (endpoint_id) REFERENCES endpoints(id) ON DELETE CASCADE,
  INDEX idx_group_id (group_id),
  INDEX idx_endpoint_id (endpoint_id),
  INDEX idx_order (group_id, order_index)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================
-- Table: ai_provider_settings
-- Stores AI provider rate limit configurations
-- ================================================================
CREATE TABLE IF NOT EXISTS ai_provider_settings (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()) COMMENT 'UUID primary key',
  provider VARCHAR(50) NOT NULL UNIQUE COMMENT 'AI provider: ollama, gemini, groq, openrouter',
  is_active BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Is this the active provider',
  rpm_enabled BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Requests per minute limit enabled',
  rpm_limit INT NOT NULL DEFAULT 0 COMMENT 'Max requests per minute',
  current_rpm INT NOT NULL DEFAULT 0 COMMENT 'Current requests this minute',
  last_reset_minute BIGINT NOT NULL DEFAULT 0 COMMENT 'Timestamp of last RPM reset',
  rpd_enabled BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Requests per day limit enabled',
  rpd_limit INT NOT NULL DEFAULT 0 COMMENT 'Max requests per day',
  current_rpd INT NOT NULL DEFAULT 0 COMMENT 'Current requests today',
  last_reset_day VARCHAR(10) NOT NULL DEFAULT '' COMMENT 'Date of last RPD reset (YYYY-MM-DD)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_provider (provider),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================
-- Table: field_dictionary
-- Stores field dictionary imported from Excel
-- ================================================================
CREATE TABLE IF NOT EXISTS field_dictionary (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_element_name VARCHAR(255) NOT NULL COMMENT 'Business element name',
  description TEXT DEFAULT NULL COMMENT 'Field description',
  reference_scots_table VARCHAR(255) DEFAULT NULL COMMENT 'Reference to SCOTS table',
  json_path VARCHAR(512) DEFAULT NULL COMMENT 'JSON path',
  element_name VARCHAR(255) DEFAULT NULL COMMENT 'Element name',
  element_type VARCHAR(100) DEFAULT NULL COMMENT 'Element type',
  json_data_type VARCHAR(100) DEFAULT NULL COMMENT 'JSON data type',
  example TEXT DEFAULT NULL COMMENT 'Example value',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_business_element (business_element_name),
  INDEX idx_json_path (json_path(255)),
  INDEX idx_element_name (element_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================
-- Default Data (Optional)
-- ================================================================

-- Insert default AI provider settings (optional, can be created at runtime)
-- INSERT INTO ai_provider_settings (provider, is_active, rpm_enabled, rpm_limit, rpd_enabled, rpd_limit, last_reset_day) VALUES
-- ('ollama', FALSE, FALSE, 0, FALSE, 0, CURDATE()),
-- ('gemini', TRUE, TRUE, 10, TRUE, 50, CURDATE()),
-- ('groq', FALSE, TRUE, 30, TRUE, 14400, CURDATE()),
-- ('openrouter', FALSE, TRUE, 20, TRUE, 200, CURDATE())
-- ON DUPLICATE KEY UPDATE provider = provider;

-- ================================================================
-- Schema Information
-- ================================================================
-- Total Tables: 6
-- - endpoints: API endpoint definitions
-- - response_fields: Extracted field data from responses
-- - request_groups: Collection/group definitions
-- - group_requests: Individual requests in groups (with FK constraints)
-- - ai_provider_settings: AI rate limit configuration
-- - field_dictionary: Excel imported field dictionary
-- ================================================================
