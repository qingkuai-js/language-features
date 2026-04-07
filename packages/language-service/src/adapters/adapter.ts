import type TS from "typescript"

import type {
    GetQingkuaiConfigFunc,
    GetUserPreferencesFunc,
    CompileIntermidiateFunc,
    GetFormattingOptionsFunc,
    UpdateQingkuaiFileContentFunc
} from "../types/service"
import type {
    UpdateContentParams,
    GetCompletionsParms,
    SignatureHelpParams,
    ResolveCompletionParams,
    TPICCommonRequestParams
} from "../../../../types/communication"
import type { QingkuaiFileInfo } from "./file"
import type { Logger } from "../../../../shared-util/log"
import type { AdapterTsProject, AdapterTsProjectService } from "../types/adapter"
import type { AdapterFS, AdapterPath, TsNormalizedPath } from "../../../../types/common"

import { setState } from "./state"
import { proxyProject } from "./proxies"
import { getNavigationTree } from "./convert/navtree"
import { getComponentInfos } from "./convert/component"
import { getAndConvertHoverTip } from "./convert/hover"
import { LocationConvertor } from "./convert/localtions"
import { getAndConvertReferences } from "./convert/reference"
import { getAndConvertDiagnostics } from "./convert/diagnostic"
import { confirmTypesForCompileResult } from "./convert/content"
import { getAndConvertSignatureHelp } from "./convert/signature"
import { isQingkuaiFileName } from "../../../../shared-util/assert"
import { ensureGetQingkuaiFileInfo, updateQingkuaiFile } from "./file"
import { findAndConvertImplementations } from "./convert/implementation"
import { getAndConvertDefinitions, getAndConvertTypeDefinitions } from "./convert/definition"
import { getAndConvertCompletionDetail, getAndConvertCompletionInfo } from "./convert/completion"
import { getAndConvertPrepareRenameLocation, getAndConvertRenameLocations } from "./convert/rename"

export class TypescriptAdapter {
    private initialized = false

    public service = new AdapterService(this)
    public qingkuaiFileInfos = new Map<TsNormalizedPath, QingkuaiFileInfo>()

    // qingkuai 文件导入映射，导入方文件名 -> 被导入的 qingkuai 文件名列表
    public resolvedQingkuaiModules = new Map<TsNormalizedPath, Set<string>>()

    constructor(
        public ts: typeof TS,
        public logger: Logger,
        public fs: AdapterFS,
        public path: AdapterPath,
        public compile: CompileIntermidiateFunc,
        public projectService: AdapterTsProjectService,
        public getQingkuaiConfig: GetQingkuaiConfigFunc,
        public updateContent: UpdateQingkuaiFileContentFunc,
        public getUserPreferences: GetUserPreferencesFunc,
        public getFormattingOptions: GetFormattingOptionsFunc
    ) {
        setState({ ts })
    }

    // 确定所有 qingkuai 文件的 Props、Refs 以及 Slots 类型定义
    initilize() {
        if (this.initialized) {
            return
        }
        for (const [_, fileInfo] of this.qingkuaiFileInfos) {
            if (!fileInfo.typesConfirmed) {
                confirmTypesForCompileResult(this, fileInfo)
            }
        }
        this.initialized = true
    }

    markProjectsAsDirty() {
        this.forEachProject(project => {
            // @ts-expect-error: access private method
            project.markAsDirty?.()
        })
    }

    forEachProject(callback: (project: TS.server.Project) => void) {
        this.projectService.forEachProject?.(callback)
    }

    proxyProject(project: AdapterTsProject) {
        proxyProject(this, project)
    }

    getNormalizedPath(fileName: string) {
        return this.ts.server.toNormalizedPath(fileName)
    }

    getDefaultSourceFile(path: TsNormalizedPath) {
        return this.getDefaultProgram(path)?.getSourceFile(path)
    }

    getDefaultProgram(path: TsNormalizedPath) {
        return this.getDefaultLanguageService(path)?.getProgram()
    }

    getDefaultLanguageService(path: TsNormalizedPath) {
        return this.getDefaultProject(path)?.getLanguageService()
    }

    getDefaultProject(path: TsNormalizedPath) {
        return this.projectService.getDefaultProjectForFile(path, false)
    }
}

class AdapterService {
    constructor(private adapter: TypescriptAdapter) {}

    // 获取引用指定文件的文件名列表
    getFileReferences(
        fileName: string,
        options?: {
            recursive?: boolean
            justOpening?: boolean
        }
    ) {
        const referenceFileNames = new Set<string>()
        const find = (by: string) => {
            this.adapter.forEachProject(project => {
                const languageService = project.getLanguageService()
                languageService.getFileReferences(by).forEach(entry => {
                    if (!options?.justOpening || this.isFileOpening(entry.fileName)) {
                        referenceFileNames.add(entry.fileName)
                    }
                    if (options?.recursive) {
                        find(entry.fileName)
                    }
                })
            })
        }
        return (find(fileName), Array.from(referenceFileNames))
    }

    isFileOpening(fileName: string) {
        if (isQingkuaiFileName(fileName)) {
            return this.adapter.service.ensureGetQingkuaiFileInfo(fileName).isOpen
        }
        return this.adapter.projectService.openFiles.has(
            this.adapter.projectService.toPath(fileName)
        )
    }

    createLocationConvertor(fileName: string) {
        return new LocationConvertor(this.adapter, fileName)
    }

    getHoverTip(params: TPICCommonRequestParams) {
        return getAndConvertHoverTip(this.adapter, params)
    }

    getDiagnostics(fileName: string) {
        return getAndConvertDiagnostics(this.adapter, fileName)
    }

    getNavigationTree(fileName: string) {
        return getNavigationTree(this.adapter, fileName)
    }

    getSignatureHelp(params: SignatureHelpParams) {
        return getAndConvertSignatureHelp(this.adapter, params)
    }

    getImplementations(params: TPICCommonRequestParams) {
        return findAndConvertImplementations(this.adapter, params)
    }

    getReferences(params: TPICCommonRequestParams) {
        return getAndConvertReferences(this.adapter, params)
    }

    getDefinitions(params: TPICCommonRequestParams) {
        return getAndConvertDefinitions(this.adapter, params)
    }

    getTypeDefinitions(params: TPICCommonRequestParams) {
        return getAndConvertTypeDefinitions(this.adapter, params)
    }

    getCompletionInfo(params: GetCompletionsParms) {
        return getAndConvertCompletionInfo(this.adapter, params)
    }

    getCompletionDetail(params: ResolveCompletionParams) {
        return getAndConvertCompletionDetail(this.adapter, params)
    }

    getRenameLocations(params: TPICCommonRequestParams) {
        return getAndConvertRenameLocations(this.adapter, params)
    }

    getAndConvertPrepareRenameLocation(params: TPICCommonRequestParams) {
        return getAndConvertPrepareRenameLocation(this.adapter, params)
    }

    getComponentInfos(fileName: string) {
        return getComponentInfos(this.adapter, this.adapter.getNormalizedPath(fileName))
    }

    updateQingkuaiFile(params: UpdateContentParams) {
        return updateQingkuaiFile(this.adapter, params)
    }

    ensureGetQingkuaiFileInfo(fileName: string) {
        return ensureGetQingkuaiFileInfo(this.adapter, this.adapter.getNormalizedPath(fileName))
    }
}
