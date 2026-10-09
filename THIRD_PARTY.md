# 원본 출처와 기여

이 초안의 발표 구성, 문구, HTML·CSS·UI 코드는 본 요청을 위해 작성했습니다. 연구 알고리즘의 기여와 외부 원본 설계는 아래처럼 구분합니다.

- **연구팀 코드**: [26037-arch/wjd](https://github.com/26037-arch/wjd), [KJH-code/slicer](https://github.com/KJH-code/slicer). 평가식, 원뿔 변환·역변환, Rep5x 연결, 검증 구조를 참고했습니다. 7장 데이터 준비는 기존 해석 판정식의 기하 재계산입니다.
- **1차 발표의 STL**: [26037-arch/adaptive-conical-slicing-presentation](https://github.com/26037-arch/adaptive-conical-slicing-presentation). 아치형·ㄱ자형·모래시계 원본을 보존했습니다. 저작권은 원저작자에게 있습니다.
- **Rep5x 부품 CAD**: [dennisklappe/Rep5x](https://github.com/dennisklappe/Rep5x). 공식 공통 부품 6종 및 Ender 3 V3 SE 전용 부품 4종을 사용했습니다. 원본 3MF와 표시용 삼각형 메시를 제공하며 단품의 원형을 변경하지 않았습니다. 표시 과정에서 뷰어 중앙으로 이동했습니다. 공식 README는 GPL v3를 명시합니다. GPL-3.0 원문은 `assets/licenses/GPL-3.0-only.txt`, 메시 변환 소스는 `tools/prepare-assets.py`에 있습니다. 팀의 독자 설계로 표시하지 않았습니다.
- **Three.js r128, OrbitControls, STLLoader**: [mrdoob/three.js](https://github.com/mrdoob/three.js). 1차 발표의 로컬 번들을 재사용했습니다. 저작권·MIT 라이선스는 `assets/licenses/THREE-MIT.txt`에 보존했습니다.
- **연구 설계 방향**: R&E 2학기 프로젝트의 ‘코드 검토 결과’, ‘역전파 기반 k값 결정’ 대화. 채팅의 제안을 확인된 실험 결과로 취급하지 않았습니다.

원본 저장소 URL, 커밋, 설명은 각 장의 발표자 메모와 README에 있습니다. GPL 적용 원본 CAD·표시용 메시에는 해당 라이선스가 적용됩니다.
