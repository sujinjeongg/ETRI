import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

const profileJsonPath = path.join(__dirname, '../src', 'profiles.json');

/* profiles.json 데이터 불러오기 */
function loadProfiles(): any[] {
    if (fs.existsSync(profileJsonPath)) {
        const data = fs.readFileSync(profileJsonPath, 'utf-8');
        try {
            const parsedData = JSON.parse(data);
            return parsedData.profiles || [];
        } catch (err) {
            console.error("Error parsing JSON:", err);
            return [];
        }
    }
    return [];
}

/* script 파일, parameters 설정 (profiles.json에 저장된 정보 중에 선택하거나 사용자가 직접 입력) 후 gem5 실행 */
export async function selectAndRunProfile(): Promise<void> {
    // profiles.json 데이터 불러오기
    const profilesData = loadProfiles();

    // profiles.json에 저장된 정보 중에 선택하거나 직접 입력 옵션 제공
    const options = profilesData.map(profile => profile.name).concat('Enter script path manually');
    const selectedOption = await vscode.window.showQuickPick(options, { placeHolder: 'Select a profile or enter a script path manually' });

    if (!selectedOption) return;

    let gem5Path: string, gem5Binary: string, gem5Script: string, parameters: string | undefined;

    if (selectedOption === 'Enter script path manually') { // 사용자가 직접 script 경로, parameters(선택) 입력
        gem5Path = "/UHome/etri33301/SoCExtension/gem5";
        gem5Binary = path.join(gem5Path, "build/X86/gem5.opt");
        gem5Script = await vscode.window.showInputBox({ prompt: 'Enter the path to the gem5 script' }) || '';
        parameters = await vscode.window.showInputBox({ prompt: 'Enter any additional parameters (optional)' });

        const newProfile = {
            name: path.basename(gem5Script),
            gem5Path: gem5Path,
            gem5Binary: "build/X86/gem5.opt",
            gem5Script: gem5Script,
            parameters: parameters || ''
        };
        profilesData.push(newProfile); // 사용자 입력 프로파일을 profiles.json에 추가
        fs.writeFileSync(profileJsonPath, JSON.stringify({ profiles: profilesData }, null, 4), 'utf-8');

        vscode.window.showInformationMessage(`New profile "${newProfile.name}" saved.`);

    } else { // profiles.json 데이터 불러오기 
        const selectedProfile = profilesData.find(profile => profile.name === selectedOption);
        if (!selectedProfile) {
            vscode.window.showErrorMessage('Invalid profile selection!');
            return;
        }
        gem5Binary = path.join(selectedProfile.gem5Path, selectedProfile.gem5Binary);
        gem5Script = path.join(selectedProfile.gem5Path, selectedProfile.gem5Script);
        parameters = selectedProfile.parameters;
    }

    // 터미널 연동하여 gem5 실행
    const terminal = vscode.window.createTerminal('gem5 simulation');
    const command = `${gem5Binary} ${gem5Script} ${parameters || ''}`;
    terminal.sendText(command);
    terminal.show();
}
