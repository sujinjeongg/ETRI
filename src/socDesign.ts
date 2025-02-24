import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/* SoC design 후 gem5 실행 */
async function socDesignAndRun(config: any) {
    let scriptContent = `from gem5.components.cachehierarchies.ruby.mesi_two_level_cache_hierarchy import MESITwoLevelCacheHierarchy
import m5
from m5.objects import *

# Here we setup a MESI Two Level Cache Hierarchy.
cache_hierarchy = MESITwoLevelCacheHierarchy(
    l1d_size="${config.l1dSize}kB",
    l1d_assoc=${config.l1dAssoc},
    l1i_size="${config.l1iSize}kB",
    l1i_assoc=${config.l1iAssoc},
    l2_size="${config.l2Size}kB",
    l2_assoc=${config.l2Assoc},
    num_l2_banks=1,
)

root = Root(full_system=False)  # SE 모드 사용

sys = System()
sys.clk_domain = SrcClockDomain(clock="${config.clockSize}GHz", voltage_domain=VoltageDomain())
sys.mem_mode = "${config.memMode}"
sys.mem_ranges = [AddrRange("${config.addrRange}MB")] 

sys.membus = SystemXBar()

sys.cpu = ${config.cpu}()
sys.cpu.createThreads()

sys.cpu.createInterruptController()
sys.cpu.interrupts[0].pio = sys.membus.mem_side_ports
sys.cpu.interrupts[0].int_requestor = sys.membus.cpu_side_ports

sys.mem_ctrl = MemCtrl()
sys.mem_ctrl.dram = DDR3_1600_8x8(range=sys.mem_ranges[0])
sys.mem_ctrl.port = sys.membus.mem_side_ports

sys.cpu.icache_port = sys.membus.cpu_side_ports
sys.cpu.dcache_port = sys.membus.cpu_side_ports

sys.workload = X86EmuLinux()

process = Process()
process.cmd = ["/UHome/etri33301/SoCExtension/gem5/configs/matrix-multiply"] 
#process.cmd = ["/UHome/etri33294/Next_Generation_Memory_Platform/gem5/tests/test-progs/hello/bin/x86/linux/hello32"]

sys.cpu.workload = process

sys.system_port = sys.membus.cpu_side_ports

root.system = sys
for obj in root.descendants():
    print(obj)

m5.instantiate()

print("gem5 Simulation 시작!")
exit_event = m5.simulate()
m5.stats.dump()
print(f"Exiting @ tick {m5.curTick()} because {exit_event.getCause()}")`;

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
    // SoC Design WebView Panel 생성
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
            <label>Clock Size:</label><input id="clockSize" type="number" value="1"><br><br>
            <label>Memory Mode:</label>
            <select id="memMode">
                <option value="atomic">Atomic</option>
                <option value="timing">Timing</option>
                <option value="simple">Simple</option>
            </select><br><br>
            <label>Address Range (MB):</label><input id="addrRange" type="number" value="128"><br><br>
            <label>CPU type:</label><select id="cpu">
                <option value="X86AtomicSimpleCPU">X86AtomicSimpleCPU</option>
                <option value="TimingSimpleCPU">TimingSimpleCPU</option>
                <option value="O3CPU">O3CPU</option>
            </select><br><br>
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
                        clockSize: document.getElementById('clockSize').value,
                        memMode: document.getElementById('memMode').value,
                        addrRange: document.getElementById('addrRange').value,
                        cpu: document.getElementById('cpu').value,
                    };
                    vscode.postMessage({ type: 'runSimulation', data: config });
                }
            </script>
        </body>
        </html>`;
}