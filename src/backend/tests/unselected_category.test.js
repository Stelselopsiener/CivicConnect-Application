const { describe, it, expect } = require("@jest/globals");
const { submitRequest } = require("../../backend/modules/request/service");

const requestWithoutCategory = {
  category: "",
  title: "Malfunctional robot",
  description:
    "Our friendly cafeteria robot started attacking our students with coffee mugs!",
  streetAddress: "10 IT Street",
};

describe("service request input", () => {
  it("rejects service requests without category selected", async () => {
    await expect(submitRequest(requestWithoutCategory)).rejects.toThrow(
      "Missing mandatory fields",
    );
  });
});
