export const inEntityCharacterRE = /^[a-zA-Z\d]+;/
export const completeEntityCharacterRE = /&[a-zA-Z\d]*$/
export const emmetTagNameRE = /(?:^|\s|<)[a-zA-z][a-zA-Z\d\-_.:]*$/

export const badComponentAttrMessageRE =
    /^Object literal may only specify known properties, and .*? does not exist in type '(Props|Refs)'\.$/
