#! /usr/bin/env node

const jtree = require("../index.js")
const { TreeNode, GrammarProgram, Utils } = jtree
const fs = require("fs")
const recursiveReadSync = require("recursive-readdir-sync")

import { homedir } from "os"
import jTreeTypes from "../core/jTreeTypes"

class CLI {
  constructor(grammarsPath = homedir() + "/grammars.ssv", cwd = process.cwd()) {
    this._grammarsPath = grammarsPath
    this._initFile(grammarsPath, "name filepath")
    this._reload() // todo: cleanup
    this._cwd = cwd
  }

  private _grammarsPath: jTreeTypes.filepath
  private _cwd: jTreeTypes.filepath
  private _grammarsTree: jTreeTypes.treeNode

  _getRegistryPath() {
    return this._grammarsPath
  }

  // todo: cleanup.
  _reload() {
    this._grammarsTree = TreeNode.fromSsv(this._read(this._grammarsPath)) // todo: index on name, or build a Tree Grammar lang
  }

  build(commandName: string, argument: any) {
    let dir = Utils._removeLastSlash(this._cwd) + "/"
    let filePath = ""
    while (dir !== "/") {
      filePath = dir + "builder.js"
      if (fs.existsSync(filePath)) break
      dir = Utils._getParentFolder(dir)
    }
    if (!fs.existsSync(filePath)) throw new Error(`No '${filePath}' found.`)
    const builderConstructor = require(filePath)
    const builder = new builderConstructor()
    if (commandName) return builder[commandName](argument)
    else return builder._help(filePath)
  }

  combine(grammarName: jTreeTypes.grammarName) {
    const content = this.programs(grammarName)
      .split(" ")
      .map(path => {
        const distributeLine = true ? `#file ${path}\n` : ""
        return distributeLine + " " + this._read(path).replace(/\n/g, "\n ")
      })
      .join("\n")

    return new TreeNode(content).toString()
  }

  distribute(combinedFilePath: jTreeTypes.filepath) {
    if (!combinedFilePath) throw new Error(`No combinedFilePath provided`)
    const masterFile = new TreeNode(this._read(combinedFilePath))
    return masterFile.split("#file").map((file: jTreeTypes.treeNode) => {
      const firstLine = file.nodeAt(0)
      if (firstLine.getFirstWord() !== "#file") return undefined
      const filepath = firstLine.getWord(1)

      const needsShift = !firstLine.length
      if (needsShift) firstLine.shiftYoungerSibsRight()

      this._write(filepath, firstLine.childrenToString())
      return filepath
    })
  }

  _initFile(path: jTreeTypes.filepath, initialString = "") {
    if (!fs.existsSync(path)) this._write(path, initialString)
  }

  _write(path: jTreeTypes.filepath, content: string) {
    return fs.writeFileSync(path, content, "utf8")
  }

  _read(path: jTreeTypes.filepath) {
    return fs.readFileSync(path, "utf8")
  }

  // todo: improve or remove
  cases(folder: jTreeTypes.filepath, grammarName: jTreeTypes.grammarName) {
    const files = recursiveReadSync(folder).filter((file: jTreeTypes.filepath) => file.endsWith("." + grammarName))
    const grammarProgram = this._getGrammarProgramRoot(grammarName)
    files.map((filename: jTreeTypes.filepath) => {
      const errors = this._check(filename)
      if (errors.length) {
        throw new Error(`Type check errors ${errors}`)
      }
      const actual = this.compile(filename)
      const expectedPath = filename.replace("." + grammarName, ".compiled")
      const expected = this._read(expectedPath)
      if (expected !== actual) {
        const errorTree = new TreeNode()
        errorTree.appendLineAndChildren("expected", expected)
        errorTree.appendLineAndChildren("actual", actual)
        throw new Error("Compile Errors\n" + errorTree.toString())
      }
      console.log(`${filename} passed`)
    })
  }

  getGrammars() {
    return this._grammarsTree
  }

  help() {
    const help = this._read(__dirname + "/help.ssv")
    return TreeNode.fromSsv(help).toTable()
  }

  base(folderPath: jTreeTypes.asboluteFolderPath = undefined, port = 4444) {
    const { TreeBaseFolder } = require("../treeBase/TreeBase.js")
    if (!folderPath) {
      folderPath = require("path").resolve(__dirname + "/../treeBase/planets/")
      console.log(`No path to a TreeBase folder provided. Defaulting to '${folderPath}'`)
    }
    new TreeBaseFolder(undefined, folderPath).startExpressApp(port)
  }

