export class PathResolver {
    constructor(fileSeparator?: any, workingDir?: any);
    fileSeparator: any;
    workingDir: any;
    _partitionPathSys: {};
    _partitionPathWeb: {};
    absolutePath(path: any): any;
    root(path: any): any;
    unc(path: any): any;
    webRoot(path: any): any;
    descendsFrom(path: any, base: any): any;
    relativePath(path: any, base: any): any;
    posixify(path: any): any;
    posixfy(path: any): any;
    expandPath(path: any): any;
    partitionPath(path: any, web?: boolean): any;
    joinPath(segments: any, root?: any): any;
    systemPath(target: any, start?: any, jail?: any, opts?: {}): any;
    webPath(target: any, start?: any): any;
    _extractUriPrefix(str: any): any;
}
