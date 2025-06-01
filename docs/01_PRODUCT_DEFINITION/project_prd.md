# Product Requirements Document: SAMATRANSPORT Ecosystem

## 1. Introduction

**1.1. Project Vision:**
To develop an integrated ecosystem of web and mobile applications, SAMATRANSPORT, aimed at modernizing the operations of passenger and freight road transport companies in West Africa.

**1.2. Company:**
DigitalBridge (Based in Côte d'Ivoire, West Africa)

**1.3. Mission:**
Initially focused on software design for businesses and governments across various sectors (Transport, Health, Agriculture, Livestock, Education). Currently oriented towards the SAMATRANSPORT ecosystem.

**1.4. Primary Objective:**
To provide a complete digital solution to optimize management, improve operational efficiency, secure revenues, enhance fleet maintenance, and offer a superior customer experience for road transport companies.

**1.5. Core Principles:**
*   **Deep Integration:** Fluid sharing of relevant data between all applications in the ecosystem.
*   **Real-Time Data:** Access to updated information to facilitate decision-making and optimize operations.
*   **Optimal User Experience:** Intuitive and easy-to-use interfaces for all user profiles (customers, agents, administrators).
*   **Advanced Security:** Rigorous data protection, fine-grained access rights management, and complete traceability of actions.
*   **Local Context Adaptation:** Multilingual support (French, English initially), multi-currency management (XOF, GNF, LRD, SLL, EUR, USD with centralized exchange rates), and features adapted to connectivity constraints (offline modes).

## 2. Target Users

The SAMATRANSPORT ecosystem caters to various user profiles:
*   **Administrators & System Managers:** (Primarily Application "Control") For system configuration, data management, and overall supervision.
*   **Company Management & Supervisors:** (Primarily Application "Control" & "Finance") For operational oversight, financial analysis, and strategic decision-making.
*   **Agency Staff (Guichet Agents, Agency Heads):** (Primarily Application "Guichet") For ticket sales, passenger and baggage registration, departure management.
*   **Customers (Passengers & Shippers):** (Primarily Application "Site Web & Espace Client") For online booking, information, shipment tracking.
*   **Logistics & Courier Staff:** (Primarily Application "Courrier" & "Mobile Agent") For parcel management, tracking, and delivery.
*   **Financial Analysts & Accountants:** (Primarily Application "Finance") For financial consolidation, analysis, and reporting.
*   **Mobile Field Staff (Drivers, Controllers, Delivery Agents):** (Primarily Application "Mobile Agent" - future) For on-the-ground operations, data collection, and communication.

## 3. Ecosystem Architecture & Structure

SAMATRANSPORT is a suite of modular applications. Each application fulfills a specific role while actively communicating with others via robust internal APIs. A centralized system, primarily managed by the "Application Control," ensures the management of:
*   **Master Data:** Routes, schedules, fleet, tariffs (passenger, baggage, parcel), agencies, users, policies (cancellation, refund, loyalty), currencies, and exchange rates.
*   **Authentication and Permissions:** A unified system for agent identification and access control.
*   **Synchronization:** Ensuring consistency of critical data (e.g., seat availability) across interfaces.

The ecosystem is developed within a **monorepo architecture** managed with pnpm workspaces, structured as follows:
*   `apps/`: Individual frontend applications (Next.js). Includes `control-app`, `guichet-app`, `site-web-client-app`, and future `courrier-app`, `finance-app`.
*   `packages/`: Shared libraries and configurations.
    *   `ui/`: SAMATRANSPORT Design System (React components, Tailwind CSS, Storybook).
    *   `lib-core/`: Utilities, shared business logic, TypeScript types, i18n, API wrappers.
    *   Shared ESLint, Prettier, and TypeScript configurations.
*   `supabase/`: Backend configuration and code (Edge Functions, database migrations, seeding, tests).
*   `docs/`: Project documentation (PRD, architecture, conventions, functional specs).
*   Root configuration files for monorepo management, code quality, and Git hooks.

## 4. Application Components & Key Features

### 4.1. Application "Control" (Admin & Command Center)

*   **Primary Role:** Central platform for configuration, global administration, operational supervision, master data management, and fleet management.
*   **Key Features:**
    *   **Master Data Management:**
        *   Agencies: Details, operational currency.
        *   Routes: Stops, distances, times.
        *   Schedules.
        *   Vehicle Types: Standard/VIP, capacities.
        *   Fleet: Vehicle information, agency assignment.
        *   Currencies & Exchange Rates: Centralized management with defined update sources and frequencies.
    *   **User & Permission Management:**
        *   Agent account creation and management (all roles).
        *   Detailed role and permission configuration per application/feature.
    *   **Business Rule Configuration:**
        *   Tariff Policies: Passengers, baggage, parcels.
        *   Promotional Policies.
        *   Cancellation, Modification, and Refund Rules.
        *   Loyalty Program: Thresholds, rewards.
    *   **Planning & Operations:**
        *   Assignment of vehicles and crew to planned departures.
        *   Intelligent crew scheduling (constraint management).
        *   Centralized GPS fleet tracking visualization (if sensors available).
    *   **Fleet Management System (FMS):**
        *   Digital maintenance log per vehicle (oil changes, revisions, technical controls).
        *   Preventive maintenance planning and alerts (mileage/time-based).
        *   Repair order management (breakdown tracking, parts used, costs).
        *   Spare parts inventory management (low stock alerts).
        *   Intervention and cost history per vehicle.
    *   **Supervision & Security:**
        *   Operational Dashboard: Overview (occupancy rates, punctuality, incidents).
        *   Reported incident management (field/customers).
        *   Refund and compensation management (per established rules).
        *   Immutable Audit Log: Traceability of all sensitive data modifications. Physical deletion of critical transactions (tickets, parcels) avoided in favor of traced invalidation/cancellation.
        *   Supplier Management (parts, services).
        *   Basic HR Management: Driver and staff information for planning.
*   **Key Integrations:** Provides master data, configuration, rules, and permissions to ALL other applications. Receives statuses, incident reports, and maintenance data for consolidation.

### 4.2. Application "Site Web & Espace Client" (Public & Customer Portal)

*   **Primary Role:** Company's digital showcase, autonomous online sales channel, and personalized customer space.
*   **Key Features:**
    *   Public Site: Dynamic homepage, destination presentation (interactive map), services, fleet details (360° virtual tour), news/promotions, About Us, FAQ. Multilingual (FR/EN).
    *   Secure Customer Area: Account creation/management.
    *   Ticket Booking & Purchase: Route/date/passenger selection (Standard/VIP), REAL-TIME interactive seat selection (synchronized with "Guichet"), online payment (integrated gateways), multi-currency display, electronic tickets (QR code, email, online).
    *   Travel & Booking History.
    *   Loyalty Program Tracking.
    *   Online Cancellation/Modification Management (per "Control" rules).
    *   Schedule & Tariff Consultation.
    *   Feedback & Complaint Module.
    *   Notifications (confirmation, reminder, delay/cancellation alerts via Email/SMS).
    *   Simplified Parcel Tracking (via "Courrier" App).
*   **Key Integrations:** Reads data (schedules, tariffs, fleet) from "Control". Reads/writes seat availability in sync with "Guichet". Writes reservations and customer data. Sends revenue data to "Finance". Reads parcel statuses from "Courrier".

### 4.3. Application "Guichet" (Physical Point of Sale & Agency Operations)

*   **Primary Role:** Main tool for agency agents for ticket sales, registration (passengers, baggage), departure management, and direct customer interaction.
*   **Key Features:**
    *   Ticket Sales: Optimized interface, access to schedules/routes/tariffs (from "Control"), REAL-TIME seat selection (synced with "Site Web"), group booking, multi-payment cashing, optional physical ticket/receipt printing.
    *   Passenger & Manifest Management: Manifest creation, check-in, seat/departure reassignment.
    *   Baggage Registration: Information entry, fee calculation/cashing (per "Control" rules), label/receipt generation.
    *   Cash Desk Management: Session opening/closing, payment tracking, end-of-day reconciliation.
    *   Departure Operations: Departure-related expense entry (fuel, road fees), vehicle alert consultation. Rapid passenger reassignment if needed.
    *   **Robust Offline Mode:** Essential sales/baggage recording without connection, auto-sync upon network return.
    *   Multi-Terminal Synchronization: Data consistency within an agency.
*   **Key Integrations:** Reads data from "Control". Reads/writes seat availability in sync with "Site Web". Writes sales, baggage registrations, departure expenses. Sends financial data to "Finance". Sends manifests to "Control" and "Mobile Agent".

### 4.4. Application "Courrier" (Parcel Expedition Management)

*   **Primary Role:** Manage the entire lifecycle of parcels from registration to tracking and delivery.
*   **Key Features:**
    *   Parcel Registration: Shipper/receiver info, destination, parcel nature, declared value, dimensions/weight. Automatic fee calculation (per "Control" rules).
    *   Document Generation: Receipts, labels (QR code/unique ID), shipping manifests.
    *   Parcel Status Tracking: Updates (Registered, In-transit, Arrived, Delivered, Incident) via "Mobile Agent" scans or manually.
    *   Automatic Notifications: SMS/WhatsApp/Email to customers at key stages.
    *   Electronic Proof of Delivery: Signature/photo capture via "Mobile Agent".
    *   Parcel-related Claim & Incident Management.
    *   Complete parcel movement history.
    *   Optional Parcel Insurance.
    *   Shipper Loyalty Program.
*   **Key Integrations:** Reads data (destinations, parcel tariffs) from "Control". Writes parcel data and statuses. Sends financial data to "Finance". Interacts heavily with "Mobile Agent" for scans and proof of delivery. Provides statuses for "Site Web" consultation.

### 4.5. Application "Gestion Financière & Analyse" (Financial Management & Analysis)

*   **Primary Role:** Consolidate financial data, analyze performance and profitability, and support strategic decision-making.
*   **Key Features:**
    *   Centralized Analytical Dashboard: Overview of revenues, expenses, profits (by period, agency, line, vehicle). KPIs (cost/km, revenue/seat).
    *   Automatic Data Integration:
        *   Revenues: Ticketing ("Site Web", "Guichet"), Baggage ("Guichet"), Parcels ("Courrier").
        *   Expenses: Maintenance/Fuel ("Control"), Departure Expenses ("Guichet"), Salaries, Others.
    *   Detailed Profitability Analysis.
    *   Financial Reporting: Income statements, cash flow tracking, detailed sales reports.
    *   Budget Management: Definition, actual vs. budget comparison, overrun alerts.
    *   Compliance Tracking: Expiry alerts (licenses, insurance, technical controls - via "Control").
    *   Accounting Exports: Standard formats (CSV, Excel) or API to third-party software.
    *   Financial Anomaly Alerts.
*   **Key Integrations:** Collects and consolidates financial data from "Site Web", "Guichet", "Courrier", and "Control". Provides aggregated reports and analyses.

### 4.6. Application "Mobile Agent" (Android Mobile App - Future Development)

*   **Primary Role:** Equip mobile staff (controllers, drivers, delivery agents) for improved efficiency, communication, and real-time field data collection.
*   **Key Features (Role-based):**
    *   All Users: Secure authentication, simple communication with "Control".
    *   Controller: QR code scanning (tickets, baggage/parcel labels), manifest consultation, boarding/loading validation, incident reporting.
    *   Driver: Route sheet consultation, journey stage reporting (departure, breaks, arrival), simplified expense entry (fuel, tolls), vehicle incident/breakdown reporting.
    *   Delivery Agent (Courier): Parcel scanning (loading, delivery), proof of delivery capture (signature/photo), parcel status updates.
    *   **Offline Mode:** Essential functions with data sync on reconnection.
*   **Key Integrations:** Reads data (manifests, route sheets) from "Control", "Guichet", "Courrier". Writes statuses (boarding, delivery, journey), incident reports, driver expenses, proofs of delivery to relevant applications.

## 5. Transversal Principles & Functionalities

*   **Multilingual Support (FR/EN):** User interfaces, generated documents, customer communications.
*   **Multi-currency Management:** Centralized administration ("Control") of operational currencies (per agency) and exchange rates for conversions and reporting.
*   **Global Security:** Centralized authentication, fine-grained role/permission management, OWASP threat protection, data encryption, audit logs.
*   **Integrated Reporting:** Basic reporting in each module, with advanced consolidation/analysis in "Finance" App.
*   **API-Oriented Architecture:** Facilitates internal integration and future evolutions.
*   **Offline Strategy:** Specific design for critical modules ("Guichet", "Mobile Agent") for operational continuity.

## 6. Data Flows and Integration Mechanisms

The ecosystem relies on well-defined data flows and integration mechanisms:

*   **Application "Control" as the master data source:** Provides master data (routes, schedules, tariffs, etc.) to other applications via REST APIs (API Gateway).
*   **Real-time Seat Synchronization (Site Web ↔ Guichet):** Critical bidirectionalfFlow using WebSockets via a Real-Time Synchronization Service to prevent double bookings.
*   **Parcel Tracking (Courrier ↔ Mobile Agent):** Bidirectional flow for status updates using REST APIs with offline support.
*   **Financial Data Consolidation:** The "Finance" application receives financial data from "Site Web", "Guichet", "Courrier", and "Control", primarily via an Event Bus.

**Key Communication Mechanisms:**
*   **REST API via API Gateway:** Synchronous communication for master data, CRUD operations. (JSON, JWT, Zod validation).
*   **WebSockets via Real-Time Synchronization Service:** Bidirectional real-time communication (Socket.io, Redis Pub/Sub).
*   **Event Bus:** Asynchronous event-based communication for business event propagation, financial data consolidation (Redis Streams or AWS EventBridge).
*   **Offline Mode with Deferred Synchronization:** For "Guichet" and "Mobile Agent" (IndexedDB/SQLite, queue, conflict resolution).

**Centralized Integration Services:**
*   **API Gateway:** Single entry point, unified API management, authentication, monitoring, routing.
*   **Real-Time Synchronization Service:** Manages WebSocket communication and data consistency for features like seat availability.
*   **Centralized Authentication Service:** Manages users, roles, SSO (NextAuth.js / Auth.js).
*   **Event Bus:** Facilitates asynchronous, decoupled communication.

## 7. Architectural Validation & Recommendations (Summary from Cahier des Charges)

*   **Alignment with Guiding Principles:** Confirmed.
*   **Strengths:** Strategic centralization, diverse integration mechanisms, resilience considerations, technological coherence, integrated security.
*   **Potential Improvement Points & Risks (from Cahier des Charges):**
    *   Complexity of real-time synchronization (booking conflicts).
    *   Dependency on "Application Control" (potential single point of failure).
    *   Complexity of offline mode (sync conflicts).
    *   Distributed monitoring complexity.
    *   Technical constraints for "Mobile Agent" evolution.
*   **Recommendations (from Cahier des Charges):**
    *   Optimize real-time sync (locking, conflict resolution strategies, load testing).
    *   Reinforce "Control" app resilience (HA, caching, multi-region considerations).
    *   Improve offline mode (automated tests, documentation, data reconciliation).
    *   Implement centralized monitoring (event correlation, distributed tracing, global health dashboards).
    *   Adopt a progressive approach for "Mobile Agent" (prototyping, real-world validation).

This PRD is based on the "Cahier des charges pour l'écosystème SAMATRANSPORT" provided. It aims to capture the core requirements and vision for the project. Further detailed functional specifications for each feature and module would be developed based on this document.
