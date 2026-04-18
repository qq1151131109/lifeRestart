import { PropertyType } from './types'
import type { TalentGrade, PropertyTypeKey } from './types'

// Shape of the util module returned by system.function(system.Function.UTIL)
interface UtilModule {
    clone<T>(value: T): T
    min(a: number, b: number): number
    max(a: number, b: number): number
    sum(...args: number[]): number
    listRandom<T>(list: T[]): T
}

// Minimal shape of the system (life.js) passed to the constructor
interface System {
    Module: Record<string, string>
    Function: { UTIL: string }
    function(fn: string): UtilModule
    clone<T>(value: T): T
    check(condition: string | undefined): boolean
}

// Internal age data entry (post-processed in initial())
interface AgeEntry {
    event: Array<[number, number]>   // [eventId, weight]
    talent: number[]
}

// Internal data store — numeric properties, array properties, Infinity sentinels
type DataStore = Record<string, number | number[]>

// Totals from life config
interface TotalStore {
    TTLT: number
    TEVT: number
    TACHV: number
    [key: string]: number
}

// Judge tuple as declared in LifeConfig
type JudgeTuple = [number, TalentGrade] | [number, TalentGrade, string]

export interface JudgeResult {
    prop: string
    value: number
    judge: string | undefined
    grade: TalentGrade
    progress: number
}

class Property {
    constructor(system: System) {
        this.#system = system;
    }

    TYPES = PropertyType as typeof PropertyType

    // 特殊类型
    SPECIAL = {
        RDM: [  // 随机属性 random RDM
            this.TYPES.CHR,
            this.TYPES.INT,
            this.TYPES.STR,
            this.TYPES.MNY,
            this.TYPES.SPR,
        ]
    }

    #system: System;
    #ageData: Record<number, AgeEntry> = {};
    #data: DataStore = {};
    #total: TotalStore = { TTLT: 0, TEVT: 0, TACHV: 0 };
    #judge: Record<string, JudgeTuple[]> = {};

