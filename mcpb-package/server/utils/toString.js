"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.str = void 0;
const str = (value) => {
    if (typeof value === "string")
        return value;
    if (Array.isArray(value) && typeof value[0] === "string")
        return value[0];
    return "";
};
exports.str = str;
