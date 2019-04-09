import TreeNode from "../base/TreeNode"
import { GrammarConstantsErrors } from "./GrammarConstants"
import AbstractRuntimeNode from "./AbstractRuntimeNode"
import types from "../types"

abstract class AbstractRuntimeProgram extends AbstractRuntimeNode {
  *getProgramErrorsIterator() {
    let line = 1
    for (let node of this.getTopDownArrayIterator()) {
      node._cachedLineNumber = line
      const errs = node.getErrors()
      delete node._cachedLineNumber
      if (errs.length) yield errs
      line++
    }
  }

  getProgramErrors(): types.ParseError[] {
    const errors: types.ParseError[] = []
    let line = 1
    for (let node of this.getTopDownArray()) {
      node._cachedLineNumber = line
      const errs = node.getErrors()
      errs.forEach(err => errors.push(err))
      delete node._cachedLineNumber
      line++
    }
    this._getRequiredNodeErrors(errors)
    return errors
  }

  // Helper method for selecting potential keywords needed to update grammar file.
  getInvalidKeywords(level = undefined) {
    return Array.from(
      new Set(
        this.getProgramErrors()
          .filter(err => err.kind === GrammarConstantsErrors.invalidKeywordError)
          .filter(err => (level ? level === err.level : true))
          .map(err => err.subkind)
      )
    )
  }

  getProgramErrorMessages() {
    return this.getProgramErrors().map(err => err.message)
  }

  getKeywordMap() {
    return this.getDefinition().getRunTimeKeywordMap()
  }

  getCatchAllNodeConstructor(line: string) {
    // todo: blank line
    // todo: restore didyoumean
    return this.getDefinition().getRunTimeCatchAllNodeConstructor()
  }

  getDefinition() {
    return this.getGrammarProgram()
  }

  getKeywordUsage(filepath = "") {
    // returns a report on what keywords from its language the program uses
    const usage = new TreeNode()
    const grammarProgram = this.getGrammarProgram()
    const keywordDefinitions = grammarProgram.getKeywordDefinitions()
    keywordDefinitions.forEach(child => {
      usage.appendLine([child.getId(), "line-id", "keyword", child.getNodeColumnTypes().join(" ")].join(" "))
    })
    const programNodes = this.getTopDownArray()
    programNodes.forEach((programNode, lineNumber) => {
      const def = programNode.getDefinition()
      const keyword = def.getId()
      const stats = usage.getNode(keyword)
      stats.appendLine([filepath + "-" + lineNumber, programNode.getWords().join(" ")].join(" "))
    })
    return usage
  }

  getInPlaceSyntaxTree() {
    return this.getTopDownArray()
      .map(child => child.getIndentation() + child.getLineSyntax())
      .join("\n")
  }

  getInPlaceSyntaxTreeWithNodeTypes() {
    return this.getTopDownArray()
      .map(child => child.constructor.name + this.getZI() + child.getIndentation() + child.getLineSyntax())
      .join("\n")
  }

  // todo: refine and make public
  protected _getSyntaxTreeHtml() {
    const getColor = child => {
      if (child.getLineSyntax().includes("error")) return "red"
      return "black"
    }
    const zip = (a1, a2) => {
      let last = a1.length > a2.length ? a1.length : a2.length
      let parts = []
      for (let index = 0; index < last; index++) {
        parts.push(`${a1[index]}:${a2[index]}`)
      }
      return parts.join(" ")
    }
    return this.getTopDownArray()
      .map(
        child =>
          `<div style="white-space: pre;">${
            child.constructor.name
          } ${this.getZI()} ${child.getIndentation()} <span style="color: ${getColor(child)};">${zip(
            child.getLineSyntax().split(" "),
            child.getLine().split(" ")
          )}</span></div>`
      )
      .join("")
  }

  getTreeWithNodeTypes() {
    return this.getTopDownArray()
      .map(child => child.constructor.name + this.getZI() + child.getIndentation() + child.getLine())
      .join("\n")
  }

  private _cache_typeTree

  getWordTypeAtPosition(lineIndex: number, wordIndex: number) {
    this._initWordTypeCache()
    const typeNode = this._cache_typeTree.getTopDownArray()[lineIndex - 1]
    return typeNode ? typeNode.getWord(wordIndex - 1) : ""
  }

  private _cache_programWordTypeStringMTime

  protected _initWordTypeCache() {
    const treeMTime = this.getTreeMTime()
    if (this._cache_programWordTypeStringMTime === treeMTime) return undefined

    this._cache_typeTree = new TreeNode(this.getInPlaceSyntaxTree())
    this._cache_programWordTypeStringMTime = treeMTime
  }

  getCompiledProgramName(programPath) {
    const grammarProgram = this.getDefinition()
    return programPath.replace(`.${grammarProgram.getExtensionName()}`, `.${grammarProgram.getTargetExtension()}`)
  }
}

export default AbstractRuntimeProgram
