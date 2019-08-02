import jTreeTypes from "../core/jTreeTypes"

const jtree = require("../index.js")
const stump = require("../langs/stump/stump.js")
const hakon = require("../langs/hakon/hakon.js")
// const { AbstractWillowProgram } = require("./Willow.js")

abstract class AbstractCommander {
  private _target: any
  constructor(target: AbstractTreeComponent) {
    this._target = target
  }

  getTarget() {
    return this._target
  }
}

abstract class AbstractTheme {
  hakonToCss(str: string) {
    const hakonProgram = new hakon(str)
    // console.log(hakonProgram.getAllErrors())
    return hakonProgram.compile()
  }
}

class DefaultTheme extends AbstractTheme {}

// todo: cleanup
interface reasonForUpdatingOrNot {
  shouldUpdate: boolean
  reason: string
  staleTime?: number
  dependency?: AbstractTreeComponent
  lastRenderedTime?: number
  mTime?: number
}

interface childShouldUpdateResult {
  child: AbstractTreeComponent
  childUpdateBecause: reasonForUpdatingOrNot
}

/** Declaration file generated by dts-gen */
// Todo: clean up declaration file generation
declare class abstractHtmlTag extends jtree.GrammarBackedNonRootNode {
  constructor(...args: any[])
  addClassToStumpNode(...args: any[]): void
  findStumpNodeByChild(...args: any[]): void
  findStumpNodeByChildString(...args: any[]): void
  findStumpNodeByFirstWord(...args: any[]): void
  findStumpNodesByChild(...args: any[]): void
  findStumpNodesWithClass(...args: any[]): void
  getNodeByGuid(...args: any[]): void
  getShadow(...args: any[]): void
  getShadowClass(...args: any[]): void
  getStumpNodeAttr(...args: any[]): void
  getStumpNodeTreeComponent(...args: any[]): void
  getStumpNodeCss(...args: any[]): void
  getTag(...args: any[]): void
  insertChildNode(...args: any[]): abstractHtmlTag
  insertCssChildNode(...args: any[]): abstractHtmlTag
  isInputType(...args: any[]): void
  isStumpNodeCheckbox(...args: any[]): void
  removeClassFromStumpNode(...args: any[]): void
  removeCssStumpNode(...args: any[]): void
  removeStumpNode(...args: any[]): void
  setStumpNodeAttr(...args: any[]): void
  setStumpNodeTreeComponent(...args: any[]): void
  setStumpNodeCss(...args: any[]): void
  shouldCollapse(...args: any[]): void
  stumpNodeHasClass(...args: any[]): void
  toHtmlWithSuids(...args: any[]): void
}

class TreeComponentCommander extends AbstractCommander {
  stopPropagationCommand() {
    // intentional noop
  }

  async clearMessageBufferCommand() {
    const treeComponent = this.getTarget()
    delete treeComponent._messageBuffer
  }

  async unmountAndDestroyCommand() {
    const treeComponent = this.getTarget()
    treeComponent.unmountAndDestroy()
  }
}

abstract class AbstractTreeComponent extends jtree.GrammarBackedNonRootNode {
  private _commandsBuffer: jTreeTypes.treeNode[]
  private _messageBuffer: jTreeTypes.treeNode
  private _htmlStumpNode: abstractHtmlTag
  private _cssStumpNode: abstractHtmlTag
  private _lastRenderedTime: number
  private _lastTimeToRender: number
  static _mountedTreeComponents = 0

  getParseErrorCount() {
    if (!this.length) return 0
    return this.getTopDownArray()
      .map(child => child.getParseErrorCount())
      .reduce((sum, num) => sum + num)
  }

  getRootNode(): AbstractTreeComponentRootNode {
    return <AbstractTreeComponentRootNode>super.getRootNode()
  }

  getCommander() {
    return new TreeComponentCommander(this)
  }

  getStumpNode() {
    return this._htmlStumpNode
  }

  getHakon() {
    return ""
  }

