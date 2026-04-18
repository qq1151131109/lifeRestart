import { weightRandom } from './util'

// Shape of the talent module returned by system.request(system.Module.TALENT)
interface TalentModule {
    random(count: number): (string | number)[]
}

// Minimal shape of the system (life.js) passed to the constructor
interface System {
    Module: { TALENT: string }
    Function: { UTIL: string }
    PropertyTypes: Record<string, string>
    request(module: string): TalentModule
    function(fn: string): { weightRandom: typeof weightRandom }
    clone<T>(value: T): T
}

interface CharacterMeta {
    [key: string]: unknown
}

interface UniqueData {
    unique: boolean
    generate: boolean
    property?: Record<string, number>
    talent?: (string | number)[]
    [key: string]: unknown
}

class Character {
    constructor(system: System) {
        this.#system = system;
    }

    #system: System;
    #characters: Record<string, CharacterMeta> = {};
    #characterPullCount: number = 3;
    #rateableKnife: number = 10;
    #rate: Record<string, number> | null = null;
    #pipe: number[] = [];
    #uniqueWaTaShi: UniqueData | null = null;
    #propertyWeight: [unknown, number][] | undefined;
    #talentWeight: [unknown, number][] | undefined;

    initial({ characters }: { characters: Record<string, CharacterMeta> }): number {
        this.#characters = characters;
        const uniqueWaTaShi = globalThis.localStorage.getItem('uniqueWaTaShi');
        if (uniqueWaTaShi != null || uniqueWaTaShi != 'undefined')
            this.#uniqueWaTaShi = JSON.parse(uniqueWaTaShi as string);
        return this.count;
    }

    get count(): number {
        return Object.keys(this.#characters).length;
    }

    config({
        characterPullCount = 3,
        rateableKnife = 10,
        propertyWeight,
        talentWeight,
    }: {
        characterPullCount?: number;
        rateableKnife?: number;
        propertyWeight?: [unknown, number][];
        talentWeight?: [unknown, number][];
    } = {}): void {
        this.#characterPullCount = characterPullCount;
        this.#rateableKnife = rateableKnife;
        this.#propertyWeight = propertyWeight;
        this.#talentWeight = talentWeight;
    }

    get #unique(): UniqueData | null {
        if (this.#uniqueWaTaShi) {
            return this.#system.clone(this.#uniqueWaTaShi);
        }

        const now = Date.now();
        this.#pipe.push(now);
        if (this.#pipe.length < 10) return null;
        const time = this.#pipe.shift()!;
        if (now - time > 10000) return null;
        return { unique: true, generate: false };
    }

    set #unique(data: UniqueData) {
        this.#uniqueWaTaShi = this.#system.clone(data);
        this.#uniqueWaTaShi.unique = true;
        this.#uniqueWaTaShi.generate = true;
        globalThis.localStorage.setItem(
            'uniqueWaTaShi',
            JSON.stringify(this.#uniqueWaTaShi)
        );
    }

    get #weightRandom(): typeof weightRandom {
        return this.#system.function(this.#system.Function.UTIL).weightRandom;
    }

    generateUnique(): UniqueData | null {
        if (this.#uniqueWaTaShi) return this.#unique;
        const wr = this.#weightRandom;
        const { CHR, INT, STR, MNY } = this.#system.PropertyTypes;

        this.#unique = {
            property: {
                [CHR]: wr(this.#propertyWeight!) as number,
                [INT]: wr(this.#propertyWeight!) as number,
                [STR]: wr(this.#propertyWeight!) as number,
                [MNY]: wr(this.#propertyWeight!) as number,
            },
            talent: this.#system
                .request(this.#system.Module.TALENT)
                .random(wr(this.#talentWeight!) as number),
        };

        return this.#unique;
    }

    random(): { unique: UniqueData | null; normal: CharacterMeta[] } {
        return {
            unique: this.#unique,
            normal: this.#rateable(),
        };
    }

    #rateable(): CharacterMeta[] {
        if (!this.#rate) {
            this.#rate = {};
            for (const id in this.#characters) {
                this.#rate[id] = 1;
            }
        }

        const r: string[] = [];
        const wr = this.#weightRandom;
        new Array(this.#characterPullCount)
            .fill(0)
            .forEach(() => {
                r.push(
                    wr(Object
                        .keys(this.#rate!)
                        .filter(id => !r.includes(id))
                        .map(id => ([id, this.#rate![id]])) as [unknown, number][]
                    ) as string
                );
            });

        let min = Infinity;
        for (const id in this.#rate) {
            if (r.includes(id)) {
                min = Math.min(min, this.#rate[id]);
                continue;
            }
            min = Math.min(min, ++this.#rate[id]);
        }
        if (min > this.#rateableKnife) {
            for (const id in this.#rate) {
                this.#rate[id] -= this.#rateableKnife;
            }
        }
        return r.map(id => this.#system.clone(this.#characters[id]));
    }
}

export default Character;
