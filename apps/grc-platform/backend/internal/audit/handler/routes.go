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

// Package handler contains the HTTP handlers for the Audit Hub module.
package handler

import (
	"net/http"

	auditservice "github.com/wso2-open-operations/grc-platform/backend/internal/audit/service"
)

// Deps holds all service dependencies for Audit Hub handlers.
// Handlers call service methods; services call repositories.
type Deps struct {
	Audit        auditservice.AuditService
	Control      auditservice.ControlService
	Framework    auditservice.FrameworkService
	User         auditservice.UserService
	Evidence     auditservice.EvidenceService
	Population   auditservice.PopulationService
	Comment      auditservice.CommentService
	Review       auditservice.ReviewService
	Notification auditservice.NotificationService
	Assignment   auditservice.AssignmentService
	Trail        auditservice.TrailService
}

// RegisterRoutes mounts all Audit Hub routes onto mux.
func RegisterRoutes(mux *http.ServeMux, deps Deps) {
	ah := &auditHandler{svc: deps.Audit}
	ch := &controlHandler{svc: deps.Control}
	fh := &frameworkHandler{svc: deps.Framework}
	uh := &userHandler{svc: deps.User}

	// Lookup data for Create Audit form dropdowns.
	mux.HandleFunc("GET /api/v1/audit/frameworks", fh.listFrameworks)
	mux.HandleFunc("POST /api/v1/audit/frameworks", fh.createFramework)
	mux.HandleFunc("GET /api/v1/audit/products", fh.listProducts)
	mux.HandleFunc("POST /api/v1/audit/products", fh.createProduct)
	mux.HandleFunc("GET /api/v1/audit/users", uh.listUsers)

	// Audit CRUD.
	mux.HandleFunc("GET /api/v1/audits", ah.listAudits)
	mux.HandleFunc("POST /api/v1/audits", ah.createAudit)
	mux.HandleFunc("GET /api/v1/audits/{id}", ah.getAudit)
	mux.HandleFunc("PUT /api/v1/audits/{id}", ah.updateAudit)

	// Control CRUD + status transitions.
	// Note: /bulk must be registered before /{controlId} so the router matches it first.
	mux.HandleFunc("GET /api/v1/audits/{id}/controls", ch.listControls)
	mux.HandleFunc("POST /api/v1/audits/{id}/controls", ch.addControl)
	mux.HandleFunc("POST /api/v1/audits/{id}/controls/bulk", ch.bulkAddControls)
	mux.HandleFunc("GET /api/v1/audits/{id}/controls/{controlId}", ch.getControl)
	mux.HandleFunc("PUT /api/v1/audits/{id}/controls/{controlId}", ch.updateControl)
	mux.HandleFunc("DELETE /api/v1/audits/{id}/controls/{controlId}", ch.deleteControl)
	mux.HandleFunc("PATCH /api/v1/audits/{id}/controls/{controlId}/status", ch.updateControlStatus)
}