  getTheme(): AbstractTheme {
    return this.getRootNode().getTheme()
  }

  getCommandsBuffer() {
    if (!this._commandsBuffer) this._commandsBuffer = []
    return this._commandsBuffer
  }

  addToCommandLog(command: string) {
    this.getCommandsBuffer().push({
      command: command,
      time: this._getProcessTimeInMilliseconds()
    })
  }

  getMessageBuffer() {
    if (!this._messageBuffer) this._messageBuffer = new jtree.TreeNode()
    return this._messageBuffer
  }

  // todo: move this to tree class? or other higher level class?
  addStumpCodeMessageToLog(message: string) {
    // note: we have 1 parameter, and are going to do type inference first.
    // Todo: add actions that can be taken from a message?
    // todo: add tests
    this.getMessageBuffer().appendLineAndChildren("message", message)
  }

  addStumpErrorMessageToLog(errorMessage: string) {
    return this.addStumpCodeMessageToLog(`div
 class OhayoError
 bern${jtree.TreeNode.nest(errorMessage, 2)}`)
  }

  logMessageText(message = "") {
    const pre = `pre
 bern${jtree.TreeNode.nest(message, 2)}`
    return this.addStumpCodeMessageToLog(pre)
  }

  unmount(): any {
    if (
      !this.isMounted() // todo: why do we need this check?
    )
      return undefined
    this._getChildTreeComponents().forEach(child => child.unmount())
    this.treeComponentWillUnmount()
    this._removeCss()
    this._removeHtml()
    delete this._lastRenderedTime
    this.treeComponentDidUnmount()
  }

  _removeHtml() {
    this._htmlStumpNode.removeStumpNode()
    delete this._htmlStumpNode
  }

  getStumpCode() {
    return `div
 class ${this.constructor.name}`
  }

  treeComponentWillMount() {}

  treeComponentDidMount() {
    AbstractTreeComponent._mountedTreeComponents++
  }

  treeComponentDidUnmount() {
    AbstractTreeComponent._mountedTreeComponents--
  }

  treeComponentWillUnmount() {}

  forceUpdate() {}

  getNewestTimeToRender() {
    return this._lastTimeToRender
  }

  _setLastRenderedTime(time: number) {
    this._lastRenderedTime = time
    return this
  }

  // todo: can this be async?
  treeComponentDidUpdate() {}

  _getChildTreeComponents() {
    return this.getChildrenByNodeConstructor(AbstractTreeComponent)
  }

  // todo: delete this
  makeAllDirty() {
    this.makeDirty()
    this._getChildTreeComponents().forEach(child => child.makeAllDirty())
  }

  _hasChildrenTreeComponents() {
    return this._getChildTreeComponents().length > 0
  }

  // todo: this is hacky. we do it so we can just mount all tiles to wall.
  getStumpNodeForChildren() {
    return this.getStumpNode()
  }

  _getLastRenderedTime() {
    return this._lastRenderedTime
  }

  // todo: delete this
  makeDirty() {
    this._setLastRenderedTime(0)
  }

  _getCss() {
    return this.getTheme().hakonToCss(this.getHakon())
  }

  _getCssStumpCode() {
    return `styleTag
 stumpStyleFor ${this.constructor.name}
 bern${jtree.TreeNode.nest(this._getCss(), 2)}`
  }

  isNotATile() {
    // quick hacky way to get around children problem
    return true
  }

  _updateAndGetUpdateResult() {
    if (!this._shouldTreeComponentUpdate()) return { treeComponentDidUpdate: false, reason: "_shouldTreeComponentUpdate is false" }

    this._setLastRenderedTime(this._getProcessTimeInMilliseconds())
    this._removeCss()
    this._mountCss()
    // todo: fucking switch to react? looks like we don't update parent because we dont want to nuke children.
    // okay. i see why we might do that for non tile treeComponents. but for Tile treeComponents, seems like we arent nesting, so why not?
    // for now
    if (this.isNotATile() && this._hasChildrenTreeComponents()) return { treeComponentDidUpdate: false, reason: "is a parent" }

    this.updateHtml()

    this._lastTimeToRender = this._getProcessTimeInMilliseconds() - this._getLastRenderedTime()
    return { treeComponentDidUpdate: true }
  }

