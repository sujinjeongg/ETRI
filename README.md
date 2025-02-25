# ETRI
=============================================================================================
# SoC IDE Extension
VS Code에서 SoC 설계와 시뮬레이션을 쉽게 할 수 있도록 돕는 vs code 확장형 통합개발환경입니다.

## Features
- gem5 자동 설치
    - (Gem5 수동 설치를 원할 경우)
        1. git clone https://github.com/gem5/gem5 
        2. cd gem5
        3. scons build/ALL/gem5.opt –j`nproc` (`nproc` 자리에는 원하는 개수로 변경 (예: 12)) -> 안될 시 scons build/X86/gem5.opt –j`nproc`
- SoC 설계 지원
- stats.txt 성능 데이터 시각화
- 프로파일 저장 및 불러오기 지원
- 로그 WebView 지원

## Extension Settings
vs code extension 개발을 위한 설정
1. install yo generate-code
2. yo code
3. node.js 버전 문제 발생 시 해결 방법 : curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh 
    | bash; source ~/.bashrc; nvm ls-remote; nvm install --lts; node –v

vs code에서 개발된 vs code extension 화면 확인
1. npm run compile (tsc –watch 명령으로 컴파일 자동화 가능) 
2. `F5`를 눌러 VS Code에서 확장 기능을 실행
3. `ctrl+shift+p`를 눌러 명령 창 열기
4. `Run gem5` 등의 명령 입력

## How to use IDE
- `Ctrl + Shift + P` → "Run gem5"등의 명령 실행
- "Install gem5" -> gem5 자동 설치
- "Run gem5" -> script file path 입력 -> gem5 자동 실행 -> bar chart WebView 열림 (성능 지표 다중 선택 가능)
- "Run gem5 with parsing" -> script file path 입력 -> gem5 자동 실행 -> stats.txt 데이터 파싱됨 -> scatterplot_stats.json 파일에 데이터 저장됨
- "Run gem5 with SoC Design" -> cache size, cpu type, memory mode 등 하드웨어 설정 값 입력 -> Run Simulation 버튼 클릭 -> 설정 값 기반 script file 생성됨 -> gem5 자동 실행
- "Visualize ScatterPlot" -> x,y축 성능 지표 선택 -> Update Chart 버튼 클릭 -> 산점도에 각 스크립트 파일 표시됨(scatterplot_stats.json에 저장된 스크립트 파일들의 성능 데이터 기반)
- "Run gem5 with profile" -> "Enter script path manually" 클릭 -> script file path 입력 -> profiles.json 파일에 script file name, script file path, gem5 설정 정보 저장됨 -> vs code 재시작 후 script file name 클릭시 gem5 자동 실행
- "Run gem5 with log" -> script file path 입력 -> gem5 자동 실행 -> log WebView 열림 (로그 내 검색 가능)

## Directory Structure
```
📂 SoCExtension
 ├── 📂 gem5             # gem5 시뮬레이터
 ├── 📂 src              # 소스 코드
 │   ├── 📜 extension.ts       # 메인 실행 
 │   ├── 📜 generated_soc_script.py    # socDesign.ts에서 자동 생성되는 script file
 │   ├── 📜 installGem5.ts       # gem5 설치 여부 판단 후 자동 설치 
 │   ├── 📜 log.ts       # log WebView 
 │   ├── 📜 profiles.json       # 프로파일 데이터
 │   ├── 📜 profiles.ts       # 프로파일 불러오기 및 저장 
 │   ├── 📜 scatterplot_parse.ts       # 산점도를 위한 stats.txt 파싱 
 │   ├── 📜 scatterplot_stats.json       # scatterplot_parse.ts에서 파싱한 데이터 저장 
 │   ├── 📜 scatterplot_visualization.ts       # 산점도 시각화 
 │   ├── 📜 socDesign.ts      # SoC 설계 
 │   ├── 📜 stats.ts      # bar chart 시각화를 위한 stats.txt 파싱 
 ├── 📜 README.md        # 이 파일
 ├── 📜 package.json     # 패키지 설정
```

## TroubleShooting
gem5 폴더 git 업로드했을 때 클릭이 안 되고 화살표 표시가 되어있는 문제 해결
1) cd gem5
2) .git 파일 제거
rm -rf .git
3) 스테이지에 존재하는 파일 제거
git rm --cached . -rf
4) git add, commit -m, push
