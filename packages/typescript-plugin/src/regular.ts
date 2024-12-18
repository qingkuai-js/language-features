export const relativePathRE = /^\.\.?($|[\/\\])/

export const endingInvalidStr = /\s*;?$/
export const globalTypeIdentifierRE = /^(Props|Refs)$/
export const reactCompilerFuncRE = /^(?:rea|stc|der)$/
export const watchCompilerFuncRE = /^(?:wat|Wat|waT)$/
export const validIdentifierRE = /^[a-zA-Z_$][a-zA-Z_$\d]*$/
export const mappingFileNameRE = /(?<=\.qk)\.[a-f\d]{12}\.[jt]s/g
export const bannedIdentifierFormatRE = /^__w__|__(?:[sd]\d+|dn|c)__$/
export const existingTopScopeIdentifierRE = /^(?:rea|stc|der|wat|Wat|waT|props|refs)$/
