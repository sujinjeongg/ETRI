import json
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

# JSON 데이터 로드
with open("/UHome/etri33301/SoCExtension/src/five_stats.json", "r") as f:
    data = json.load(f)

# JSON 데이터를 Pandas DataFrame으로 변환
df = pd.DataFrame.from_dict(data, orient="index")

# script_name을 인덱스에서 컬럼으로 변환
df.reset_index(inplace=True)
df.rename(columns={"index": "script_name"}, inplace=True)

# 결측값(NaN) 처리
df = df.fillna(0)

# script별 평균 ticks, ipc 계산
mean_ipc = df["ipc"].mean()
mean_ticks = df["ticks"].mean()

# 분석 결과 출력
for script in df["script_name"].unique():
    subset = df[df["script_name"] == script]

    # script별 분석 (비효율적인 실행 탐색)
    high_ticks_low_ipc = subset[(subset["ticks"] > mean_ticks) & 
                                (subset["ipc"] < mean_ipc)]
    
    low_ticks_high_ipc = subset[(subset["ticks"] < mean_ticks) & 
                                (subset["ipc"] > mean_ipc)]

    print(f"📊 {script} 성능 분석 결과:")
    print(f"- 평균 IPC: {mean_ipc}, 평균 Ticks: {mean_ticks}")
    print(f"- IPC: {subset['ipc'].values[0]}, Ticks: {subset['ticks'].values[0]}")

    if not high_ticks_low_ipc.empty:
        print("  🐌 높은 Ticks & 낮은 IPC → 메모리 병목 가능성")

    if not low_ticks_high_ipc.empty:
        print("  ⚡ 낮은 Ticks & 높은 IPC → 최적 성능 조합 발견")

    print("-" * 40)

# 산점도 그래프
plt.figure(figsize=(10, 6))
sns.scatterplot(data=df, x="ticks", y="ipc", hue="script_name", palette="viridis")

plt.axhline(mean_ipc, color='red', linestyle='--', label=f"Mean IPC ({mean_ipc:.2f})")
plt.axvline(mean_ticks, color='blue', linestyle='--', label=f"Mean Ticks ({mean_ticks:.0f})")

plt.title("IPC vs Ticks Relationship")
plt.xlabel("Ticks (Cycle Count)")
plt.ylabel("IPC (Instructions Per Cycle)")
plt.legend(title="Script Names")

# 파일로 저장
plt.savefig("/UHome/etri33301/SoCExtension/src/stats_analysis_image.png", bbox_inches='tight') 
