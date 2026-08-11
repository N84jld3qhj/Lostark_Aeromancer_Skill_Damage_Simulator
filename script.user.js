// ==UserScript==
// @name         로펙 시뮬레이터 베이스 스킬 데미지 시뮬레이터
// @namespace    https://github.com/N84jld3qhj/Lostark_WindWielder_Simulator
// @version      1.0.2
// @description  시뮬레이터 DOM 파싱 및 실시간 데미지/스탯 연산
// @author       N84jld3qhj
// @match        https://lopec.kr/character/simulator/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=lopec.kr
// @grant        GM_addStyle
// @updateURL    https://raw.githubusercontent.com/N84jld3qhj/Lostark_WindWielder_Simulator/main/script.user.js
// @downloadURL  https://raw.githubusercontent.com/N84jld3qhj/Lostark_WindWielder_Simulator/main/script.user.js
// ==/UserScript==

(function () {
    'use strict';
    GM_addStyle(`
        /* 1. 팝업/모달 외곽 창 크기 대폭 확장 */
        #arkEvolutionContainer {
            display: flex !important;
            flex-direction: column !important;
            gap: 24px !important;
            width: 100% !important;
            padding: 20px !important;
            box-sizing: border-box !important;
        }

        .ark-row {
            display: grid !important;
            grid-template-columns: repeat(6, 1fr) !important;
            justify-items: center !important;
            align-items: center !important;
            width: 100% !important;
            gap: 12px !important;
        }

        .ark-node {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            width: auto !important;
        }

        .ark-icon {
            width: 48px !important;
            height: 48px !important;
            border-radius: 50% !important;
            object-fit: cover !important;
            margin-bottom: 6px !important;
            cursor: pointer !important;
        }

        .ark-icon.grayscale {
            filter: grayscale(100%) opacity(0.35) !important;
        }

        .node-controls {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            background-color: #1e1b2e !important;
            border-radius: 6px !important;
            padding: 2px 6px !important;
            width: 85px !important;
        }

        .node-controls span {
            font-size: 12px !important;
            color: #e2e8f0 !important;
            font-family: monospace !important;
        }

        .btn-node {
            background: transparent !important;
            border: none !important;
            color: #8b5cf6 !important;
            font-size: 14px !important;
            font-weight: bold !important;
            cursor: pointer !important;
        }

        #arkEvolutionContainer,
        #arkEvolutionContainer * {
            box-sizing: border-box !important;
        }

        #arkEvolutionContainer {
            display: flex !important;
            flex-direction: column !important;
            gap: 20px !important;
            width: 100% !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            padding: 10px 0 !important;
        }

        .ark-row {
            display: grid !important;
            grid-template-columns: repeat(6, 1fr) !important;
            justify-items: center !important;
            align-items: center !important;
            width: 100% !important;
            gap: 8px !important;
        }
            table {
    table-layout: fixed;
    width: 100%;
}
    td, th {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
    `);

    // baselineResults 변수 선언 시 로컬 스토리지 데이터 복원
    let baselineResults = null;

    try {
        const savedData = localStorage.getItem('savedBaselineResults');
        if (savedData) {
            baselineResults = JSON.parse(savedData);
        }
    } catch (e) {
        console.error('로컬스토리지 불러오기 실패:', e);
        baselineResults = null;
    }

    // 전역 변수 선언
    let lastCalculatedResults = null; // 최근 계산 결과
    window.isGiRyuSet = false;
    window.isCalcPaused = true;
    // =============================================================================
    // 1. 아크 패시브 진화 노드 데이터셋 및 라인별 제한
    // =============================================================================
    const rowMaxLimits = [40, 3, 2, 2, 2];

    const evolutionNodes = [
        [
            { name: "치명", id: 1, max: 30, current: 0, effects: [{ type: "치명", valuePerLevel: 50 }] },
            { name: "특화", id: 2, max: 30, current: 0, effects: [] },
            { name: "제압", id: 3, max: 30, current: 0, effects: [] },
            { name: "신속", id: 4, max: 30, current: 0, effects: [{ type: "신속", valuePerLevel: 50 }] },
            { name: "인내", id: 5, max: 30, current: 0, effects: [] },
            { name: "숙련", id: 6, max: 30, current: 0, effects: [] }
        ],
        [
            { name: "끝없는 마나", id: 16, max: 2, current: 0, effects: [{ type: "마나 스킬 쿨타임 감소", valuePerLevel: 7 }] },
            { name: "금단의 주문", id: 12, max: 2, current: 0, effects: [{ type: "진화형 피해", valuePerLevel: 10 }] },
            { name: "예리한 감각", id: 29, max: 2, current: 2, effects: [{ type: "치명타 적중률", valuePerLevel: 4 }, { type: "진화형 피해", valuePerLevel: 5 }] },
            { name: "한계 돌파", id: 34, max: 3, current: 0, effects: [{ type: "진화형 피해", valuePerLevel: 10 }] },
            { name: "최적화 훈련", id: 22, max: 2, current: 0, effects: [{ type: "쿨타임 감소", valuePerLevel: 4 }, { type: "진화형 피해", valuePerLevel: 5 }] },
            { name: "축복의 여신", id: 19, max: 3, current: 0, effects: [] }
        ],
        [
            { name: "무한한 마력", id: 14, max: 2, current: 0, effects: [{ type: "진화형 피해", valuePerLevel: 8 }, { type: "마나 스킬 쿨타임 감소", valuePerLevel: 7 }] },
            { name: "혼신의 강타", id: 27, max: 2, current: 0, effects: [{ type: "진화형 피해", valuePerLevel: 2 }, { type: "치명타 적중률", valuePerLevel: 12 }] },
            { name: "일격", id: 32, max: 2, current: 0, effects: [] },
            { name: "파괴 전차", id: 35, max: 2, current: 0, effects: [{ type: "진화형 피해", valuePerLevel: 12 }, { type: "공격 속도", valuePerLevel: 4 }] },
            { name: "타이밍 지배", id: 23, max: 2, current: 0, effects: [{ type: "쿨타임 감소", valuePerLevel: 5 }, { type: "진화형 피해", valuePerLevel: 8 }] },
            { name: "정열의 춤사위", id: 33, max: 2, current: 0, effects: [] }
        ],
        [
            { name: "회심", id: 40, max: 1, current: 0, effects: [{ type: "치명타 시 적에게 주는 피해", valuePerLevel: 12 }] },
            { name: "달인", id: 41, max: 1, current: 0, effects: [{ type: "추가 피해", valuePerLevel: 8.5 }, { type: "치명타 적중률", valuePerLevel: 7 }] },
            { name: "분쇄", id: 44, max: 1, current: 0, effects: [{ type: "진화형 피해", valuePerLevel: 20 }] },
            { name: "선각자", id: 42, max: 1, current: 0, effects: [] },
            { name: "진군", id: 43, max: 1, current: 0, effects: [] },
            { name: "기원", id: 45, max: 1, current: 0, effects: [] }
        ],
        [
            { name: "뭉툭한 가시", id: 20, max: 2, current: 0, isBluntThorn:true, effects: [] },
            { name: "음속 돌파", id: 21, max: 2, current: 0, isSonics: true, effects: [] },
            { name: "인파이팅", id: 38, max: 2, current: 0, effects: [] },
            { name: "입식 타격가", id: 18, max: 2, current: 0, effects: [{ type: "진화형 피해", valuePerLevel: 10.5 }] },
            { name: "마나 용광로", id: 24, max: 2, current: 0, effects: [] },
            { name: "안정된 관리자", id: 25, max: 2, current: 0, effects: [] }
        ]
    ];
    const SAVE_KEY = "arkPassiveSetting_v1";
    loadArkPassive();

function saveArkPassive() {
    const data = evolutionNodes.map(row =>
        row.map(node => node.current)
    );
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

function loadArkPassive() {
    const saved = localStorage.getItem(SAVE_KEY);
    if (!saved) return;

    const data = JSON.parse(saved);

    evolutionNodes.forEach((row, i) => {
        row.forEach((node, j) => {
            if (data[i] && data[i][j] !== undefined) {
                node.current = data[i][j];
            }
        });
    });
}
    // =============================================================================
    // 2. 상수 및 테이블 정의
    // =============================================================================
    const STAT_CONSTANTS = {

        CRIT_TO_RATE: 0.0357142857142857,        // 치명 1당 치적 %
        SWIFT_TO_SPEED: 0.0171743929359823,      // 신속 1당 공이속 %
        SWIFT_TO_CDR: 0.0215,                    // 신속 1당 쿨감 %
             
        // 시너지 & 패시브 계수
        PARTY_CRIT_SYNERGY_PER_PLAYER: 10,       // 파티 치적 시너지 (1인당 %)
        SPEED_TO_CRIT_RATE_COEFF: 0.3,           // 이동속도 비례 치적 환산 계수
        SPEED_TO_CRIT_DMG_COEFF: 1.2,            // 공격속도 비례 치피 환산 계수
        SPEED_CAP: 40,                           // 공이속 한계치 (%)
        SONICS_MAX_DMG: 24
    };

    const ADD_STAT_BASE = {
        BASE_CRIT:{category:"치명",name:"치명",value:79,unit:""},
        BASE_SWIFT:{category:"신속",name:"신속", value:237, unit:""},

        BASE_CRIT_SYNERGY:{category:"치명타 적중률",name:"자체 시너지",value:10,unit:"%"},

        EXPEDITION_STAT:{category:"주스탯",name:"원정대 레벨(400 기준)",value:1000,unit:""},
        COMBAT_LEVER_STAT:{category:"주스탯",name:"전투 레벨 70",value:477,unit:""}, 
        POTION_LEVER_STAT:{category:"주스탯",name:"능력치 증가 물약",value:850,unit:""}, 
        COLLECTION_STAT:{category:"주스탯",name:"카드 도감",value:240,unit:""},
        BASE_PET_STAT: {category:"주스탯 %",name:"펫 목장 주스탯",value:1,unit:"%"},
        BASE_AVATAR_STAT: {category:"주스탯 %",name:"전설 아바타",value:8,unit:"%"},

        SUP_ATK_SPEED:{category:"공격 속도",name:"축복의 여신",value:9,unit:"%"},
        SUP_MOVE_SPEED:{category:"이동 속도",name:"축복의 여신",value:9,unit:"%"},
        ARK_PASSIVE_ATK_SPEED:{category:"공격 속도",name:"질풍노도",value:12,unit:"%"},
        ARK_PASSIVE_MOVE_SPEED:{category:"이동 속도",name:"질풍노도",value:12,unit:"%"},
        DINNER_ATK_SPEED:{category:"공격 속도",name:"공이속 만찬",value:5,unit:"%"},
        DINNER_MOVE_SPEED:{category:"이동 속도",name:"공이속 만찬",value:5,unit:"%"},

        DINNER_WEAPON_ATK:{category:"무기 공격력",name:"만찬 무기 공격력",value:1800,unit:""},

        BASE_CRIT_DAMAGE: {category:"치명타 피해",name:"기본 치명타 피해",value:200,unit:"%"},

        WEAPON_ADDITIONAL_DAMAGE: {category:"추가 피해",name:"무기 추가 피해",value:30,unit:"%"},
        PET_ADDITIONAL_DAMAGE: {category:"추가 피해",name:"펫 목장 추가 피해",value:1,unit:"%"},

        BASE_CARD_DAMAGE: {category:"적에게 주는 피해",name:"카드 세트",value:15,unit:"%"},
        BASE_PASSIVE_DAMAGE: {category:"적에게 주는 피해",name:"깨달음 - 바람의 길",value:2.4,unit:"%"},

    }

    const equipmentDataset = {
        "에스더":{
            "엘라 3": {"0": 27284, "1": 34723, "2": 42165, "3": 52087, "4": 57048, "5": 85727, "6": 119295, "7": 183427, "8": 214400, "9": 242574, "10": 259554},
            "엘라 2": {"0": 27284, "1": 34723, "2": 42165, "3": 52087, "4": 57048, "5": 85727, "6": 119295, "7": 132468, "8": 147585, "9": 174542},
            "엘라 1": {"0": 22621, "1": 28789, "2": 34959, "3": 43185, "4": 47298, "5": 74494, "6": 105185, "7": 111799, "8": 117030},
            "엘라 0": {"0": 17958, "1": 22855, "2": 27753, "3": 34283, "4": 37548, "5": 63261, "6": 91800, "7": 96013, "8": 100514}
        },
        "무기": { "0": 124793, "1": 128059, "2": 131439, "3": 134936, "4": 138556, "5": 142303, "6": 146182, "7": 150196, "8": 154350, "9": 158649, "10": 163099, "11": 167706, "12": 172473, "13": 177406, "14": 182514, "15": 187799, "16": 193270, "17": 198101, "18": 203054, "19": 208130, "20": 213333, "21": 218667, "22": 224133, "23": 229737, "24": 235480, "25": 241367 },
        "머리": { "0": 72017, "1": 73903, "2": 75855, "3": 77875, "4": 79965, "5": 82129, "6": 84369, "7": 86688, "8": 89087, "9": 91570, "10": 94140, "11": 96801, "12": 99554, "13": 102404, "14": 105353, "15": 108406, "16": 111565, "17": 114358, "18": 117218, "19": 120150, "20": 123155, "21": 126236, "22": 129393, "23": 132629, "24": 135946, "25": 139346 },
        "상의": { "0": 57614, "1": 59123, "2": 60684, "3": 62300, "4": 63973, "5": 65704, "6": 67497, "7": 69351, "8": 71270, "9": 73257, "10": 75313, "11": 77441, "12": 79644, "13": 81924, "14": 84283, "15": 86725, "16": 89253, "17": 91486, "18": 93775, "19": 96120, "20": 98524, "21": 100989, "22": 103514, "23": 106103, "24": 108757, "25": 111477 },
        "하의": { "0": 62242, "1": 63872, "2": 65559, "3": 67306, "4": 69113, "5": 70983, "6": 72919, "7": 74922, "8": 76996, "9": 79142, "10": 81364, "11": 83664, "12": 86043, "13": 88506, "14": 91056, "15": 93693, "16": 96424, "17": 98838, "18": 101310, "19": 103844, "20": 106441, "21": 109104, "22": 111833, "23": 114630, "24": 117497, "25": 120435 },
        "장갑": { "0": 86421, "1": 88684, "2": 91026, "3": 93450, "4": 95959, "5": 98556, "6": 101244, "7": 104025, "8": 106905, "9": 109885, "10": 112969, "11": 116161, "12": 119465, "13": 122885, "14": 126425, "15": 130087, "16": 133879, "17": 137229, "18": 140662, "19": 144180, "20": 147786, "21": 151483, "22": 155271, "23": 159155, "24": 163136, "25": 167216 },
        "어깨 방어구": { "0": 76646, "1": 78654, "2": 80731, "3": 82881, "4": 85106, "5": 87410, "6": 89793, "7": 92261, "8": 94815, "9": 97457, "10": 100193, "11": 103023, "12": 105954, "13": 108987, "14": 112126, "15": 115375, "16": 118738, "17": 121709, "18": 124754, "19": 127874, "20": 131072, "21": 134351, "22": 137711, "23": 141155, "24": 144686, "25": 148304 },
        "완갑": {
            "0": { "무기공격력": 3500, "주스탯": 10500, "기본공격력": 0 },
            "1": { "무기공격력": 5350, "주스탯": 10500, "기본공격력": 0 },
            "2": { "무기공격력": 5350, "주스탯": 16500, "기본공격력": 0 },
            "3": { "무기공격력": 7210, "주스탯": 16500, "기본공격력": 0 },
            "4": { "무기공격력": 7210, "주스탯": 22530, "기본공격력": 0 },
            "5": { "무기공격력": 7210, "주스탯": 22530, "기본공격력": 850 },
            "6": { "무기공격력": 9077, "주스탯": 22530, "기본공격력": 850 },
            "7": { "무기공격력": 9077, "주스탯": 28608, "기본공격력": 850 },
            "8": { "무기공격력": 10969, "주스탯": 28608, "기본공격력": 850 },
            "9": { "무기공격력": 10969, "주스탯": 34746, "기본공격력": 850 },
            "10": { "무기공격력": 10969, "주스탯": 34746, "기본공격력": 2030 },
            "11": { "무기공격력": 12873, "주스탯": 34746, "기본공격력": 2030 },
            "12": { "무기공격력": 12873, "주스탯": 40962, "기본공격력": 2030 },
            "13": { "무기공격력": 14817, "주스탯": 40962, "기본공격력": 2030 },
            "14": { "무기공격력": 14817, "주스탯": 47268, "기본공격력": 2030 },
            "15": { "무기공격력": 14817, "주스탯": 47268, "기본공격력": 3690 },
            "16": { "무기공격력": 16778, "주스탯": 47268, "기본공격력": 3690 },
            "17": { "무기공격력": 16778, "주스탯": 53682, "기본공격력": 3690 },
            "18": { "무기공격력": 18794, "주스탯": 53682, "기본공격력": 3690 },
            "19": { "무기공격력": 18794, "주스탯": 60216, "기본공격력": 3690 },
            "20": { "무기공격력": 18794, "주스탯": 60216, "기본공격력": 5980 },
            "21": { "무기공격력": 20832, "주스탯": 60216, "기본공격력": 5980 },
            "22": { "무기공격력": 20832, "주스탯": 66888, "기본공격력": 5980 },
            "23": { "무기공격력": 22940, "주스탯": 66888, "기본공격력": 5980 },
            "24": { "무기공격력": 22940, "주스탯": 73710, "기본공격력": 5980 },
            "25": { "무기공격력": 22940, "주스탯": 73710, "기본공격력": 9050 }
        }
    };

    const skillDatabase = [

        {
            name: "몰아치기",
            constant: 5550.0,
            coefficient: 29.47,
            baseCooldown: 18,
            tripods: {
                "비연참":[
                    { tier: 1, name: "역류", category: "적에게 주는 피해", val: 60.0, unit: "%" },
                    { tier: 2, name: "우레", category: "치명타 피해", val: 180.0, unit: "%" },
                    { tier: 3, name: "공간베기", category: "적에게 주는 피해", val: 94.8, unit: "%" }
                ],
                "기류 조절":[
                    { tier: 1, name: "재빠른 손놀림", category: "고정 쿨타임 감소", val: 5, unit: "" },
                    { tier: 2, name: "우레", category: "치명타 피해", val: 180.0, unit: "%" },
                    { tier: 3, name: "공간베기", category: "적에게 주는 피해", val: 94.8, unit: "%" }
                ]
            }
        },
        {
            name: "회오리 걸음",
            constant: 5594.0,
            coefficient: 29.59,
            baseCooldown: 20,
            tripods: {
                "비연참":[
                    { tier: 2, name: "역류", category: "적에게 주는 피해", val: 95.0, unit: "%" },
                    { tier: 3, name: "초고속 회전", category: "적에게 주는 피해", val: 105.0, unit: "%" }
                ],
                "기류 조절":[
                    { tier: 2, name: "예리한 일격", category: "치명타 피해", val: 160.0, unit: "%" },
                    { tier: 3, name: "초고속 회전", category: "적에게 주는 피해", val: 105.0, unit: "%" }
                ]
            }
        
        },
        {
            name: "공간 가르기",
            constant: 31143.0,
            coefficient: 165.52,
            baseCooldown: 22,
            tripods: {
                "비연참":[ 
                    {tier: 1, name: "깨달음 - 공간 가르기", category: "적에게 주는 피해", val: 200.0, unit: "%" }
                ],
                "기류 조절":[
                    { tier: 1, name: "깨달음 - 공간 가르기", category: "적에게 주는 피해", val: 200.0, unit: "%"} 
                ]
            }
        },
        {
            name: "우레바람",
            constant: 85689.0,
            coefficient: 455.58,
            baseCooldown: 50,
            tripods: {
                "비연참":[
                    { tier: 1, name: "도약 - 풀려난 힘", category: "적에게 주는 피해", val: 15.0, unit: "%" },
                    { tier: 1, name: "도약 - 잠재력 해방", category: "쿨타임 감소", val: 8.0, unit: "%" },
                    { tier: 2, name: "도약 - 단련된 가르기", category: "적에게 주는 피해", val: 70.0, unit: "%" }
                ],
                "기류 조절":[
                                        { tier: 1, name: "도약 - 풀려난 힘", category: "적에게 주는 피해", val: 15.0, unit: "%" },
                    { tier: 1, name: "도약 - 잠재력 해방", category: "쿨타임 감소", val: 8.0, unit: "%" },
                    { tier: 2, name: "도약 - 단련된 가르기", category: "적에게 주는 피해", val: 70.0, unit: "%" }
                ]
            }
        },
        {
            name: "바람송곳",
            constant: 8918.0,
            coefficient: 47.42,
            baseCooldown: 27,
            tripods: {
                "비연참":[
                    { tier: 1, name: "역류", category: "적에게 주는 피해", val: 60.0, unit: "%" },
                    { tier: 2, name: "큰 센바람", category: "적에게 주는 피해", val: 60.0, unit: "%" },
                    { tier: 3, name: "집중공격", category: "적에게 주는 피해", val: 95.0, unit: "%" }
                ],
                "기류 조절":[
                    { tier: 1, name: "관통", category: "방어력 무시", val: 52.0, unit: "%" },
                    { tier: 2, name: "큰 센바람", category: "적에게 주는 피해", val: 60.0, unit: "%" },
                    { tier: 3, name: "집중공격", category: "적에게 주는 피해", val: 95.0, unit: "%" }
                ]
            }
        },
        {
            name: "칼바람",
            constant: 8395.0,
            coefficient: 44.59,
            baseCooldown: 27,
            tripods: {
                "비연참":[
                    { tier: 1, name: "거대 돌풍", category: "적에게 주는 피해", val: 45.0, unit: "%" },
                    { tier: 2, name: "역류", category: "적에게 주는 피해", val: 95.0, unit: "%" },
                    { tier: 3, name: "벼락", category: "치명타 피해", val: 210.0, unit: "%" }
                ],
                "기류 조절":[
                    { tier: 1, name: "거대 돌풍", category: "적에게 주는 피해", val: 45.0, unit: "%" },
                    { tier: 2, name: "절단", category: "적에게 주는 피해", val: 60.0, unit: "%" },
                    { tier: 3, name: "벼락", category: "치명타 피해", val: 210.0, unit: "%" }
                ]
            }
        },
        {
            name: "싹쓸바람",
            constant: 3844.0,
            coefficient: 20.32202,
            baseCooldown: 30,
            tripods: {
                "비연참":[
                    { tier: 1, name: "빠른 준비", category: "고정 쿨타임 감소", val: 11.0, unit: "초" },
                    { tier: 2, name: "소멸", category: "적에게 주는 피해", val: 70.8, unit: "%" },
                    { tier: 3, name: "증기 조절", category: "적에게 주는 피해", val: 80.0, unit: "%" }
                ],
                "기류 조절":[
                    { tier: 1, name: "빠른 준비", category: "고정 쿨타임 감소", val: 11.0, unit: "초" },
                    { tier: 2, name: "소멸", category: "적에게 주는 피해", val: 70.8, unit: "%" },
                    { tier: 3, name: "증기 조절", category: "적에게 주는 피해", val: 80.0, unit: "%" }
                ]
            }
        },
        {
            name: "소용돌이",
            constant: 3515.0,
            coefficient: 18.68,
            baseCooldown: 16,
            tripods: {
                "비연참":[
                    { tier: 2, name: "바람 기둥", category: "적에게 주는 피해", val: 58.6, unit: "%" },
                    { tier: 3, name: "증기 조절", category: "적에게 주는 피해", val: 80.0, unit: "%" }
                ],
                "기류 조절":[
                    { tier: 2, name: "바람 기둥", category: "적에게 주는 피해", val: 58.6, unit: "%" },
                    { tier: 3, name: "증기 조절", category: "적에게 주는 피해", val: 80.0, unit: "%" }
                ]
            }
        },
        {
            name: "마주바람",
            constant: 10701.0,
            coefficient: 56.85,
            baseCooldown: 20,
            tripods: {
                "비연참":[
                    { tier: 1, name: "빠른 준비", category: "고정 쿨타임 감소", val: 6.0, unit: "초" },
                    { tier: 2, name: "마주바람 강화", category: "적에게 주는 피해", val: 45.0, unit: "%" }
                ],
                "기류 조절":[
                    { tier: 1, name: "빠른 준비", category: "고정 쿨타임 감소", val: 6.0, unit: "초" },
                    { tier: 2, name: "마주바람 강화", category: "적에게 주는 피해", val: 45.0, unit: "%" }
                ]
            }
        }
    ];

    const gemDataTable = {
        "겁화": { "없음": 1.00, "6": 1.28, "7": 1.32, "8": 1.36, "9": 1.40, "10": 1.44 },
        "작열": { "없음": 1.00, "6": 0.84, "7": 0.82, "8": 0.80, "9": 0.78, "10": 0.76 },
        "공증": { "없음": 0.00, "6": 0.70, "7": 0.90, "8": 1.20, "9": 1.50, "10": 1.80 }
    };

    const engravingTable = {
        columns: ["원한", "아드레날린 (공격력)", "아드레날린 (치명타)", "돌격대장", "질량 증가", "타격의 대가", "저주받은 인형"],
        levels: {
            "미사용": [0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00],
            "0LV": [18.00, 5.40, 14.00, 40.00, 16.00, 14.00, 14.00],
            "1LV": [18.75, 5.40, 15.50, 42.00, 16.75, 14.75, 14.75],
            "2LV": [19.50, 5.40, 17.00, 44.00, 17.50, 15.50, 15.50],
            "3LV": [20.25, 5.40, 18.50, 46.00, 18.25, 16.25, 16.25],
            "4LV": [21.00, 5.40, 20.00, 48.00, 19.00, 17.00, 17.00]
        },
        seongong: {
            "0LV": [0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00],
            "1LV": [3.00, 8.28, 0.00, 8.00, 3.00, 3.00, 3.00],
            "2LV": [3.75, 9.00, 0.00, 9.40, 3.75, 3.75, 3.75],
            "3LV": [5.25, 10.38, 0.00, 13.00, 5.25, 5.25, 5.25],
            "4LV": [6.00, 11.10, 0.00, 15.00, 6.00, 6.00, 6.00]
        }
    };

    const coreLevels = [10, 14, 17, 18, 19, 20];
    const skillNames = ["몰아치기", "회오리 걸음", "공간 가르기", "우레바람", "바람송곳", "칼바람", "마주바람", "싹쓸바람", "소용돌이"];

    const tripodDataSets = {
        "마주바람": [
            { tier: 1, name: "빠른 준비", category: "고정 쿨타임 감소", val: 6.0, unit: "초" },
            { tier: 2, name: "마주바람 강화", category: "적에게 주는 피해", val: 45.0, unit: "%" }
        ],
        "몰아치기": [
            { tier: 1, name: "역류", category: "적에게 주는 피해", val: 60.0, unit: "%" },
            { tier: 2, name: "우레", category: "치명타 피해", val: 180.0, unit: "%" },
            { tier: 3, name: "공간베기", category: "적에게 주는 피해", val: 94.8, unit: "%" }
        ],
        "회오리 걸음": [
            { tier: 2, name: "역류", category: "적에게 주는 피해", val: 95.0, unit: "%" },
            { tier: 3, name: "초고속 회전", category: "적에게 주는 피해", val: 105.0, unit: "%" }
        ],
        "공간 가르기": [{ tier: 1, name: "깨달음 - 공간 가르기", category: "적에게 주는 피해", val: 200.0, unit: "%" }],
        "우레바람": [
            { tier: 1, name: "도약 - 풀려난 힘", category: "적에게 주는 피해", val: 15.0, unit: "%" },
            { tier: 1, name: "도약 - 잠재력 해방", category: "쿨타임 감소", val: 8.0, unit: "%" },
            { tier: 2, name: "도약 - 단련된 가르기", category: "적에게 주는 피해", val: 70.0, unit: "%" }
        ],
        "바람송곳": [
            { tier: 1, name: "관통", category: "방어력 무시", val: 52.0, unit: "%" },
            // { tier: 1, name: "역류", category: "적에게 주는 피해", val: 60.0, unit: "%" },
            { tier: 2, name: "큰 센바람", category: "적에게 주는 피해", val: 60.0, unit: "%" },
            { tier: 3, name: "집중공격", category: "적에게 주는 피해", val: 95.0, unit: "%" }
        ],
        "칼바람": [
            { tier: 1, name: "거대 돌풍", category: "적에게 주는 피해", val: 45.0, unit: "%" },
            { tier: 2, name: "역류", category: "적에게 주는 피해", val: 95.0, unit: "%" },
            { tier: 3, name: "벼락", category: "치명타 피해", val: 210.0, unit: "%" }
        ],
        "싹쓸바람": [
            { tier: 1, name: "빠른 준비", category: "고정 쿨타임 감소", val: 11.0, unit: "초" },
            { tier: 2, name: "소멸", category: "적에게 주는 피해", val: 70.8, unit: "%" },
            { tier: 3, name: "증기 조절", category: "적에게 주는 피해", val: 80.0, unit: "%" }
        ],
        "소용돌이": [
            { tier: 2, name: "바람 기둥", category: "적에게 주는 피해", val: 58.6, unit: "%" },
            { tier: 3, name: "증기 조절", category: "적에게 주는 피해", val: 80.0, unit: "%" }
        ]
    };


    const orderDataSets = {
        "비연참": {
            고대: {
                10: [
                    {
                        category: "적에게 주는 피해",
                        val: 1.02,
                        skills: ["몰아치기", "회오리 걸음", "공간 가르기", "우레바람", "바람송곳", "칼바람", "마주바람"]
                    }
                ],
                14: [
                    {
                        category: "적에게 주는 피해",
                        val: 1.05,
                        skills: ["몰아치기", "회오리 걸음", "바람송곳", "칼바람"]
                    }
                ],
                17: [
                    {
                        category: "적에게 주는 피해",
                        val: 1.01,
                        skills: ["몰아치기", "회오리 걸음", "공간 가르기", "우레바람", "바람송곳", "칼바람", "마주바람"]
                    }
                ],
                18: [
                    {
                        category:"적에게 주는 피해",
                        val: 1.002,
                        skills: ["몰아치기", "회오리 걸음", "공간 가르기", "우레바람", "바람송곳", "칼바람", "마주바람"]
                    }
                ],
                19: [
                    {
                        category:"적에게 주는 피해",
                        val: 1.002,
                        skills: ["몰아치기", "회오리 걸음", "공간 가르기", "우레바람", "바람송곳", "칼바람", "마주바람"]
                    }
                ],
                20: [
                    {
                        category:"적에게 주는 피해",
                        val: 1.002,
                        skills: ["몰아치기", "회오리 걸음", "공간 가르기", "우레바람", "바람송곳", "칼바람", "마주바람"]
                    }
                ]
            },
            유물: {
                10: [
                    {
                        category: "적에게 주는 피해",
                        val: 1.02,
                        skills: ["몰아치기", "회오리 걸음", "공간 가르기", "우레바람", "바람송곳", "칼바람", "마주바람"]
                    }
                ],
                14: [
                    {
                        category: "적에게 주는 피해",
                        val: 1.05,
                        skills: ["몰아치기", "회오리 걸음", "바람송곳", "칼바람"]
                    }
                ],
                18: [
                    {
                        category:"적에게 주는 피해",
                        val: 1.002,
                        skills: ["몰아치기", "회오리 걸음", "공간 가르기", "우레바람", "바람송곳", "칼바람", "마주바람"]
                    }
                ],
                19: [
                    {
                        category:"적에게 주는 피해",
                        val: 1.002,
                        skills: ["몰아치기", "회오리 걸음", "공간 가르기", "우레바람", "바람송곳", "칼바람", "마주바람"]
                    }
                ],
                20: [
                    {
                        category:"적에게 주는 피해",
                        val: 1.002,
                        skills: ["몰아치기", "회오리 걸음", "공간 가르기", "우레바람", "바람송곳", "칼바람", "마주바람"]
                    }
                ]
            }
        },
        "기류 조절":{
            고대: {
                10: [
                    {
                        category: "적에게 주는 피해",
                        val: 1.015,
                        skills: ["몰아치기", "회오리 걸음", "공간 가르기", "우레바람", "바람송곳", "칼바람", "마주바람", "싹쓸바람", "소용돌이"]
                    }
                ],
                14: [
                    {
                        category: "적에게 주는 피해",
                        val: 1.1,
                        skills: ["몰아치기", "회오리 걸음", "공간 가르기", "우레바람", "바람송곳", "칼바람", "마주바람", "싹쓸바람", "소용돌이"]
                    }
                ],
                17: [
                    {
                        category:"적에게 주는 피해",
                        val: 1.06,
                        skills: ["몰아치기", "회오리 걸음", "공간 가르기", "우레바람", "바람송곳", "칼바람", "마주바람", "싹쓸바람", "소용돌이"]
                    }
                ],
                18: [
                    {
                        category:"적에게 주는 피해",
                        val: 1.0015,
                        skills: ["몰아치기", "회오리 걸음", "공간 가르기", "우레바람", "바람송곳", "칼바람", "마주바람", "싹쓸바람", "소용돌이"]
                    }
                ],
                19: [
                    {
                        category:"적에게 주는 피해",
                        val: 1.0015,
                        skills: ["몰아치기", "회오리 걸음", "공간 가르기", "우레바람", "바람송곳", "칼바람", "마주바람", "싹쓸바람", "소용돌이"]
                    }
                ],
                20: [
                    {
                        category:"적에게 주는 피해",
                        val: 1.0015,
                        skills: ["몰아치기", "회오리 걸음", "공간 가르기", "우레바람", "바람송곳", "칼바람", "마주바람", "싹쓸바람", "소용돌이"]
                    }
                ]
            },
            유물: {
                10: [
                    {
                        category: "적에게 주는 피해",
                        val: 1.015,
                        skills: ["몰아치기", "회오리 걸음", "공간 가르기", "우레바람", "바람송곳", "칼바람", "마주바람", "싹쓸바람", "소용돌이"]
                    }
                ],
                14: [
                    {
                        category: "적에게 주는 피해",
                        val: 1.1,
                        skills: ["몰아치기", "회오리 걸음", "공간 가르기", "우레바람", "바람송곳", "칼바람", "마주바람", "싹쓸바람", "소용돌이"]
                    }
                ],
                17: [
                    {
                        category:"적에게 주는 피해",
                        val: 1.05,
                        skills: ["몰아치기", "회오리 걸음", "공간 가르기", "우레바람", "바람송곳", "칼바람", "마주바람", "싹쓸바람", "소용돌이"]
                    }
                ],
                18: [
                    {
                        category:"적에게 주는 피해",
                        val: 1.0015,
                        skills: ["몰아치기", "회오리 걸음", "공간 가르기", "우레바람", "바람송곳", "칼바람", "마주바람", "싹쓸바람", "소용돌이"]
                    }
                ],
                19: [
                    {
                        category:"적에게 주는 피해",
                        val: 1.0015,
                        skills: ["몰아치기", "회오리 걸음", "공간 가르기", "우레바람", "바람송곳", "칼바람", "마주바람", "싹쓸바람", "소용돌이"]
                    }
                ],
                20: [
                    {
                        category:"적에게 주는 피해",
                        val: 1.0015,
                        skills: ["몰아치기", "회오리 걸음", "공간 가르기", "우레바람", "바람송곳", "칼바람", "마주바람", "싹쓸바람", "소용돌이"]
                    }
                ]
            }
        },
        "우산의 춤":{
            고대: {
                10: [
                    {
                        category: "적에게 주는 피해",
                        val: 1.02,
                        skills: ["몰아치기", "회오리 걸음", "공간 가르기", "우레바람", "바람송곳", "칼바람", "마주바람"]
                    }
                ],
                17: [
                    {
                        category:"적에게 주는 피해",
                        val: 1.12,
                        skills: ["몰아치기", "회오리 걸음"]
                    }
                ],
                18: [
                    {
                        category:"적에게 주는 피해",
                        val: 1.002,
                        skills: ["몰아치기", "회오리 걸음", "공간 가르기", "우레바람", "바람송곳", "칼바람", "마주바람"]
                    }
                ],
                19: [
                    {
                        category:"적에게 주는 피해",
                        val: 1.002,
                        skills: ["몰아치기", "회오리 걸음", "공간 가르기", "우레바람", "바람송곳", "칼바람", "마주바람"]
                    }
                ],
                20: [
                    {
                        category:"적에게 주는 피해",
                        val: 1.002,
                        skills: ["몰아치기", "회오리 걸음", "공간 가르기", "우레바람", "바람송곳", "칼바람", "마주바람"]
                    }
                ],
            },
            유물: {
                10: [
                    {
                        category: "적에게 주는 피해",
                        val: 1.02,
                        skills: ["몰아치기", "회오리 걸음", "공간 가르기", "우레바람", "바람송곳", "칼바람", "마주바람"]
                    }
                ],
                17: [
                    {
                        category:"적에게 주는 피해",
                        val: 1.08,
                        skills: ["몰아치기", "회오리 걸음"]
                    }
                ],
                18: [
                    {
                        category:"적에게 주는 피해",
                        val: 1.002,
                        skills: ["몰아치기", "회오리 걸음", "공간 가르기", "우레바람", "바람송곳", "칼바람", "마주바람"]
                    }
                ],
                19: [
                    {
                        category:"적에게 주는 피해",
                        val: 1.002,
                        skills: ["몰아치기", "회오리 걸음", "공간 가르기", "우레바람", "바람송곳", "칼바람", "마주바람"]
                    }
                ],
                20: [
                    {
                        category:"적에게 주는 피해",
                        val: 1.002,
                        skills: ["몰아치기", "회오리 걸음", "공간 가르기", "우레바람", "바람송곳", "칼바람", "마주바람"]
                    }
                ],
            },
        },
        "상승기류":{
            고대: {
                10: [
                    {
                        category: "적에게 주는 피해",
                        val: 1.015,
                        skills: ["몰아치기", "회오리 걸음", "공간 가르기", "우레바람", "바람송곳", "칼바람", "마주바람", "싹쓸바람", "소용돌이"]
                    }
                ],
                17: [
                    {
                        category:"치명타 시 적에게 주는 피해",
                        val: 1.06,
                        skills: ["몰아치기", "회오리 걸음", "공간 가르기", "우레바람", "바람송곳", "칼바람", "마주바람", "싹쓸바람", "소용돌이"]
                    }
                ],
                18: [
                    {
                        category:"적에게 주는 피해",
                        val: 1.0015,
                        skills: ["몰아치기", "회오리 걸음", "공간 가르기", "우레바람", "바람송곳", "칼바람", "마주바람", "싹쓸바람", "소용돌이"]
                    }
                ],
                19: [
                    {
                        category:"적에게 주는 피해",
                        val: 1.0015,
                        skills: ["몰아치기", "회오리 걸음", "공간 가르기", "우레바람", "바람송곳", "칼바람", "마주바람", "싹쓸바람", "소용돌이"]
                    }
                ],
                20: [
                    {
                        category:"적에게 주는 피해",
                        val: 1.0015,
                        skills: ["몰아치기", "회오리 걸음", "공간 가르기", "우레바람", "바람송곳", "칼바람", "마주바람", "싹쓸바람", "소용돌이"]
                    }
                ],
            },
            유물: {
                10: [
                    {
                        category: "적에게 주는 피해",
                        val: 1.015,
                        skills: ["몰아치기", "회오리 걸음", "공간 가르기", "우레바람", "바람송곳", "칼바람", "마주바람", "싹쓸바람", "소용돌이"]
                    }
                ],
                17: [
                    {
                        category:"치명타 시 적에게 주는 피해",
                        val: 1.05,
                        skills: ["몰아치기", "회오리 걸음", "공간 가르기", "우레바람", "바람송곳", "칼바람", "마주바람", "싹쓸바람", "소용돌이"]
                    }
                ],
                18: [
                    {
                        category:"적에게 주는 피해",
                        val: 1.0015,
                        skills: ["몰아치기", "회오리 걸음", "공간 가르기", "우레바람", "바람송곳", "칼바람", "마주바람", "싹쓸바람", "소용돌이"]
                    }
                ],
                19: [
                    {
                        category:"적에게 주는 피해",
                        val: 1.0015,
                        skills: ["몰아치기", "회오리 걸음", "공간 가르기", "우레바람", "바람송곳", "칼바람", "마주바람", "싹쓸바람", "소용돌이"]
                    }
                ],
                20: [
                    {
                        category:"적에게 주는 피해",
                        val: 1.0015,
                        skills: ["몰아치기", "회오리 걸음", "공간 가르기", "우레바람", "바람송곳", "칼바람", "마주바람", "싹쓸바람", "소용돌이"]
                    }
                ],
            },
        },
        "휘몰아치기":{
            고대: {
                14: [
                    {
                        category: "적에게 주는 피해",
                        val: 1.55,
                        skills: ["회오리 걸음"]
                    }
                ],
                17: [
                    {
                        category:"적에게 주는 피해",
                        val: 1.18,
                        skills: ["몰아치기"]
                    }
                ],
                18: [
                    {
                        category:"적에게 주는 피해",
                        val: 1.007,
                        skills: ["몰아치기", "회오리 걸음"]
                    }
                ],
                19: [
                    {
                        category:"적에게 주는 피해",
                        val: 1.007,
                        skills: ["몰아치기", "회오리 걸음"]
                    }
                ],
                20: [
                    {
                        category:"적에게 주는 피해",
                        val: 1.007,
                        skills: ["몰아치기", "회오리 걸음"]
                    }
                ],
            },
            유물: {
                14: [
                    {
                        category: "적에게 주는 피해",
                        val: 1.55,
                        skills: ["회오리 걸음"]
                    }
                ],
                17: [
                    {
                        category:"적에게 주는 피해",
                        val: 1.12,
                        skills: ["몰아치기"]
                    }
                ],
                18: [
                    {
                        category:"적에게 주는 피해",
                        val: 1.007,
                        skills: ["몰아치기", "회오리 걸음"]
                    }
                ],
                19: [
                    {
                        category:"적에게 주는 피해",
                        val: 1.007,
                        skills: ["몰아치기", "회오리 걸음"]
                    }
                ],
                20: [
                    {
                        category:"적에게 주는 피해",
                        val: 1.007,
                        skills: ["몰아치기", "회오리 걸음"]
                    }
                ],
            },
        }
    };






    const chaosDataSets = {
        유물: {
            sun: { 10: [{ type: "치명타 시 적에게 주는 피해", value: 0.55 }], 14: [{ type: "적에게 주는 피해", value: 0.50 }], 17: [{ type: "적에게 주는 피해", value: 1.00 }, { type: "치명타 시 적에게 주는 피해", value: 0.55 }], 18: [{ type: "적에게 주는 피해", value: 0.16 }], 19: [{ type: "적에게 주는 피해", value: 0.16 }], 20: [{ type: "적에게 주는 피해", value: 0.16 }] },
            moon: { 14: [{ type: "적에게 주는 피해", value: 0.50 }], 17: [{ type: "적에게 주는 피해", value: 1.00 }], 18: [{ type: "적에게 주는 피해", value: 0.16 }], 19: [{ type: "적에게 주는 피해", value: 0.16 }], 20: [{ type: "적에게 주는 피해", value: 0.16 }] },
            star: { 10: [{ type: "공격력", value: 900 }], 14: [{ type: "공격력 %", value: 0.55 }], 17: [{ type: "공격력 %", value: 1.10 }, { type: "공격력", value: 1800 }], 18: [{ type: "공격력 %", value: 0.16 }], 19: [{ type: "공격력 %", value: 0.16 }], 20: [{ type: "공격력 %", value: 0.16 }] }
        },
        고대: {
            sun: { 10: [{ type: "치명타 시 적에게 주는 피해", value: 0.55 }], 14: [{ type: "적에게 주는 피해", value: 0.50 }], 17: [{ type: "적에게 주는 피해", value: 1.50 }, { type: "치명타 시 적에게 주는 피해", value: 1.10 }], 18: [{ type: "적에게 주는 피해", value: 0.16 }], 19: [{ type: "적에게 주는 피해", value: 0.16 }], 20: [{ type: "적에게 주는 피해", value: 0.16 }] },
            moon: { 14: [{ type: "적에게 주는 피해", value: 0.50 }], 17: [{ type: "적에게 주는 피해", value: 2.00 }], 18: [{ type: "적에게 주는 피해", value: 0.16 }], 19: [{ type: "적에게 주는 피해", value: 0.16 }], 20: [{ type: "적에게 주는 피해", value: 0.16 }] },
            star: { 10: [{ type: "공격력", value: 900 }], 14: [{ type: "공격력 %", value: 0.55 }], 17: [{ type: "공격력 %", value: 1.65 }, { type: "공격력", value: 2700 }], 18: [{ type: "공격력 %", value: 0.16 }], 19: [{ type: "공격력 %", value: 0.16 }], 20: [{ type: "공격력 %", value: 0.16 }] }
        }
    };

    const braceletTable = {
    // 1. 공이속
    "공이속": {
        "공격 속도": { 상: 6, 중: 5, 하: 4 },
        "이동 속도": { 상: 6, 중: 5, 하: 4 }
    },

    // 2. 치적 + 치명타 주는 피해
    "치적|치명타주는피해": {
        "치명타 적중률": { 상: 5.0, 중: 4.2, 하: 3.4 },
        "치명타 시 적에게 주는 피해": { 상: 1.5, 중: 1.5, 하: 1.5 }
    },

    // 3. 치피 + 치명타 주는 피해
    "치피|치명타주는피해": {
        "치명타 피해": { 상: 10.0, 중: 8.4, 하: 6.8 },
        "치명타 시 적에게 주는 피해": { 상: 1.5, 중: 1.5, 하: 1.5 }
    },

    // 4. 적에게 주는 피해 (단독)
    "적에게주는피해": {
        "적에게 주는 피해": { 상: 3.0, 중: 2.5, 하: 2.0 }
    },

    // 5. 적주피 + 무력화 적 피해
    "적주피|무력화적피해량": {
        "적에게 주는 피해": { 상: 3.0, 중: 2.5, 하: 2.0 }
    },

    // 6. 쿨 + 적주피
    "쿨|적에게주는피해": {
        "적에게 주는 피해": { 상: 5.5, 중: 5.0, 하: 4.5 },
        "쿨타임 증가": { 상: 2.0, 중: 2.0, 하: 2.0 }
    },

    // 7. 추피 + 악마&대악마 피해
    "추피|악마&대악마피해량": {
        "추가 피해": { 상: 3.5, 중: 3.0, 하: 2.5 },
        "악마 및 대악마 피해": { 상: 2.5, 중: 2.5, 하: 2.5 }
    },

    // 8. 중첩 무공 + 공이속
    "공격적중시무공": {
        "무기 공격력": { 상: 1480, 중: 1320, 하: 1160 },
        "공격 속도": { 상: 1, 중: 1, 하: 1 },
        "이동 속도": { 상: 1, 중: 1, 하: 1 }
    },

    // 9. 조건부 무공
    "조건부무공": {
        "무기 공격력": { 상: 11400, 중: 10300, 하: 9200 }
    },

    // 10. 스택형 무공
    "스택당무공": {
        "무기 공격력": { 상: 13200, 중: 12000, 하: 10800 }
    },

    // 11. 백어택 스킬 피해
    "백어택스킬피해": {
        "적에게 주는 피해": { 상: 3.5, 중: 3.0, 하: 2.5 }
    },

    // 12. 헤드어택 스킬 피해
    "헤드어택스킬피해": {
        "적에게 주는 피해": { 상: 3.5, 중: 3.0, 하: 2.5 }
    },

    // 13. 타대 스킬 피해 (방향성 X)
    "타대스킬피해": {
        "적에게 주는 피해": { 상: 3.5, 중: 3.0, 하: 2.5 }
    },

    // 14. 추가 피해 (단독)
    "추가피해": {
        "추가 피해": { 상: 4.0, 중: 3.5, 하: 3.0 }
    },

    // 15. 치명타 적중률 (단독)
    "치명타적중률": {
        "치명타 적중률": { 상: 5.0, 중: 4.2, 하: 3.4 }
    },

    // 16. 치명타 피해 (단독)
    "치명타피해": {
        "치명타 피해": { 상: 10.0, 중: 8.4, 하: 6.8 }
    },

    // 17. 무기 공격력 (단독)
    "무기공격력": {
        "무기 공격력": { 상: 9000, 중: 8100, 하: 7200 }
    }
};

    const accessoryTable = {
        "추가 피해": { 상: 2.6, 중: 1.6, 하: 0.7 },
        "적에게 주는 피해": { 상: 2.0, 중: 1.2, 하: 0.55 },
        "공격력 %": { 상: 1.55, 중: 0.95, 하: 0.4 },
        "무기 공격력 %": { 상: 3.0, 중: 1.8, 하: 0.8 },
        "치명타 적중률": { 상: 1.55, 중: 0.95, 하: 0.4 },
        "치명타 피해": { 상: 4.0, 중: 2.4, 하: 1.1 },
        "무기 공격력": { 상: 960, 중: 480, 하: 195 },
        "공격력": { 상: 390, 중: 190, 하: 80 }
    };

    // =============================================================================
    // 3. 헬퍼 함수 정의
    // =============================================================================
    function getBraceletOptionData(rawOpt, grade) {
    if (!rawOpt || rawOpt === '없음' || rawOpt === 'none') return null;

    // 숫자, 마침표, +, %, 공백을 제거하여 순수 키워드만 추출
    // 예: "타대 스킬 피해 +3.0%" -> "타대스킬피해"
    // 예: "치피 +8.4% | 치명타 주는 피해 +1.5%" -> "치피|치명타주는피해"
    const cleanTarget = rawOpt
        .replace(/[\d\.\+%]+/g, '')
        .replace(/\s+/g, '');

    for (const [key, effects] of Object.entries(braceletTable)) {
        const cleanKey = key.replace(/\s+/g, '');

        if (cleanTarget.includes(cleanKey) || cleanKey.includes(cleanTarget)) {
            const result = {};
            for (const [statName, gradeMap] of Object.entries(effects)) {
                const val = gradeMap[grade] ?? gradeMap['중'] ?? 0;
                if (val !== 0) result[statName] = val;
            }
            return result;
        }
    }
    return null;
}

    function addStat(statsObj, category, source, val, unit = "%") {
        if (!statsObj[category]) statsObj[category] = [];
        if (val !== 0 && val !== undefined && val !== null) {
            statsObj[category].push({ source, val, unit });
        }
    }

    function getStatSum(statsObj, category) {
        if (!statsObj[category] || !Array.isArray(statsObj[category])) return 0;
        return statsObj[category].reduce((sum, item) => sum + (Number(item.val) || 0), 0);
    }

    function calculateDamageBase(atk, coefficient, constant,defPenSum) {       
        const defenseRatio = 6500 / (6500 + 6500*(1-defPenSum/100));
        return (coefficient * atk + constant) * 0.76 * defenseRatio;
    }

    function getArkEvolutionStats() {
        let arkStats = {};
        evolutionNodes.forEach((row, rowIndex) => {
            row.forEach((node) => {
                if (node.current <= 0) return;
                const tierName = `${rowIndex + 1}티어`;
                if (node.effects && node.effects.length > 0) {
                    node.effects.forEach(eff => {
                        const catName = eff.type;
                        const calculatedVal = node.current * eff.valuePerLevel;
                        const isRawStat = ["치명", "신속", "특화", "제압", "인내", "숙련"].includes(catName);
                        const unitStr = isRawStat ? "" : "%";

                        if (!arkStats[catName]) arkStats[catName] = [];
                        arkStats[catName].push({
                            source: `아크 패시브(진화 ${tierName}): ${node.name} [${node.current}/${node.max}LV]`,
                            val: parseFloat(calculatedVal.toFixed(2)),
                            unit: unitStr
                        });
                    });
                }
            });
        });
        return arkStats;
    }

    // =============================================================================
    // 4. DOM 파싱 및 데이터 정제
    // =============================================================================
    function extractFullSimulatorData(doc = document) {
        const parseOptAndGrade = (rawText) => {
            if (!rawText || rawText === '없음') return null;
            let grade = '중';
            if (rawText.includes('상') || rawText.includes('[상]')) grade = '상';
            else if (rawText.includes('하') || rawText.includes('[하]')) grade = '하';

            let opt = rawText.replace(/[\+\[\(].*?[\)\]]/g, '').replace(/\+?\s*\d+(\.\d+)?/g, '').replace(/\s+/g, ' ').trim();
            return { opt: opt || rawText, grade };
        };

        const cleanOptionName = (rawText) => {
            if (!rawText || rawText === '없음') return null;
            return rawText.replace(/\+?\s*\d+(\.\d+)?/g, '').replace(/\s+/g, ' ').trim() || rawText;
        };

        const parseEngravings = () => {
            const stoneLevels = {};
            const stoneWrap = doc.querySelector('div[class*="SimGroupAccessory_stoneWrap"]');
            if (stoneWrap) {
                stoneWrap.querySelectorAll('select').forEach(selectEl => {
                    const labelSpan = selectEl.parentElement.querySelector('span[class*="BaseSelect_labelText"]');
                    const text = labelSpan ? labelSpan.textContent.trim() : '';
                    const match = text.match(/^(.*?)\s+Lv\.(\d+)$/);
                    if (match) stoneLevels[match[1].trim()] = `${match[2]}LV`;
                });
            }
            const engravings = [];
            const boxes = doc.querySelectorAll('div[class*="SimGroupEngraving_engravingBox"]');
            boxes.forEach(box => {
                const optionSelect = box.querySelector('select[id*="engraving-option"]');
                const nameSpan = optionSelect?.parentElement.querySelector('span[class*="BaseSelect_labelText"]');
                const name = nameSpan ? nameSpan.textContent.trim() : '없음';
                if (name && name !== '없음') {
                    const levelSelect = box.querySelector('select[id*="engraving-level"]');
                    const levelSpan = levelSelect?.parentElement.querySelector('span[class*="BaseSelect_labelText"]');
                    const rawLevel = levelSpan ? levelSpan.textContent.trim() : '0';
                    const levelNum = parseInt(rawLevel.replace(/[^0-9]/g, ''), 10) || 0;
                    engravings.push({ name, level: `${levelNum}LV`, stone: stoneLevels[name] || '0LV' });
                }
            });
            return engravings;
        };

        const parseAccessories = () => {
            const accessories = [];
            const accWraps = doc.querySelectorAll('div[class*="SimGroupAccessory_accessoryWrap"]');
            let earringCount = 1, ringCount = 1;

            accWraps.forEach((wrap, index) => {
                let name = '';
                const selects = wrap.querySelectorAll('select');
                let idsString = '';
                selects.forEach(s => idsString += (s.id || '') + ' ');
                const lowerIds = idsString.toLowerCase();
                const wrapText = wrap.textContent || '';

                if (lowerIds.includes('necklace') || wrapText.includes('목걸이')) name = '목걸이';
                else if (lowerIds.includes('earing') || lowerIds.includes('earring') || wrapText.includes('귀걸이')) name = `귀걸이 ${earringCount++}`;
                else if (lowerIds.includes('ring') || wrapText.includes('반지')) name = `반지 ${ringCount++}`;
                else {
                    if (index === 0) name = '목걸이';
                    else if (index === 1 || index === 2) name = `귀걸이 ${earringCount++}`;
                    else name = `반지 ${ringCount++}`;
                }

                const statInput = wrap.querySelector('input[class*="SimGroupAccessory_input"]');
                const statValue = statInput ? (parseInt(statInput.value, 10) || 0) : 0;

                const slots = [];
                const optionItems = wrap.querySelectorAll('div[class*="SimGroupAccessory_optionItem"]');
                optionItems.forEach(item => {
                    const gradeSpan = item.querySelector('span[class*="ChaTierLabel"]');
                    let grade = '중';
                    if (gradeSpan) {
                        const gradeText = gradeSpan.textContent.trim();
                        if (gradeText.includes('상')) grade = '상';
                        else if (gradeText.includes('하')) grade = '하';
                    }
                    const labelSpan = item.querySelector('span[class*="BaseSelect_labelText"]');
                    if (labelSpan) {
                        const optName = cleanOptionName(labelSpan.textContent.trim());
                        if (optName) slots.push({ opt: optName, grade });
                    }
                });

                accessories.push({ name, statValue, slots });
            });
            return accessories;
        };

        const parseArkGems = () => {
            const gems = { atk: 0, addDmg: 0, bossDmg: 0 };
            const effectItems = doc.querySelectorAll('div[class*="SimGroupArkGrid_gemEfficiencyEffectItem"]');
            effectItems.forEach(item => {
                const nameEl = item.querySelector('span[class*="SimGroupArkGrid_gemEfficiencyEffectName"]');
                const rawName = nameEl ? nameEl.textContent.trim() : '';
                const valueEl = item.querySelector('span[class*="SimGroupArkGrid_gemEfficiencyEffectValue"]');
                const val = parseFloat(valueEl ? valueEl.textContent.trim().replace('%', '') : '0') || 0;

                if (rawName.includes('공격력')) gems.atk = val;
                else if (rawName.includes('추가 피해')) gems.addDmg = val;
                else if (rawName.includes('보스 피해')) gems.bossDmg = val;
            });
            return gems;
        };

        const parseCombatGems = () => {
            const gems = [];
            const boxes = doc.querySelectorAll('div[class*="SimGroupGem_gemBox"]');
            boxes.forEach(box => {
                const typeSpan = box.querySelector('select[id*="gem-type"]')?.parentElement.querySelector('span[class*="BaseSelect_labelText"]');
                const type = typeSpan ? typeSpan.textContent.trim() : '없음';
                const levelSpan = box.querySelector('select[id*="gem-level"]')?.parentElement.querySelector('span[class*="BaseSelect_labelText"]');
                const level = levelSpan ? levelSpan.textContent.trim().replace(/[^0-9]/g, '') : '0';
                const skillSpan = box.querySelector('select[id*="gem-skill"]')?.parentElement.querySelector('span[class*="BaseSelect_labelText"]');
                const skillName = skillSpan ? skillSpan.textContent.trim() : '없음';

                if (type !== '없음' && parseInt(level, 10) > 0) gems.push({ skillName, type, level });
            });
            return gems;
        };

        const parseArkCores = () => {
            const chaosCores = { 
                Sun: { name: '', grade: '미장착', level: 0 }, 
                Moon: { name: '', grade: '미장착', level: 0 }, 
                Star: { name: '', grade: '미장착', level: 0 } 
            };
            const orderCores = { 
                Sun: { name: '', grade: '미장착', level: 0 }, 
                Moon: { name: '', grade: '미장착', level: 0 }, 
                Star: { name: '', grade: '미장착', level: 0 } 
            };

            const items = doc.querySelectorAll('div[class*="SimGroupArkGrid_gridItem"]');
            
            window.isGiRyuSet = false;

            // 1행(인덱스 0, 1, 2 - 질서 코어)에서 '기류 조절' 선택 여부 확인
            items.forEach((item, index) => {
                if (index < 3) {
                    const bladeSelect = item.querySelector('select[id*="ark-blade"]');
                    if (bladeSelect && bladeSelect.selectedIndex >= 0) {
                        const selectedText = bladeSelect.options[bladeSelect.selectedIndex]?.textContent || '';
                        if (selectedText.includes('기류 조절')) {
                            window.isGiRyuSet = true;
                        }
                    }
                }
            });

            if (typeof window.updateCoreSetUI === 'function') {
                window.updateCoreSetUI();
            }

            items.forEach((item, index) => {
                const gradeSpan = item.querySelector('select[id*="ark-core"]')?.parentElement.querySelector('span[class*="BaseSelect_labelText"]');
                const grade = gradeSpan ? gradeSpan.textContent.trim() : '미장착';
                
                const pointEl = item.querySelector('div[data-testid="quality-bar"]') || item.querySelector('div[class*="QualityBar_qualityBar"]');
                const level = pointEl ? parseInt(pointEl.textContent.trim().replace(/[^0-9]/g, ''), 10) || 0 : 0;

                // [수정] 0, 1, 2번 인덱스(1행) = 질서(Order) / 3, 4, 5번 인덱스(2행) = 혼돈(Chaos)
                const isOrder = index < 3; 
                const slotIdx = index % 3; // 0: Sun(해), 1: Moon(달), 2: Star(별)
                const slotKey = slotIdx === 0 ? 'Sun' : slotIdx === 1 ? 'Moon' : 'Star';

                let coreName = '';

                if (isOrder) { 
                    // 1행: 질서 코어 영역
                    if (window.isGiRyuSet) {
                        if (slotKey === 'Sun') coreName = '기류 조절';
                        else if (slotKey === 'Moon') coreName = '상승기류';
                        else if (slotKey === 'Star') coreName = '휘몰아치기';
                    } else {
                        if (slotKey === 'Sun') coreName = '비연참';
                        else if (slotKey === 'Moon') coreName = '우산의 춤';
                        else if (slotKey === 'Star') coreName = '휘몰아치기';
                    }
                } else {
                    // 2행: 혼돈 코어 영역 (선택된 드롭다운 명칭 가져오기)
                    const bladeSelect = item.querySelector('select[id*="ark-blade"]');
                    if (bladeSelect && bladeSelect.selectedIndex >= 0) {
                        coreName = bladeSelect.options[bladeSelect.selectedIndex]?.textContent.trim() || '';
                    }
                }

                const coreData = { name: coreName, grade, level };

                if (isOrder) {
                    orderCores[slotKey] = coreData;
                } else {
                    chaosCores[slotKey] = coreData;
                }
            });

            return { chaosCores, orderCores};
        };

        // 팔찌 파싱 부분 수정
        const parseBracelet = () => {
            const bracelet = { options: [] };
            const bangleWrap = doc.querySelector('div[class*="SimGroupAccessory_bangleWrap"]');
            if (!bangleWrap) return bracelet;

            const statKeyMap = { 
                '치명': 'crit', 
                '신속': 'swift', 
                '특화': 'spec',
                '힘': 'mainStat',    // 💡 필요시 '주스탯'으로 변경 가능
                '민첩': 'mainStat',
                '지능': 'mainStat'
            };
            bangleWrap.querySelectorAll('div[class*="SimGroupAccessory_bangleStat"]').forEach(itemEl => {
                const sel = itemEl.querySelector('select');
                const inp = itemEl.querySelector('input');
                if (sel && inp) {
                    const labelSpan = sel.parentElement.querySelector('span[class*="BaseSelect_labelText"]');
                    const key = statKeyMap[labelSpan?.textContent.trim()] || labelSpan?.textContent.trim();
                    const val = parseInt(inp.value, 10) || 0;
                    if (key && val > 0) bracelet[key] = val;
                }
            });

            // 장신구 파싱과 동일하게 ChaTierLabel 태그를 탐색하여 등급 지정
            bangleWrap.querySelectorAll('div[class*="SimGroupAccessory_bangleOptionItem"]').forEach(itemEl => {
                const gradeSpan = itemEl.querySelector('span[class*="ChaTierLabel"]');
                let grade = '중';
                if (gradeSpan) {
                    const gradeText = gradeSpan.textContent.trim();
                    if (gradeText.includes('상')) grade = '상';
                    else if (gradeText.includes('하')) grade = '하';
                }

                const labelSpan = itemEl.querySelector('span[class*="BaseSelect_labelText"]');
                if (labelSpan) {
                    const optName = cleanOptionName(labelSpan.textContent.trim());
                    if (optName && optName !== '없음') {
                        bracelet.options.push({ opt: optName, grade });
                    }
                }
            });

            return bracelet;
        };

        const parseEquipment = () => {
            const equipment = {};
            doc.querySelectorAll('div[class*="SimGroupArmory_armoryBox"]').forEach(box => {
                const normalSelect = box.querySelector('select[id*="-normal"]');
                if (!normalSelect) return;

                const part = normalSelect.id.replace('armory-', '').replace('-normal', '');
                const labelSpan = normalSelect.parentElement.querySelector('span[class*="BaseSelect_labelText"]');
                
                if (labelSpan) {
                    const level = parseInt(labelSpan.textContent.trim().replace(/[^0-9]/g, ''), 10) || 0;
                    
                    // 1. 완갑(vambrace)
                    if (part === 'vambrace') {
                        const gradeEl = box.querySelector('div[data-testid="quality-bar"]') || box.querySelector('div[class*="QualityBar_qualityBar"]');
                        equipment[part] = level;
                        equipment.vambraceGrade = gradeEl ? gradeEl.textContent.trim() : '일반';
                    } 
                    // 2. 무기(weapon)
                    else if (part === 'weapon') {
                        const tierSelect = box.querySelector('select[id*="-tier"]');
                        const tierSpan = tierSelect?.parentElement?.querySelector('span[class*="BaseSelect_labelText"]');
                        
                        // span 표시 텍스트 우선 (없으면 select value 사용) -> '에스더', 'T4 전율' 등
                        const weaponTier = tierSpan?.textContent.trim() || tierSelect?.value || '';
                        const isEsther = weaponTier.includes('에스더');
                        updateEstherUI(isEsther)
                        // ★ 에스더 엘라 단계 파싱 로직 추가
                        let estherElla = 0;
                        if (isEsther) {
                            const ellaSelect = box.querySelector('select[id*="-esther-ella"]');
                            const ellaSpan = ellaSelect?.parentElement?.querySelector('span[class*="BaseSelect_labelText"]');
                            
                            // "엘라 3" 또는 value "3" 에서 숫자만 추출
                            const rawElla = ellaSpan?.textContent || ellaSelect?.value || '0';
                            estherElla = parseInt(rawElla.replace(/[^0-9]/g, ''), 10) || 0;
                        }

                        equipment[part] = level;
                        equipment.weaponTier = weaponTier;
                        equipment.isEsther = isEsther;
                        equipment.estherElla = estherElla; // 예: 0, 1, 2, 3
                    } 
                    // 3. 기타 방어구
                    else {
                        equipment[part] = level;
                    }
                }
            });
            return equipment;
        };

        const { chaosCores, orderCores  } = parseArkCores();

        const parseArkPassives = () => {
            const arkPassive = {};
            const wrapElements = doc.querySelectorAll('div[class*="SimGroupArkPassive_arkPassiveWrap"]');

            wrapElements.forEach(wrap => {
                const categoryEl = wrap.querySelector('[class*="ChaBaseTag_tagText"]');
                const category = categoryEl ? categoryEl.textContent.trim() : null;

                if (category) {
                    const pointEl = wrap.querySelector('span[class*="SimGroupArkPassive_point"]');
                    const point = pointEl ? parseInt(pointEl.textContent.trim(), 10) || 0 : 0;

                    const rankBtn = wrap.querySelector('button[aria-pressed="true"]');
                    const rank = rankBtn ? parseInt(rankBtn.value || rankBtn.textContent.trim(), 10) || 0 : 0;

                    const levelInput = wrap.querySelector('div[class*="SimGroupArkPassive_levelBox"] input');
                    const level = levelInput && levelInput.value ? parseInt(levelInput.value, 10) || 0 : 0;

                    arkPassive[category] = { point, rank, level };
                }
            });

            return arkPassive;
        };

        return {
            engravings: parseEngravings(),
            accessories: parseAccessories(),
            gems: parseArkGems(),
            jewels: parseCombatGems(),
            chaosCores,
            orderCores,
            arkPassive: parseArkPassives(),
            bracelet: parseBracelet(),
            equipment: parseEquipment()
        };
    }

    function mapExtractedDataToInputs(extracted) {
        const eq = extracted.equipment || {};

        // 영문/한글 키 대응
        const headLvl     = eq.helmet    ?? eq.head    ?? eq["머리"]        ?? 0;
        const topLvl      = eq.armor     ?? eq.top     ?? eq["상의"]        ?? 0;
        const bottomLvl   = eq.pants     ?? eq.bottom  ?? eq["하의"]        ?? 0;
        const gloveLvl    = eq.gloves    ?? eq.glove   ?? eq["장갑"]        ?? 0;
        const shoulderLvl = eq.shoulder  ?? eq["어깨"] ?? eq["어깨 방어구"] ?? 0;
        const weaponLvl   = eq.weapon    ?? eq["무기"]                    ?? 0;
        const vambraceLvl = eq.vambrace  ?? eq['완갑']                    ?? 0;
        
        // 에스더 정보 파싱 확인
        const isEsther   = Boolean(eq.isEsther || (typeof eq.weaponTier === 'string' && eq.weaponTier.includes('에스더')));
        const estherElla = eq.estherElla ?? 0; // 숫자 0, 1, 2, 3

        // 1. 방어구 스탯 추출
        const headStat     = equipmentDataset["머리"]?.[headLvl] || 0;
        const topStat      = equipmentDataset["상의"]?.[topLvl] || 0;
        const bottomStat   = equipmentDataset["하의"]?.[bottomLvl] || 0;
        const gloveStat    = equipmentDataset["장갑"]?.[gloveLvl] || 0;
        const shoulderStat = equipmentDataset["어깨 방어구"]?.[shoulderLvl] || equipmentDataset["어깨"]?.[shoulderLvl] || 0;
        
        // 2. ★ [핵심] 무기 스탯 계산 (에스더 데이터셋 구조 적용)
        let weaponStat = 0;
        if (isEsther) {
            const ellaKey = `엘라 ${estherElla}`; // 예: "엘라 3", "엘라 2"
            weaponStat = equipmentDataset["에스더"]?.[ellaKey]?.[weaponLvl] || 0;
        } else {
            weaponStat = equipmentDataset["무기"]?.[weaponLvl] || 0;
        }

        // 3. 완갑 및 악세서리 계산
        const vambraceData = equipmentDataset["완갑"]?.[vambraceLvl] || { 무기공격력: 0, 주스탯: 0, 기본공격력: 0 };
        const accessoryBaseStat = (extracted.accessories || []).reduce((acc, currentAcc) => acc + (currentAcc.statValue || 0), 0);
        
        // 4. 스탯 총합
        const armorBaseStat = headStat + topStat + bottomStat + gloveStat + shoulderStat;
        const totalBaseStat = armorBaseStat + (vambraceData.지능 || vambraceData.주스탯 || 0) + accessoryBaseStat;

        return {
            baseStat: totalBaseStat,
            headStat: headStat,
            topStat: topStat,
            bottomStat: bottomStat,
            gloveStat: gloveStat,
            shoulderStat: shoulderStat,
            
            // 무기 관련
            weaponAtk: weaponStat,
            isEsther: isEsther,
            estherElla: estherElla,
            weaponTier: eq.weaponTier || '',

            vambraceGrade: eq.vambraceGrade ?? '영웅',
            vambraceData: vambraceData,
            baseCrit: STAT_CONSTANTS.BASE_CRIT,
            baseSwift: STAT_CONSTANTS.BASE_SWIFT,
            partyCritCount: 0,
            engravings: extracted.engravings || [],
            accessories: extracted.accessories || [],
            gems: extracted.gems || { atk: 0, addDmg: 0, bossDmg: 0 },
            skillGems: extracted.jewels || [],
            chaosCores: extracted.chaosCores || {},
            orderCores: extracted.orderCores || {},
            bracelet: extracted.bracelet || { crit: 0, swift: 0, mainStat: 0, options: [] },
            arkPassive: extracted.arkPassive
        };
    }

    function transformToInputs(parsedData) {
        const rawStat = Number(parsedData.baseStat) || 0;
        const calculatedBaseStat = Math.floor(rawStat * 1.09);

        const formattedEngravings = (parsedData.engravings || []).map(eng => ({
            name: eng.name,
            level: eng.level,
            stone: eng.stone
        }));

        const gemsList = parsedData.skillGems || parsedData.jewels || [];
        const formattedSkillGems = gemsList.map(gem => ({
            skillName: gem.skillName,
            type: gem.type,
            level: Number(gem.level) || 0
        }));

        return {
            ...parsedData,
            baseStat: calculatedBaseStat,
            weaponAtk: Number(parsedData.weaponAtk) || 0,
            vambraceData: parsedData.vambraceData,
            engravings: formattedEngravings,
            skillGems: formattedSkillGems,
            gems: parsedData.gems || {},
            chaosCores: parsedData.chaosCores || {},
            orderCores: parsedData.orderCores || {},
            accessories: parsedData.accessories || [],
            bracelet: parsedData.bracelet || {},
            arkPassive: parsedData.arkPassive || {}
        };
    }

    // =============================================================================
    // 5. 핵심 스탯 및 데미지 연산 엔진
    // =============================================================================
    function calculateSkillStats(inputs) {
        const partyCritBonus = (window.partyCritCount || 0) * STAT_CONSTANTS.PARTY_CRIT_SYNERGY_PER_PLAYER;
        let commonStats = {
            "주스탯":[], "주스탯 %":[],
            "무기 공격력": [], "무기 공격력 %": [], "기본 공격력": [], "기본 공격력 %": [], "공격력": [], "공격력 %": [],
            "치명": [], "신속": [], "진화형 피해": [], "추가 피해": [],
            "치명타 적중률": [], "치명타 피해": [], "치명타 시 적에게 주는 피해": [],
            "적에게 주는 피해": [],"방어력 무시":[],
            "이동 속도": [], "공격 속도": [], "쿨타임 감소": [],
            "마나 스킬 쿨타임 감소": [], "쿨타임 증가": [], "고정 쿨타임 감소": []
        };

        Object.values(ADD_STAT_BASE).forEach(stat => {
            addStat(commonStats, stat.category, stat.name, stat.value, stat.unit);
        });

        if (partyCritBonus > 0) {
            addStat(commonStats, "치명타 적중률", `파티 시너지 (${inputs.partyCritCount}명)`, partyCritBonus);
        }

        // 방어구 주스탯 합산
        addStat(commonStats, "주스탯", "투구", inputs.headStat, "");
        addStat(commonStats, "주스탯", "견갑", inputs.shoulderStat, "");
        addStat(commonStats, "주스탯", "상의", inputs.topStat, "");
        addStat(commonStats, "주스탯", "하의", inputs.bottomStat, "");
        addStat(commonStats, "주스탯", "장갑", inputs.gloveStat, "");

        // ★ 무기 공격력 합산
        // inputs.weaponAtk에 이미 에스더/엘라 스탯이 모두 포함되어 있으므로 그대로 등록합니다.
        const weaponLabel = inputs.isEsther ? `에스더 무기 (엘라 ${inputs.estherElla ?? 0})` : "무기";
        addStat(commonStats, "무기 공격력", weaponLabel, inputs.weaponAtk, "");

        // 에스더 결속 데이터 정의
        const estherBonding1Data = [145983, 153282, 257503, 453359];
        const estherBonding2Data = [3946, 4305, 7250, 16450];

        if (inputs.isEsther) {
            // 1) 엘라 단계 안전 추출 (기본값 0)
            const ellaLvl = inputs.estherElla ?? 0;

            // 2) 1차 결속 ON 시에만 변수 선언 및 스탯 추가
            if (window.estherBonding1) {
                const bonding1Stat = estherBonding1Data[ellaLvl] || 0;
                if (bonding1Stat > 0) {
                    addStat(commonStats, "주스탯", `에스더 결속 1단계 (엘라 ${ellaLvl})`, bonding1Stat, "");
                }
            }

            // 3) 2차 결속 ON 시에만 변수 선언 및 스탯 추가
            if (window.estherBonding2) {
                const bonding2Stat = estherBonding2Data[ellaLvl] || 0;
                if (bonding2Stat > 0) {
                    addStat(commonStats, "공격력", `에스더 결속 2단계 (엘라 ${ellaLvl})`, bonding2Stat, "");
                }
            }
        }


        // 완갑 데이터 처리
        if (inputs.vambraceData) {
            const weaponAtk = inputs.vambraceData.무기공격력 || 0;
            if (weaponAtk > 0) {
                addStat(commonStats, "무기 공격력", "완갑", weaponAtk, "");
            }

            const mainStat = inputs.vambraceData.주스탯 || 0;
            if (mainStat > 0) {
                addStat(commonStats, "주스탯", "완갑", mainStat, "");
            }

            const baseAtk = inputs.vambraceData.기본공격력 || 0;
            if (baseAtk > 0) {
                addStat(commonStats, "기본 공격력", "완갑", baseAtk, "");
            }
        }

        // 완갑 등급별 기본 공격력 %
        const vambraceGradeAtkMap = { "영웅": 0, "전설": 1, "유물": 2, "고대": 3 };
        const vambraceGrade = inputs.vambraceGrade || "영웅";
        const vambraceNormalAtkPercent = vambraceGradeAtkMap[vambraceGrade] ?? 0;

        if (vambraceNormalAtkPercent > 0) {
            addStat(commonStats, "기본 공격력 %", "완갑 기본 공격력 %", vambraceNormalAtkPercent, "%");
        }
      
        addStat(commonStats, "기본 공격력", "완갑 기본 공격력", inputs.vambraceNomalAtk, "");
        addStat(commonStats, "기본 공격력 %", "완갑 기본 공격력 %", inputs.vambraceNormalAtkPercent, "%");



        // =============================================================================
        // 아크 패시브 진화 (Rank 수치 기반 스탯 연산)
        // =============================================================================
        // 1. 객체 형태 ("진화": { rank: 6 }) 및 다양한 키(evolution, 진화) 대응
        const evolutionData = inputs?.arkPassive?.["진화"] || inputs?.arkPassive?.evolution;

        // 2. Rank 수치 추출
        let evolutionRank = 0;

        if (typeof evolutionData === "object" && evolutionData !== null) {
            evolutionRank = Number(evolutionData.rank) || 0;
        } else {
            evolutionRank = Number(inputs?.arkPassive?.evolutionRank) || 0;
        }

        // 3. 스탯 추가 적용
        if (evolutionRank > 0) {
            // TODO: Rank당 증가시킬 % 수치를 설정하세요. (예: Rank 1당 1%면 1, 1.5%면 1.5)
            const STAT_PER_RANK = 1;

            // 부동소수점 오차 방지
            const statValue = Number((evolutionRank * STAT_PER_RANK).toFixed(2));

            addStat(
                commonStats,
                "진화형 피해",
                `아크 패시브 진화 (Rank.${evolutionRank})`,
                statValue,
                "%"
            );

        }

        // 아크 패시브 깨달음 (무기 공격력 % 연산)
        // =============================================================================
        // 1. 객체 형태 ("깨달음": { level: 30 }) 및 다양한 키(enlighten, 깨달음) 대응
        const enlightenData = inputs?.arkPassive?.["깨달음"] || inputs?.arkPassive?.enlighten;

        // 2. 수치 추출 (객체 안의 level 또는 배열/숫자 형태 fallback)
        let enlightenLevel = 0;

        if (typeof enlightenData === "object" && enlightenData !== null) {
            // inputs.arkPassive["깨달음"].level 가져오기
            enlightenLevel = Number(enlightenData.level) || 0;
        } else if (Array.isArray(enlightenData)) {
            // 만약 기존처럼 배열 구조일 경우 무기 공격력 노드 탐색
            const atkNode = enlightenData.find(node =>
                node.name && (node.name.includes("무기 공격력") || node.name.includes("깨달음"))
            );
            enlightenLevel = Number(atkNode?.level) || 0;
        } else {
            enlightenLevel = Number(inputs?.arkPassive?.enlightenLevel) || 0;
        }

        // 3. 스탯 추가 적용
        if (enlightenLevel > 0) {
            // 자바스크립트 부동소수점 오차 방지 (예: 30 * 0.1 = 3)
            const statValue = Number((enlightenLevel * 0.1).toFixed(2));

            addStat(
                commonStats,
                "무기 공격력 %",
                `아크 패시브 깨달음 (Lv.${enlightenLevel})`,
                statValue,
                "%"
            );

        }


        const engravingCategoryMap = [
            "적에게 주는 피해", "공격력 %", "치명타 적중률",
            "적에게 주는 피해", "적에게 주는 피해", "적에게 주는 피해", "공격력 %"
        ];

        inputs.engravings.forEach(eng => {
            if (eng.name === "none" || eng.level === "미사용") return;
            if (eng.name === "질량 증가")
                addStat(commonStats,"공격 속도","질량 증가",-10,"%")


            if (eng.name === "아드레날린") {
                [1, 2].forEach(colIdx => {
                    const baseVal = engravingTable.levels[eng.level][colIdx];
                    const stoneVal = engravingTable.seongong[eng.stone][colIdx];
                    addStat(commonStats, engravingCategoryMap[colIdx], `각인: 아드레날린 [${eng.level} + 세공 ${eng.stone}]`, parseFloat((baseVal + stoneVal).toFixed(2)));
                });
            } else if (eng.name === "돌격대장") {
                const colIdx = engravingTable.columns.indexOf("돌격대장");
                if (colIdx !== -1) {
                    const raidFactor = engravingTable.levels[eng.level][colIdx] + engravingTable.seongong[eng.stone][colIdx];
                    if (raidFactor > 0) {
                        commonStats["_돌격대장계수"] = raidFactor / 100;
                        commonStats["_돌격대장정보"] = `각인: 돌격대장 [${eng.level} + 세공 ${eng.stone}]`;
                    }
                }
            } else {
                const colIdx = engravingTable.columns.indexOf(eng.name);
                if (colIdx !== -1) {
                    const totalVal = parseFloat((engravingTable.levels[eng.level][colIdx] + engravingTable.seongong[eng.stone][colIdx]).toFixed(2));
                    addStat(commonStats, engravingCategoryMap[colIdx], `각인: ${eng.name} [${eng.level} + 세공 ${eng.stone}]`, totalVal);
                }
            }
        });

        const percentStatList = ["공격력 %", "무기 공격력 %", "치명타 피해", "치명타 적중률", "피해 증가", "추가 피해","적에게 주는 피해"];
        inputs.accessories.forEach(acc => {
            addStat(commonStats,"주스탯", acc.name, acc.statValue,"")
            acc.slots.forEach((slot, idx) => {
                if (!slot || !slot.opt || slot.opt === "none" || slot.opt === "없음") return;
                
                // 1. 공백 제거 및 옵션 키 매칭 유연화
                let rawKey = slot.opt.trim();

                // accessoryTable에서 정확히 일치하는 키 검색 (1순위)
                let matchedKey = Object.keys(accessoryTable).find(k => k.trim() === rawKey);

                // Exact match가 안 될 경우 유연 매칭 (2순위)
                if (!matchedKey) {
                    // [중요] '공격력' 포함 여부를 검사하기 전에, 더 길고 명확한 서포터 옵션들을 먼저 분기 처리합니다.
                    if (rawKey.includes("아군 공격력") || rawKey.includes("아공강")) {
                        matchedKey = Object.keys(accessoryTable).find(k => k.includes("아군 공격력")) || "아군 공격력 강화 효과 %";
                    } 
                    else if (rawKey.includes("아군 피해") || rawKey.includes("아피강")) {
                        matchedKey = Object.keys(accessoryTable).find(k => k.includes("아군 피해")) || "아군 피해 강화 효과 %";
                    } 
                    else if (rawKey.includes("낙인력")) {
                        matchedKey = Object.keys(accessoryTable).find(k => k.includes("낙인력")) || "낙인력 %";
                    }
                    // 일반 스탯 옵션 처리 (서포터 옵션이 모두 걸러진 후 실행)
                    else if (rawKey.includes("무기 공격력") && rawKey.includes("%")) matchedKey = "무기 공격력 %";
                    else if (rawKey.includes("무기 공격력")) matchedKey = "무기 공격력";
                    else if (rawKey.includes("공격력") && rawKey.includes("%")) matchedKey = "공격력 %";
                    else if (rawKey.includes("공격력")) matchedKey = "공격력";
                    else if (rawKey.includes("치명타 적중률") || rawKey.includes("치적")) matchedKey = "치명타 적중률";
                    else if (rawKey.includes("치명타 피해") || rawKey.includes("치피")) matchedKey = "치명타 피해";
                    else if (rawKey.includes("추가 피해") || rawKey.includes("추피")) matchedKey = "추가 피해";
                    else if (rawKey.includes("적에게 주는 피해") || rawKey.includes("적주피")) matchedKey = "적에게 주는 피해";
                }

                if (matchedKey && accessoryTable[matchedKey]?.[slot.grade] !== undefined) {
                    const val = accessoryTable[matchedKey][slot.grade];
                    const isPercent = matchedKey.includes("%") || percentStatList.includes(matchedKey);
                    const unit = isPercent ? "%" : "";

                    addStat(commonStats, matchedKey, `장신구: ${acc.name} (슬롯${idx + 1}) [${matchedKey} - ${slot.grade}]`, val, unit);
                } 
            });
        });

        addStat(commonStats, "공격력 %", "젬: 공격력", inputs.gems.atk);
        addStat(commonStats, "추가 피해", "젬: 추가 피해", inputs.gems.addDmg);
        addStat(commonStats, "적에게 주는 피해", "젬: 보스 피해", inputs.gems.bossDmg);

        const skillGemMap = {};
        inputs.skillGems.forEach(gem => {
            const gemAtkVal = gemDataTable["공증"]?.[gem.level] || 0;
            if (gemAtkVal > 0) {
                const sourceText = `보석(${gem.type}): ${gem.skillName} [${gem.level}레벨]`;
                addStat(commonStats, "기본 공격력 %", sourceText, parseFloat(gemAtkVal.toFixed(2)));
            }

            if (!skillGemMap[gem.skillName]) skillGemMap[gem.skillName] = [];
            skillGemMap[gem.skillName].push({ type: gem.type, level: gem.level });
        });

        ['Sun', 'Moon', 'Star'].forEach(target => {
            const coresObj = inputs?.chaosCores || {};
            // 대소문자 호환 탐색 (sun, Sun, SUN 등)
            const targetKey = Object.keys(coresObj).find(k => k.toLowerCase() === target.toLowerCase());
            const coreInfo = coresObj[targetKey];

            if (!coreInfo || !coreInfo.grade || coreInfo.grade === '미장착') return;

            const { grade, level } = coreInfo;

            // 등급 문자열 정규화 ("고대 1단계", "유물 코어" -> "고대", "유물")
            const matchedGrade = grade.includes('고대') ? '고대' : (grade.includes('유물') ? '유물' : null);
            if (!matchedGrade) return;

            const data = chaosDataSets[matchedGrade]?.[target.toLowerCase()];

            if (data) {
                coreLevels.forEach(lvl => {
                    // Number(level)로 타입 변환하여 레벨 조건 판별
                    if (Number(level) >= lvl && Array.isArray(data[lvl])) {
                        data[lvl].forEach(opt => {
                            const unit = opt.type === "공격력" ? "" : "%";
                            addStat(commonStats, opt.type, `혼돈 코어(${target}) Lv.${lvl} [${grade}]`, opt.value, unit);
                        });
                    }
                });
            }
        });

        [
            ['crit', '치명'],
            ['swift', '신속'],
            ['mainStat', '주스탯']
        ].forEach(([key, category]) => {
            const val = inputs.bracelet?.[key];
            if (val) addStat(commonStats, category, "팔찌", val, "");
        });

        (inputs?.bracelet?.options || []).forEach((opt, i) => {
            if (opt && opt.opt && opt.opt !== "none") {
                const optionData = getBraceletOptionData(opt.opt, opt.grade);
                if (optionData) {
                    for (let eff in optionData) {
                        addStat(commonStats, eff, `팔찌 옵션 ${i + 1} (${opt.opt} - ${opt.grade})`, optionData[eff]);
                    }
                } else {
                    console.warn(`[팔찌 옵션 매칭 실패] 원본: "${opt.opt}", 등급: "${opt.grade}"`);
                }
            }
        });

        const arkStats = getArkEvolutionStats();
        for (let cat in arkStats) {
            if (commonStats[cat]) commonStats[cat].push(...arkStats[cat]);
        }


        const bluntThornNode = evolutionNodes[4]?.find(node => node.isBluntThorn);
        const sonicsNode = evolutionNodes[4]?.find(node => node.isSonics);

        let allSkillResults = [];


        // 스킬별 작업 시작
        // -----------------------------------------------------
        // 현재 적용된 코어 세팅 키 판별 (parseArkCores에서 설정된 isGiRyuSet 활용)
        // 만약 inputs 객체나 전역 변수에 저장되어 있다면 해당 값을 불러옵니다.
        const activeCoreSet = window.isGiRyuSet ? "기류 조절" : "비연참";

        skillDatabase.forEach((skillData, skillIndex) => {
            // skillData 구조 분해 할당
            const { name: skillName, tripods = {}, coefficient, constant, baseCooldown = 0 } = skillData;

            let stats = {};
            for (let key in commonStats) {
                stats[key] = Array.isArray(commonStats[key]) ? [...commonStats[key]] : commonStats[key];
            }

            // =============================================================================
            // [수정된 부분] 1. 트라이포드 적용
            // currentTripods: 현재 코어 세팅("기류 조절" 또는 "비연참")에 맞는 트라이포드 배열 추출
            // =============================================================================
            const currentTripods = Array.isArray(tripods) 
                ? tripods 
                : (tripods[activeCoreSet] || tripods["비연참"] || []);

            if (Array.isArray(currentTripods)) {
                currentTripods.forEach(tp => {
                    let sourceType = (skillName === '공간 가르기' || skillName === '우레바람') 
                        ? `${tp.name}` 
                        : `트라이포드(${tp.tier}트포 - ${tp.name})`;
                    addStat(stats, tp.category, sourceType, tp.val, tp.unit);
                });
            }

            // 2. 보석 적용
            if (skillGemMap[skillName]) {
                skillGemMap[skillName].forEach(({ type, level }) => {
                    if (type === "겁화") {
                        addStat(stats, "적에게 주는 피해", `보석(겁화): ${skillName} [${level}레벨]`, parseFloat(((gemDataTable["겁화"][level] - 1) * 100).toFixed(2)));
                    } else if (type === "작열") {
                        addStat(stats, "쿨타임 감소", `보석(작열): ${skillName} [${level}레벨]`, parseFloat(((1 - gemDataTable["작열"][level]) * 100).toFixed(2)));
                    }
                });
            }

            // =============================================================================
            // 질서 코어 연산 로직
            // =============================================================================
            ['Sun', 'Moon', 'Star'].forEach(target => {
                const coresObj = inputs?.orderCores || {};
                const targetKey = Object.keys(coresObj).find(k => k.toLowerCase() === target.toLowerCase());
                const coreInfo = coresObj[targetKey];

                // 코어가 없거나, 미장착이거나, 레벨이 0이면 스킵
                if (!coreInfo || !coreInfo.grade || coreInfo.grade === '미장착' || !coreInfo.level) return;

                const { name: coreName, grade, level } = coreInfo;

                // 등급 판별 ("고대" 또는 "유물")
                const matchedGrade = grade.includes('고대') ? '고대' : (grade.includes('유물') ? '유물' : null);
                if (!matchedGrade) return;

                // 파싱된 코어 이름으로 데이터셋 검색 (없으면 슬롯별 기본값 대체 가능)
                const activeCoreName = coreName || (target === 'Sun' ? '비연참' : target === 'Moon' ? '우산의 춤' : '휘몰아치기');
                const coreData = orderDataSets[activeCoreName]?.[matchedGrade];

                if (!coreData) return;

                const userLevel = Number(level) || 0;

                // 해당 코어의 포인트 구간(10, 14, 17, 18, 19, 20) 순회
                Object.keys(coreData).forEach(reqPointStr => {
                    const reqPoint = Number(reqPointStr);

                    // 유저의 코어 포인트가 요구 포인트 이상일 경우에만 활성화
                    if (userLevel >= reqPoint) {
                        const effectList = coreData[reqPointStr];

                        if (Array.isArray(effectList)) {
                            effectList.forEach(effect => {
                                const { category, val, skills } = effect;

                                // 현재 연산 중인 스킬(skillName)이 skills 배열에 들어있는지 검사
                                if (Array.isArray(skills) && skills.includes(skillName)) {
                                    if (!category || val === undefined) return;

                                    // 배율 형태(예: 1.02)를 퍼센트 형태(2%)로 변환
                                    const statValue = val > 1.0 ? parseFloat(((val - 1) * 100).toFixed(3)) : val;

                                    if (statValue > 0) {
                                        addStat(
                                            stats,
                                            category,
                                            `질서 코어(${target}:${activeCoreName}) Pt.${reqPoint} [${matchedGrade}]`,
                                            statValue
                                        );
                                    }
                                }
                            });
                        }
                    }
                });
            });

            let totalStoneLevel = 0;
            if (Array.isArray(inputs.engravings)) {
                totalStoneLevel = inputs.engravings.reduce((sum, eng) => sum + (parseInt(eng?.stone, 10) || 0), 0);
            }
            const carveAtkBonusPercent = totalStoneLevel >= 5 ? 1.5 : 0;

            /*
            --------------------계산 시작-----------------------------
            */ 
            const normalStat = getStatSum(stats, "주스탯");
            const statPercent = getStatSum(stats, "주스탯 %");
            const finalStat = normalStat * (1 + statPercent / 100);

            const defPenSum = getStatSum(stats, "방어력 무시");

            const weaponAtkPercent = getStatSum(stats, "무기 공격력 %");
            const finalWeaponAtk = getStatSum(stats, "무기 공격력") * (1 + (weaponAtkPercent / 100));

            const normalAtkPercent = getStatSum(stats, "기본 공격력 %");

            const calculatedBaseAtk = finalStat > 0 && finalWeaponAtk > 0
                ? (Math.sqrt((finalStat * finalWeaponAtk) / 6)) * (1 + (normalAtkPercent + carveAtkBonusPercent) / 100)
                : 0;

            const flatAtkBonus = getStatSum(stats, "공격력");
            const percentAtkBonus = getStatSum(stats, "공격력 %");
            const finalAtk = (calculatedBaseAtk + flatAtkBonus) * (1 + (percentAtkBonus / 100));

            let baseDamage = calculateDamageBase(finalAtk, coefficient, constant, defPenSum);

            const totalSwift = getStatSum(stats, "신속");
            const swiftSpeedBonus = totalSwift * STAT_CONSTANTS.SWIFT_TO_SPEED;
            const atkSpeedSum = getStatSum(stats, "공격 속도");
            const moveSpeedSum = getStatSum(stats, "이동 속도");
            
            const finalAtkSpeed = swiftSpeedBonus + atkSpeedSum;
            const finalMoveSpeed = swiftSpeedBonus + moveSpeedSum;

            const moveSpeedBonus = Math.min(STAT_CONSTANTS.SPEED_CAP, Math.max(0, finalMoveSpeed));

            addStat(stats, "치명타 적중률", "깨달음 - 기민함", Math.min(finalMoveSpeed, STAT_CONSTANTS.SPEED_CAP) * STAT_CONSTANTS.SPEED_TO_CRIT_RATE_COEFF, "%");
            addStat(stats, "치명타 피해", "깨달음 - 기민함", Math.min(finalAtkSpeed, STAT_CONSTANTS.SPEED_CAP) * STAT_CONSTANTS.SPEED_TO_CRIT_DMG_COEFF, "%");


            const totalCritStat = getStatSum(stats, "치명");
            const totalCritRatePercent = (totalCritStat * STAT_CONSTANTS.CRIT_TO_RATE) + getStatSum(stats, "치명타 적중률");
            let critRate = Math.min(totalCritRatePercent / 100, 1.0);
            
            let totalBluntDmg = 0;
            if(bluntThornNode && bluntThornNode.current >0){
                const excessCrit = Math.max(0, (totalCritRatePercent/100 - 0.8)*100);
                // 레벨별(1LV / 2LV) 기준값 설정
                const baseDmg = bluntThornNode.current === 1 ? 7.5 : 15.0;
                const ratio   = bluntThornNode.current === 1 ? 1.25 : 1.5;
                const maxDmg  = bluntThornNode.current === 1 ? 52.5 : 75.0;
                
                // 최종 진화형 피해 계산 (최대치 제한 적용)
                totalBluntDmg = Math.min(maxDmg, baseDmg + (excessCrit * ratio));
                critRate = Math.min(critRate, 0.8);
                
                // 스탯 합산
                addStat(stats, "진화형 피해", `아크 패시브(진화 5티어): 뭉툭한 가시 [${bluntThornNode.current}/${bluntThornNode.max}LV]`, parseFloat(totalBluntDmg.toFixed(2)));
            }




            if (stats["_돌격대장계수"]) {
                addStat(stats, "적에게 주는 피해", `${stats["_돌격대장정보"]} (이속 +${moveSpeedBonus.toFixed(2)}% 적용)`, parseFloat((moveSpeedBonus * stats["_돌격대장계수"]).toFixed(2)));
            }

            let totalSonicDmg = 0;
            if (sonicsNode && sonicsNode.current > 0) {
                const atkBonus = Math.max(0, finalAtkSpeed);
                const moveBonus = Math.max(0, finalMoveSpeed);
                let sonicDmg = (Math.min(STAT_CONSTANTS.SPEED_CAP, atkBonus) + Math.min(STAT_CONSTANTS.SPEED_CAP, moveBonus)) * 0.1;
                sonicDmg += (Math.max(0, atkBonus - STAT_CONSTANTS.SPEED_CAP) + Math.max(0, moveBonus - STAT_CONSTANTS.SPEED_CAP)) * 0.3;
                if (atkBonus > STAT_CONSTANTS.SPEED_CAP && moveBonus > STAT_CONSTANTS.SPEED_CAP) sonicDmg += 8;
                if (sonicsNode.current === 1) sonicDmg *= 0.5;
                totalSonicDmg = Math.min(STAT_CONSTANTS.SONICS_MAX_DMG, sonicDmg);
                addStat(stats, "진화형 피해", `아크 패시브(진화 5티어): 음속 돌파 [${sonicsNode.current}/${sonicsNode.max}LV]`, parseFloat(totalSonicDmg.toFixed(2)));
            }

            const totalAdditionalDamageMuntiplier = 1 + (getStatSum(stats, "추가 피해") / 100);
            if (!stats["추가 피해"]) stats["추가 피해"] = [];

            const totalEvolutionDamage = getStatSum(stats, "진화형 피해");
            const evolutionDamageMultiplier = 1 + (totalEvolutionDamage / 100);

            if (!stats["적에게 주는 피해"]) stats["적에게 주는 피해"] = [];
            
            if (stats["적에게 주는 피해"]) {
                const isSkillSpec = (source) => source.startsWith("트라이포드") || source.startsWith("깨달음") || source.startsWith("도약");
                const tpItems = stats["적에게 주는 피해"].filter(item => isSkillSpec(item.source));
                const otherItems = stats["적에게 주는 피해"].filter(item => !isSkillSpec(item.source));
                stats["적에게 주는 피해"] = [...tpItems, ...otherItems];
            }
            const totalDamageMultiplier = stats["적에게 주는 피해"].reduce((acc, item) => acc * (1 + ((Number(item.val) || 0) / 100)), 1.0);
            const totalCritDamagePercent = getStatSum(stats, "치명타 피해");
            
            const critHitDamageMultiplier = (stats['치명타 시 적에게 주는 피해'] || []).reduce((acc, cur) => acc * (1 + cur.val / 100), 1.0);
            const nonCritBaseDamage = baseDamage * totalDamageMultiplier * evolutionDamageMultiplier * totalAdditionalDamageMuntiplier;
            const CritBaseDamage = nonCritBaseDamage * (totalCritDamagePercent / 100) * critHitDamageMultiplier;

            
            const expDmg = CritBaseDamage * critRate + nonCritBaseDamage * (1 - critRate);

            const swiftMultiplier = 1 - ((totalSwift * STAT_CONSTANTS.SWIFT_TO_CDR) / 100);
            const appliedManaCdrMultiplier = (skillName !== "공간 가르기") ? (1 - (getStatSum(stats, "마나 스킬 쿨타임 감소") / 100)) : 1.0;

            const allCdrList = stats['쿨타임 감소'] || [];
            const passiveCdrMultiplier = 1 - ((allCdrList || []).filter(i => i && i.source && (i.source.includes('최적화 훈련') || i.source.includes('타이밍 지배'))).reduce((s, c) => s + (Number(c.val) || 0), 0) / 100);
            const otherCdrMultiplier = allCdrList.filter(i => !i.source?.includes('최적화 훈련') && !i.source?.includes('타이밍 지배')).reduce((acc, cur) => acc * (1 - cur.val / 100), 1.0);
            const cdrIncreaseMultiplier = 1 + (getStatSum(stats, "쿨타임 증가") / 100);

            const rawBaseCooldown = baseCooldown;
            const flatCdReduction = getStatSum(stats, "고정 쿨타임 감소");
            const adjustedBaseCooldown = Math.max(0, rawBaseCooldown - flatCdReduction);
            const finalCooldown = adjustedBaseCooldown * swiftMultiplier * appliedManaCdrMultiplier * passiveCdrMultiplier * otherCdrMultiplier * cdrIncreaseMultiplier;

            allSkillResults.push({
                skillName,
                inputs,
                weaponAtkPercent,
                finalStat,
                finalWeaponAtk,
                normalAtkPercent,
                carveAtkBonusPercent,
                totalStoneLevel,
                calculatedBaseAtk,
                flatAtkBonus: getStatSum(stats, "공격력"),
                percentAtkBonus: getStatSum(stats, "공격력 %"),
                vambraceNormalAtk: getStatSum(stats, "기본 공격력"),
                vambraceNormalAtkPercent: getStatSum(stats, "기본 공격력 %"),
                finalAtk,
                totalCritStat,
                totalSwiftStat: totalSwift,
                totalCritRatePercent,
                totalEvolutionDamage,
                finalAtkSpeed,
                finalMoveSpeed,
                totalBluntDmg,
                totalSonicDmg,
                expDmg,
                finalCooldown,
                stats
            });
        });
        return allSkillResults;
    }

    // =============================================================================
    // 6. UI 초기화 및 결과 출력 함수
    // =============================================================================
    window.closeSimModal = function() {
        const modal = document.getElementById('sim-result-modal');
        if (modal) modal.style.display = 'none';
    };

    window.renderResultsHTML = function(allSkillResults, selectedSkillIdx = null) {
        if (!allSkillResults || allSkillResults.length === 0) return;

        window.lastSkillResults = allSkillResults;

        // 💡 [핵심 1] 선택된 스킬 인덱스를 전역 변수에 기억 (실시간 연산이 실행되어도 선택 유지)
        if (selectedSkillIdx !== null && selectedSkillIdx !== undefined) {
            window.currentSelectedSkillIdx = selectedSkillIdx;
        } else if (window.currentSelectedSkillIdx === undefined) {
            window.currentSelectedSkillIdx = 0;
        }

        const currentIdx = window.currentSelectedSkillIdx;
        const commonRes = allSkillResults[0];
        let bodyContent = ``;

        // 1. 공통 세팅 지표
        bodyContent += `
            <h3 style="border:none; margin:0 0 10px 0; color: #c084fc; font-size: 1.1rem;">[캐릭터 공통 세팅 지표]</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; margin-bottom: 20px;">
                <div style="background: #181920; border: 1px solid #2e323d; padding: 12px; border-radius: 8px;">
                    <div style="font-size: 0.8rem; color: #94a3b8;">최종 공격력</div>
                    <div style="font-size: 1.05rem; font-weight: bold; margin-top: 4px; color: #38bdf8;">${Math.floor(commonRes.finalAtk || 0).toLocaleString()}</div>
                </div>
                <div style="background: #181920; border: 1px solid #2e323d; padding: 12px; border-radius: 8px;">
                    <div style="font-size: 0.8rem; color: #94a3b8;">치명 / 신속</div>
                    <div style="font-size: 1.05rem; font-weight: bold; margin-top: 4px; color: #38bdf8;">${commonRes.totalCritStat || 0} / ${commonRes.totalSwiftStat || 0}</div>
                </div>
                <div style="background: #181920; border: 1px solid #2e323d; padding: 12px; border-radius: 8px;">
                    <div style="font-size: 0.8rem; color: #94a3b8;">치명타 적중률</div>
                    <div style="font-size: 1.05rem; font-weight: bold; margin-top: 4px; color: #38bdf8;">${(commonRes.totalCritRatePercent || 0).toFixed(2)}%</div>
                </div>
                <div style="background: #181920; border: 1px solid #2e323d; padding: 12px; border-radius: 8px;">
                    <div style="font-size: 0.8rem; color: #94a3b8;">진화형 피해</div>
                    <div style="font-size: 1.05rem; font-weight: bold; margin-top: 4px; color: #38bdf8;">+${(commonRes.totalEvolutionDamage || 0).toFixed(2)}%</div>
                </div>
                <div style="background: #181920; border: 1px solid #2e323d; padding: 12px; border-radius: 8px;">
                    <div style="font-size: 0.8rem; color: #94a3b8;">공속 / 이속</div>
                    <div style="font-size: 1.05rem; font-weight: bold; margin-top: 4px; color: #38bdf8;">${(commonRes.finalAtkSpeed || 0).toFixed(1)}% / ${(commonRes.finalMoveSpeed || 0).toFixed(1)}%</div>
                </div>
                <div style="background: #181920; border: 1px solid #2e323d; padding: 12px; border-radius: 8px;">
                    <div style="font-size: 0.8rem; color: #94a3b8;">뭉툭한 가시 효율</div>
                    <div style="font-size: 1.05rem; font-weight: bold; margin-top: 4px; color: #38bdf8;">+${(commonRes.totalBluntDmg || commonRes.totalBluntThornDmg || 0).toFixed(2)}%</div>
                </div>
                <div style="background: #181920; border: 1px solid #2e323d; padding: 12px; border-radius: 8px;">
                    <div style="font-size: 0.8rem; color: #94a3b8;">음속 돌파 효율</div>
                    <div style="font-size: 1.05rem; font-weight: bold; margin-top: 4px; color: #38bdf8;">+${(commonRes.totalSonicDmg || 0).toFixed(2)}%</div>
                </div>
            </div>
        `;

        // 2. 스킬별 요약 테이블
        bodyContent += `
            <h3 style="border:none; margin:0 0 8px 0; color: #c084fc; font-size: 1.1rem;">
                [스킬별 시뮬레이션 결과 요약]
                <span style="font-size: 0.75em; font-weight: normal; color: #94a3b8;">(행 클릭 시 세부 내역 표시)</span>
            </h3>
            <div style="overflow-x: auto; margin-top: 10px;">
                <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem;">
                    <thead>
                        <tr style="background-color: #181920; color: #94a3b8; border-bottom: 1px solid #2e323d;">
                            <th style="padding: 10px;">스킬명</th>
                            <th style="padding: 10px;">대미지 기대값</th>
                            <th style="padding: 10px;">스킬 쿨타임</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        allSkillResults.forEach((res, idx) => {
            const isSelected = (idx === currentIdx); // 💡 저장된 currentIdx 기반으로 체크
            const rowStyle = isSelected
                ? 'background-color: #2d3142; cursor: pointer; border-bottom: 1px solid #2e323d;'
                : 'cursor: pointer; border-bottom: 1px solid #2e323d;';

            bodyContent += `
                <tr class="sim-skill-row" data-idx="${idx}" style="${rowStyle}">
                    <td style="padding: 10px; font-weight: bold; ${isSelected ? 'color: #38bdf8;' : 'color: #e2e8f0;'}">
                        ${res.skillName} ${isSelected ? '✔' : ''}
                    </td>
                    <td style="padding: 10px; color: #facc15; font-weight: bold;">${Math.floor(res.expDmg || 0).toLocaleString()}</td>
                    <td style="padding: 10px; color: #38bdf8;">${(res.finalCooldown || 0).toFixed(2)}초</td>
                </tr>
            `;
        });

        bodyContent += `
                    </tbody>
                </table>
            </div>
            <hr style="border: 0; border-top: 1px dashed #2e323d; margin: 25px 0;">
        `;

        // 3. 공격력 산출 상세 정보 계산 및 헬퍼 함수 (1열 전용 표)
        const formatItemListToTable = (flatItems, percentItems, categoryNames = { flat: "[세부 항목]", percent: "[계수]" }) => {
            const hasFlat = Array.isArray(flatItems) && flatItems.length > 0;
            const hasPercent = Array.isArray(percentItems) && percentItems.length > 0;

            if (!hasFlat && !hasPercent) {
                return `<div style="color: #64748b; font-size: 0.8rem; padding: 6px 0;">내역 없음</div>`;
            }

            let html = `<table style="width: 100%; border-collapse: collapse; font-size: 0.82rem; margin-top: 4px;"><tbody>`;

            // 1. 고정 수치 파트 (1열 세로 정렬)
            if (hasFlat) {
                html += `
                    <tr>
                        <td colspan="2" style="padding: 6px 0 4px 0; color: #94a3b8; font-weight: bold; font-size: 0.8rem; border-bottom: 1px solid #2e323d;">
                            ${categoryNames.flat}
                        </td>
                    </tr>
                `;

                flatItems.forEach(item => {
                    const val = typeof item.val === 'number' ? item.val.toLocaleString() : item.val;
                    const src = item.source || '기본';

                    html += `
                        <tr>
                            <td style="padding: 5px 8px; color: #94a3b8; text-align: left; border-bottom: 1px solid #232733;">${src}</td>
                            <td style="padding: 5px 8px; color: #e2e8f0; font-weight: 500; text-align: right; border-bottom: 1px solid #232733;">+${val}</td>
                        </tr>
                    `;
                });
            }

            // 2. 퍼센트 수치 파트 (1열 세로 정렬)
            if (hasPercent) {
                if (hasFlat) {
                    html += `<tr><td colspan="2" style="padding: 6px 0;"></td></tr>`;
                }

                html += `
                    <tr>
                        <td colspan="2" style="padding: 6px 0 4px 0; color: #38bdf8; font-weight: bold; font-size: 0.8rem; border-bottom: 1px solid #2e323d;">
                            ${categoryNames.percent}
                        </td>
                    </tr>
                `;

                percentItems.forEach(item => {
                    const val = (Number(item.val) || 0).toFixed(2);
                    const src = item.source || '옵션';

                    html += `
                        <tr>
                            <td style="padding: 5px 8px; color: #94a3b8; text-align: left; border-bottom: 1px solid #232733;">${src}</td>
                            <td style="padding: 5px 8px; color: #38bdf8; font-weight: 600; text-align: right; border-bottom: 1px solid #232733;">+${val}%</td>
                        </tr>
                    `;
                });
            }

            html += `</tbody></table>`;
            return html;
        };

        const stats = commonRes.stats || {};
        const finalStat = commonRes.finalStat || 0;
        const finalWeaponAtk = commonRes.finalWeaponAtk || 0;
        const calculatedBaseAtk = commonRes.calculatedBaseAtk || 0;
        const finalAtk = commonRes.finalAtk || 0;
        const carveAtkBonusPercent = commonRes.carveAtkBonusPercent || 0;
        const totalStoneLevel = commonRes.totalStoneLevel || 0;

        let vambracePercentList = [...(stats["기본 공격력 %"] || [])];
        if (carveAtkBonusPercent > 0) {
            vambracePercentList.push({ source: `세공 (${totalStoneLevel}LV)`, val: carveAtkBonusPercent });
        }

        bodyContent += `
            <h3 style="border:none; margin:0 0 12px 0; color: #c084fc; font-size: 1.1rem;">📊 [공격력 산출 과정]</h3>
            <div style="display: flex; flex-direction: column; gap: 14px; font-size: 0.9rem;">
                
                <!-- 0. 주스탯 -->
                <div style="background: #181920; border: 1px solid #2e323d; padding: 14px; border-radius: 8px;">
                    <div style="font-weight: 600; color: #c084fc; margin-bottom: 8px; font-size: 0.95rem;">0. 주스탯</div>
                    ${formatItemListToTable(stats["주스탯"], stats["주스탯 %"], { flat: "[주스탯 합산]", percent: "[주스탯 % 계수]" })}
                    <div style="text-align: right; font-weight: bold; color: #e2e8f0; margin-top: 10px; font-size: 0.95rem; border-top: 1px dashed #2e323d; padding-top: 8px;">
                        합계 = <span style="color: #38bdf8; font-size: 1.05rem;">${Math.floor(finalStat).toLocaleString()}</span>
                    </div>
                </div>

                <!-- 1. 최종 무기 공격력 -->
                <div style="background: #181920; border: 1px solid #2e323d; padding: 14px; border-radius: 8px;">
                    <div style="font-weight: 600; color: #c084fc; margin-bottom: 8px; font-size: 0.95rem;">1. 최종 무기 공격력</div>
                    ${formatItemListToTable(stats["무기 공격력"], stats["무기 공격력 %"] || stats["무기 공격력%"], { flat: "[무기 공격력 합산]", percent: "[무기 공격력 % 계수]" })}
                    <div style="text-align: right; font-weight: bold; color: #e2e8f0; margin-top: 10px; font-size: 0.95rem; border-top: 1px dashed #2e323d; padding-top: 8px;">
                        합계 = <span style="color: #38bdf8; font-size: 1.05rem;">${Math.floor(finalWeaponAtk).toLocaleString()}</span>
                    </div>
                </div>

                <!-- 2. 기본 공격력 -->
                <div style="background: #181920; border: 1px solid #2e323d; padding: 14px; border-radius: 8px;">
                    <div style="font-weight: 600; color: #c084fc; margin-bottom: 8px; font-size: 0.95rem;">2. 기본 공격력</div>
                    <div style="background: #0f1015; padding: 8px 12px; border-radius: 6px; border: 1px solid #222634; margin-bottom: 8px; font-size: 0.82rem; color: #cbd5e1;">
                        💡 <strong>공식:</strong> ( √(주스탯 ${Math.floor(finalStat).toLocaleString()} × 최종무공 ${Math.floor(finalWeaponAtk).toLocaleString()}) / 6 )*계수
                    </div>
                    ${formatItemListToTable(stats["기본 공격력"], vambracePercentList, { flat: "[기본 공격력 합산]", percent: "[기본 공격력 % 계수]" })}
                    <div style="text-align: right; font-weight: bold; color: #e2e8f0; margin-top: 10px; font-size: 0.95rem; border-top: 1px dashed #2e323d; padding-top: 8px;">
                        합계 = <span style="color: #38bdf8; font-size: 1.05rem;">${Math.floor(calculatedBaseAtk).toLocaleString()}</span>
                    </div>
                </div>

                <!-- 3. 최종 공격력 -->
                <div style="background: #181920; border: 1px solid #2e323d; padding: 14px; border-radius: 8px;">
                    <div style="font-weight: 600; color: #c084fc; margin-bottom: 8px; font-size: 0.95rem;">3. 최종 공격력</div>
                    ${formatItemListToTable(stats["공격력"], stats["공격력 %"], { flat: "[공격력 합산]", percent: "[공격력 % 계수]" })}
                    <div style="text-align: right; font-weight: bold; color: #facc15; margin-top: 10px; font-size: 1.1rem; border-top: 1px dashed #2e323d; padding-top: 8px;">
                        최종 공격력 = ${Math.floor(finalAtk).toLocaleString()}
                    </div>
                </div>

            </div>
        `;

        // 4. 선택한 스킬 상세 적용 내역 (currentIdx 기반 - 1열 방식)
        const selectedResult = allSkillResults[currentIdx] || allSkillResults[0];
        bodyContent += `<div style="margin-top: 20px;">`;
        bodyContent += `<div style="background: #181920; border: 1px solid #2e323d; padding: 16px; border-radius: 8px;">`;
        bodyContent += `<div style="font-size: 1.05rem; font-weight: bold; color: #facc15; margin-bottom: 12px;">▶ [선택 스킬] ${selectedResult.skillName} 상세 세팅 적용 내역</div>`;

        if (selectedResult.stats) {
            Object.keys(selectedResult.stats).forEach(cat => {
                if (cat.startsWith('_')) return;

                let items = selectedResult.stats[cat];
                
                bodyContent += `
                    <div style="margin-top: 14px;">
                        <div style="font-weight: bold; color: #c084fc; font-size: 0.85rem; border-bottom: 1px solid #2e323d; padding-bottom: 4px; margin-bottom: 4px;">
                            ■ ${cat}
                        </div>
                `;

                if (!items || items.length === 0) {
                    bodyContent += `<div style="font-size: 0.8rem; color: #64748b; padding: 4px 6px;">적용된 옵션 없음</div>`;
                } else {
                    items.sort((a, b) => {
                        const aSrc = String(a?.source || "");
                        const bSrc = String(b?.source || "");
                        return (aSrc.startsWith("각인:") ? 0 : 1) - (bSrc.startsWith("각인:") ? 0 : 1);
                    });

                    bodyContent += `<table style="width: 100%; border-collapse: collapse; font-size: 0.82rem;"><tbody>`;

                    items.forEach(item => {
                        const prefix = (typeof item.val === 'number' && item.val > 0) ? "+" : "";
                        const valStr = `${prefix}${item.val}${item.unit || ''}`;
                        const src = item.source || '옵션';

                        bodyContent += `
                            <tr>
                                <td style="padding: 5px 8px; color: #94a3b8; text-align: left; border-bottom: 1px solid #232733;">${src}</td>
                                <td style="padding: 5px 8px; color: #38bdf8; font-weight: 500; text-align: right; border-bottom: 1px solid #232733;">${valStr}</td>
                            </tr>
                        `;
                    });

                    bodyContent += `</tbody></table>`;
                }

                bodyContent += `</div>`;
            });
        }

        bodyContent += `</div></div>`;

        // 5. 결과 섹션 요소 생성 및 배치
        let resultSection = document.getElementById('sim-result-section');

        if (!resultSection) {
            resultSection = document.createElement('div');
            resultSection.id = 'sim-result-section';
            resultSection.style.cssText = `
                width: var(--main-width) !important;
                min-width: var(--main-width) !important;
                margin-left: auto !important;
                margin-right: auto !important;
                margin-top: 20px !important;
                margin-bottom: 50px !important;
                box-sizing: border-box !important;

                background: #0f1015;
                color: #e2e8f0;
                border-radius: 12px;
                border: 1px solid #2e323d;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
                padding: 24px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                clear: both;
            `;

            const arkPanel = document.getElementById('arkPassiveModal');
            if (arkPanel && arkPanel.parentNode) {
                arkPanel.parentNode.insertBefore(resultSection, arkPanel.nextSibling);
            } else {
                document.body.appendChild(resultSection);
            }
        }

        // HTML 결과 업데이트
        resultSection.innerHTML = bodyContent;
        injectPauseButton();
        // 💡 [핵심 2] 이벤트 위임 방식으로 변경 (클릭 요소 추적 완벽 보장)
        resultSection.onclick = function(e) {
            const row = e.target.closest('.sim-skill-row');
            if (!row) return;

            const clickIdx = Number(row.getAttribute('data-idx'));
            if (!isNaN(clickIdx)) {
                window.renderResultsHTML(window.lastSkillResults, clickIdx);
            }
        };

        // 6. 미니 모달 업데이트
        try {
            const allHeaders = Array.from(resultSection.querySelectorAll('h3'));
            const metricsHeader = allHeaders.find(h3 => h3.textContent.includes('캐릭터 공통 세팅 지표'));

            if (metricsHeader && metricsHeader.nextElementSibling) {
                const metricsGridHtml = metricsHeader.nextElementSibling.outerHTML;
                if (typeof updateMiniResultModal === 'function') {
                    updateMiniResultModal(metricsGridHtml);
                }
            }
        } catch (err) {
            console.warn('미니 모달 업데이트 중 오류 발생 (무시하고 연산 진행):', err);
        }
    };
    

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') window.closeSimModal();
    });

    function initArkPassivePanel() {
        if (document.getElementById('arkPassiveModal')) return;

        const panelHtml = `
            <div id="arkPassiveModal" class="custom-ark-panel">
                <div class="ark-panel-header">
                <h3 style="border:none; margin:0 0 10px 0; color: #c084fc; font-size: 1.1rem;">⚙️ 아크 패시브 진화 설정</h3>
                </div>
                <div id="arkEvolutionContainer"></div>
            </div>
        `;

        // 💡 main 등을 찾지 말고, React 루트 영역 밖인 document.body에 직접 붙입니다.
        document.body.insertAdjacentHTML('beforeend', panelHtml);

        const style = document.createElement('style');
        style.innerHTML = `
        .custom-ark-panel {
            /* 💡 원본 사이트의 CSS 변수 및 정렬 속성 그대로 적용 */
            width: var(--main-width) !important;
            min-width: var(--main-width) !important;
            margin-left: auto !important;
            margin-right: auto !important;
            margin-top: 20px !important;
            margin-bottom: 20px !important;
            box-sizing: border-box !important;

            /* 커스텀 디자인 유지 */
            background: #18181c;
            border: 1px solid #2a2a32;
            border-radius: 12px;
            padding: 20px;
            color: #e1e1e6;
            box-shadow: 0 4px 20px rgba(0,0,0,0.4);
            font-size: 12px;
            font-family: sans-serif;
            clear: both;
        }
        `;
        document.head.appendChild(style);

        renderArkPassiveUI();
    }

    function renderArkPassiveUI() {
        const container = document.getElementById('arkEvolutionContainer');
        if (!container) return;

        container.innerHTML = '';

        evolutionNodes.forEach((row, rowIndex) => {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'ark-row';
            const maxRowLimit = rowMaxLimits[rowIndex];

            row.forEach((node) => {
                const nodeDiv = document.createElement('div');
                nodeDiv.className = 'ark-node';

                const currentRowTotal = row.reduce((sum, n) => sum + n.current, 0);
                nodeDiv.title = `${node.name} (현재: ${node.current}/${node.max} | 라인 합계: ${currentRowTotal}/${maxRowLimit})`;

                const isGrayscale = node.current === 0 ? 'grayscale' : '';

                nodeDiv.innerHTML = `
                    <span style="font-size: 11px; margin-bottom: 4px; color: #c9d1d9;">${node.name}</span>
                    <img src="https://cdn-lostark.game.onstove.com/efui_iconatlas/ark_passive_evolution/ark_passive_evolution_${node.id}.png" class="ark-icon ${isGrayscale}" alt="${node.name}" width="40" height="40">
                    <div class="node-controls">
                        <button type="button" class="btn-node btn-dec">-</button>
                        <span style="min-width: 36px; text-align: center; color: #58a6ff;">${node.current}/${node.max}</span>
                        <button type="button" class="btn-node btn-inc">+</button>
                    </div>
                `;

                const changeValue = (delta) => {
                    let targetValue = node.current + delta;
                    if (targetValue < 0) targetValue = 0;
                    if (targetValue > node.max) targetValue = node.max;

                    const otherNodesSum = row.reduce((sum, n) => (n === node ? sum : sum + n.current), 0);
                    if (otherNodesSum + targetValue > maxRowLimit) {
                        targetValue = maxRowLimit - otherNodesSum;
                        if (targetValue < 0) targetValue = 0;
                        if (targetValue > node.max) targetValue = node.max;
                    }

                    if (node.current !== targetValue) {
                        node.current = targetValue;
                        renderArkPassiveUI();
                    }
                };

                const decBtn = nodeDiv.querySelector('.btn-dec');
                const incBtn = nodeDiv.querySelector('.btn-inc');
                const iconImg = nodeDiv.querySelector('.ark-icon');

                // [수정] saveArkPassive() 호출 후 triggerCalculation()을 명시적으로 트리거
                const handleNodeChange = (delta, e) => {
                    e.stopPropagation();
                    changeValue(delta);
                    if (typeof saveArkPassive === 'function') saveArkPassive();
                    if (typeof window.triggerCalculation === 'function') window.triggerCalculation();
                };

                decBtn.onclick = (e) => handleNodeChange(e.shiftKey ? -10 : -1, e);
                incBtn.onclick = (e) => handleNodeChange(e.shiftKey ? 10 : 1, e);
                iconImg.onclick = (e) => handleNodeChange(e.shiftKey ? 10 : 1, e);
                iconImg.oncontextmenu = (e) => {
                    e.preventDefault();
                    handleNodeChange(e.shiftKey ? -10 : -1, e);
                };

                rowDiv.appendChild(nodeDiv);
            });

            container.appendChild(rowDiv);
        });
    }


    // ==========================================
    // [추가] 실시간 계산 일시정지 토글 버튼 로직
    // ==========================================
    window.toggleCalcPause = function() {
        window.isCalcPaused = !window.isCalcPaused;
        
        const btn = document.getElementById('calc-pause-btn');
        if (!btn) return;

        if (window.isCalcPaused) {
            btn.innerText = '⏸️ 실시간 계산 : OFF';
            btn.style.backgroundColor = '#ef4444';
            btn.style.borderColor = '#f87171';
        } else {
            btn.innerText = '▶️ 실시간 계산 : ON';
            btn.style.backgroundColor = '#22c55e';
            btn.style.borderColor = '#4ade80';

            if (typeof window.triggerCalculation === 'function') {
                window.triggerCalculation();
            }
        }
    };

    window.setBaseline = function() {
        if (!lastCalculatedResults || lastCalculatedResults.length === 0) {
            showAlert('비교군으로 설정할 계산 결과가 없습니다.');
            return;
        }
        // 1) 메모리 상의 변수에 저장
        baselineResults = JSON.parse(JSON.stringify(lastCalculatedResults));
        
        // 2) 로컬 스토리지에 JSON 문자열 형태로 영구 저장
        try {
            localStorage.setItem('savedBaselineResults', JSON.stringify(baselineResults));
        } catch (e) {
            console.error('로컬스토리지 저장 실패:', e);
        }

        renderCompareTable();
        showAlert('현재 세팅 결과가 비교군으로 설정되었습니다!');
    };


    /**
     * 비교 테이블 렌더링 함수
     */
    function renderCompareTable() {
        const tbody = document.getElementById('compareTableBody');
        if (!tbody) return;

        if (!baselineResults || !lastCalculatedResults) {
            tbody.innerHTML = '<tr><td colspan="8" style="padding: 30px; color: #a1a1aa;">비교할 세팅 데이터가 없습니다.<br>플로팅 메뉴의 <b>[📌 비교군 저장]</b> 버튼을 먼저 눌러주세요.</td></tr>';
            return;
        }

        let html = '';

        lastCalculatedResults.forEach((curr, idx) => {
            const base = baselineResults.find(b => b.skillName === curr.skillName) || baselineResults[idx];
            if (!base) return;

            // 수치 추출
            const baseDmg = base.expDmg || 0;
            const currDmg = curr.expDmg || 0;
            const dmgDiffPercent = baseDmg > 0 ? ((currDmg - baseDmg) / baseDmg) * 100 : 0;

            const baseCd = base.finalCooldown || 0.001;
            const currCd = curr.finalCooldown || 0.001;
            const cdDiffPercent = baseCd > 0 ? ((currCd - baseCd) / baseCd) * 100 : 0;

            const baseDps = baseCd > 0 ? baseDmg / baseCd : 0;
            const currDps = currCd > 0 ? currDmg / currCd : 0;
            const dpsDiffPercent = baseDps > 0 ? ((currDps - baseDps) / baseDps) * 100 : 0;

            // 클래스 판별 (이득 = pos, 손해 = neg)
            // 데미지/DPS: +가 이득(pos), -가 손해(neg)
            const getDmgClass = (val) => val > 0 ? 'pos' : (val < 0 ? 'neg' : 'zero');
            // 쿨타임: -가 감소(이득: pos), +가 증가(손해: neg)
            const getCdClass = (val) => val < 0 ? 'pos' : (val > 0 ? 'neg' : 'zero');

            html += `
                <tr>
                    <td class="skill-name">${curr.skillName}</td>
                    <td>${Math.floor(baseDmg).toLocaleString()}</td>
                    <td>${baseCd.toFixed(2)}s</td>
                    <td>${Math.floor(currDmg).toLocaleString()}</td>
                    <td>${currCd.toFixed(2)}s</td>
                    <td class="${getDmgClass(dmgDiffPercent)}">${dmgDiffPercent > 0 ? '+' : ''}${dmgDiffPercent.toFixed(2)}%</td>
                    <td class="${getCdClass(cdDiffPercent)}">${cdDiffPercent > 0 ? '+' : ''}${cdDiffPercent.toFixed(2)}%</td>
                    <td class="${getDmgClass(dpsDiffPercent)}">${dpsDiffPercent > 0 ? '+' : ''}${dpsDiffPercent.toFixed(2)}%</td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    }

    // 전역 변수로 partyCritCount 관리 (기본값: 0)
    window.partyCritCount = 0;



    /**
     * 1. 좌측 하단 통합 플로팅 패널 생성

    */
    // 외부(parseArkCores 등)에서 코어 세팅 변경 시 호출할 수 있는 UI 갱신 함수
    window.updateCoreSetUI = function() {
        const badge = document.getElementById('core-set-badge');
        if (!badge) return;

        // window.isGiRyuSet 값을 확실히 참조
        const isGiRyu = !!window.isGiRyuSet;
        
        badge.innerText = isGiRyu ? '🌀 기류 조절' : '⚔️ 비연참';
        badge.style.backgroundColor = isGiRyu ? '#1e3a8a' : '#831843';
        badge.style.borderColor = isGiRyu ? '#3b82f6' : '#f43f5e';
        badge.style.color = isGiRyu ? '#bfdbfe' : '#fbcfe8';
    };


    window.updateEstherUI = function(isEsther) {
        const estherBox = document.getElementById('esther-bonding-box');
        const btn1 = document.getElementById('esther-bonding-btn-1');
        const btn2 = document.getElementById('esther-bonding-btn-2');
        
        if (!estherBox || !btn1 || !btn2) return;

        if (isEsther) {
            // 에스더 무기 장착 시
            btn1.disabled = false;
            btn2.disabled = false;
            estherBox.style.opacity = '1';
            estherBox.style.pointerEvents = 'auto';
        } else {
            // 일반 무기 장착 시 OFF 초기화 및 disabled
            window.estherBonding1 = false;
            window.estherBonding2 = false;

            // 버튼 텍스트 및 스타일 OFF로 강제 변경
            btn1.innerText = '💤 결속 1단계 : OFF';
            btn1.style.backgroundColor = '#0f172a';
            btn1.style.borderColor = 'rgba(255, 255, 255, 0.15)';
            btn1.style.color = '#94a3b8';

            btn2.innerText = '💤 결속 2단계 : OFF';
            btn2.style.backgroundColor = '#0f172a';
            btn2.style.borderColor = 'rgba(255, 255, 255, 0.15)';
            btn2.style.color = '#94a3b8';

            btn1.disabled = true;
            btn2.disabled = true;
            estherBox.style.opacity = '0.4';
            estherBox.style.pointerEvents = 'none';
        }
    };
    // 💡 스크립트 로드 즉시 (또는 DOM 준비 후) 플로팅 패널을 먼저 그려줍니다!
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (typeof injectPauseButton === 'function') injectPauseButton();
        });
    } else {
        if (typeof injectPauseButton === 'function') injectPauseButton();
    }
    
    function injectPauseButton() {
        if (document.getElementById('calc-floating-panel')) return;

        // 1) 전체 플로팅 컨테이너
        const panel = document.createElement('div');
        panel.id = 'calc-floating-panel';
        panel.style.cssText = `
            position: fixed;
            bottom: 25px;
            left: 25px;
            z-index: 999999;
            display: flex;
            flex-direction: column;
            gap: 8px;
            background: #161d24;
            border: 1px solid rgba(255, 255, 255, 0.08);
            padding: 12px;
            border-radius: 10px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            width: 175px;
        `;

        // 🌟 현재 코어 세팅 표시 뱃지
        const coreBadge = document.createElement('div');
        coreBadge.id = 'core-set-badge';
        coreBadge.style.cssText = `
            width: 100%;
            padding: 8px 0;
            font-size: 0.8rem;
            font-weight: 700;
            border-radius: 6px;
            border: 1px solid #f43f5e;
            background-color: #831843;
            color: #fbcfe8;
            box-sizing: border-box;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
            transition: all 0.2s ease;
        `;
        panel.appendChild(coreBadge);

        // 공통 버튼 생성 함수
        const createButton = (text, bgColor, borderColor, onClick, id = '') => {
            const btn = document.createElement('button');
            if (id) btn.id = id;
            btn.type = 'button';
            btn.innerText = text;
            btn.style.cssText = `
                width: 100%;
                padding: 8px 0;
                font-size: 0.8rem;
                font-weight: 600;
                border-radius: 6px;
                border: 1px solid ${borderColor};
                background-color: ${bgColor};
                color: #f1f5f9;
                cursor: pointer;
                transition: all 0.15s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 4px;
                box-sizing: border-box;
            `;
            btn.onmouseover = () => btn.style.filter = 'brightness(1.15)';
            btn.onmouseout = () => btn.style.filter = 'none';
            btn.onclick = onClick;
            return btn;
        };

        // 2) ⚖️ 비교 세팅 버튼
        const setBaseBtn = createButton('📌 비교군 저장', '#2563eb', '#3b82f6', () => {
            if (typeof window.setBaseline === 'function') window.setBaseline();
        });

        const toggleViewBtn = createButton('📊 비교표 보기', '#0284c7', '#38bdf8', () => {
            if (typeof window.openCompareModal === 'function') window.openCompareModal();
            else if (typeof openCompareModal === 'function') openCompareModal();
        });

        // 3) 🎯 치적 시너지 입력 박스
        const synergyBox = document.createElement('div');
        synergyBox.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 6px;
            padding: 6px 0;
            margin: 2px 0;
            border-top: 1px solid rgba(255, 255, 255, 0.06);
            border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        `;

        const label = document.createElement('span');
        label.innerText = '파티 치적 시너지(본인 제외)';
        label.style.cssText = `
            color: #a5b4fc;
            font-size: 0.75rem;
            font-weight: 600;
            text-align: left;
            padding-left: 2px;
        `;

        const select = document.createElement('select');
        select.id = 'party-crit-select';
        select.style.cssText = `
            width: 100%;
            background-color: #0f172a;
            color: #ffffff;
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 6px;
            padding: 7px 10px;
            font-size: 0.8rem;
            font-weight: bold;
            cursor: pointer;
            outline: none;
            box-sizing: border-box;
            transition: border-color 0.15s ease;
        `;

        select.onmouseover = () => select.style.borderColor = '#38bdf8';
        select.onmouseout = () => select.style.borderColor = 'rgba(255, 255, 255, 0.15)';

        [0, 1, 2].forEach(val => {
            const opt = document.createElement('option');
            opt.value = val;
            opt.innerText = `${val}명 (${val * 10}%)`;
            if (val === window.partyCritCount) opt.selected = true;
            select.appendChild(opt);
        });

        select.onchange = function(e) {
            window.partyCritCount = Number(e.target.value);
            if (typeof window.triggerCalculation === 'function') {
                window.triggerCalculation();
            }
        };

        synergyBox.appendChild(label);
        synergyBox.appendChild(select);

        // 4) 🗡️ 에스더 결속 효과 1차/2차 ON/OFF 토글 영역
        const estherBox = document.createElement('div');
        estherBox.id = 'esther-bonding-box';
        estherBox.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 6px;
            padding-bottom: 6px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        `;

        const estherLabel = document.createElement('span');
        estherLabel.innerText = '에스더 결속 효과';
        estherLabel.style.cssText = `
            color: #fcd34d;
            font-size: 0.75rem;
            font-weight: 600;
            text-align: left;
            padding-left: 2px;
        `;
        estherBox.appendChild(estherLabel);

        window.estherBonding1 = Boolean(window.estherBonding1);
        window.estherBonding2 = Boolean(window.estherBonding2);

        const updateBondingBtnStyle = (btn, isOn, label) => {
            if (isOn) {
                btn.innerText = `⚡ ${label} : ON`;
                btn.style.backgroundColor = '#78350f';
                btn.style.borderColor = '#f59e0b';
                btn.style.color = '#fef3c7';
            } else {
                btn.innerText = `💤 ${label} : OFF`;
                btn.style.backgroundColor = '#0f172a';
                btn.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                btn.style.color = '#94a3b8';
            }
        };

        const createBondingToggleBtn = (id, globalVarName, label) => {
            const btn = document.createElement('button');
            btn.id = id;
            btn.type = 'button';
            btn.style.cssText = `
                width: 100%;
                padding: 6px 0;
                font-size: 0.75rem;
                font-weight: bold;
                border-radius: 6px;
                border: 1px solid;
                cursor: pointer;
                outline: none;
                box-sizing: border-box;
                transition: all 0.15s ease;
                display: flex;
                align-items: center;
                justify-content: center;
            `;

            updateBondingBtnStyle(btn, window[globalVarName], label);

            btn.onclick = function() {
                window[globalVarName] = !window[globalVarName];
                updateBondingBtnStyle(btn, window[globalVarName], label);
                if (typeof window.triggerCalculation === 'function') {
                    window.triggerCalculation();
                }
            };

            return btn;
        };

        const btn1 = createBondingToggleBtn('esther-bonding-btn-1', 'estherBonding1', '결속 1단계');
        const btn2 = createBondingToggleBtn('esther-bonding-btn-2', 'estherBonding2', '결속 2단계');

        estherBox.appendChild(btn1);
        estherBox.appendChild(btn2);

        // -------------------------------------------------------------------------
        // ★ 5) 스마트 토글 버튼 UI 갱신 함수
        // -------------------------------------------------------------------------
        const updatePauseBtnUI = (btn) => {
            if (!window.hasCalculatedOnce) {
                // 최초 상태: 계산 시작 버튼 (초록색)
                btn.innerText = '🚀 계산 시작';
                btn.style.backgroundColor = '#059669';
                btn.style.borderColor = '#10b981';
            } else if (window.isCalcPaused) {
                // 이후 상태 (OFF)
                btn.innerText = '⏸️ 실시간 계산 : OFF';
                btn.style.backgroundColor = '#991b1b';
                btn.style.borderColor = '#dc2626';
            } else {
                // 이후 상태 (ON)
                btn.innerText = '▶️ 실시간 계산 : ON';
                btn.style.backgroundColor = '#166534';
                btn.style.borderColor = '#22c55e';
            }
        };

        const handlePauseBtnClick = () => {
            const btn = document.getElementById('calc-pause-btn');

            if (!window.hasCalculatedOnce) {
                // 최초 클릭 시: 실시간 계산 ON으로 전환 및 첫 계산 실행
                window.hasCalculatedOnce = true;
                window.isCalcPaused = false;
                
                if (typeof window.triggerCalculation === 'function') {
                    window.triggerCalculation();
                } else if (typeof window.handleCalculate === 'function') {
                    window.handleCalculate();
                }
            } else {
                // 두 번째 클릭부터: 기존 ON / OFF 토글 동작
                window.isCalcPaused = !window.isCalcPaused;
                if (!window.isCalcPaused && typeof window.triggerCalculation === 'function') {
                    window.triggerCalculation();
                }
            }

            if (btn) updatePauseBtnUI(btn);
        };

        // 토글 버튼 생성
        const pauseBtn = createButton('', '', '', handlePauseBtnClick, 'calc-pause-btn');
        updatePauseBtnUI(pauseBtn);

        // 6) 📁 아크패시브 세팅 관리 버튼
        const presetBtn = createButton(
            '📁 아크패시브 세팅 관리', 
            '#1d4ed8', 
            '#60a5fa', 
            () => {
                if (typeof window.openPresetModal === 'function') {
                    window.openPresetModal();
                } else if (typeof openPresetModal === 'function') {
                    openPresetModal();
                }
            }, 
            'calc-preset-btn'
        );

        // 패널 조립
        panel.appendChild(setBaseBtn);
        panel.appendChild(toggleViewBtn);
        panel.appendChild(synergyBox);
        panel.appendChild(estherBox);
        panel.appendChild(pauseBtn);
        panel.appendChild(presetBtn);

        document.body.appendChild(panel);

        if (typeof window.updateCoreSetUI === 'function') {
            window.updateCoreSetUI();
        }
    }

    // 💡 스크립트 맨 하단에서 즉시 버튼 패널 생성
    injectPauseButton();

    /**
    비교표 모달창 생성 및 출력 함수
    */
    /**
     * 1. 세팅 비교 모달 생성 및 출력 (가로 70vw + 세로 자동 스크롤)
     */
    function openCompareModal() {
        let modal = document.getElementById('calc-compare-modal');

        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'calc-compare-modal';
            modal.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 1000000;
                background: #0f0e15;
                border: 1px solid #3b2d54;
                border-radius: 12px;
                padding: 20px;
                /* 1) 가로 크기: 화면 기준 70% (모바일/작은 화면을 위해 min-width 설정) */
                width: 70vw;
                min-width: 720px;
                
                /* 2) 세로 크기: 내용에 따라 자동 조정, 화면 85% 넘어가면 자동 스크롤 생성 */
                height: auto;
                max-height: 85vh;
                overflow-y: auto;
                
                box-shadow: 0 16px 40px rgba(0, 0, 0, 0.85);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                color: #ffffff;
            `;

            modal.innerHTML = `
                <!-- 상단 타이틀 바 -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <div style="font-size: 1.15rem; font-weight: bold; color: #ffffff; display: flex; align-items: center; gap: 6px;">
                        <span style="color: #c084fc; font-size: 0.9rem;">▼</span> 세팅 비교 결과
                    </div>
                    <button id="close-compare-modal" style="background: none; border: none; color: #a1a1aa; font-size: 1.2rem; cursor: pointer; transition: color 0.15s;" onmouseover="this.style.color='#fff'" onmouseout="this.style.color='#a1a1aa'">✕</button>
                </div>

                <!-- 커스텀 스타일 정의 -->
                <style>
                    .compare-table-wrapper {
                        border: 1px solid #282237;
                        border-radius: 8px;
                        overflow: hidden;
                        background-color: #13111c;
                    }
                    .tm-compare-table {
                        width: 100%;
                        border-collapse: collapse;
                        text-align: center;
                        font-size: 0.88rem; /* 화면이 넓어졌으므로 글자 크기도 살짝 키워 가독성을 높였습니다 */
                    }
                    .tm-compare-table th {
                        background: #1a1625;
                        color: #d8b4fe;
                        padding: 10px 6px;
                        border: 1px solid #282237;
                        font-weight: 600;
                    }
                    .tm-compare-table th.header-group {
                        color: #c084fc;
                        font-size: 0.92rem;
                        background: #1f1a2e;
                    }
                    .tm-compare-table th.header-skill {
                        color: #e879f9;
                        font-size: 0.92rem;
                        vertical-align: middle;
                    }
                    .tm-compare-table td {
                        padding: 11px 8px;
                        border: 1px solid #231e30;
                        color: #e4e4e7;
                    }
                    .tm-compare-table tr:nth-child(even) {
                        background-color: #110f19;
                    }
                    .tm-compare-table tr:hover {
                        background-color: #1e192c;
                    }
                    .tm-compare-table .skill-name {
                        font-weight: bold;
                        color: #ffffff;
                        text-align: center;
                    }
                    .tm-compare-table .pos { color: #38bdf8 !important; font-weight: bold; }
                    .tm-compare-table .neg { color: #f87171 !important; font-weight: bold; }
                    .tm-compare-table .zero { color: #71717a; }
                </style>

                <!-- 2단 구조 비교 테이블 -->
                <div class="compare-table-wrapper">
                    <table class="tm-compare-table">
                        <thead>
                            <tr>
                                <th rowspan="2" class="header-skill" style="width: 16%;">스킬명</th>
                                <th colspan="2" class="header-group" style="width: 28%;">비교군</th>
                                <th colspan="2" class="header-group" style="width: 28%;">지금 세팅</th>
                                <th colspan="3" class="header-group" style="width: 28%;">변화율</th>
                            </tr>
                            <tr>
                                <th>기대값</th>
                                <th>쿨타임</th>
                                <th>기대값</th>
                                <th>쿨타임</th>
                                <th>데미지증감</th>
                                <th>쿨타임증감</th>
                                <th>DPS증감</th>
                            </tr>
                        </thead>
                        <tbody id="compareTableBody">
                            <tr><td colspan="8" style="padding: 30px; color: #71717a;">데이터를 연산하는 중입니다...</td></tr>
                        </tbody>
                    </table>
                </div>
            `;

            document.body.appendChild(modal);

            document.getElementById('close-compare-modal').onclick = () => modal.style.display = 'none';
        }

        modal.style.display = 'block';
        renderCompareTable();
    }

    /**
     * 2. 아크 패시브 세팅 관리 모달 팝업 생성 및 오픈
     */
    function openPresetModal() {
        let modal = document.getElementById('preset-modal');
        if (modal) {
            modal.style.display = 'flex';
            window.renderPresetList();
            return;
        }

        modal = document.createElement('div');
        modal.id = 'preset-modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0, 0, 0, 0.7); z-index: 1000000;
            display: flex; align-items: center; justify-content: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;

        modal.innerHTML = `
            <div style="background: #1e2029; border: 1px solid #333745; width: 380px; padding: 20px; border-radius: 12px; color: #fff; box-shadow: 0 10px 25px rgba(0,0,0,0.6);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 14px;">
                    <h3 style="margin:0; font-size: 1.05rem; color: #60a5fa; display:flex; align-items:center; gap:6px;">
                        ⚡ 아크 패시브 세팅 관리
                    </h3>
                    <button id="modal-close-btn" style="background:none; border:none; color:#aaa; cursor:pointer; font-size:1.2rem; line-height:1;">✕</button>
                </div>
                
                <div style="display:flex; gap:6px; margin-bottom: 16px;">
                    <input id="preset-name-input" type="text" placeholder="세팅 이름 (예: 깨달음 딜러)" style="flex:1; padding: 7px 10px; background:#0f1015; border:1px solid #333745; color:#fff; border-radius:6px; font-size:0.85rem; outline:none;" />
                    <button id="preset-save-btn" style="padding: 7px 14px; background:#22c55e; border:none; color:#fff; font-weight:bold; font-size:0.8rem; border-radius:6px; cursor:pointer;">저장</button>
                </div>

                <div id="preset-list-container" style="max-height: 220px; overflow-y: auto; display:flex; flex-direction:column; gap:6px; padding-right:2px;">
                    <!-- 세팅 목록이 동적으로 들어가는 위치 -->
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // X 닫기 버튼 이벤트
        document.getElementById('modal-close-btn').onclick = () => {
            modal.style.display = 'none';
        };

        // 저장 버튼 클릭 이벤트
        document.getElementById('preset-save-btn').onclick = () => {
            const input = document.getElementById('preset-name-input');
            const val = input.value.trim();
            if (typeof window.savePreset === 'function') {
                window.savePreset(val);
            }
            input.value = '';
            window.renderPresetList();
        };

        window.renderPresetList();
    }

    /**
     * 3. 프리셋 목록 리플레이서 (이벤트 직접 바인딩으로 안전성 확보)
     */
    window.renderPresetList = function() {
        const container = document.getElementById('preset-list-container');
        if (!container) return;

        const presets = getPresetList();
        const keys = Object.keys(presets);

        container.innerHTML = ''; // 초기화

        if (keys.length === 0) {
            container.innerHTML = `<div style="text-align:center; color:#6b7280; font-size:0.8rem; padding:16px;">저장된 아크 패시브 세팅이 없습니다.</div>`;
            return;
        }

        keys.forEach(name => {
            const itemEl = document.createElement('div');
            itemEl.style.cssText = 'display:flex; justify-content:space-between; align-items:center; background:#111217; padding: 8px 12px; border-radius:6px; border:1px solid #222530;';

            const infoBox = document.createElement('div');
            infoBox.innerHTML = `
                <div style="font-size:0.85rem; font-weight:bold; color:#f3f4f6;">${name}</div>
                <div style="font-size:0.7rem; color:#6b7280;">${presets[name].savedAt || ''}</div>
            `;

            const btnGroup = document.createElement('div');
            btnGroup.style.cssText = 'display:flex; gap:6px;';

            // 불러오기 버튼
            const loadBtn = document.createElement('button');
            loadBtn.innerText = '불러오기';
            loadBtn.style.cssText = 'padding:4px 10px; background:#3b82f6; border:none; color:#fff; font-size:0.75rem; font-weight:bold; border-radius:4px; cursor:pointer;';
            loadBtn.onclick = function() {
                if (typeof window.applyPreset === 'function') {
                    window.applyPreset(name);
                }
                const modal = document.getElementById('preset-modal');
                if (modal) modal.style.display = 'none';
            };

            // 삭제 버튼
            const delBtn = document.createElement('button');
            delBtn.innerText = '삭제';
            delBtn.style.cssText = 'padding:4px 8px; background:#ef4444; border:none; color:#fff; font-size:0.75rem; border-radius:4px; cursor:pointer;';
            delBtn.onclick = function() {
                if (typeof window.deletePreset === 'function') {
                    window.deletePreset(name);
                }
                window.renderPresetList();
            };

            btnGroup.appendChild(loadBtn);
            btnGroup.appendChild(delBtn);

            itemEl.appendChild(infoBox);
            itemEl.appendChild(btnGroup);

            container.appendChild(itemEl);
        });
    };

    // =============================================================================
    // 7. 메인 실행 핸들러 및 트리거 버튼 생성
    // =============================================================================
    function handleCalculate() {
        try {
            const rawData = extractFullSimulatorData(document);

            // 🔍 [1단계] DOM 파싱(불러오기) 확인

            const mappedInputs = mapExtractedDataToInputs(rawData);
            const finalInputs = transformToInputs(mappedInputs);
            const results = calculateSkillStats(finalInputs);

            lastCalculatedResults = results;


            renderResultsHTML(results);
        } catch (err) {
            console.error("연산 처리 중 오류 발생:", err);
            showAlert("연산 도중 오류가 발생했습니다. 콘솔 창(F12)을 확인해주세요.");
            toggleCalcPause()
        }
    }

    const PRESET_STORAGE_KEY = 'ARK_CALC_PASSIVE_PRESETS';

    /**
     * 1. 현재 화면의 아크 패시브 설정만 수집
     */
    function getPassiveState() {
        const container = document.getElementById('arkEvolutionContainer');
        
        if (!container) {
            console.error("아크 패시브 영역(#arkEvolutionContainer)을 찾을 수 없습니다.");
            return { timestamp: new Date().toLocaleString(), nodes: {} };
        }

        const nodesData = {};
        const nodes = container.querySelectorAll('.ark-node');

        nodes.forEach(node => {
            // 노드 이름 추출 (span 태그의 텍스트)
            const nameSpan = node.querySelector('span');
            if (!nameSpan) return;
            
            const nodeName = nameSpan.textContent.trim();

            // 수치 추출 ("15/30" 형식의 span 태그)
            const pointSpan = node.querySelector('.node-controls span');
            if (pointSpan) {
                const [current, max] = pointSpan.textContent.split('/').map(v => parseInt(v.trim(), 10));
                nodesData[nodeName] = {
                    current: isNaN(current) ? 0 : current,
                    max: isNaN(max) ? 0 : max
                };
            }
        });

        return {
            timestamp: new Date().toLocaleString(),
            nodes: nodesData
        };
    }

    /**
     * 2. 아크 패시브 프리셋 저장
     */
    window.savePreset = function(presetName) {
        if (!presetName) return showAlert('프리셋 이름을 입력해 주세요!');

        const presets = getPresetList();
        const currentState = getPassiveState();

        presets[presetName] = {
            name: presetName,
            data: currentState, // nodes 데이터를 포함한 전체 객체 저장
            savedAt: new Date().toLocaleDateString()
        };

        localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presets));
        showAlert(`'${presetName}' 아크 패시브 세팅이 저장되었습니다!`);
    };

    /**
     * 3. 아크 패시브 프리셋 불러오기 (UI 복원)
     */
    /**
     * 3. 아크 패시브 프리셋 불러오기 (전체 초기화 후 티어 순서대로 복원)
     */
    window.applyPreset = function(presetName) {
        const presets = getPresetList();
        const target = presets[presetName];
        if (!target) return showAlert('존재하지 않는 프리셋입니다.');

        const nodesData = target.data?.nodes || target.data || {};
        const container = document.getElementById('arkEvolutionContainer');

        if (!container) {
            return showAlert(`아크 패시브 영역(#arkEvolutionContainer)을 화면에서 찾을 수 없습니다.`);
        }

        // [STEP 1] 아크 패시브 전체 초기화 수행
        // 1-1. 화면 내 '초기화' 버튼이 있는지 찾고 클릭
        const allButtons = Array.from(container.querySelectorAll('button'));
        const resetButton = allButtons.find(btn => 
            btn.textContent.includes('초기화') || 
            btn.classList.contains('btn-reset') ||
            btn.getAttribute('title')?.includes('초기화')
        );

        if (resetButton) {
            resetButton.click();
        } else {
            // 1-2. 초기화 버튼이 없을 경우: 아래->위 순서로 minus 버튼을 연속 클릭하여 0으로 리셋
            const nodesArray = Array.from(container.querySelectorAll('.ark-node')).reverse();
            nodesArray.forEach(node => {
                const minusBtn = node.querySelector('.btn-minus, [data-action="minus"], .node-controls button:first-child');
                if (minusBtn) {
                    for (let i = 0; i < 30; i++) {
                        minusBtn.click();
                    }
                }
            });
        }

        // [STEP 2] 1티어 -> 2티어 -> 3티어 순서(DOM 순서)대로 포인트 투자
        const nodes = container.querySelectorAll('.ark-node');

        nodes.forEach(node => {
            const nameSpan = node.querySelector('span');
            if (!nameSpan) return;

            const nodeName = nameSpan.textContent.trim();
            const targetData = nodesData[nodeName];

            if (targetData && targetData.current > 0) {
                const plusBtn = node.querySelector('.btn-plus, [data-action="plus"], .node-controls button:last-child');
                if (plusBtn) {
                    // 목표 포인트 수치만큼 + 버튼 클릭
                    for (let i = 0; i < targetData.current; i++) {
                        plusBtn.click();
                    }
                }
            }
        });

        // [STEP 3] 최종 계산 재트리거
        setTimeout(() => {
            if (typeof window.triggerCalculation === 'function') {
                window.triggerCalculation();
            }
        }, 100);

        showAlert(`'${presetName}' 아크 패시브 세팅을 불러왔습니다!`);
    };

    // React Native 값 세터 (기존 코드 유지)
    function setNativeValue(element, value) {
        const valueSetter = Object.getOwnPropertyDescriptor(element, 'value');
        const prototype = Object.getPrototypeOf(element);
        const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value');

        if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
            prototypeValueSetter.set.call(element, value);
        } else if (valueSetter && valueSetter.set) {
            valueSetter.set.call(element, value);
        } else {
            element.value = value;
        }
    }

    /**
     * 4. 유틸리티 함수들 (목록 조회/삭제)
     */
    function getPresetList() {
        try { return JSON.parse(localStorage.getItem(PRESET_STORAGE_KEY)) || {}; } 
        catch (e) { return {}; }
    }

    window.deletePreset = function(presetName) {
        const presets = getPresetList();
        delete presets[presetName];
        localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presets));
    };

        // 기존 createTriggerButton()을 대체하는 실시간 계산 및 초기화 함수
    function initRealtimeCalculator() {
        // 1. 하단 아크패시브 패널 생성
        initArkPassivePanel();

        let calcTimer = null;

        // 실시간 계산 실행 함수 (디바운스 & requestAnimationFrame 적용)
        window.triggerCalculation = function() {
            if (window.isCalcPaused) return;
            clearTimeout(calcTimer);
            calcTimer = setTimeout(() => {
                if (typeof handleCalculate === 'function') {
                    requestAnimationFrame(() => {
                        handleCalculate();
                    });
                }
            }, 500); // 반응성을 위해 100ms -> 80ms로 살짝 단축
        };

        // 2. [핵심 수정 1] 특정 모달이 아닌 document 전역(body)에 이벤트 바인딩
        const eventTypes = ['input', 'change', 'click', 'keyup'];
        
        eventTypes.forEach(eventType => {
            document.body.addEventListener(eventType, (e) => {
                const target = e.target;
                // input, select, textarea, checkbox, radio, button 및 클릭 가능한 요소 감지
                if (
                    target.matches('input, select, textarea, [type="checkbox"], [type="radio"], button, .btn-node, .ark-icon') ||
                    target.closest('.sim-skill-row')
                ) {
                    window.triggerCalculation();
                }
            }, true); // 캡처링 모드(true)로 event.stopPropagation() 이벤트 차단 방지
        });

        // 3. [핵심 수정 2] React 등 프레임워크에 의해 DOM 상태/클래스/속성이 변경될 때도 감지 (MutationObserver)
        const observer = new MutationObserver((mutations) => {
            let shouldRecalc = false;
            for (const mutation of mutations) {
                // 결과창 내부 변화는 무시 (무한 루프 방지)
                if (mutation.target.closest && mutation.target.closest('#sim-result-section')) {
                    continue;
                }
                shouldRecalc = true;
                break;
            }
            if (shouldRecalc) {
                window.triggerCalculation();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['value', 'checked', 'selected', 'class'] // 스탯/노드 변경 관련 속성 감시
        });

        // 4. 최초 1회 즉시 실행
        window.triggerCalculation();
        }
        // createTriggerButton 호출부 또는 load 이벤트 바인딩 부분 수정
        window.addEventListener('load', () => {
            // React 하이드레이션 처리가 끝날 시간을 벌어줌 (100~300ms)
            setTimeout(() => {
                initRealtimeCalculator();
            }, 300);

        }
    )


    /**
     * 메인 결과창이 화면에 안 보일 때 [캐릭터 공통 세팅 지표]만 플로팅으로 보여주는 함수
     */
    function updateMiniResultModal(commonMetricsHtml) {
        let miniModal = document.getElementById('sim-mini-modal');

        // 1. 미니 모달 프레임이 없으면 새로 생성
        if (!miniModal) {
            miniModal = document.createElement('div');
            miniModal.id = 'sim-mini-modal';
            miniModal.style.cssText = `
                position: fixed;
                bottom: 24px;
                right: 24px;
                z-index: 99999;
                background: rgba(15, 16, 21, 0.92);
                backdrop-filter: blur(10px);
                border: 1px solid #3b4252;
                border-radius: 12px;
                padding: 14px 18px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
                color: #e2e8f0;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                transition: opacity 0.25s ease, transform 0.25s ease;
                opacity: 0;
                transform: translateY(20px);
                pointer-events: none;
                max-width: 90vw;
            `;
            document.body.appendChild(miniModal);

            setupResultObserver();
        }

        // 2. 미니 모달 내부 HTML 업데이트
        miniModal.innerHTML = `
            <div style="font-size: 11px; font-weight: bold; color: #c084fc; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                <span>⚡ 캐릭터 공통 세팅 지표 (실시간)</span>
            </div>
            <div class="mini-metrics-wrapper">
                ${commonMetricsHtml}
            </div>
            <style>
                /* 미니 모달 내부에서는 Grid를 Flex로 변경하여 조그맣고 가로로 콤팩트하게 표시 */
                #sim-mini-modal .mini-metrics-wrapper > div {
                    display: flex !important;
                    flex-wrap: wrap !important;
                    gap: 8px !important;
                    margin-bottom: 0 !important;
                }
                #sim-mini-modal .mini-metrics-wrapper > div > div {
                    padding: 6px 10px !important;
                    background: #181920 !important;
                    border: 1px solid #2e323d !important;
                    border-radius: 6px !important;
                    min-width: fit-content !important;
                }
                #sim-mini-modal .mini-metrics-wrapper div {
                    font-size: 0.75rem !important;
                }
            </style>
        `;
    }
    /**
     * 하단 메인 결과창이 화면 보기에 들어왔는지/나갔는지 감지하는 Observer
     */
    function setupResultObserver() {
        const resultSection = document.getElementById('sim-result-section');
        const miniModal = document.getElementById('sim-mini-modal');
        if (!resultSection || !miniModal) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                // 메인 결과 섹션이 화면에서 벗어났을 때만 미니 모달 표시
                if (!entry.isIntersecting) {
                    miniModal.style.opacity = '1';
                    miniModal.style.transform = 'translateY(0)';
                    miniModal.style.pointerEvents = 'auto';
                } else {
                    // 메인 결과 섹션이 화면에 보이면 미니 모달 숨김
                    miniModal.style.opacity = '0';
                    miniModal.style.transform = 'translateY(20px)';
                    miniModal.style.pointerEvents = 'none';
                }
            });
        }, { threshold: 0.1 }); // 메인 결과창이 10% 이상 보이면 작동

        observer.observe(resultSection);
    }

    /**
     * 커스텀 알림창 UI 자동 생성 및 표시 함수
     */
    function showAlert(msg, icon = '🔔') {
        let overlay = document.getElementById('customAlertOverlay');

        // 1. 알림창 DOM 요소가 없으면 동적으로 자동 생성
        if (!overlay) {
            // Style 태그 주입
            const style = document.createElement('style');
            style.innerText = `
                .custom-alert-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100vw;
                    height: 100vh;
                    background-color: rgba(0, 0, 0, 0.75);
                    backdrop-filter: blur(5px);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 1000000;
                    opacity: 0;
                    visibility: hidden;
                    transition: all 0.2s ease-in-out;
                }
                .custom-alert-overlay.active {
                    opacity: 1;
                    visibility: visible;
                }
                .custom-alert-box {
                    background-color: #121318;
                    color: #ffffff;
                    width: 320px;
                    padding: 24px 20px 20px 20px;
                    border-radius: 16px;
                    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.6);
                    text-align: center;
                    border: 1px solid #2e323d;
                    transform: scale(0.9);
                    transition: transform 0.2s ease-in-out;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }
                .custom-alert-overlay.active .custom-alert-box {
                    transform: scale(1);
                }
                .custom-alert-icon {
                    font-size: 32px;
                    margin-bottom: 12px;
                    line-height: 1;
                }
                .custom-alert-message {
                    font-size: 14px;
                    font-weight: 500;
                    color: #e2e8f0;
                    margin-bottom: 20px;
                    word-break: keep-all;
                    line-height: 1.5;
                }
                .custom-alert-btn {
                    width: 100%;
                    padding: 10px 0;
                    background-color: #8b5cf6;
                    color: #ffffff;
                    border: none;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: background-color 0.15s ease;
                    box-shadow: 0 2px 8px rgba(139, 92, 246, 0.4);
                }
                .custom-alert-btn:hover {
                    background-color: #7c3aed;
                }
            `;
            document.head.appendChild(style);

            // Overlay & Box HTML 구성
            overlay = document.createElement('div');
            overlay.id = 'customAlertOverlay';
            overlay.className = 'custom-alert-overlay';
            overlay.innerHTML = `
                <div class="custom-alert-box">
                    <div class="custom-alert-icon" id="customAlertIcon">${icon}</div>
                    <div class="custom-alert-message" id="customAlertMsg"></div>
                    <button class="custom-alert-btn" id="customAlertBtn">확인</button>
                </div>
            `;
            document.body.appendChild(overlay);

            // 확인 버튼 클릭 시 닫기
            document.getElementById('customAlertBtn').onclick = closeAlert;
            
            // 배경 클릭 시 닫기
            overlay.onclick = (e) => {
                if (e.target === overlay) closeAlert();
            };
        }

        // 2. 메시지 및 아이콘 설정 후 팝업 출력
        document.getElementById('customAlertIcon').innerText = icon;
        document.getElementById('customAlertMsg').innerText = msg;
        overlay.classList.add('active');
    }

    /**
     * 커스텀 알림창 닫기
     */
    function closeAlert() {
        const overlay = document.getElementById('customAlertOverlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
    }
    })();