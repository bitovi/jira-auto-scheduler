import { describe, expect } from "@jest/globals";
import { groupByKey, makeObjectMapByKey } from "./helpers";

describe("helpers methods", () => {
  describe("makeObjectMapByKey", () => {
    it("should convert array to dictionary", () => {
      let issues = [
        { key: "a", value: { name: "bob" } },
        { key: "b", value: { name: "ken" } },
        { key: "c", value: { name: "stu" } },
        { key: "z", value: { name: "mak" } },
        { key: "y", value: { name: "pat" } },
        { key: "x", value: { name: "cat" } },
      ];
      let key = "key";
      const actual = makeObjectMapByKey(issues, key);

      const match = Object.fromEntries(
        issues.map((issue) => [issue[key], issue])
      );
      expect(actual).toMatchSnapshot();
      expect(match).toMatchSnapshot();
    });
  });
  describe("groupByKey", () => {
    it("should convert array to dictionary of arrays", () => {
      let issues = [
        { key: "a", value: { name: "bob" } },
        { key: "a", value: { name: "ken" } },
        { key: "b", value: { name: "stu" } },
        { key: "b", value: { name: "mak" } },
        { key: "c", value: { name: "pat" } },
        { key: "c", value: { name: "cat" } },
      ];
      let key = "key";
      const actual = groupByKey(issues, key);

      expect(actual).toMatchSnapshot();
    });
  });
});
