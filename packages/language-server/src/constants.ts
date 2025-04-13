import { generateCustomPathByNodePath } from "../../../shared-util/sundry"

export enum ProjectKind {
    TS = "ts",
    JS = "js"
}

export const CUSTOM_PATH = generateCustomPathByNodePath()