  list() {
    const grammars = this.getGrammars().clone()
    grammars.sortBy("name")
    return `${grammars.length} Tree Grammars registered in ${this._getRegistryPath()}
${grammars.toTable()}`
  }

  isRegistered(grammarName: jTreeTypes.grammarName) {
    return this.getGrammars().where("name", "=", grammarName).length === 1
  }

  _getGrammarPathByGrammarNameOrThrow(grammarName: jTreeTypes.grammarName) {
    const node = this.getGrammars().getNodeByColumns("name", grammarName)

    if (!node) throw new Error(`No registered grammar named '${grammarName}'. Registered grammars are ${this._getRegisteredGrammarNames().join(",")}`)

    return node.getParent().get("filepath")
  }

  create() {
    jtree.executeFile(__dirname + "/create.stamp", this._getGrammarPathByGrammarNameOrThrow("stamp"))
  }

  check(programPath: jTreeTypes.treeProgramFilePath) {
    return this._checkAndLog(programPath)
  }

  checkAll(grammarName: jTreeTypes.grammarName) {
    const files = this._history(grammarName)
    return files.map(file => this._checkAndLog(file)).join("\n")
  }

  _checkAndLog(programPath: jTreeTypes.treeProgramFilePath) {
    const errors = this._check(programPath)
    return `${errors.length} errors for ${programPath}${errors.length ? "\n" + errors.join("\n") : ""}`
  }

  _check(programPath: jTreeTypes.treeProgramFilePath) {
    const grammarPath = this._getGrammarPathOrThrow(programPath)
    const program = jtree.makeProgram(programPath, grammarPath)
    return program.getAllErrors().map((err: any) => err.getMessage())
  }

  _getRegisteredGrammarNames() {
    return this.getGrammars().getColumn("name")
  }

  _getGrammarPathOrThrow(programPath: jTreeTypes.treeProgramFilePath) {
    const extension = Utils.getFileExtension(programPath)
    return this._getGrammarPathByGrammarNameOrThrow(extension)
  }

  sandbox(port = 3333) {
    const { SandboxServer } = require("../sandbox/server/SandboxServer.js")
    const server = new SandboxServer()
    server.start(port)
    return `Starting sandbox on port ${port}`
  }

  prettify(programPath: jTreeTypes.treeProgramFilePath) {
    const programConstructor = jtree.getProgramConstructor(this._getGrammarPathOrThrow(programPath))
    const program = new programConstructor(this._read(programPath))
    const original = program.toString()
    const pretty = program.sortNodesByInScopeOrder().getSortedByInheritance()
    this._write(programPath, pretty)
    return original === pretty ? "No change" : "File updated"
  }

  parse(programPath: jTreeTypes.treeProgramFilePath) {
    const programConstructor = jtree.getProgramConstructor(this._getGrammarPathOrThrow(programPath))
    const program = new programConstructor(this._read(programPath))
    return program.getParseTable(35)
  }

  sublime(grammarName: jTreeTypes.grammarName, outputDirectory: jTreeTypes.asboluteFolderPath = ".") {
    const grammarPath = this._getGrammarPathByGrammarNameOrThrow(grammarName)
    const grammarProgram = new GrammarProgram(fs.readFileSync(grammarPath, "utf8"))
    const outputPath = outputDirectory + `/${grammarProgram.getExtensionName()}.sublime-syntax`

    this._write(outputPath, grammarProgram.toSublimeSyntaxFile())
    return `Saved: ${outputPath}`
  }

  _getGrammarProgramRoot(grammarName: jTreeTypes.grammarName) {
    const grammarPath = this._getGrammarPathByGrammarNameOrThrow(grammarName)
    return new GrammarProgram(this._read(grammarPath))
  }

  compile(programPath: jTreeTypes.treeProgramFilePath) {
    // todo: allow user to provide destination
    const grammarPath = this._getGrammarPathOrThrow(programPath)
    const program = jtree.makeProgram(programPath, grammarPath)
    const grammarProgram = new GrammarProgram(this._read(grammarPath))
    return program.compile()
  }

  _getLogFilePath() {
    return homedir() + "/history.ssv"
  }

  programs(grammarName: jTreeTypes.grammarName) {
    return this._history(grammarName).join(" ")
  }

  allHistory() {
    return this._getHistoryFile()
  }

  _getHistoryFile() {
    this._initFile(this._getLogFilePath(), "command paramOne paramTwo timestamp\n")
    return this._read(this._getLogFilePath())
  }

