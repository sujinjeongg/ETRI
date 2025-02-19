import json
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

# JSON 데이터 로드
with open("/UHome/etri33301/SoCExtension/src/scatterplot_stats.json", "r") as f:
    data = json.load(f)

# JSON 데이터를 Pandas DataFrame으로 변환
df = pd.DataFrame.from_dict(data, orient="index")

# script_name을 인덱스에서 컬럼으로 변환
df.reset_index(inplace=True)
df.rename(columns={"index": "script_name"}, inplace=True)

# script별 평균 simSeconds, system.cpu.ipc 계산
mean_system.cpu.ipc = df["system.cpu.ipc"].mean()
mean_simSeconds = df["simSeconds"].mean()

# 분석 결과 출력
for script in df["script_name"].unique():
    subset = df[df["script_name"] == script]

    # script별 분석 (비효율적인 실행 탐색)
    high_simSeconds_low_system.cpu.ipc = subset[(subset["simSeconds"] > mean_simSeconds) & 
                                (subset["system.cpu.ipc"] < mean_system.cpu.ipc)]
    
    low_simSeconds_high_system.cpu.ipc = subset[(subset["simSeconds"] < mean_simSeconds) & 
                                (subset["system.cpu.ipc"] > mean_system.cpu.ipc)]

    print(f"📊 {script} 성능 분석 결과:")
    print(f"- 평균 system.cpu.ipc: {mean_system.cpu.ipc}, 평균 simSeconds: {mean_simSeconds}")
    print(f"- system.cpu.ipc: {subset['system.cpu.ipc'].values[0]}, simSeconds: {subset['simSeconds'].values[0]}")

    if not high_simSeconds_low_system.cpu.ipc.empty:
        print("  🐌 높은 simSeconds & 낮은 system.cpu.ipc → 메모리 병목 가능성")

    if not low_simSeconds_high_system.cpu.ipc.empty:
        print("  ⚡ 낮은 simSeconds & 높은 system.cpu.ipc → 최적 성능 조합 발견")

    print("-" * 40)

# 산점도 그래프
plt.figure(figsize=(10, 6))
sns.scatterplot(data=df, x="simSeconds", y="system.cpu.ipc", hue="script_name", palette="viridis")

plt.axhline(mean_system.cpu.ipc, color='red', linestyle='--', label=f"Mean system.cpu.ipc ({mean_system.cpu.ipc:.2f})")
plt.axvline(mean_simSeconds, color='blue', linestyle='--', label=f"Mean simSeconds ({mean_simSeconds:.0f})")

plt.title("system.cpu.ipc vs simSeconds Relationship")
plt.xlabel("simSeconds (Cycle Count)")
plt.ylabel("system.cpu.ipc (Instructions Per Cycle)")
plt.legend(title="Script Names")

# 파일로 저장
plt.savefig("/UHome/etri33301/SoCExtension/src/stats_analysis_image.png", bbox_inches='tight') 
