# 원본 출처와 기여

이 초안의 발표 구성, 문구, HTML·CSS·UI 코드는 본 요청을 위해 작성했습니다. 연구 알고리즘의 기여와 외부 원본 설계는 아래처럼 구분합니다.

- **연구팀 코드**: [26037-arch/wjd](https://github.com/26037-arch/wjd), [KJH-code/slicer](https://github.com/KJH-code/slicer). 공개 main의 구조와 [Drive의 e9bc3b0 소스·데이터](https://drive.google.com/drive/folders/1Z0gUKEgeItji8W_Syo2zUCr6RDTfqadh)를 확인했습니다. 7장은 제공된 기하근사 IoU label에 대한 실제 재학습 기록이며, 8장은 제공된 G-code 복원과 이번 반복 재실행 결과입니다. 6장의 코드는 핵심 식·호출 흐름을 설명하는 축약 표현입니다.
- **변환 원형**: [RotBotSlicer/Transform](https://github.com/RotBotSlicer/Transform), GPL-3.0. 연구 코드의 원뿔 좌표 변환·역변환이 참고한 원형입니다. 논문: Wüthrich et al., *A Novel Slicing Strategy to Print Overhangs without Support Material*, Applied Sciences 11(18):8760 (2021), DOI [10.3390/app11188760](https://doi.org/10.3390/app11188760).
- **퇴적 규칙 원형**: [FullControlXYZ/volco](https://github.com/FullControlXYZ/volco), GPL-3.0. 연구 코드의 B/C 방향성 voxel 확장이 참고한 구형 부피 보존 퇴적 모델입니다. 이번 재실행은 원본 VOLCO CLI가 아닌 wjd의 `volco_oriented_extension`을 실행했습니다.
- **슬라이서 비교**: [PrusaSlicer](https://github.com/prusa3d/PrusaSlicer), [Bambu Studio](https://github.com/bambulab/BambuStudio), [OrcaSlicer](https://github.com/SoftFever/OrcaSlicer). 기존 코드·문서의 CLI 및 설정 구조 참고를 표기했습니다. 이번 반복 실험은 wjd의 내장 슬라이서를 사용했습니다.
- **그래프 생성**: Pandas·Matplotlib로 수치 기록에서 PNG를 생성했습니다. 발표는 이 라이브러리를 로드하지 않고 로컬 이미지만 표시합니다. k 학습 재실행에는 제공 코드의 PyTorch MLP·autograd를 사용했습니다.
- **1차 발표의 STL**: [26037-arch/adaptive-conical-slicing-presentation](https://github.com/26037-arch/adaptive-conical-slicing-presentation). 아치형·ㄱ자형·모래시계 원본을 보존했습니다. 저작권은 원저작자에게 있습니다.
- **Rep5x 부품 CAD**: [dennisklappe/Rep5x](https://github.com/dennisklappe/Rep5x). 공식 공통 부품 6종 및 Ender 3 V3 SE 전용 부품 4종을 사용했습니다. 원본 3MF와 표시용 삼각형 메시를 제공하며 단품의 원형을 변경하지 않았습니다. 표시 과정에서 뷰어 중앙으로 이동했습니다. 공식 README는 GPL v3를 명시합니다. GPL-3.0 원문은 `assets/licenses/GPL-3.0-only.txt`, 메시 변환 소스는 `tools/prepare-assets.py`에 있습니다. 팀의 독자 설계로 표시하지 않았습니다.
- **Three.js r128, OrbitControls, STLLoader**: [mrdoob/three.js](https://github.com/mrdoob/three.js). 1차 발표의 로컬 번들을 재사용했습니다. 저작권·MIT 라이선스는 `assets/licenses/THREE-MIT.txt`에 보존했습니다.
- **연구 설계 방향**: R&E 2학기 프로젝트의 ‘코드 검토 결과’, ‘역전파 기반 k값 결정’ 대화. 채팅의 제안을 확인된 실험 결과로 취급하지 않았습니다.

원본 저장소 URL, 커밋, 설명은 각 장의 발표자 메모와 README에 있습니다. GPL 적용 원본 CAD·표시용 메시에는 해당 라이선스가 적용됩니다.
