import * as vscode from "vscode";
import { spawn } from "child_process";
import path from "path";

/* gem5 실행 및 로그 내용 출력 */
async function runGem5AndStreamLogs(panel: vscode.WebviewPanel) {
  const gem5Path = "/UHome/etri33301/SoCExtension/gem5";
  const gem5Binary = path.join(gem5Path, "build/X86/gem5.opt");
  const gem5Script = await vscode.window.showInputBox({ prompt: 'Enter the path to the gem5 script' }) || '';

  // gem5 실행
  const gem5Process = spawn(gem5Binary, [gem5Script], { shell: true });

  gem5Process.stdout.on("data", (data) => {
    panel.webview.postMessage({ type: "log", content: data.toString() });
  });

  gem5Process.stderr.on("data", (data) => {
    panel.webview.postMessage({ type: "error", content: data.toString() });
  });

  gem5Process.on("close", (code) => {
    panel.webview.postMessage({ type: "exit", content: `gem5 종료 (코드: ${code})` });
  });

  // WebView에서 메시지 수신
  panel.webview.onDidReceiveMessage((message) => {
    if (message.type === "navigate") {
      openFileAtLine(message.file, message.line);
    }
  });
}

/* 특정 파일의 해당 줄로 이동 */
function openFileAtLine(filePath: string, lineNumber: number) {
  const fileUri = vscode.Uri.file(filePath);
  vscode.workspace.openTextDocument(fileUri).then((doc) => {
    vscode.window.showTextDocument(doc).then((editor) => {
      const position = new vscode.Position(lineNumber - 1, 0);
      editor.selection = new vscode.Selection(position, position);
      editor.revealRange(new vscode.Range(position, position)); // 해당 위치가 보이도록 스크롤
    });
  });
}

export function createLogWebview() {
  const logPanel = vscode.window.createWebviewPanel(
    "gem5LogViewer",
    "gem5 Log Viewer",
    vscode.ViewColumn.One,
    { enableScripts: true }
  );
  console.log('Log WebView panel created.');

  // WebView HTML 내용 설정
  logPanel.webview.html = getLogWebviewContent();

  // gem5 실행 및 로그 내용 출력
  runGem5AndStreamLogs(logPanel);
}

/* WebView HTML 내용 생성 (log) */
function getLogWebviewContent(): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>gem5 Log Viewer</title>
      <style>
        body { font-family: monospace; }
        #log-container { white-space: pre-wrap; overflow-y: scroll; height: 90vh; border: 1px solid #ccc; padding: 5px; }
        .error { color: red; }
        .warning { color: orange; }
        mark { background-color: yellow; }
      </style>
    </head>
    <body>
      <input type="text" id="filterInput" placeholder="검색어 입력" oninput="filterLogs()">
      <div id="log-container"></div>
 
      <script>
        const vscode = acquireVsCodeApi();
        const logContainer = document.getElementById("log-container");

        // 로그 개수 제한 (500개 이상이면 오래된 로그 삭제)
        const MAX_LOGS = 500;

        window.addEventListener("message", (event) => {
          const message = event.data;
          const logEntry = document.createElement("div");

          if (message.type === "log") {
            logEntry.textContent = message.content;
          } else if (message.type === "error") {
            logEntry.textContent = "[ERROR] " + message.content;
            logEntry.classList.add("error");
          } else if (message.type === "exit") {
            logEntry.textContent = message.content;
          }
          
          logContainer.appendChild(logEntry);
          if (logContainer.children.length > MAX_LOGS) {
            logContainer.removeChild(logContainer.firstChild);
          }
          logContainer.scrollTop = logContainer.scrollHeight;
        });

        // 로그 내 검색 
        function filterLogs() {
          const filterText = document.getElementById("filterInput").value.toLowerCase();
          document.querySelectorAll("#log-container div").forEach(div => {
            if (div.textContent.toLowerCase().includes(filterText)) {
              div.style.display = "block";
            } else {
              div.style.display = "none";
            }
          });
        }

        // 로그에서 파일 및 줄 번호 감지하여 클릭 시 VS Code에서 해당 위치로 이동
        document.getElementById("log-container").addEventListener("click", (event) => {
          const logText = event.target.textContent;
          const fileMatch = logText.match(/File "([^"]+)", line (\d+)/);

          if (fileMatch) {
            const filePath = fileMatch[1];
            const lineNumber = parseInt(fileMatch[2], 10);
            vscode.postMessage({ type: "navigate", file: filePath, line: lineNumber });
          }
        });
      </script>
    </body>
    </html>`;
}