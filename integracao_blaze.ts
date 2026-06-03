import { makeConnection } from './src/main/index';

// --- LÓGICA DO USUÁRIO ADAPTADA PARA NODE.JS ---

let firebaseRounds: any[] = [];
let gapHistory: number[] = [];
let cycleHistory: any[] = [];
let currentPhase = "NORMAL";
let phaseCounts = { "EXPANSÃO": 0, "COMPRESSÃO": 0, "RUPTURA": 0, "RELAXAMENTO": 0 };

const PERFECT_PATTERNS: Record<string, number> = {
    "6,11,11": 50, "7,10,10": 40, "2,10,10": 33, "11,10,10": 33, "8,11,11": 29, "10,1,1": 17, "2,4,4": 17, "3,10": 13, "8,8,8": 12, "10,10": 9, "10,10,10": 9, "14,14,14": 8, "5,5,5": 8, "11,11": 7, "12,12,12": 7, "14,14": 6, "8,8": 6, "13,13,13": 6, "2,2,2": 5, "7,7,7": 5, "6,6": 4, "4,4": 4, "12,12": 4, "5,5": 4, "13,13": 4, "9,9": 4, "1,1": 4, "3,3": 4, "7,7": 4, "6,6,6": 3, "4,4,4": 3, "2,2": 2
};

const PULLER_NUMBERS: Record<string, number> = {
    "10": 5, "8": 3, "3": 3, "11": 3, "12": 2, "9": 2, "2": 2, "4": 2, "1": 2, "7": 2, "13": 2, "6": 2, "5": 2, "14": 2
};

const GAP_PROBABILITY: Record<string, number> = {
    "1": 100, "16": 4, "3": 4, "29": 3, "5": 3, "4": 3, "25": 3, "7": 3, "49": 3, "21": 3, "9": 3, "8": 2, "10": 2, "19": 2, "31": 2, "35": 2, "11": 2, "13": 2
};

const HOT_MINUTES = [19, 6, 45, 28, 48, 56, 53, 37, 16, 4];
const AVG_GAP = 13.5;

function detectCyclePhase(gaps: number[]) {
    if (gaps.length < 2) return "ESTÁVEL";
    const currentGap = gaps[0];
    const lastGap = gaps[1];
    const secondLastGap = gaps[2] || AVG_GAP;
    if (currentGap > lastGap && currentGap > AVG_GAP) return "EXPANSÃO";
    if (lastGap > AVG_GAP * 1.5 && currentGap < lastGap) return "COMPRESSÃO";
    if (lastGap <= 2 && secondLastGap > AVG_GAP * 2) return "RUPTURA";
    if (lastGap <= 1 && secondLastGap <= 1) return "RELAXAMENTO";
    return "NORMAL";
}

function getCycleWeight(phase: string) {
    const weights: Record<string, number> = { "EXPANSÃO": 1.2, "COMPRESSÃO": 1.5, "RUPTURA": 1.8, "RELAXAMENTO": 0.7, "NORMAL": 1.0, "ESTÁVEL": 1.0 };
    return weights[phase] || 1.0;
}

