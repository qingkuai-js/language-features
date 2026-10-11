/**
 * 共享的"大而全"fixture：覆盖 grammar 的全部构造与 package.json 中
 * tokenTypes / unbalancedBracketScopes 每个 selector 的产生者。
 * 确定性测试与贡献一致性测试都以它为输入。
 */
const KITCHEN_SINK = `
<div id="root" class="app">
  <!-- header {not-an-interpolation} -->
  <img src="logo.png" alt="a &amp; b"/>
  <br/>
  <MyComp prop="static" !dyn={value} &ref={el} @click|prevent.stop={onClick}>
    <Comp<string> extra />
  </MyComp>
  <qk:spread/>
  <ul>
    <li #for={item, index from items} #key={index}>{item.name}</li>
    <li #else>no items</li>
  </ul>
  <p>{count} {a + b * (c ? d : e)} {flag}</p>
  <p>{items from store}</p>
  <style>
    .title { color: #f00; margin: 0 auto; }
  </style>
  <lang-scss>
    $size: 12px;
    .box { width: $size; }
  </lang-scss>
  <lang-less>
    @w: 10px;
    .box { width: @w; }
  </lang-less>
  <lang-postcss>
    .box { color: red; }
  </lang-postcss>
  <lang-js>
    import { helper } from "./helper";
    const tpl = \`x \${helper(1)} y\`;
    const f = () => 1;
  </lang-js>
  <lang-ts>
    import type { Err } from "./err";
    /**
     * Docs {@link Err} and more.
     * @param {string} name the name
     * @returns {Promise<void>} nothing
     */
    function greet(name: string): Promise<void> {
      return Promise.resolve(name);
    }
    const tagged = greet\`\${1}\`;
    const cmp = 1 > 2 ? 3 << 4 : 5;
  </lang-ts>
  <script>
    /** {@link Err} */
    let inited = false;
  </script>
</div>
`

module.exports = { KITCHEN_SINK }
