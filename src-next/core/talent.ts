import { weightRandom } from './util'
import type { TalentMeta, TalentGrade } from './types'

// Shape of the property module returned by system.request(system.Module.PROPERTY)
interface PropertyModule {
    get(key: string): unknown
}

// Shape of extractMaxTriggers from the condition module
type ExtractMaxTriggers = (condition: string | undefined) => number

// Minimal shape of the system (life.js) passed to the constructor
interface System {
    Module: { PROPERTY: string }
    Function: { CONDITION: string; UTIL: string }
    request(module: string): PropertyModule
    function(fn: string): { extractMaxTriggers: ExtractMaxTriggers; weightRandom: typeof weightRandom }
    clone<T>(value: T): T
    check(condition: string | undefined): boolean
}

interface TalentRate {
    total: number
    [grade: number]: number
    [key: string]: number
}

interface TalentConfig {
    talentPullCount?: number
    talentRate?: TalentRate
    additions?: Record<string, Array<[number, Record<string, number>]>>
}

type TalentInfo = Pick<TalentMeta, 'grade' | 'name' | 'description' | 'id'>

class Talent {
    constructor(system: System) {
        this.#system = system;
    }

    #system: System;
    #talents: Record<string | number, TalentMeta> = {};
    #talentPullCount: number = 10;
    #talentRate: TalentRate = { 1: 100, 2: 10, 3: 1, total: 1000 };
    #additions: Record<string, Array<[number, Record<string, number>]>> = {};

    initial({ talents }: { talents: Record<string | number, TalentMeta> }): number {
        this.#talents = talents;
        const emt = this.#system.function(this.#system.Function.CONDITION).extractMaxTriggers;
        for (const id in talents) {
            const talent = talents[id];
            talent.id = Number(id);
            talent.grade = Number(talent.grade) as TalentGrade;
            talent.max_triggers = emt(talent.condition);
            if (talent.replacement) {
                for (const key in talent.replacement) {
                    const obj: Record<string, number> = {};
                    for (let value of (talent.replacement[key] as unknown as string[])) {
                        const parts = `${value}`.split('*');
                        obj[parts[0] || '0'] = Number(parts[1]) || 1;
                    }
                    talent.replacement[key] = obj as unknown as number;
                }
            }
        }
        return this.count;
    }

    get count(): number {
        return Object.keys(this.#talents).length;
    }

    get #prop(): PropertyModule {
        return this.#system.request(this.#system.Module.PROPERTY);
    }

    config({
        talentPullCount = 10,
        talentRate = { 1: 100, 2: 10, 3: 1, total: 1000 },
        additions = {},
    }: TalentConfig = {}): void {
        this.#talentPullCount = talentPullCount;
        this.#talentRate = talentRate;
        this.#additions = additions;
    }

    check(talentId: number): boolean {
        const { condition } = this.get(talentId);
        return this.#system.check(condition);
    }

    get(talentId: number): TalentMeta {
        const talent = this.#talents[talentId];
        if (!talent) throw new Error(`[ERROR] No Talent[${talentId}]`);
        return this.#system.clone(talent);
    }

    information(talentId: number): Pick<TalentMeta, 'grade' | 'name' | 'description'> {
        const { grade, name, description } = this.get(talentId);
        return { grade, name, description };
    }

    exclude(talents: number[], excludeId: number): number | null {
        const { exclude } = this.get(excludeId);
        for (const talent of talents) {
            if (exclude) {
                for (const e of exclude) {
                    if (talent == (e as unknown as number)) return talent;
                }
            }
            const excludeReverse = this.get(talent).exclude;
            if (excludeReverse) {
                for (const e of excludeReverse) {
                    if (excludeId == (e as unknown as number)) return talent;
                }
            }
        }
        return null;
    }

