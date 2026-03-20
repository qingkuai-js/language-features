export const nonWhitespaceRE = /[^\s]/
export const qkExtInImportRE = /\.qk(['"]\s*)$/
export const inEntityCharacterRE = /^[a-zA-Z\d]+;/
export const completeEntityCharacterRE = /&[a-zA-Z\d]*$/
export const jsValidIdentifierRE = /^[a-zA-Z_$][a-zA-Z_$0-9]*$/
export const emmetTagNameRE = /(?:^|\s|<)[a-zA-z][a-zA-Z\d\-_.:]*$/
export const CompletionImportTextEditRE = /^\s*(?:(?:update|add) )?import .* from/

export const badComponentAttrMessageRE = /^Object literal may only specify known properties, and .*? does not exist in type '(Props|Refs)'\.$/