    get #util(): UtilModule {
        return this.#system.function(this.#system.Function.UTIL);
    }

    initial({ age, total }: { age: Record<number, { event: string | string[]; talent: string | string[] }>, total: TotalStore }): void {
        this.#ageData = age as unknown as Record<number, AgeEntry>;
        for (const a in age) {
            let { event, talent } = age[a];
            if (!Array.isArray(event))
                event = event?.split(',') || [];

            const processedEvent = event.map(v => {
                const value = `${v}`.split('*').map(n => Number(n));
                if (value.length == 1) value.push(1);
                return value as [number, number];
            });

            if (!Array.isArray(talent))
                talent = talent?.split(',') || [];

            const processedTalent = talent.map(v => Number(v));

            (age as unknown as Record<number, AgeEntry>)[a] = { event: processedEvent, talent: processedTalent };
        }
        this.#total = total;
    }

    config({ judge = {} }: { judge?: Record<string, JudgeTuple[]> }): void {
        this.#judge = judge;
    }

    restart(data: Partial<Record<PropertyTypeKey, number | number[]>>): void {
        this.#data = {
            [this.TYPES.AGE]: -1,

            [this.TYPES.CHR]: 0,
            [this.TYPES.INT]: 0,
            [this.TYPES.STR]: 0,
            [this.TYPES.MNY]: 0,
            [this.TYPES.SPR]: 0,

            [this.TYPES.LIF]: 1,

            [this.TYPES.TLT]: [],
            [this.TYPES.EVT]: [],

            [this.TYPES.LAGE]: Infinity,
            [this.TYPES.LCHR]: Infinity,
            [this.TYPES.LINT]: Infinity,
            [this.TYPES.LSTR]: Infinity,
            [this.TYPES.LSPR]: Infinity,
            [this.TYPES.LMNY]: Infinity,

            [this.TYPES.HAGE]: -Infinity,
            [this.TYPES.HCHR]: -Infinity,
            [this.TYPES.HINT]: -Infinity,
            [this.TYPES.HSTR]: -Infinity,
            [this.TYPES.HMNY]: -Infinity,
            [this.TYPES.HSPR]: -Infinity,
        };
        for (const key in data)
            this.change(key as PropertyTypeKey, data[key as PropertyTypeKey] as number | number[]);
    }

    restartLastStep(): void {
        this.#data[this.TYPES.LAGE] = this.get(this.TYPES.AGE) as number;
        this.#data[this.TYPES.LCHR] = this.get(this.TYPES.CHR) as number;
        this.#data[this.TYPES.LINT] = this.get(this.TYPES.INT) as number;
        this.#data[this.TYPES.LSTR] = this.get(this.TYPES.STR) as number;
        this.#data[this.TYPES.LSPR] = this.get(this.TYPES.SPR) as number;
        this.#data[this.TYPES.LMNY] = this.get(this.TYPES.MNY) as number;
        this.#data[this.TYPES.HAGE] = this.get(this.TYPES.AGE) as number;
        this.#data[this.TYPES.HCHR] = this.get(this.TYPES.CHR) as number;
        this.#data[this.TYPES.HINT] = this.get(this.TYPES.INT) as number;
        this.#data[this.TYPES.HSTR] = this.get(this.TYPES.STR) as number;
        this.#data[this.TYPES.HMNY] = this.get(this.TYPES.MNY) as number;
        this.#data[this.TYPES.HSPR] = this.get(this.TYPES.SPR) as number;
    }

    get(prop: string): number | number[] | null {
        const util = this.#util;
        switch (prop) {
            case this.TYPES.AGE:
            case this.TYPES.CHR:
            case this.TYPES.INT:
            case this.TYPES.STR:
            case this.TYPES.MNY:
            case this.TYPES.SPR:
            case this.TYPES.LIF:
            case this.TYPES.TLT:
            case this.TYPES.EVT:
                return util.clone(this.#data[prop] as number | number[]);
            case this.TYPES.LAGE:
            case this.TYPES.LCHR:
            case this.TYPES.LINT:
            case this.TYPES.LSTR:
            case this.TYPES.LMNY:
            case this.TYPES.LSPR:
                return util.min(
                    this.#data[prop] as number,
                    this.get(this.fallback(prop) as string) as number
                );
            case this.TYPES.HAGE:
            case this.TYPES.HCHR:
            case this.TYPES.HINT:
            case this.TYPES.HSTR:
            case this.TYPES.HMNY:
            case this.TYPES.HSPR:
                return util.max(
                    this.#data[prop] as number,
                    this.get(this.fallback(prop) as string) as number
                );
            case this.TYPES.SUM: {
                const HAGE = this.get(this.TYPES.HAGE) as number;
                const HCHR = this.get(this.TYPES.HCHR) as number;
                const HINT = this.get(this.TYPES.HINT) as number;
                const HSTR = this.get(this.TYPES.HSTR) as number;
                const HMNY = this.get(this.TYPES.HMNY) as number;
                const HSPR = this.get(this.TYPES.HSPR) as number;
                return Math.floor(util.sum(HCHR, HINT, HSTR, HMNY, HSPR) * 2 + HAGE / 2);
            }
            case this.TYPES.TMS:
                return this.lsget('times') as number || 0;
            case this.TYPES.EXT:
                return this.lsget('extendTalent') as number | null || null;
            case this.TYPES.ATLT:
            case this.TYPES.AEVT:
            case this.TYPES.ACHV:
                return (this.lsget(prop) as number[]) || [];
            case this.TYPES.CTLT:
            case this.TYPES.CEVT:
            case this.TYPES.CACHV:
                return (this.get(
                    this.fallback(prop) as string
                ) as number[]).length;
            case this.TYPES.TTLT:
            case this.TYPES.TEVT:
            case this.TYPES.TACHV:
                return this.#total[prop];
            case this.TYPES.RTLT:
            case this.TYPES.REVT:
            case this.TYPES.RACHV: {
                const fb = this.fallback(prop) as [string, string];
                return (this.get(fb[0]) as number) / (this.get(fb[1]) as number);
            }
            default: return 0;
        }
    }

    fallback(prop: string): string | [string, string] | undefined {
        switch (prop) {
            case this.TYPES.LAGE:
            case this.TYPES.HAGE: return this.TYPES.AGE;
            case this.TYPES.LCHR:
            case this.TYPES.HCHR: return this.TYPES.CHR;
            case this.TYPES.LINT:
            case this.TYPES.HINT: return this.TYPES.INT;
            case this.TYPES.LSTR:
            case this.TYPES.HSTR: return this.TYPES.STR;
            case this.TYPES.LMNY:
            case this.TYPES.HMNY: return this.TYPES.MNY;
            case this.TYPES.LSPR:
            case this.TYPES.HSPR: return this.TYPES.SPR;
            case this.TYPES.CTLT: return this.TYPES.ATLT;
            case this.TYPES.CEVT: return this.TYPES.AEVT;
            case this.TYPES.CACHV: return this.TYPES.ACHV;
            case this.TYPES.LIF: return this.TYPES.LIF;
            case this.TYPES.RTLT: return [this.TYPES.CTLT, this.TYPES.TTLT];
            case this.TYPES.REVT: return [this.TYPES.CEVT, this.TYPES.TEVT];
            case this.TYPES.RACHV: return [this.TYPES.CACHV, this.TYPES.TACHV];
            default: return undefined;
        }
    }

    set(prop: string, value: number | number[] | null): void {
        switch (prop) {
            case this.TYPES.AGE:
            case this.TYPES.CHR:
            case this.TYPES.INT:
            case this.TYPES.STR:
            case this.TYPES.MNY:
            case this.TYPES.SPR:
            case this.TYPES.LIF:
            case this.TYPES.TLT:
            case this.TYPES.EVT:
                this.hl(prop, this.#data[prop] = this.#system.clone(value) as number | number[]);
                this.achieve(prop, value as number);
                return;
            case this.TYPES.TMS:
                this.lsset('times', parseInt(String(value)) || 0);
                return;
            case this.TYPES.EXT:
                this.lsset('extendTalent', value);
                return;
            default: return;
        }
    }

    getPropertys(): Record<string, number | number[]> {
        return this.#system.clone({
            [this.TYPES.AGE]: this.get(this.TYPES.AGE),
            [this.TYPES.CHR]: this.get(this.TYPES.CHR),
            [this.TYPES.INT]: this.get(this.TYPES.INT),
            [this.TYPES.STR]: this.get(this.TYPES.STR),
            [this.TYPES.MNY]: this.get(this.TYPES.MNY),
            [this.TYPES.SPR]: this.get(this.TYPES.SPR),
        }) as Record<string, number | number[]>;
    }

    change(prop: string, value: number | number[]): void {
        if (Array.isArray(value)) {
            for (const v of value)
                this.change(prop, Number(v));
            return;
        }
        switch (prop) {
            case this.TYPES.AGE:
            case this.TYPES.CHR:
            case this.TYPES.INT:
            case this.TYPES.STR:
            case this.TYPES.MNY:
            case this.TYPES.SPR:
            case this.TYPES.LIF:
                this.hl(prop, (this.#data[prop] as number) += Number(value));
                return;
            case this.TYPES.TLT:
            case this.TYPES.EVT: {
                const v = this.#data[prop] as number[];
                if (value < 0) {
                    const index = v.indexOf(value);
                    if (index != -1) v.splice(index, 1);
                }
                if (!v.includes(value)) v.push(value);
                this.achieve(prop, value);
                return;
            }
            case this.TYPES.TMS:
                this.set(
                    prop,
                    (this.get(prop) as number) + parseInt(String(value))
                );
                return;
            default: return;
        }
    }

    hookSpecial(prop: string): string {
        switch (prop) {
            case this.TYPES.RDM:
                return this.#util.listRandom(this.SPECIAL.RDM);
            default: return prop;
        }
    }

    effect(effects: Record<string, number>): void {
        for (const prop in effects)
            this.change(
                this.hookSpecial(prop),
                Number(effects[prop])
            );
    }

    judge(prop: string): JudgeResult | undefined {
        const value = this.get(prop) as number;

        const d = this.#judge[prop];
        let length = d.length;

        const progress = (): number => Math.max(Math.min(value, 10), 0) / 10;

        while (length--) {
            const [min, grade, judge] = d[length] as [number, TalentGrade, string?];
            if (!length || min == void 0 || value >= min)
                return { prop, value, judge, grade, progress: progress() };
        }
        return undefined;
    }

    isEnd(): boolean {
        return (this.get(this.TYPES.LIF) as number) < 1;
    }

    ageNext(): { age: number; event: Array<[number, number]>; talent: number[] } {
        this.change(this.TYPES.AGE, 1);
        const age = this.get(this.TYPES.AGE) as number;
        const { event, talent } = this.getAgeData(age);
        return { age, event, talent };
    }

    getAgeData(age: number): AgeEntry {
        return this.#system.clone(this.#ageData[age]);
    }

    hl(prop: string, value: number | number[]): void {
        let keys: [string, string] | undefined;
        switch (prop) {
            case this.TYPES.AGE: keys = [this.TYPES.LAGE, this.TYPES.HAGE]; break;
            case this.TYPES.CHR: keys = [this.TYPES.LCHR, this.TYPES.HCHR]; break;
            case this.TYPES.INT: keys = [this.TYPES.LINT, this.TYPES.HINT]; break;
            case this.TYPES.STR: keys = [this.TYPES.LSTR, this.TYPES.HSTR]; break;
            case this.TYPES.MNY: keys = [this.TYPES.LMNY, this.TYPES.HMNY]; break;
            case this.TYPES.SPR: keys = [this.TYPES.LSPR, this.TYPES.HSPR]; break;
            default: return;
        }
        const [l, h] = keys;
        this.#data[l] = this.#util.min(this.#data[l] as number, value as number);
        this.#data[h] = this.#util.max(this.#data[h] as number, value as number);
    }

    achieve(prop: string, newData: number | number[] | null): void {
        let key: string;
        switch (prop) {
            case this.TYPES.ACHV: {
                const lastData = this.lsget(prop) as Array<[number, number]> | undefined;
                this.lsset(
                    prop,
                    (lastData || []).concat([[newData as number, Date.now()]])
                );
                return;
            }
            case this.TYPES.TLT: key = this.TYPES.ATLT; break;
            case this.TYPES.EVT: key = this.TYPES.AEVT; break;
            default: return;
        }
        const lastData = (this.lsget(key) as number[]) || [];
        this.lsset(
            key,
            Array.from(
                new Set(
                    lastData
                        .concat(newData as number || [])
                        .flat()
                )
            )
        );
    }

    lsget(key: string): unknown {
        const data = globalThis.localStorage.getItem(key);
        if (data === null || data === 'undefined') return undefined;
        return JSON.parse(data);
    }

    lsset(key: string, value: unknown): void {
        globalThis.localStorage.setItem(
            key,
            JSON.stringify(value)
        );
    }
}

export default Property;
