import { AxiosError, AxiosHeaders } from "axios";
import { describe, expect, it } from "vitest";
import { getApiErrorMessage } from "./api";

function axiosErrorWithData(data: unknown, status = 400): AxiosError {
  return new AxiosError(
    "Request failed",
    "ERR_BAD_REQUEST",
    undefined,
    undefined,
    {
      status,
      statusText: "Bad Request",
      headers: {},
      config: { headers: new AxiosHeaders() },
      data,
    },
  );
}

describe("getApiErrorMessage", () => {
  it("returns the string body verbatim", () => {
    expect(getApiErrorMessage(axiosErrorWithData("Credenciales inválidas"))).toBe(
      "Credenciales inválidas",
    );
  });

  it("prefers DRF's `detail` field when present", () => {
    const error = axiosErrorWithData({ detail: "No autorizado." });
    expect(getApiErrorMessage(error)).toBe("No autorizado.");
  });

  it("falls back to the first field error array (DRF validation shape)", () => {
    const error = axiosErrorWithData({
      email: ["Este campo es obligatorio."],
    });
    expect(getApiErrorMessage(error)).toBe("Este campo es obligatorio.");
  });

  it("falls back to the provided default for a non-axios error", () => {
    expect(getApiErrorMessage(new Error("boom"))).toBe("boom");
    expect(getApiErrorMessage("algo raro", "Ocurrió un error")).toBe(
      "Ocurrió un error",
    );
  });

  it("uses the custom fallback message when nothing else matches", () => {
    const error = axiosErrorWithData({});
    expect(getApiErrorMessage(error, "Fallback")).toBe("Request failed");
  });
});
