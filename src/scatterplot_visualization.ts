import * as vscode from "vscode";
import * as fs from "fs";

/* scatterplot_stats.json 로드 */
async function loadScatterplotData(): Promise<any> {
    const jsonPath = "/UHome/etri33301/SoCExtension/src/scatterplot_stats.json";
    return new Promise((resolve, reject) => {
        fs.readFile(jsonPath, "utf-8", (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(JSON.parse(data));
            }
        });
    });
}

export function createScatterplotWebview() {
    const scatterPlotPanel = vscode.window.createWebviewPanel(
        "ScatterPlot",
        "ScatterPlot Visualization",
        vscode.ViewColumn.One,
        { enableScripts: true }
    );

    console.log("ScatterPlot WebView panel created.");

    // WebView HTML 설정
    scatterPlotPanel.webview.html = getScatterPlotWebviewContent();

    // WebView가 로드되면 scatterplot_stats.json 데이터를 전송
    loadScatterplotData().then((jsonData) => {
        scatterPlotPanel.webview.postMessage({ type: "loadData", data: jsonData });
    });

    // WebView에서 메시지 수신 처리
    scatterPlotPanel.webview.onDidReceiveMessage((message) => {
        if (message.type === "runSimulation") {
            const configData = message.data;
            console.log("Received runSimulation event:", configData);
        }
    });

    console.log("ScatterPlot WebView message handler registered");
}

/* WebView HTML 내용 생성 (scatter plot) */
function getScatterPlotWebviewContent(): string {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Scatter Plot</title>
            <script src="https://d3js.org/d3.v7.min.js"></script>
        </head>
        <body>
            <h2>Scatter Plot Visualization</h2>
            <label for="x-axis">X Axis:</label>
            <select id="x-axis"></select><br>
            <label for="y-axis">Y Axis:</label>
            <select id="y-axis"></select>
            <button onclick="updateChart()">Update Chart</button><br>
            <svg width="800" height="400" style="background-color: white;"></svg>
            
            <script>
                const vscode = acquireVsCodeApi();
                let dataset = {};

                window.addEventListener("message", (event) => {
                    if (event.data.type === "loadData") {
                        dataset = event.data.data;
                        initializeSelectors();
                    }
                });

                function initializeSelectors() {
                    const metrics = Object.keys(Object.values(dataset)[0]).filter(k => k !== "----------");
                    const xSelect = document.getElementById("x-axis");
                    const ySelect = document.getElementById("y-axis");

                    metrics.forEach(metric => {
                        xSelect.innerHTML += \`<option value="\${metric}">\${metric}</option>\`;
                        ySelect.innerHTML += \`<option value="\${metric}">\${metric}</option>\`;
                    });

                    updateChart();
                }

                function updateChart() {
                    const xMetric = document.getElementById("x-axis").value;
                    const yMetric = document.getElementById("y-axis").value;
                    const data = Object.entries(dataset).map(([script, values]) => ({
                        script, x: values[xMetric], y: values[yMetric]
                    }));

                    drawScatterPlot(data, xMetric, yMetric);
                }

                function drawScatterPlot(data, xLabel, yLabel) {
                    const svg = d3.select("svg");
                    svg.selectAll("*").remove();
                    const width = +svg.attr("width"), height = +svg.attr("height");
                    const margin = { top: 40, right: 70, bottom: 60, left: 70 };
                    const innerWidth = width - margin.left - margin.right;
                    const innerHeight = height - margin.top - margin.bottom;

                    const xExtent = d3.extent(data, d => d.x);
                    const yExtent = d3.extent(data, d => d.y);

                    // 여유 공간 (padding) 설정 - 데이터 범위의 10% 추가
                    const xPadding = (xExtent[1] - xExtent[0]) * 0.1;
                    const yPadding = (yExtent[1] - yExtent[0]) * 0.1;

                    const xScale = d3.scaleLinear()
                        .domain([xExtent[0] - xPadding, xExtent[1] + xPadding])  // x범위 설정
                        .range([0, innerWidth]);

                    const yScale = d3.scaleLinear()
                        .domain([yExtent[0] - yPadding, yExtent[1] + yPadding])  // y범위 설정
                        .range([innerHeight, 0]);

                    const colorScale = d3.scaleOrdinal(d3.schemeCategory10); // 각 점에 다른 색상 적용

                    const g = svg.append("g").attr("transform", \`translate(\${margin.left},\${margin.top})\`);

                    // x축
                    g.append("g")
                        .attr("transform", \`translate(0,\${innerHeight})\`)
                        .call(d3.axisBottom(xScale).ticks(5)) // ticks(5): 적절한 개수로 자동 조정
                        .selectAll("path, line") 
                        .style("stroke", "black");

                    // y축
                    g.append("g")
                        .call(d3.axisLeft(yScale).ticks(5)) // ticks(5): 적절한 개수로 자동 조정
                        .selectAll("path, line") 
                        .style("stroke", "black");

                    // 데이터 포인트 추가
                    g.selectAll("circle")
                        .data(data)
                        .enter()
                        .append("circle")
                        .attr("cx", d => xScale(d.x))
                        .attr("cy", d => yScale(d.y))
                        .attr("r", 5)
                        .style("fill", (d, i) => colorScale(i)); // 각 점에 다른 색상 적용

                    // 각 점 위에 스크립트 파일명 표시
                    g.selectAll("text.label")
                        .data(data)
                        .enter()
                        .append("text")
                        .attr("class", "label")
                        .attr("x", d => xScale(d.x) - 2)  // 점 왼쪽에 표시
                        .attr("y", d => yScale(d.y) - 10)
                        .text(d => d.script)
                        .style("font-size", "12px")
                        .style("fill", "black");

                    // x축 레이블
                    svg.append("text")
                        .attr("x", width / 2)
                        .attr("y", height - 20)
                        .attr("text-anchor", "middle")
                        .text(xLabel)
                        .style("fill", "black");

                    // y축 레이블
                    svg.append("text")
                        .attr("transform", "rotate(-90)")
                        .attr("x", -height / 2)
                        .attr("y", 25)
                        .attr("text-anchor", "middle")
                        .text(yLabel)
                        .style("fill", "black");
                }
            </script>
        </body>
        </html>
    `;
}