  _history(grammarName: jTreeTypes.grammarName) {
    this._getGrammarPathByGrammarNameOrThrow(grammarName)
    // todo: store history of all commands
    // todo: build language for cli history
    // todo: refactor this
    // todo: some easier one step way to get a set from a column
    // todo: add support for initing a TreeNode from a JS set and map
    const data = TreeNode.fromSsv(this._getHistoryFile())
    const files = data
      .filter((node: jTreeTypes.treeNode) => {
        const command = node.get("command")
        const filepath = node.get("paramOne")
        // make sure theres a filder and it has an extension.
        if (!filepath || !filepath.includes(".")) return false
        if (["check", "run", "", "compile"].includes(command)) return true
      })
      .map((node: jTreeTypes.treeNode) => node.get("paramOne"))
    const items = Object.keys(new TreeNode(files.join("\n")).toObject())
    return items.filter(file => file.endsWith(grammarName)).filter(file => fs.existsSync(file))
  }

  register(grammarPath: jTreeTypes.grammarFilePath) {
    const extension = this._register(grammarPath)
    return `Registered ${extension}`
  }

  _register(grammarPath: jTreeTypes.grammarFilePath) {
    // todo: create RegistryTreeLanguage. Check types, dupes, sort, etc.
    const grammarProgram = new GrammarProgram(this._read(grammarPath))
    const extension = grammarProgram.getExtensionName()
    fs.appendFileSync(this._getRegistryPath(), `\n${extension} ${grammarPath}`, "utf8")
    this._reload()
    return extension
  }

  addToHistory(one: string, two: string, three: string) {
    // everytime you run/check/compile a tree program, log it by default.
    // that way, if a language changes or you need to do refactors, you have the
    // data of file paths handy..
    // also the usage data can be used to improve the cli app
    const line = `${one || ""} ${two || ""} ${three || ""} ${Date.now()}\n`
    const logFilePath = this._getLogFilePath()
    this._initFile(logFilePath, "command paramOne paramTwo timestamp\n")
    fs.appendFile(logFilePath, line, "utf8", () => {})
  }

  async _run(programPath: jTreeTypes.treeProgramFilePath) {
    const result = await jtree.executeFile(programPath, this._getGrammarPathOrThrow(programPath))
    return result
  }

  _runSync(programPath: jTreeTypes.treeProgramFilePath) {
    return jtree.executeFileSync(programPath, this._getGrammarPathOrThrow(programPath))
  }

  async run(programPathOrGrammarName: jTreeTypes.treeProgramFilePath | jTreeTypes.grammarName) {
    if (programPathOrGrammarName.includes(".")) return this._run(programPathOrGrammarName)
    return Promise.all(this._history(programPathOrGrammarName).map(file => this._run(file)))
  }

  runSync(programPathOrGrammarName: jTreeTypes.treeProgramFilePath | jTreeTypes.grammarName) {
    if (programPathOrGrammarName.includes(".")) return this._runSync(programPathOrGrammarName)
    return this._history(programPathOrGrammarName).map(file => this._runSync(file))
  }

  usage(grammarName: jTreeTypes.grammarName) {
    const files = this._history(grammarName)
    if (!files.length) return ""
    const grammarPath = this._getGrammarPathOrThrow(files[0])
    const programConstructor = jtree.getProgramConstructor(grammarPath)
    const report = new TreeNode()
    files.forEach(path => {
      try {
        const code = this._read(path)
        const program = new programConstructor(code)
        const usage = program.getNodeTypeUsage(path)
        report.extend(usage.toString())
      } catch (err) {
        // console.log(`Error getting usage stats for program ` + path)
      }
    })
    const folderName = grammarName
    const stampFile = new TreeNode(`folder ${folderName}`)
    report.forEach((node: jTreeTypes.treeNode) => {
      const fileNode = stampFile.appendLine(`file ${folderName}/${node.getFirstWord()}.ssv`)
      fileNode.appendLineAndChildren("data", `${node.getContent()}\n` + node.childrenToString())
    })
    return stampFile.toString()
  }

  version() {
    return `jtree version ${jtree.getVersion()} installed at ${__filename}`
  }

  static async main() {
    const app = <any>new CLI()

    const action = process.argv[2]
    const paramOne = process.argv[3]
    const paramTwo = process.argv[4]
    const print = console.log

    if (app[action]) {
      app.addToHistory(action, paramOne, paramTwo)
      const result = app[action](paramOne, paramTwo)
      if (result !== undefined) print(result)
    } else if (!action) {
      app.addToHistory()
      print(app.help())
    } else if (fs.existsSync(action)) {
      app.addToHistory(undefined, action)
      const result = await app.run(action)
      print(result)
    } else print(`Unknown command '${action}'. Type 'tree help' to see available commands.`)
  }
}

module.exports = CLI

if (!module.parent) CLI.main()
