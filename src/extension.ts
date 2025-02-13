import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { parseStatsFile, watchStatsFile } from './stats'; // stats.ts 파일 import
import { selectAndRunProfile } from './profiles'; // profiles.ts 파일 import
import { createSoCDesignWebview } from './socDesign'; // socDesign.ts 파일 import
import { createLogWebview } from './log'; // log.ts 파일 import
import { runGem5AndParse } from './five_stats'; // parse.ts 파일 import

export function activate(context: vscode.ExtensionContext) {

  console.log('Congratulations, your extension "SoCExtension" is now active!');

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  const runGem5Command = vscode.commands.registerCommand('SoCExtension.runGem5', async () => {
    const gem5Path = "/UHome/etri33301/SoCExtension/gem5";
    const gem5Binary = path.join(gem5Path, "build/X86/gem5.opt");
    // 사용자가 script 경로 입력
    const gem5Script = await vscode.window.showInputBox({
      prompt: 'Enter the path to the gem5 script',
      placeHolder: '/path/to/your/script.py',
      validateInput: (input) => input.trim() === '' ? 'Script path cannot be empty' : null
    });

    if (!gem5Script) {
      vscode.window.showWarningMessage('No gem5 script path provided!');
      return;
    } else { // scipt 파일 자동으로 열림 
      const scriptPath = gem5Script.trim();

      if (fs.existsSync(scriptPath)) {
        const doc = await vscode.workspace.openTextDocument(scriptPath);
        vscode.window.showTextDocument(doc);
      } else {
        vscode.window.showErrorMessage('Invalid script file path');
      }
    }

    /*
    // gem5 실행 후 메시지 창 출력
    exec(`${gem5Binary} ${gem5Script}`, (error, stdout, stderr) => {
        if (error) {
          vscode.window.showErrorMessage(`Error: ${error.message}`);
          return;
        }
        if (stderr) {
          vscode.window.showWarningMessage(`Stderr: ${stderr}`);
          return;
        }
        vscode.window.showInformationMessage(`gem5 Output: ${stdout}`);
      });
    */

    // 터미널 연동하여 gem5 실행
    const terminal = vscode.window.createTerminal('gem5 simulation');
    terminal.sendText(`${gem5Binary} ${gem5Script}`);
    terminal.show();

    /*
    // gem5 실행 후 output.log 파일(자동 생성)에 결과 저장
    const outputFile = path.join(gem5Path, "output.log");
    const command = `${gem5Binary} ${gem5Script} > ${outputFile}`;
    exec(command, (error) => {
        if (error) {
            vscode.window.showErrorMessage(`Failed to run gem5: ${error.message}`);
          } else {
            vscode.window.showInformationMessage(`gem5 output saved to ${outputFile}`);
          }
    });
    */

    // stats.txt 파일 생성 여부 확인
    const statsPath = path.join(gem5Path, 'm5out', 'stats.txt');

    if (!fs.existsSync(statsPath)) {
      console.error("Stats file does not exist at the specified path.");
    } else {
      console.log("Stats file exists.");

      watchStatsFile(statsPath, (updatedStats) => {
        console.log(`Updated IPC: ${updatedStats['system.cpu.ipc'] || 'N/A'}`);
      });
    }

    /* gem5 stats WebView Panel 생성 */
    const statsPanel = vscode.window.createWebviewPanel(
      'gem5Stats',
      'gem5 Stats Visualization',
      vscode.ViewColumn.One,
      { enableScripts: true }
    );
    console.log('gem5 stats WebView panel created.');

    // WebView HTML 내용 설정
    statsPanel.webview.html = getStatsWebviewContent();

    // stats.txt 파일 변경 감지 및 WebView로 데이터 전송
    watchStatsFile(statsPath, (updatedStats) => {
      console.log('Updated stats:', updatedStats);
      statsPanel.webview.postMessage({ type: 'update', data: updatedStats });
    });

    // Webview에서 수신 이벤트 처리
    statsPanel.webview.onDidReceiveMessage(message => {
      if (message.type === 'ready') {
        console.log('gem5 stats WebView is ready');
        const initialStats = parseStatsFile(statsPath); // 초기 데이터 전달
        statsPanel.webview.postMessage({ type: 'update', data: initialStats });
      }
    });
    console.log('gem5 stats WebView message handler registered');
  });

  const runProfileCommand = vscode.commands.registerCommand('SoCExtension.runProfile', selectAndRunProfile);
  const runSoCDesignCommand = vscode.commands.registerCommand('SoCExtension.runSoCDesign', createSoCDesignWebview);
  const runLogCommand = vscode.commands.registerCommand('SoCExtension.runLog', createLogWebview);
  const runParseCommand = vscode.commands.registerCommand('SoCExtension.runParse', runGem5AndParse);
  context.subscriptions.push(runGem5Command, runProfileCommand, runSoCDesignCommand, runLogCommand, runParseCommand);
}

