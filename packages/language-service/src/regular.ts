export const endingInvalidStrRE = /\s*;?$/
export const inEntityCharacterRE = /^[a-zA-Z\d]+;/
export const reactCompilerFuncRE = /^(?:rea|stc|der)$/
export const watchCompilerFuncRE = /^(?:wat|Wat|waT)$/
export const globalTypeIdentifierRE = /^(Props|Refs)$/
export const identifierRE = /^[a-zA-z_$][a-zA-Z\d_$]*$/
export const completeEntityCharacterRE = /&[a-zA-Z\d]*$/
export const validIdentifierRE = /^[a-zA-Z_$][a-zA-Z_$\d]*$/
export const emmetTagNameRE = /(?:^|\s|<)[a-zA-z][a-zA-Z\d\-_.:]*$/
export const existingTopScopeIdentifierRE = /^(?:rea|stc|der|wat|Wat|waT|props|refs)$/

export const badComponentAttrMessageRE =
    /^Object literal may only specify known properties, and .*? does not exist in type '(Props|Refs)'\.$/
