import type { LoggerTarget } from "../types/util"

import util from "node:util"
import { formatDate } from "./time"

enum LogKind {
    None,
    Info,
    Warn,
    Error
}

class Logger {
    private kindOfLastLog = LogKind.None

    constructor(private target: LoggerTarget) {}

    private get time() {
        return formatDate(new Date())
    }

    info(msg: string, line = false) {
        this.target.write(`${line ? "\n" : ""}${this.time} [Info] ${msg}`)
        this.kindOfLastLog = LogKind.Info
    }

    warn(msg: string, line = false) {
        this.target.write(`${line ? "\n" : ""}${this.time} [Warning] ${msg}`)
        this.kindOfLastLog = LogKind.Warn
    }

    error(msg: string, line = false) {
        const pre = line || this.kindOfLastLog !== LogKind.Error ? "\n" : ""
        this.target.write(`${pre}${this.time} [Error] ${msg}\n`)
        this.kindOfLastLog = LogKind.Error
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
