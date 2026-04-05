import type { createLoggerParams } from "../types/util"

import nodeUtil from "node:util"

import { formatDate } from "./time"

export class Logger {
    private prefix: string
    private target: createLoggerParams["write"]

    constructor(private params: createLoggerParams) {
        this.target = params.write
        this.prefix = params.prefix ?? ""
    }

    private get time() {
        return formatDate(new Date())
    }

    write(msg: string) {
        this.target(this.prefix + msg)
    }

    info(msg: string, wrapLine = false) {
        this.target(`${wrapLine ? "\n" : ""}${this.time} [Info] ${this.prefix}${msg}`)
    }

    warn(msg: string, wrapLine = false) {
        this.target(`${wrapLine ? "\n" : ""}${this.time} [Warning] ${this.prefix}${msg}`)
    }

    error(msg: string, wrapLine = false) {
        this.target(`${wrapLine ? "\n" : ""}${this.time} [Error] ${this.prefix}${msg}`)
    }
}

export function createLogger(params: createLoggerParams) {
    return new Logger(params)
}

export function inspect(...datas: any[]) {
    const inspectValues = datas.map(value => {
        return nodeUtil.inspect(value, {
            depth: null
        })
    })
    return inspectValues.join("\n\n")
}

export function inspectWithColor(...datas: any[]) {
    const inspectValues = datas.map(value => {
        return nodeUtil.inspect(value, {
            depth: null,
            colors: true
        })
    })
    return inspectValues.join("\n\n")
}
