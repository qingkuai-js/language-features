export const inEntityCharacterRE = /^[a-zA-Z\d]+;/
export const completeEntityCharacterRE = /&[a-zA-Z\d]*$/
export const emmetTagNameRE = /(?:^|\s|<)[a-zA-z][a-zA-Z\d\-_.:]*$/

export const badSlotNameDiagnosticRE =
    /^Argument of type .*? is not assignable to parameter of type .*?\.$/

export const badComponentAttrRE =
    /^Object literal may only specify known properties, and .*? does not exist in type '(Props|Refs)'\.$/
