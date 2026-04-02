const { sum } = require("../../script.js");

describe("script.js sum", () => {
  beforeAll(() => {
    // setup if needed
  });

  beforeEach(() => {
    // per-test setup
  });

  it("adds positive numbers", () => {
    expect(sum(1, 2)).toBe(3);
  });

  it("deep equals example", () => {
    const obj = { a: 1, b: [1, 2, { c: 3 }] };
    expect(obj).toEqual({ a: 1, b: [1, 2, { c: 3 }] });
  });

  it("toContain works on arrays and strings", () => {
    expect([1, 2, 3]).toContain(2);
    expect("hello world").toContain("world");
  });

  it("supports async (Promise)", async () => {
    const data = await Promise.resolve({ ok: true });
    expect(data).toEqual({ ok: true });
  });

  it("supports async (done callback)", (done) => {
    setTimeout(() => {
      try {
        expect(5).toBeGreaterThan(3);
        done();
      } catch (e) {
        done(e);
      }
    }, 10);
  });

  it("mocking fn() records calls", () => {
    const myMock = fn().mockReturnValueOnce(10).mockReturnValue(5);
    expect(myMock()).toBe(10);
    expect(myMock()).toBe(5);
    expect(myMock.mock.calls.length).toBe(2);
  });

  it("spyOn wraps methods", () => {
    const obj = {
      greet(name) { return `hi ${name}`; }
    };
    const spy = spyOn(obj, "greet").mockReturnValue("mocked");
    expect(obj.greet("x")).toBe("mocked");
    spy.restore();
    expect(obj.greet("x")).toBe("hi x");
  });

  it("toThrow supports sync", () => {
    function boom() { throw new Error("boom"); }
    return expect(boom).toThrow("boom");
  });

  it("toThrow supports async promise rejection", async () => {
    const p = Promise.reject(new Error("nope"));
    return expect(p).toThrow(/nope/);
  });
});