  _getWrappedStumpCode(index: number) {
    return this.getStumpCode()
  }

  updateHtml() {
    const stumpNodeToMountOn = <abstractHtmlTag>this._htmlStumpNode.getParent()
    const index = this._htmlStumpNode.getIndex()
    this._removeHtml()
    this._mountHtml(stumpNodeToMountOn, index)
  }

  unmountAndDestroy() {
    this.unmount()
    return this.destroy()
  }

  // todo: move to keyword node class?
  toggle(firstWord: string, contentOptions: string[]) {
    const currentNode = <AbstractTreeComponent>this.getNode(firstWord)
    if (!contentOptions) return currentNode ? currentNode.unmountAndDestroy() : this.appendLine(firstWord)
    const currentContent = currentNode === undefined ? undefined : currentNode.getContent()

    const index = contentOptions.indexOf(currentContent)
    const newContent = index === -1 || index + 1 === contentOptions.length ? contentOptions[0] : contentOptions[index + 1]

    this.delete(firstWord)
    if (newContent) this.touchNode(firstWord).setContent(newContent)
    return newContent
  }

  isMounted() {
    return !!this._htmlStumpNode
  }

  // todo: move to base TreeNode?
  getNextOrPrevious(arr: AbstractTreeComponent[]) {
    const length = arr.length
    const index = arr.indexOf(this)
    if (length === 1) return undefined
    if (index === length - 1) return arr[index - 1]
    return arr[index + 1]
  }

  toggleAndRender(firstWord: string, contentOptions: string[]) {
    this.toggle(firstWord, contentOptions)
    this.getRootNode().renderAndGetRenderResult()
  }

  _getFirstOutdatedDependency(lastRenderedTime = this._getLastRenderedTime() || 0) {
    return this.getDependencies().find(dep => dep.getMTime() > lastRenderedTime)
  }

  _getReasonForUpdatingOrNot(): reasonForUpdatingOrNot {
    const mTime = this.getMTime()
    const lastRenderedTime = this._getLastRenderedTime() || 0
    const staleTime = mTime - lastRenderedTime
    if (lastRenderedTime === 0)
      return {
        shouldUpdate: true,
        reason: "TreeComponent hasn't been rendered yet",
        staleTime: staleTime
      }

    if (staleTime > 0)
      return {
        shouldUpdate: true,
        reason: "TreeComponent itself changed",
        staleTime: staleTime
      }

    const outdatedDependency = this._getFirstOutdatedDependency(lastRenderedTime)
    if (outdatedDependency)
      return {
        shouldUpdate: true,
        reason: "A dependency changed",
        dependency: outdatedDependency,
        staleTime: outdatedDependency.getMTime() - lastRenderedTime
      }
    return {
      shouldUpdate: false,
      reason: "No render needed",
      lastRenderedTime: lastRenderedTime,
      mTime: mTime
    }
  }

  getDependencies(): AbstractTreeComponent[] {
    return []
  }

  getChildrenThatNeedRendering() {
    const all: childShouldUpdateResult[] = []
    this._getTreeComponentsThatNeedRendering(all)
    return all
  }

  _shouldTreeComponentUpdate() {
    return this._getReasonForUpdatingOrNot().shouldUpdate
  }

  _getTreeComponentsThatNeedRendering(arr: childShouldUpdateResult[]) {
    this._getChildTreeComponents().forEach((child: AbstractTreeComponent) => {
      if (!child.isMounted() || child._shouldTreeComponentUpdate()) arr.push({ child: child, childUpdateBecause: child._getReasonForUpdatingOrNot() })
      child._getTreeComponentsThatNeedRendering(arr)
    })
  }

