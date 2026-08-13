function calculateSkillStats(inputs) {

        const partyCritBonus = (window.partyCritCount || 0) * STAT_CONSTANTS.PARTY_CRIT_SYNERGY_PER_PLAYER;
        let commonStats = {
            "주스탯":[], "주스탯 %":[],"치명": [], "신속": [],"특화":[],
            "무기 공격력": [], "무기 공격력 %": [], "기본 공격력": [], "기본 공격력 %": [], "공격력": [], "공격력 %": [],
            "진화형 피해": [], "추가 피해": [],
            "치명타 적중률": [], "치명타 피해": [], "치명타 시 적에게 주는 피해": [],
            "적에게 주는 피해": [], "방어력 무시":[],
            "이동 속도": [], "공격 속도": [], "쿨타임 감소": [],
            "마나 스킬 쿨타임 감소": [], "쿨타임 증가": [], "고정 쿨타임 감소": [],"고정 쿨타임 증가":[]
        };

        // 🌟 1. ADD_STAT_BASE가 배열이면 그대로 쓰고, 객체면 배열로 변환해서 안전하게 확보
        const statList = Array.isArray(window.ADD_STAT_BASE)
            ? window.ADD_STAT_BASE
            : Object.values(window.ADD_STAT_BASE || {});

        // 🌟 2. 공통 스탯 등록 (태그 조건이 없는 순수 공통 스탯만 commonStats에 수집)
        statList.forEach(item => {
            if (!item) return;

            // A. 새로 변경된 구조: [{ name, effects: [{ category, val, unit, targetTags, requireTags, excludeTags }] }]
            if (Array.isArray(item.effects)) {
                item.effects.forEach(eff => {
                    const hasTagCondition = (eff.targetTags && eff.targetTags.length > 0) || 
                                           (eff.requireTags && eff.requireTags.length > 0) || 
                                           (eff.excludeTags && eff.excludeTags.length > 0) ||
                                           (eff.excludeSkillTags && eff.excludeSkillTags.length > 0);
                    
                    // 태그 조건이 없는 경우에만 공통 스탯에 사전 추가
                    if (!hasTagCondition) {
                        addStat(commonStats, eff.category, item.name, eff.val, eff.unit);
                    }
                });
            }
            // B. 기존 객체 구조 예외 처리: { category, name, value, unit }
            else if (item.category) {
                const hasTagCondition = (item.targetTags && item.targetTags.length > 0) || 
                                       (item.requireTags && item.requireTags.length > 0) || 
                                       (item.excludeTags && item.excludeTags.length > 0) ||
                                       (item.excludeSkillTags && item.excludeSkillTags.length > 0);
                
                if (!hasTagCondition) {
                    addStat(commonStats, item.category, item.name, item.value, item.unit);
                }
            }
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

        // 무기 공격력 합산
        const weaponLabel = inputs.isEsther ? `에스더 무기 (엘라 ${inputs.estherElla ?? 0})` : "무기";
        addStat(commonStats, "무기 공격력", weaponLabel, inputs.weaponAtk, "");

        // 에스더 결속 데이터 정의
        const estherBonding1Data = [145983, 153282, 257503, 453359];
        const estherBonding2Data = [3946, 4305, 7250, 16450];

        if (inputs.isEsther) {
            const ellaLvl = inputs.estherElla ?? 0;

            if (window.estherBonding1) {
                const bonding1Stat = estherBonding1Data[ellaLvl] || 0;
                if (bonding1Stat > 0) {
                    addStat(commonStats, "주스탯", `에스더 결속 1단계 (엘라 ${ellaLvl})`, bonding1Stat, "");
                }
            }

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
            if (weaponAtk > 0) addStat(commonStats, "무기 공격력", "완갑", weaponAtk, "");

            const mainStat = inputs.vambraceData.주스탯 || 0;
            if (mainStat > 0) addStat(commonStats, "주스탯", "완갑", mainStat, "");

            const baseAtk = inputs.vambraceData.기본공격력 || 0;
            if (baseAtk > 0) addStat(commonStats, "기본 공격력", "완갑", baseAtk, "");
        }

        // 완갑 등급별 기본 공격력 %
        const vambraceGradeAtkMap = { "영웅": 0, "전설": 1, "유물": 2, "고대": 3 };
        const vambraceGrade = inputs.vambraceGrade || "영웅";
        const vambraceNormalAtkPercent = vambraceGradeAtkMap[vambraceGrade] ?? 0;

        if (vambraceNormalAtkPercent > 0) {
            addStat(commonStats, "기본 공격력 %", "완갑 기본 공격력 %", vambraceNormalAtkPercent, "%");
        }

        // 아크 패시브 진화
        const evolutionData = inputs?.arkPassive?.["진화"] || inputs?.arkPassive?.evolution;
        let evolutionRank = 0;

        if (typeof evolutionData === "object" && evolutionData !== null) {
            evolutionRank = Number(evolutionData.rank) || 0;
        } else {
            evolutionRank = Number(inputs?.arkPassive?.evolutionRank) || 0;
        }

        if (evolutionRank > 0) {
            const STAT_PER_RANK = 1;
            const statValue = Number((evolutionRank * STAT_PER_RANK).toFixed(2));
            addStat(commonStats, "진화형 피해", `아크 패시브 진화 (Rank.${evolutionRank})`, statValue, "%");
        }

        // 아크 패시브 깨달음
        const enlightenData = inputs?.arkPassive?.["깨달음"] || inputs?.arkPassive?.enlighten;
        let enlightenLevel = 0;

        if (typeof enlightenData === "object" && enlightenData !== null) {
            enlightenLevel = Number(enlightenData.level) || 0;
        } else if (Array.isArray(enlightenData)) {
            const atkNode = enlightenData.find(node =>
                node.name && (node.name.includes("무기 공격력") || node.name.includes("깨달음"))
            );
            enlightenLevel = Number(atkNode?.level) || 0;
        } else {
            enlightenLevel = Number(inputs?.arkPassive?.enlightenLevel) || 0;
        }

        if (enlightenLevel > 0) {
            const statValue = Number((enlightenLevel * 0.1).toFixed(2));
            addStat(commonStats, "무기 공격력 %", `아크 패시브 깨달음 (Lv.${enlightenLevel})`, statValue, "%");
        }


        // 장신구
        const percentStatList = ["공격력 %", "무기 공격력 %", "치명타 피해", "치명타 적중률", "피해 증가", "추가 피해", "적에게 주는 피해"];
        inputs.accessories.forEach(acc => {
            addStat(commonStats, "주스탯", acc.name, acc.statValue, "");
            acc.slots.forEach((slot, idx) => {
                if (!slot || !slot.opt || slot.opt === "none" || slot.opt === "없음") return;

                let rawKey = slot.opt.trim();
                let matchedKey = Object.keys(accessoryTable).find(k => k.trim() === rawKey);

                if (!matchedKey) {
                    if (rawKey.includes("아군 공격력") || rawKey.includes("아공강")) {
                        matchedKey = Object.keys(accessoryTable).find(k => k.includes("아군 공격력")) || "아군 공격력 강화 효과 %";
                    } else if (rawKey.includes("아군 피해") || rawKey.includes("아피강")) {
                        matchedKey = Object.keys(accessoryTable).find(k => k.includes("아군 피해")) || "아군 피해 강화 효과 %";
                    } else if (rawKey.includes("낙인력")) {
                        matchedKey = Object.keys(accessoryTable).find(k => k.includes("낙인력")) || "낙인력 %";
                    } else if (rawKey.includes("무기 공격력") && rawKey.includes("%")) matchedKey = "무기 공격력 %";
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

        // 젬
        addStat(commonStats, "공격력 %", "젬: 공격력", inputs.gems.atk);
        addStat(commonStats, "추가 피해", "젬: 추가 피해", inputs.gems.addDmg);
        addStat(commonStats, "적에게 주는 피해", "젬: 보스 피해", inputs.gems.bossDmg);

        // 스킬 보석
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

        // 혼돈 코어
        ['Sun', 'Moon', 'Star'].forEach(target => {
            const coresObj = inputs?.chaosCores || {};
            const targetKey = Object.keys(coresObj).find(k => k.toLowerCase() === target.toLowerCase());
            const coreInfo = coresObj[targetKey];

            if (!coreInfo || !coreInfo.grade || coreInfo.grade === '미장착') return;

            const { grade, level } = coreInfo;
            const matchedGrade = grade.includes('고대') ? '고대' : (grade.includes('유물') ? '유물' : null);
            if (!matchedGrade) return;

            const data = chaosDataSets[matchedGrade]?.[target.toLowerCase()];

            if (data) {
                coreLevels.forEach(lvl => {
                    if (Number(level) >= lvl && Array.isArray(data[lvl])) {
                        data[lvl].forEach(opt => {
                            const unit = opt.type === "공격력" ? "" : "%";
                            addStat(commonStats, opt.type, `혼돈 코어(${target}) Lv.${lvl} [${grade}]`, opt.value, unit);
                        });
                    }
                });
            }
        });

        // 팔찌 스탯
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

        let allSkillResults = [];

        // =============================================================================
        // 스킬별 계산 루프
        // =============================================================================
        window.skillDatabase.forEach((skillData) => {
            // ★ 1. 스킬 정보 및 트라이포드(tripods) 직접 추출
            const {
                name: skillName,
                tags: skillTags = [],
                coefficient,
                constant,
                baseCooldown = 0,
                mana,
                tripods: currentTripods = []
            } = skillData;

            let stats = {};
            for (let key in commonStats) {
                stats[key] = Array.isArray(commonStats[key]) ? [...commonStats[key]] : commonStats[key];
            }

            // 🌟 [추가된 로직] ADD_STAT_BASE의 태그 조건부 스탯 처리
            statList.forEach(item => {
                if (!item) return;

                const checkAndAddEffect = (eff, name) => {
                    const exTags = eff.excludeTags || eff.excludeSkillTags || [];
                    if (exTags.some(tag => skillTags.includes(tag) || tag === skillName)) return;

                    const reqTags = eff.targetTags || eff.requireTags || eff.requireSkillTags || [];
                    const isMatch = reqTags.length === 0 || reqTags.some(tag => skillTags.includes(tag) || tag === skillName);

                    if (isMatch && (reqTags.length > 0 || exTags.length > 0)) {
                        addStat(stats, eff.category || eff.type, name, eff.val ?? eff.value, eff.unit ?? "%");
                    }
                };

                if (Array.isArray(item.effects)) {
                    item.effects.forEach(eff => checkAndAddEffect(eff, item.name));
                } else if (item.category) {
                    checkAndAddEffect(item, item.name);
                }
            });

            // ★ 2. 트라이포드 적용
            if (Array.isArray(currentTripods)) {
                currentTripods.forEach(tp => {
                    // 제외 태그 검사
                    const exTags = tp.excludeTags || tp.excludeSkillTags || [];
                    if (exTags.some(tag => skillTags.includes(tag))) return;

                    // 필요 태그 검사
                    const reqTags = tp.requireTags || tp.requireSkillTags || (tp.requiredTag ? [tp.requiredTag] : []);
                    if (reqTags.length > 0 && !reqTags.some(tag => skillTags.includes(tag))) return;

                    const sourceType = `트라이포드(${tp.tier ? tp.tier + '트포 - ' : ''}${tp.name})`;

                    if (Array.isArray(tp.effects)) {
                        tp.effects.forEach(eff => {
                            addStat(stats, eff.category, sourceType, eff.val, eff.unit ?? "%");
                        });
                    } else if (tp.category && tp.val !== undefined) {
                        addStat(stats, tp.category, sourceType, tp.val, tp.unit ?? "%");
                    }
                });
            }

            // ★ 3. 각인 적용
            inputs.engravings.forEach(eng => {
                if (!eng || eng.name === "none" || eng.level === "미사용") return;

                const engData = engravingTable[eng.name];
                if (!engData) return;

                const exTags = engData.excludeTags || engData.excludeSkillTags || [];
                if (exTags.some(tag => skillTags.includes(tag))) return;

                const reqTags = engData.requireTags || engData.requireSkillTags || [];
                const isMatch = reqTags.length === 0 || reqTags.some(tag => skillTags.includes(tag));
                if (!isMatch) return;

                const levelEffects = engData.levels?.[eng.level] || [];
                const stoneEffects = engData.stone?.[eng.stone] || [];

                if (eng.name === "돌격대장") {
                    const raidFactor = (levelEffects[0]?.val || 0) + (stoneEffects[0]?.val || 0);
                    if (raidFactor > 0) {
                        stats["_돌격대장계수"] = raidFactor / 100;
                        stats["_돌격대장정보"] = `각인: 돌격대장 [${eng.level} + 세공 ${eng.stone}]`;
                    }
                    return;
                }

                levelEffects.forEach(eff => {
                    const matchingStone = stoneEffects.find(s => s.type === eff.type);
                    const stoneVal = matchingStone ? (Number(matchingStone.val) || 0) : 0;
                    const totalVal = parseFloat(((Number(eff.val) || 0) + stoneVal).toFixed(2));

                    addStat(stats, eff.type, `각인: ${eng.name} [${eng.level} + 세공 ${eng.stone}]`, totalVal, eff.unit || "%");
                });
            });

            // 보석 적용
            if (skillGemMap[skillName]) {
                skillGemMap[skillName].forEach(({ type, level }) => {
                    if (type === "겁화") {
                        addStat(stats, "적에게 주는 피해", `보석(겁화): ${skillName} [${level}레벨]`, parseFloat(((gemDataTable["겁화"][level] - 1) * 100).toFixed(2)));
                    } else if (type === "작열") {
                        addStat(stats, "쿨타임 감소", `보석(작열): ${skillName} [${level}레벨]`, parseFloat(((1 - gemDataTable["작열"][level]) * 100).toFixed(2)));
                    }
                });
            }

            // ★ 4. 아크 패시브 진화 노드 적용
            const arkStats = getArkEvolutionStats();
            if (arkStats && typeof arkStats === 'object') {
                for (let cat in arkStats) {
                    if (Array.isArray(arkStats[cat])) {
                        arkStats[cat].forEach(eff => {
                            const exTags = eff.excludeTags || eff.excludeSkillTags || [];
                            if (exTags.some(tag => skillTags.includes(tag))) return;

                            const reqTags = eff.requireTags || eff.requireSkillTags || [];
                            const isMatch = reqTags.length === 0 || reqTags.some(tag => skillTags.includes(tag));

                            if (isMatch) {
                                if (!stats[cat]) stats[cat] = [];
                                stats[cat].push({
                                    source: eff.source,
                                    val: eff.val,
                                    unit: eff.unit
                                });
                            }
                        });
                    }
                }
            }

            const bluntThornNode = evolutionNodes[4]?.find(node => node.isBluntThorn);
            const sonicsNode = evolutionNodes[4]?.find(node => node.isSonics);
            const MpFurnaceNode = evolutionNodes[4]?.find(node => node.isMPFurnace);

            // ★ 5. 질서 코어 연산
            const slotToKoreanMap = { 'sun': '해', 'moon': '달', 'star': '별' };

            ['Sun', 'Moon', 'Star'].forEach(target => {
                const coresObj = inputs?.orderCores || {};
                const targetKey = Object.keys(coresObj).find(k => k.toLowerCase() === target.toLowerCase());
                const coreInfo = coresObj[targetKey];

                if (!coreInfo || !coreInfo.grade || coreInfo.grade === '미장착' || !coreInfo.level) return;

                const { name: equippedCoreName, grade, level } = coreInfo;
                const matchedGrade = grade.includes('고대') ? '고대' : (grade.includes('유물') ? '유물' : null);
                if (!matchedGrade) return;

                const koreanSlotName = slotToKoreanMap[target.toLowerCase()];
                const coreData = window.orderDataSets[koreanSlotName]?.[matchedGrade];

                if (!coreData) return;

                const userLevel = Number(level) || 0;
                const pendingGroups = {};

                Object.keys(coreData).forEach(reqPointStr => {
                    const reqPoint = Number(reqPointStr);

                    if (userLevel >= reqPoint) {
                        const rawEffectList = coreData[reqPointStr];

                        if (Array.isArray(rawEffectList)) {
                            rawEffectList.forEach(item => {
                                const targetEffects = Array.isArray(item.effects) ? item.effects : [item];

                                targetEffects.forEach(effect => {
                                    const { category, val, skills, requireTags, tags: targetTags, excludeTags, excludeSkillTags, groupId } = effect;
                                    
                                    const exTags = excludeTags || excludeSkillTags || [];
                                    if (exTags.some(t => (Array.isArray(skillTags) && skillTags.includes(t)) || t === skillName)) return;

                                    const effectiveTags = requireTags || targetTags;

                                    const isSkillMatch = Array.isArray(skills) && skills.includes(skillName);
                                    const isTagMatch = Array.isArray(effectiveTags) && effectiveTags.some(t =>
                                        (Array.isArray(skillTags) && skillTags.includes(t)) || t === skillName
                                    );
                                    const isGlobalMatch = !skills && !effectiveTags;

                                    if (isSkillMatch || isTagMatch || isGlobalMatch) {
                                        if (!category || val === undefined) return;

                                        const numVal = Number(val);
                                        const groupKey = groupId || `point_${reqPoint}_${category}`;

                                        if (!pendingGroups[groupKey]) {
                                            pendingGroups[groupKey] = {
                                                category: category,
                                                val: numVal,
                                                pointList: [reqPoint]
                                            };
                                        } else {
                                            if (groupId) {
                                                pendingGroups[groupKey].val = Math.max(pendingGroups[groupKey].val, numVal);
                                            } else {
                                                pendingGroups[groupKey].val += numVal;
                                            }

                                            if (!pendingGroups[groupKey].pointList.includes(reqPoint)) {
                                                pendingGroups[groupKey].pointList.push(reqPoint);
                                            }
                                        }
                                    }
                                });
                            });
                        }
                    }
                });

                Object.entries(pendingGroups).forEach(([groupKey, groupData]) => {
                    if (groupData.val === 0) return;
                    const pointsStr = groupData.pointList.join(',');
                    addStat(
                        stats,
                        groupData.category,
                        `질서 코어(${koreanSlotName}:${equippedCoreName || '코어'}) Pt.${pointsStr} [${matchedGrade}]`,
                        groupData.val
                    );
                });
            });

            let totalStoneLevel = 0;
            if (Array.isArray(inputs.engravings)) {
                totalStoneLevel = inputs.engravings.reduce((sum, eng) => sum + (parseInt(eng?.stone, 10) || 0), 0);
            }
            const carveAtkBonusPercent = totalStoneLevel >= 5 ? 1.5 : 0;

            // -------------------- 수치 계산 -----------------------------
            const normalStat = getStatSum(stats, "주스탯");
            const statPercent = getStatSum(stats, "주스탯 %");
            const finalStat = normalStat * (1 + statPercent / 100);

            const defPenMultiplier = getDefPenMultiplier(stats, "방어력 무시", true);

            const weaponAtkPercent = getStatSum(stats, "무기 공격력 %");
            const finalWeaponAtk = getStatSum(stats, "무기 공격력") * (1 + (weaponAtkPercent / 100));

            const normalAtkPercent = getStatSum(stats, "기본 공격력 %");

            const calculatedBaseAtk = finalStat > 0 && finalWeaponAtk > 0
                ? (Math.sqrt((finalStat * finalWeaponAtk) / 6)) * (1 + (normalAtkPercent + carveAtkBonusPercent) / 100)
                : 0;

            const flatAtkBonus = getStatSum(stats, "공격력");
            const percentAtkBonus = getStatSum(stats, "공격력 %");
            const finalAtk = (calculatedBaseAtk + flatAtkBonus) * (1 + (percentAtkBonus / 100));

            let baseDamage = calculateDamageBase(finalAtk, coefficient, constant, defPenMultiplier);

            const totalSwift = getStatSum(stats, "신속");
            const swiftSpeedBonus = totalSwift * STAT_CONSTANTS.SWIFT_TO_SPEED;
            const atkSpeedSum = getStatSum(stats, "공격 속도");
            const moveSpeedSum = getStatSum(stats, "이동 속도");

            const finalAtkSpeed = swiftSpeedBonus + atkSpeedSum;
            const finalMoveSpeed = swiftSpeedBonus + moveSpeedSum;

            const moveSpeedBonus = Math.min(STAT_CONSTANTS.SPEED_CAP, Math.max(0, finalMoveSpeed));

            const totalCritStat = getStatSum(stats, "치명");
            const totalCritRatePercent = (totalCritStat * STAT_CONSTANTS.CRIT_TO_RATE) + getStatSum(stats, "치명타 적중률");
            let critRate = Math.min(totalCritRatePercent / 100, 1.0);

            let totalBluntDmg = 0;
            if (bluntThornNode && bluntThornNode.current > 0) {
                const excessCrit = Math.max(0, (totalCritRatePercent / 100 - 0.8) * 100);
                const baseDmg = bluntThornNode.current === 1 ? 7.5 : 15.0;
                const ratio   = bluntThornNode.current === 1 ? 1.25 : 1.5;
                const maxDmg  = bluntThornNode.current === 1 ? 52.5 : 75.0;

                totalBluntDmg = Math.min(maxDmg, baseDmg + (excessCrit * ratio));
                critRate = Math.min(critRate, 0.8);

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

            let totalMpFurnaceDmg = 0;
            if (MpFurnaceNode && MpFurnaceNode.current > 0) {
                let furnaceDmg = mana * 0.05;
                furnaceDmg = Math.min(24, furnaceDmg);

                if (MpFurnaceNode.current === 1) {
                    furnaceDmg *= 0.5;
                }

                if (furnaceDmg > 0) {
                    addStat(
                        stats, 
                        "진화형 피해", 
                        `아크 패시브(진화 5티어): 마나 용광로 [${MpFurnaceNode.current}/${MpFurnaceNode.max}LV]`, 
                        parseFloat(furnaceDmg.toFixed(2))
                    );
                }
            }

            const totalAdditionalDamageMuntiplier = 1 + (getStatSum(stats, "추가 피해") / 100);
            if (!stats["추가 피해"]) stats["추가 피해"] = [];

            const totalEvolutionDamage = getStatSum(stats, "진화형 피해");
            const evolutionDamageMultiplier = 1 + (totalEvolutionDamage / 100);

            if (!stats["적에게 주는 피해"]) stats["적에게 주는 피해"] = [];

            const specStatValue = getStatSum(stats, "특화");

            let specDB = window.specializationDatabase || {};
            if (specDB.specializationDatabase) {
                specDB = specDB.specializationDatabase;
            }

            if (specStatValue > 0 && specDB && Array.isArray(skillTags)) {
                let totalSpecCoeff = 0;

                const specItems = Array.isArray(specDB) 
                    ? specDB 
                    : (specDB.targetTags ? [specDB] : Object.values(specDB));

                specItems.forEach(item => {
                    if (!item) return;

                    const exTags = item.excludeTags || item.excludeSkillTags || [];
                    if (exTags.some(tag => skillTags.includes(tag) || tag === skillName)) return;

                    if (!Array.isArray(item.targetTags)) return;

                    const isMatch = item.targetTags.some(tag => 
                        skillTags.includes(tag) || tag === skillName
                    );

                    if (isMatch) {
                        const coeff = Number(item.coefficient) || 0;
                        totalSpecCoeff += coeff;
                    }
                });

                if (totalSpecCoeff > 0) {
                    const specDamageValue = specStatValue * totalSpecCoeff / 699;

                    stats["적에게 주는 피해"].push({
                        val: parseFloat(specDamageValue.toFixed(2)),
                        source: "특화"
                    });
                }
            }
            
            if (stats["적에게 주는 피해"]) {
                const isSkillSpec = (source) => source.startsWith("트라이포드") || source.startsWith("깨달음") || source.startsWith("도약");
                const tpItems = stats["적에게 주는 피해"].filter(item => isSkillSpec(item.source));
                const otherItems = stats["적에게 주는 피해"].filter(item => !isSkillSpec(item.source));
                stats["적에게 주는 피해"] = [...tpItems, ...otherItems];
            }
            const totalDamageMultiplier = getStatProduct(stats, "적에게 주는 피해", true);

            const totalCritDamagePercent = getStatSum(stats, "치명타 피해");

            const critHitDamageMultiplier = getStatProduct(stats, "치명타 시 적에게 주는 피해", true);

            const nonCritBaseDamage = baseDamage * totalDamageMultiplier * evolutionDamageMultiplier * totalAdditionalDamageMuntiplier;
            const CritBaseDamage = nonCritBaseDamage * (totalCritDamagePercent / 100) * critHitDamageMultiplier;

            const expDmg = CritBaseDamage * critRate + nonCritBaseDamage * (1 - critRate);

            const swiftMultiplier = 1 - ((totalSwift * STAT_CONSTANTS.SWIFT_TO_CDR) / 100);
            const appliedManaCdrMultiplier = 1 - (getStatSum(stats, "마나 스킬 쿨타임 감소") / 100);

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
                specStatValue,
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