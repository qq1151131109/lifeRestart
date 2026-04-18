// eslint-disable-next-line @typescript-eslint/no-explicit-any -- property map holds arbitrary game property values
type PropertyMap = { get(key: string): any }

type ConditionNode = string | ConditionNode[]

function parseCondition(condition: string): ConditionNode[] {
    const conditions: ConditionNode[] = []
    const length = condition.length
    const stack: ConditionNode[][] = []
    stack.unshift(conditions)
    let cursor = 0
    const catchString = (i: number): void => {
        const str = condition.substring(cursor, i).trim()
        cursor = i
        if (str) stack[0].push(str)
    }

    for (let i = 0; i < length; i++) {
        switch (condition[i]) {
            case ' ':
                continue

            case '(': {
                catchString(i)
                cursor++
                const sub: ConditionNode[] = []
                stack[0].push(sub)
                stack.unshift(sub)
                break
            }

            case ')':
                catchString(i)
                cursor++
                stack.shift()
                break

            case '|':
            case '&':
                catchString(i)
                catchString(i + 1)
                break
            default:
                continue
        }
    }

    catchString(length)

    return conditions
}

export function checkCondition(property: PropertyMap, condition: string): boolean {
    const conditions = parseCondition(condition)
    return checkParsedConditions(property, conditions)
}

function checkParsedConditions(property: PropertyMap, conditions: ConditionNode): boolean {
    if (!Array.isArray(conditions)) return checkProp(property, conditions)
    if (conditions.length === 0) return true
    if (conditions.length === 1) return checkParsedConditions(property, conditions[0])

    let ret = checkParsedConditions(property, conditions[0])
    for (let i = 1; i < conditions.length; i += 2) {
        switch (conditions[i]) {
            case '&':
                if (ret) ret = checkParsedConditions(property, conditions[i + 1])
                break
            case '|':
                if (ret) return true
                ret = checkParsedConditions(property, conditions[i + 1])
                break
            default:
                return false
        }
    }
    return ret
}

function checkProp(property: PropertyMap, condition: string): boolean {
    const length = condition.length
    let i = condition.search(/[><\!\?=]/)

    const prop = condition.substring(0, i)
    const symbol = condition.substring(i, (i += condition[i + 1] === '=' ? 2 : 1))
    const d = condition.substring(i, length)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- propData is a runtime game property value
    const propData: any = property.get(prop)
    const conditionData: number | number[] = d[0] === '[' ? JSON.parse(d) : Number(d)

    switch (symbol) {
        case '>':  return propData > conditionData
        case '<':  return propData < conditionData
        case '>=': return propData >= conditionData
        case '<=': return propData <= conditionData
        case '=':
            if (Array.isArray(propData)) return propData.includes(conditionData)
            return propData == conditionData
        case '!=':
            if (Array.isArray(propData)) return !propData.includes(conditionData)
            return propData != conditionData
        case '?':
            if (Array.isArray(propData)) {
                for (const p of propData)
                    if ((conditionData as number[]).includes(p)) return true
                return false
            }
            return (conditionData as number[]).includes(propData)
        case '!':
            if (Array.isArray(propData)) {
                for (const p of propData)
                    if ((conditionData as number[]).includes(p)) return false
                return true
            }
            return !(conditionData as number[]).includes(propData)

        default:
            return false
    }
}

export function extractMaxTriggers(condition: string): number {
    // Assuming only age related talents can be triggered multiple times.
    const RE_AGE_CONDITION = /AGE\?\[([0-9\,]+)\]/
    const match_object = RE_AGE_CONDITION.exec(condition)
    if (match_object == null) {
        // Not age related, single trigger.
        return 1
    }

    const age_list = match_object[1].split(',')
    return age_list.length
}
