import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/* SoC design 후 gem5 실행 */
async function socDesignAndRun(config: any) {
    let scriptContent = `from gem5.components.boards.x86_board import X86Board
from gem5.components.cachehierarchies.ruby.mesi_two_level_cache_hierarchy import MESITwoLevelCacheHierarchy
from gem5.components.memory.single_channel import SingleChannelDDR3_1600
from gem5.components.processors.cpu_types import CPUTypes
from gem5.components.processors.simple_switchable_processor import SimpleSwitchableProcessor
from gem5.isas import ISA
from gem5.resources.resource import obtain_resource
from gem5.simulate.simulator import Simulator

cache_hierarchy = MESITwoLevelCacheHierarchy(
    l1d_size="${config.l1dSize}kB",
    l1d_assoc=${config.l1dAssoc},
    l1i_size="${config.l1iSize}kB",
    l1i_assoc=${config.l1iAssoc},
    l2_size="${config.l2Size}kB",
    l2_assoc=${config.l2Assoc},
    num_l2_banks=1,
)

memory = SingleChannelDDR3_1600(size="${config.memorySize}GB")

processor = SimpleSwitchableProcessor(
    starting_core_type=CPUTypes.${config.startingCore},
    switch_core_type=CPUTypes.${config.switchCore},
    isa=ISA.X86,
    num_cores=${config.numCores},
)

board = X86Board(
    clk_freq="${config.clkFreq}GHz",
    processor=processor,
    memory=memory,
    cache_hierarchy=cache_hierarchy,
)

command = "m5 exit; echo 'Running custom SoC design'; m5 exit;"
board.set_kernel_disk_workload(
    kernel=obtain_resource("x86-linux-kernel-4.4.186"),
    disk_image=obtain_resource("x86-ubuntu-18.04-img"),
    readfile_contents=command,
)

simulator = Simulator(board=board)
simulator.run()
processor.switch()
simulator.run()
`;

    // 동적으로 업데이트된 scriptContent로 gem5 실행
    const scriptPath = path.join(__dirname, '../src', 'generated_soc_script.py');
    fs.writeFileSync(scriptPath, scriptContent);

    const gem5Path = '/UHome/etri33301/SoCExtension/gem5';
    const gem5Binary = path.join(gem5Path, 'build/X86/gem5.opt');
    const terminal = vscode.window.createTerminal('gem5 simulation');
    terminal.sendText(`${gem5Binary} ${scriptPath}`);
    terminal.show();
}

export function createSoCDesignWebview() {
    /* SoC Design WebView Panel 생성 */
    const socDesignPanel = vscode.window.createWebviewPanel(
        'SoCDesign',
        'SoC Design',
        vscode.ViewColumn.One,
        { enableScripts: true }
    );
    console.log('SoC Design WebView panel created.');

    // WebView HTML 내용 설정
    socDesignPanel.webview.html = getSoCDesignWebviewContent();

    // Webview에서 수신 이벤트 처리
    socDesignPanel.webview.onDidReceiveMessage(message => {
        if (message.type === 'runSimulation') {
            const configData = message.data;

            // configData를 socDesignAndRun에 전달
            socDesignAndRun(configData);
        }
    });
    console.log('SoC Design WebView message handler registered');
}

/* Webview HTML 내용 생성 (SoC design) */
function getSoCDesignWebviewContent(): string {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>SoC Design</title>
        </head>
        <body>
            <h1>Configure your SoC</h1>
            <label>L1D Cache Size (kB):</label><input id="l1dSize" type="number" value="16"><br><br>
            <label>L1D Assoc:</label><input id="l1dAssoc" type="number" value="8"><br><br>
            <label>L1I Cache Size (kB):</label><input id="l1iSize" type="number" value="16"><br><br>
            <label>L1I Assoc:</label><input id="l1iAssoc" type="number" value="8"><br><br>
            <label>L2 Cache Size (kB):</label><input id="l2Size" type="number" value="256"><br><br>
            <label>L2 Assoc:</label><input id="l2Assoc" type="number" value="16"><br><br>
            <label>Memory Size (GB):</label><input id="memorySize" type="number" value="3"><br><br>
            <label>Number of Cores:</label><input id="numCores" type="number" value="2"><br><br>
            <label>Clock Frequency (GHz):</label><input id="clkFreq" type="text" value="3"><br><br>
            <button onclick="runSimulation()">Run Simulation</button>
            <script>
                const vscode = acquireVsCodeApi();
                function runSimulation() {
                    const config = {
                        l1dSize: document.getElementById('l1dSize').value,
                        l1dAssoc: document.getElementById('l1dAssoc').value,
                        l1iSize: document.getElementById('l1iSize').value,
                        l1iAssoc: document.getElementById('l1iAssoc').value,
                        l2Size: document.getElementById('l2Size').value,
                        l2Assoc: document.getElementById('l2Assoc').value,
                        memorySize: document.getElementById('memorySize').value,
                        numCores: document.getElementById('numCores').value,
                        clkFreq: document.getElementById('clkFreq').value,
                        startingCore: 'TIMING',
                        switchCore: 'O3'
                    };
                    vscode.postMessage({ type: 'runSimulation', data: config });
                }
            </script>
        </body>
        </html>`;
}