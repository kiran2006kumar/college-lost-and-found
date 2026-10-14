# LostLink System Design

## Architecture

```mermaid
flowchart LR
  Browser[React + TypeScript SPA] -->|JSON REST / Bearer JWT| API[FastAPI]
  API --> ORM[SQLAlchemy]
  ORM --> DB[(MySQL 8)]
  API --> Match[TF-IDF-style text + attribute matcher]
  Match --> DB
  API --> Media[Validated local image storage]
  API --> Mail[Optional email provider]
```

The browser never receives password hashes, private claim evidence, or reporter email addresses in public item responses. The API validates ownership/role on every protected operation. Similarity is a suggestion only; a human must verify ownership.

## Relational Model

```mermaid
erDiagram
  USERS ||--o{ ITEMS : reports
  USERS ||--o{ CLAIMS : submits
  ITEMS ||--o{ CLAIMS : receives
  USERS o|--o{ CLAIMS : reviews
  ITEMS ||--o{ MATCHES : lost_or_found_pair
  USERS ||--o{ NOTIFICATIONS : receives
  USERS o|--o{ AUDIT_LOGS : acts
  CONTACT_MESSAGES { string id PK string name string email string subject text message string status datetime created_at }
  USERS { string id PK string email UK string password_hash string role boolean is_active datetime created_at }
  ITEMS { string id PK string reporter_id FK string item_type string title string description string category string color string location date event_date string image_path string status datetime created_at datetime updated_at }
  CLAIMS { string id PK string item_id FK string claimant_id FK string reviewer_id FK text private_evidence string status datetime created_at datetime updated_at }
  MATCHES { string id PK string lost_item_id FK string found_item_id FK float text_score float image_score float final_score json explanation string review_status datetime created_at }
  NOTIFICATIONS { string id PK string user_id FK string title string message boolean is_read datetime created_at }
  AUDIT_LOGS { string id PK string actor_id FK string action string affected_type string affected_id json details datetime created_at }
```

Users referenced by reports/claims use `RESTRICT` deletion so historical ownership is not silently destroyed. Item deletion cascades its claims/matches; notification item references and audit actors use `SET NULL`. Email is unique; role/status values and match score ranges are constrained; browse, review, notification, and match ranking columns are indexed. Contact requests are stored in a separate moderation queue and visible only to administrators.

## Use Case

```mermaid
flowchart TD
  Student[Student or staff] --> Auth[Register or sign in]
  Auth --> Report[Create lost/found report]
  Report --> Match[Review possible matches]
  Match --> Claim[Submit private recovery evidence]
  Claim --> Review[Reporter or admin reviews claim]
  Review -->|Approved| Handover[Arrange safe handover]
  Handover --> Complete[Confirm return]
  Review -->|Rejected| Close[Notify claimant]
```

## Data Flow

```mermaid
sequenceDiagram
  participant U as Student
  participant W as React UI
  participant A as FastAPI
  participant D as MySQL
  U->>W: Submit report
  W->>A: POST /api/items (JWT)
  A->>A: Validate input and ownership
  A->>D: Insert report and compare opposite-type reports
  A->>D: Store ranked match suggestions and notifications
  A-->>W: Public-safe report response
  W-->>U: Show report and possible matches
```

## Matching Evaluation

The initial matcher is deterministic and interpretable: cosine similarity on normalized, IDF-weighted tokens plus category, color, location-token overlap, and event-date proximity. It returns a normalized 0–100 ranking and contributing signals. Report owners may confirm or reject a suggestion; that feedback does not establish ownership or approve a claim. `backend/tests/test_matching.py` covers baseline behavior; precision/recall/F1 still require a labeled campus dataset and are intentionally not fabricated here.

## Project Report Outline

1. Abstract and problem statement
2. Existing campus recovery process and requirements
3. Architecture, threat model, and ER design
4. API and UI implementation
5. Matching approach and labeled-data evaluation
6. Security, accessibility, and test strategy
7. Deployment, limitations, and future work

## Future Enhancements

- Add a college-approved email verification and password-reset provider.
- Add object storage, image re-encoding, malware scanning, and signed private media URLs.
- Move authentication rate limits to a shared Redis-backed store for multi-instance deployments.
- Add image embeddings only after privacy review and a representative evaluation set exist.
- Add claim-message auditing, campus-office custody handoff, and reviewed match feedback.
- Deploy behind HTTPS with managed secrets, backups, monitoring, and retention policies.
