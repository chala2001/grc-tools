// Copyright (c) 2026 WSO2 LLC. (https://www.wso2.com).
//
// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.

package config

import (
	"log/slog"
	"os"
	"time"
)

// Config holds all application configuration loaded from environment variables.
type Config struct {
	Port  string
	DB    DBConfig
	Auth  AuthConfig
	Azure AzureConfig
}

type DBConfig struct {
	DSN string
}

type AuthConfig struct {
	JWKSEndpoint          string
	Issuer                string
	Audience              string
	ClockSkew             time.Duration
	TokenValidatorEnabled bool
}

// AzureConfig holds Azure Blob Storage credentials used for evidence file uploads.
type AzureConfig struct {
	StorageAccountName string
	StorageAccountKey  string
	ContainerName      string
}

// Load reads configuration from environment variables.
// Required variables that are absent cause the process to exit at startup.
// AUTH_JWKS_ENDPOINT, AUTH_ISSUER, and AUTH_AUDIENCE are only required when
// AUTH_TOKEN_VALIDATOR_ENABLED is true (the default). They are not needed for
// local development (set AUTH_TOKEN_VALIDATOR_ENABLED=false).
func Load() Config {
	tokenValidatorEnabled := os.Getenv("AUTH_TOKEN_VALIDATOR_ENABLED") != "false"

	authCfg := AuthConfig{
		ClockSkew:             5 * time.Second,
		TokenValidatorEnabled: tokenValidatorEnabled,
	}
	if tokenValidatorEnabled {
		authCfg.JWKSEndpoint = mustEnv("AUTH_JWKS_ENDPOINT")
		authCfg.Issuer = mustEnv("AUTH_ISSUER")
		authCfg.Audience = mustEnv("AUTH_AUDIENCE")
	}

	return Config{
		Port: envOrDefault("PORT", ":8080"),
		DB: DBConfig{
			DSN: mustEnv("DB_DSN"),
		},
		Auth: authCfg,
		Azure: AzureConfig{
			StorageAccountName: os.Getenv("AZURE_STORAGE_ACCOUNT_NAME"),
			StorageAccountKey:  os.Getenv("AZURE_STORAGE_ACCOUNT_KEY"),
			ContainerName:      os.Getenv("AZURE_STORAGE_CONTAINER"),
		},
	}
}

func mustEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		slog.Error("required environment variable is not set", "key", key)
		os.Exit(1)
	}
	return v
}

func envOrDefault(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
