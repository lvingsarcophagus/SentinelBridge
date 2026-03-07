/**
 * Type definitions for Chainlink Runtime Environment (CRE)
 * These are local type stubs when @chainlink/cre is not available via npm
 */
export interface Result<T> {
    ok: boolean;
    value?: T;
    error?: string;
}
export interface EVM {
    read(params: {
        chainId: number;
        contractAddress: string;
        functionName: string;
        abi: any;
        args: any[];
    }): Promise<Result<any>>;
    call(params: {
        chainId: number;
        contractAddress: string;
        functionName: string;
        abi: any;
        args: any[];
    }): Promise<Result<string>>;
}
export interface WorkflowContext {
    evm: EVM;
    log: typeof Log;
    state?: any;
}
export declare class Log {
    static info(message: string): void;
    static warn(message: string): void;
    static error(message: string): void;
    static debug(message: string): void;
}
export interface WorkflowExport {
    onInit?: (context: WorkflowContext) => Promise<void>;
    onEvent?: (context: WorkflowContext) => Promise<void>;
    onClose?: (context: WorkflowContext) => Promise<void>;
    onError?: (context: WorkflowContext, error: Error) => Promise<void>;
}
export declare class Workflow {
    static export(config: WorkflowExport): WorkflowExport;
}
//# sourceMappingURL=types.d.ts.map