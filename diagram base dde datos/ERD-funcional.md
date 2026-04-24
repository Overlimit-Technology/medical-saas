# ERD funcional de base de datos

Fuente de verdad: `prisma/schema.prisma`

Este diagrama incluye solo las tablas funcionales que usamos en la aplicacion y excluye tablas tecnicas de autenticacion e infraestructura como `Account`, `Session`, `VerificationToken` y `_prisma_migrations`.

## Resumen

- `User` y `UserProfile` representan usuarios y sus datos personales.
- `Clinic`, `ClinicMembership` y `ClinicSettings` modelan la estructura multi-clinica.
- `Patient`, `Appointment`, `ClinicalVisit`, `Observation`, `ClinicalRecord` y sus tablas relacionadas cubren la operacion clinica.
- `Treatment`, `PatientTreatment` y `PaymentHistory` cubren tratamientos y pagos.
- `LeadColumn`, `CrmLead` y sus tablas hijas cubren el CRM.
- `InternalAlert` y `InternalAlertRecipient` cubren alertas internas.
- `FhirLink`, `CashMovement` y `AuditLog` cubren integracion, caja y auditoria.

## Mermaid ERD

```mermaid
erDiagram
    User {
        string id PK
        string email UK
        string name
        string image
        datetime emailVerified
        string passwordHash
        boolean mustChangePassword
        enum role
        boolean isSuperAdmin
        string[] permissions
        enum status
        datetime createdAt
        datetime updatedAt
        datetime lastLoginAt
    }

    UserProfile {
        string id PK
        string userId FK UK
        string firstName
        string lastName
        string phone
        string rut UK
        datetime createdAt
        datetime updatedAt
    }

    Clinic {
        string id PK
        string name
        string city
        boolean isActive
        datetime createdAt
        datetime updatedAt
    }

    ClinicSettings {
        string id PK
        string clinicId FK UK
        json statusColors
        datetime createdAt
        datetime updatedAt
    }

    ClinicMembership {
        string id PK
        string userId FK
        string clinicId FK
        enum status
        datetime createdAt
        datetime updatedAt
    }

    Patient {
        string id PK
        string clinicId FK
        string firstName
        string lastName
        string secondLastName
        string run
        string runNormalized
        string email
        string phone
        datetime birthDate
        string gender
        string address
        string city
        string emergencyContactName
        string emergencyContactPhone
        boolean isActive
        datetime createdAt
        datetime updatedAt
    }

    DoctorProfile {
        string id PK
        string userId FK UK
        string rut
        string rutNormalized UK
        string specialty
        string bio
        boolean isActive
        datetime createdAt
        datetime updatedAt
    }

    Box {
        string id PK
        string clinicId FK
        string name
        boolean isActive
        datetime createdAt
        datetime updatedAt
    }

    Appointment {
        string id PK
        string clinicId FK
        string patientId FK
        string doctorId FK
        string boxId FK
        string createdBy FK
        datetime startAt
        datetime endAt
        enum status
        enum paymentStatus
        string notes
        datetime createdAt
        datetime updatedAt
    }

    Treatment {
        string id PK
        string name UK
        decimal price
    }

    PatientTreatment {
        string id PK
        string patientId FK
        string treatmentId FK
        datetime performedAt
        datetime createdAt
        datetime updatedAt
    }

    PaymentHistory {
        string id PK
        string patientTreatmentId FK
        string appointmentId FK UK
        datetime recordedAt
        enum status
        decimal amount
        string notes
        datetime createdAt
        datetime updatedAt
    }

    ClinicalVisit {
        string id PK
        string clinicId FK
        string patientId FK
        string doctorId FK
        string appointmentId FK
        datetime startedAt
        datetime createdAt
    }

    Observation {
        string id PK
        string clinicId FK
        string patientId FK
        string doctorId FK
        string clinicalVisitId FK
        enum status
        string code
        string codeSystem
        string codeDisplay
        string categoryCode
        string categorySystem
        string categoryDisplay
        enum valueType
        string valueString
        float valueQuantity
        boolean valueBoolean
        string valueUnit
        datetime effectiveAt
        datetime issuedAt
        string notes
        datetime createdAt
        datetime updatedAt
    }

    FormTemplate {
        string id PK
        string clinicId FK
        string name
        string description
        boolean isActive
        datetime createdAt
        datetime updatedAt
    }

    FormTemplateField {
        string id PK
        string templateId FK
        string label
        enum fieldType
        int position
        boolean isRequired
        string options
        string defaultValue
    }

    ClinicalRecord {
        string id PK
        string clinicId FK
        string appointmentId FK
        string templateId FK
        string patientId FK
        string doctorId FK
        datetime createdAt
        datetime updatedAt
    }

    ClinicalRecordValue {
        string id PK
        string clinicalRecordId FK
        string fieldId FK
        string value
    }

    InternalAlert {
        string id PK
        string clinicId FK
        string createdById FK
        string doctorId FK
        enum eventType
        string title
        string message
        string referenceType
        string referenceId
        datetime createdAt
        datetime updatedAt
    }

    InternalAlertRecipient {
        string id PK
        string alertId FK
        string userId FK
        enum deliveryStatus
        string deliveryError
        datetime deliveredAt
        datetime readAt
        datetime createdAt
        datetime updatedAt
    }

    FhirLink {
        string id PK
        string clinicId FK
        enum resourceType
        string internalId
        string fhirId
        string identifierSystem
        string identifierValue
        string identifierKey
        datetime createdAt
        datetime updatedAt
    }

    LeadColumn {
        string id PK
        string clinicId FK
        string name
        string color
        int position
        datetime createdAt
        datetime updatedAt
    }

    CrmLead {
        string id PK
        string clinicId FK
        string columnId FK
        string assignedDoctorId FK
        string name
        string company
        string channel
        string phone
        string email
        string sector
        string priority
        decimal estimatedBudget
        string mainNote
        json tags
        json scrapedData
        boolean archived
        boolean converted
        string convertedPatientId
        datetime followUpDate
        datetime createdAt
        datetime updatedAt
    }

    CrmLeadNote {
        string id PK
        string leadId FK
        string text
        datetime createdAt
    }

    CrmLeadMessage {
        string id PK
        string leadId FK
        string text
        string direction
        string channel
        string attachmentUrl
        string attachmentName
        datetime createdAt
    }

    CrmLeadActivity {
        string id PK
        string leadId FK
        string type
        string fromValue
        string toValue
        string userId
        string userName
        datetime createdAt
    }

    CashMovement {
        string id PK
        string clinicId FK
        string createdById FK
        enum type
        string description
        decimal amount
        datetime recordedAt
        datetime createdAt
        datetime updatedAt
    }

    AuditLog {
        string id PK
        datetime occurredAt
        string event
        string author
        string detail
    }

    User ||--o| UserProfile : has_profile
    User ||--o| DoctorProfile : has_doctor_profile
    User ||--o{ ClinicMembership : belongs_to
    Clinic ||--o| ClinicSettings : has_settings
    Clinic ||--o{ ClinicMembership : groups_users

    Clinic ||--o{ Patient : has_patients
    Clinic ||--o{ Box : has_boxes
    Clinic ||--o{ Appointment : schedules
    Clinic ||--o{ ClinicalVisit : registers_visits
    Clinic ||--o{ Observation : stores_observations
    Clinic ||--o{ FormTemplate : owns_templates
    Clinic ||--o{ ClinicalRecord : stores_records
    Clinic ||--o{ InternalAlert : emits_alerts
    Clinic ||--o{ FhirLink : maps_resources
    Clinic ||--o{ LeadColumn : owns_lead_columns
    Clinic ||--o{ CrmLead : owns_leads
    Clinic ||--o{ CashMovement : registers_cash_movements

    Patient ||--o{ Appointment : books
    User ||--o{ Appointment : acts_as_doctor
    User ||--o{ Appointment : created_appointment
    Box ||--o{ Appointment : hosts

    Patient ||--o{ PatientTreatment : receives
    Treatment ||--o{ PatientTreatment : catalogues
    PatientTreatment ||--o{ PaymentHistory : generates
    Appointment ||--o| PaymentHistory : payment_record

    Patient ||--o{ ClinicalVisit : attends
    User ||--o{ ClinicalVisit : performs
    Appointment ||--o{ ClinicalVisit : may_origin

    Patient ||--o{ Observation : has
    User ||--o{ Observation : records
    ClinicalVisit ||--o{ Observation : contains

    FormTemplate ||--o{ FormTemplateField : defines
    Appointment ||--o{ ClinicalRecord : produces
    FormTemplate ||--o{ ClinicalRecord : structures
    Patient ||--o{ ClinicalRecord : owns
    User ||--o{ ClinicalRecord : authored_by
    ClinicalRecord ||--o{ ClinicalRecordValue : contains
    FormTemplateField ||--o{ ClinicalRecordValue : captures

    User ||--o{ InternalAlert : creates
    User ||--o{ InternalAlert : targets_doctor
    InternalAlert ||--o{ InternalAlertRecipient : has_recipients
    User ||--o{ InternalAlertRecipient : receives

    LeadColumn ||--o{ CrmLead : categorizes
    User ||--o{ CrmLead : assigned_doctor
    CrmLead ||--o{ CrmLeadNote : has_notes
    CrmLead ||--o{ CrmLeadMessage : has_messages
    CrmLead ||--o{ CrmLeadActivity : has_activity

    User ||--o{ CashMovement : created_cash_movement
```

