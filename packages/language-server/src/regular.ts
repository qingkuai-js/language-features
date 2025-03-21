export const inEntityCharacterRE = /^[a-zA-Z\d]+;/
export const identifierRE = /^[a-zA-z_$][a-zA-Z\d_$]*$/
export const completeEntityCharacterRE = /&[a-zA-Z\d]*$/
export const emmetTagNameRE = /(?:^|\s|<)[a-zA-z][a-zA-Z\d\-_.:]*$/

export const badComponentAttrMessageRE =
    /^Object literal may only specify known properties, and .*? does not exist in type '(Props|Refs)'\.$/
