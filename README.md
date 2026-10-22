# Framework-bench

여러 웹 백엔드 프레임워크의 성능을 비교하기 위한 프로젝트입니다.

## Axum

Rust와 Cargo가 필요합니다. 저장소 루트에서 실행합니다.

```powershell
cargo run --release --manifest-path axum/Cargo.toml
```

기본 주소는 `0.0.0.0:3000`입니다. `BIND_ADDR` 환경 변수로 변경할 수 있습니다 (예: `127.0.0.1:3001`). 종료하려면 Ctrl+C를 누릅니다.

| 메서드 | 경로 | 응답 본문 | Content-Type |
| --- | --- | --- | --- |
| GET | `/health` | `OK` | `text/plain; charset=utf-8` |
| GET | `/plaintext` | `Hello, World!` | `text/plain; charset=utf-8` |
| GET | `/json` | `{"message":"Hello, World!"}` | `application/json` |

```powershell
curl.exe http://127.0.0.1:3000/plaintext
curl.exe http://127.0.0.1:3000/json
cargo test --manifest-path axum/Cargo.toml
```

성능 비교 시 각 서버에 동일한 경로와 응답을 구현하고, 릴리스 빌드, 클라이언트, 동시 연결 수, 실행 시간 및 하드웨어 조건을 동일하게 맞춰야 합니다. `/health`는 준비 상태 확인용이며 벤치마크 대상은 `/plaintext`와 `/json`입니다.
