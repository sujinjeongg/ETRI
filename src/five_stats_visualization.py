import json
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import matplotlib
import matplotlib.font_manager as fm
import matplotlib as mpl

# 파일로 저장
matplotlib.use('Agg')  

# 한글 폰트 설정
mpl.rc('font', family='NanumGothic')

# JSON 데이터 로드
with open("/UHome/etri33301/SoCExtension/src/five_stats.json", "r") as f:
    data = json.load(f)

# JSON 데이터를 Pandas DataFrame으로 변환
df = pd.DataFrame.from_dict(data, orient="index")

# 결측값(NaN) 처리
df = df.fillna(0) 

# IPC 및 Ticks의 통계 계산
mean_ipc = df["ipc"].mean()
mean_ticks = df["ticks"].mean()
max_ipc = df["ipc"].max()
min_ipc = df["ipc"].min()

# **자동 분석: 메모리 병목 및 비효율적인 동작 탐색**
high_ticks_low_ipc = df[(df["ticks"] > mean_ticks) & (df["ipc"] < mean_ipc)]  # 높은 ticks, 낮은 IPC (비효율적인 동작)
low_ticks_high_ipc = df[(df["ticks"] < mean_ticks) & (df["ipc"] > mean_ipc)]  # 낮은 ticks, 높은 IPC (이상적인 성능)

# 분석 결과 텍스트 생성
textstr = "성능 분석 결과:\n"
textstr += f"- 평균 IPC: {mean_ipc:.2f}\n"
textstr += f"- 평균 Ticks: {mean_ticks:.0f}\n"
textstr += f"- 최대 IPC: {max_ipc:.2f}, 최소 IPC: {min_ipc:.2f}\n"

if not high_ticks_low_ipc.empty:
    textstr += "- 높은 Ticks & 낮은 IPC → 메모리 병목 가능성\n"
if not low_ticks_high_ipc.empty:
    textstr += "- 낮은 Ticks & 높은 IPC → 최적 성능 조합 발견\n"

# 그래프 그리기
plt.figure(figsize=(10, 6))
sns.scatterplot(x=df["ticks"], y=df["ipc"])

# 그래프에 분석 결과 추가
plt.text(df["ticks"].max() * 0.6, df["ipc"].max() * 0.8, textstr,
         fontsize=10, bbox=dict(facecolor='white', alpha=0.5))

plt.xlabel("Ticks (Cycle Count)")
plt.ylabel("IPC (Instructions Per Cycle)")
plt.title("Ticks vs IPC 관계")
# 그래프를 파일로 저장
plt.savefig('src/output_graph.png')  # 파일로 저장
print("그래프 파일이 저장되었습니다. output_graph.png") 
