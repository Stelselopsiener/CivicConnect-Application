import { describe, it, expect } from '@jest/globals';
import { requestSchema, validate } from "../src/domain/validation.js";

const requestWithEmptyFields = {
    category: "",
    title: "",
    description: "",
    streetAddress: ""
};

describe("service request input", () => {
    it("rejects all empty fields - category, title, description, and street address must be filled in", () => {
        const result = validate(requestWithEmptyFields, requestSchema);
        
        expect(result.valid).toBe(false);
        expect(result.list.map((item) => item.field)).toEqual([
            'category', 
            'title', 
            'description', 
            'streetAddress'
        ]);
    });
});