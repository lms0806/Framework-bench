# Framework-bench

여러 웹 백엔드 프레임워크의 성능을 비교하기 위한 프로젝트입니다.

## Axum

Rust 1.85.0과 Cargo가 필요합니다. rustup을 사용하면 저장소의 `rust-toolchain.toml`이 해당 버전을 선택합니다. 저장소 루트에서 실행합니다.

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

## Spring Boot

JDK 25가 필요합니다. `JAVA_HOME`을 JDK 25 경로로 설정하세요. Gradle Wrapper가 필요한 Gradle을 다운로드합니다. Spring Boot 4.1 기반의 Spring MVC와 내장 Tomcat을 사용합니다.

```powershell
.\spring-boot\gradlew.bat -p spring-boot clean build
java -jar spring-boot/build/libs/spring-boot-bench-0.1.0.jar
```

기본 주소는 `0.0.0.0:3000`이며, `SERVER_ADDRESS`와 `SERVER_PORT` 환경 변수로 변경할 수 있습니다. Axum과 동시에 실행할 때는 서로 다른 포트를 지정하세요. 엔드포인트와 응답은 위 표와 동일합니다. 테스트는 `.\spring-boot\gradlew.bat -p spring-boot test`로 실행합니다.


## NestJS

Node.js 20 이상과 npm이 필요합니다. NestJS와 기본 Express 어댑터를 사용합니다.

```powershell
npm --prefix nestjs ci
npm --prefix nestjs run build
npm --prefix nestjs start
```

기본 주소는 `0.0.0.0:3000`이며 `HOST`와 `PORT` 환경 변수로 변경할 수 있습니다. 다른 서버와 동시에 실행할 때는 서로 다른 포트를 지정하세요. 엔드포인트와 응답 본문은 위 표와 동일합니다. Express는 JSON 응답의 Content-Type에 `charset=utf-8`을 추가합니다. 테스트는 `npm --prefix nestjs test`로 실행합니다.

## FastAPI

Python 3.14에서 확인했으며, FastAPI와 Uvicorn의 기본 설정(워커 1개)을 사용합니다. 다음 명령은 Windows PowerShell에서 저장소 루트 기준입니다.

```powershell
python -m venv fastapi/.venv
.\fastapi\.venv\Scripts\python.exe -m pip install -r fastapi/requirements.txt
.\fastapi\.venv\Scripts\python.exe -m uvicorn main:app --app-dir fastapi --host 0.0.0.0 --port 3000
```

주소와 포트는 `--host`와 `--port`로 변경할 수 있습니다. 다른 서버와 동시에 실행할 때는 서로 다른 포트를 지정하세요. 엔드포인트와 응답은 위 표와 동일합니다. `requirements.txt`는 검증한 의존성 버전을 고정하며, 직접 사용하는 패키지는 `requirements.in`에 명시되어 있습니다.

```powershell
.\fastapi\.venv\Scripts\python.exe -m unittest discover -s fastapi/tests -v
```