## Notas de modelado

- `UserProfile.userId` y `DoctorProfile.userId` son `@unique`, por eso ambas relaciones con `User` son `One-to-One`.
- `ClinicSettings.clinicId` es `@unique`, por eso `Clinic` a `ClinicSettings` es `One-to-One`.
- `ClinicMembership` funciona como tabla pivote entre `User` y `Clinic`, con restriccion `@@unique([userId, clinicId])`.
- `PaymentHistory.appointmentId` es opcional pero `@unique`, por eso un `Appointment` puede tener como maximo un registro de pago asociado.
- `ClinicalVisit.appointmentId` es opcional y no es unico, asi que un `Appointment` puede derivar en multiples visitas si el flujo lo permite.
- `ClinicalRecordValue` es tabla de detalle para valores capturados por campo y usa `@@unique([clinicalRecordId, fieldId])` para evitar duplicados por campo.
- `CrmLead` pertenece a una `Clinic` y a una `LeadColumn`, y puede asignarse opcionalmente a un `User` como doctor responsable.
- `FhirLink` no referencia por FK directa a recursos clinicos; guarda el mapeo por `resourceType` e `internalId`.
- `AuditLog` queda aislada en el ERD porque en el schema actual no tiene FKs formales.

## Tablas excluidas

- `Account`
- `Session`
- `VerificationToken`
- `_prisma_migrations`
