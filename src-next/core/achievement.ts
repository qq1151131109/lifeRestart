import { emit } from './events'
import type { AchievementMeta, AchievementOpportunityKey } from './types'

// Shape of the property module returned by system.request(system.Module.PROPERTY)
interface PropertyModule {
    get(key: string): unknown
    TYPES: { ACHV: string }
    achieve(type: string, id: number): void
}

// Minimal shape of the system (life.js) passed to the constructor
interface System {
    Module: { PROPERTY: string }
    request(module: string): PropertyModule
    clone<T>(value: T): T
    check(condition: string): boolean
}

class Achievement {
    constructor(system: System) {
        this.#system = system;
    }

    // 时机
    Opportunity: Record<string, AchievementOpportunityKey> = {
        START: "START",             // 分配完成点数，点击开始新人生后
        TRAJECTORY: "TRAJECTORY",   // 每一年的人生经历中
        SUMMARY: "SUMMARY",         // 人生结束，点击人生总结后
        END: "END",                 // 游戏完成，点击重开 重开次数在这之后才会+1
    };

    #system: System;
    #achievements: Record<number, AchievementMeta> = {};

    initial({ achievements }: { achievements: Record<number, AchievementMeta> }): number {
        this.#achievements = achievements;
        return this.count;
    }

    get count(): number {
        return Object.keys(this.#achievements).length;
    }

    get #prop(): PropertyModule {
        return this.#system.request(this.#system.Module.PROPERTY);
    }

    list(): Array<Pick<AchievementMeta, 'id' | 'name' | 'opportunity' | 'description' | 'hide' | 'grade'> & { isAchieved: boolean }> {
        return Object
            .values(this.#achievements)
            .map(({
                id, name, opportunity,
                description, hide, grade,
            }) => ({
                id, name, opportunity,
                description, hide, grade,
                isAchieved: this.isAchieved(id),
            }));
    }

    get(achievementId: number): AchievementMeta {
        const achievement = this.#achievements[achievementId];
        if (!achievement) throw new Error(`[ERROR] No Achievement[${achievementId}]`);
        return this.#system.clone(achievement);
    }

    check(achievementId: number): boolean {
        const { condition } = this.get(achievementId);
        return this.#system.check(condition);
    }

    isAchieved(achievementId: number): boolean {
        for (const [achieved] of (this.#prop.get(this.#prop.TYPES.ACHV) as Array<[number]> || []))
            if (achieved == achievementId) return true;
        return false;
    }

    achieve(opportunity: AchievementOpportunityKey): void {
        this.list()
            .filter(({ isAchieved }) => !isAchieved)
            .filter(({ opportunity: o }) => o == opportunity)
            .filter(({ id }) => this.check(id))
            .forEach(({ id }) => {
                this.#prop.achieve(this.#prop.TYPES.ACHV, id)
                emit('achievement', this.get(id))
            });
    }
}

export default Achievement;
