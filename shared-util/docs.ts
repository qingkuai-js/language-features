// 生成指定语言的markdown格式代码块
export function mdCodeBlockGen(lang: string, code: string) {
    return "```" + lang + "\n" + code + "\n```"
}
