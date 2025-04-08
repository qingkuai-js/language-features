export const eventModifiers = [
    {
        name: "once",
        description:
            "If the [once](https://qingkuai.dev) event modifier is set, the event handler will be remvoed after its first call, it has the same effect as [MDN: once](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#once) property for [addEventListener](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener) calling options."
    },
    {
        name: "stop",
        description:
            "If the [stop](https://qingkuai.dev) event modifier is set, [stopPropagation](https://developer.mozilla.org/en-US/docs/Web/API/Event/stopPropagation) calling will be attached to event handler, this will prevent the event from bubbling further."
    },
    {
        name: "self",
        description:
            "If the [self](https://qingkuai.dev) event modifier is set, the event handler will be fired only when [event.target](https://developer.mozilla.org/en-US/docs/Web/API/Event/target) is current element."
    },
    {
        name: "capture",
        description:
            "If the [capture](https://qingkuai.dev) event modifier is set, the event handler will be fired during the capture phase instead of the bubbling phase, it has the same effect as [MDN: capture](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#capture) property for [addEventListener](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener) calling options.."
    },
    {
        name: "passive",
        description:
            "The [passive](https://qingkuai.dev) event modifier is used to improves scrolling performance on touch/wheel event, it has the same effect as [MDN: passive](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#passive) property for [addEventListener](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener) calling options."
    },
    {
        name: "prevent",
        description:
            "If the [prevent](https://qingkuai.dev) event modifier is set, [preventDefault](https://developer.mozilla.org/en-US/docs/Web/API/Event/preventDefault) calling will be attached to event handler, this will prevent the default behavior of proxy(mostly browser)."
    },
    {
        name: "compose",
        description:
            "If the [compose](https://qingkuai.dev) event modifier is set, the input evnent handler will not be fired during input composing phase(likes during word choosing with Chinese Pinyin). Note: this modifier is only avaliable for input event."
    },
    {
        name: "enter",
        description:
            "The [enter](https://qingkuai.dev) event modifier provides a convenient way to listen the Enter key press event. Note: this modifier is only avaliable for keydown, keyup or keypress event."
    },
    {
        name: "tab",
        description:
            "The [tab](https://qingkuai.dev) event modifier provides a convenient way to listen the Tab key press event. Note: this modifier is only avaliable for keydown, keyup or keypress event."
    },
    {
        name: "del",
        description:
            "The [del](https://qingkuai.dev) event modifier provides a convenient way to listen the Delete key press event. Note: this modifier is only avaliable for keydown, keyup or keypress event."
    },
    {
        name: "esc",
        description:
            "The [esc](https://qingkuai.dev) event modifier provides a convenient way to listen the Escape key(ESC) press event. Note: this modifier is only avaliable for keydown, keyup or keypress event."
    },
    {
        name: "up",
        description:
            "The [up](https://qingkuai.dev) event modifier provides a convenient way to listen the Up key(↑) press event. Note: this modifier is only avaliable for keydown, keyup or keypress event."
    },
    {
        name: "down",
        description:
            "The [down](https://qingkuai.dev) event modifier provides a convenient way to listen the Down key(↓) press event. Note: this modifier is only avaliable for keydown, keyup or keypress event."
    },
    {
        name: "left",
        description:
            "The [left](https://qingkuai.dev) event modifier provides a convenient way to listen the Left key(←) press event. Note: this modifier is only avaliable for keydown, keyup or keypress event."
    },
    {
        name: "right",
        description:
            "The [right](https://qingkuai.dev) event modifier provides a convenient way to listen the Right key(→) press event. Note: this modifier is only avaliable for keydown, keyup or keypress event."
    },
    {
        name: "space",
        description:
            "The [space](https://qingkuai.dev) event modifier provides a convenient way to listen the Space key press event. Note: this modifier is only avaliable for keydown, keyup or keypress event."
    },
    {
        name: "meta",
        description:
            "If the [meta](https://qingkuai.dev) event modifier is set, the event handler will be fired only when the Meta key(mostly Windows or Command) is held pressing."
    },
    {
        name: "alt",
        description:
            "If the [alt](https://qingkuai.dev) event modifier is set, the event handler will be fired only when the Alt key is held pressing."
    },
    {
        name: "ctrl",
        description:
            "If the [ctrl](https://qingkuai.dev) event modifier is set, the event handler will be fired only when the Control key is held pressing."
    },
    {
        name: "shift",
        description:
            "If the [shift](https://qingkuai.dev) event modifier is set, the event handler will be fired only when the Shift key is held pressing."
    }
]