/* Webview HTML 내용 생성 (gem5 stats.txt visualization) */
function getStatsWebviewContent(): string {
  return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>gem5 Stats Visualization</title>
            <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
            <style>
                #label-selector {
                    width: 100%;
                    height: 120px;
                }
                option.selected {
                    background-color: lightblue;
                }
            </style>
        </head>
        <body>
            <h1>gem5 Stats Visualization</h1>

            <!-- 다중 선택 가능한 select 메뉴 -->
            <label for="label-selector">Select Labels:</label>
            <select id="label-selector" multiple size="6"></select> <!-- 한 번에 7개의 항목이 보이도록 -->

            <canvas id="chart" width="800" height="400"></canvas>

            <script>
                let stats = {}; // 전체 데이터 저장
                let selectedLabels = new Set(); // 선택된 레이블 저장 (중복 방지)

                const ctx = document.getElementById('chart').getContext('2d');
                const chart = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: [],
                        datasets: [{
                            label: 'gem5 Stats',
                            data: [],
                            backgroundColor: 'rgba(75, 192, 192, 0.6)',
                            borderColor: 'rgba(75, 192, 192, 1)',
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        scales: {
                            y: { beginAtZero: true }
                        }
                    }
                });

                /* VS Code에서 메시지 수신 */
                const vscode = acquireVsCodeApi();
                window.addEventListener('message', event => {
                    const message = event.data;
                    if (message.type === 'update') {
                        stats = message.data;
                        updateLabelSelector(stats);
                    }
                });

                /* select 메뉴 업데이트 */
                function updateLabelSelector(updatedStats) {
                    const selector = document.getElementById('label-selector');
                    selector.innerHTML = ''; // 기존 옵션 초기화

                    Object.keys(updatedStats).forEach(label => {
                        const option = document.createElement('option');
                        option.value = label;
                        option.textContent = label;
                        selector.appendChild(option);
                    });

                    // 클릭 이벤트 (Ctrl 없이 다중 선택 가능)
                    selector.addEventListener('click', (event) => {
                        if (event.target.tagName === 'OPTION') {
                            const value = event.target.value;
                            if (selectedLabels.has(value)) {
                                selectedLabels.delete(value); // 선택 해제
                                event.target.classList.remove('selected');
                            } else {
                                selectedLabels.add(value); // 선택 추가
                                event.target.classList.add('selected');
                            }
                            updateChart();
                        }
                    });
                }

                /* 차트 업데이트 */
                function updateChart() {
                    const filteredStats = [...selectedLabels].reduce((acc, label) => { // 선택된 레이블들 저장
                        acc[label] = stats[label];
                        return acc;
                    }, {});

                    chart.data.labels = Object.keys(filteredStats); // 선택된 레이블들을 가져와 차트의 레이블로 설정
                    chart.data.datasets[0].data = Object.values(filteredStats).map(v => parseFloat(v) || 0); // 각 레이블의 값을 가져와 숫자로 변환하거나 기본 값을 0(오류 방지)으로 설정

                    chart.update();
                }

                vscode.postMessage({ type: 'ready' });
            </script>
        </body>
        </html>
    `;
}

// This method is called when your extension is deactivated
export function deactivate() { }