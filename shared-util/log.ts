import type { LoggerTarget } from "../types/util"

import util from "node:util"
import { formatDate } from "./time"

class Logger {
    constructor(private target: LoggerTarget) {}

    private get time() {
        return formatDate(new Date())
    }

    info(msg: string) {
        this.target.write(`${this.time} [Info] ${msg}`)
    }

    warn(msg: string) {
        this.target.write(`${this.time} [Warning] ${msg}`)
    }

    error(msg: string) {
        this.target.write(`\n${this.time} [Error] ${msg}\n`)
    }
}

export function createLogger(param: LoggerTarget) {
    return new Logger(param)
}

export function inspect(...datas: any[]) {
    const inspectValues = datas.map(value => {
        return util.inspect(value, {
            depth: null
        })
    })
    return inspectValues.join("\n\n")
}

export function inspectWithColor(...datas: any[]) {
    const inspectValues = datas.map(value => {
        return util.inspect(value, {
            depth: null,
            colors: true
        })
    })
    return inspectValues.join("\n\n")
}