function runAI() {
    if (firebaseRounds.length < 1) return;
    const rounds = firebaseRounds;
    
    let gap = 0;
    for (let i = 0; i < rounds.length; i++) {
        if (rounds[i].color === 'W') break;
        gap++;
    }

    if (gapHistory.length === 0 || gapHistory[0] !== gap) {
        gapHistory.unshift(gap);
        if (gapHistory.length > 50) gapHistory.pop();
    }

    const cyclePhase = detectCyclePhase(gapHistory);
    const cycleWeight = getCycleWeight(cyclePhase);

    if (cyclePhase !== currentPhase) {
        if (currentPhase !== "NORMAL") {
            const now = new Date();
            cycleHistory.push({ phase: cyclePhase, startTime: now.toLocaleTimeString() });
            if (cycleHistory.length > 50) cycleHistory.shift();
            // @ts-ignore
            if (phaseCounts[cyclePhase] !== undefined) phaseCounts[cyclePhase]++;
        }
        currentPhase = cyclePhase;
    }

    const last3 = rounds.slice(0, 3).map(r => r.num).reverse().join(',');
    const last2 = rounds.slice(0, 2).map(r => r.num).reverse().join(',');
    const lastNum = rounds[0].num;
    
    let confidence = 5;
    let foundPattern = null;

    if (PERFECT_PATTERNS[last3]) {
        confidence = PERFECT_PATTERNS[last3] + 20;
        foundPattern = `Padrão de Tripla: [<LaTex>${last3}]`;
    } else if (PERFECT_PATTERNS[last2]) {
        confidence = PERFECT_PATTERNS[last2] + 10;
        foundPattern = `Padrão de Dupla: [$</LaTex>{last2}]`;
    }

    if (PULLER_NUMBERS[lastNum]) {
        confidence += (PULLER_NUMBERS[lastNum] * 2);
        if (!foundPattern) foundPattern = `Número Puxador: ${lastNum}`;
    }

    const gapProb = GAP_PROBABILITY[gap] || 0;
    confidence += gapProb;
    if (gap > 30) confidence += 10;

    confidence = confidence * cycleWeight;

    const now = new Date();
    let minDiff = 999;
    let predictedMinute = -1;
    for (let hotMin of HOT_MINUTES) {
        let diff = hotMin - now.getMinutes();
        if (diff < 0) diff += 60;
        if (diff < minDiff) {
            minDiff = diff;
            predictedMinute = hotMin;
        }
    }

    if (minDiff === 0) confidence += 25;
    else if (minDiff <= 2) confidence += 10;

    const finalConf = Math.min(confidence, 99);
    
    console.clear();
    console.log("=========================================");
    console.log(`   BRANCO AI CORE v6.1 - NODE.JS`);
    console.log("=========================================");
    console.log(`Status: Última: ${rounds[0].num} (<LaTex>${rounds[0].color === 'R' ? 'Vermelho' : (rounds[0].color === 'B' ? 'Preto' : 'Branco')})`);
    console.log(`Fase do Ciclo: $</LaTex>{cyclePhase} (<LaTex>${cycleWeight.toFixed(1)}x)`);
    console.log(`Gap Atual: $</LaTex>{gap} | Confiança: <LaTex>${finalConf.toFixed(0)}%`);
    console.log(`Próximo Minuto Quente: $</LaTex>{predictedMinute} (Faltam <LaTex>${minDiff} min)`);
    console.log("-----------------------------------------");
    
    if (finalConf >= 80) {
        console.log(`\x1b[32mENTRADA MÁXIMA: $</LaTex>{foundPattern}\x1b[0m`);
    } else if (finalConf >= 50) {
        console.log(`\x1b[33mPREPARAR ENTRADA\x1b[0m`);
    } else {
        console.log(`\x1b[90mAGUARDAR\x1b[0m`);
    }
    console.log("-----------------------------------------");
    console.log("Histórico Recente:", rounds.slice(0, 10).map(r => r.num === 0 ? 'W' : r.num).join(' | '));
    console.log("=========================================");
}

async function start() {
    console.log("Conectando à API Blaze...");
    try {
        const socket = await makeConnection({
            web: 'blaze',
            type: 'doubles',
            reconnect: true
        });

        socket.on('double.tick', (data) => {
            if (data.status === 'complete' && data.roll !== null) {
                const num = parseInt(data.roll);
                let colorCode = 'W';
                if (num >= 1 && num <= 7) colorCode = 'R';
                else if (num >= 8 && num <= 14) colorCode = 'B';

                firebaseRounds.unshift({
                    color: colorCode,
                    num: num,
                    time: new Date().toLocaleTimeString('pt-BR'),
                    dt: new Date()
                });

                if (firebaseRounds.length > 50) firebaseRounds.pop();
                runAI();
            }
        });

        socket.on('close', (info) => {
            console.log("Conexão fechada. Tentando reconectar...", info);
        });

    } catch (error) {
        console.error("Erro na conexão:", error);
    }
}

start();
