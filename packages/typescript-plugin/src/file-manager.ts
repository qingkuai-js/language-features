// import type TS from "typescript"

// import type { TypescriptAdapter } from "qingkuai-language-service/adapters"

// export class QingkuaiFileManager {
//     private dirtyProjects = new WeakSet<TS.server.Project>()
//     private store = new WeakMap<TS.server.Project, string[]>()

//     constructor(
//         private ts: typeof TS,
//         private adapter: TypescriptAdapter
//     ) {}

//     markAsDirty() {
//         this.adapter.projectService.openClientFile
//         this.adapter.forEachProject(project => {
//             this.dirtyProjects.add(project)
//         })
//         this.adapter.markProjectsAsDirty()
//     }

//     getProjectExternalFiles(project: TS.server.Project) {
//         if (!this.store.has(project) || this.dirtyProjects.has(project)) {
//             // @ts-expect-error: access private property
//             project.directoryStructureHost.clearCache()

//             this.dirtyProjects.delete(project)
//             this.loadProjectFiles(project)
//         }
//         return this.store.get(project)!
//     }

//     private loadProjectFiles(project: TS.server.Project) {
//         const config = this.ts.readJsonConfigFile(
//             project.getProjectName(),
//             project.readFile.bind(project)
//         )
//         const parseHost: TS.ParseConfigHost = {
//             fileExists(path) {
//                 return project.fileExists(path)
//             },
//             readFile(path) {
//                 return project.readFile(path)
//             },
//             readDirectory(...args) {
//                 args[1] = [".qk"]
//                 return project.readDirectory(...args)
//             },
//             get useCaseSensitiveFileNames() {
//                 return project.useCaseSensitiveFileNames()
//             }
//         }
//         const parsed = this.ts.parseJsonSourceFileConfigFileContent(
//             config,
//             parseHost,
//             project.getCurrentDirectory()
//         )
//         this.store.set(project, parsed.fileNames)
//     }
// }
