// 在上下文对象中新增两个工具函数
function parse(str) {
    // 上下文对象
    const context = {
        // 模板内容
        source: str,
        mode: TextModes.DATA,
        // advanceBy函数用来消费指定数量的字符,它接收一个数字作为参数
        advanceBy(num) {
            // 根据给定字符数num,截取位置num后的模板内容,并替换当前模板内容
            context.source = context.source.slice(num)
        },
        // 无论是开始标签还是结束标签,都可能存在无用的空白字符,例如<div  >
        advanceSpaces() {
            // 匹配空白字符
            const match = /^[\t\r\n\f]+/.exec(context.source)
            if (match) {
                // 调用advanceBy函数消费空白字符
                context.advanceBy(match[0].length)
            }
        }
    }
    const nodes = parseChildren(context, [])

    return {
        type: 'Root',
        children: nodes
    }
}

// 实现parseTag函数

// 由于parseTag既用来处理开始标签,也用来处理结束标签,因此我们设计第二个参数type.
// 用来代表当前处理的事开始标签还是结束标签,type的默认值为‘start',即默认作为开始标签处理
function parseTag(context, type = 'start') {
    // 从上下文对象中拿到advanceBy函数
    const { advanceBy, advanceSpaces } = context

    // 处理开始标签和结束标签的正则表达式不同
    const match = type === 'start'
        // 匹配开始标签
        ? /^<([a-z][^\t\r\n\f />]*)/i.exec(context.source)
        // 匹配结束标签
        : /^<\/([a-z][^\t\r\n\f />]*)/i.exec(context.source)
    // 匹配成功后,正则表达式的第一个捕获组的值就是标签名称
    const tag = match[1]
    // 消费正则表达式匹配的全部内容,例如'<div'这段内容
    advanceBy(match[0].length)
    // 消费标签中无用的空白字符
    advanceSpaces()
    // 在消费匹配的内容后,如果字符串以'/>'开头,则说明这是一个自闭合标签
    const isSelfClosing = context.source.startsWith('/>')
    // 如果是自闭合标签,则消费'/>',否则消费'>'
    advanceBy(isSelfClosing ? 2 : 1)

    // 返回标签节点
    return {
        type: 'Element',
        // 标签名称
        tag,
        // 标签的属性暂时留空
        props: [],
        // 子节点留空
        children: [],
        // 是否自闭合
        isSelfClosing
    }
}

function parseElement(context, ancestors) {
    const element = parseTag(context)
    if (element.isSelfClosing) return element

    // 切换到正确的文本模式
    if (element.tag === 'textarea' || element.tag === 'title') {
        // 如果由parseTag解析得到的标签是<textarea>或<title>,则切换到RCDATA模式
        context.mode = TextModes.RCDATA
    } else if (/style|xmp|iframe|noembed|noframes|noscript/.test(element.tag)) {
        // 如果由parseTag解析到的标签是正则内的这些,则切换到RAWTEXT
        context.mode = TextModes.DATA
    } else {
        // 否则切换到DATA模式
        context.mode = TextModes.DATA
    }

    ancestors.push(element)
    element.children = parseChildren(context, ancestors)
    ancestors.pop()

    if (context.source.startsWith(`</${element.tag}`)) {
        parseTag(context, 'end')
    } else {
        console.error(`${element.tag}标签缺少闭合标签`)
    }
    return element
}