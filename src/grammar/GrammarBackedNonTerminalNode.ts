import AbstractRuntimeCodeNode from "./AbstractRuntimeCodeNode"

class GrammarBackedNonTerminalNode extends AbstractRuntimeCodeNode {
  getKeywordMap() {
    return this.getDefinition().getRunTimeKeywordMap()
  }

  getCatchAllNodeConstructor(line: string) {
    return this.getDefinition().getRunTimeCatchAllNodeConstructor()
  }

  // todo: implement
  protected _getNodeJoinCharacter() {
    return "\n"
  }

  compile(targetExtension) {
    const compiler = this.getCompilerNode(targetExtension)
    const openChildrenString = compiler.getOpenChildrenString()
    const closeChildrenString = compiler.getCloseChildrenString()

    const compiledLine = this.getCompiledLine(targetExtension)
    const indent = this.getCompiledIndentation(targetExtension)

    const compiledChildren = this.map(child => child.compile(targetExtension)).join(this._getNodeJoinCharacter())

    return `${indent}${compiledLine}${openChildrenString}
${compiledChildren}
${indent}${closeChildrenString}`
  }
}

export default GrammarBackedNonTerminalNode
