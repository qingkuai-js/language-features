export const QK_HASH_DOC = `Controls where the scoped style rules hash attribute is injected. It allows precise control over where the scoped hash is applied in complex selectors.

By default, the generated scoped CSS hash is appended to the **last simple selector of the last selector**.

\`\`\`qingkuai
<lang-css>
    .container .item {
        color: red;
    }

    /* Compiles to: */
    .container .item[qk-abcdefgh] {
        color: red;
    }
</lang-css>
\`\`\`

When \`qk-hash\` is present, the hash will be injected at the position where the attribute is declared.

\`\`\`
<lang-css>
    .container[qk-hash] .item {
        color: red;
    }

    /* Compiles to: */
    .container[qk-abcdefgh] .item {
        color: red;
    }
</lang-css>
\`\`\`
`
