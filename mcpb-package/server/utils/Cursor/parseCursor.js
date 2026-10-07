"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const toString_1 = require("../toString");
function parseCursorPagination(query) {
    const requestedLimit = parseInt((0, toString_1.str)(query.limit) || "10", 10) || 10;
    const limit = Math.min(100, Math.max(1, requestedLimit));
    const cursor = query.cursor ? (0, toString_1.str)(query.cursor) : undefined;
    return {
        limit,
        cursor,
    };
}
exports.default = parseCursorPagination;
