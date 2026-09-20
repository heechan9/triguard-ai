# Vercel 정적 데모 운영

## 대표 접속 경로

- 공개 데모·포트폴리오 대표 주소: https://triguard-ai.vercel.app/
- Streamlit: CSV 업로드와 Python 재분석을 위한 보조 도구. 필요할 때 `streamlit run app.py`로 로컬 실행합니다.
- 기존 Streamlit 앱은 삭제하지 않습니다. 휴면 앱을 공개 대표 링크로 안내하지 않습니다.

## 확인된 배포 상태 (2026-09-20)

Vercel 프로젝트 `triguard-ai`의 production 배포는 `dpl_D7rgtq1yHpBrLsoTh6DbywaqrUWq`이며, 대표 alias는 `triguard-ai.vercel.app`입니다. 대표 URL에서 HTML 화면이 열리는 것을 확인했습니다. 전체 기능·데이터 로딩 검증 완료를 뜻하지 않습니다.

현재 대표 화면은 저장소의 최신 UI와 다릅니다. 프로젝트의 배포 목록에는 최근 GitHub 보안 PR에 대응하는 신규 배포가 확인되지 않았습니다. 따라서 PR #17·#18의 main 병합과 Vercel 운영 반영은 구분합니다. 이번 문서 변경은 기존 주소 안내이며 신규 배포·승격·Git 연동 설정 변경을 수행하지 않습니다.

TriGuard의 기존 Streamlit 앱은 파일 업로드와 상세 분석용으로 유지한다. Vercel 버전은 같은 계산 모듈로 미리 생성한 공개데이터 결과를 빠르게 열람하는 정적 데모다.

## 결과 갱신

공개데이터 파일이나 계산 규칙이 바뀌면 저장소 루트에서 다음 명령을 실행한다.

```bash
PYTHONPATH=. python scripts/export_web_data.py
```

생성된 `web/data/risk_snapshot.json`을 검토하고 함께 커밋한다. Vercel 빌드에서는 Python 분석 환경을 다시 만들지 않고 검토된 정적 파일만 `dist`로 복사한다.

## 배포

Vercel에서 저장소를 가져오면 루트의 `vercel.json`이 빌드 및 출력 디렉터리를 설정한다. Pull Request에는 Preview 배포를 사용하고, 화면과 결과 스냅샷을 확인한 뒤 운영 배포로 승격한다.

## 해석 범위

- 지역별 점수는 담당자의 원자료 검토 순서를 제안한다.
- 정적 데모는 실시간 탐지 또는 미래 사건 예측을 수행하지 않는다.
- 통합점수만으로 자동 조치하거나 자원을 배분하지 않는다.
- 결과 갱신 시 생성 시각, 경고 목록과 구성요소 점수를 함께 확인한다.
- 지도는 원본 `korea_provinces.json`에서 생성한 경량 웹 스냅샷을 사용하며 외부 지도 API나 API 키를 사용하지 않는다.
- 하나의 시·도를 복수 지방청이 담당하면 지도에는 해당 지방청 점수의 평균을 표시한다.

원본 지도가 바뀌면 `python scripts/export_web_geojson.py`로 웹용 지도를 다시 생성한다.
