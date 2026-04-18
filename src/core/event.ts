import type { EventMeta } from './types'

// Minimal shape of the system (life.js) passed to the constructor
interface System {
    clone<T>(value: T): T
    check(condition: string): boolean
}

class Event {
    constructor(system: System) {
        this.#system = system;
    }

    #system: System;
    #events: Record<string | number, EventMeta> = {};

    initial({ events }: { events: Record<string | number, EventMeta> }): number {
        this.#events = events;
        for (const id in events) {
            const event = events[id];
            if (!event.branch) continue;
            event.branch = event.branch.map(b => {
                // Raw data arrives as "conditionString:nextId" strings; parse into tuples.
                const parts = (b as unknown as string).split(':');
                return [parts[0], Number(parts[1])] as [string, number];
            });
        }
        return this.count;
    }

    get count(): number {
        return Object.keys(this.#events).length;
    }

    check(eventId: string | number): boolean {
        const { include, exclude, NoRandom } = this.get(eventId);
        if (NoRandom) return false;
        if (exclude && this.#system.check(exclude)) return false;
        if (include) return this.#system.check(include);
        return true;
    }

    get(eventId: string | number): EventMeta {
        const event = this.#events[eventId];
        if (!event) throw new Error(`[ERROR] No Event[${eventId}]`);
        return this.#system.clone(event);
    }

    information(eventId: string | number): { description: string } {
        const { event: description } = this.get(eventId);
        return { description };
    }

    do(eventId: string | number): {
        effect?: Record<string, number>
        next?: number
        description: string
        grade?: import('./types').TalentGrade
        postEvent?: string
    } {
        const { effect, branch, event: description, postEvent, grade } = this.get(eventId);
        if (branch)
            for (const [cond, next] of branch)
                if (this.#system.check(cond))
                    return { effect, next, description, grade };
        return { effect, postEvent, description, grade };
    }
}

export default Event;
