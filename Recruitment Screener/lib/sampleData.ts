export const SAMPLE_JD = `
Senior Backend Engineer — FinFlow Technologies

About FinFlow Technologies:
FinFlow is a Series B fintech company building real-time payment infrastructure for SMBs across Southeast Asia. Our platform processes over $2B in transactions annually and we're scaling rapidly.

Responsibilities:
- Design and operate distributed payment-processing services handling millions of transactions per day
- Own reliability for critical payment pipelines — define SLOs, lead incident response, author post-mortems
- Build and maintain event-driven systems using message queues (Kafka or AWS SQS)
- Instrument services with structured logging, distributed tracing, and alerting (OpenTelemetry, Datadog)
- Mentor junior and mid-level engineers through code review, pairing, and technical documentation
- Collaborate with product and compliance to ship features within regulatory constraints

Requirements:
- 5+ years of professional backend software engineering experience
- Production proficiency in Python or Go (we use both; Go is the primary language for new services)
- Strong grasp of distributed systems: consistency trade-offs, failure modes, backpressure
- Hands-on experience with Kafka or AWS SQS in a production environment
- AWS (EC2, ECS/EKS, RDS, S3) — you've shipped and operated services in AWS
- Kubernetes — comfortable writing manifests, debugging pods, and managing deployments
- Fintech or payments experience preferred — understanding of settlement, reconciliation, or fraud signals

Nice to Have:
- PostgreSQL at scale — partitioning, query optimisation, replication
- Exposure to PCI-DSS or SOC 2 compliance requirements

Education:
- Bachelor's degree in Computer Science or related field, or equivalent practical experience
`.trim();

export const SAMPLE_RESUME_STRONG = `
Ananya Rao
ananya.rao@email.com | linkedin.com/in/ananyarao | github.com/ananyarao

EXPERIENCE

Senior Backend Engineer — ClearPay India, Bengaluru (Jan 2021 – Present)
- Led development of ClearPay's real-time settlement engine in Go, processing 2M+ events/day via Kafka with sub-100 ms p99 latency
- Primary on-call owner for the payments core team; maintained 99.97% uptime across 18 months, authored 12 post-mortems with systemic fixes
- Migrated four legacy Python microservices to Go, reducing memory overhead by 40% and halving cold-start times in EKS
- Mentored 3 junior engineers; introduced internal RFC process adopted by the wider platform team
- Designed Kubernetes-native autoscaling strategy for peak-load bursts during festival sale periods (5× normal volume)
- Integrated OpenTelemetry traces and Datadog dashboards; cut mean time-to-detect incidents from 18 min to 4 min

Backend Engineer — SecurePay Solutions, Pune (Aug 2018 – Dec 2020)
- Built Python/Flask APIs for a card-not-present payment gateway serving 400K daily transactions
- Implemented PCI-DSS-compliant tokenisation service; led internal audit preparation for Level 2 merchant certification
- Optimised PostgreSQL query plans for the reconciliation pipeline; reduced nightly batch runtime from 4 h to 35 min through index redesign and table partitioning
- Deployed and operated services on AWS (EC2, RDS, S3, SQS); introduced CloudFormation-based IaC

EDUCATION
B.Tech in Computer Science — Pune Institute of Computer Technology (2014–2018), CGPA 8.7/10

SKILLS
Languages: Go (primary), Python, SQL
Infrastructure: AWS (EKS, EC2, RDS, SQS, S3), Kubernetes, Terraform
Messaging: Kafka, AWS SQS
Observability: OpenTelemetry, Datadog, Prometheus/Grafana
Databases: PostgreSQL, Redis
Compliance: PCI-DSS Level 2, SOC 2 Type I
`.trim();

export const SAMPLE_RESUME_PARTIAL = `
Rohan Mehta
rohan.mehta@email.com | linkedin.com/in/rohanmehta

EXPERIENCE

Full-Stack Developer — FitBook Technologies, Mumbai (Mar 2022 – Present)
- Built React frontend and Node.js/Express backend for a fitness class booking platform with 50K monthly active users
- Integrated AWS Lambda functions for asynchronous booking confirmation emails via SQS
- Used MongoDB Atlas for primary data storage; implemented basic aggregation pipelines for analytics dashboards
- Deployed services on AWS Elastic Beanstalk; wrote basic CloudFormation templates for staging environments
- Collaborated with a 5-person engineering team; participated in weekly code reviews

Junior Developer — CreativeApps Studio, Mumbai (Jun 2020 – Feb 2022)
- Developed REST APIs in Node.js for a mobile content app (internal tooling and customer-facing endpoints)
- Maintained MySQL database schemas and wrote stored procedures for reporting features
- Assisted in migrating on-premise servers to AWS EC2

EDUCATION
B.Sc in Information Technology — University of Mumbai (2017–2020)

SKILLS
Languages: JavaScript (Node.js), TypeScript, React
Cloud: AWS (Lambda, SQS, Elastic Beanstalk, EC2)
Databases: MongoDB, MySQL
Tools: Git, Docker (basic), Postman
`.trim();
