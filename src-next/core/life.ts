import * as util from './util'
import * as fCondition from './condition'

import Property from './property'
import Event from './event'
import Talent from './talent'
import Achievement from './achievement'
import Character from './character'
import { getListValuesMap } from './util'

import type { LifeConfig, NextResult, TrajectoryContent, TalentMeta, AchievementMeta, EventMeta, AchievementOpportunityKey } from './types'

// Each sub-module expects a narrower System interface.
// Life satisfies all of them at runtime; use a cast to avoid structural mismatches
// caused by the union return types on request() and function().
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySystem = any

class Life {
    constructor() {
        const self: AnySystem = this
        this.#property = new Property(self)
        this.#event = new Event(self)
        this.#talent = new Talent(self)
        this.#achievement = new Achievement(self)
        this.#character = new Character(self)
    }

    Module = {
        PROPERTY: 'PROPERTY',
        TALENT: 'TALENT',
        EVENT: 'EVENT',
        ACHIEVEMENT: 'ACHIEVEMENT',
        CHARACTER: 'CHARACTER',
    }

    Function = {
        CONDITION: 'CONDITION',
        UTIL: 'UTIL',
    }

    #property: Property
    #event: Event
    #talent: Talent
    #achievement: Achievement
    #character: Character
    #triggerTalents: Record<number, number> = {}
    #defaultPropertyPoints: number = 20
    #talentSelectLimit: number = 3
    #propertyAllocateLimit: [number, number] = [0, 10]
    #defaultPropertys: Partial<Record<string, number>> = {}
    #specialThanks: unknown
    #initialData: Record<string, number | number[]> = {}

    async initial(
        i18nLoad: (key: string) => Promise<unknown>,
        commonLoad: (key: string) => Promise<unknown>
    ): Promise<void> {
        const [age, talents, events, achievements, characters, specialThanks] = await Promise.all([
            i18nLoad('age'),
            i18nLoad('talents'),
            i18nLoad('events'),
            i18nLoad('achievement'),
            i18nLoad('character'),
            commonLoad('specialthanks'),
        ])
        this.#specialThanks = specialThanks

        const total: { TTLT: number; TEVT: number; TACHV: number } = {
            TACHV: this.#achievement.initial({ achievements: achievements as Record<number, AchievementMeta> }),
            TEVT: this.#event.initial({ events: events as Record<string | number, EventMeta> }),
            TTLT: this.#talent.initial({ talents: talents as Record<string | number, TalentMeta> }),
        }
        this.#property.initial({ age: age as Record<number, { event: string | string[]; talent: string | string[] }>, total })
        this.#character.initial({ characters: characters as Record<string, Record<string, unknown>> })
    }

    config({
        defaultPropertyPoints = 20,
        talentSelectLimit = 3,
        propertyAllocateLimit = [0, 10] as [number, number],
        defaultPropertys = {},
        talentConfig,
        propertyConfig,
        characterConfig,
    }: Partial<LifeConfig> = {}): void {
        this.#defaultPropertyPoints = defaultPropertyPoints
        this.#talentSelectLimit = talentSelectLimit
        this.#propertyAllocateLimit = propertyAllocateLimit
        this.#defaultPropertys = defaultPropertys
        if (talentConfig) this.#talent.config(talentConfig)
        this.#property.config(propertyConfig ?? {})
        if (characterConfig) this.#character.config(characterConfig)
    }

    request(module: string): Property | Event | Talent | Achievement | Character | null {
        switch (module) {
            case this.Module.ACHIEVEMENT: return this.#achievement
            case this.Module.CHARACTER: return this.#character
            case this.Module.EVENT: return this.#event
            case this.Module.PROPERTY: return this.#property
            case this.Module.TALENT: return this.#talent
            default: return null
        }
    }

    function(type: string): typeof fCondition | typeof util {
        switch (type) {
            case this.Function.CONDITION: return fCondition
            case this.Function.UTIL: return util
            default: return util
        }
    }