    getAddition(type: string, value: number): Record<string, number> {
        if (!this.#additions[type]) return {};
        for (const [min, addition] of this.#additions[type]) {
            if (value >= min) return addition;
        }
        return {};
    }

    getRate(additionValues: Record<string, number> = {}): TalentRate {
        const rate = this.#system.clone(this.#talentRate);
        const addition: Record<string, number> = { 1: 1, 2: 1, 3: 1 };

        Object.keys(additionValues).forEach(key => {
            const addi = this.getAddition(key, additionValues[key]);
            for (const grade in addi)
                addition[grade] += addi[grade];
        });

        for (const grade in addition)
            rate[grade] *= addition[grade];

        return rate;
    }

    talentRandom(include: number | null, additionValues: Record<string, number>): TalentInfo[] {
        const rate = this.getRate(additionValues);

        const randomGrade = (): number => {
            let randomNumber = Math.floor(Math.random() * rate.total);
            if ((randomNumber -= rate[3]) < 0) return 3;
            if ((randomNumber -= rate[2]) < 0) return 2;
            if ((randomNumber - rate[1]) < 0) return 1;
            return 0;
        };

        const talentList: Record<number, TalentInfo[]> = {};
        let includeInfo: TalentInfo | null = null;

        for (const talentId in this.#talents) {
            const { id, grade, name, description, exclusive } = this.#talents[talentId];
            if (!!exclusive) continue;
            if (id == (include as unknown as number)) {
                includeInfo = { grade, name, description, id };
                continue;
            }
            if (!talentList[grade]) talentList[grade] = [{ grade, name, description, id }];
            else talentList[grade].push({ grade, name, description, id });
        }

        return new Array(this.#talentPullCount)
            .fill(1).map((_v, i) => {
                if (!i && includeInfo) return includeInfo as TalentInfo;
                let grade = randomGrade();
                while (talentList[grade].length == 0) grade--;
                const length = talentList[grade].length;
                const random = Math.floor(Math.random() * length) % length;
                return talentList[grade].splice(random, 1)[0];
            });
    }

    random(count: number): (string | number)[] {
        const talents = Object
            .keys(this.#talents)
            .filter(id => !this.#talents[id].exclusive);
        return new Array(count)
            .fill(1)
            .map(() => talents.splice(
                Math.floor(Math.random() * talents.length) % talents.length,
                1
            )[0]
            );
    }

    allocationAddition(talents: number | number[]): number {
        if (Array.isArray(talents)) {
            let addition = 0;
            for (const talent of talents)
                addition += this.allocationAddition(talent);
            return addition;
        }
        return Number(this.get(talents).status) || 0;
    }

    do(talentId: number): {
        effect?: Record<string, number>
        grade: TalentGrade
        name: string
        description: string
    } | null {
        const { effect, condition, grade, name, description } = this.get(talentId);
        if (condition && !this.#system.check(condition))
            return null;
        return { effect, grade, name, description };
    }

    replace(talents: number[]): Record<number, number> {
        const getReplaceList = (talent: number, talentArr: number[]): [number, number][] | null => {
            const { replacement } = this.get(talent);
            if (!replacement) return null;
            const list: [number, number][] = [];
            const rep = replacement as unknown as Record<string, Record<string | number, number>>;
            if (rep.grade) {
                this.forEach(({ id, grade, exclusive }) => {
                    if (exclusive) return;
                    if (!rep.grade[grade]) return;
                    if (this.exclude(talentArr, id)) return;
                    list.push([id, rep.grade[grade]]);
                });
            }
            if (rep.talent) {
                for (let id in rep.talent) {
                    const numId = Number(id);
                    if (this.exclude(talentArr, numId)) continue;
                    list.push([numId, rep.talent[id]]);
                }
            }
            return list;
        };

        const replace = (talent: number, talentArr: number[]): number => {
            const replaceList = getReplaceList(talent, talentArr);
            if (!replaceList) return talent;
            const rand = weightRandom(replaceList as [unknown, number][]) as number;
            return replace(rand, talentArr.concat(rand));
        };

        const newTalents = this.#system.clone(talents);
        const result: Record<number, number> = {};
        for (const talent of talents) {
            const replaceId = replace(talent, newTalents);
            if (replaceId != talent) {
                result[talent] = replaceId;
                newTalents.push(replaceId);
            }
        }
        return result;
    }

    forEach(callback: (talent: TalentMeta, id: string) => void): void {
        if (typeof callback != 'function') return;
        for (const id in this.#talents)
            callback(this.#system.clone(this.#talents[id]), id);
    }
}

export default Talent;
