import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export async function runGem5AndParse() {
    const gem5Path = "/UHome/etri33301/SoCExtension/gem5";
    const gem5Binary = path.join(gem5Path, "build/X86/gem5.opt");
    const gem5Script = await vscode.window.showInputBox({ prompt: 'Enter the path to the gem5 script' }) || '';
    const scriptName = path.basename(gem5Script);
    const statsFilePath = "/UHome/etri33301/SoCExtension/gem5/m5out/stats.txt"

    // 터미널 연동하여 gem5 실행
    const terminal = vscode.window.createTerminal({
        name: 'gem5 simulation',
        cwd: "/UHome/etri33301/SoCExtension/gem5"
    });
    const command = `${gem5Binary} ${gem5Script}`;
    terminal.sendText(command);
    terminal.show();

    // stats.txt 변경 감지 후 파싱 실행
    fs.watchFile(statsFilePath, { interval: 50000 }, (curr, prev) => {
        if (curr.mtime > prev.mtime) {
            console.log("stats.txt 파일이 업데이트됨! 데이터 파싱 시작...");

            // 약간의 지연 후 실행 (파일이 완전히 쓰일 시간을 주기 위해)
            setTimeout(() => {
                parseStats(statsFilePath, scriptName);
                fs.unwatchFile(statsFilePath);  // 감지 중지
            }, 1000);
        }
    });
}

/* stats.txt 전체 데이터 파싱 */
function parseStats(statsFile: string, scriptName: string) {
    try {
        const data = fs.readFileSync(statsFile, 'utf-8');
        const parsedData: Record<string, any> = {};

        // stats.txt의 모든 라인 파싱
        data.split("\n").forEach(line => {
            const [key, ...valueParts] = line.split(/\s+/);
            if (key && key !== "----------") {
                // 주석(#) 이후 제거
                const valueString = valueParts.join(" ").split("#")[0].trim();
                // 숫자로 변환 가능하면 변환
                const value = isNaN(Number(valueString)) ? valueString : parseFloat(valueString);
                parsedData[key] = value;
            }
        });

        console.log(`📊 Parsed Data for ${scriptName}:`, parsedData);

        // JSON 파일에 저장 (scatterplot_stats.json)
        const outputJsonPath = path.join(__dirname, '../src', 'scatterplot_stats.json');
        let existingData: Record<string, any> = {};

        // 기존 JSON 데이터 불러오기
        if (fs.existsSync(outputJsonPath)) {
            const jsonData = fs.readFileSync(outputJsonPath, 'utf-8');
            existingData = JSON.parse(jsonData);
        }

        // 스크립트 이름을 키로 stats 추가
        existingData[scriptName] = parsedData;

        // 업데이트된 데이터를 JSON 파일에 저장
        fs.writeFileSync(outputJsonPath, JSON.stringify(existingData, null, 2), 'utf-8');
    } catch (error) {
        console.log(`Error parsing stats file: ${error}`);
    }
}