    check(condition: string | undefined): boolean {
        if (!condition) return true
        return fCondition.checkCondition(this.#property, condition)
    }

    clone<T>(value: T): T {
        // util.clone only accepts Cloneable; cast through unknown for game data
        return util.clone(value as Parameters<typeof util.clone>[0]) as unknown as T
    }

    remake(talents: number[]): TrajectoryContent[] {
        this.#initialData = this.clone(this.#defaultPropertys) as Record<string, unknown>
        this.#initialData.TLT = this.clone(talents)
        this.#triggerTalents = {}
        return this.talentReplace(this.#initialData.TLT as number[])
    }

    start(allocation: Record<string, unknown>): void {
        for (const key in allocation) {
            this.#initialData[key] = this.clone(allocation[key] as Parameters<typeof util.clone>[0])
        }
        this.#property.restart(this.#initialData as Record<string, number | number[]>)
        this.doTalent()
        this.#property.restartLastStep()
        this.#achievement.achieve(this.AchievementOpportunity.START)
    }

    getPropertyPoints(): number {
        return this.#defaultPropertyPoints + this.#talent.allocationAddition(this.#initialData.TLT as number[])
    }

    getTalentCurrentTriggerCount(talentId: number): number {
        return this.#triggerTalents[talentId] || 0
    }

    next(): NextResult {
        const { age, event, talent } = this.#property.ageNext()
        const talentContent = this.doTalent(talent)
        const eventContent = this.doEvent(this.random(event))
        const isEnd = this.#property.isEnd()
        const content = [talentContent, eventContent].flat()
        this.#achievement.achieve(this.AchievementOpportunity.TRAJECTORY)
        return { age, content, isEnd }
    }

    talentReplace(talents: number[]): TrajectoryContent[] {
        const result = this.#talent.replace(talents)
        const contents: TrajectoryContent[] = []
        for (const id in result) {
            talents.push(result[id as unknown as number])
            const source = this.#talent.get(Number(id))
            const target = this.#talent.get(result[id as unknown as number])
            contents.push({ type: 'TLT', description: '', name: `${source.name} -> ${target.name}`, grade: source.grade } as TrajectoryContent & { source: typeof source; target: typeof target })
        }
        return contents
    }

    doTalent(talents?: number[]): TrajectoryContent[] {
        if (talents) this.#property.change(this.PropertyTypes.TLT, talents as unknown as number)
        const allTalents = this.#property.get(this.PropertyTypes.TLT) as number[]
        const filteredTalents = allTalents
            .filter(talentId => this.getTalentCurrentTriggerCount(talentId) < (this.#talent.get(talentId).max_triggers ?? 1))

        const contents: TrajectoryContent[] = []
        for (const talentId of filteredTalents) {
            const result = this.#talent.do(talentId)
            if (!result) continue
            this.#triggerTalents[talentId] = this.getTalentCurrentTriggerCount(talentId) + 1
            const { effect, name, description, grade } = result
            contents.push({
                type: this.PropertyTypes.TLT as 'TLT',
                name,
                grade,
                description: this.format(description),
            })
            if (!effect) continue
            this.#property.effect(effect)
        }
        return contents
    }

    doEvent(eventId: string | number): TrajectoryContent[] {
        const { effect, next, description, postEvent, grade } = this.#event.do(eventId)
        this.#property.change(this.PropertyTypes.EVT, eventId as unknown as number)
        if (effect) this.#property.effect(effect)
        const content: TrajectoryContent = {
            type: this.PropertyTypes.EVT as 'EVT',
            description: this.format(description),
            postEvent: postEvent ? this.format(postEvent) : undefined,
            grade,
        }
        if (next) return [content, ...this.doEvent(next)]
        return [content]
    }

    random(events: Array<[number, number]>): number {
        return util.weightRandom(
            events.filter(([eventId]) => this.#event.check(eventId))
        ) as number
    }

    talentRandom(): TalentMeta[] {
        return this.#talent.talentRandom(
            this.lastExtendTalent,
            this.#getPropertys(this.PropertyTypes.TMS, this.PropertyTypes.CACHV) as Record<string, number>
        )
    }

    characterRandom(): { unique: unknown; normal: Array<{ talent: TalentMeta[] }> } {
        const characters = this.#character.random()
        const replaceTalent = (v: { talent?: (string | number | TalentMeta)[] }): void => {
            if (v.talent) v.talent = v.talent.map(id => this.#talent.get(id as number))
        }
        ;(characters.normal as Array<{ talent?: (string | number | TalentMeta)[] }>).forEach(replaceTalent)
        if (characters.unique && (characters.unique as { talent?: unknown[] }).talent) {
            replaceTalent(characters.unique as { talent?: (string | number | TalentMeta)[] })
        }
        return characters as unknown as { unique: unknown; normal: Array<{ talent: TalentMeta[] }> }
    }

    talentExtend(talentId: number): void {
        this.#property.set(this.PropertyTypes.EXT, talentId)
    }

    exclude(talents: number[], exclusive: number): number | null {
        return this.#talent.exclude(talents, exclusive)
    }

    generateUnique(): unknown {
        return this.#character.generateUnique()
    }

    #getJudges(...types: string[]): Record<string, unknown> {
        return getListValuesMap(types.flat(), key => this.#property.judge(key))
    }

    #getPropertys(...types: string[]): Record<string, unknown> {
        return getListValuesMap(types.flat(), key => this.#property.get(key))
    }

    format(description: string): string {
        return `${description}`.replaceAll(/\{\s*[0-9a-zA-Z_-]+\s*?\}/g, (match) => String(this.#format(match)))
    }

    #format(key: string): number | string {
        switch (key.slice(1, -1).trim().toLowerCase()) {
            case 'currentyear': return new Date().getFullYear()
            case 'age': return this.#property.get(this.PropertyTypes.AGE) as number
            case 'charm': return this.#property.get(this.PropertyTypes.CHR) as number
            case 'intelligence': return this.#property.get(this.PropertyTypes.INT) as number
            case 'strength': return this.#property.get(this.PropertyTypes.STR) as number
            case 'money': return this.#property.get(this.PropertyTypes.MNY) as number
            case 'spirit': return this.#property.get(this.PropertyTypes.SPR) as number
            default: return key
        }
    }

    get lastExtendTalent(): number | null {
        return this.#property.get(this.PropertyTypes.EXT) as number | null
    }

    get summary(): Record<string, unknown> {
        this.#achievement.achieve(this.AchievementOpportunity.SUMMARY)
        const pt = this.PropertyTypes
        return this.#getJudges(pt.SUM, pt.HAGE, pt.HCHR, pt.HINT, pt.HSTR, pt.HMNY, pt.HSPR)
    }

    get statistics(): Record<string, unknown> {
        const pt = this.PropertyTypes
        return this.#getJudges(pt.TMS, pt.CACHV, pt.RTLT, pt.REVT)
    }

    get achievements(): Array<ReturnType<Achievement['list']>[number]> {
        const ticks: Record<number, number> = {}
        ;(this.#property.get(this.PropertyTypes.ACHV) as unknown as Array<[number, number]>).forEach(([id, tick]) => ticks[id] = tick)
        return this.#achievement.list()
            .sort(({ id: a, grade: ag, hide: ah }, { id: b, grade: bg, hide: bh }) => {
                const ta = ticks[a as number]
                const tb = ticks[b as number]
                if (ta && tb) return tb - ta
                if (!ta && !tb) {
                    if (ah && bh) return (bg ?? 0) - (ag ?? 0)
                    if (ah) return 1
                    if (bh) return -1
                    return (bg ?? 0) - (ag ?? 0)
                }
                if (!ta) return 1
                if (!tb) return -1
                return 0
            })
    }

    get PropertyTypes(): Record<string, string> { return this.#property.TYPES }
    get AchievementOpportunity(): Record<string, AchievementOpportunityKey> { return this.#achievement.Opportunity }
    get talentSelectLimit(): number { return this.#talentSelectLimit }
    get propertyAllocateLimit(): [number, number] { return util.clone(this.#propertyAllocateLimit) }
    get propertys(): Record<string, number | number[]> { return this.#property.getPropertys() }
    get times(): number { return this.#property.get(this.PropertyTypes.TMS) as number || 0 }
    set times(v: number) {
        this.#property.set(this.PropertyTypes.TMS, v)
        this.#achievement.achieve(this.AchievementOpportunity.END)
    }
    get specialThanks(): unknown { return this.#specialThanks }
}

export default Life
