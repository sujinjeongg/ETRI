import * as fs from 'fs';

// stats.txt 파싱 
export function parseStatsFile(filePath: string): Record<string, string> {
    const stats: Record<string, string> = {};
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        return stats;
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const lines = fileContent.split('\n');
    for (const line of lines) {
        const [key, value] = line.split(/\s+/); // key와 value를 공백으로 구분
        if (key && value) {
            stats[key] = value;
        }
    }
    return stats;
}

// stats.txt 파일 변경 감지 
export function watchStatsFile(filePath: string, callback: (data: Record<string, string>) => void): void {
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        return;
    }

    console.log("Watching stats file:", filePath);

    fs.watch(filePath, (eventType) => {
        console.log(`File changed: ${filePath}, Event Type: ${eventType}`);
        if (eventType === 'change') {
            const stats = parseStatsFile(filePath);
            callback(stats);
        }
    });
}
