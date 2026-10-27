# Security

Report vulnerabilities privately to the maintainer; do not open public issues for them. `MODEL_API_KEY` and `KAKAO_REST_API_KEY` are server-only and never sent to the browser or logs. The budget ledger (`data/`) and local sessions stay local and are gitignored. The CLI transport uses fixed argument arrays and temp files with restricted permissions; it never interpolates user input into shell commands.