  _mount(stumpNodeToMountOn: abstractHtmlTag, index: number) {
    this._setLastRenderedTime(this._getProcessTimeInMilliseconds())

    this.treeComponentWillMount()

    this._mountCss()
    this._mountHtml(stumpNodeToMountOn, index) // todo: add index back?

    this._lastTimeToRender = this._getProcessTimeInMilliseconds() - this._getLastRenderedTime()
    return this
  }

  // todo: we might be able to squeeze virtual dom in here on the mountCss and mountHtml methods.
  _mountCss() {
    // todo: only insert css once per class? have a set?
    this._cssStumpNode = this._getPageHeadStump().insertCssChildNode(this._getCssStumpCode())
  }

  _getPageHeadStump(): abstractHtmlTag {
    return this.getRootNode()
      .getWillowProgram()
      .getHeadStumpNode()
  }

  _removeCss() {
    this._cssStumpNode.removeCssStumpNode()
    delete this._cssStumpNode
  }

  _mountHtml(stumpNodeToMountOn: abstractHtmlTag, index: number) {
    this._htmlStumpNode = stumpNodeToMountOn.insertChildNode(this._getWrappedStumpCode(index), index)
    if (!this._htmlStumpNode.setStumpNodeTreeComponent) console.log(this._htmlStumpNode)
    this._htmlStumpNode.setStumpNodeTreeComponent(this)
  }

  _treeComponentDidUpdate() {
    this.treeComponentDidUpdate()
  }

  _treeComponentDidMount() {
    this.treeComponentDidMount()
  }

  compile() {
    const name = this.constructor.name
    const libPath = "../../dist/"
    const libs = ["jtree.browser.js", "stump.browser.js", "hakon.browser.js", "treeComponentFramework.browser.js", this.constructor.name + ".browser.js"]
      .map(
        path =>
          `  script
   src ${libPath}${path}`
      )
      .join("\n")
    return new stump(`html
 head
  titleTag ${name}
 body
  script
   src ../../sandbox/lib/jquery.min.js
  script
   src ../../node_modules/miuri.js/lib/miuri.min.js
${libs}
  script
   bern
    WillowBrowserProgram.startApp(${name}, "footer")`).compile()
  }

  renderAndGetRenderResult(stumpNode?: abstractHtmlTag, index?: number) {
    const isUpdateOp = this.isMounted()
    let treeComponentUpdateResult = {
      treeComponentDidUpdate: false
    }
    if (isUpdateOp) treeComponentUpdateResult = this._updateAndGetUpdateResult()
    else this._mount(stumpNode, index)

    const stumpNodeForChildren = this.getStumpNodeForChildren()

    // Todo: insert delayed rendering?
    const childResults = this._getChildTreeComponents().map((child, index) => child.renderAndGetRenderResult(stumpNodeForChildren, index))

    if (isUpdateOp) {
      if (treeComponentUpdateResult.treeComponentDidUpdate) {
        try {
          this._treeComponentDidUpdate()
        } catch (err) {
          console.error(err)
        }
      }
    } else {
      try {
        this._treeComponentDidMount()
      } catch (err) {
        console.error(err)
      }
    }

    return {
      type: isUpdateOp ? "update" : "mount",
      treeComponentUpdateResult: treeComponentUpdateResult,
      children: childResults
    }
  }
}

class AbstractTreeComponentRootNode extends AbstractTreeComponent {
  private _willowProgram: any
  private _theme: AbstractTheme

  getTheme(): AbstractTheme {
    if (!this._theme) this._theme = new DefaultTheme()
    return this._theme
  }

  getWillowProgram() {
    if (!this._willowProgram) {
      if (this.isNodeJs()) {
        const { WillowProgram } = require("./WillowNode.js")
        this._willowProgram = new WillowProgram("http://localhost:8000/")
      } else {
        this._willowProgram = new (<any>window).WillowBrowserProgram(window.location.href)
      }
    }
    return this._willowProgram
  }
}

export { AbstractTreeComponentRootNode, AbstractTreeComponent, AbstractCommander }