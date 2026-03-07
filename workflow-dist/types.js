"use strict";
/**
 * Type definitions for Chainlink Runtime Environment (CRE)
 * These are local type stubs when @chainlink/cre is not available via npm
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Workflow = exports.Log = void 0;
class Log {
    static info(message) {
        console.log(`[INFO] ${message}`);
    }
    static warn(message) {
        console.warn(`[WARN] ${message}`);
    }
    static error(message) {
        console.error(`[ERROR] ${message}`);
    }
    static debug(message) {
        console.debug(`[DEBUG] ${message}`);
    }
}
exports.Log = Log;
class Workflow {
    static export(config) {
        return config;
    }
}
exports.Workflow = Workflow;
//# sourceMappingURL=types.js.map