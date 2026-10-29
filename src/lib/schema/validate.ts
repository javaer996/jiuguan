import Ajv2020 from "ajv/dist/2020";
import { ApiError } from "@/lib/api";

const ajv = new Ajv2020({
  strict: false,
  allErrors: true,
  validateFormats: false,
});

const MAX_SCHEMA_BYTES = 200_000;

/** 校验用户提交的 JSON Schema 是否能被 ajv 正常编译。 */
export function assertValidJsonSchema(schema: Record<string, unknown>) {
  const size = Buffer.byteLength(JSON.stringify(schema), "utf8");
  if (size > MAX_SCHEMA_BYTES) {
    throw new ApiError(400, "SCHEMA_TOO_LARGE", "JSON Schema 过大");
  }

  try {
    ajv.compile(schema);
  } catch (error) {
    throw new ApiError(
      400,
      "INVALID_SCHEMA",
      "JSON Schema 不合法",
      error instanceof Error ? error.message : undefined,
    );
  }
}

export function getAjv() {
  return ajv;
}
